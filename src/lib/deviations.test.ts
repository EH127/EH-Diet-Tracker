import { describe, expect, it } from 'vitest';
import { allocateDeviation, deviationGroups, describeParts } from './deviations';
import { bank, day, settings } from './test-helpers';
import type { Logs } from '../types';

// 2026-10-04 is a Sunday; the default week starts on Sunday and ends on Saturday 2026-10-10.
describe('deviation allocation', () => {
  it('fits entirely in the same day', () => {
    expect(allocateDeviation('2026-10-04', 200, {}, settings())).toEqual([{ date: '2026-10-04', kcal: 200 }]);
  });
  it('spills into the following days of the week', () => {
    const logs: Logs = { '2026-10-04': day('2026-10-04', { bank: [bank('2026-10-04', 100), bank('2026-10-05', 200)] }) };
    expect(allocateDeviation('2026-10-04', 500, logs, settings())).toEqual([
      { date: '2026-10-04', kcal: 150 }, { date: '2026-10-05', kcal: 50 }, { date: '2026-10-06', kcal: 250 }, { date: '2026-10-07', kcal: 50 }]);
  });
  it('overdraws the origin day when the rest of the week is full or ends', () => {
    expect(allocateDeviation('2026-10-10', 400, {}, settings())).toEqual([{ date: '2026-10-10', kcal: 400 }]);
    const week = ['2026-10-09', '2026-10-10'];
    const logs: Logs = { '2026-10-04': day('2026-10-04', { bank: week.map(d => bank(d, 200)) }) };
    expect(allocateDeviation('2026-10-09', 300, logs, settings())).toEqual([{ date: '2026-10-09', kcal: 250 }, { date: '2026-10-10', kcal: 50 }]);
  });
  it('puts everything on a day that is already negative when nothing has room', () => {
    const logs: Logs = { '2026-10-10': day('2026-10-10', { bank: [bank('2026-10-10', 300)] }) };
    expect(allocateDeviation('2026-10-10', 100, logs, settings())).toEqual([{ date: '2026-10-10', kcal: 100 }]);
  });
  it('starts from the following days when today is already negative', () => {
    const logs: Logs = { '2026-10-04': day('2026-10-04', { bank: [bank('2026-10-04', 300)] }) };
    expect(allocateDeviation('2026-10-04', 300, logs, settings())).toEqual([{ date: '2026-10-05', kcal: 250 }, { date: '2026-10-06', kcal: 50 }]);
  });
  it('groups the parts of one deviation and describes them', () => {
    const entries = [{ id: 'a', groupId: 'g', category: 'sweet', note: 'עוגה', kcal: 150, charge: 150, chargeDate: '2026-10-04' }, { id: 'b', groupId: 'g', category: 'sweet', note: 'עוגה', kcal: 100, charge: 100, chargeDate: '2026-10-05' }]
      .map(e => ({ ...e, kind: 'deviation' as const, label: 'מתוק' }));
    const [group] = deviationGroups(day('2026-10-04', { bank: entries }));
    expect(group).toMatchObject({ groupId: 'g', kcal: 250, category: 'sweet', note: 'עוגה' });
    expect(describeParts(group.parts, '2026-10-04')).toBe('150 מהיום · 100 ממחר');
  });
});
