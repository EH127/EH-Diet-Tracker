import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadSummary, useSync } from '../../lib/sync';
import { enableEvening, loadPrefs, pushAvailability, sendTest, updatePrefs } from '../../lib/push';
import { Field } from '../ui';
export function NotificationSettings() {
  const sync = useSync();
  const signedIn = !!sync.email;
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('21:30');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const availability = pushAvailability();
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    loadPrefs().then(prefs => { if (!cancelled) { if (prefs) { setEnabled(prefs.evening_enabled); setTime(prefs.evening_time); } setLoaded(true); } }).catch(() => { if (!cancelled) setLoaded(true); });
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
        if (next) { await enableEvening(time); await uploadSummary(true); setMessage('מעולה! נשלח לך סיכום קצר בכל ערב.'); } else await updatePrefs({ evening_enabled: false });
        setEnabled(next);
      } catch (error) { fail(error); } finally { setBusy(false); }
    }} /></label>
    <Field label="שעת הסיכום"><input type="time" dir="ltr" value={time} disabled={!loaded || busy} onChange={async e => {
      const value = e.target.value; setTime(value); if (!value || !enabled) return;
      try { await updatePrefs({ evening_time: value }); } catch (error) { fail(error); }
    }} /></Field>
    <button className="secondary-button" disabled={busy || !enabled} onClick={async () => {
      setBusy(true); setMessage('');
      try { const { sent } = await sendTest(); setMessage(sent > 0 ? 'שלחנו התראת בדיקה. היא אמורה להגיע תוך רגע.' : 'לא נמצא מכשיר רשום. נסו לכבות ולהדליק את הסיכום.'); } catch (error) { fail(error); } finally { setBusy(false); }
    }}>שליחת התראת בדיקה</button>
    <p className="muted small-text">הסיכום נשלח פעם ביום, מהשעה שבחרתם ועד שלוש שעות אחריה.</p>
    {message && <p role="status" className="notice">{message}</p>}
  </div>;
}
