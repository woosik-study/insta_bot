import { serverEnv } from "@/lib/env/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type StoredToken = {
  access_token: string;
  expires_at: string | null;
  refreshed_at: string | null;
};

export async function readStoredToken(): Promise<StoredToken | null> {
  const { data, error } = await supabaseAdmin()
    .from("ig_token")
    .select("access_token, expires_at, refreshed_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// The stored token wins while it is valid. IG_ACCESS_TOKEN bootstraps an empty
// table and takes over once the stored token has expired, so putting a fresh
// token in the env var is enough to recover.
export async function getAccessToken(): Promise<string> {
  const stored = await readStoredToken();
  const envToken = serverEnv().IG_ACCESS_TOKEN;
  const storedExpired = !!stored?.expires_at && new Date(stored.expires_at).getTime() <= Date.now();
  const token = stored && !(storedExpired && envToken) ? stored.access_token : envToken;
  if (!token) throw new Error("No Instagram token: ig_token is empty and IG_ACCESS_TOKEN is unset");
  return token;
}

export async function saveToken(accessToken: string, expiresAt: Date) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin().from("ig_token").upsert({
    id: 1,
    access_token: accessToken,
    expires_at: expiresAt.toISOString(),
    refreshed_at: now,
    updated_at: now,
  });
  if (error) throw error;
}
