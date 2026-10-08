create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.day_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index day_logs_user_updated_idx on public.day_logs (user_id, updated_at);
alter table public.user_settings enable row level security;
alter table public.day_logs enable row level security;

create policy "user_settings_select" on public.user_settings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "user_settings_insert" on public.user_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "user_settings_update" on public.user_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "user_settings_delete" on public.user_settings for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "day_logs_select" on public.day_logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "day_logs_insert" on public.day_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "day_logs_update" on public.day_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "day_logs_delete" on public.day_logs for delete to authenticated
  using ((select auth.uid()) = user_id);
