import { describe, expect, it } from 'vitest';
import { buildMenuExport, mergeMenu, parseMenuFile } from './menu';
import { emptyData } from './storage';

describe('menu-only export and import', () => {
  it('builds a menu payload with settings only', () => {
    const { settings } = emptyData();
    const payload = buildMenuExport(settings, new Date('2026-10-08T10:00:00Z'));
    expect(payload).toEqual({ kind: 'ehdt-menu', version: 1, exportedAt: '2026-10-08T10:00:00.000Z', settings });
    expect(payload).not.toHaveProperty('logs');
  });
  it('parses a menu file and a full backup, taking only settings', () => {
    const { settings } = emptyData();
    expect(parseMenuFile(JSON.parse(JSON.stringify(buildMenuExport(settings))))).toEqual(settings);
    expect(parseMenuFile({ version: 1, settings, logs: {} })).toEqual(settings);
  });
  it.each([null, [], 'x', {}, { kind: 'ehdt-menu', version: 2, settings: emptyData().settings }, { kind: 'other', settings: emptyData().settings },
    { kind: 'ehdt-menu', version: 1, settings: { version: 1 } }])('rejects invalid file (%#)', value => {
    expect(() => parseMenuFile(value)).toThrow();
  });
  it('replaces the menu but keeps weightGoal and theme, and bumps updatedAt', () => {
    const current = emptyData().settings; current.weightGoal = 70; current.theme = 'dark';
    const imported = emptyData().settings; imported.weightGoal = 90; imported.theme = 'light'; imported.waterGoal = 12; imported.rules = ['כלל'];
    imported.dailyBankKcal = 400; imported.weekStartsOn = 1; imported.groups = []; imported.templates = [];
    const merged = mergeMenu(current, imported);
    expect(merged).toMatchObject({ weightGoal: 70, theme: 'dark', waterGoal: 12, rules: ['כלל'], dailyBankKcal: 400, weekStartsOn: 1, groups: [], templates: [] });
    expect(Date.parse(merged.updatedAt)).toBeGreaterThan(Date.parse(current.updatedAt));
    expect(merged.slots).toEqual(imported.slots); expect(merged.slots).not.toBe(imported.slots);
  });
});
