import { describe, expect, it } from 'vitest';
import { emptyData, loadData, migrate, saveData, STORAGE_KEY } from './storage';
import { isDayLog, isSettings, parseBackup } from './validation';
import { day } from './test-helpers';

describe('storage and import validation', () => {
  it('roundtrips a complete backup and preserves deleted historical IDs', () => {
    const state = emptyData(); const log = day(); log.meals[0].templateId = 'deleted-template'; log.meals[0].selections.deleted = ['deleted-food']; state.logs[log.date] = log;
    expect(migrate(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(isSettings(state.settings)).toBe(true); expect(isDayLog(log)).toBe(true);
    expect(parseBackup({ version: 1, settings: state.settings, logs: state.logs }).logs).toEqual(state.logs);
  });
  it('defaults deviation categories for settings stored before they existed', () => {
    const state = emptyData(); const old: Record<string, unknown> = { ...state.settings }; delete old.deviationCategories;
    expect(migrate({ settings: old, logs: {} }).settings.deviationCategories).toEqual(state.settings.deviationCategories);
    expect(isSettings(old)).toBe(true);
  });
  it('uses the specified localStorage key, and marks imported metadata-free data dirty', () => {
    const state = emptyData(); state.logs['2026-10-04'] = day(); let stored = '';
    saveData(state, { setItem: (key, value) => { expect(key).toBe(STORAGE_KEY); stored = value; } });
    expect(loadData({ getItem: () => stored }).data).toEqual(state);
    expect(migrate({ settings: state.settings, logs: state.logs }).meta).toMatchObject({ dirtyDays: ['2026-10-04'], settingsDirty: true });
  });
  it('handles unavailable, corrupt and quota-limited storage without crashing', () => {
    expect(loadData({ getItem: () => { throw new Error('denied'); } }).error).toBeTruthy();
    expect(loadData({ getItem: () => '{bad' }).error).toBeTruthy();
    expect(loadData({ getItem: () => null }).data.settings.slots).toHaveLength(3);
    expect(saveData(emptyData(), { setItem: () => { throw new Error('quota'); } })).toBeTruthy();
  });
  it.each([
    (v: ReturnType<typeof emptyData>) => { v.settings.version = 2; },
    (v: ReturnType<typeof emptyData>) => { v.settings.waterGoal = 0; },
    (v: ReturnType<typeof emptyData>) => { v.settings.groups[0].options[0].weeklyLimit = -1; },
    (v: ReturnType<typeof emptyData>) => { v.settings.groups[0].options.push(v.settings.groups[0].options[0]); },
    (v: ReturnType<typeof emptyData>) => { v.settings.templates[0].components = [{ id: 'c', kind: 'choice', label: '', groupIds: [], pick: 0, required: true }]; },
    (v: ReturnType<typeof emptyData>) => { v.logs['2026-02-30'] = day('2026-02-30'); },
    (v: ReturnType<typeof emptyData>) => { v.logs['2026-10-04'] = day('2026-10-05'); },
    (v: ReturnType<typeof emptyData>) => { v.logs['2026-10-04'] = day(undefined, { water: -1 }); },
    (v: ReturnType<typeof emptyData>) => { v.logs['2026-10-04'] = day(undefined, { updatedAt: 'invalid' }); },
  ])('rejects invalid nested data before it reaches the store (%#)', mutate => {
    const invalid = emptyData(); mutate(invalid); expect(() => parseBackup(invalid)).toThrow();
  });
  it('rejects wrong types, future versions, and dangerous dictionary keys', () => {
    expect(() => parseBackup(null)).toThrow(); expect(() => parseBackup({ ...emptyData(), version: 9 })).toThrow();
    const state = emptyData(); state.logs['2026-10-04'] = day();
    state.logs['2026-10-04'].meals[0].selections = JSON.parse('{"__proto__": ["a"]}');
    expect(() => parseBackup(state)).toThrow();
  });
});
