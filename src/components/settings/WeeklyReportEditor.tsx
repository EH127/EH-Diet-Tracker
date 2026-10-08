import type { ReportRule, ReportTask, Settings } from '../../types';
import { editSettings } from '../../store/store';
import { moveItem } from '../../lib/reorder';
import { reportTaskLabel } from '../../lib/report';
import { formatSteps } from '../../lib/steps';
import { Field, NumberField, TextField } from '../ui';
import { EditorActions } from './EditorActions';

const rules: { type: ReportRule['type']; label: string }[] = [
  { type: 'water-every-day', label: 'יעד מים בכל יום' },
  { type: 'steps-average', label: 'ממוצע צעדים בשבוע' },
  { type: 'habit-every-day', label: 'משימה יומית בכל יום' },
  { type: 'habit-count', label: 'משימה במספר ימים' },
  { type: 'workout-count', label: 'מספר אימונים' },
  { type: 'rating-10', label: 'עמידה בתפריט 10/10' },
  { type: 'manual', label: 'סימון ידני' },
];
export function WeeklyReportEditor({ settings }: { settings: Settings }) {
  const report = settings.weeklyReport;
  return <>
    <NumberField label="משקל התחלתי בק״ג (לא חובה)" min={0.1} step={0.1} optional value={report.startWeight} onChange={n => editSettings(s => { s.weeklyReport.startWeight = n; })} />
    <p className="muted small-text">אם לא הוגדר משקל התחלתי, הדוח משתמש בשקילה הראשונה ביומן.</p>
    <NumberField label="יעד אימונים בשבוע" min={1} value={report.workoutTarget} onChange={n => editSettings(s => { s.weeklyReport.workoutTarget = n ?? 3; })} />
    <NumberField label="יעד ימי אירובי בשבוע" min={1} value={report.aerobicTarget} onChange={n => editSettings(s => { s.weeklyReport.aerobicTarget = n ?? 3; })} />
    <h3>משימות בדוח</h3>
    {report.tasks.map((task, index) => {
      const change = (patch: Partial<ReportTask>) => editSettings(s => { Object.assign(s.weeklyReport.tasks[index], patch); });
      const rule = task.rule;
      return <details className="editor-item" key={task.id}><summary>{reportTaskLabel(task, report) || 'משימה ללא שם'}</summary><div className="stack editor-body">
        <TextField label="נוסח בהודעה" value={reportTaskLabel(task, report)} onChange={label => change({ label })} />
        <Field label="כלל לסימון אוטומטי"><select value={rule.type} onChange={e => {
          const type = e.target.value as ReportRule['type'];
          change({ rule: type === 'habit-count' || type === 'habit-every-day'
            ? { type, habitId: settings.habits[0]?.id ?? 'aerobic' } : { type } });
        }}>{rules.map(r => <option key={r.type} value={r.type}>{r.label}</option>)}</select></Field>
        {rule.type === 'steps-average' && <p className="muted small-text">ממוצע שבעת הימים נבדק מול יעד הצעדים: {formatSteps(settings.stepsGoal)}. ימים ללא רישום נספרים כאפס.</p>}
        {(rule.type === 'habit-every-day' || rule.type === 'habit-count') && <Field label="משימה יומית"><select value={rule.habitId} onChange={e => change({ rule: { ...rule, habitId: e.target.value } })}>
          {!settings.habits.some(h => h.id === rule.habitId) && <option value={rule.habitId}>משימה שנמחקה</option>}
          {settings.habits.map(h => <option value={h.id} key={h.id}>{h.emoji} {h.name}</option>)}
        </select></Field>}
        {(rule.type === 'habit-count' || rule.type === 'workout-count') && <>
          <NumberField label="מספר נדרש (לא חובה)" min={1} optional value={rule.n} onChange={n => change({ rule: { ...rule, n } })} />
          <p className="muted small-text">ללא מספר, המשימה עוקבת אחר {rule.type === 'workout-count' ? 'יעד האימונים' : 'יעד ימי האירובי'}: {rule.type === 'workout-count' ? report.workoutTarget : report.aerobicTarget}.</p>
        </>}
        <EditorActions name={task.label} index={index} count={report.tasks.length} move={d => editSettings(s => moveItem(s.weeklyReport.tasks, index, d))} remove={() => editSettings(s => { s.weeklyReport.tasks.splice(index, 1); })} />
      </div></details>;
    })}
    <button className="secondary-button" onClick={() => editSettings(s => { s.weeklyReport.tasks.push({ id: crypto.randomUUID(), label: 'משימה חדשה', rule: { type: 'manual' } }); })}>+ הוספת משימה לדוח</button>
  </>;
}
