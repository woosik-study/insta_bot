-- Review queue: a human moves draft -> approved; the cron publishes approved rows.
create table public.reels_queue (
  id uuid primary key default gen_random_uuid(),
  video_url text not null,
  caption text check (char_length(caption) <= 2200),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'publishing', 'published', 'failed')),
  scheduled_at timestamptz not null default now(),
  media_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reels_queue_due_idx on public.reels_queue (status, scheduled_at);

-- RLS on with no policies: only the service-role key (server) can read or write.
alter table public.reels_queue enable row level security;
