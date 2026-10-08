import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store/hooks';
import { addDays, dayName, displayDate, weekDays } from '../lib/dates';
import { adherence } from '../lib/adherence';
import { remaining, spent } from '../lib/bank';
import { isMealComplete, viewDay } from '../lib/meals';
import { WeeklyLimits } from '../components/WeeklyLimits';
import { Progress, ScoreRing } from '../components/ui';

export default function Week({ date, onDate, openDay }: { date: string; onDate: (d: string) => void; openDay: (d: string) => void }) {
  const { settings, logs } = useStore();
  const days = weekDays(date, settings.weekStartsOn);
  const total = days.reduce((sum, d) => sum + spent(d, logs), 0);
  const budget = 7 * settings.dailyBankKcal;
  const overdrawn = days.filter(d => remaining(d, logs, settings.dailyBankKcal) < 0);
  return <div className="screen stack"><header className="page-heading"><p className="eyebrow">יום אחרי יום</p><h1>השבוע שלי</h1><p className="muted">התמונה הגדולה מתחילה בצעדים הקטנים.</p></header>
    <div className="week-selector"><button className="icon-button" aria-label="שבוע קודם" onClick={() => onDate(addDays(date, -7))}><ChevronRight /></button><strong>{displayDate(days[0], true)} — {displayDate(days[6], true)}</strong><button className="icon-button" aria-label="שבוע הבא" onClick={() => onDate(addDays(date, 7))}><ChevronLeft /></button></div>
    <div className="week-list">{days.map(d => {
      const day = viewDay(logs[d], d, settings);
      const score = adherence(d, logs, settings);
      const balance = remaining(d, logs, settings.dailyBankKcal);
      return <button key={d} className="card week-day" onClick={() => openDay(d)} aria-label={`פתיחת ${dayName(d)} ${displayDate(d)}, ציון ${score.score}`}><ScoreRing small score={score.score} /><div className="grow"><strong>{dayName(d)} <small className="muted">{displayDate(d, true)}</small></strong><div className="meal-dots">{day.meals.map(m => <span key={m.slotId} className={`meal-dot ${m.done && isMealComplete(m, settings) ? 'complete' : m.done || Object.values(m.selections).some(s => s.length) ? 'partial' : ''}`} title={`${settings.slots.find(s => s.id === m.slotId)?.name ?? '(נמחק)'}: ${m.done ? 'אכלתי' : 'טרם הושלם'}`} />)}<span className="small-text">{day.workout && '💪 '}{day.meals.some(m => settings.templates.find(t => t.id === m.templateId)?.countsAsCheat) && '🍕'}</span></div><small className="muted">{day.water} כוסות מים</small></div><div className={`week-bank ${balance < 0 ? 'text-danger' : 'text-primary'}`}><strong>{balance}</strong><small>קל׳ בבנק</small></div></button>;
    })}</div>
    <p className="legend"><span className="meal-dot complete" />הושלם <span className="meal-dot partial" />חלקי <span className="meal-dot" />ריק</p>
    <WeeklyLimits date={date} logs={logs} settings={settings} />
    <section className="card stack"><h2>הבנק השבועי</h2><div className="row between"><span>נוצלו {total} קל׳</span><strong>מתוך {budget}</strong></div><Progress value={total} max={budget} label="תקציב שבועי" danger={total > budget} />{overdrawn.length ? <div className="notice error">ימים בחריגה: {overdrawn.map(d => `${dayName(d)} (${remaining(d, logs, settings.dailyBankKcal)})`).join(' · ')}</div> : <p className="soft-hint">אין ימים בחריגה השבוע 🌿</p>}</section>
  </div>;
}
