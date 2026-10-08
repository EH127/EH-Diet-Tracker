import migration from '../../supabase/migrations/0004_sync_integrity.sql?raw';
import { describe, expect, it } from 'vitest';

const sql = migration.replace(/--[^\n]*/g, '').toLowerCase();
describe('sync integrity migration contract (SQL is not executed)', () => {
  it('uses the migration runner transaction for the local lock timeout', () => {
    expect(sql).toContain("set local lock_timeout = '5s';");
    expect(sql).not.toMatch(/^\s*(begin|commit);\s*$/m);
  });
  it('adds server timestamps and owner-scoped indexes without rewriting data or changing RLS', () => {
    for (const table of ['day_logs', 'user_settings']) {
      expect(sql).toContain(`alter table public.${table} add column synced_at timestamptz not null default now()`);
      expect(sql).toContain(`on public.${table} (user_id, synced_at)`);
      expect(sql).toContain(`before insert or update on public.${table}`);
    }
    expect(sql).not.toMatch(/\b(drop|delete|truncate|update\s+public\.|disable\s+row\s+level|policy|security\s+definer)\b/);
  });
  it('guards stale edits under the row lock and keeps the winner discoverable without exposing the function', () => {
    expect(sql).toContain("set search_path = ''"); expect(sql).toContain('security invoker');
    expect(sql).toMatch(/if new\.updated_at < old\.updated_at then\s+new := old;/);
    expect(sql).toMatch(/new\.synced_at := clock_timestamp\(\);\s+return new;/);
    expect(sql).toContain('revoke all on function public.enforce_sync_integrity() from public, anon, authenticated');
    expect(sql.match(/execute function public\.enforce_sync_integrity\(\)/g)).toHaveLength(2);
  });
});
