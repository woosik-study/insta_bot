import { supabaseAdmin } from "@/lib/supabase/admin";
import type { QueueRow } from "@/lib/reels/publish-next";

// A run killed mid-flight leaves its row in 'publishing'. It may already be live,
// so move it to needs_review instead of back to approved.
const STALE_AFTER_MS = 15 * 60 * 1000;

export async function reapStalePublishing(): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from("reels_queue")
    .update({
      status: "needs_review",
      error: "stuck in publishing; check Instagram before re-approving",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "publishing")
    .lt("updated_at", new Date(Date.now() - STALE_AFTER_MS).toISOString())
    .select("id");
  if (error) throw error;
  return data.length;
}

// Oldest due approved row, claimed with a conditional update so a duplicate
// cron invocation cannot post the same reel twice.
export async function claimNextApproved(): Promise<QueueRow | null> {
  const db = supabaseAdmin();
  const { data: next, error } = await db
    .from("reels_queue")
    .select("id")
    .eq("status", "approved")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!next) return null;

  const { data: claimed, error: claimError } = await db
    .from("reels_queue")
    .update({ status: "publishing", updated_at: new Date().toISOString() })
    .eq("id", next.id)
    .eq("status", "approved")
    .select("id, video_url, caption")
    .maybeSingle();
  if (claimError) throw claimError;
  return claimed;
}

export async function markPublished(id: string, mediaId: string) {
  const { error } = await supabaseAdmin()
    .from("reels_queue")
    .update({ status: "published", media_id: mediaId, error: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function setStatus(id: string, status: "failed" | "needs_review", message: string) {
  const { error } = await supabaseAdmin()
    .from("reels_queue")
    .update({ status, error: message, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export const markFailed = (id: string, message: string) => setStatus(id, "failed", message);
export const markNeedsReview = (id: string, message: string) => setStatus(id, "needs_review", message);
