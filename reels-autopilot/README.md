# reels-autopilot

Publishes approved Instagram Reels from a Supabase queue on a Vercel cron. Layout follows Match'a (`app/api/**` thin routes, logic in `lib/**`, Zod env, service-role Supabase, `CRON_SECRET`).

## Flow
1. Insert a row into `reels_queue` (`video_url`, `caption`, `scheduled_at`). Status starts as `draft`.
2. Review it and set `status = 'approved'` in the Supabase table editor.
3. Cron (`vercel.json`, daily 17:00 UTC) calls `/api/cron/reels-publish`: claims the oldest due approved row, creates the container, polls up to ~160s, publishes, writes `media_id` or `error`. Each run first moves rows stuck in `publishing` for 15+ min to `needs_review`.

## Setup
1. Apply `supabase/migrations/*.sql`.
2. Copy `.env.example` to `.env.local` and fill it; add the same vars in Vercel.
3. `npm test`, `npm run typecheck`, `npm run build`.
4. Local run: `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/reels-publish`

## Known limits
- One reel per run. More per day: shorten the cron schedule (sub-daily needs Vercel Pro).
- Instagram long-lived token expires after 60 days and is read from env; refresh it manually.
- `needs_review` means the publish outcome is unknown (publish call errored, or a run died mid-publish). Check Instagram before setting it back to `approved`, or the reel may post twice.
- Videos that take longer than ~160s to process are marked `failed`; re-approve them.
