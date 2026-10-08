import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import type { Backup, Settings } from '../../types';
import { dateKey } from '../../lib/dates';
import { buildMenuExport, mergeMenu, parseMenuFile } from '../../lib/menu';
import { parseBackup } from '../../lib/validation';
import { readRecoveryStorage } from '../../lib/storage';
import { signOut } from '../../lib/sync';
import { clearLocalData, discardRecoveryData, editSettings, getState, importBackup } from '../../store/store';
import { useStorageError } from '../../store/hooks';
import { freshSettings } from '../../data/defaultSettings';
import { Field, Sheet } from '../ui';
function download(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function BackupSettings() {
  const [message, setMessage] = useState('');
  const [backup, setBackup] = useState<Backup>();
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [recoveryExported, setRecoveryExported] = useState(false);
  const storageError = useStorageError();
  const hasRecovery = readRecoveryStorage() !== null;
  return <div className="stack"><button className="secondary-button" onClick={() => { const { settings, logs } = getState(); download(JSON.stringify({ version: 1, settings, logs }, null, 2), `ehdt-${dateKey()}.json`); }}><Download size={18} />ייצוא כל הנתונים</button><label className="upload-button"><Upload size={18} />ייבוא גיבוי JSON<input type="file" accept="application/json,.json" onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      try { if (file.size > 20 * 1024 * 1024) throw new Error('הקובץ גדול מדי. ניתן לייבא עד 20 מגה־בייט.'); setBackup(parseBackup(JSON.parse(await file.text()))); setMessage(''); }
      catch (error) { setMessage(error instanceof SyntaxError ? 'הקובץ אינו JSON תקין. הנתונים לא השתנו.' : (error as Error).message); }
    }} /></label><button className="secondary-button" onClick={() => { download(JSON.stringify(buildMenuExport(getState().settings), null, 2), `menu-${dateKey()}.json`); }}><Download size={18} />ייצוא התפריט בלבד</button><label className="upload-button"><Upload size={18} />ייבוא תפריט<input type="file" accept="application/json,.json" onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      try {
        if (file.size > 20 * 1024 * 1024) throw new Error('הקובץ גדול מדי. ניתן לייבא עד 20 מגה־בייט.');
        const menu: Settings = parseMenuFile(JSON.parse(await file.text()));
        if (!window.confirm('התפריט הנוכחי יוחלף בתפריט מהקובץ. יומן הימים לא ישתנה. להמשיך?')) return;
        editSettings(s => Object.assign(s, mergeMenu(s, menu))); setMessage('התפריט יובא בהצלחה.');
      } catch (error) { setMessage(error instanceof SyntaxError ? 'הקובץ אינו JSON תקין. הנתונים לא השתנו.' : (error as Error).message); }
    }} /></label><button onClick={() => { if (window.confirm('להחזיר את התפריט והיעדים לברירת המחדל? יומן הימים נשמר.')) { editSettings(s => Object.assign(s, freshSettings())); setMessage('ההגדרות חזרו לברירת המחדל.'); } }}>איפוס הגדרות לברירת מחדל</button><button className="text-danger" onClick={async () => {
      if (!window.confirm('למחוק את כל הנתונים מהמכשיר ולהתנתק? הנתונים בענן נשארים. מומלץ לייצא גיבוי קודם.')) return;
      if (window.prompt('לאישור המחיקה, הקלידו: מחיקה') !== 'מחיקה') return;
      try { await signOut(); clearLocalData(); setMessage('הנתונים המקומיים נמחקו.'); } catch (error) { setMessage((error as Error).message); }
    }}>מחיקת כל הנתונים המקומיים</button><details open={hasRecovery}><summary>שחזור אחסון מקומי</summary><p className="muted small-text">עותק השחזור נשמר בנפרד ואינו משתנה כשממשיכים להשתמש ביומן.</p>{hasRecovery && storageError && <p className="notice" role="status">{storageError}</p>}<button onClick={() => { const raw = readRecoveryStorage(); if (raw !== null) { download(raw, `ehdt-recovery-${dateKey()}.json`); setRecoveryExported(true); } else setMessage('אין עותק שחזור לייצוא.'); }}>ייצוא האחסון המקורי</button>{hasRecovery && <button className="text-danger" disabled={!recoveryExported} onClick={() => { if (window.confirm('למחוק את עותק השחזור? ודאו שקובץ הייצוא נשמר במכשיר.')) { discardRecoveryData(); setRecoveryExported(false); } }}>מחיקת עותק השחזור לאחר ייצוא</button>}</details>{message && <p className="notice" role="status">{message}</p>}
    {backup && <Sheet title="בדיקת הגיבוי לפני ייבוא" onClose={() => setBackup(undefined)}><div className="stack"><p>הגיבוי מכיל {Object.keys(backup.logs).length} ימים ו־{backup.settings.templates.length} תבניות ארוחה.</p><Field label="אופן הייבוא"><select value={mode} onChange={e => setMode(e.target.value as typeof mode)}><option value="merge">מיזוג · הרשומה העדכנית בכל יום נשמרת</option><option value="replace">החלפה · החלפת כל הנתונים במכשיר</option></select></Field><p className="muted">{mode === 'replace' ? 'כל הנתונים המקומיים יוחלפו בנתוני הגיבוי. ימים נוספים בענן עשויים לחזור בסנכרון הבא.' : 'ימים שקיימים רק במכשיר נשארים. התפריט והרישום העדכניים יותר נבחרים לפי זמן העדכון.'}</p><button className="primary-button" onClick={() => { importBackup(backup, mode); setBackup(undefined); setMessage('הגיבוי יובא בהצלחה.'); }}>אישור וייבוא</button></div></Sheet>}
  </div>;
}
