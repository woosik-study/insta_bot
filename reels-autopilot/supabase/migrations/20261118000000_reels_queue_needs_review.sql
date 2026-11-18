-- needs_review: publish outcome unknown (publish call errored, or the run died
-- while 'publishing'). A human checks Instagram before re-approving.
alter table public.reels_queue drop constraint reels_queue_status_check;
alter table public.reels_queue add constraint reels_queue_status_check
  check (status in ('draft', 'approved', 'publishing', 'published', 'failed', 'needs_review'));
