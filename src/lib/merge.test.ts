import { describe, expect, it } from 'vitest';
import { mergeLogs, mergeRemote, newer } from './merge';
import { emptyData } from './storage';
import { day } from './test-helpers';
describe('last-write-wins merge', () => {
  it('merges disjoint days without dropping local data', () => {
    const local = day(); const remote = day('2026-10-05');
    expect(mergeLogs({ [local.date]: local }, { [remote.date]: remote })).toEqual({ [local.date]: local, [remote.date]: remote });
  });
  it('compares instants and keeps local on equal timestamps', () => {
    const local = day(undefined, { notes: 'local', updatedAt: '2026-10-04T13:00:00+03:00' });
    const remote = { ...local, notes: 'remote', updatedAt: '2026-10-04T11:00:00Z' };
    expect(newer(local, remote).notes).toBe('remote');
    expect(newer(local, { ...remote, updatedAt: local.updatedAt }).notes).toBe('local');
  });
  it('clears only dirty records won by the remote copy', () => {
    const state = emptyData(); state.logs = { '2026-10-04': day() }; state.meta.dirtyDays = ['2026-10-04'];
    const remote = day(undefined, { notes: 'newer', updatedAt: '2026-10-05T12:00:00Z' });
    const remoteSettings = { ...state.settings, dailyBankKcal: 300, updatedAt: '2026-10-05T12:00:00Z' };
    const merged = mergeRemote(state, { [remote.date]: remote }, remoteSettings);
    expect(merged.logs[remote.date].notes).toBe('newer'); expect(merged.meta.dirtyDays).toEqual([]);
    expect(merged.settings.dailyBankKcal).toBe(300); expect(merged.meta.settingsDirty).toBe(false);
    expect(state.meta.dirtyDays).toEqual(['2026-10-04']);
  });
  it('retains newer local records for upload', () => {
    const state = emptyData(); state.logs = { '2026-10-04': day() }; state.meta.dirtyDays = ['2026-10-04'];
    const remote = day(undefined, { updatedAt: '2026-10-03T00:00:00Z' });
    expect(mergeRemote(state, { [remote.date]: remote }).meta.dirtyDays).toEqual(['2026-10-04']);
  });
});
