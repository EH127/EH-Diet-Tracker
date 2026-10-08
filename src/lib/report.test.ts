import { describe, expect, it } from 'vitest';
import type { Logs, ReportTask } from '../types';
import { day, settings } from './test-helpers';
import { buildReport, evaluateReportTask, formatReportMessage, reportRange, reportRating, reportStartWeight, reportTaskLabel, reportWeekRange, reportWeight } from './report';

const start = '2026-10-04';
const wholeWeek = (): Logs => Object.fromEntries(reportRange(start).days.map(date => [date, day(date, {
  water: 8, workout: true, habits: { steps10k: true, aerobic: true, noScreen: true },
})]));
const task = (rule: ReportTask['rule']): ReportTask => ({ id: 'task', label: 'משימה', rule });

describe('report week selection', () => {
  it('reports the previous seven days on Sunday and the current week mid-week', () => {
    const expected = { start, end: '2026-10-10', days: ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'] };
    expect(reportWeekRange('2026-10-11')).toEqual(expected);
    expect(reportWeekRange('2026-10-08')).toEqual(expected);
    expect(reportWeekRange('2026-10-10')).toEqual(expected);
  });
  it('uses the configured first day, including across a year boundary', () => {
    expect(reportWeekRange('2026-10-05', 1)).toMatchObject({ start: '2026-09-28', end: '2026-10-04' });
    expect(reportWeekRange('2026-10-11', 1)).toMatchObject({ start: '2026-10-05', end: '2026-10-11' });
    expect(reportWeekRange('2026-01-04')).toMatchObject({ start: '2025-12-28', end: '2026-01-03' });
  });
});
describe('report weigh-ins', () => {
  it('prefers Sunday over Saturday and Saturday over other days', () => {
    const logs = { '2026-10-08': day('2026-10-08', { weight: 84 }), '2026-10-10': day('2026-10-10', { weight: 83 }), '2026-10-11': day('2026-10-11', { weight: 82.5 }) };
    expect(reportWeight(start, logs)).toBe(82.5);
    delete logs['2026-10-11'].weight; expect(reportWeight(start, logs)).toBe(83);
    delete logs['2026-10-10'].weight; expect(reportWeight(start, logs)).toBe(84);
  });
  it('falls back to the latest weight within the week, excluding earlier and later measurements', () => {
    const logs = { '2026-10-03': day('2026-10-03', { weight: 90 }), '2026-10-05': day('2026-10-05', { weight: 88 }),
      '2026-10-08': day('2026-10-08', { weight: 87 }), '2026-10-12': day('2026-10-12', { weight: 86 }) };
    expect(reportWeight(start, logs)).toBe(87);
    delete logs['2026-10-05'].weight; delete logs['2026-10-08'].weight;
    expect(reportWeight(start, logs)).toBeUndefined(); expect(reportWeight(start, {})).toBeUndefined();
  });
  it('applies the same selection to last week and uses the first ever weight as the start fallback', () => {
    const menu = settings();
    const logs = { '2026-10-11': day('2026-10-11', { weight: 82.5 }), '2026-08-01': day('2026-08-01', { weight: 85 }),
      '2026-10-03': day('2026-10-03', { weight: 83.4 }), '2026-10-04': day('2026-10-04', { weight: 83.2 }) };
    expect(buildReport('2026-10-11', start, logs, menu).fields).toMatchObject({ startWeight: 85, previousWeight: 83.2, weight: 82.5 });
    menu.weeklyReport.startWeight = 86;
    expect(reportStartWeight(logs, menu.weeklyReport)).toBe(86);
    expect(reportStartWeight({}, settings().weeklyReport)).toBeUndefined();
  });
  it('uses the last configured week day and its following day for Monday-start weeks', () => {
    expect(reportWeight('2026-10-05', { '2026-10-12': day('2026-10-12', { weight: 81 }) })).toBe(81);
  });
});
describe('report rating', () => {
  it('averages only logged days using the existing adherence formula and rounds once', () => {
    const a = day(start); a.meals.forEach(m => { m.done = true; });
    const b = day('2026-10-05'); b.meals[0].done = true; b.meals[1].done = true;
    expect(reportRating(start, { [a.date]: a }, settings())).toBe(10);
    expect(reportRating(start, { [a.date]: a, [b.date]: b }, settings())).toBe(8); // (100 + 67) / 2 / 10
    a.bank.push({ id: 'over', kind: 'snack', label: 'חריגה', kcal: 300, charge: 300, chargeDate: start });
    expect(reportRating(start, { [a.date]: a }, settings())).toBe(9);
  });
  it('clamps missing and zero scores to one and ignores logs outside the week', () => {
    expect(reportRating(start, {}, settings())).toBe(1);
    expect(reportRating(start, wholeWeek(), settings())).toBe(1); // no meals marked done
    const outside = day('2026-10-11'); outside.meals.forEach(m => { m.done = true; });
    expect(reportRating(start, { [outside.date]: outside }, settings())).toBe(1);
  });
});
describe('report task rules', () => {
  it('requires water on all seven days and accepts amounts above or equal to the goal', () => {
    const logs = wholeWeek(); const menu = settings(); const rule = task({ type: 'water-every-day' });
    logs[start].water = 10;
    expect(evaluateReportTask(rule, start, logs, menu, 9)).toMatchObject({ done: true, reason: '7/7 ימים' });
    logs[start].water = 7; delete logs['2026-10-05'];
    expect(evaluateReportTask(rule, start, logs, menu, 9)).toMatchObject({ done: false, reason: '5/7 ימים' });
    expect(evaluateReportTask(rule, start, {}, menu, 9)).toMatchObject({ done: false, reason: '0/7 ימים' });
    menu.waterUnit = 'liters'; menu.waterGoal = 2;
    expect(evaluateReportTask(rule, start, wholeWeek(), menu, 9).done).toBe(true);
    menu.waterGoal = 2.5; expect(evaluateReportTask(rule, start, wholeWeek(), menu, 9).done).toBe(false);
  });
  it('requires the selected habit every day, treating absent and unchecked habits as incomplete', () => {
    const rule = task({ type: 'habit-every-day', habitId: 'steps10k' }); const logs = wholeWeek();
    expect(evaluateReportTask(rule, start, logs, settings(), 9).done).toBe(true);
    logs[start].habits = undefined; logs['2026-10-05'].habits!.steps10k = false;
    expect(evaluateReportTask(rule, start, logs, settings(), 9)).toMatchObject({ done: false, reason: '5/7 ימים' });
    expect(evaluateReportTask(task({ type: 'habit-every-day', habitId: 'deleted' }), start, logs, settings(), 9).done).toBe(false);
  });
  it('counts habit days at or above an explicit or configured target, ignoring other habits and weeks', () => {
    const logs = wholeWeek(); const menu = settings();
    for (const d of reportRange(start).days.slice(3)) logs[d].habits!.aerobic = false;
    const rule = task({ type: 'habit-count', habitId: 'aerobic', n: 3 });
    expect(evaluateReportTask(rule, start, logs, menu, 9)).toMatchObject({ done: true, reason: '3/3 ימים' });
    expect(evaluateReportTask(task({ ...rule.rule, type: 'habit-count', habitId: 'aerobic', n: 4 }), start, logs, menu, 9).done).toBe(false);
    menu.weeklyReport.aerobicTarget = 2;
    expect(evaluateReportTask(task({ type: 'habit-count', habitId: 'aerobic' }), start, logs, menu, 9)).toMatchObject({ done: true, reason: '3/2 ימים' });
    expect(evaluateReportTask(rule, start, { '2026-10-11': day('2026-10-11', { habits: { aerobic: true } }) }, menu, 9).reason).toBe('0/3 ימים');
  });
  it('counts workout days at or above an explicit or configured target', () => {
    const logs = wholeWeek(); const menu = settings();
    for (const d of reportRange(start).days.slice(3)) logs[d].workout = false;
    expect(evaluateReportTask(task({ type: 'workout-count', n: 3 }), start, logs, menu, 9)).toMatchObject({ done: true, reason: '3/3 אימונים' });
    expect(evaluateReportTask(task({ type: 'workout-count', n: 4 }), start, logs, menu, 9).done).toBe(false);
    menu.weeklyReport.workoutTarget = 2;
    expect(evaluateReportTask(task({ type: 'workout-count' }), start, logs, menu, 9).reason).toBe('3/2 אימונים');
    expect(evaluateReportTask(task({ type: 'workout-count' }), start, {}, menu, 9).done).toBe(false);
  });
  it('uses the editable rating for rating-10; manual rules start unchecked', () => {
    expect(evaluateReportTask(task({ type: 'rating-10' }), start, {}, settings(), 10)).toMatchObject({ done: true, reason: '10/10' });
    expect(evaluateReportTask(task({ type: 'rating-10' }), start, {}, settings(), 9).done).toBe(false);
    expect(evaluateReportTask(task({ type: 'manual' }), start, wholeWeek(), settings(), 10)).toMatchObject({ done: false, reason: 'סימון ידני' });
  });
  it('keeps default task order and adjusts the aerobic number while preserving customized labels', () => {
    const menu = settings(); menu.weeklyReport.aerobicTarget = 4;
    const result = buildReport('2026-10-11', start, {}, menu);
    expect(result.tasks.map(t => t.label)).toEqual(['מים', '10 אלף צעדים', 'כל האימונים', 'עמידה בתפריט 10/10', '4 אירובי', 'לאכול בלי טלפון ולא מול מסך']);
    const aerobic = menu.weeklyReport.tasks[4];
    expect(reportTaskLabel({ ...aerobic, label: 'תנועה שעושה טוב' }, menu.weeklyReport)).toBe('תנועה שעושה טוב');
    expect(reportTaskLabel({ ...aerobic, rule: { type: 'habit-count', habitId: 'aerobic', n: 2 } }, menu.weeklyReport)).toBe('2 אירובי');
  });
});
describe('report message', () => {
  it('formats the exact WhatsApp message with user overrides and checkmarks only after done tasks', () => {
    const tasks = settings().weeklyReport.tasks.map((t, i) => ({ ...t, done: [0, 1, 4, 5].includes(i) }));
    expect(formatReportMessage({ date: '2026-10-11', startWeight: 85, previousWeight: 83.2, weight: 82.5, rating: 9 }, tasks)).toBe([
      'תאריך: 11.10.2026', 'משקל התחלתי: 85.0', 'משקל שבוע שעבר: 83.2', 'משקל השבוע: 82.5',
      'כמה עמדת בתפריט מ1-10: 9', 'משימות שעשית:', 'מים ✅', '10 אלף צעדים ✅', 'כל האימונים',
      'עמידה בתפריט 10/10', '3 אירובי ✅', 'לאכול בלי טלפון ולא מול מסך ✅',
    ].join('\n'));
  });
  it('leaves missing weights blank, rounds to one decimal, and preserves task label order', () => {
    expect(formatReportMessage({ date: '2026-01-02', rating: 1 }, [])).toBe('תאריך: 02.01.2026\nמשקל התחלתי: \nמשקל שבוע שעבר: \nמשקל השבוע: \nכמה עמדת בתפריט מ1-10: 1\nמשימות שעשית:');
    expect(formatReportMessage({ date: '2026-10-11', weight: 82.56, rating: 10 }, [{ label: 'ב', done: false }, { label: 'א', done: true }])).toContain('משקל השבוע: 82.6\nכמה עמדת בתפריט מ1-10: 10\nמשימות שעשית:\nב\nא ✅');
  });
});
