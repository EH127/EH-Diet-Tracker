import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { emptyData, RECOVERY_KEY, STORAGE_KEY } from '../lib/storage';
import { parseBackup } from '../lib/validation';
import { resolveSignIn, syncOnce, type SyncTransport } from '../lib/sync-engine';
import { day } from '../lib/test-helpers';
import { freshSettings } from '../data/defaultSettings';

const memory = new Map<string, string>();
const storageListeners: ((event: StorageEvent) => void)[] = [];
const storageEvent = (key: string | null = STORAGE_KEY) => storageListeners.forEach(listener => listener({ key } as StorageEvent));
beforeEach(() => {
  memory.clear(); storageListeners.length = 0; vi.resetModules();
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 8, 12));
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) },
    addEventListener: (name: string, listener: (event: StorageEvent) => void) => { if (name === 'storage') storageListeners.push(listener); } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('persisted store', () => {
  it('persists meals, bank, workout, habits, steps, water, weight and notes across a reload', async () => {
    let store = await import('./store');
    store.editSettings(s => { s.stepsGoal = 8500; });
    store.editDay('2026-10-08', d => { d.workout = true; d.habits = { aerobic: false }; d.steps = 8450; d.water = 4; d.weight = 75.5; d.notes = 'יום טוב'; d.meals[2].templateId = 'eatOut'; d.meals[2].extras = 1; d.meals[2].done = true; d.meals[2].selections = { 'eatout-food': ['pizza'] }; });
    const before = store.getState(); expect(before.meta.dirtyDays).toContain('2026-10-08');
    vi.resetModules(); store = await import('./store');
    expect(store.getState()).toEqual(before); expect(store.getState().logs['2026-10-08'].bank).toHaveLength(2);
  });
  it('keeps habit history when a habit is edited or deleted and persists liter goals/report targets', async () => {
    let store = await import('./store');
    store.editDay('2026-10-07', d => { d.habits = { steps10k: true, noScreen: true }; d.water = 5; });
    const log = structuredClone(store.getState().logs['2026-10-07']);
    store.editSettings(s => {
      s.habits[0].name = 'הליכה'; s.habits.splice(1, 1);
      s.waterUnit = 'liters'; s.waterGoal = 2.5; s.cupMl = 300; s.weeklyReport.aerobicTarget = 4;
    });
    expect(store.getState().logs['2026-10-07']).toEqual(log);
    expect(store.getState().meta.settingsDirty).toBe(true);
    vi.resetModules(); store = await import('./store');
    expect(store.getState().settings).toMatchObject({ waterUnit: 'liters', waterGoal: 2.5, cupMl: 300, weeklyReport: { aerobicTarget: 4 } });
    expect(store.getState().logs['2026-10-07'].habits).toEqual({ steps10k: true, noScreen: true });
  });
  it('does one full pull after upgrading a future client-clock cursor, then resumes incremental pulls across reloads', async () => {
    const legacy = emptyData(); delete legacy.meta.cursorVersion; legacy.meta.lastPulledAt = '2099-01-01T00:00:00Z';
    memory.set(STORAGE_KEY, JSON.stringify(legacy));
    let store = await import('./store'); const cursor = '2026-10-08T12:00:00Z';
    const transport: SyncTransport = { pull: vi.fn(async () => ({ logs: { '2026-10-07': day('2026-10-07') }, cursor })),
      pushDays: async () => {}, pushSettings: async () => {} };
    await syncOnce(transport, store.getState, store.setState, () => true);
    expect(transport.pull).toHaveBeenNthCalledWith(1, undefined);
    expect(store.getState().logs['2026-10-07']).toEqual(day('2026-10-07'));
    expect(JSON.parse(memory.get(STORAGE_KEY)!).meta).toMatchObject({ cursorVersion: 2, lastPulledAt: cursor });
    vi.resetModules(); store = await import('./store');
    await syncOnce(transport, store.getState, store.setState, () => true);
    expect(transport.pull).toHaveBeenNthCalledWith(2, cursor);
  });
  it('exports, clears, and imports all editable settings and logs', async () => {
    const store = await import('./store');
    store.editSettings(s => { s.dailyBankKcal = 400; s.groups[0].options.push({ id: 'unique-food', name: 'חדש', amount: 'כוס', active: true }); });
    store.editDay('2026-10-08', d => { d.notes = 'restore me'; d.water = 3; });
    const backup = parseBackup(JSON.parse(JSON.stringify(store.getState())));
    store.clearLocalData(); expect(memory.has(STORAGE_KEY)).toBe(false); expect(store.getState().logs).toEqual({});
    store.importBackup(backup, 'replace');
    expect(store.getState().settings.dailyBankKcal).toBe(400); expect(store.getState().logs['2026-10-08'].notes).toBe('restore me');
    expect(store.getState().settings.groups[0].options.at(-1)?.id).toBe('unique-food');
    expect(store.getState().meta.dirtyDays).toEqual(['2026-10-08']);
  });
  it('updates automatic charges when template settings change and removes them when swapping away', async () => {
    const store = await import('./store');
    store.editDay('2026-10-08', d => { d.meals[2].templateId = 'eatOut'; });
    store.editSettings(s => { s.templates.find(t => t.id === 'eatOut')!.bankChargeSameDay = 300; });
    expect(store.getState().logs['2026-10-08'].bank[0].charge).toBe(300);
    store.editDay('2026-10-08', d => { d.meals[2].templateId = 'dairyDinner'; });
    expect(store.getState().logs['2026-10-08'].bank).toEqual([]);
  });
  it('keeps disjoint unsynced edits from two tabs even before storage events arrive', async () => {
    const a = await import('./store'); vi.resetModules(); const b = await import('./store');
    a.editDay('2026-10-07', d => { d.notes = 'tab A'; });
    b.editDay('2026-10-08', d => { d.notes = 'tab B'; });
    expect(b.getState().logs['2026-10-07'].notes).toBe('tab A');
    expect(b.getState().meta.dirtyDays).toEqual(['2026-10-07', '2026-10-08']);
    storageEvent();
    expect(a.getState().logs).toEqual(b.getState().logs);
    expect(JSON.parse(memory.get(STORAGE_KEY)!).logs).toEqual(b.getState().logs);
  });
  it('merges days and settings by edit time and retains both tabs dirty markers', async () => {
    const a = await import('./store'); vi.resetModules(); const b = await import('./store');
    const stale = structuredClone(b.getState());
    a.editDay('2026-10-07', d => { d.water = 5; }); a.editSettings(s => { s.dailyBankKcal = 400; });
    const old = day('2026-10-07', { water: 1 }); stale.logs[old.date] = old; stale.meta.dirtyDays = [old.date];
    stale.logs['2026-10-08'] = day('2026-10-08'); stale.meta.dirtyDays.push('2026-10-08');
    b.setState(stale);
    expect(b.getState().settings.dailyBankKcal).toBe(400); expect(b.getState().logs[old.date].water).toBe(5);
    expect(b.getState().meta.dirtyDays).toEqual(['2026-10-07', '2026-10-08']); expect(b.getState().meta.settingsDirty).toBe(true);
    storageEvent(); expect(a.getState().logs[old.date].water).toBe(5);
  });
  it('applies a tab edit to the latest stored version even when its clock is behind', async () => {
    const a = await import('./store'); vi.resetModules(); const b = await import('./store');
    a.editDay('2026-10-08', d => { d.notes = 'keep me'; d.water = 3; });
    const stamp = a.getState().logs['2026-10-08'].updatedAt;
    vi.setSystemTime(new Date(2026, 9, 7, 12)); b.editDay('2026-10-08', d => { d.water++; });
    expect(b.getState().logs['2026-10-08']).toMatchObject({ notes: 'keep me', water: 4 });
    expect(Date.parse(b.getState().logs['2026-10-08'].updatedAt)).toBeGreaterThan(Date.parse(stamp));
  });
  it('persists upload acknowledgements without erasing another tab edit made in flight', async () => {
    const a = await import('./store'); vi.resetModules(); const b = await import('./store');
    a.editDay('2026-10-07', d => { d.water = 1; });
    const transport: SyncTransport = { pull: async () => ({ logs: {} }),
      pushDays: async () => { b.editDay('2026-10-07', d => { d.water = 2; }); b.editDay('2026-10-08', d => { d.notes = 'new'; }); },
      pushSettings: async () => {} };
    await syncOnce(transport, a.getState, a.setState, () => true);
    expect(a.getState().logs['2026-10-07'].water).toBe(2);
    expect(a.getState().meta.dirtyDays).toEqual(['2026-10-07', '2026-10-08']);
    transport.pushDays = async () => {};
    await syncOnce(transport, a.getState, a.setState, () => true);
    expect(a.getState().meta.dirtyDays).toEqual([]); expect(a.getState().meta.settingsDirty).toBe(false);
    expect(JSON.parse(memory.get(STORAGE_KEY)!).meta.dirtyDays).toEqual([]);
  });
  it('accepts another tab acknowledgements for unchanged versions without marking them dirty again', async () => {
    const a = await import('./store'); a.editDay('2026-10-07', d => { d.water = 1; });
    vi.resetModules(); const b = await import('./store');
    const transport: SyncTransport = { pull: async () => ({ logs: {} }), pushDays: async () => {}, pushSettings: async () => {} };
    await syncOnce(transport, a.getState, a.setState, () => true);
    storageEvent();
    expect(b.getState().meta.dirtyDays).toEqual([]); expect(b.getState().meta.settingsDirty).toBe(false);
    b.editDay('2026-10-08', d => { d.water = 2; });
    expect(b.getState().meta.dirtyDays).toEqual(['2026-10-08']);
  });
  it('repairs a simultaneous whole-storage overwrite from the surviving tab copies', async () => {
    const a = await import('./store'); vi.resetModules(); const b = await import('./store');
    a.editDay('2026-10-07', d => { d.notes = 'A'; });
    const aWrite = memory.get(STORAGE_KEY)!;
    // Simulate B having read before A's write becomes visible to it.
    memory.delete(STORAGE_KEY); b.editDay('2026-10-08', d => { d.notes = 'B'; });
    expect(JSON.parse(memory.get(STORAGE_KEY)!).logs['2026-10-07']).toBeUndefined();
    expect(JSON.parse(aWrite).logs['2026-10-07'].notes).toBe('A');
    storageEvent();
    const stored = JSON.parse(memory.get(STORAGE_KEY)!);
    expect(stored.logs['2026-10-07'].notes).toBe('A'); expect(stored.logs['2026-10-08'].notes).toBe('B');
    expect(a.getState().logs).toEqual(b.getState().logs);
  });
  it('keeps historical charges and edit times while reconciling today and future days', async () => {
    const store = await import('./store');
    for (const date of ['2026-10-07', '2026-10-08', '2026-10-09']) store.editDay(date, d => { d.meals[2].templateId = 'eatOut'; d.meals[2].extras = 1; });
    const historical = structuredClone(store.getState().logs['2026-10-07']);
    store.editSettings(s => { const t = s.templates.find(t => t.id === 'eatOut')!; t.bankChargeSameDay = 300; t.extraChargeKcal = 350; });
    expect(store.getState().logs['2026-10-07']).toEqual(historical);
    for (const date of ['2026-10-08', '2026-10-09']) expect(store.getState().logs[date].bank.map(e => e.charge)).toEqual([300, 350]);
    const beforeDeletion = structuredClone(store.getState().logs);
    store.editSettings(s => { s.templates = s.templates.filter(t => t.id !== 'eatOut'); });
    expect(store.getState().logs).toEqual(beforeDeletion);
    store.editDay('2026-10-07', d => { d.notes = 'unrelated edit'; });
    expect(store.getState().logs['2026-10-07'].bank).toEqual(historical.bank);
  });
  it.each(['{bad', JSON.stringify({ settings: { version: 99 }, logs: {} })])('keeps recovery available through automatic sign-in, writes, resets and reloads (%#)', async raw => {
    memory.set(STORAGE_KEY, raw);
    let store = await import('./store');
    expect(memory.get(RECOVERY_KEY)).toBe(raw);
    store.setState(resolveSignIn(store.getState(), 'u1'));
    store.editDay('2026-10-08', d => { d.water = 2; });
    expect(memory.get(RECOVERY_KEY)).toBe(raw); expect(store.getStorageError()).toBeTruthy();
    store.setState(emptyData(), 'replace'); store.clearLocalData();
    vi.resetModules(); store = await import('./store');
    expect(memory.get(RECOVERY_KEY)).toBe(raw); expect(store.getStorageError()).toBeTruthy();
    store.discardRecoveryData(); expect(memory.has(RECOVERY_KEY)).toBe(false); expect(store.getStorageError()).toBeUndefined();
  });
  it.each(['sign-out', 'account switch', 'backup replace', 'clear'])('propagates explicit %s and prevents a stale tab from restoring discarded days', async action => {
    const a = await import('./store');
    a.editDay('2026-10-07', d => { d.notes = 'discard me'; });
    vi.resetModules(); const b = await import('./store'); const stale = structuredClone(b.getState());
    if (action === 'sign-out') a.setState(emptyData(), 'replace');
    if (action === 'account switch') {
      a.setState({ ...a.getState(), meta: { ...a.getState().meta, syncUserId: 'u1' } });
      a.setState(resolveSignIn(a.getState(), 'u2'), 'replace');
    }
    if (action === 'backup replace') a.importBackup({ version: 1, settings: freshSettings(), logs: { '2026-10-08': day('2026-10-08') } }, 'replace');
    if (action === 'clear') a.clearLocalData();
    b.setState(stale); expect(b.getState().logs['2026-10-07']).toBeUndefined();
    storageEvent(); expect(b.getState().logs).toEqual(a.getState().logs);
    b.editDay('2026-10-09', d => { d.water = 1; });
    expect(JSON.parse(memory.get(STORAGE_KEY)!).logs['2026-10-07']).toBeUndefined();
  });
  it('replaces menu settings while keeping history and advancing its edit time', async () => {
    const store = await import('./store'); store.editSettings(s => { s.dailyBankKcal = 500; });
    store.editDay('2026-10-07', d => { d.notes = 'keep history'; });
    const stamp = store.getState().settings.updatedAt;
    store.editSettings(s => Object.assign(s, freshSettings()));
    expect(store.getState().settings.dailyBankKcal).toBe(250);
    expect(Date.parse(store.getState().settings.updatedAt)).toBeGreaterThan(Date.parse(stamp));
    expect(store.getState().logs['2026-10-07'].notes).toBe('keep history');
  });
});
