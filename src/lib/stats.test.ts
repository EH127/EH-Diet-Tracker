import { describe, expect, it } from 'vitest';
import { statsRows, topFoods, workoutWeeks } from './stats';
import { day, settings } from './test-helpers';
describe('statistics', () => {
  it('uses recorded weights in the trailing seven calendar days, without inventing measurements', () => {
    const logs = { '2026-10-01': day('2026-10-01', { weight: 90 }), '2026-10-04': day('2026-10-04', { weight: 80 }), '2026-10-08': day('2026-10-08', { weight: 78 }) };
    const rows = statsRows('2026-10-07', '2026-10-08', logs, settings());
    expect(rows[0].weight).toBeUndefined(); expect(rows[0].average).toBe(85); expect(rows[1].average).toBe(79);
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
