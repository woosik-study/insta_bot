-- Ops monitor support: token storage, run log, deduplicated alerts, claim time.

-- When the publisher claimed the row. The monitor uses it to match a
-- needs_review row to the reel Instagram actually posted.
alter table public.reels_queue add column claimed_at timestamptz;

-- Single-row Instagram token store so the monitor can refresh it without a redeploy.
-- Falls back to the IG_ACCESS_TOKEN env var while this table is empty.
create table public.ig_token (
  id smallint primary key default 1 check (id = 1),
  access_token text not null,
  expires_at timestamptz,
  refreshed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- One row per cron run, so a run that never happened is detectable.
create table public.cron_runs (
  id bigint generated always as identity primary key,
  job text not null,
  status text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index cron_runs_job_created_idx on public.cron_runs (job, created_at desc);

-- At most one alert per key per UTC day. notified_at stays null until the
-- webhook accepts it, so a same-day re-run retries a failed delivery.
create table public.alerts (
  id bigint generated always as identity primary key,
  key text not null,
  severity text not null check (severity in ('info', 'medium', 'high')),
  message text not null,
  alert_day date not null default ((now() at time zone 'utc')::date),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (key, alert_day)
);

-- RLS on with no policies: only the service-role key (server) can read or write.
alter table public.ig_token enable row level security;
alter table public.cron_runs enable row level security;
alter table public.alerts enable row level security;
