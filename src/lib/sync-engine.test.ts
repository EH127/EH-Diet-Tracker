import { describe, expect, it, vi } from 'vitest';
import { syncOnce, type SyncTransport } from './sync-engine';
import { emptyData } from './storage';
import { day } from './test-helpers';
import type { StoreData } from '../types';

function fixture() {
  let state = emptyData(); state.logs['2026-10-04'] = day(); state.meta.dirtyDays = ['2026-10-04'];
  const get = () => state; const set = (next: StoreData) => { state = next; };
  const transport: SyncTransport = { pull: vi.fn(async () => ({ logs: {} })), pushDays: vi.fn(async () => {}), pushSettings: vi.fn(async () => {}) };
  return { get, set, transport };
}
describe('offline-first sync transactions', () => {
  it('merges first-login data both directions and acknowledges only successful uploads', async () => {
    const { get, set, transport } = fixture();
    transport.pull = vi.fn(async () => ({ logs: { '2026-10-05': day('2026-10-05') }, cursor: '2026-10-05T12:00:00Z' }));
    await syncOnce(transport, get, set, () => true);
    expect(Object.keys(get().logs)).toHaveLength(2);
    expect(transport.pushDays).toHaveBeenCalledWith([day()]);
    expect(get().meta).toMatchObject({ dirtyDays: [], settingsDirty: false, lastPulledAt: '2026-10-05T12:00:00Z' });
    expect(get().meta.lastSyncedAt).toBeTruthy();
  });
  it('does not upload an older local record over a newer cloud record', async () => {
    const { get, set, transport } = fixture();
    transport.pull = async () => ({ logs: { '2026-10-04': day(undefined, { notes: 'cloud', updatedAt: '2026-10-06T00:00:00Z' }) } });
    await syncOnce(transport, get, set, () => true);
    expect(transport.pushDays).not.toHaveBeenCalled(); expect(get().logs['2026-10-04'].notes).toBe('cloud');
  });
  it('preserves local changes made during day and settings uploads', async () => {
    const { get, set, transport } = fixture();
    transport.pushDays = async () => { const next = structuredClone(get()); next.logs['2026-10-04'].notes = 'edited mid-flight'; next.logs['2026-10-04'].updatedAt = '2026-10-08T00:00:00Z'; set(next); };
    transport.pushSettings = async () => { const next = structuredClone(get()); next.settings.dailyBankKcal = 300; next.settings.updatedAt = '2026-10-08T00:00:00Z'; set(next); };
    await syncOnce(transport, get, set, () => true);
    expect(get().meta.dirtyDays).toEqual(['2026-10-04']); expect(get().meta.settingsDirty).toBe(true);
  });
  it('keeps records dirty after a failed push for later retry', async () => {
    const { get, set, transport } = fixture(); transport.pushDays = async () => { throw new Error('offline'); };
    await expect(syncOnce(transport, get, set, () => true)).rejects.toThrow('offline');
    expect(get().meta.dirtyDays).toEqual(['2026-10-04']); expect(get().meta.settingsDirty).toBe(true);
    expect(get().meta.lastPulledAt).toBeUndefined();
  });
  it('ignores a response after sign-out or clear-data invalidates the session', async () => {
    const { get, set, transport } = fixture(); const before = get();
    await syncOnce(transport, get, set, () => false);
    expect(get()).toBe(before); expect(transport.pushDays).not.toHaveBeenCalled();
  });
});
