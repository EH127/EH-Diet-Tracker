-- Every 5 minutes, ask the push function to send evening summaries that are due.
-- The function authorizes the call with push_config.cron_token (server-only).
select cron.schedule(
  'push-evening-summary',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://tytuflywvbchesziseql.supabase.co/functions/v1/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (select cron_token from public.push_config where id = 1)
    ),
    body := '{"action":"cron"}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);
