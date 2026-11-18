import { listRecentMedia, refreshAccessToken } from "@/lib/instagram/graph";
import { getAccessToken, readStoredToken, saveToken } from "@/lib/instagram/token";
import { raiseAlert } from "@/lib/ops/alerts";
import type { MonitorDeps } from "@/lib/ops/monitor";
import { lastRun } from "@/lib/ops/runs";
import { supabaseAdmin } from "@/lib/supabase/admin";

const toDate = (s: string | null) => (s ? new Date(s) : null);

// Real I/O for runMonitor.
export function monitorDeps(): MonitorDeps {
  const db = () => supabaseAdmin().from("reels_queue");

  return {
    now: () => new Date(),
    lastRun,
    alert: raiseAlert,
    listRecentMedia: () => listRecentMedia(25),

    async listNeedsReview() {
      const { data, error } = await db()
        .select("id, claimed_at")
        .eq("status", "needs_review")
        .order("claimed_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data.map((r) => ({ id: r.id, claimedAt: toDate(r.claimed_at) }));
    },

    async findRecordedMediaIds(ids) {
      if (ids.length === 0) return new Set();
      const { data, error } = await db().select("media_id").in("media_id", ids);
      if (error) throw error;
      return new Set(data.map((r) => r.media_id as string));
    },

    async resolveAsPublished(rowId, mediaId) {
      const { data, error } = await db()
        .update({ status: "published", media_id: mediaId, error: null, updated_at: new Date().toISOString() })
        .eq("id", rowId)
        .eq("status", "needs_review")
        .select("id");
      if (error) throw error;
      return data.length > 0;
    },

    async listFailedSince(since) {
      const { data, error } = await db()
        .select("id, error, updated_at")
        .eq("status", "failed")
        .gte("updated_at", since.toISOString())
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data.map((r) => ({ id: r.id, error: r.error, updatedAt: new Date(r.updated_at) }));
    },

    async countApprovedDueBy(until) {
      const { count, error } = await db()
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .lte("scheduled_at", until.toISOString());
      if (error) throw error;
      return count ?? 0;
    },

    async tokenState() {
      const row = await readStoredToken();
      return { refreshedAt: toDate(row?.refreshed_at ?? null), expiresAt: toDate(row?.expires_at ?? null) };
    },

    async refreshToken() {
      const { accessToken, expiresInSec } = await refreshAccessToken(await getAccessToken());
      const expiresAt = new Date(Date.now() + expiresInSec * 1000);
      await saveToken(accessToken, expiresAt);
      return { expiresAt };
    },
  };
}
