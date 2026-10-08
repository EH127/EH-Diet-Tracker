import type { Logs } from '../types';

export const formatSteps = (steps: number): string => steps.toLocaleString('he-IL');

// Every calendar day in the range counts, including absent logs and unset totals.
export function averageSteps(days: string[], logs: Logs): number {
  return days.length ? Math.round(days.reduce((sum, date) => sum + (logs[date]?.steps ?? 0), 0) / days.length) : 0;
}
