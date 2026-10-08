import type { Logs, Settings, StoreData } from '../types';
export function newer<T extends { updatedAt: string }>(local: T, remote: T): T {
  return Date.parse(remote.updatedAt) > Date.parse(local.updatedAt) ? remote : local;
}
export function mergeLogs(local: Logs, remote: Logs): Logs {
  const merged = { ...local };
  for (const [date, log] of Object.entries(remote)) merged[date] = local[date] ? newer(local[date], log) : log;
  return merged;
}
export function mergeRemote(local: StoreData, remoteLogs: Logs, remoteSettings?: Settings): StoreData {
  const logs = mergeLogs(local.logs, remoteLogs);
  const settings = remoteSettings ? newer(local.settings, remoteSettings) : local.settings;
  return { settings, logs, meta: { ...local.meta,
    dirtyDays: local.meta.dirtyDays.filter(d => logs[d] === local.logs[d]),
    settingsDirty: local.meta.settingsDirty && settings === local.settings,
  } };
}
export function mergeStored(local: StoreData, stored: StoreData, previous?: StoreData): StoreData {
  const logs = mergeLogs(local.logs, stored.logs);
  const settings = newer(local.settings, stored.settings);
  const localCursorVersion = local.meta.cursorVersion ?? 0;
  const storedCursorVersion = stored.meta.cursorVersion ?? 0;
  // Union pending edits, except acknowledgements of the exact version uploaded.
  // A different version written by another tab must remain dirty.
  const acknowledged = (date: string) => previous?.meta.dirtyDays.includes(date) && !local.meta.dirtyDays.includes(date)
    && stored.logs[date]?.updatedAt === previous.logs[date]?.updatedAt;
  const settingsAcknowledged = previous?.meta.settingsDirty && !local.meta.settingsDirty
    && stored.settings.updatedAt === previous.settings.updatedAt;
  return { settings, logs, meta: { ...stored.meta, ...local.meta,
    // Keep the cursor paired with its version when merging an older tab's state.
    cursorVersion: Math.max(localCursorVersion, storedCursorVersion) || undefined,
    lastPulledAt: storedCursorVersion > localCursorVersion ? stored.meta.lastPulledAt : local.meta.lastPulledAt,
    dirtyDays: [...new Set([...local.meta.dirtyDays, ...stored.meta.dirtyDays])].filter(d => !!logs[d] && !acknowledged(d)),
    settingsDirty: local.meta.settingsDirty || (stored.meta.settingsDirty && !settingsAcknowledged),
  } };
}
