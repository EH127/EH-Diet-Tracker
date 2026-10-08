import type { Logs, Settings } from '../types';
import { weekDays } from '../lib/dates';
import { weeklyLimits } from '../lib/weekly';
import { Progress } from './ui';

export function WeeklyLimits({ date, logs, settings, compact = false }: { date: string; logs: Logs; settings: Settings; compact?: boolean }) {
  const limits = weeklyLimits(date, logs, settings);
  const workouts = weekDays(date, settings.weekStartsOn).filter(d => logs[d]?.workout).length;
  return <section className={`card ${compact ? 'compact-limits' : ''}`} aria-label="מכסות שבועיות"><div className="row between"><h2>השבוע במבט</h2><span className="muted">💪 {workouts} אימונים</span></div>
    <div className={compact ? 'limit-strip' : 'stack'}>{limits.map(l => <div key={`${l.kind}-${l.id}`} className={`limit-item ${l.status === 'over' ? 'text-danger' : ''}`}><div className="row between"><span>{l.name}</span><strong dir="ltr">{l.count}/{l.limit}</strong></div>{!compact && <Progress value={l.count} max={l.limit} danger={l.status === 'over'} label={l.name} />}{l.status !== 'ok' && <small>{l.status === 'over' ? 'חריגה מהמכסה' : 'המכסה נוצלה'}</small>}</div>)}</div>
  </section>;
}
