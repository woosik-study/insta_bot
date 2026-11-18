import { isAuthorizedCron } from "@/lib/auth/cron";
import { serverEnv } from "@/lib/env/server";
import { raiseAlert } from "@/lib/ops/alerts";
import { monitorDeps } from "@/lib/ops/deps";
import { runMonitor } from "@/lib/ops/monitor";
import { recordRun } from "@/lib/ops/runs";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization"); // read first, see lib/auth/cron.ts
  if (!isAuthorizedCron(authorization, serverEnv().CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const report = await runMonitor(monitorDeps());
    await recordRun("ops-monitor", "ok", report);
    return Response.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("ops-monitor failed", e);
    await raiseAlert({ key: "monitor-crashed", severity: "high", message: `Ops monitor crashed: ${message}` });
    await recordRun("ops-monitor", "failed", { error: message });
    return Response.json({ status: "failed" }, { status: 500 });
  }
}
