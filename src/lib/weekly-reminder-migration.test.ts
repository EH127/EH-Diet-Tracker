import migration from '../../supabase/migrations/0005_weekly_report_reminder.sql?raw';
import { describe, expect, it } from 'vitest';

const sql = migration.replace(/--[^\n]*/g, '').toLowerCase();
describe('weekly reminder migration contract (SQL is not executed)', () => {
  it('adds opt-in preferences, local scheduling and a separate claim date', () => {
    expect(sql).toContain('alter table public.notification_prefs');
    expect(sql).toContain('add column weekly_enabled boolean not null default false');
    expect(sql).toContain('add column weekly_day smallint not null default 0');
    expect(sql).toContain("add column weekly_time time not null default '10:00'");
    expect(sql).toContain('add column last_weekly_sent_date date');
    expect(sql).toContain('check (weekly_day between 0 and 6)');
  });
  it('leaves data, RLS, policies and grants intact and uses the runner transaction', () => {
    expect(sql).not.toMatch(/\b(drop|delete|truncate|update|policy|grant|revoke|disable)\b/);
    expect(sql).not.toMatch(/^\s*(begin|commit);\s*$/m);
  });
});
