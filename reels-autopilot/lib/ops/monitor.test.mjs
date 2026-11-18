import { test } from "node:test";
import assert from "node:assert/strict";
import { runMonitor } from "./monitor.ts";

const NOW = new Date("2026-12-01T19:00:00Z");
const ago = (ms) => new Date(NOW.getTime() - ms);
const later = (ms) => new Date(NOW.getTime() + ms);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// A healthy pipeline by default; each test overrides one dependency.
function fakeDeps(overrides = {}) {
  const alerts = [];
  const resolved = [];
  const deps = {
    now: () => NOW,
    lastRun: async () => ({ status: "published", detail: {}, createdAt: ago(2 * HOUR) }),
    listNeedsReview: async () => [],
    listRecentMedia: async () => [],
    findRecordedMediaIds: async () => new Set(),
    resolveAsPublished: async (rowId, mediaId) => {
      resolved.push([rowId, mediaId]);
      return true;
    },
    listFailedSince: async () => [],
    countApprovedDueBy: async () => 3,
    tokenState: async () => ({ refreshedAt: ago(1 * DAY), expiresAt: later(59 * DAY) }),
    refreshToken: async () => ({ expiresAt: later(60 * DAY) }),
    alert: async (a) => alerts.push(a),
    ...overrides,
  };
  return { deps, alerts, resolved };
}

const keys = (alerts) => alerts.map((a) => a.key);

test("healthy pipeline raises nothing", async () => {
  const { deps, alerts } = fakeDeps();
  const report = await runMonitor(deps);
  assert.deepEqual(alerts, []);
  assert.ok(Object.values(report.checks).every((c) => c === "ok"));
  assert.equal(report.tokenRefreshed, false);
});

test("missing or stale publish run is high severity", async () => {
  for (const run of [null, { status: "published", detail: {}, createdAt: ago(27 * HOUR) }]) {
    const { deps, alerts } = fakeDeps({ lastRun: async () => run });
    await runMonitor(deps);
    assert.deepEqual(keys(alerts), ["publish-missing"]);
    assert.equal(alerts[0].severity, "high");
  }
});

test("failed publish run reports its error", async () => {
  const { deps, alerts } = fakeDeps({
    lastRun: async () => ({ status: "failed", detail: { error: "HTTP 400 token expired" }, createdAt: ago(HOUR) }),
  });
  await runMonitor(deps);
  assert.deepEqual(keys(alerts), ["publish-failed"]);
  assert.match(alerts[0].message, /token expired/);
});

test("needs_review row with exactly one reel in its window is resolved", async () => {
  const claimedAt = ago(2 * HOUR);
  const { deps, alerts, resolved } = fakeDeps({
    listNeedsReview: async () => [{ id: "r1", claimedAt }],
    listRecentMedia: async () => [
      { id: "m-new", timestamp: new Date(claimedAt.getTime() + 3 * MIN) },
      { id: "m-old", timestamp: ago(3 * DAY) },
    ],
  });
  const report = await runMonitor(deps);
  assert.deepEqual(resolved, [["r1", "m-new"]]);
  assert.deepEqual(report.resolved, [{ rowId: "r1", mediaId: "m-new" }]);
  assert.deepEqual(keys(alerts), ["resolved-r1"]);
  assert.equal(alerts[0].severity, "info");
});

test("no match or several matches alert and never resolve", async () => {
  const claimedAt = ago(2 * HOUR);
  const inWindow = (id, m) => ({ id, timestamp: new Date(claimedAt.getTime() + m * MIN) });
  for (const media of [[], [inWindow("a", 2), inWindow("b", 5)], [inWindow("late", 45)]]) {
    const { deps, alerts, resolved } = fakeDeps({
      listNeedsReview: async () => [{ id: "r1", claimedAt }],
      listRecentMedia: async () => media,
    });
    await runMonitor(deps);
    assert.deepEqual(resolved, []);
    assert.deepEqual(keys(alerts), ["needs-review-r1"]);
  }
});

test("media already recorded on another row is not a candidate", async () => {
  const claimedAt = ago(2 * HOUR);
  const { deps, resolved, alerts } = fakeDeps({
    listNeedsReview: async () => [{ id: "r1", claimedAt }],
    listRecentMedia: async () => [{ id: "m1", timestamp: new Date(claimedAt.getTime() + MIN) }],
    findRecordedMediaIds: async () => new Set(["m1"]),
  });
  await runMonitor(deps);
  assert.deepEqual(resolved, []);
  assert.deepEqual(keys(alerts), ["needs-review-r1"]);
});

test("two rows cannot claim the same reel", async () => {
  const claimedAt = ago(2 * HOUR);
  const { deps, resolved } = fakeDeps({
    listNeedsReview: async () => [
      { id: "r1", claimedAt },
      { id: "r2", claimedAt: new Date(claimedAt.getTime() + MIN) },
    ],
    listRecentMedia: async () => [{ id: "m1", timestamp: new Date(claimedAt.getTime() + 2 * MIN) }],
  });
  await runMonitor(deps);
  assert.deepEqual(resolved, [["r1", "m1"]]);
});

test("needs_review row without a claim time is left to a human", async () => {
  const { deps, alerts, resolved } = fakeDeps({
    listNeedsReview: async () => [{ id: "r1", claimedAt: null }],
    listRecentMedia: async () => [{ id: "m1", timestamp: ago(HOUR) }],
  });
  await runMonitor(deps);
  assert.deepEqual(resolved, []);
  assert.deepEqual(keys(alerts), ["needs-review-r1"]);
});

test("one recent failure is medium, two in 48h is high", async () => {
  const one = fakeDeps({ listFailedSince: async () => [{ id: "r1", error: "container ERROR", updatedAt: ago(3 * HOUR) }] });
  await runMonitor(one.deps);
  assert.deepEqual(keys(one.alerts), ["failed-r1"]);
  assert.equal(one.alerts[0].severity, "medium");

  const two = fakeDeps({
    listFailedSince: async () => [
      { id: "r1", error: "HTTP 400", updatedAt: ago(3 * HOUR) },
      { id: "r2", error: "HTTP 400", updatedAt: ago(27 * HOUR) },
    ],
  });
  await runMonitor(two.deps);
  assert.deepEqual(keys(two.alerts), ["repeated-failures"]);
  assert.equal(two.alerts[0].severity, "high");
});

test("a failure older than a day is not re-alerted", async () => {
  const { deps, alerts } = fakeDeps({ listFailedSince: async () => [{ id: "r1", error: "x", updatedAt: ago(30 * HOUR) }] });
  await runMonitor(deps);
  assert.deepEqual(alerts, []);
});

test("low approved buffer alerts", async () => {
  const { deps, alerts } = fakeDeps({ countApprovedDueBy: async () => 1 });
  await runMonitor(deps);
  assert.deepEqual(keys(alerts), ["low-buffer"]);
});

test("token is refreshed when never refreshed or a week old", async () => {
  for (const refreshedAt of [null, ago(7 * DAY)]) {
    let calls = 0;
    const { deps, alerts } = fakeDeps({
      tokenState: async () => ({ refreshedAt, expiresAt: null }),
      refreshToken: async () => {
        calls++;
        return { expiresAt: later(60 * DAY) };
      },
    });
    const report = await runMonitor(deps);
    assert.equal(calls, 1);
    assert.equal(report.tokenRefreshed, true);
    assert.deepEqual(alerts, []);
  }
});

test("failed refresh and near expiry both alert", async () => {
  const { deps, alerts } = fakeDeps({
    tokenState: async () => ({ refreshedAt: ago(8 * DAY), expiresAt: later(5 * DAY) }),
    refreshToken: async () => {
      throw new Error("HTTP 400 token too new");
    },
  });
  await runMonitor(deps);
  assert.deepEqual(keys(alerts), ["token-refresh-failed", "token-expiring"]);
});

test("a check that throws is isolated and reported", async () => {
  const { deps, alerts } = fakeDeps({
    listNeedsReview: async () => {
      throw new Error("db down");
    },
    countApprovedDueBy: async () => 0,
  });
  const report = await runMonitor(deps);
  assert.equal(report.checks["needs-review"], "error");
  assert.equal(report.checks.buffer, "alerted");
  assert.deepEqual(keys(alerts), ["monitor-needs-review", "low-buffer"]);
});

test("a non-Error rejection (Supabase error object) keeps its message", async () => {
  const { deps, alerts } = fakeDeps({
    countApprovedDueBy: async () => {
      throw { message: "relation alerts does not exist", code: "42P01" };
    },
  });
  await runMonitor(deps);
  assert.match(alerts[0].message, /relation alerts does not exist/);
});
