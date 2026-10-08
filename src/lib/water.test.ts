import { describe, expect, it } from 'vitest';
import { settings, day } from './test-helpers';
import { convertWaterGoal, waterAmount, waterGoalCups, waterGoalMet, waterProgressText } from './water';
import { statsRows } from './stats';
import { eveningSummary } from './summary';

describe('water units (logs store cup counts)', () => {
  it('keeps legacy values as cups and converts totals using the configured cup size', () => {
    const menu = settings();
    expect(waterProgressText(5, menu)).toBe('5/8 כוסות');
    menu.waterUnit = 'liters'; menu.waterGoal = 2.5;
    expect(waterProgressText(5, menu)).toBe('1.25/2.5 ל׳');
    expect(waterGoalCups(menu)).toBe(10);
    menu.cupMl = 300;
    expect(waterAmount(5, menu)).toBe(1.5);
  });
  it('preserves goal volume when switching units, including fractional cup goals', () => {
    const menu = settings();
    expect(convertWaterGoal(menu, 'liters')).toBe(2);
    menu.waterUnit = 'liters'; menu.waterGoal = 2.5;
    expect(convertWaterGoal(menu, 'cups')).toBe(10);
    menu.cupMl = 300;
    const cups = convertWaterGoal(menu, 'cups');
    expect(cups).toBeCloseTo(8.333333);
    expect(convertWaterGoal({ ...menu, waterUnit: 'cups', waterGoal: cups }, 'liters')).toBeCloseTo(2.5);
  });
  it('uses >= for goals and avoids floating point errors at the threshold', () => {
    const menu = settings();
    expect(waterGoalMet(7, menu)).toBe(false); expect(waterGoalMet(8, menu)).toBe(true); expect(waterGoalMet(9, menu)).toBe(true);
    menu.waterUnit = 'liters'; menu.waterGoal = 2.5;
    expect(waterGoalMet(9, menu)).toBe(false); expect(waterGoalMet(10, menu)).toBe(true);
    menu.cupMl = 300; menu.waterGoal = 2.4;
    expect(waterGoalMet(8, menu)).toBe(true);
  });
  it('uses the same unit for chart totals, chart goals and the evening summary without changing logs', () => {
    const menu = settings(); menu.waterUnit = 'liters'; menu.waterGoal = 2.5;
    const log = day('2026-10-08', { water: 5 }); const logs = { [log.date]: log };
    expect(statsRows(log.date, log.date, logs, menu)[0]).toMatchObject({ water: 1.25, waterGoal: 2.5 });
    expect(eveningSummary(log.date, logs, menu).body).toContain('מים 1.25/2.5 ל׳');
    expect(log.water).toBe(5);
  });
});
