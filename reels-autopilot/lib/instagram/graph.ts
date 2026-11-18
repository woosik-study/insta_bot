import { serverEnv } from "@/lib/env/server";
import { getAccessToken } from "@/lib/instagram/token";

// Instagram API with Instagram Login. Version checked against Meta docs on 2026-11-14.
const HOST = "https://graph.instagram.com";
const BASE = `${HOST}/v27.0`;

// Per-request cap so one hung call cannot push the cron past its 300s maxDuration.
const REQUEST_TIMEOUT_MS = 10_000;

type CallOptions = { method?: "GET" | "POST"; base?: string; token?: string };

async function call(path: string, params: Record<string, string>, opts: CallOptions = {}) {
  const { method = "GET", base = BASE } = opts;
  const token = opts.token ?? (await getAccessToken());
  const url = new URL(`${base}/${path}`);
  for (const [k, v] of Object.entries({ ...params, access_token: token })) {
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
    { method: "POST" },
  );
  return requireString(body, "id", path);
}

export async function getContainerStatus(containerId: string) {
  const body = await call(containerId, { fields: "status_code" });
  return requireString(body, "status_code", containerId);
}

export async function publishContainer(containerId: string) {
  const path = `${serverEnv().IG_USER_ID}/media_publish`;
  const body = await call(path, { creation_id: containerId }, { method: "POST" });
  return requireString(body, "id", path);
}

// Meta returns e.g. "2019-09-26T22:36:43+0000"; add the colon so any parser accepts it.
const parseTimestamp = (s: string) => new Date(s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));

// Most recent media on the account, newest first. Caption is not requested:
// Meta's docs mark it as Facebook Login only.
export async function listRecentMedia(limit = 25) {
  const path = `${serverEnv().IG_USER_ID}/media`;
  const body = await call(path, { fields: "id,timestamp", limit: String(limit) });
  if (!Array.isArray(body.data)) throw new Error(`Instagram ${path}: response missing "data"`);
  return body.data.map((item: unknown) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const timestamp = parseTimestamp(requireString(row, "timestamp", path));
    if (Number.isNaN(timestamp.getTime())) throw new Error(`Instagram ${path}: bad timestamp`);
    return { id: requireString(row, "id", path), timestamp };
  });
}

// Long-lived Instagram User token refresh. The endpoint is unversioned and needs
// a token at least 24 hours old; the result is valid for 60 days.
export async function refreshAccessToken(current: string) {
  const path = "refresh_access_token";
  const body = await call(path, { grant_type: "ig_refresh_token" }, { base: HOST, token: current });
  const expiresIn = body.expires_in;
  if (typeof expiresIn !== "number" || expiresIn <= 0) {
    throw new Error(`Instagram ${path}: response missing "expires_in"`);
  }
  return { accessToken: requireString(body, "access_token", path), expiresInSec: expiresIn };
}
