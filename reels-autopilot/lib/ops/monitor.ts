// Daily health check for the publishing pipeline. Pure logic; I/O is passed in
// so it runs under `node --test` without Next, Supabase, or Instagram.

export type Severity = "info" | "medium" | "high";
export type Alert = { key: string; severity: Severity; message: string };

export type RunRecord = { status: string; detail: unknown; createdAt: Date };
export type ReviewRow = { id: string; claimedAt: Date | null };
export type Media = { id: string; timestamp: Date };
export type FailedRow = { id: string; error: string | null; updatedAt: Date };
export type TokenState = { refreshedAt: Date | null; expiresAt: Date | null };

export type MonitorDeps = {
  now(): Date;
  lastRun(job: string): Promise<RunRecord | null>;
  listNeedsReview(): Promise<ReviewRow[]>;
  listRecentMedia(): Promise<Media[]>;
  findRecordedMediaIds(ids: string[]): Promise<Set<string>>;
  // Conditional on the row still being needs_review; false if it changed meanwhile.
  resolveAsPublished(rowId: string, mediaId: string): Promise<boolean>;
  listFailedSince(since: Date): Promise<FailedRow[]>;
  countApprovedDueBy(until: Date): Promise<number>;
  tokenState(): Promise<TokenState>;
  refreshToken(): Promise<{ expiresAt: Date }>;
  // Must not throw; the implementation stores and delivers best-effort.
  alert(a: Alert): Promise<void>;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const LIMITS = {
  // Hobby cron fires up to 59 min late, so allow a day plus slack.
  publishRunMaxAgeMs: 26 * HOUR,
  // A publish lands a few minutes after the claim (create + poll + publish).
  matchBeforeMs: 1 * MINUTE,
  matchAfterMs: 30 * MINUTE,
  failureWindowMs: 2 * DAY,
  bufferWindowMs: 3 * DAY,
  minBuffer: 3,
  refreshEveryMs: 7 * DAY,
  expiryWarnMs: 10 * DAY,
};

export type CheckResult = "ok" | "alerted" | "error";
export type MonitorReport = {
  checks: Record<string, CheckResult>;
  resolved: { rowId: string; mediaId: string }[];
  tokenRefreshed: boolean;
};

// Supabase errors can be plain objects with a message field.
function message(e: unknown): string {
  if (e instanceof Error) return e.message;
  const m = (e as { message?: unknown } | null)?.message;
  return typeof m === "string" ? m : JSON.stringify(e) ?? String(e);
}
const clip = (s: string, n = 300) => (s.length > n ? `${s.slice(0, n)}...` : s);

function errorOf(detail: unknown): string {
  const err = (detail as { error?: unknown } | null)?.error;
  return clip(typeof err === "string" ? err : JSON.stringify(detail ?? null));
}

export async function runMonitor(d: MonitorDeps): Promise<MonitorReport> {
  const report: MonitorReport = { checks: {}, resolved: [], tokenRefreshed: false };
  const now = d.now();

  // Each check is isolated: one failing check must not hide the others.
  async function check(name: string, fn: () => Promise<boolean>) {
    try {
      report.checks[name] = (await fn()) ? "alerted" : "ok";
    } catch (e) {
      report.checks[name] = "error";
      await d.alert({ key: `monitor-${name}`, severity: "high", message: `Monitor check "${name}" failed: ${clip(message(e))}` });
    }
  }

  await check("publish-run", async () => {
    const run = await d.lastRun("reels-publish");
    if (!run || now.getTime() - run.createdAt.getTime() > LIMITS.publishRunMaxAgeMs) {
      await d.alert({
        key: "publish-missing",
        severity: "high",
        message: "No reels-publish run recorded in the last 26 hours. Check the Vercel cron and the latest deployment.",
      });
      return true;
    }
    if (run.status === "failed") {
      await d.alert({ key: "publish-failed", severity: "high", message: `Last publish run failed: ${errorOf(run.detail)}` });
      return true;
    }
    return false;
  });

  await check("needs-review", async () => {
    const rows = await d.listNeedsReview();
    if (rows.length === 0) return false;

    const media = await d.listRecentMedia();
    const taken = await d.findRecordedMediaIds(media.map((m) => m.id));
    let alerted = false;

    for (const row of rows) {
      if (!row.claimedAt) {
        await d.alert({
          key: `needs-review-${row.id}`,
          severity: "medium",
          message: `Row ${row.id} is needs_review with no claim time. Check Instagram, then set it to published or approved by hand.`,
        });
        alerted = true;
        continue;
      }
      const from = row.claimedAt.getTime() - LIMITS.matchBeforeMs;
      const to = row.claimedAt.getTime() + LIMITS.matchAfterMs;
      const candidates = media.filter((m) => !taken.has(m.id) && m.timestamp.getTime() >= from && m.timestamp.getTime() <= to);

      if (candidates.length === 1) {
        const [hit] = candidates;
        if (await d.resolveAsPublished(row.id, hit.id)) {
          taken.add(hit.id);
          report.resolved.push({ rowId: row.id, mediaId: hit.id });
          await d.alert({
            key: `resolved-${row.id}`,
            severity: "info",
            message: `Row ${row.id} matched media ${hit.id} posted at ${hit.timestamp.toISOString()} and was marked published. Verify on Instagram.`,
          });
          alerted = true;
        }
        continue;
      }

      // Never re-approve automatically: if the reel did go live, that double-posts.
      const why =
        candidates.length === 0
          ? "no reel found on Instagram within 30 minutes of its claim. If it really did not post, set it back to approved"
          : `${candidates.length} reels posted within 30 minutes of its claim. Pick the right one and set media_id by hand`;
      await d.alert({ key: `needs-review-${row.id}`, severity: "medium", message: `Row ${row.id}: ${why}.` });
      alerted = true;
    }
    return alerted;
  });

  await check("failures", async () => {
    const failed = await d.listFailedSince(new Date(now.getTime() - LIMITS.failureWindowMs));
    if (failed.length >= 2) {
      const errors = [...new Set(failed.map((f) => f.error ?? "unknown"))].slice(0, 3).map((e) => clip(e, 150));
      await d.alert({
        key: "repeated-failures",
        severity: "high",
        message: `${failed.length} reels failed in the last 48 hours; the pipeline is likely broken. Errors: ${errors.join(" | ")}`,
      });
      return true;
    }
    const [one] = failed;
    if (one && now.getTime() - one.updatedAt.getTime() <= DAY) {
      await d.alert({
        key: `failed-${one.id}`,
        severity: "medium",
        message: `Row ${one.id} failed: ${clip(one.error ?? "unknown")}. Fix the cause and re-approve it.`,
      });
      return true;
    }
    return false;
  });

  await check("buffer", async () => {
    const due = await d.countApprovedDueBy(new Date(now.getTime() + LIMITS.bufferWindowMs));
    if (due >= LIMITS.minBuffer) return false;
    await d.alert({
      key: "low-buffer",
      severity: "medium",
      message: `Only ${due} approved reels are due in the next 3 days (target ${LIMITS.minBuffer}). Approve more drafts.`,
    });
    return true;
  });

  await check("token", async () => {
    const state = await d.tokenState();
    let expiresAt = state.expiresAt;
    let alerted = false;

    if (!state.refreshedAt || now.getTime() - state.refreshedAt.getTime() >= LIMITS.refreshEveryMs) {
      try {
        expiresAt = (await d.refreshToken()).expiresAt;
        report.tokenRefreshed = true;
      } catch (e) {
        await d.alert({
          key: "token-refresh-failed",
          severity: "high",
          message: `Instagram token refresh failed: ${clip(message(e))}. A token under 24 hours old cannot be refreshed yet. Otherwise issue a new long-lived token and upsert it into ig_token (or set IG_ACCESS_TOKEN, which takes over once the stored token expires).`,
        });
        alerted = true;
      }
    }

    if (expiresAt && expiresAt.getTime() - now.getTime() < LIMITS.expiryWarnMs) {
      await d.alert({
        key: "token-expiring",
        severity: "high",
        message: `Instagram token expires at ${expiresAt.toISOString()}. Publishing stops after that.`,
      });
      alerted = true;
    }
    return alerted;
  });

  return report;
}
