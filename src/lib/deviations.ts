import type { BankEntry, DayLog, Logs, Settings } from '../types';
import { addDays, dateRange, dayName, startOfWeek } from './dates';
import { remaining } from './bank';

export type DeviationPart = { date: string; kcal: number };
export type DeviationGroup = { groupId: string; origin: string; category?: string; note?: string; kcal: number; parts: DeviationPart[] };

// Takes from the day's own bank first, then the following days of the same week, and any leftover overdraws the day itself.
export function allocateDeviation(date: string, kcal: number, logs: Logs, settings: Settings): DeviationPart[] {
  const budget = settings.dailyBankKcal;
  const weekEnd = addDays(startOfWeek(date, settings.weekStartsOn), 6);
  const parts: DeviationPart[] = [];
  let left = Math.max(0, Math.round(kcal));
  for (let day = date; day <= weekEnd && left > 0; day = addDays(day, 1)) {
    const take = Math.min(left, remaining(day, logs, budget));
    if (take > 0) { parts.push({ date: day, kcal: take }); left -= take; }
  }
  if (left > 0) {
    const own = parts.find(p => p.date === date);
    if (own) own.kcal += left; else parts.unshift({ date, kcal: left });
  }
  return parts;
}
export const deviationEntries = (day?: DayLog): BankEntry[] => (day?.bank ?? []).filter(e => e.kind === 'deviation');
export function deviationGroups(day?: DayLog): DeviationGroup[] {
  const groups = new Map<string, DeviationGroup>();
  for (const e of deviationEntries(day)) {
    const key = e.groupId ?? e.id;
    const group = groups.get(key) ?? { groupId: key, origin: day!.date, category: e.category, note: e.note, kcal: 0, parts: [] };
    group.kcal += e.kcal; group.parts.push({ date: e.chargeDate, kcal: e.kcal }); groups.set(key, group);
  }
  return [...groups.values()];
}
export const deviationsInRange = (from: string, to: string, logs: Logs) =>
  dateRange(from, to).flatMap(date => deviationGroups(logs[date]));
export const categoryOf = (id: string | undefined, settings: Settings) => settings.deviationCategories.find(c => c.id === id);
export const categoryName = (id: string | undefined, settings: Settings) => id === undefined ? 'חריגה' : categoryOf(id, settings)?.name ?? '(נמחק)';
export function describeParts(parts: DeviationPart[], origin: string): string {
  const when = (d: string) => d === origin ? 'היום' : d === addDays(origin, 1) ? 'מחר' : dayName(d);
  return parts.map(p => `${p.kcal} מ${when(p.date)}`).join(' · ');
}
export function entriesFor(date: string, kcal: number, input: { groupId: string; category?: string; note?: string; label: string }, logs: Logs, settings: Settings): BankEntry[] {
  return allocateDeviation(date, kcal, logs, settings).map(part => ({ id: crypto.randomUUID(), kind: 'deviation', label: input.label, kcal: part.kcal,
    charge: part.kcal, chargeDate: part.date, groupId: input.groupId, ...(input.category ? { category: input.category } : {}), ...(input.note ? { note: input.note } : {}) }));
}
