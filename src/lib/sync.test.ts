import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { DayLog, Settings, StoreData } from '../types';
import { day, settings } from './test-helpers';
import { emptyData, RECOVERY_KEY, STORAGE_KEY } from './storage';
import { syncOnce } from './sync-engine';
import { addDays } from './dates';

type Row = { user_id: string; day?: string; data: DayLog | Settings; updated_at: string; synced_at: string };
const cloud = vi.hoisted(() => ({
  day_logs: [] as Row[], user_settings: [] as Row[], stamp: '2026-10-08T12:00:00.000Z',
  filters: [] as { table: string; column: string; value: string }[], selects: [] as string[],
  beforeWrite: undefined as (() => void) | undefined,
  session: undefined as ((event: AuthChangeEvent, session: Session | null) => void) | undefined,
}));
vi.mock('./supabase', () => ({ supabase: {
  from: (table: 'day_logs' | 'user_settings') => new Query(table),
  auth: { onAuthStateChange: (callback: typeof cloud.session) => { cloud.session = callback; return { data: { subscription: { unsubscribe: () => {} } } }; },
    signOut: async () => ({ error: null }) },
} }));
vi.mock('./push', () => ({ unsubscribeThisDevice: async () => {} }));
vi.mock('./summary', () => ({ eveningSummary: () => { throw new Error('summary disabled in test'); } }));

// Models PostgREST filtering/paging and the migration's row-lock LWW rule.
// SQL itself is reviewed separately: these tests never access a database.
class Query {
  private user?: string;
  private lower?: { column: keyof Row; value: string };
  private from = 0;
  private to = Infinity;
  private table: 'day_logs' | 'user_settings';
  constructor(table: 'day_logs' | 'user_settings') { this.table = table; }
  select(columns: string) { cloud.selects.push(columns); return this; }
  eq(_column: string, value: string) { this.user = value; return this; }
  order(_column: string) { return this; }
  range(from: number, to: number) { this.from = from; this.to = to; return this; }
  gte(column: keyof Row, value: string) { cloud.filters.push({ table: this.table, column, value }); this.lower = { column, value }; return this; }
  private rows() {
    return cloud[this.table].filter(row => row.user_id === this.user && (!this.lower || Date.parse(row[this.lower.column] as string) >= Date.parse(this.lower.value)))
      .sort((a, b) => (a.day ?? '').localeCompare(b.day ?? '')).slice(this.from, this.to + 1);
  }
  async maybeSingle() { return { data: this.rows()[0] ?? null, error: null }; }
  then<T>(resolve: (value: { data: Row[]; error: null }) => T) { return Promise.resolve(resolve({ data: this.rows(), error: null })); }
  async upsert(input: Omit<Row, 'synced_at'> | Omit<Row, 'synced_at'>[], _options: { onConflict: string }) {
    cloud.beforeWrite?.(); cloud.beforeWrite = undefined;
    for (const incoming of Array.isArray(input) ? input : [input]) {
      const index = cloud[this.table].findIndex(row => row.user_id === incoming.user_id && row.day === incoming.day);
      const old = cloud[this.table][index];
      const winner = old && Date.parse(incoming.updated_at) < Date.parse(old.updated_at) ? old : incoming;
      const row = { ...winner, synced_at: cloud.stamp };
      if (index < 0) cloud[this.table].push(row); else cloud[this.table][index] = row;
    }
    return { error: null };
  }
}
const memory = new Map<string, string>();
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-08T12:00:00Z'));
  cloud.day_logs = []; cloud.user_settings = []; cloud.filters = []; cloud.selects = [];
  cloud.stamp = '2026-10-08T12:00:00.000Z'; cloud.beforeWrite = undefined; cloud.session = undefined; memory.clear();
  vi.stubGlobal('window', { localStorage: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); }, removeItem: (key: string) => { memory.delete(key); } },
    addEventListener: () => {}, removeEventListener: () => {}, confirm: () => true });
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal('navigator', { onLine: true });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const row = (data: DayLog | Settings, synced_at: string, user_id = 'u1'): Row => ({ user_id, day: 'date' in data ? data.date : undefined, data, updated_at: data.updatedAt, synced_at });

describe('server-timestamp sync transport', () => {
  it('defaults missing catalogs on pulled legacy settings without changing the server data or edit time', async () => {
    const { transport } = await import('./sync');
    const expected = settings(); const old: Partial<Settings> = { ...expected }; delete old.snackCatalog; delete old.deviationCategories;
    cloud.user_settings.push(row(old as Settings, cloud.stamp));
    const remote = await transport('u1').pull();
    expect(remote.settings).toEqual(expected); expect(remote.cursor).toBe(cloud.stamp);
    expect(old).not.toHaveProperty('snackCatalog');
    remote.settings!.snackCatalog[0].items[0].name = 'שם מותאם';
    expect((await transport('u1').pull()).settings).toEqual(expected);
  });
  it.each([{ snackCatalog: [] }, { snackCatalog: [{ id: 'custom', name: 'מותאם', items: [{ id: 'item', name: 'פריט', kcal: 80 }] }] }])('preserves a pulled catalog, including an empty one (%#)', async ({ snackCatalog }) => {
    const { transport } = await import('./sync');
    const menu = { ...settings(), snackCatalog }; cloud.user_settings.push(row(menu, cloud.stamp));
    expect((await transport('u1').pull()).settings).toEqual(menu);
  });
  it('rejects malformed cloud catalogs before they enter the local store', async () => {
    const { transport } = await import('./sync');
    const menu = settings(); menu.snackCatalog[0].items[0].kcal = -1; cloud.user_settings.push(row(menu, cloud.stamp));
    await expect(transport('u1').pull()).rejects.toThrow('התפריט בענן אינו תקין');
  });
  it('pulls a late offline day/settings upload even though its edit time is behind the cursor', async () => {
    const { transport } = await import('./sync');
    const offline = day('2026-10-07', { notes: 'offline', updatedAt: '2026-10-07T08:00:00Z' });
    const menu = { ...settings(), dailyBankKcal: 400, updatedAt: offline.updatedAt };
    await transport('u1').pushDays([offline]); await transport('u1').pushSettings(menu);
    cloud.day_logs.push(row(day('2026-10-08'), cloud.stamp, 'u2'));
    const remote = await transport('u1').pull('2026-10-08T11:00:00Z');
    expect(remote.logs).toEqual({ [offline.date]: offline }); expect(remote.settings).toEqual(menu);
    expect(remote.cursor).toBe(cloud.stamp);
    expect(cloud.filters).toEqual([
      { table: 'day_logs', column: 'synced_at', value: '2026-10-08T10:59:00.000Z' },
      { table: 'user_settings', column: 'synced_at', value: '2026-10-08T10:59:00.000Z' },
    ]);
    expect(cloud.selects).toEqual(['day,data,synced_at', 'data,synced_at']);
    expect(cloud.day_logs[0].updated_at).toBe(offline.updatedAt);
  });
  it('includes a transaction committed behind the cursor and merges overlap idempotently', async () => {
    const { transport } = await import('./sync');
    const cursor = cloud.stamp;
    const delayed = day('2026-10-07'); cloud.day_logs.push(row(delayed, '2026-10-08T11:59:30Z'));
    cloud.user_settings.push(row(settings(), '2026-10-08T11:59:00Z'));
    let state = emptyData(); state.meta.lastPulledAt = cursor;
    const get = () => state; const set = (next: StoreData) => { state = next; };
    await syncOnce(transport('u1'), get, set, () => true);
    expect(state.logs[delayed.date]).toEqual(delayed); expect(state.meta.lastPulledAt).toBe(cursor);
    const before = structuredClone(state);
    await syncOnce(transport('u1'), get, set, () => true); expect(state).toEqual(before);
  });
  it('paginates histories and takes the cursor from the latest server timestamp in either table', async () => {
    const { transport } = await import('./sync');
    cloud.day_logs = Array.from({ length: 501 }, (_, index) => row(day(addDays('2025-01-01', index)), '2026-10-08T11:00:00Z'));
    cloud.user_settings.push(row(settings(), cloud.stamp));
    const remote = await transport('u1').pull();
    expect(Object.keys(remote.logs)).toHaveLength(501); expect(remote.cursor).toBe(cloud.stamp);
    expect(cloud.filters).toEqual([]);
  });
  it.each(['day_logs', 'user_settings'] as const)('cannot replace newer %s written between pull and push, and pulls the winner next time', async table => {
    const { transport } = await import('./sync');
    let state = emptyData(); state.logs['2026-10-07'] = day('2026-10-07', { updatedAt: '2026-10-07T08:00:00Z' });
    state.settings.updatedAt = '2026-10-07T08:00:00Z'; state.meta.dirtyDays = table === 'day_logs' ? ['2026-10-07'] : [];
    state.meta.settingsDirty = table === 'user_settings'; state.meta.lastPulledAt = '2026-10-08T11:00:00Z';
    const winner = table === 'day_logs' ? day('2026-10-07', { notes: 'new cloud edit', updatedAt: '2026-10-08T11:30:00Z' })
      : { ...settings(), dailyBankKcal: 500, updatedAt: '2026-10-08T11:30:00Z' };
    // Another transaction writes after the client's pull completes.
    cloud.beforeWrite = () => { cloud[table].push(row(winner, '2026-10-08T11:30:00Z')); };
    const get = () => state; const set = (next: StoreData) => { state = next; };
    await syncOnce(transport('u1'), get, set, () => true);
    expect(cloud[table][0].data).toEqual(winner); expect(cloud[table][0].updated_at).toBe(winner.updatedAt);
    expect(cloud[table][0].synced_at).toBe(cloud.stamp);
    await syncOnce(transport('u1'), get, set, () => true);
    expect(table === 'day_logs' ? state.logs['2026-10-07'] : state.settings).toEqual(winner);
    expect(state.meta.dirtyDays).toEqual([]); expect(state.meta.settingsDirty).toBe(false);
  });
  it('refreshes discovery of the winner after a stale write even if the original server time is behind the overlap', async () => {
    const { transport } = await import('./sync');
    const winner = day('2026-10-07', { notes: 'winner', updatedAt: '2026-10-08T09:00:00Z' });
    cloud.day_logs.push(row(winner, '2026-10-08T09:00:00Z'));
    await transport('u1').pushDays([day('2026-10-07')]);
    expect((await transport('u1').pull('2026-10-08T11:00:00Z')).logs[winner.date]).toEqual(winner);
  });
});
describe('session initialization and explicit sign-out', () => {
  it('preserves corrupt local data and a visible notice through automatic session initialization', async () => {
    memory.set(STORAGE_KEY, '{recover me');
    const sync = await import('./sync'); const store = await import('../store/store');
    const stop = sync.startSync();
    cloud.session?.('INITIAL_SESSION', { user: { id: 'u1', email: 'test@example.com' } } as Session);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getState().meta.syncUserId).toBe('u1'); expect(memory.get(RECOVERY_KEY)).toBe('{recover me');
    expect(store.getStorageError()).toBeTruthy();
    expect(JSON.parse(memory.get(STORAGE_KEY)!).meta.syncUserId).toBe('u1'); stop();
  });
  it('uses replacement for explicit sign-out rather than merging stored days back in', async () => {
    const sync = await import('./sync'); const store = await import('../store/store');
    store.editDay('2026-10-07', log => { log.water = 3; });
    expect(await sync.signOutAndReset()).toBe(true);
    expect(store.getState().logs).toEqual({}); expect(JSON.parse(memory.get(STORAGE_KEY)!).logs).toEqual({});
  });
});
