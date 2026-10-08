import { useState } from 'react';
import { useStore } from '../store/hooks';
import { addDays, dateKey, dayName, displayDate } from '../lib/dates';
import { adherence } from '../lib/adherence';
import { currentStreak, deviationStats, statsRows, topFoods, workoutWeeks } from '../lib/stats';
import { ScoreRing } from '../components/ui';
import StatsCharts from '../components/StatsCharts';

export default function Stats({ openDay }: { openDay: (d: string) => void }) {
  const { settings, logs } = useStore();
  const [range, setRange] = useState('30');
  const today = dateKey();
  const historical = Object.keys(logs).filter(d => d <= today).sort();
  const start = range === 'all' ? historical[0] ?? addDays(today, -6) : addDays(today, 1 - Number(range));
  const rows = statsRows(start, today, logs, settings);
  const weeks = workoutWeeks(start, today, logs, settings);
  const foods = topFoods(start, today, logs, settings);
  const deviations = deviationStats(start, today, logs, settings);
  const recorded = rows.filter(r => !!logs[r.date]);
  const average = recorded.length ? Math.round(recorded.reduce((sum, r) => sum + r.adherence, 0) / recorded.length) : 0;
  const weights = historical.map(d => logs[d]).filter(d => d.weight !== undefined);
  const currentWeight = weights.at(-1)?.weight;
  const firstWeight = weights.find(w => w.date >= start)?.weight;
  const month = Object.values(logs).filter(d => d.date.slice(0, 7) === today.slice(0, 7) && d.date <= today);
  const cheats = month.reduce((n, d) => n + d.meals.filter(m => settings.templates.find(t => t.id === m.templateId)?.countsAsCheat).length, 0);
  const history = historical.filter(d => d >= start).reverse();
  return <div className="screen stack"><header className="page-heading"><p className="eyebrow">רואים את הדרך</p><h1>ההתקדמות שלי</h1><p className="muted">מגמות קטנות, תמונה שלמה.</p></header><div className="segmented range-selector" role="group" aria-label="טווח גרפים">{[['7', '7 ימים'], ['30', '30 יום'], ['90', '90 יום'], ['all', 'הכל']].map(([value, label]) => <button key={value} className={range === value ? 'active' : ''} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}</div>
    <div className="summary-grid"><div className="summary-tile"><strong>{average}%</strong><span>עמידה ממוצעת</span><small>בימים שנרשמו בטווח</small></div><div className="summary-tile"><strong>{currentStreak(today, logs, settings)}</strong><span>ימים ברצף על התפריט</span></div><div className="summary-tile"><strong>{currentWeight ?? '—'}</strong><span>משקל נוכחי · ק״ג</span>{currentWeight !== undefined && firstWeight !== undefined && <small>שינוי בטווח: {(currentWeight - firstWeight).toFixed(1)} ק״ג</small>}</div><div className="summary-tile"><strong>{month.filter(d => d.workout).length}</strong><span>אימונים החודש</span><small>{cheats} ארוחות בחוץ החודש</small></div><div className="summary-tile"><strong>{deviations.count}</strong><span>חריגות בטווח</span><small>{deviations.kcal} קל׳ בסך הכל</small></div></div>
    {!historical.length && <p className="empty">כאן תצמח ההתקדמות שלך. רישום ראשון היום הוא התחלה מצוינת 🌱</p>}
    <StatsCharts rows={rows} weeks={weeks} foods={foods} deviations={deviations} weightGoal={settings.weightGoal} />
    {!weights.length && <p className="muted small-text">עדיין אין שקילות. אפשר להוסיף משקל במסך היום.</p>}
    <section className="card"><h2>הימים שהיו</h2><p className="muted small-text">הציון: אחוז הארוחות שסומנו כאכלתי, פחות 10 נקודות לכל חריגה.</p><div className="history-list">{history.length ? history.map(date => { const score = adherence(date, logs, settings); return <button key={date} className="history-row" onClick={() => openDay(date)}><ScoreRing small score={score.score} /><div><strong>{dayName(date)} · {displayDate(date)}</strong>{score.flags.length > 0 && <small className="text-danger">{score.flags.join(' · ')}</small>}</div></button>; }) : <p className="empty">עוד אין ימים רשומים בטווח הזה.</p>}</div></section>
  </div>;
}
