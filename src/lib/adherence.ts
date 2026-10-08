import type { Logs, Settings } from '../types';
import { remaining } from './bank';
import { viewDay } from './meals';
import { startOfWeek } from './dates';
import { weeklyLimits } from './weekly';
import { categoryName, deviationGroups } from './deviations';

export function adherence(date: string, logs: Logs, settings: Settings): { score: number; flags: string[]; complete: number } {
  const day = viewDay(logs[date], date, settings);
  const meals = day.meals.filter(m => settings.slots.some(s => s.id === m.slotId));
  // "I ate it" counts on its own; picking every required food is optional detail.
  const complete = meals.filter(m => m.done).length;
  const flags: string[] = [];
  if (day.meals.some(m => settings.templates.find(t => t.id === m.templateId)?.requiresWorkout) && !day.workout) flags.push('ערב בשרי ללא אימון');
  if (remaining(date, logs, settings.dailyBankKcal) < 0) flags.push('חריגה מבנק הקלוריות');
  for (const d of deviationGroups(logs[date])) flags.push(`חריגה: ${categoryName(d.category, settings)} (${d.kcal} קל׳)`);
  // Count through this day only: a Friday excess must not retroactively penalize Sunday.
  const throughDate = Object.fromEntries(Object.entries(logs).filter(([d]) => d >= startOfWeek(date, settings.weekStartsOn) && d <= date));
  const exceeded = weeklyLimits(date, throughDate, settings).filter(l => l.status === 'over' && day.meals.some(m =>
    l.kind === 'template' ? m.templateId === l.id : Object.values(m.selections).some(ids => ids.includes(l.id))));
  for (const limit of exceeded) flags.push(`חריגה שבועית: ${limit.name}`);
  // Equal weight per current slot; subtract 10 points per flag, clamp to [0, 100].
  const base = meals.length ? (complete / meals.length) * 100 : 0;
  return { score: Math.max(0, Math.round(base - flags.length * 10)), flags, complete };
}
