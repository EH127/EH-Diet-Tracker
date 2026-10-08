import { ChevronLeft, ChevronRight, Droplets, Dumbbell, NotebookPen, Scale } from 'lucide-react';
import { useStore } from '../store/hooks';
import { editDay } from '../store/store';
import { addDays, dateKey, dayName, displayDate } from '../lib/dates';
import { mealUntouched, newMeal, viewDay } from '../lib/meals';
import { adherence } from '../lib/adherence';
import { InstallCard } from '../components/InstallCard';
import { BankCard } from '../components/BankCard';
import { MealCard } from '../components/MealCard';
import { WeeklyLimits } from '../components/WeeklyLimits';
import { Field, Progress, ScoreRing, Stepper } from '../components/ui';

export default function Today({ date, onDate }: { date: string; onDate: (date: string) => void }) {
  const { settings, logs } = useStore();
  const day = viewDay(logs[date], date, settings);
  const score = adherence(date, logs, settings);
  const previousWeight = Object.values(logs).filter(d => d.date < date && d.weight !== undefined).sort((a, b) => b.date.localeCompare(a.date))[0]?.weight;
  const evening = day.meals.find(m => m.slotId === 'evening') ?? day.meals.find(m => m.slotId === settings.slots.at(-1)?.id);
  const meat = settings.templates.find(t => t.requiresWorkout);
  const canSuggest = day.workout && evening && mealUntouched(evening) && meat && evening.templateId !== meat.id;
  return <div className="stack screen">
    <header className="date-header"><button className="icon-button" aria-label="יום קודם" onClick={() => onDate(addDays(date, -1))}><ChevronRight /></button><div className="date-title"><p className="eyebrow">{date === dateKey() ? 'יום חדש, צעד קטן' : 'היומן שלך'}</p><h1>{dayName(date)}</h1><label className="date-picker">{displayDate(date)}<input type="date" aria-label="בחירת יום" value={date} onChange={e => { if (e.target.value) onDate(e.target.value); }} /></label></div><button className="icon-button" aria-label="יום הבא" onClick={() => onDate(addDays(date, 1))}><ChevronLeft /></button></header>
    <InstallCard />
    {date !== dateKey() && <button className="text-button today-link" onClick={() => onDate(dateKey())}>חזרה להיום</button>}
    <section className="day-overview"><div><span className="eyebrow">ההתקדמות שלך</span><h2>{score.complete} מתוך {settings.slots.length} ארוחות הושלמו</h2><p>כל בחירה טובה מצטרפת לדרך.</p></div><ScoreRing score={score.score} /></section>
    <section className={`workout-card ${day.workout ? 'active' : ''}`}><label><Dumbbell size={24} /><strong>היה אימון היום 💪</strong><input className="switch" type="checkbox" role="switch" checked={day.workout} onChange={e => editDay(date, d => { d.workout = e.target.checked; })} /></label>{canSuggest && <button className="suggestion" onClick={() => editDay(date, d => { const m = d.meals.find(m => m.slotId === evening.slotId); if (m) Object.assign(m, newMeal({ id: m.slotId, name: '', defaultTemplateId: meat.id })); })}>להחליף לערב בשרי? ←</button>}</section>
    <div className="section-label"><h2>הארוחות שלי</h2><span>אפשר להחליף בין הארוחות</span></div>
    {day.meals.length ? day.meals.map(meal => <MealCard key={meal.slotId} meal={meal} day={day} settings={settings} logs={logs} />) : <p className="empty">התפריט עוד פתוח לאפשרויות. אפשר להוסיף ארוחות במבנה היום בהגדרות.</p>}
    <BankCard date={date} logs={logs} settings={settings} />
    <section className="card water-card"><div className="row between"><h2><Droplets size={20} /> קצת מים, הרבה טוב</h2><span>{day.water}/{settings.waterGoal} כוסות</span></div><div className="row between"><div className="water-drops" aria-hidden="true">{Array.from({ length: Math.min(settings.waterGoal, 10) }, (_, i) => <Droplets key={i} size={22} className={i < day.water ? 'filled' : ''} />)}</div><Stepper value={day.water} onChange={n => editDay(date, d => { d.water = n; })} label="כוסות מים" /></div><Progress value={day.water} max={settings.waterGoal} label="יעד שתייה" /></section>
    <section className="card"><h2><Scale size={20} /> שקילה</h2><Field label="משקל בק״ג (לא חובה)"><input type="number" min="1" max="500" step="0.1" inputMode="decimal" placeholder="למשל 75.5" value={day.weight ?? ''} onChange={e => { if (e.target.value === '' || e.target.validity.valid) editDay(date, d => { d.weight = e.target.value === '' ? undefined : Number(e.target.value); }); }} /></Field>{previousWeight !== undefined && <p className="muted small-text">השקילה הקודמת: {previousWeight} ק״ג{day.weight !== undefined && ` · שינוי: ${day.weight - previousWeight > 0 ? '+' : ''}${(day.weight - previousWeight).toFixed(1)} ק״ג`}</p>}</section>
    <section className="card"><h2><NotebookPen size={20} /> משהו לזכור מהיום</h2><Field label="הערות"><textarea rows={3} value={day.notes ?? ''} placeholder="איך הרגשת? מה עבד טוב?" onChange={e => editDay(date, d => { d.notes = e.target.value; })} /></Field><small className="muted">נשמר אוטומטית במכשיר</small></section>
    <WeeklyLimits date={date} logs={logs} settings={settings} compact />
    {score.flags.length > 0 && <div className="notice"><strong>מה השפיע על הציון?</strong><ul>{score.flags.map(flag => <li key={flag}>{flag}</li>)}</ul></div>}
    {settings.rules.length > 0 && <p className="daily-tip">💡 {settings.rules[0]}</p>}
  </div>;
}
