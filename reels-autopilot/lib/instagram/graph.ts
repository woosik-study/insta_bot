import { serverEnv } from "@/lib/env/server";

// Instagram API with Instagram Login. Version checked against Meta docs on 2026-11-14.
const BASE = "https://graph.instagram.com/v27.0";

// Per-request cap so one hung call cannot push the cron past its 300s maxDuration.
const REQUEST_TIMEOUT_MS = 10_000;

async function call(path: string, params: Record<string, string>, method = "GET") {
  const env = serverEnv();
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries({ ...params, access_token: env.IG_ACCESS_TOKEN })) {
    url.searchParams.set(k, v);
  }

  let res: Response;
  try {
    res = await fetch(url, { method, cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (e) {
    // Rethrow without the cause: the request URL carries the access token.
    const reason = e instanceof Error ? e.name : "unknown";
    throw new Error(`Instagram ${path}: request failed (${reason})`);
  }

  const text = await res.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Non-JSON body (e.g. an HTML 502 page); handled below.
  }

  if (!res.ok) {
    const message = (body as { error?: { message?: string } } | null)?.error?.message;
    throw new Error(`Instagram ${path}: HTTP ${res.status}${message ? ` ${message}` : ""}`);
  }
  if (!body || typeof body !== "object") {
    throw new Error(`Instagram ${path}: HTTP ${res.status} with non-JSON body`);
  }
  return body as Record<string, unknown>;
}

function requireString(body: Record<string, unknown>, key: string, path: string): string {
  const value = body[key];
  if (typeof value !== "string" || value === "") {
    throw new Error(`Instagram ${path}: response missing "${key}"`);
  }
  return value;
}

export async function createReelContainer(videoUrl: string, caption: string | null) {
  const path = `${serverEnv().IG_USER_ID}/media`;
  const body = await call(
    path,
    { media_type: "REELS", video_url: videoUrl, caption: caption ?? "", share_to_feed: "true" },
    "POST",
  );
  return requireString(body, "id", path);
}

export async function getContainerStatus(containerId: string) {
  const body = await call(containerId, { fields: "status_code" });
  return requireString(body, "status_code", containerId);
}

export async function publishContainer(containerId: string) {
  const path = `${serverEnv().IG_USER_ID}/media_publish`;
  const body = await call(path, { creation_id: containerId }, "POST");
  return requireString(body, "id", path);
}
