import { freshSettings } from '../data/defaultSettings';
import type { StoreData } from '../types';
import { parseBackup } from './validation';

export const STORAGE_KEY = 'ehdt:v1';
export const emptyData = (): StoreData => ({ settings: freshSettings(), logs: {}, meta: { dirtyDays: [], settingsDirty: true } });
export function migrate(value: unknown): StoreData {
  // v1 is the initial schema. Future versions get explicit transformations here.
  const backup = parseBackup(value);
  const source = value as { meta?: Partial<StoreData['meta']> };
  const meta = source.meta;
  const timestamp = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
  return { settings: backup.settings, logs: backup.logs, meta: {
    dirtyDays: Array.isArray(meta?.dirtyDays) ? meta.dirtyDays.filter(d => typeof d === 'string' && !!backup.logs[d]) : Object.keys(backup.logs),
    settingsDirty: typeof meta?.settingsDirty === 'boolean' ? meta.settingsDirty : true,
    lastPulledAt: timestamp(meta?.lastPulledAt) ? meta.lastPulledAt : undefined,
    lastSyncedAt: timestamp(meta?.lastSyncedAt) ? meta.lastSyncedAt : undefined,
    syncUserId: typeof meta?.syncUserId === 'string' ? meta.syncUserId : undefined,
  } };
}
export function loadData(storage?: Pick<Storage, 'getItem'>): { data: StoreData; error?: string } {
  try {
    const raw = (storage ?? window.localStorage).getItem(STORAGE_KEY);
    return { data: raw ? migrate(JSON.parse(raw)) : emptyData() };
  } catch {
    return { data: emptyData(), error: 'לא הצלחנו לקרוא את הנתונים המקומיים. הגיבוי הקיים נשמר; אפשר לייצא אותו בהגדרות לפני השמירה הבאה.' };
  }
}
export function saveData(data: StoreData, storage?: Pick<Storage, 'setItem'>): string | undefined {
  try { (storage ?? window.localStorage).setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { return 'לא ניתן לשמור במכשיר (ייתכן שהאחסון מלא). הנתונים נשארו פתוחים כאן — כדאי לייצא גיבוי כעת.'; }
}
export function removeData(): string | undefined {
  try { window.localStorage.removeItem(STORAGE_KEY); }
  catch { return 'לא ניתן למחוק מהאחסון במכשיר.'; }
}
export function readRawStorage(): string | null {
  try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
