import { serverEnv } from "@/lib/env/server";
import { createReelContainer, getContainerStatus, publishContainer } from "@/lib/instagram/graph";
import { publishNext } from "@/lib/reels/publish-next";
import {
  claimNextApproved,
  markFailed,
  markNeedsReview,
  markPublished,
  reapStalePublishing,
} from "@/lib/reels/queue";

export const maxDuration = 300;

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${serverEnv().CRON_SECRET}`) {
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
    return Response.json(result);
  } catch (e) {
    console.error("reels-publish failed", e);
    return Response.json({ status: "failed", error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
