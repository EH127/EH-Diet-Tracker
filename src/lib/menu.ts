import type { Settings } from '../types';
import { nextTimestamp } from './dates';
import { isSettings } from './validation';

export type MenuExport = { kind: 'ehdt-menu'; version: 1; exportedAt: string; settings: Settings };
export const buildMenuExport = (settings: Settings, now: Date = new Date()): MenuExport =>
  ({ kind: 'ehdt-menu', version: 1, exportedAt: now.toISOString(), settings });
// Accepts a menu file or a full backup file; only the settings are taken.
export function parseMenuFile(value: unknown): Settings {
  const file = value as { kind?: unknown; version?: unknown; settings?: unknown } | null;
  const known = !!file && typeof file === 'object' && !Array.isArray(file)
    && (file.kind === 'ehdt-menu' ? file.version === 1 : file.kind === undefined && (file.version === undefined || file.version === 1));
  if (!known || !isSettings(file.settings)) throw new Error('הקובץ אינו תפריט או גיבוי תקין. הנתונים הקיימים לא השתנו.');
  return file.settings;
}
// Replaces the menu but keeps the importing account's personal weight goal and theme.
export function mergeMenu(current: Settings, imported: Settings): Settings {
  const menu = structuredClone(imported);
  return { ...current, groups: menu.groups, templates: menu.templates, slots: menu.slots, bankPresets: menu.bankPresets, rules: menu.rules,
    dailyBankKcal: menu.dailyBankKcal, weekStartsOn: menu.weekStartsOn, waterGoal: menu.waterGoal, updatedAt: nextTimestamp(current.updatedAt) };
}
