// Deployed with verify_jwt = false. Actions: key | test | cron.
import * as webpush from 'jsr:@negrel/webpush@0.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { isDue, isWeeklyDue, safeLocalParts, selectPayload, weeklyPayload, type Payload, type Prefs } from './logic.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!,
  (JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!,
  { auth: { persistSession: false } });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-token',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Config = { vapid_keys: { publicKey: JsonWebKey; privateKey: JsonWebKey } | null; application_server_key: string | null; cron_token: string };
async function readConfig(): Promise<Config> {
  const { data, error } = await admin.from('push_config').select('vapid_keys, application_server_key, cron_token').eq('id', 1).single();
  if (error) throw error;
  return data as Config;
}
let cached: { config: Config; appServer: webpush.ApplicationServer } | undefined;
async function load() {
  if (cached) return cached;
  let config = await readConfig();
  if (!config.vapid_keys) {
    const keys = await webpush.generateVapidKeys({ extractable: true });
    const exported = await webpush.exportVapidKeys(keys);
    const applicationServerKey = await webpush.exportApplicationServerKey(keys);
    // Only the first writer wins; re-read to pick up the winner's keys.
    await admin.from('push_config').update({ vapid_keys: exported, application_server_key: applicationServerKey }).eq('id', 1).is('vapid_keys', null);
    config = await readConfig();
  }
  if (!config.vapid_keys) throw new Error('VAPID keys unavailable');
  const vapidKeys = await webpush.importVapidKeys(config.vapid_keys, { extractable: false });
  const appServer = await webpush.ApplicationServer.new({ contactInformation: 'https://eh127.github.io/EH-Diet-Tracker/', vapidKeys });
  cached = { config, appServer };
  return cached;
}

async function sendToUser(userId: string, payload: Payload): Promise<{ sent: number; removed: number }> {
  const { appServer } = await load();
  const { data: subs, error } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId);
  if (error) throw error;
  let sent = 0, removed = 0;
  for (const sub of subs ?? []) {
    try {
      await appServer.subscribe({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } })
        .pushTextMessage(JSON.stringify(payload), { ttl: 4 * 3600 });
      sent++;
    } catch (err) {
      const status = err instanceof webpush.PushMessageError ? err.response.status : 0;
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id); removed++;
      } else console.error('push failed', status, err instanceof Error ? err.message : err);
    }
  }
  return { sent, removed };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { action } = await req.json().catch(() => ({ action: undefined }));
    if (action === 'key') {
      const { config } = await load();
      return json({ applicationServerKey: config.application_server_key });
    }
    if (action === 'test') {
      const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) return json({ error: 'unauthorized' }, 401);
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return json({ error: 'unauthorized' }, 401);
      return json(await sendToUser(data.user.id, { title: 'בדיקת התראות ✅', body: 'ההתראות עובדות. נתראה בסיכום הערב 🌙', url: '#/today' }));
    }
    if (action === 'cron') {
      const { config } = await load();
      const token = req.headers.get('x-cron-token');
      if (!token || token !== config.cron_token) return json({ error: 'forbidden' }, 403);
      const { data, error } = await admin.from('notification_prefs').select('*').or('evening_enabled.eq.true,weekly_enabled.eq.true');
      if (error) throw error;
      const now = new Date();
      let due = 0, sent = 0, removed = 0;
      for (const prefs of (data ?? []) as Prefs[]) {
        const { date } = safeLocalParts(now, prefs.timezone);
        if (isDue(prefs, now)) {
          // Claim the day atomically so overlapping runs never double-send.
          const { data: claimed, error: claimError } = await admin.from('notification_prefs').update({ last_sent_date: date })
            .eq('user_id', prefs.user_id).or(`last_sent_date.is.null,last_sent_date.neq.${date}`).select();
          if (!claimError && claimed?.length) {
            due++;
            const result = await sendToUser(prefs.user_id, selectPayload(prefs, date));
            sent += result.sent; removed += result.removed;
          }
        }
        if (isWeeklyDue(prefs, now)) {
          // Separate claim: an evening send must not consume the weekly reminder.
          const { data: claimed, error: claimError } = await admin.from('notification_prefs').update({ last_weekly_sent_date: date })
            .eq('user_id', prefs.user_id).or(`last_weekly_sent_date.is.null,last_weekly_sent_date.neq.${date}`).select();
          if (!claimError && claimed?.length) {
            due++;
            const result = await sendToUser(prefs.user_id, weeklyPayload);
            sent += result.sent; removed += result.removed;
          }
        }
      }
      return json({ due, sent, removed });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: 'server error' }, 500);
  }
});
