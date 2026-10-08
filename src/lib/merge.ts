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
