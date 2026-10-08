import { describe, expect, it } from 'vitest';
import { limitStatus, weeklyLimits } from './weekly';
import { day, settings } from './test-helpers';
import type { Logs } from '../types';
describe('weekly limits', () => {
  it('counts each selected option across slots and only in the containing week', () => {
    const logs: Logs = {};
    for (const date of ['2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11']) {
      logs[date] = day(date); logs[date].meals[1].selections['lunch-protein'] = ['salmon'];
    }
    logs['2026-10-10'].meals[2].selections['dairy-protein'] = ['tunaOil', 'eggs'];
    const limits = weeklyLimits('2026-10-08', logs, settings());
    expect(limits.find(l => l.id === 'salmon')?.count).toBe(2);
    expect(limits.find(l => l.id === 'tunaOil')?.count).toBe(1);
  });
  it('counts templates even before done, with exact at-limit and over-limit statuses', () => {
    const log = day(); log.meals.forEach(m => { m.templateId = 'eatOut'; });
    expect(weeklyLimits(log.date, { [log.date]: log }, settings()).find(l => l.id === 'eatOut' && l.kind === 'template')).toMatchObject({ count: 3, limit: 2, status: 'over' });
    expect(limitStatus(2, 3)).toBe('ok'); expect(limitStatus(3, 3)).toBe('at'); expect(limitStatus(4, 3)).toBe('over');
  });
  it('respects configurable Monday boundaries and custom limits', () => {
    const menu = settings(); menu.weekStartsOn = 1; menu.groups[3].options[3].weeklyLimit = 1;
    const sunday = day('2026-10-04'); sunday.meals[1].selections['lunch-protein'] = ['salmon'];
    const monday = day('2026-10-05'); monday.meals[1].selections['lunch-protein'] = ['salmon'];
    const result = weeklyLimits(sunday.date, { [sunday.date]: sunday, [monday.date]: monday }, menu).find(l => l.id === 'salmon');
    expect(result).toMatchObject({ count: 1, status: 'at', limit: 1 });
  });
});
