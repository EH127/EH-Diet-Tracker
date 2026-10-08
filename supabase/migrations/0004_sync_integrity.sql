-- Apply before deploying the client that pulls by synced_at.
-- PostgreSQL 11+ stores this stable default for existing rows without a table
-- rewrite. No existing data or updated_at values are changed or backfilled.
-- Existing rows are discoverable from the migration time; sign-in does a full pull.

-- Add-column and index creation take table locks. Fail rather than wait behind
-- long-running production transactions; a failed transaction can be retried.
set local lock_timeout = '5s';

alter table public.day_logs add column synced_at timestamptz not null default now();
alter table public.user_settings add column synced_at timestamptz not null default now();

create index day_logs_user_synced_idx on public.day_logs (user_id, synced_at);
create index user_settings_user_synced_idx on public.user_settings (user_id, synced_at);

-- Row-level BEFORE UPDATE runs under the upsert's row lock, making LWW atomic.
-- Keep the stored payload/edit time on stale writes, but refresh its discovery
-- time so the rejected writer can pull the winning row on its next sync.
-- clock_timestamp() is write time, not transaction-start time. The client pulls
-- with a 60-second overlap for transactions that commit out of timestamp order;
-- transactions delayed longer than that require a full pull (e.g. on sign-in).
-- Always overwrite client-supplied synced_at, including for inserts/old clients.
create function public.enforce_sync_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if TG_OP = 'UPDATE' then
    if NEW.updated_at < OLD.updated_at then
      NEW := OLD;
    end if;
  end if;
  NEW.synced_at := clock_timestamp();
  return NEW;
end;
$$;

-- Trigger execution does not require callers to have EXECUTE on the function.
revoke all on function public.enforce_sync_integrity() from public, anon, authenticated;

create trigger day_logs_sync_integrity
before insert or update on public.day_logs
for each row execute function public.enforce_sync_integrity();

create trigger user_settings_sync_integrity
before insert or update on public.user_settings
for each row execute function public.enforce_sync_integrity();

-- RLS, all owner-only policies, grants and the old updated_at index stay intact.
-- Old clients gain stale-write protection but still miss late offline uploads
-- until upgraded, since their incremental pulls continue to use updated_at.
