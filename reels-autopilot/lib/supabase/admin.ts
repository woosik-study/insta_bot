import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env/server";

// Service-role client. Server only; bypasses RLS.
export function supabaseAdmin() {
  const env = serverEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
