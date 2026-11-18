import { serverEnv } from "@/lib/env/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Alert } from "@/lib/ops/monitor";

const WEBHOOK_TIMEOUT_MS = 10_000;
const WEBHOOK_ATTEMPTS = 2;

// Slack wants `text`, Discord wants `content`.
function payloadFor(url: URL, text: string) {
  if (url.hostname === "hooks.slack.com") return { text };
  if (url.hostname === "discord.com" || url.hostname === "discordapp.com") return { content: text };
  return { text, content: text };
}

// True only when the webhook accepted the message.
async function sendWebhook(a: Alert): Promise<boolean> {
  let url: URL;
  try {
    const raw = serverEnv().ALERT_WEBHOOK_URL;
    if (!raw) return false;
    url = new URL(raw);
  } catch {
    console.error("ops-alert: ALERT_WEBHOOK_URL is missing or invalid");
    return false;
  }

  const body = JSON.stringify(payloadFor(url, `[${a.severity}] insta_bot: ${a.message}`));
  for (let attempt = 1; attempt <= WEBHOOK_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      if (res.ok) return true;
      console.error("ops-alert: webhook returned", res.status);
    } catch (e) {
      console.error("ops-alert: webhook failed", e instanceof Error ? e.name : "unknown");
    }
  }
  return false;
}

// Stores the alert once per key per UTC day and sends the webhook until it is
// delivered, so a re-run on the same day retries a delivery that failed.
// Never throws: alerting must not break the run that raises it.
export async function raiseAlert(a: Alert): Promise<void> {
  console.error(`ops-alert [${a.severity}] ${a.key}: ${a.message}`);
  const alertDay = new Date().toISOString().slice(0, 10);

  let pendingId: number | null = null;
  try {
    const db = supabaseAdmin();
    const { error } = await db
      .from("alerts")
      .upsert(
        { key: a.key, severity: a.severity, message: a.message, alert_day: alertDay },
        { onConflict: "key,alert_day", ignoreDuplicates: true },
      );
    if (error) throw error;

    const { data, error: readError } = await db
      .from("alerts")
      .select("id")
      .eq("key", a.key)
      .eq("alert_day", alertDay)
      .is("notified_at", null)
      .maybeSingle();
    if (readError) throw readError;
    if (!data) return; // Already delivered today.
    pendingId = data.id;
  } catch (e) {
    // Storage failed: better to send a duplicate than to stay silent.
    console.error("ops-alert: store failed", e instanceof Error ? e.message : JSON.stringify(e));
  }

  if (!(await sendWebhook(a)) || pendingId === null) return;
  try {
    const { error } = await supabaseAdmin()
      .from("alerts")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", pendingId);
    if (error) throw error;
  } catch (e) {
    console.error("ops-alert: mark notified failed", e instanceof Error ? e.message : JSON.stringify(e));
  }
}
