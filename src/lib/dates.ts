export const hebrewDays = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];
export function dateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function parseDate(key: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('תאריך לא תקין');
  const [year, month, day] = key.split('-').map(Number);
  // Noon avoids DST gaps; all arithmetic is calendar arithmetic, never 24h offsets.
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  if (dateKey(date) !== key) throw new Error('תאריך לא תקין');
  return date;
}
export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { parseDate(value); return true; } catch { return false; }
}
export function addDays(key: string, days: number): string {
  const date = parseDate(key); date.setDate(date.getDate() + days); return dateKey(date);
}
export function startOfWeek(key: string, weekStartsOn: 0 | 1 = 0): string {
  return addDays(key, -((parseDate(key).getDay() - weekStartsOn + 7) % 7));
}
export function weekDays(key: string, weekStartsOn: 0 | 1 = 0): string[] {
  const start = startOfWeek(key, weekStartsOn); return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}
export function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) dates.push(day);
  return dates;
}
export const dayName = (key: string) => hebrewDays[parseDate(key).getDay()];
export const displayDate = (key: string, short = false) => new Intl.DateTimeFormat('he-IL', short
  ? { day: 'numeric', month: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' }).format(parseDate(key));
export function nextTimestamp(previous?: string): string {
  return new Date(Math.max(Date.now(), previous ? Date.parse(previous) + 1 : 0)).toISOString();
}
