import { supabase } from './supabase';
import { isIos, isStandalone } from './install';

export type PushPrefs = { evening_enabled: boolean; evening_time: string };
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export type PushAvailability = 'ok' | 'ios-install' | 'unsupported' | 'denied';
export function pushAvailability(): PushAvailability {
  if (isIos() && !isStandalone()) return 'ios-install';
  if (!pushSupported()) return 'unsupported';
  return Notification.permission === 'denied' ? 'denied' : 'ok';
}
function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + '='.repeat((4 - value.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
const hhmm = (time: string) => time.slice(0, 5);

export async function loadPrefs(): Promise<PushPrefs | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('notification_prefs').select('evening_enabled,evening_time').maybeSingle();
  if (error) throw error;
  return data ? { evening_enabled: data.evening_enabled, evening_time: hhmm(data.evening_time) } : null;
}
// Must be called from a click handler so the permission prompt is allowed.
export async function enableEvening(time: string): Promise<void> {
  if (!supabase) throw new Error('no client');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('denied');
  const { data, error } = await supabase.functions.invoke('push', { body: { action: 'key' } });
  if (error || !data?.applicationServerKey) throw new Error('key');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription()
    ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(data.applicationServerKey) });
  const keys = subscription.toJSON().keys;
  if (!keys?.p256dh || !keys.auth) throw new Error('subscription');
  const sub = await supabase.from('push_subscriptions').upsert({ endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: navigator.userAgent }, { onConflict: 'endpoint' });
  if (sub.error) throw sub.error;
  const prefs = await supabase.from('notification_prefs').upsert({ evening_enabled: true, evening_time: time, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (prefs.error) throw prefs.error;
}
export async function updatePrefs(patch: Partial<PushPrefs>): Promise<void> {
  if (!supabase) throw new Error('no client');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('no session');
  const { error } = await supabase.from('notification_prefs').update({ ...patch, updated_at: new Date().toISOString() }).eq('user_id', session.user.id);
  if (error) throw error;
}
export async function sendTest(): Promise<{ sent: number; removed: number }> {
  if (!supabase) throw new Error('no client');
  const { data, error } = await supabase.functions.invoke('push', { body: { action: 'test' } });
  if (error) throw error;
  return data as { sent: number; removed: number };
}
// Best-effort cleanup on sign-out so another account on this browser can subscribe.
export async function unsubscribeThisDevice(): Promise<void> {
  try {
    if (!supabase || !pushSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
    await subscription.unsubscribe();
  } catch { /* non-fatal */ }
}
