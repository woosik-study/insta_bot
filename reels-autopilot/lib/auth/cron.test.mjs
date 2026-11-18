import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuthorizedCron } from "./cron.ts";

const SECRET = "0123456789abcdef";

test("accepts only the exact bearer secret", () => {
  assert.equal(isAuthorizedCron(`Bearer ${SECRET}`, SECRET), true);
  assert.equal(isAuthorizedCron(`Bearer ${SECRET}x`, SECRET), false);
  assert.equal(isAuthorizedCron(`Bearer ${SECRET.slice(0, -1)}X`, SECRET), false);
  assert.equal(isAuthorizedCron(SECRET, SECRET), false);
  assert.equal(isAuthorizedCron(null, SECRET), false);
});
