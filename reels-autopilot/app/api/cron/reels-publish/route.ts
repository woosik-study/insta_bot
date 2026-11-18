import { isAuthorizedCron } from "@/lib/auth/cron";
import { serverEnv } from "@/lib/env/server";
import { createReelContainer, getContainerStatus, publishContainer } from "@/lib/instagram/graph";
import { recordRun } from "@/lib/ops/runs";
import { publishNext } from "@/lib/reels/publish-next";
import {
  claimNextApproved,
  markFailed,
  markNeedsReview,
  markPublished,
  reapStalePublishing,
} from "@/lib/reels/queue";

export const maxDuration = 300;

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization"); // read first, see lib/auth/cron.ts
  if (!isAuthorizedCron(authorization, serverEnv().CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await publishNext({
      reapStale: reapStalePublishing,
      claimNext: claimNextApproved,
      markPublished,
      markFailed,
      markNeedsReview,
      createContainer: (row) => createReelContainer(row.video_url, row.caption),
      getStatus: getContainerStatus,
      publish: publishContainer,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    });
    await recordRun("reels-publish", result.status, result);
    return Response.json(result);
  } catch (e) {
    console.error("reels-publish failed", e);
    // The error text goes to the run log for the monitor, not to the HTTP caller.
    await recordRun("reels-publish", "failed", { error: e instanceof Error ? e.message : String(e) });
    return Response.json({ status: "failed" }, { status: 500 });
  }
}
