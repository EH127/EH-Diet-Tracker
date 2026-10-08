import type { Backup, DayLog, Settings, StoreData } from '../types';
import { dateKey, nextTimestamp } from '../lib/dates';
import { reconcileAutoBank } from '../lib/bank';
import { viewDay } from '../lib/meals';
import { mergeLogs, mergeStored, newer } from '../lib/merge';
import { emptyData, loadData, readRecoveryStorage, recoveryNotice, RECOVERY_KEY, removeData, removeRecoveryData, saveData, STORAGE_KEY } from '../lib/storage';

const initial = loadData();
let state = initial.data;
let storageError = initial.error;
let hasStoredData = initial.exists;
let lastStoredData = initial.exists && !initial.error ? initial.data : undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
export const getState = () => state;
export const getStorageError = () => storageError ?? (readRecoveryStorage() !== null ? recoveryNotice : undefined);
export const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function refreshFromStorage(): void {
  const stored = loadData();
  if (stored.error) storageError = stored.error;
  else if (!stored.exists) { if (hasStoredData) state = emptyData(); }
  else if (stored.data.meta.localResetId !== state.meta.localResetId || stored.data.meta.syncUserId !== state.meta.syncUserId) state = stored.data;
  else state = mergeStored(stored.data, state, lastStoredData);
  hasStoredData = stored.exists;
  if (!stored.error) lastStoredData = stored.exists ? stored.data : undefined;
}
window.addEventListener('storage', event => {
  if (event.storageArea && event.storageArea !== window.localStorage) return;
  if (event.key !== null && event.key !== STORAGE_KEY && event.key !== RECOVERY_KEY) return;
  // Read current storage, rather than replaying possibly delayed event payloads.
  if (storageError === recoveryNotice) storageError = undefined;
  refreshFromStorage();
  // Repair a write collision if both tabs read before either wrote. Only persist
  // an actual difference, so storage notifications cannot form a write loop.
  if (event.key === STORAGE_KEY && hasStoredData && lastStoredData && JSON.stringify(state) !== JSON.stringify(lastStoredData)) {
    storageError = saveData(state); if (!storageError) lastStoredData = state;
  }
  emit();
});
export function setState(next: StoreData, mode: 'merge' | 'replace' = 'merge'): void {
  const stored = loadData();
  if (mode === 'replace') state = { ...next, meta: { ...next.meta, localResetId: crypto.randomUUID() } };
  else {
    // A reset/account change in another tab also invalidates stale in-flight writes.
    if (next.meta.localResetId !== state.meta.localResetId
      || (!stored.error && ((!stored.exists && hasStoredData) || (stored.exists &&
        (stored.data.meta.localResetId !== state.meta.localResetId || stored.data.meta.syncUserId !== state.meta.syncUserId))))) {
      refreshFromStorage(); emit(); return;
    }
    state = stored.exists && !stored.error ? mergeStored(next, stored.data, state) : next;
  }
  storageError = saveData(state); hasStoredData = stored.exists || !storageError;
  if (!storageError) lastStoredData = state;
  emit();
}
export function editDay(date: string, change: (day: DayLog) => void): void {
  refreshFromStorage();
  const day = structuredClone(viewDay(state.logs[date], date, state.settings));
  change(day);
  day.updatedAt = nextTimestamp(day.updatedAt);
  const reconciled = reconcileAutoBank(day, state.logs, state.settings);
  setState({ ...state, logs: { ...state.logs, [date]: reconciled }, meta: { ...state.meta, dirtyDays: [...new Set([...state.meta.dirtyDays, date])] } });
}
export function editSettings(change: (settings: Settings) => void): void {
  refreshFromStorage();
  const settings = structuredClone(state.settings); change(settings); settings.updatedAt = nextTimestamp(state.settings.updatedAt);
  const logs = { ...state.logs };
  const dirtyDays = new Set(state.meta.dirtyDays);
  const today = dateKey();
  for (const [date, log] of Object.entries(logs)) {
    if (date < today) continue;
    const reconciled = reconcileAutoBank(log, logs, settings);
    if (JSON.stringify(log.bank) !== JSON.stringify(reconciled.bank)) {
      logs[date] = { ...reconciled, updatedAt: nextTimestamp(log.updatedAt) }; dirtyDays.add(date);
    }
  }
  setState({ settings, logs, meta: { ...state.meta, dirtyDays: [...dirtyDays], settingsDirty: true } });
}
export function importBackup(backup: Backup, mode: 'merge' | 'replace'): void {
  refreshFromStorage();
  const logs = mode === 'replace' ? backup.logs : mergeLogs(state.logs, backup.logs);
  const settings = mode === 'replace' ? backup.settings : newer(state.settings, backup.settings);
  // A deliberate replacement is a new edit, including when restoring an older backup.
  const updatedAt = nextTimestamp(state.settings.updatedAt);
  const restoredLogs = mode === 'replace' ? Object.fromEntries(Object.entries(logs).map(([d, log]) => [d, { ...log, updatedAt: nextTimestamp(newer(log, state.logs[d] ?? log).updatedAt) }])) : logs;
  setState({ settings: mode === 'replace' ? { ...settings, updatedAt } : settings, logs: restoredLogs,
    meta: { ...state.meta, lastPulledAt: undefined, dirtyDays: Object.keys(restoredLogs), settingsDirty: true } }, mode);
}
export function clearLocalData(): void {
  const error = removeData();
  if (error) { storageError = error; emit(); return; }
  state = emptyData(); storageError = undefined; hasStoredData = false; lastStoredData = undefined; emit();
}
export function discardRecoveryData(): void {
  storageError = removeRecoveryData(); emit();
}
