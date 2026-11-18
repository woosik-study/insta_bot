// Pure orchestration; I/O is passed in so it runs under `node --test` without Next.

export type QueueRow = { id: string; video_url: string; caption: string | null };

export type PublishDeps = {
  reapStale(): Promise<number>;
  claimNext(): Promise<QueueRow | null>;
  markPublished(id: string, mediaId: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  markNeedsReview(id: string, error: string): Promise<void>;
  createContainer(row: QueueRow): Promise<string>;
  getStatus(containerId: string): Promise<string>;
  publish(containerId: string): Promise<string>;
  sleep(ms: number): Promise<void>;
};

// Worst case with 10s request timeouts: 10 (create) + 8 x (20 + 10) (poll) + 10 (publish)
// + DB writes stays under the route's 300s maxDuration.
// ponytail: videos that take longer than ~160s to process fail and need re-approval.
const POLL_MS = 20_000;
const MAX_POLLS = 8;
const RECORD_ATTEMPTS = 3;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

// A bookkeeping failure must never hide the error that caused it.
async function safely(write: () => Promise<void>, label: string) {
  try {
    await write();
  } catch (e) {
    console.error(`reels-publish: ${label} failed`, message(e));
  }
}

export async function publishNext(d: PublishDeps, pollMs = POLL_MS, maxPolls = MAX_POLLS) {
  const reaped = await d.reapStale();
  const row = await d.claimNext();
  if (!row) return { status: "idle" as const, reaped };

  // Phase 1: nothing is live yet, so any failure is a plain `failed`.
  let containerId: string;
  try {
    containerId = await d.createContainer(row);
    let status = "IN_PROGRESS";
    for (let i = 0; i < maxPolls && status === "IN_PROGRESS"; i++) {
      await d.sleep(pollMs);
      status = await d.getStatus(containerId);
    }
    if (status !== "FINISHED") throw new Error(`container ${status} after polling`);
  } catch (e) {
    await safely(() => d.markFailed(row.id, message(e)), "markFailed");
    throw e;
  }

  // Phase 2: a publish error is ambiguous (it may have gone live), so a human checks.
  let mediaId: string;
  try {
    mediaId = await d.publish(containerId);
  } catch (e) {
    await safely(
      () => d.markNeedsReview(row.id, `publish outcome unknown, check Instagram: ${message(e)}`),
      "markNeedsReview",
    );
    throw e;
  }

  // Phase 3: the reel is live. Never record it as failed; retry, then surface loudly.
  for (let attempt = 1; ; attempt++) {
    try {
      await d.markPublished(row.id, mediaId);
      return { status: "published" as const, id: row.id, mediaId, reaped };
    } catch (e) {
      if (attempt >= RECORD_ATTEMPTS) {
        // Row stays `publishing`; the next run's reaper moves it to needs_review.
        throw new Error(`published as ${mediaId} but not recorded for row ${row.id}: ${message(e)}`);
      }
    }
  }
}
