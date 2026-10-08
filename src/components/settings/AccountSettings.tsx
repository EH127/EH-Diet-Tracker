import { useState } from 'react';
import { Cloud, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { signOutAndReset, syncLabels, syncNow, useSync } from '../../lib/sync';
import { useStore } from '../../store/hooks';
import { Field } from '../ui';
export function AccountSettings() {
  const sync = useSync();
  const { meta } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signup, setSignup] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (!supabase) return <div className="local-mode"><Cloud size={28} /><h3>סנכרון לא הוגדר</h3><p>אפשר להמשיך כרגיל. כל הרישומים נשמרים במכשיר הזה, ואפשר לייצא גיבוי בכל רגע.</p></div>;
  return <div className="stack">{sync.email ? <><p>מחובר: <bdi>{sync.email}</bdi></p><p className="muted">{syncLabels[sync.status]}{meta.lastSyncedAt && ` · סנכרון אחרון: ${new Date(meta.lastSyncedAt).toLocaleString('he-IL')}`}</p><button className="secondary-button" disabled={sync.status === 'syncing'} onClick={() => { void syncNow(); }}><RefreshCw size={17} />סנכרן עכשיו</button><button onClick={async () => { try { await signOutAndReset(); } catch (error) { setMessage((error as Error).message); } }}>התנתקות</button></> : <form className="stack" onSubmit={async e => {
    e.preventDefault(); if (!supabase) return;
    setBusy(true); setMessage('');
    try {
      const result = signup ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` } }) : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) setMessage(result.error.code === 'invalid_credentials' ? 'האימייל או הסיסמה אינם נכונים.' : result.error.code === 'email_not_confirmed' ? 'יש לאשר את כתובת האימייל לפני הכניסה.' : 'לא הצלחנו להתחבר. בדקו את הפרטים והחיבור ונסו שוב.');
      else { setPassword(''); setMessage(signup && !result.data.session ? 'שלחנו הודעת אימות לאימייל. יש לפתוח את הקישור כדי להשלים הרשמה.' : 'התחברת בהצלחה. הנתונים מתמזגים עם החשבון.'); }
    } catch { setMessage('אין חיבור כרגע. אפשר להמשיך לעבוד במכשיר.'); } finally { setBusy(false); }
  }}><p className="muted">כניסה לחשבון תסנכרן גם את הרישומים שכבר במכשיר.</p><Field label="כתובת אימייל"><input type="email" dir="ltr" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></Field><Field label="סיסמה"><input type="password" dir="ltr" required minLength={6} autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></Field><button type="submit" className="primary-button" disabled={busy}>{busy ? 'רק רגע…' : signup ? 'יצירת חשבון' : 'כניסה לחשבון'}</button><button type="button" className="text-button" onClick={() => { setSignup(!signup); setMessage(''); }}>{signup ? 'כבר יש חשבון? כניסה' : 'עוד אין חשבון? הרשמה'}</button></form>}{(message || sync.error) && <p role="status" className="notice">{message || sync.error}</p>}</div>;
}
