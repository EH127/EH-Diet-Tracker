import type { Logs, ReportTask, Settings, WeeklyReportSettings } from '../types';
import { addDays, startOfWeek } from './dates';
import { adherence } from './adherence';
import { waterGoalMet } from './water';
import { averageSteps, formatSteps } from './steps';

export type ReportFields = { date: string; startWeight?: number; previousWeight?: number; weight?: number; rating: number };
export type EvaluatedTask = { id: string; label: string; done: boolean; reason: string; stepsAverage?: number };
export function reportWeekRange(reportDate: string, weekStartsOn: 0 | 1 = 0): { start: string; end: string; days: string[] } {
  const current = startOfWeek(reportDate, weekStartsOn);
  const start = current === reportDate ? addDays(current, -7) : current;
  return reportRange(start);
}
export function reportRange(start: string): { start: string; end: string; days: string[] } {
  return { start, end: addDays(start, 6), days: Array.from({ length: 7 }, (_, i) => addDays(start, i)) };
}
// Prefer the later of the last day's weigh-in and the following day's weigh-in.
// With Sunday-start weeks these are Saturday and Sunday. Never reach further.
export function reportWeight(start: string, logs: Logs): number | undefined {
  const { end } = reportRange(start);
  return logs[addDays(end, 1)]?.weight ?? logs[end]?.weight
    ?? Object.values(logs).filter(d => d.date >= start && d.date <= end && d.weight !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date))[0]?.weight;
}
export function reportStartWeight(logs: Logs, settings: WeeklyReportSettings): number | undefined {
  return settings.startWeight ?? Object.values(logs).filter(d => d.weight !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))[0]?.weight;
}
export function reportRating(start: string, logs: Logs, settings: Settings): number {
  const recorded = reportRange(start).days.filter(d => !!logs[d]);
  const average = recorded.length ? recorded.reduce((sum, d) => sum + adherence(d, logs, settings).score, 0) / recorded.length : 0;
  return Math.min(10, Math.max(1, Math.round(average / 10)));
}
export function reportTaskLabel(task: ReportTask, settings: WeeklyReportSettings): string {
  const rule = task.rule;
  // Keep customized labels, while the standard aerobic label follows its target.
  return rule.type === 'habit-count' && rule.habitId === 'aerobic' && /^\d+ אירובי$/.test(task.label)
    ? `${rule.n ?? settings.aerobicTarget} אירובי` : task.label;
}
export function evaluateReportTask(task: ReportTask, start: string, logs: Logs, settings: Settings, rating: number): EvaluatedTask {
  const days = reportRange(start).days;
  const rule = task.rule;
  let count: number, target: number, done: boolean, reason: string;
  let stepsAverage: number | undefined;
  switch (rule.type) {
    case 'steps-average':
      stepsAverage = averageSteps(days, logs);
      done = stepsAverage >= settings.stepsGoal;
      reason = `ממוצע ${formatSteps(stepsAverage)} · יעד ${formatSteps(settings.stepsGoal)}`; break;
    case 'water-every-day':
      count = days.filter(d => !!logs[d] && waterGoalMet(logs[d].water, settings)).length;
      done = count === 7; reason = `${count}/7 ימים`; break;
    case 'habit-every-day':
      count = days.filter(d => logs[d]?.habits?.[rule.habitId] === true).length;
      done = count === 7; reason = `${count}/7 ימים`; break;
    case 'habit-count':
      count = days.filter(d => logs[d]?.habits?.[rule.habitId] === true).length;
      target = rule.n ?? settings.weeklyReport.aerobicTarget;
      done = count >= target; reason = `${count}/${target} ימים`; break;
    case 'workout-count':
      count = days.filter(d => logs[d]?.workout).length;
      target = rule.n ?? settings.weeklyReport.workoutTarget;
      done = count >= target; reason = `${count}/${target} אימונים`; break;
    case 'rating-10': done = rating === 10; reason = `${rating}/10`; break;
    case 'manual': done = false; reason = 'סימון ידני'; break;
  }
  return { id: task.id, label: reportTaskLabel(task, settings.weeklyReport), done, reason, stepsAverage };
}
export function buildReport(reportDate: string, start: string, logs: Logs, settings: Settings) {
  const fields: ReportFields = { date: reportDate, startWeight: reportStartWeight(logs, settings.weeklyReport),
    previousWeight: reportWeight(addDays(start, -7), logs), weight: reportWeight(start, logs), rating: reportRating(start, logs, settings) };
  return { fields, tasks: settings.weeklyReport.tasks.map(t => evaluateReportTask(t, start, logs, settings, fields.rating)) };
}
export function formatReportMessage(fields: ReportFields, tasks: Pick<EvaluatedTask, 'label' | 'done' | 'stepsAverage'>[]): string {
  const [year, month, day] = fields.date.split('-');
  const weight = (n: number | undefined) => n === undefined ? '' : n.toFixed(1);
  return [
    `תאריך: ${day}.${month}.${year}`,
    `משקל התחלתי: ${weight(fields.startWeight)}`,
    `משקל שבוע שעבר: ${weight(fields.previousWeight)}`,
    `משקל השבוע: ${weight(fields.weight)}`,
    `כמה עמדת בתפריט מ1-10: ${fields.rating}`,
    'משימות שעשית:',
    ...tasks.map(t => `${t.label}${t.stepsAverage !== undefined ? ` - ממוצע ${formatSteps(t.stepsAverage)}` : ''}${t.done ? ' ✅' : ''}`),
  ].join('\n');
}
