import type { Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import type { Logs, Settings } from '../types';
import { getState, setState, subscribe } from '../store/store';
import { supabase } from './supabase';
import { emptyData } from './storage';
import { resolveSignIn, syncOnce, type SyncTransport } from './sync-engine';
import { dateKey } from './dates';
import { eveningSummary } from './summary';
import { unsubscribeThisDevice } from './push';
import { isDayLog, isSettings } from './validation';

type SyncStatus = 'local' | 'signedOut' | 'offline' | 'syncing' | 'synced' | 'error';
type SyncState = { status: SyncStatus; email?: string; error?: string };
let syncState: SyncState = { status: supabase ? 'signedOut' : 'local' };
const listeners = new Set<() => void>();
function update(value: Partial<SyncState>) { syncState = { ...syncState, ...value }; listeners.forEach(f => f()); }
const listen = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const useSync = () => useSyncExternalStore(listen, () => syncState);
export const syncLabels: Record<SyncStatus, string> = { local: 'מצב מקומי', signedOut: 'לא מחובר לחשבון', offline: 'ללא חיבור לרשת', syncing: 'מסנכרן…', synced: 'מסונכרן', error: 'ממתין לסנכרון' };
let userId: string | undefined;
let generation = 0;
let running = false;
let rerun = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function transport(id: string): SyncTransport {
  const client = supabase!;
  return {
    async pull(since) {
      const logs: Logs = {};
      let cursor = since;
      const advance = (stamp: string) => { if (!cursor || Date.parse(stamp) > Date.parse(cursor)) cursor = stamp; };
      // Paginate to avoid silently truncating histories at PostgREST's row cap.
      for (let offset = 0; ; offset += 500) {
        let query = client.from('day_logs').select('day,data,updated_at').eq('user_id', id).order('day').range(offset, offset + 499);
        if (since) query = query.gt('updated_at', since);
        const { data, error } = await query;
        if (error) throw error;
        for (const row of data ?? []) {
          if (!isDayLog(row.data) || row.day !== row.data.date) throw new Error('נתוני יום בענן אינם תקינים');
          logs[row.day] = row.data; advance(row.updated_at);
        }
        if ((data?.length ?? 0) < 500) break;
      }
      let query = client.from('user_settings').select('data,updated_at').eq('user_id', id);
      if (since) query = query.gt('updated_at', since);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      let settings: Settings | undefined;
      if (data) {
        if (!isSettings(data.data)) throw new Error('התפריט בענן אינו תקין');
        settings = data.data; advance(data.updated_at);
      }
      return { logs, settings, cursor };
    },
    async pushDays(logs) {
      for (let i = 0; i < logs.length; i += 200) {
        const { error } = await client.from('day_logs').upsert(logs.slice(i, i + 200).map(log => ({ user_id: id, day: log.date, data: log, updated_at: log.updatedAt })), { onConflict: 'user_id,day' });
        if (error) throw error;
      }
    },
    async pushSettings(settings) {
      const { error } = await client.from('user_settings').upsert({ user_id: id, data: settings, updated_at: settings.updatedAt }, { onConflict: 'user_id' });
      if (error) throw error;
    },
  };
}
let lastSummary = '';
// Best-effort: keep today's evening summary on the server for the push function. Never creates or enables prefs.
export async function uploadSummary(force = false): Promise<void> {
  if (!supabase || !userId) return;
  try {
    const date = dateKey(); const { logs, settings } = getState();
    const { title, body } = eveningSummary(date, logs, settings);
    const stamp = `${userId}|${date}|${title}|${body}`;
    if (!force && stamp === lastSummary) return;
    const { error } = await supabase.from('notification_prefs').update({ summary_date: date, summary_title: title, summary_body: body, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (!error) lastSummary = stamp;
  } catch { /* non-fatal */ }
}
export async function syncNow(): Promise<void> {
  if (!supabase || !userId) return;
  if (!navigator.onLine) { update({ status: 'offline' }); return; }
  if (running) { rerun = true; return; }
  running = true; const epoch = generation; const id = userId;
  update({ status: 'syncing', error: undefined });
  try {
    await syncOnce(transport(id), getState, setState, () => generation === epoch);
    if (generation === epoch) { update({ status: 'synced' }); void uploadSummary(); }
  } catch {
    if (generation === epoch) update({ status: navigator.onLine ? 'error' : 'offline', error: 'הנתונים נשמרו במכשיר. ננסה לסנכרן שוב בהמשך.' });
  } finally {
    running = false;
    if (rerun) { rerun = false; schedule(); }
  }
}
function schedule() { clearTimeout(timer); timer = setTimeout(() => { void syncNow(); }, 1500); }
function setSession(session: Session | null) {
  const nextId = session?.user.id;
  if (nextId !== userId) generation++;
  userId = nextId;
  update({ email: session?.user.email, status: userId ? 'syncing' : 'signedOut', error: undefined });
  if (userId) {
    // A cursor belongs to one account only; data tied to another account is reset before syncing.
    setState(resolveSignIn(getState(), userId));
    void syncNow();
  }
}
export function startSync(): () => void {
  if (!supabase) return () => {};
  let disposed = false;
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    // Leave the auth callback before making any other Supabase calls (auth lock).
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT')
      setTimeout(() => { if (!disposed) setSession(session); }, 0);
  });
  let last = getState();
  const unsubscribe = subscribe(() => {
    const next = getState();
    const changed = next.settings.updatedAt !== last.settings.updatedAt || next.meta.dirtyDays.some(d => next.logs[d]?.updatedAt !== last.logs[d]?.updatedAt);
    last = next;
    if (changed) schedule();
  });
  const visibility = () => { if (document.visibilityState === 'hidden') { clearTimeout(timer); void syncNow(); } else void syncNow(); };
  const focus = () => { void syncNow(); };
  const offline = () => { if (userId) update({ status: 'offline' }); };
  window.addEventListener('online', focus); window.addEventListener('offline', offline); window.addEventListener('focus', focus);
  document.addEventListener('visibilitychange', visibility);
  const interval = setInterval(() => { if (document.visibilityState === 'visible') void syncNow(); }, 5 * 60 * 1000);
  return () => {
    disposed = true; generation++; subscription.unsubscribe(); unsubscribe(); clearTimeout(timer); clearInterval(interval);
    window.removeEventListener('online', focus); window.removeEventListener('offline', offline); window.removeEventListener('focus', focus);
    document.removeEventListener('visibilitychange', visibility);
  };
}
export async function signOut(): Promise<void> {
  // Invalidate in-flight reads before clearing local data or changing account.
  generation++; userId = undefined; clearTimeout(timer);
  update({ status: supabase ? 'signedOut' : 'local', email: undefined });
  if (supabase) {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw new Error('ההתנתקות לא הושלמה. נסו שוב כשיש חיבור לרשת.');
  }
}
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const hasUnsynced = () => { const { meta } = getState(); return meta.dirtyDays.length > 0 || meta.settingsDirty; };
async function finalSync(): Promise<void> {
  const deadline = Date.now() + 5000;
  const attempt = async () => {
    await Promise.race([syncNow(), sleep(Math.max(0, deadline - Date.now()))]);
    while (running && Date.now() < deadline) await sleep(100);
  };
  await attempt();
  if (hasUnsynced() && Date.now() < deadline) await attempt();
}
// Explicit sign-out: push pending changes, then leave the device with a clean slate. Returns false if cancelled.
export async function signOutAndReset(): Promise<boolean> {
  if (supabase && userId) {
    await finalSync();
    if (hasUnsynced() && !window.confirm('יש שינויים שעדיין לא סונכרנו לענן. אם תתנתקו עכשיו הם יימחקו מהמכשיר. להתנתק בכל זאת?')) return false;
  }
  await unsubscribeThisDevice();
  lastSummary = '';
  await signOut();
  setState(emptyData());
  return true;
}
