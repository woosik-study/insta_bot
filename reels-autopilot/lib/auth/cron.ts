import { timingSafeEqual } from "node:crypto";

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Constant-time compare.
// Callers must read the header before calling serverEnv(): touching request.headers
// is what stops Next from prerendering the GET handler at build time, where the
// secrets are absent.
export function isAuthorizedCron(authorization: string | null, secret: string): boolean {
  const got = Buffer.from(authorization ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
