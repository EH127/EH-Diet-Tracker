import { describe, expect, it } from 'vitest';
import { fallbackPayload, isDue, localParts, selectPayload } from '../../supabase/functions/push/logic.ts';

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
