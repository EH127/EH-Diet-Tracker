import { ChevronLeft, ChevronRight, Droplets, Dumbbell, Footprints, NotebookPen, Scale } from 'lucide-react';
import { useStore } from '../store/hooks';
import { editDay } from '../store/store';
import { addDays, dateKey, dayName, displayDate, startOfWeek } from '../lib/dates';
import { waterGoalCups, waterProgressText } from '../lib/water';
import { formatSteps } from '../lib/steps';
import { mealUntouched, newMeal, viewDay } from '../lib/meals';
import { adherence } from '../lib/adherence';
import { InstallCard } from '../components/InstallCard';
import { BankCard } from '../components/BankCard';
import { DeviationsCard } from '../components/DeviationsCard';
import { MealCard } from '../components/MealCard';
import { WeeklyLimits } from '../components/WeeklyLimits';
import { Field, NumberField, Progress, ScoreRing, Stepper } from '../components/ui';

export default function Today({ date, onDate, onReport }: { date: string; onDate: (date: string) => void; onReport: () => void }) {
  const { settings, logs } = useStore();
  const day = viewDay(logs[date], date, settings);
  const score = adherence(date, logs, settings);
  const previousWeight = Object.values(logs).filter(d => d.date < date && d.weight !== undefined).sort((a, b) => b.date.localeCompare(a.date))[0]?.weight;
  const evening = day.meals.find(m => m.slotId === 'evening') ?? day.meals.find(m => m.slotId === settings.slots.at(-1)?.id);
  const meat = settings.templates.find(t => t.requiresWorkout);
  const canSuggest = day.workout && evening && mealUntouched(evening) && meat && evening.templateId !== meat.id;
  const waterGoal = waterGoalCups(settings);
  return <div className="stack screen">
    <header className="date-header"><button className="icon-button" aria-label="יום קודם" onClick={() => onDate(addDays(date, -1))}><ChevronRight /></button><div className="date-title"><p className="eyebrow">{date === dateKey() ? 'יום חדש, צעד קטן' : 'היומן שלך'}</p><h1>{dayName(date)}</h1><label className="date-picker">{displayDate(date)}<input type="date" aria-label="בחירת יום" value={date} onChange={e => { if (e.target.value) onDate(e.target.value); }} /></label></div><button className="icon-button" aria-label="יום הבא" onClick={() => onDate(addDays(date, 1))}><ChevronLeft /></button></header>
    <InstallCard />
    {date !== dateKey() && <button className="text-button today-link" onClick={() => onDate(dateKey())}>חזרה להיום</button>}
    {startOfWeek(date, settings.weekStartsOn) === date && <button className="secondary-button report-banner" onClick={onReport}>{dayName(date)} — זה הזמן לשלוח את הדוח השבועי</button>}
    <section className="day-overview"><div><span className="eyebrow">ההתקדמות שלך</span><h2>{score.complete} מתוך {settings.slots.length} ארוחות הושלמו</h2><p>כל בחירה טובה מצטרפת לדרך.</p></div><ScoreRing score={score.score} /></section>
    <section className={`workout-card ${day.workout ? 'active' : ''}`}><label><Dumbbell size={24} /><strong>היה אימון היום 💪</strong><input className="switch" type="checkbox" role="switch" checked={day.workout} onChange={e => editDay(date, d => { d.workout = e.target.checked; })} /></label>{canSuggest && <button className="suggestion" onClick={() => editDay(date, d => { const m = d.meals.find(m => m.slotId === evening.slotId); if (m) Object.assign(m, newMeal({ id: m.slotId, name: '', defaultTemplateId: meat.id })); })}>להחליף לערב בשרי? ←</button>}</section>
    <section className="card stack"><div className="row between"><h2><Footprints size={20} /> צעדים היום</h2><bdi dir="ltr" className="muted small-text">{formatSteps(day.steps ?? 0)}/{formatSteps(settings.stepsGoal)}</bdi></div>
      <NumberField label="סך הצעדים היום" optional value={day.steps} onChange={steps => editDay(date, d => { d.steps = steps; })} />
      <div className="row" role="group" aria-label="עדכון מהיר של צעדים"><button className="secondary-button" aria-label="הוספת 1,000 צעדים" onClick={() => editDay(date, d => { d.steps = (d.steps ?? 0) + 1000; })}><bdi dir="ltr">+1,000</bdi></button><button aria-label="הפחתת 1,000 צעדים" disabled={!day.steps} onClick={() => editDay(date, d => { d.steps = Math.max(0, (d.steps ?? 0) - 1000); })}><bdi dir="ltr">−1,000</bdi></button></div>
      <Progress value={day.steps ?? 0} max={settings.stepsGoal} label="יעד צעדים" /><p className="muted small-text">אפשר להעתיק את סך הצעדים מאפליקציית הבריאות בטלפון.</p>
    </section>
    {settings.habits.length > 0 && <section className="card stack"><h2>משימות יומיות</h2>{settings.habits.map(habit => <label className="row between habit-row" key={habit.id}><span>{habit.emoji} {habit.name}</span><input className="switch" type="checkbox" role="switch" checked={day.habits?.[habit.id] ?? false} onChange={e => editDay(date, d => { d.habits = { ...d.habits, [habit.id]: e.target.checked }; })} /></label>)}</section>}
    <div className="section-label"><h2>הארוחות שלי</h2><span>אפשר להחליף בין הארוחות</span></div>
    {day.meals.length ? day.meals.map(meal => <MealCard key={meal.slotId} meal={meal} day={day} settings={settings} logs={logs} />) : <p className="empty">התפריט עוד פתוח לאפשרויות. אפשר להוסיף ארוחות במבנה היום בהגדרות.</p>}
    <BankCard date={date} logs={logs} settings={settings} />
    <DeviationsCard date={date} logs={logs} settings={settings} />
    <section className="card water-card"><div className="row between"><h2><Droplets size={20} /> קצת מים, הרבה טוב</h2><span>{waterProgressText(day.water, settings)}</span></div><div className="row between"><div className="water-drops" aria-hidden="true">{Array.from({ length: Math.min(Math.ceil(waterGoal), 10) }, (_, i) => <Droplets key={i} size={22} className={i < day.water ? 'filled' : ''} />)}</div><Stepper value={day.water} onChange={n => editDay(date, d => { d.water = n; })} label="כוסות מים" /></div><Progress value={day.water} max={waterGoal} label="יעד שתייה" /><p className="muted small-text">כל לחיצה מוסיפה או מפחיתה כוס של {settings.cupMl} מ״ל.</p></section>
    <section className="card"><h2><Scale size={20} /> שקילה</h2><Field label="משקל בק״ג (לא חובה)"><input type="number" min="1" max="500" step="0.1" inputMode="decimal" placeholder="למשל 75.5" value={day.weight ?? ''} onChange={e => { if (e.target.value === '' || e.target.validity.valid) editDay(date, d => { d.weight = e.target.value === '' ? undefined : Number(e.target.value); }); }} /></Field>{previousWeight !== undefined && <p className="muted small-text">השקילה הקודמת: {previousWeight} ק״ג{day.weight !== undefined && ` · שינוי: ${day.weight - previousWeight > 0 ? '+' : ''}${(day.weight - previousWeight).toFixed(1)} ק״ג`}</p>}</section>
    <section className="card"><h2><NotebookPen size={20} /> משהו לזכור מהיום</h2><Field label="הערות"><textarea rows={3} value={day.notes ?? ''} placeholder="איך הרגשת? מה עבד טוב?" onChange={e => editDay(date, d => { d.notes = e.target.value; })} /></Field><small className="muted">נשמר אוטומטית במכשיר</small></section>
    <WeeklyLimits date={date} logs={logs} settings={settings} compact />
    {score.flags.length > 0 && <div className="notice"><strong>מה השפיע על הציון?</strong><ul>{score.flags.map(flag => <li key={flag}>{flag}</li>)}</ul></div>}
    {settings.rules.length > 0 && <p className="daily-tip">💡 {settings.rules[0]}</p>}
  </div>;
}
