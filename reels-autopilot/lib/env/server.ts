import { z } from "zod";

// Vercel and .env files can hold a set-but-empty value; treat it as unset.
const optional = <T extends z.ZodType>(type: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), type.optional());

const schema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  IG_USER_ID: z.string().min(1),
  // Bootstrap only: once the ig_token table has a row, that row wins.
  IG_ACCESS_TOKEN: optional(z.string().min(1)),
  CRON_SECRET: z.string().min(16),
  // Slack or Discord incoming webhook. Without it, alerts are only stored in the alerts table.
  // A plain string on purpose: a typo here must not take down the publisher. alerts.ts validates it.
  ALERT_WEBHOOK_URL: optional(z.string()),
});

// Parsed on first use, not at import, so `next build` works without secrets.
let cached: z.infer<typeof schema> | undefined;
export function serverEnv() {
  return (cached ??= schema.parse(process.env));
}
