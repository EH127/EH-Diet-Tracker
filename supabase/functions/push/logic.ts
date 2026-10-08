// Pure helpers for the push function. No Deno/jsr/npm imports so the app's vitest can import this file.
export type Prefs = {
  user_id: string; evening_enabled: boolean; evening_time: string; timezone: string;
  summary_date: string | null; summary_title: string | null; summary_body: string | null; last_sent_date: string | null;
};
export type Payload = { title: string; body: string; url: string };

export function localParts(now: Date, timeZone: string): { date: string; time: string } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(now).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
// An unknown timezone name must not break the whole cron run.
export function safeLocalParts(now: Date, timeZone: string): { date: string; time: string } {
  try { return localParts(now, timeZone); } catch { return localParts(now, 'Asia/Jerusalem'); }
}
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
// Due from evening_time for 3 hours (capped at 23:59), once per local date.
export function isDue(prefs: Pick<Prefs, 'evening_enabled' | 'evening_time' | 'timezone' | 'last_sent_date'>, now: Date): boolean {
  if (!prefs.evening_enabled) return false;
  const { date, time } = safeLocalParts(now, prefs.timezone);
  if (prefs.last_sent_date === date) return false;
  const start = toMinutes(prefs.evening_time), current = toMinutes(time);
  return current >= start && current < Math.min(start + 180, 24 * 60);
}
export const fallbackPayload: Payload = { title: 'סיכום היום 🌙', body: 'עוד לא עדכנת את היומן היום. כמה שניות וזה מסודר 🙂', url: '#/today' };
export function selectPayload(prefs: Pick<Prefs, 'summary_date' | 'summary_title' | 'summary_body'>, localDate: string): Payload {
  if (prefs.summary_date === localDate && prefs.summary_title && prefs.summary_body) return { title: prefs.summary_title, body: prefs.summary_body, url: '#/today' };
  return fallbackPayload;
}
