import { supabaseAdmin } from "@/lib/supabase/admin";
import type { RunRecord } from "@/lib/ops/monitor";

export type CronJob = "reels-publish" | "ops-monitor";

// Best effort: a logging failure must not change the run's outcome.
export async function recordRun(job: CronJob, status: string, detail: unknown) {
  try {
    const { error } = await supabaseAdmin().from("cron_runs").insert({ job, status, detail });
    if (error) throw error;
  } catch (e) {
    console.error(`cron-runs: record ${job} failed`, e instanceof Error ? e.message : String(e));
  }
}

export async function lastRun(job: string): Promise<RunRecord | null> {
  const { data, error } = await supabaseAdmin()
    .from("cron_runs")
    .select("status, detail, created_at")
    .eq("job", job)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data && { status: data.status, detail: data.detail, createdAt: new Date(data.created_at) };
}
