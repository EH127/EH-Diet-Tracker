import { freshSettings } from '../data/defaultSettings';
import { newDay } from './meals';
import type { BankEntry, DayLog, Settings } from '../types';
export const settings = freshSettings;
export function day(date = '2026-10-04', patch: Partial<DayLog> = {}, menu: Settings = settings()): DayLog {
  return { ...newDay(date, menu), updatedAt: '2026-10-04T12:00:00.000Z', ...patch };
}
export function bank(chargeDate: string, charge = 250, id = 'manual'): BankEntry {
  return { id, kind: 'snack', label: 'חטיף', kcal: charge, charge, chargeDate };
}
