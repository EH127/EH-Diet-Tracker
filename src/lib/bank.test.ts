import { describe, expect, it } from 'vitest';
import { autoExtraId, autoMealId, chargedEntries, reconcileAutoBank, remaining, spent, suggestChargeDate } from './bank';
import { bank, day, settings } from './test-helpers';
import { addDays } from './dates';

describe('bank allocation', () => {
  it('sums charges from every originating day, not informational kcal', () => {
    const logs = { '2026-10-04': day('2026-10-04', { bank: [{ ...bank('2026-10-05'), kind: 'alcohol' as const, kcal: 120 }] }), '2026-10-05': day('2026-10-05', { bank: [bank('2026-10-05', 100)] }) };
    expect(spent('2026-10-04', logs)).toBe(0);
    expect(spent('2026-10-05', logs)).toBe(350);
    expect(remaining('2026-10-05', logs, 250)).toBe(-100);
    expect(chargedEntries('2026-10-05', logs)[0].origin).toBe('2026-10-04');
  });
  it('uses today if sufficient, otherwise searches up to 14 days', () => {
    const logs = Object.fromEntries(Array.from({ length: 14 }, (_, i) => { const date = addDays('2026-10-04', i); return [date, day(date, { bank: [bank(date)] })]; }));
    expect(suggestChargeDate('2026-10-04', 250, {}, 250)).toBe('2026-10-04');
    expect(suggestChargeDate('2026-10-04', 250, logs, 250)).toBe('2026-10-18');
    logs['2026-10-18'] = day('2026-10-18', { bank: [bank('2026-10-18')] });
    expect(suggestChargeDate('2026-10-04', 250, logs, 250)).toBe('2026-10-04');
  });
  it('maintains exactly one same-day charge and one per extra, even before done', () => {
    const log = day(); log.meals[1].templateId = 'eatOut'; log.meals[1].extras = 2;
    const result = reconcileAutoBank(log, {}, settings());
    expect(result.bank.map(b => [b.id, b.chargeDate, b.charge])).toEqual([
      [autoMealId('noon'), '2026-10-04', 250], [autoExtraId('noon', 0), '2026-10-05', 250], [autoExtraId('noon', 1), '2026-10-06', 250],
    ]);
    expect(reconcileAutoBank(result, { [result.date]: result }, settings())).toEqual(result);
  });
  it('preserves extra date overrides and removes obsolete autos without deleting manual entries', () => {
    const log = day(); log.meals[2].templateId = 'eatOut'; log.meals[2].extras = 2;
    let result = reconcileAutoBank(log, {}, settings());
    result.bank[1].chargeDate = '2026-10-09';
    result.meals[2].extras = 1;
    result = reconcileAutoBank(result, {}, settings());
    expect(result.bank).toHaveLength(2);
    expect(result.bank[1].chargeDate).toBe('2026-10-09');
    result.bank.push(bank('2026-10-04', 50)); result.meals[2].templateId = 'dairyDinner';
    expect(reconcileAutoBank(result, {}, settings()).bank).toEqual([bank('2026-10-04', 50)]);
  });
  it('reserves other slots and existing future charges before allocating new extras', () => {
    const log = day(); log.meals[0].templateId = 'eatOut'; log.meals[0].extras = 1;
    log.meals[1].templateId = 'eatOut'; log.meals[1].extras = 1;
    log.bank = [{ ...bank('2026-10-05', 250, autoExtraId('noon', 0)), kind: 'extra', auto: true }];
    const result = reconcileAutoBank(log, {}, settings());
    expect(result.bank.find(b => b.id === autoExtraId('morning', 0))?.chargeDate).toBe('2026-10-06');
    expect(spent(log.date, { [log.date]: result })).toBe(500);
  });
  it('skips a tomorrow charged by a different origin and respects a customized budget', () => {
    const log = day(); log.meals[0].templateId = 'eatOut'; log.meals[0].extras = 2;
    const menu = settings(); menu.dailyBankKcal = 500;
    const previous = day('2026-10-03', { bank: [bank('2026-10-05', 500)] });
    const result = reconcileAutoBank(log, { [previous.date]: previous }, menu);
    expect(result.bank.filter(b => b.kind === 'extra').map(b => b.chargeDate)).toEqual(['2026-10-06', '2026-10-06']);
  });
});
