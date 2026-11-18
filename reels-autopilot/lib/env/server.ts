import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  IG_USER_ID: z.string().min(1),
  IG_ACCESS_TOKEN: z.string().min(1),
  CRON_SECRET: z.string().min(16),
});

// Parsed on first use, not at import, so `next build` works without secrets.
let cached: z.infer<typeof schema> | undefined;
export function serverEnv() {
  return (cached ??= schema.parse(process.env));
}
