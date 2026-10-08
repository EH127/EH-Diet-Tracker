import type { Backup, DayLog, Settings, SnackCategory } from '../types';
import { defaultSettings } from '../data/defaultSettings';
import { isDateKey } from './dates';

type Obj = Record<string, unknown>;
const obj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const integer = (v: unknown): v is number => num(v) && Number.isInteger(v);
const bool = (v: unknown) => typeof v === 'boolean';
const optional = (v: unknown, check: (x: unknown) => boolean) => v === undefined || check(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(str);
const record = (v: unknown, check: (x: unknown) => boolean) => obj(v) && Object.keys(v).every(k => !['__proto__', 'constructor', 'prototype'].includes(k)) && Object.values(v).every(check);
const stamp = (v: unknown) => str(v) && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
const id = (v: unknown) => str(v) && v.length > 0 && !['__proto__', 'constructor', 'prototype'].includes(v);
function items(v: unknown, check: (x: Obj) => boolean): boolean {
  return Array.isArray(v) && v.every(x => obj(x) && id(x.id) && check(x)) && new Set(v.map(x => (x as Obj).id)).size === v.length;
}
function component(c: Obj): boolean {
  if (!str(c.label)) return false;
  if (c.kind === 'check') return optional(c.note, str);
  return c.kind === 'choice' && strings(c.groupIds) && integer(c.pick) && c.pick >= 1 && bool(c.required)
    && optional(c.optionIds, strings) && optional(c.amountNote, str) && optional(c.amountOverrides, v => record(v, str));
}
function snackCatalog(v: unknown): boolean {
  if (!items(v, c => str(c.name) && optional(c.emoji, str)
    && items(c.items, i => str(i.name) && optional(i.portion, str) && num(i.kcal) && optional(i.note, str)))) return false;
  const all = (v as SnackCategory[]).flatMap(c => c.items);
  return new Set(all.map(i => i.id)).size === all.length;
}
function reportRule(v: unknown): boolean {
  if (!obj(v)) return false;
  switch (v.type) {
    case 'water-every-day': case 'rating-10': case 'manual': return true;
    case 'habit-every-day': return id(v.habitId);
    case 'habit-count': return id(v.habitId) && optional(v.n, n => integer(n) && n > 0);
    case 'workout-count': return optional(v.n, n => integer(n) && n > 0);
    default: return false;
  }
}
// Defaults cover local storage, backups and cloud pulls. Empty lists are deliberate.
// Legacy water and waterGoal stay in cups; no day-log rewrite or timestamp change.
export const withSettingsDefaults = (s: Settings): Settings => {
  if (s.deviationCategories && s.snackCatalog && s.habits && s.waterUnit && s.cupMl
    && s.weeklyReport?.workoutTarget !== undefined && s.weeklyReport?.aerobicTarget !== undefined && s.weeklyReport?.tasks) return s;
  return { ...s,
    deviationCategories: s.deviationCategories ?? structuredClone(defaultSettings.deviationCategories),
    snackCatalog: s.snackCatalog ?? structuredClone(defaultSettings.snackCatalog),
    habits: s.habits ?? structuredClone(defaultSettings.habits),
    waterUnit: s.waterUnit ?? 'cups', cupMl: s.cupMl ?? 250,
    weeklyReport: { ...s.weeklyReport,
      workoutTarget: s.weeklyReport?.workoutTarget ?? 3, aerobicTarget: s.weeklyReport?.aerobicTarget ?? 3,
      tasks: s.weeklyReport?.tasks ?? structuredClone(defaultSettings.weeklyReport.tasks) },
  };
};
export function isSettings(v: unknown): v is Settings {
  if (!obj(v)) return false;
  return v.version === 1 && (v.weekStartsOn === 0 || v.weekStartsOn === 1) && num(v.dailyBankKcal)
    && num(v.waterGoal) && v.waterGoal > 0 && optional(v.weightGoal, n => num(n) && n > 0)
    && optional(v.waterUnit, u => u === 'cups' || u === 'liters') && optional(v.cupMl, n => integer(n) && n > 0)
    && optional(v.habits, h => items(h, x => str(x.name) && optional(x.emoji, str)))
    && optional(v.weeklyReport, r => obj(r) && optional(r.startWeight, n => num(n) && n > 0)
      && optional(r.workoutTarget, n => integer(n) && n > 0) && optional(r.aerobicTarget, n => integer(n) && n > 0)
      && optional(r.tasks, t => items(t, x => str(x.label) && reportRule(x.rule))))
    && ['system', 'light', 'dark'].includes(String(v.theme)) && stamp(v.updatedAt) && strings(v.rules)
    && items(v.groups, g => str(g.name) && items(g.options, o => str(o.name) && str(o.amount) && bool(o.active)
      && optional(o.kcal, num) && optional(o.weeklyLimit, integer) && optional(o.note, str)))
    && items(v.templates, t => str(t.name) && optional(t.emoji, str) && optional(t.note, str) && items(t.components, component)
      && ['requiresWorkout', 'preferWorkout', 'countsAsCheat'].every(k => optional(t[k], bool))
      && optional(t.weeklyLimit, integer) && optional(t.bankChargeSameDay, num) && optional(t.extraChargeKcal, num))
    && items(v.slots, s => str(s.name) && str(s.defaultTemplateId))
    && optional(v.deviationCategories, c => items(c, x => str(x.name) && optional(x.emoji, str)))
    && optional(v.snackCatalog, snackCatalog)
    && items(v.bankPresets, p => str(p.name) && ['snack', 'alcohol', 'other'].includes(String(p.kind)) && num(p.kcal) && num(p.charge))
    && new Set((v.groups as { options: { id: string }[] }[]).flatMap(g => g.options.map(o => o.id))).size === (v.groups as { options: unknown[] }[]).flatMap(g => g.options).length;
}
export function isDayLog(v: unknown): v is DayLog {
  return obj(v) && isDateKey(v.date) && bool(v.workout) && integer(v.water) && stamp(v.updatedAt)
    && optional(v.weight, n => num(n) && n > 0) && optional(v.notes, str)
    && optional(v.habits, h => record(h, bool))
    && Array.isArray(v.meals) && v.meals.every(m => obj(m) && id(m.slotId) && str(m.templateId) && bool(m.done)
      && record(m.selections, strings) && optional(m.extras, n => integer(n) && n <= 100) && optional(m.freeText, str))
    && new Set(v.meals.map(m => (m as Obj).slotId)).size === v.meals.length
    && items(v.bank, e => ['snack', 'alcohol', 'eatout', 'extra', 'other', 'deviation'].includes(String(e.kind)) && str(e.label)
      && num(e.kcal) && num(e.charge) && isDateKey(e.chargeDate) && optional(e.auto, bool)
      && optional(e.category, str) && optional(e.note, str) && optional(e.groupId, str));
}
export function parseBackup(value: unknown): Backup {
  if (!obj(value) || (value.version !== undefined && value.version !== 1) || !isSettings(value.settings)
    || !obj(value.logs) || !Object.entries(value.logs).every(([date, log]) => isDateKey(date) && isDayLog(log) && date === log.date)) {
    throw new Error('הקובץ אינו גיבוי תקין או שהגרסה אינה נתמכת. הנתונים הקיימים לא השתנו.');
  }
  return { version: 1, settings: withSettingsDefaults(value.settings), logs: value.logs as Record<string, DayLog> };
}
