import { describe, expect, it } from 'vitest';
import { deviationStats, statsRows, topFoods, workoutWeeks } from './stats';
import { day, settings } from './test-helpers';
import { averageSteps } from './steps';
describe('statistics', () => {
  it('aggregates steps over every day in the selected range with missing totals as zero', () => {
    const logs = { '2026-10-01': day('2026-10-01', { steps: 100000 }), '2026-10-04': day('2026-10-04', { steps: 8450 }),
      '2026-10-06': day('2026-10-06', { habits: { steps10k: true } }), '2026-10-07': day('2026-10-07', { steps: 12000 }),
      '2026-10-08': day('2026-10-08', { steps: 0 }), '2026-10-09': day('2026-10-09', { steps: 100000 }) };
    const rows = statsRows('2026-10-04', '2026-10-08', logs, settings());
    expect(rows.map(r => ({ date: r.date, steps: r.steps }))).toEqual([
      { date: '2026-10-04', steps: 8450 }, { date: '2026-10-05', steps: 0 }, { date: '2026-10-06', steps: 0 },
      { date: '2026-10-07', steps: 12000 }, { date: '2026-10-08', steps: 0 },
    ]);
    expect(averageSteps(rows.map(r => r.date), logs)).toBe(4090); // 20,450 / five calendar days
    expect(averageSteps(statsRows('2026-10-07', '2026-10-07', logs, settings()).map(r => r.date), logs)).toBe(12000);
    expect(averageSteps(rows.map(r => r.date), {})).toBe(0);
    expect(averageSteps([], logs)).toBe(0);
  });
  it('uses recorded weights in the trailing seven calendar days, without inventing measurements', () => {
    const logs = { '2026-10-01': day('2026-10-01', { weight: 90 }), '2026-10-04': day('2026-10-04', { weight: 80 }), '2026-10-08': day('2026-10-08', { weight: 78 }) };
    const rows = statsRows('2026-10-07', '2026-10-08', logs, settings());
    expect(rows[0].weight).toBeUndefined(); expect(rows[0].average).toBe(85); expect(rows[1].average).toBe(79);
  });
  it('summarizes deviations per day and category by originating day', () => {
    const logs = { '2026-10-04': day('2026-10-04', { bank: [{ id: 'a', kind: 'deviation' as const, label: 'x', kcal: 100, charge: 100, chargeDate: '2026-10-04', groupId: 'g', category: 'sweet' },
      { id: 'b', kind: 'deviation' as const, label: 'x', kcal: 50, charge: 50, chargeDate: '2026-10-05', groupId: 'g', category: 'sweet' }] }) };
    const stats = deviationStats('2026-10-04', '2026-10-05', logs, settings());
    expect(stats.byDay).toEqual([{ date: '2026-10-04', count: 1, kcal: 150 }, { date: '2026-10-05', count: 0, kcal: 0 }]);
    expect(stats).toMatchObject({ categories: [{ name: 'מתוק', count: 1 }], count: 1, kcal: 150 });
  });
  it('groups workouts by configured week and includes empty weeks', () => {
    const logs = { '2026-10-04': day('2026-10-04', { workout: true }), '2026-10-05': day('2026-10-05', { workout: true }) };
    expect(workoutWeeks('2026-10-04', '2026-10-17', logs, settings())).toEqual([{ date: '2026-10-04', workouts: 2 }, { date: '2026-10-11', workouts: 0 }]);
  });
  it('groups foods by component type, skips add-ons and retains deleted IDs', () => {
    const log = day(); log.meals[0].selections = { 'bf-protein': ['eggs'], 'bf-mayo': ['1'] }; log.meals[2].selections = { 'dairy-protein': ['eggs', 'deleted'] };
    const foods = topFoods(log.date, log.date, { [log.date]: log }, settings());
    expect(foods.find(g => g.component === 'חלבון')?.foods).toEqual([{ id: 'eggs', name: 'ביצים (M/L)', count: 2 }, { id: 'deleted', name: '(נמחק)', count: 1 }]);
    expect(foods.some(g => g.foods.some(f => f.id === '1'))).toBe(false);
  });
});
