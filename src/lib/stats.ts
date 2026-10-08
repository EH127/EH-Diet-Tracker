import type { Logs, Settings } from '../types';
import { addDays, dateRange, startOfWeek } from './dates';
import { adherence } from './adherence';
import { spent } from './bank';
import { categoryName, deviationGroups, deviationsInRange } from './deviations';
import { waterAmount } from './water';

export function statsRows(from: string, to: string, logs: Logs, settings: Settings) {
  return dateRange(from, to).map(date => {
    const weights = dateRange(addDays(date, -6), date).map(d => logs[d]?.weight).filter((w): w is number => w !== undefined);
    return { date, weight: logs[date]?.weight, average: weights.length ? Math.round(weights.reduce((sum, n) => sum + n, 0) / weights.length * 10) / 10 : undefined,
      adherence: adherence(date, logs, settings).score, spent: spent(date, logs), budget: settings.dailyBankKcal, water: waterAmount(logs[date]?.water ?? 0, settings), waterGoal: settings.waterGoal,
      steps: logs[date]?.steps ?? 0 };
  });
}
export function workoutWeeks(from: string, to: string, logs: Logs, settings: Settings) {
  const weeks = new Map<string, number>();
  for (const day of dateRange(from, to)) {
    const week = startOfWeek(day, settings.weekStartsOn); weeks.set(week, (weeks.get(week) ?? 0) + (logs[day]?.workout ? 1 : 0));
  }
  return [...weeks].map(([date, workouts]) => ({ date, workouts }));
}
export function topFoods(from: string, to: string, logs: Logs, settings: Settings) {
  const result = new Map<string, Map<string, number>>();
  for (const day of Object.values(logs).filter(d => d.date >= from && d.date <= to)) for (const meal of day.meals) {
    const template = settings.templates.find(t => t.id === meal.templateId);
    for (const [componentId, ids] of Object.entries(meal.selections)) {
      const component = template?.components.find(c => c.id === componentId);
      if (component?.kind === 'check' || ids.every(id => id === '1')) continue;
      const label = component?.label ?? '(נמחק)';
      const bucket = result.get(label) ?? new Map<string, number>();
      for (const id of ids) bucket.set(id, (bucket.get(id) ?? 0) + 1);
      result.set(label, bucket);
    }
  }
  const options = settings.groups.flatMap(g => g.options);
  return [...result].map(([component, counts]) => ({ component, foods: [...counts].map(([id, count]) => ({ id, name: options.find(o => o.id === id)?.name ?? '(נמחק)', count })).sort((a, b) => b.count - a.count).slice(0, 6) }));
}
export function currentStreak(today: string, logs: Logs, settings: Settings): number {
  let date = adherence(today, logs, settings).score === 100 ? today : addDays(today, -1);
  let streak = 0;
  while (logs[date] && adherence(date, logs, settings).score === 100) { streak++; date = addDays(date, -1); }
  return streak;
}
export function deviationStats(from: string, to: string, logs: Logs, settings: Settings) {
  const byDay = dateRange(from, to).map(date => { const groups = deviationGroups(logs[date]); return { date, count: groups.length, kcal: groups.reduce((n, g) => n + g.kcal, 0) }; });
  const counts = new Map<string, number>();
  for (const g of deviationsInRange(from, to, logs)) { const name = categoryName(g.category, settings); counts.set(name, (counts.get(name) ?? 0) + 1); }
  const categories = [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return { byDay, categories, count: byDay.reduce((n, d) => n + d.count, 0), kcal: byDay.reduce((n, d) => n + d.kcal, 0) };
}
