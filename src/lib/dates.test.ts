import { describe, expect, it, vi } from 'vitest';
import { addDays, dateKey, dateRange, dayName, displayDate, isDateKey, nextTimestamp, parseDate, startOfWeek, weekDays } from './dates';

describe('local calendar dates', () => {
  it('formats local midnight without deriving its key from UTC', () => {
    const local = new Date(2026, 9, 8, 0, 5);
    expect(dateKey(local)).toBe('2026-10-08');
    expect(dateKey(parseDate('2026-10-08'))).toBe('2026-10-08');
  });
  it('uses the local getters even when UTC would be the previous day', () => {
    const date = new Date('2026-10-07T21:05:00Z');
    vi.spyOn(date, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(date, 'getMonth').mockReturnValue(9);
    vi.spyOn(date, 'getDate').mockReturnValue(8);
    expect(dateKey(date)).toBe('2026-10-08');
  });
  it('validates real calendar dates, including leap years', () => {
    expect(isDateKey('2024-02-29')).toBe(true);
    for (const value of ['2026-02-29', '2026-13-01', '2026-04-31', '2026-1-02', 'bad', '2026-10-08T00:00:00Z', null]) expect(isDateKey(value)).toBe(false);
  });
  it('crosses month, year, leap day and Israeli DST dates with calendar arithmetic', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-03-27', 1)).toBe('2026-03-28');
    expect(addDays('2026-10-25', -1)).toBe('2026-10-24');
  });
  it('starts weeks on Sunday by default, including Saturday and Sunday boundaries', () => {
    expect(startOfWeek('2026-10-10')).toBe('2026-10-04');
    expect(startOfWeek('2026-10-11')).toBe('2026-10-11');
    expect(weekDays('2026-10-08')).toEqual(['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']);
  });
  it('supports Monday weeks and Hebrew display', () => {
    expect(startOfWeek('2026-10-04', 1)).toBe('2026-09-28');
    expect(weekDays('2026-10-05', 1).at(-1)).toBe('2026-10-11');
    expect(dayName('2026-10-10')).toBe('שבת');
    expect(displayDate('2026-10-08')).toContain('2026');
    expect(dateRange('2026-10-04', '2026-10-06')).toHaveLength(3);
  });
  it('makes successive edit timestamps monotonic', () => {
    const next = nextTimestamp('2099-01-01T00:00:00.000Z');
    expect(next).toBe('2099-01-01T00:00:00.001Z');
  });
});
