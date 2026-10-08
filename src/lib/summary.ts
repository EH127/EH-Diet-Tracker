import type { Logs, Settings } from '../types';
import { adherence } from './adherence';
import { remaining } from './bank';
import { weeklyLimits } from './weekly';
import { deviationGroups } from './deviations';
import { waterProgressText } from './water';

// Short Hebrew evening summary for one date, used as the push notification text.
export function eveningSummary(date: string, logs: Logs, settings: Settings): { title: string; body: string } {
  const total = settings.slots.length;
  const { complete } = adherence(date, logs, settings);
  const parts: string[] = [];
  if (total > 0) parts.push(complete >= total ? 'כל הארוחות סומנו 💪' : `סימנת ${complete} מתוך ${total} ארוחות`);
  const left = remaining(date, logs, settings.dailyBankKcal);
  parts.push(left < 0 ? `חריגה של ${Math.abs(left)} קל׳ בבנק` : `בבנק נשארו ${left} קל׳`);
  const deviations = deviationGroups(logs[date]);
  if (deviations.length) parts.push(`${deviations.length === 1 ? 'חריגה אחת' : `${deviations.length} חריגות`} · ${deviations.reduce((n, d) => n + d.kcal, 0)} קל׳`);
  const water = logs[date]?.water ?? 0;
  parts.push(`מים ${waterProgressText(water, settings)}`);
  // Limits are counted through this date only, like the adherence score.
  const week = weeklyLimits(date, logs, settings).filter(l => l.status !== 'ok' && l.count > 0)
    .sort((a, b) => Number(b.status === 'over') - Number(a.status === 'over')).slice(0, 2);
  for (const l of week) parts.push(l.status === 'over' ? `${l.name} ${l.count}/${l.limit} השבוע (חריגה)` : `${l.name} ${l.count}/${l.limit} השבוע`);
  return { title: 'סיכום היום 🌙', body: parts.join(' · ') };
}
