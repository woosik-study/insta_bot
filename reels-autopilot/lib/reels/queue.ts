import { supabaseAdmin } from "@/lib/supabase/admin";
import type { QueueRow } from "@/lib/reels/publish-next";

// Oldest due approved row, claimed with a conditional update so a duplicate
// cron invocation cannot post the same reel twice.
// ponytail: a function killed mid-run leaves the row in 'publishing'; reset it by hand.
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

export async function markFailed(id: string, message: string) {
  const { error } = await supabaseAdmin()
    .from("reels_queue")
    .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
