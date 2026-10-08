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
    expect(mergeMenu(current, { ...imported, deviationCategories: [{ id: 'x', name: 'X' }] }).deviationCategories).toEqual([{ id: 'x', name: 'X' }]);
    expect(merged.slots).toEqual(imported.slots); expect(merged.slots).not.toBe(imported.slots);
  });
  it('roundtrips a custom snack catalog through menu export/import without sharing mutable items', () => {
    const current = emptyData().settings;
    const imported = emptyData().settings; imported.snackCatalog = [{ id: 'custom', name: 'מותאם', emoji: '🍪', items: [{ id: 'cookie', name: 'עוגייה', portion: 'יחידה', kcal: 80, note: 'הערה' }] }];
    const parsed = parseMenuFile(JSON.parse(JSON.stringify(buildMenuExport(imported))));
    const merged = mergeMenu(current, parsed);
    expect(merged.snackCatalog).toEqual(imported.snackCatalog); expect(merged.snackCatalog[0].items[0]).not.toBe(parsed.snackCatalog[0].items[0]);
    expect(current.snackCatalog).toEqual(emptyData().settings.snackCatalog);
    expect(mergeMenu(current, { ...parsed, snackCatalog: [] }).snackCatalog).toEqual([]);
  });
  it('keeps the current catalog when an imported menu or backup lacks it, and defaults a legacy current menu', () => {
    const current = emptyData().settings; current.snackCatalog = [{ id: 'custom', name: 'מותאם', items: [] }];
    const old: Record<string, unknown> = { ...emptyData().settings }; delete old.snackCatalog;
    for (const file of [{ kind: 'ehdt-menu', version: 1, settings: old }, { version: 1, settings: old, logs: {} }]) {
      const parsed = parseMenuFile(file);
      expect(mergeMenu(current, parsed).snackCatalog).toEqual(current.snackCatalog);
      expect(mergeMenu({ ...current, snackCatalog: [] }, parsed).snackCatalog).toEqual([]);
      expect(mergeMenu(parsed, parsed).snackCatalog).toEqual(emptyData().settings.snackCatalog);
    }
  });
  it('rejects a malformed imported catalog before merging the menu', () => {
    const settings = { ...emptyData().settings, snackCatalog: [{ id: 'c', name: 'קטגוריה', items: [{ id: 'i', name: 'פריט', kcal: -1 }] }] };
    expect(() => parseMenuFile({ kind: 'ehdt-menu', version: 1, settings })).toThrow();
  });
});
