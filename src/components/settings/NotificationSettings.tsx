import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadSummary, useSync } from '../../lib/sync';
import { enableEvening, enableWeekly, loadPrefs, pushAvailability, sendTest, updatePrefs } from '../../lib/push';
import { hebrewDays } from '../../lib/dates';
import { Field } from '../ui';
export function NotificationSettings() {
  const sync = useSync();
  return <NotificationPreferences key={sync.email ?? 'local'} signedIn={!!sync.email} />;
}
function NotificationPreferences({ signedIn }: { signedIn: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('21:30');
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [weeklyDay, setWeeklyDay] = useState(0);
  const [weeklyTime, setWeeklyTime] = useState('10:00');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const availability = pushAvailability();
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    loadPrefs().then(prefs => { if (!cancelled) { if (prefs) {
      setEnabled(prefs.evening_enabled); setTime(prefs.evening_time);
      setWeeklyEnabled(prefs.weekly_enabled); setWeeklyDay(prefs.weekly_day); setWeeklyTime(prefs.weekly_time);
    } setLoaded(true); } }).catch(() => { if (!cancelled) { setLoaded(true); setMessage('לא הצלחנו לטעון את הגדרות ההתראות. בדקו את החיבור ונסו שוב.'); } });
    return () => { cancelled = true; };
  }, [signedIn]);
  if (!supabase) return <p className="muted">התראות דורשות חשבון מסונכרן, והסנכרון לא הוגדר.</p>;
  if (!signedIn) return <p className="muted">צריך להתחבר לחשבון כדי לקבל התראות</p>;
  if (availability === 'ios-install') return <div className="stack"><p>באייפון ובאייפד התראות עובדות רק מהאפליקציה שמותקנת במסך הבית (iOS 16.4 ומעלה).</p><ol className="muted"><li>פותחים את האתר ב-Safari.</li><li>לוחצים על כפתור השיתוף.</li><li>בוחרים &quot;הוספה למסך הבית&quot;.</li><li>פותחים את האפליקציה מהמסך הבית וחוזרים לכאן.</li></ol></div>;
  if (availability === 'unsupported') return <p className="muted">הדפדפן הזה לא תומך בהתראות. אפשר לנסות Chrome או Safari עדכניים, ובאייפון להתקין קודם למסך הבית.</p>;
  const fail = (error: unknown) => setMessage((error as Error).message === 'denied' ? 'ההרשאה להתראות נדחתה. אפשר לאשר אותה בהגדרות הדפדפן או המכשיר.' : 'משהו השתבש. בדקו את החיבור ונסו שוב.');
  return <div className="stack">
    {availability === 'denied' && <p className="notice">ההתראות חסומות לאתר הזה. כדי להפעיל אותן, אפשרו התראות בהגדרות הדפדפן (סמל המנעול ליד הכתובת) או בהגדרות המכשיר, ואז רעננו את הדף.</p>}
    <label className="row between"><span><Bell size={18} /> סיכום ערב</span><input className="switch" type="checkbox" role="switch" checked={enabled} disabled={!loaded || busy || availability === 'denied'} onChange={async e => {
      const next = e.target.checked; setBusy(true); setMessage('');
      try {
        if (next) { await enableEvening(time || '21:30'); await uploadSummary(true); setMessage('מעולה! נשלח לך סיכום קצר בכל ערב.'); } else await updatePrefs({ evening_enabled: false });
        setEnabled(next);
      } catch (error) { fail(error); } finally { setBusy(false); }
    }} /></label>
    <Field label="שעת הסיכום"><input type="time" dir="ltr" value={time} disabled={!loaded || busy} onChange={async e => {
      const value = e.target.value; const previous = time; setTime(value); if (!value || !enabled) return;
      setBusy(true);
      try { await updatePrefs({ evening_time: value }); } catch (error) { setTime(previous); fail(error); } finally { setBusy(false); }
    }} /></Field>
    <p className="muted small-text">הסיכום נשלח פעם ביום, מהשעה שבחרתם ועד שלוש שעות אחריה.</p>
    <label className="row between"><span>תזכורת לדוח השבועי</span><input className="switch" type="checkbox" role="switch" checked={weeklyEnabled} disabled={!loaded || busy || availability === 'denied'} onChange={async e => {
      const next = e.target.checked; setBusy(true); setMessage('');
      try {
        if (next) { await enableWeekly(weeklyDay, weeklyTime || '10:00'); setMessage('התזכורת לדוח השבועי הופעלה.'); }
        else await updatePrefs({ weekly_enabled: false });
        setWeeklyEnabled(next);
      } catch (error) { fail(error); } finally { setBusy(false); }
    }} /></label>
    <Field label="יום התזכורת"><select value={weeklyDay} disabled={!loaded || busy} onChange={async e => {
      const value = Number(e.target.value); const previous = weeklyDay; setWeeklyDay(value); if (!weeklyEnabled) return;
      setBusy(true);
      try { await updatePrefs({ weekly_day: value }); } catch (error) { setWeeklyDay(previous); fail(error); } finally { setBusy(false); }
    }}>{hebrewDays.map((day, i) => <option value={i} key={day}>{day.replace('יום ', '')}</option>)}</select></Field>
    <Field label="שעת התזכורת"><input type="time" dir="ltr" value={weeklyTime} disabled={!loaded || busy} onChange={async e => {
      const value = e.target.value; const previous = weeklyTime; setWeeklyTime(value); if (!value || !weeklyEnabled) return;
      setBusy(true);
      try { await updatePrefs({ weekly_time: value }); } catch (error) { setWeeklyTime(previous); fail(error); } finally { setBusy(false); }
    }} /></Field>
    <p className="muted small-text">התזכורת נשלחת פעם ביום שבחרתם, מהשעה שנבחרה ועד שלוש שעות אחריה, לפי אזור הזמן של המכשיר.</p>
    <button className="secondary-button" disabled={!loaded || busy || (!enabled && !weeklyEnabled)} onClick={async () => {
      setBusy(true); setMessage('');
      try { const { sent } = await sendTest(); setMessage(sent > 0 ? 'שלחנו התראת בדיקה. היא אמורה להגיע תוך רגע.' : 'לא נמצא מכשיר רשום. נסו לכבות ולהדליק את התזכורת.'); } catch (error) { fail(error); } finally { setBusy(false); }
    }}>שליחת התראת בדיקה</button>
    {message && <p role="status" className="notice">{message}</p>}
  </div>;
}
