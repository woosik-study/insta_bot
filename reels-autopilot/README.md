# reels-autopilot

Publishes approved Instagram Reels from a Supabase queue on a Vercel cron. Layout follows Match'a (`app/api/**` thin routes, logic in `lib/**`, Zod env, service-role Supabase, `CRON_SECRET`).

## Flow
1. Insert a row into `reels_queue` (`video_url`, `caption`, `scheduled_at`). Status starts as `draft`.
2. Review it and set `status = 'approved'` in the Supabase table editor.
3. Cron (`vercel.json`, daily 17:00 UTC) calls `/api/cron/reels-publish`: claims the oldest due approved row, creates the container, polls up to ~160s, publishes, writes `media_id` or `error`. Each run first moves rows stuck in `publishing` for 15+ min to `needs_review`, and every run is logged to `cron_runs`.
4. Cron (daily 19:00 UTC) calls `/api/cron/ops-monitor`. It alerts when the publish run is missing or failed, when reels fail, or when fewer than 3 approved reels are due in the next 3 days. It refreshes the Instagram token weekly (stored in `ig_token`) and alerts 10 days before expiry. A `needs_review` row is set to `published` only when exactly one unrecorded reel was posted within 30 minutes of its claim; it is never re-approved automatically. Alerts go to the `alerts` table (once per key per day) and to `ALERT_WEBHOOK_URL` (Slack or Discord) if set.

## Setup
1. Apply `supabase/migrations/*.sql`.
2. Copy `.env.example` to `.env.local` and fill it; add the same vars in Vercel.
3. `npm test`, `npm run typecheck`, `npm run build`.
4. Local run: `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/reels-publish`

## Known limits
- One reel per run. More per day: shorten the cron schedule (sub-daily needs Vercel Pro).
- The Instagram token is read from `ig_token`, falling back to `IG_ACCESS_TOKEN` while the table is empty. The monitor refreshes it weekly; a token under 24 hours old cannot be refreshed yet, so the first refresh may alert once.
- Vercel Hobby fires crons up to 59 minutes late, which is why the monitor runs two hours after the publisher.
- If the monitor runs before the first logged publish run (right after this migration), it raises one false `publish-missing` alert.
- A `needs_review` row is matched by claim time only. A reel posted by hand within 30 minutes of a claim can be matched instead; the `info` alert asks you to verify.
- `needs_review` means the publish outcome is unknown (publish call errored, or a run died mid-publish). Check Instagram before setting it back to `approved`, or the reel may post twice.
- Videos that take longer than ~160s to process are marked `failed`; re-approve them.
