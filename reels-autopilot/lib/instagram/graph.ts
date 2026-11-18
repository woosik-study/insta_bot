import { serverEnv } from "@/lib/env/server";

// Instagram API with Instagram Login. Version checked against Meta docs on 2026-11-14.
const BASE = "https://graph.instagram.com/v27.0";

async function call(path: string, params: Record<string, string>, method = "GET") {
  const env = serverEnv();
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries({ ...params, access_token: env.IG_ACCESS_TOKEN })) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url, { method, cache: "no-store" });
  const body = await res.json();
  if (!res.ok) throw new Error(`Instagram ${path}: ${body?.error?.message ?? res.status}`);
  return body;
}

export async function createReelContainer(videoUrl: string, caption: string | null) {
  const { id } = await call(
    `${serverEnv().IG_USER_ID}/media`,
    { media_type: "REELS", video_url: videoUrl, caption: caption ?? "", share_to_feed: "true" },
    "POST",
  );
  return id as string;
}

export async function getContainerStatus(containerId: string) {
  const { status_code } = await call(containerId, { fields: "status_code" });
  return status_code as string;
}

export async function publishContainer(containerId: string) {
  const { id } = await call(
    `${serverEnv().IG_USER_ID}/media_publish`,
    { creation_id: containerId },
    "POST",
  );
  return id as string;
}
