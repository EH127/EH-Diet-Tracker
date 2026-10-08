import { freshSettings } from '../data/defaultSettings';
import type { StoreData } from '../types';
import { parseBackup } from './validation';

export const STORAGE_KEY = 'ehdt:v1';
export const RECOVERY_KEY = 'ehdt:v1:recovery';
export const recoveryNotice = 'נשמר עותק שחזור של נתונים שלא הצלחנו לקרוא. אפשר לייצא אותו בהגדרות ולמחוק את העותק לאחר הייצוא.';
type LocalStorage = Pick<Storage, 'getItem' | 'setItem'>;
export const emptyData = (): StoreData => ({ settings: freshSettings(), logs: {}, meta: { dirtyDays: [], settingsDirty: true, cursorVersion: 2 } });
export function migrate(value: unknown): StoreData {
  // Additive v1 fields are defaulted by parseBackup/withSettingsDefaults.
  // Water remains a cup count, so legacy logs and dirty timestamps stay intact.
  const backup = parseBackup(value);
  const source = value as { meta?: Partial<StoreData['meta']> };
  const meta = source.meta;
  const timestamp = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
  const cursorVersion = typeof meta?.cursorVersion === 'number' && Number.isInteger(meta.cursorVersion) ? meta.cursorVersion : 0;
  return { settings: backup.settings, logs: backup.logs, meta: {
    dirtyDays: Array.isArray(meta?.dirtyDays) ? meta.dirtyDays.filter(d => typeof d === 'string' && !!backup.logs[d]) : Object.keys(backup.logs),
    settingsDirty: typeof meta?.settingsDirty === 'boolean' ? meta.settingsDirty : true,
    // Old cursors used device edit clocks. Reset once before comparing with synced_at.
    lastPulledAt: cursorVersion >= 2 && timestamp(meta?.lastPulledAt) ? meta.lastPulledAt : undefined,
    cursorVersion: Math.max(2, cursorVersion),
    lastSyncedAt: timestamp(meta?.lastSyncedAt) ? meta.lastSyncedAt : undefined,
    syncUserId: typeof meta?.syncUserId === 'string' ? meta.syncUserId : undefined,
    localResetId: typeof meta?.localResetId === 'string' ? meta.localResetId : undefined,
  } };
}
function preserveUnreadable(storage: LocalStorage, raw: string): void {
  // The first recovery copy survives sign-in, resets, later corruption and reloads.
  if (storage.getItem(RECOVERY_KEY) === null) storage.setItem(RECOVERY_KEY, raw);
}
function protectStoredData(storage: LocalStorage): void {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return;
  try { migrate(JSON.parse(raw)); }
  catch { preserveUnreadable(storage, raw); }
}
export function loadData(storage?: LocalStorage): { data: StoreData; error?: string; exists: boolean } {
  let raw: string | null = null;
  try {
    const target = storage ?? window.localStorage;
    raw = target.getItem(STORAGE_KEY);
    if (raw === null) return { data: emptyData(), exists: false };
    try { return { data: migrate(JSON.parse(raw)), exists: true }; }
    catch { preserveUnreadable(target, raw); }
    return { data: emptyData(), error: recoveryNotice, exists: true };
  } catch {
    return { data: emptyData(), exists: raw !== null, error: 'לא הצלחנו לקרוא או לגבות את הנתונים המקומיים. האחסון המקורי לא יוחלף עד שניתן יהיה לשמור עותק שחזור.' };
  }
}
export function saveData(data: StoreData, storage?: LocalStorage): string | undefined {
  try {
    const target = storage ?? window.localStorage;
    // Also guard writes made before a load, and refuse to overwrite if copying fails.
    protectStoredData(target); target.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  catch { return 'לא ניתן לשמור במכשיר (ייתכן שהאחסון מלא). הנתונים נשארו פתוחים כאן — כדאי לייצא גיבוי כעת.'; }
}
export function removeData(): string | undefined {
  try { protectStoredData(window.localStorage); window.localStorage.removeItem(STORAGE_KEY); }
  catch { return 'לא ניתן למחוק מהאחסון במכשיר.'; }
}
export function readRecoveryStorage(): string | null {
  try { return window.localStorage.getItem(RECOVERY_KEY); } catch { return null; }
}
export function removeRecoveryData(): string | undefined {
  try { window.localStorage.removeItem(RECOVERY_KEY); }
  catch { return 'לא ניתן למחוק את עותק השחזור מהמכשיר.'; }
}
