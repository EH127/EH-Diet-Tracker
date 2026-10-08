import type { Logs, Settings } from '../types';
import { weekDays } from './dates';
export type Limit = { id: string; kind: 'option' | 'template'; name: string; count: number; limit: number; status: 'ok' | 'at' | 'over' };
export const limitStatus = (count: number, limit: number): Limit['status'] => count > limit ? 'over' : count === limit ? 'at' : 'ok';
export function weeklyLimits(date: string, logs: Logs, settings: Settings): Limit[] {
  const meals = weekDays(date, settings.weekStartsOn).flatMap(d => logs[d]?.meals ?? []);
  const selections = meals.flatMap(m => Object.values(m.selections).flat());
  return [
    ...settings.groups.flatMap(g => g.options).filter(o => o.weeklyLimit !== undefined).map(o => ({ id: o.id, kind: 'option' as const, name: o.name, count: selections.filter(id => id === o.id).length, limit: o.weeklyLimit! })),
    ...settings.templates.filter(t => t.weeklyLimit !== undefined).map(t => ({ id: t.id, kind: 'template' as const, name: t.name, count: meals.filter(m => m.templateId === t.id).length, limit: t.weeklyLimit! })),
  ].map(l => ({ ...l, status: limitStatus(l.count, l.limit) }));
}
