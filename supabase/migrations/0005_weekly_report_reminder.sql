-- Apply before deploying the weekly reminder client and push function.
-- Additive only; existing RLS, policies and grants are unchanged.
alter table public.notification_prefs
  add column weekly_enabled boolean not null default false,
  add column weekly_day smallint not null default 0,
  add column weekly_time time not null default '10:00',
  add column last_weekly_sent_date date,
  add constraint notification_prefs_weekly_day_check check (weekly_day between 0 and 6);
