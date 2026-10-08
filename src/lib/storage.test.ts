import { describe, expect, it } from 'vitest';
import { emptyData, loadData, migrate, saveData, RECOVERY_KEY, STORAGE_KEY } from './storage';
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
  it('defaults the snack catalog in migration and backup parsing without changing legacy settings or logs', () => {
    const state = emptyData(); state.logs['2026-10-04'] = day();
    const old: Record<string, unknown> = { ...state.settings }; delete old.snackCatalog; delete old.deviationCategories;
    const legacy = { ...state, settings: old };
    expect(isSettings(old)).toBe(true);
    const migrated = migrate(legacy); const backup = parseBackup(legacy);
    expect(migrated).toEqual(state); expect(backup.settings).toEqual(state.settings); expect(backup.logs).toEqual(state.logs);
    expect(old).not.toHaveProperty('snackCatalog');
    migrated.settings.snackCatalog[0].items[0].name = 'שם מותאם';
    expect(backup.settings.snackCatalog).toEqual(state.settings.snackCatalog);
    expect(migrate(legacy).settings.snackCatalog).toEqual(state.settings.snackCatalog);
  });
  it('preserves custom and intentionally empty catalogs in stored settings and backups', () => {
    const state = emptyData(); state.settings.snackCatalog = [{ id: 'custom', name: 'מותאם', items: [{ id: 'item', name: 'פריט', kcal: 42 }] }];
    expect(migrate(state).settings.snackCatalog).toEqual(state.settings.snackCatalog);
    expect(parseBackup(state).settings.snackCatalog).toEqual(state.settings.snackCatalog);
    state.settings.snackCatalog = [];
    expect(migrate(state).settings.snackCatalog).toEqual([]); expect(parseBackup(state).settings.snackCatalog).toEqual([]);
  });
  it.each([
    null, {}, [null], [{ id: '', name: 'קטגוריה', items: [] }], [{ id: '__proto__', name: 'קטגוריה', items: [] }],
    [{ id: 'c', name: 1, items: [] }], [{ id: 'c', name: 'קטגוריה', emoji: 1, items: [] }], [{ id: 'c', name: 'קטגוריה' }],
    [{ id: 'c', name: 'קטגוריה', items: {} }], [{ id: 'c', name: 'קטגוריה', items: [{ name: 'פריט', kcal: 100 }] }],
    ...[-1, NaN, Infinity, '100', undefined].map(kcal => [{ id: 'c', name: 'קטגוריה', items: [{ id: 'i', name: 'פריט', kcal }] }]),
    [{ id: 'c', name: 'קטגוריה', items: [{ id: 'i', name: 1, kcal: 100 }] }],
    [{ id: 'c', name: 'קטגוריה', items: [{ id: 'i', name: 'פריט', portion: 4, kcal: 100 }] }],
    [{ id: 'c', name: 'קטגוריה', items: [{ id: 'i', name: 'פריט', kcal: 100, note: false }] }],
    [{ id: 'c', name: 'קטגוריה', items: [{ id: 'constructor', name: 'פריט', kcal: 100 }] }],
    [{ id: 'c', name: 'קטגוריה', items: [] }, { id: 'c', name: 'כפילות', items: [] }],
    [{ id: 'c', name: 'קטגוריה', items: [{ id: 'i', name: 'פריט', kcal: 100 }, { id: 'i', name: 'כפילות', kcal: 50 }] }],
    [{ id: 'c', name: 'קטגוריה', items: [{ id: 'i', name: 'פריט', kcal: 100 }] }, { id: 'd', name: 'עוד קטגוריה', items: [{ id: 'i', name: 'כפילות', kcal: 50 }] }],
  ].map(snackCatalog => ({ snackCatalog })))('rejects a malformed catalog in settings, migration and backup parsing (%#)', ({ snackCatalog }) => {
    const state = { ...emptyData(), settings: { ...emptyData().settings, snackCatalog } };
    expect(isSettings(state.settings)).toBe(false); expect(() => migrate(state)).toThrow(); expect(() => parseBackup(state)).toThrow();
  });
  it('uses the specified localStorage key, and marks imported metadata-free data dirty', () => {
    const state = emptyData(); state.logs['2026-10-04'] = day(); let stored = '';
    const storage = { getItem: (key: string) => key === STORAGE_KEY && stored ? stored : null, setItem: (key: string, value: string) => { expect(key).toBe(STORAGE_KEY); stored = value; } };
    saveData(state, storage);
    expect(loadData(storage).data).toEqual(state);
    expect(migrate({ settings: state.settings, logs: state.logs }).meta).toMatchObject({ dirtyDays: ['2026-10-04'], settingsDirty: true });
  });
  it.each([undefined, 1])('resets an old client-clock cursor once and persists the server cursor version (%#)', cursorVersion => {
    const legacy = emptyData(); legacy.meta.cursorVersion = cursorVersion; legacy.meta.lastPulledAt = '2099-01-01T00:00:00Z';
    legacy.logs['2026-10-04'] = day(); legacy.meta.dirtyDays = ['2026-10-04'];
    let raw = JSON.stringify(legacy);
    const storage = { getItem: (key: string) => key === STORAGE_KEY ? raw : null, setItem: (_key: string, value: string) => { raw = value; } };
    const upgraded = loadData(storage).data;
    expect(upgraded.meta).toMatchObject({ cursorVersion: 2, lastPulledAt: undefined, dirtyDays: ['2026-10-04'] });
    expect(upgraded.logs).toEqual(legacy.logs);
    saveData(upgraded, storage); expect(JSON.parse(raw).meta.cursorVersion).toBe(2);
    upgraded.meta.lastPulledAt = '2026-10-08T12:00:00Z'; saveData(upgraded, storage);
    expect(loadData(storage).data.meta).toMatchObject({ cursorVersion: 2, lastPulledAt: '2026-10-08T12:00:00Z' });
  });
  it('handles unavailable, corrupt and quota-limited storage without crashing', () => {
    const setItem = () => {};
    expect(loadData({ getItem: () => { throw new Error('denied'); }, setItem }).error).toBeTruthy();
    expect(loadData({ getItem: () => '{bad', setItem }).error).toBeTruthy();
    expect(loadData({ getItem: () => null, setItem }).data.settings.slots).toHaveLength(3);
    expect(saveData(emptyData(), { getItem: () => null, setItem: () => { throw new Error('quota'); } })).toBeTruthy();
  });
  it.each(['{bad', JSON.stringify({ settings: { version: 99 }, logs: {} }), ''])('copies unreadable storage before an automatic write (%#)', raw => {
    const memory = new Map([[STORAGE_KEY, raw]]);
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
    const loaded = loadData(storage);
    expect(loaded.error).toBeTruthy(); expect(memory.get(RECOVERY_KEY)).toBe(raw);
    expect(saveData(loaded.data, storage)).toBeUndefined();
    expect(memory.get(RECOVERY_KEY)).toBe(raw); expect(loadData(storage).error).toBeUndefined();
  });
  it('never overwrites an existing recovery copy, including on writes without a prior load', () => {
    const memory = new Map([[STORAGE_KEY, '{new corruption'], [RECOVERY_KEY, '{original']]);
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
    expect(saveData(emptyData(), storage)).toBeUndefined();
    expect(memory.get(RECOVERY_KEY)).toBe('{original');
  });
  it('refuses to replace unreadable storage when the recovery copy cannot be saved', () => {
    const writes: string[] = [];
    const storage = { getItem: (key: string) => key === STORAGE_KEY ? '{original' : null,
      setItem: (key: string) => { writes.push(key); throw new Error('quota'); } };
    expect(loadData(storage).error).toBeTruthy(); expect(saveData(emptyData(), storage)).toBeTruthy();
    expect(writes).toEqual([RECOVERY_KEY, RECOVERY_KEY]);
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
