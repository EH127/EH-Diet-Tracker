import type { BankEntry, DayLog, Logs, Settings } from '../types';
import { addDays } from './dates';

export function chargedEntries(date: string, logs: Logs): (BankEntry & { origin: string })[] {
  return Object.values(logs).flatMap(day => day.bank.filter(e => e.chargeDate === date).map(e => ({ ...e, origin: day.date })));
}
export const spent = (date: string, logs: Logs) => chargedEntries(date, logs).reduce((sum, entry) => sum + entry.charge, 0);
export const remaining = (date: string, logs: Logs, budget: number) => budget - spent(date, logs);
export function suggestChargeDate(date: string, charge: number, logs: Logs, budget: number): string {
  for (let offset = 0; offset <= 14; offset++) {
    const candidate = addDays(date, offset);
    if (remaining(candidate, logs, budget) >= charge) return candidate;
  }
  // If there is no room in the search window, leave an explicit overdraft on the requested day.
  return date;
}
export const autoMealId = (slot: string) => `auto:${slot}:meal`;
export const autoExtraId = (slot: string, index: number) => `auto:${slot}:extra:${index}`;

export function reconcileAutoBank(day: DayLog, logs: Logs, settings: Settings): DayLog {
  const old = new Map(day.bank.filter(e => e.auto).map(e => [e.id, e]));
  const bank = day.bank.filter(e => !e.auto);
  const current = { ...day, bank };
  const allLogs = { ...logs, [day.date]: current };
  // Reserve all same-day charges before allocating extras, including multiple eat-out slots.
  for (const meal of day.meals) {
    const template = settings.templates.find(t => t.id === meal.templateId);
    if (template?.bankChargeSameDay !== undefined) bank.push({ id: autoMealId(meal.slotId), kind: 'eatout', label: template.name,
      kcal: 0, charge: template.bankChargeSameDay, chargeDate: day.date, auto: true });
  }
  // Reserve existing overrides first so newly added extras cannot take their capacity.
  const pending: { id: string; charge: number; label: string }[] = [];
  for (const meal of day.meals) {
    const template = settings.templates.find(t => t.id === meal.templateId);
    if (template?.extraChargeKcal === undefined) continue;
    for (let index = 0; index < (meal.extras ?? 0); index++) {
      const id = autoExtraId(meal.slotId, index);
      const previous = old.get(id);
      const entry = { id, kind: 'extra' as const, label: `תוספת ${index + 1} · ${template.name}`, kcal: 0, charge: template.extraChargeKcal, auto: true };
      if (previous) bank.push({ ...entry, chargeDate: previous.chargeDate });
      else pending.push(entry);
    }
  }
  for (const entry of pending) bank.push({ ...entry, kind: 'extra', kcal: 0, auto: true,
    chargeDate: suggestChargeDate(addDays(day.date, 1), entry.charge, allLogs, settings.dailyBankKcal) });
  return current;
}
