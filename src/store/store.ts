import type { Backup, DayLog, Settings, StoreData } from '../types';
import { nextTimestamp } from '../lib/dates';
import { reconcileAutoBank } from '../lib/bank';
import { viewDay } from '../lib/meals';
import { mergeLogs, newer } from '../lib/merge';
import { emptyData, loadData, removeData, saveData } from '../lib/storage';

const initial = loadData();
let state = initial.data;
let storageError = initial.error;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
export const getState = () => state;
export const getStorageError = () => storageError;
export const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function setState(next: StoreData): void {
  state = next; storageError = saveData(state); emit();
}
export function editDay(date: string, change: (day: DayLog) => void): void {
  const day = structuredClone(viewDay(state.logs[date], date, state.settings));
  change(day);
  day.updatedAt = nextTimestamp(day.updatedAt);
  const reconciled = reconcileAutoBank(day, state.logs, state.settings);
  setState({ ...state, logs: { ...state.logs, [date]: reconciled }, meta: { ...state.meta, dirtyDays: [...new Set([...state.meta.dirtyDays, date])] } });
}
export function editSettings(change: (settings: Settings) => void): void {
  const settings = structuredClone(state.settings); change(settings); settings.updatedAt = nextTimestamp(state.settings.updatedAt);
  const logs = { ...state.logs };
  const dirtyDays = new Set(state.meta.dirtyDays);
  for (const [date, log] of Object.entries(logs)) {
    const reconciled = reconcileAutoBank(log, logs, settings);
    if (JSON.stringify(log.bank) !== JSON.stringify(reconciled.bank)) {
      logs[date] = { ...reconciled, updatedAt: nextTimestamp(log.updatedAt) }; dirtyDays.add(date);
    }
  }
  setState({ settings, logs, meta: { ...state.meta, dirtyDays: [...dirtyDays], settingsDirty: true } });
}
export function importBackup(backup: Backup, mode: 'merge' | 'replace'): void {
  const logs = mode === 'replace' ? backup.logs : mergeLogs(state.logs, backup.logs);
  const settings = mode === 'replace' ? backup.settings : newer(state.settings, backup.settings);
  // A deliberate replacement is a new edit, including when restoring an older backup.
  const updatedAt = nextTimestamp(state.settings.updatedAt);
  const restoredLogs = mode === 'replace' ? Object.fromEntries(Object.entries(logs).map(([d, log]) => [d, { ...log, updatedAt: nextTimestamp(log.updatedAt) }])) : logs;
  setState({ settings: mode === 'replace' ? { ...settings, updatedAt } : settings, logs: restoredLogs,
    meta: { ...state.meta, lastPulledAt: undefined, dirtyDays: Object.keys(restoredLogs), settingsDirty: true } });
}
export function clearLocalData(): void {
  const error = removeData();
  if (error) { storageError = error; emit(); return; }
  state = emptyData(); storageError = undefined; emit();
}
