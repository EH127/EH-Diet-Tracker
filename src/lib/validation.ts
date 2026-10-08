import type { Backup, DayLog, Settings } from '../types';
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
    && optional(c.amountNote, str) && optional(c.amountOverrides, v => record(v, str));
}
export function isSettings(v: unknown): v is Settings {
  if (!obj(v)) return false;
  return v.version === 1 && (v.weekStartsOn === 0 || v.weekStartsOn === 1) && num(v.dailyBankKcal)
    && integer(v.waterGoal) && v.waterGoal > 0 && optional(v.weightGoal, n => num(n) && n > 0)
    && ['system', 'light', 'dark'].includes(String(v.theme)) && stamp(v.updatedAt) && strings(v.rules)
    && items(v.groups, g => str(g.name) && items(g.options, o => str(o.name) && str(o.amount) && bool(o.active)
      && optional(o.kcal, num) && optional(o.weeklyLimit, integer) && optional(o.note, str)))
    && items(v.templates, t => str(t.name) && optional(t.emoji, str) && optional(t.note, str) && items(t.components, component)
      && ['requiresWorkout', 'preferWorkout', 'countsAsCheat'].every(k => optional(t[k], bool))
      && optional(t.weeklyLimit, integer) && optional(t.bankChargeSameDay, num) && optional(t.extraChargeKcal, num))
    && items(v.slots, s => str(s.name) && str(s.defaultTemplateId))
    && items(v.bankPresets, p => str(p.name) && ['snack', 'alcohol', 'other'].includes(String(p.kind)) && num(p.kcal) && num(p.charge))
    && new Set((v.groups as { options: { id: string }[] }[]).flatMap(g => g.options.map(o => o.id))).size === (v.groups as { options: unknown[] }[]).flatMap(g => g.options).length;
}
export function isDayLog(v: unknown): v is DayLog {
  return obj(v) && isDateKey(v.date) && bool(v.workout) && integer(v.water) && stamp(v.updatedAt)
    && optional(v.weight, n => num(n) && n > 0) && optional(v.notes, str)
    && Array.isArray(v.meals) && v.meals.every(m => obj(m) && id(m.slotId) && str(m.templateId) && bool(m.done)
      && record(m.selections, strings) && optional(m.extras, n => integer(n) && n <= 100) && optional(m.freeText, str))
    && new Set(v.meals.map(m => (m as Obj).slotId)).size === v.meals.length
    && items(v.bank, e => ['snack', 'alcohol', 'eatout', 'extra', 'other'].includes(String(e.kind)) && str(e.label)
      && num(e.kcal) && num(e.charge) && isDateKey(e.chargeDate) && optional(e.auto, bool));
}
export function parseBackup(value: unknown): Backup {
  if (!obj(value) || (value.version !== undefined && value.version !== 1) || !isSettings(value.settings)
    || !obj(value.logs) || !Object.entries(value.logs).every(([date, log]) => isDateKey(date) && isDayLog(log) && date === log.date)) {
    throw new Error('הקובץ אינו גיבוי תקין או שהגרסה אינה נתמכת. הנתונים הקיימים לא השתנו.');
  }
  return { version: 1, settings: value.settings, logs: value.logs as Record<string, DayLog> };
}
