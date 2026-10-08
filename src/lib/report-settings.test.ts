import { describe, expect, it } from 'vitest';
import type { Settings } from '../types';
import { day, settings } from './test-helpers';
import { isDayLog, isSettings, parseBackup, withSettingsDefaults } from './validation';
import { migrate, loadData, saveData, STORAGE_KEY } from './storage';
import { buildMenuExport, mergeMenu, parseMenuFile } from './menu';

const legacySettings = (): Settings => {
  const old: Partial<Settings> = { ...settings() };
  delete old.habits; delete old.weeklyReport; delete old.waterUnit; delete old.cupMl;
  return old as Settings;
};
describe('habit/report/water schema compatibility', () => {
  it('adds defaults to old local storage and backups without rewriting logs, clocks or pending edits', () => {
    const log = day('2026-10-08', { water: 5 });
    const source = { settings: legacySettings(), logs: { [log.date]: log }, meta: { cursorVersion: 2, dirtyDays: [], settingsDirty: false } };
    let raw = JSON.stringify(source);
    const storage = { getItem: (key: string) => key === STORAGE_KEY ? raw : null, setItem: (_key: string, value: string) => { raw = value; } };
    for (const upgraded of [migrate(source), parseBackup(source), loadData(storage).data]) {
      expect(upgraded.settings).toEqual(settings()); expect(upgraded.logs).toEqual(source.logs);
      expect(upgraded.logs[log.date]).not.toHaveProperty('habits');
    }
    const upgraded = migrate(source); expect(upgraded.meta).toMatchObject(source.meta);
    expect(saveData(upgraded, storage)).toBeUndefined(); expect(loadData(storage).data.settings.waterGoal).toBe(8);
    expect(source.settings).not.toHaveProperty('waterUnit'); expect(source.settings).not.toHaveProperty('habits');
    upgraded.settings.habits[0].name = 'שינוי'; upgraded.settings.weeklyReport.tasks[0].label = 'שינוי';
    expect(migrate(source).settings).toEqual(settings());
  });
  it('defaults partially present report settings and preserves empty lists and configured targets', () => {
    const partial = { ...legacySettings(), weeklyReport: { startWeight: 90, aerobicTarget: 4 } } as Settings;
    expect(isSettings(partial)).toBe(true);
    expect(withSettingsDefaults(partial).weeklyReport).toEqual({ ...settings().weeklyReport, startWeight: 90, aerobicTarget: 4 });
    const menu = { ...settings(), habits: [], weeklyReport: { workoutTarget: 2, aerobicTarget: 4, tasks: [] }, waterUnit: 'liters' as const, waterGoal: 2.5, cupMl: 300 };
    expect(parseBackup({ settings: menu, logs: {} }).settings).toEqual(menu);
  });
  it('roundtrips custom and deleted habit IDs and report rules through a full backup', () => {
    const menu = settings(); menu.habits = [{ id: 'custom', name: 'הליכה', emoji: '🚶' }];
    menu.weeklyReport = { startWeight: 85, workoutTarget: 4, aerobicTarget: 2,
      tasks: [{ id: 'custom-rule', label: 'הליכה', rule: { type: 'habit-count', habitId: 'custom', n: 4 } }] };
    const log = day('2026-10-08', { water: 5, habits: { custom: true, deleted: false } });
    const payload = { version: 1, settings: menu, logs: { [log.date]: log } };
    expect(parseBackup(JSON.parse(JSON.stringify(payload)))).toEqual(payload);
  });
  it('imports habits/report tasks and water units while preserving personal starting weight', () => {
    const current = settings(); current.weeklyReport.startWeight = 85;
    const imported = settings(); imported.habits = []; imported.waterUnit = 'liters'; imported.waterGoal = 2.5; imported.cupMl = 300;
    imported.weeklyReport.startWeight = 95; imported.weeklyReport.tasks.reverse();
    const parsed = parseMenuFile(JSON.parse(JSON.stringify(buildMenuExport(imported))));
    const result = mergeMenu(current, parsed);
    expect(result).toMatchObject({ habits: [], waterUnit: 'liters', waterGoal: 2.5, cupMl: 300, weeklyReport: { startWeight: 85 } });
    expect(result.weeklyReport.tasks).toEqual(imported.weeklyReport.tasks);
    expect(result.weeklyReport.tasks[0]).not.toBe(parsed.weeklyReport.tasks[0]);
  });
  it('keeps current additive settings for old menu imports and correctly interprets an old cup goal', () => {
    const current = settings(); current.habits = [{ id: 'custom', name: 'הליכה' }]; current.weeklyReport.tasks = [];
    current.waterUnit = 'liters'; current.waterGoal = 2.5; current.cupMl = 300;
    const old = legacySettings(); old.waterGoal = 10;
    const result = mergeMenu(current, parseMenuFile({ kind: 'ehdt-menu', version: 1, settings: old }));
    expect(result).toMatchObject({ habits: current.habits, weeklyReport: current.weeklyReport, waterGoal: 10, waterUnit: 'cups', cupMl: 250 });
    expect(mergeMenu(old, old).habits).toEqual(settings().habits);
    expect(mergeMenu(old, old).weeklyReport).toEqual(settings().weeklyReport);
  });
  it.each([
    { waterUnit: 'ml' }, { waterUnit: null }, { cupMl: 0 }, { cupMl: -1 }, { cupMl: 250.5 }, { cupMl: '250' },
    { waterGoal: -1 }, { waterGoal: NaN }, { waterGoal: Infinity },
    { habits: null }, { habits: [{ id: 'x', name: 'א' }, { id: 'x', name: 'ב' }] }, { habits: [{ id: '__proto__', name: 'א' }] },
    { habits: [{ id: 'x', name: 1 }] }, { habits: [{ id: 'x', name: 'א', emoji: 1 }] },
    { weeklyReport: null }, { weeklyReport: { startWeight: 0 } }, { weeklyReport: { workoutTarget: 1.5 } }, { weeklyReport: { aerobicTarget: 0 } },
    ...[{ type: 'unknown' }, { type: 'habit-count', habitId: 'a', n: 0 }, { type: 'habit-every-day' }, { type: 'habit-count', habitId: '__proto__' }, { type: 'workout-count', n: -1 }, { type: 'workout-count', n: 1.5 }]
      .map(rule => ({ weeklyReport: { tasks: [{ id: 'x', label: 'משימה', rule }] } })),
  ])('rejects malformed new settings (%#)', patch => {
    const menu = { ...settings(), ...patch };
    expect(isSettings(menu)).toBe(false); expect(() => parseBackup({ settings: menu, logs: {} })).toThrow();
    expect(() => parseMenuFile({ kind: 'ehdt-menu', version: 1, settings: menu })).toThrow();
  });
  it.each([null, [], { a: 1 }, { a: 'true' }, JSON.parse('{"__proto__":true}')])('rejects malformed habit dictionaries (%#)', habits => {
    expect(isDayLog({ ...day(), habits })).toBe(false);
  });
});
