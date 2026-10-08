import { describe, expect, it } from 'vitest';
import { adherence } from './adherence';
import { isMealComplete, mealUntouched, newDay, toggleSelection, viewDay } from './meals';
import { bank, day, settings } from './test-helpers';
import type { DayLog, Logs, Settings } from '../types';

function completeDay(log: DayLog, menu: Settings) {
  for (const meal of log.meals) {
    meal.done = true;
    for (const component of menu.templates.find(t => t.id === meal.templateId)!.components) {
      if (component.kind === 'choice' && component.required) meal.selections[component.id] = menu.groups.filter(g => component.groupIds.includes(g.id)).flatMap(g => g.options).slice(0, component.pick).map(o => o.id);
    }
  }
  return log;
}
describe('meal completeness and adherence', () => {
  it('creates three default slots with lunch salad, and dairy dinner requires two proteins', () => {
    const menu = settings(); const log = newDay('2026-10-04', menu);
    expect(log.meals).toHaveLength(3); expect(log.meals[1].selections['lunch-side']).toEqual(['salad']);
    const dinner = log.meals[2]; dinner.selections = { 'dairy-protein': ['eggs'], 'dairy-carb': ['bread'] };
    expect(isMealComplete(dinner, menu)).toBe(false);
    dinner.selections['dairy-protein'].push('tunaOil'); expect(isMealComplete(dinner, menu)).toBe(true);
    dinner.selections['dairy-protein'].push('milk'); expect(isMealComplete(dinner, menu)).toBe(false);
  });
  it('caps multi-picks, replaces single picks and allows deselection', () => {
    expect(toggleSelection(['a', 'b'], 'c', 2)).toEqual(['a', 'b']);
    expect(toggleSelection(['a'], 'b', 1)).toEqual(['b']);
    expect(toggleSelection(['a', 'b'], 'a', 2)).toEqual(['b']);
    expect(mealUntouched(day().meals[2])).toBe(true);
  });
  it('adds new slots lazily while preserving removed slots and unknown history IDs', () => {
    const log = day(); const menu = settings(); menu.slots.shift(); menu.slots.push({ id: 'new-slot', name: 'חדש', defaultTemplateId: 'lunch' });
    const viewed = viewDay(log, log.date, menu);
    expect(viewed.meals.some(m => m.slotId === 'morning')).toBe(true);
    expect(viewed.meals.some(m => m.slotId === 'new-slot')).toBe(true);
    expect(log.meals).toHaveLength(3);
    expect(isMealComplete({ ...log.meals[0], templateId: 'deleted' }, menu)).toBe(false);
  });
  it('gives credit for any done meal, even without selections', () => {
    const menu = settings(); const log = day();
    expect(adherence(log.date, { [log.date]: log }, menu)).toMatchObject({ score: 0, complete: 0 });
    log.meals[0].done = true;
    expect(adherence(log.date, { [log.date]: log }, menu)).toMatchObject({ score: 33, complete: 1 });
    completeDay(log, menu); expect(adherence(log.date, { [log.date]: log }, menu).score).toBe(100);
    log.meals[0].done = false; expect(adherence(log.date, { [log.date]: log }, menu).score).toBe(67);
  });
  it('deducts ten per workout/bank flag and removes workout flag after toggling', () => {
    const menu = settings(); const log = day(); log.meals[2].templateId = 'meatDinner'; completeDay(log, menu);
    log.bank = [bank(log.date, 500)];
    expect(adherence(log.date, { [log.date]: log }, menu)).toMatchObject({ score: 80, flags: ['ערב בשרי ללא אימון', 'חריגה מבנק הקלוריות'] });
    log.workout = true; expect(adherence(log.date, { [log.date]: log }, menu).score).toBe(90);
  });
  it('adds one flag per deviation originating on the day', () => {
    const menu = settings(); const log = day(); completeDay(log, menu);
    log.bank = [{ id: crypto.randomUUID(), kind: 'deviation' as const, label: 'מתוק', kcal: 100, charge: 100, chargeDate: '2026-10-04', groupId: 'g1', category: 'sweet' }, { id: crypto.randomUUID(), kind: 'deviation' as const, label: 'מתוק', kcal: 50, charge: 50, chargeDate: '2026-10-05', groupId: 'g1', category: 'sweet' }, { id: crypto.randomUUID(), kind: 'deviation' as const, label: 'מתוק', kcal: 100, charge: 100, chargeDate: '2026-10-04', groupId: 'g2', category: 'gone' }];
    expect(adherence(log.date, { [log.date]: log }, menu)).toMatchObject({ score: 80, flags: ['חריגה: מתוק (150 קל׳)', 'חריגה: (נמחק) (100 קל׳)'] });
  });
  it('flags the day that exceeds a weekly limit, without retroactive penalties', () => {
    const menu = settings(); const logs: Logs = {};
    for (const date of ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-09']) {
      logs[date] = completeDay(day(date), menu); logs[date].meals[1].selections['lunch-protein'] = ['salmon'];
    }
    expect(adherence('2026-10-04', logs, menu).score).toBe(100);
    expect(adherence('2026-10-09', logs, menu)).toMatchObject({ score: 90, flags: ['חריגה שבועית: סלמון'] });
  });
});
