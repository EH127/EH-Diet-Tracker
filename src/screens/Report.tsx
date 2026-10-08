import { useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Share2 } from 'lucide-react';
import type { Logs, Settings } from '../types';
import { useStore } from '../store/hooks';
import { addDays, displayDate } from '../lib/dates';
import { buildReport, evaluateReportTask, formatReportMessage, reportRange, reportWeekRange, type ReportFields } from '../lib/report';
import { copyText, shareReport } from '../lib/sharing';
import { Field, NumberField, Stepper } from '../components/ui';

export default function Report({ date }: { date: string }) {
  const { settings, logs } = useStore();
  const [start, setStart] = useState(() => reportWeekRange(date, settings.weekStartsOn).start);
  const { end } = reportRange(start);
  return <div className="screen stack"><header className="page-heading"><p className="eyebrow">משתפים את ההתקדמות</p><h1>דוח שבועי</h1><p className="muted">אפשר לערוך את ההודעה לפני ששולחים לקבוצה.</p></header>
    <div className="week-selector"><button className="icon-button" aria-label="שבוע קודם" onClick={() => setStart(addDays(start, -7))}><ChevronRight /></button><strong>{displayDate(start, true)} — {displayDate(end, true)}</strong><button className="icon-button" aria-label="שבוע הבא" onClick={() => setStart(addDays(start, 7))}><ChevronLeft /></button></div>
    <ReportDraft key={start} date={date} start={start} logs={logs} settings={settings} />
  </div>;
}
function ReportDraft({ date, start, logs, settings }: { date: string; start: string; logs: Logs; settings: Settings }) {
  const [edits, setEdits] = useState<Partial<ReportFields>>({});
  const fields = { ...buildReport(date, start, logs, settings).fields, ...edits };
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');
  const change = (patch: Partial<ReportFields>) => { setEdits(e => ({ ...e, ...patch })); setToast(''); };
  const tasks = settings.weeklyReport.tasks.map(task => {
    const evaluated = evaluateReportTask(task, start, logs, settings, fields.rating);
    return { ...evaluated, done: overrides[task.id] ?? evaluated.done };
  });
  const message = formatReportMessage(fields, tasks);
  return <>
    <section className="card stack"><h2>פרטי הדוח</h2><Field label="תאריך"><input type="date" value={fields.date} onChange={e => { if (e.target.value) change({ date: e.target.value }); }} /></Field>
      <NumberField label="משקל התחלתי" min={0.1} step={0.1} optional value={fields.startWeight} onChange={startWeight => change({ startWeight })} />
      <NumberField label="משקל שבוע שעבר" min={0.1} step={0.1} optional value={fields.previousWeight} onChange={previousWeight => change({ previousWeight })} />
      <NumberField label="משקל השבוע" min={0.1} step={0.1} optional value={fields.weight} onChange={weight => change({ weight })} />
      <div className="report-rating"><span>כמה עמדת בתפריט מ1-10</span><Stepper label="עמידה בתפריט" min={1} max={10} value={fields.rating} onChange={rating => change({ rating })} /></div>
      <p className="muted small-text">העריכות נשמרות בהודעה הזו בלבד. מעבר לשבוע אחר ממלא מחדש את הנתונים.</p>
    </section>
    <section className="card stack"><h2>משימות שעשית</h2>{tasks.map(task => <label className="report-task" key={task.id}><input type="checkbox" checked={task.done} onChange={e => { setOverrides(o => ({ ...o, [task.id]: e.target.checked })); setToast(''); }} /><span>{task.label}<small className="muted">{task.reason}</small></span></label>)}
      <button className="text-button" onClick={() => { setOverrides({}); setToast(''); }}>חזרה לסימון האוטומטי</button>
    </section>
    <section className="card stack"><h2>ההודעה לקבוצה</h2><pre className="report-preview" dir="rtl">{message}</pre>
      <div className="report-actions"><button className="primary-button" onClick={async () => {
        try { await copyText(message); setToast('הועתק! אפשר להדביק בקבוצה'); }
        catch { setToast('ההעתקה לא הצליחה. אפשר לסמן ולהעתיק את ההודעה ידנית.'); }
      }}><Copy size={18} />העתקה</button><button className="secondary-button" onClick={async () => { await shareReport(message); }}><Share2 size={18} />שיתוף לוואטסאפ</button></div>
    </section>
    {toast && <p className="notice report-toast" role="status">{toast}</p>}
  </>;
}
