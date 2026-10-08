import { describe, expect, it } from 'vitest';
import { fallbackPayload, isDue, isWeeklyDue, localParts, localWeekday, selectPayload, weeklyPayload } from '../../supabase/functions/push/logic.ts';

const prefs = { evening_enabled: true, evening_time: '21:30:00', timezone: 'Asia/Jerusalem', last_sent_date: null as string | null };
describe('push logic', () => {
  it('computes local date and time in the given timezone', () => {
    expect(localParts(new Date('2026-10-08T19:45:00Z'), 'Asia/Jerusalem')).toEqual({ date: '2026-10-08', time: '22:45' });
    expect(localParts(new Date('2026-10-08T22:30:00Z'), 'Asia/Jerusalem')).toEqual({ date: '2026-10-09', time: '01:30' });
  });
  it('is due from the chosen time for three hours, once per local day', () => {
    expect(isDue(prefs, new Date('2026-10-08T18:29:00Z'))).toBe(false); // 21:29 local
    expect(isDue(prefs, new Date('2026-10-08T18:30:00Z'))).toBe(true); // 21:30 local
    expect(isDue(prefs, new Date('2026-10-08T20:59:00Z'))).toBe(true); // 23:59 local
    expect(isDue(prefs, new Date('2026-10-08T21:00:00Z'))).toBe(false); // midnight
    expect(isDue({ ...prefs, last_sent_date: '2026-10-08' }, new Date('2026-10-08T19:00:00Z'))).toBe(false);
    expect(isDue({ ...prefs, last_sent_date: '2026-10-07' }, new Date('2026-10-08T19:00:00Z'))).toBe(true);
    expect(isDue({ ...prefs, evening_enabled: false }, new Date('2026-10-08T19:00:00Z'))).toBe(false);
  });
  it('uses the uploaded summary only for the same local date', () => {
    const p = { summary_date: '2026-10-08', summary_title: 'כותרת', summary_body: 'גוף' };
    expect(selectPayload(p, '2026-10-08')).toEqual({ title: 'כותרת', body: 'גוף', url: '#/today' });
    expect(selectPayload(p, '2026-10-09')).toEqual(fallbackPayload);
  });
});

const weekly = { weekly_enabled: true, weekly_day: 0, weekly_time: '10:00:00', timezone: 'Asia/Jerusalem', last_weekly_sent_date: null as string | null };
describe('weekly push reminder', () => {
  it('derives the weekday from the local date, including UTC day boundaries and invalid timezone fallback', () => {
    const instant = new Date('2026-10-10T22:00:00Z');
    expect(localWeekday(instant, 'Asia/Jerusalem')).toBe(0);
    expect(localWeekday(instant, 'America/Los_Angeles')).toBe(6);
    expect(localWeekday(instant, 'invalid/timezone')).toBe(0);
  });
  it('is due only on the chosen weekday in the three-hour window, once per local date', () => {
    expect(isWeeklyDue(weekly, new Date('2026-10-11T06:59:00Z'))).toBe(false);
    expect(isWeeklyDue(weekly, new Date('2026-10-11T07:00:00Z'))).toBe(true);
    expect(isWeeklyDue(weekly, new Date('2026-10-11T09:59:00Z'))).toBe(true);
    expect(isWeeklyDue(weekly, new Date('2026-10-11T10:00:00Z'))).toBe(false);
    expect(isWeeklyDue(weekly, new Date('2026-10-12T07:00:00Z'))).toBe(false);
    expect(isWeeklyDue({ ...weekly, weekly_enabled: false }, new Date('2026-10-11T07:00:00Z'))).toBe(false);
    expect(isWeeklyDue({ ...weekly, last_weekly_sent_date: '2026-10-11' }, new Date('2026-10-11T07:00:00Z'))).toBe(false);
    expect(isWeeklyDue({ ...weekly, last_weekly_sent_date: '2026-10-04' }, new Date('2026-10-11T07:00:00Z'))).toBe(true);
  });
  it('supports other days, times and timezones and adapts to winter time', () => {
    expect(isWeeklyDue({ ...weekly, weekly_day: 1, weekly_time: '15:30' }, new Date('2026-10-12T12:30:00Z'))).toBe(true);
    expect(isWeeklyDue({ ...weekly, timezone: 'America/Los_Angeles' }, new Date('2026-10-11T17:00:00Z'))).toBe(true);
    expect(isWeeklyDue(weekly, new Date('2026-10-25T08:00:00Z'))).toBe(true); // Jerusalem winter 10:00
    expect(isWeeklyDue({ ...weekly, timezone: 'invalid' }, new Date('2026-10-11T07:00:00Z'))).toBe(true);
  });
  it('caps a late reminder at midnight so it cannot run on the following weekday', () => {
    const late = { ...weekly, weekly_time: '23:00' };
    expect(isWeeklyDue(late, new Date('2026-10-11T20:59:00Z'))).toBe(true);
    expect(isWeeklyDue(late, new Date('2026-10-11T21:00:00Z'))).toBe(false);
  });
  it('opens the report with the exact weekly notification text', () => {
    expect(weeklyPayload).toEqual({ title: 'דוח שבועי 📋', body: 'הגיע הזמן לשלוח את הדוח השבועי לקבוצה — הוא מוכן להעתקה.', url: '#/report' });
  });
});
