import type { DayLog, Logs, Settings, StoreData } from '../types';
import { mergeRemote } from './merge';

export type RemoteData = { logs: Logs; settings?: Settings; cursor?: string };
export type SyncTransport = {
  pull: (since?: string) => Promise<RemoteData>;
  pushDays: (logs: DayLog[]) => Promise<void>;
  pushSettings: (settings: Settings) => Promise<void>;
};
export async function syncOnce(transport: SyncTransport, get: () => StoreData, set: (data: StoreData) => void, valid: () => boolean): Promise<void> {
  // Pull before push: first login merges local history with cloud history in both directions.
  const remote = await transport.pull(get().meta.lastPulledAt);
  if (!valid()) return;
  let current = mergeRemote(get(), remote.logs, remote.settings);
  set(current);
  const snapshot = current;
  const pending = snapshot.meta.dirtyDays.map(d => snapshot.logs[d]).filter(Boolean);
  if (pending.length) await transport.pushDays(pending);
  if (!valid()) return;
  current = get();
  // Never clear a dirty marker for an edit made while a request was in flight.
  set({ ...current, meta: { ...current.meta, dirtyDays: current.meta.dirtyDays.filter(d =>
    !pending.some(log => log.date === d && log.updatedAt === current.logs[d]?.updatedAt)) } });
  if (snapshot.meta.settingsDirty) await transport.pushSettings(snapshot.settings);
  if (!valid()) return;
  current = get();
  set({ ...current, meta: { ...current.meta,
    settingsDirty: current.meta.settingsDirty && (!snapshot.meta.settingsDirty || current.settings.updatedAt !== snapshot.settings.updatedAt),
    lastPulledAt: remote.cursor ?? current.meta.lastPulledAt,
    lastSyncedAt: new Date().toISOString(),
  } });
}
