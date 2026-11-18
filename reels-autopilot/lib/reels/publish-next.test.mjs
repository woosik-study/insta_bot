import { test } from "node:test";
import assert from "node:assert/strict";
import { publishNext } from "./publish-next.ts";

const ROW = { id: "r1", video_url: "https://x/v.mp4", caption: "hi" };

function fakeDeps(statuses, overrides = {}) {
  const log = [];
  return {
    log,
    deps: {
      reapStale: async () => 0,
      claimNext: async () => ROW,
      markPublished: async (id, mediaId) => log.push(["published", id, mediaId]),
      markFailed: async (id, err) => log.push(["failed", id, err]),
      markNeedsReview: async (id, err) => log.push(["needs_review", id, err]),
      createContainer: async () => "c1",
      getStatus: async () => statuses.shift(),
      publish: async () => "m1",
      sleep: async () => {},
      ...overrides,
    },
  };
}

test("publishes once the container finishes", async () => {
  const { deps, log } = fakeDeps(["IN_PROGRESS", "FINISHED"]);
  assert.deepEqual(await publishNext(deps), { status: "published", id: "r1", mediaId: "m1", reaped: 0 });
  assert.deepEqual(log, [["published", "r1", "m1"]]);
});

test("idle when nothing is approved, still reaps stale rows", async () => {
  const { deps } = fakeDeps([], { claimNext: async () => null, reapStale: async () => 2 });
  assert.deepEqual(await publishNext(deps), { status: "idle", reaped: 2 });
});

test("marks failed on ERROR, EXPIRED and polling timeout", async () => {
  for (const statuses of [["ERROR"], ["EXPIRED"], Array(8).fill("IN_PROGRESS")]) {
    const { deps, log } = fakeDeps(statuses);
    await assert.rejects(publishNext(deps), /after polling/);
    assert.equal(log[0][0], "failed");
  }
});

test("publish error goes to needs_review, never failed", async () => {
  const { deps, log } = fakeDeps(["FINISHED"], {
    publish: async () => {
      throw new Error("timeout");
    },
  });
  await assert.rejects(publishNext(deps), /timeout/);
  assert.deepEqual(log.map((l) => l[0]), ["needs_review"]);
});

test("live reel is never marked failed when recording it fails", async () => {
  let attempts = 0;
  const { deps, log } = fakeDeps(["FINISHED"], {
    markPublished: async () => {
      attempts++;
      throw new Error("db down");
    },
  });
  await assert.rejects(publishNext(deps), /published as m1 but not recorded/);
  assert.equal(attempts, 3);
  assert.deepEqual(log, []);
});

test("recording succeeds on retry", async () => {
  let attempts = 0;
  const { deps } = fakeDeps(["FINISHED"], {
    markPublished: async () => {
      if (++attempts < 2) throw new Error("blip");
    },
  });
  assert.equal((await publishNext(deps)).status, "published");
});

test("a failing markFailed does not hide the original error", async () => {
  const { deps } = fakeDeps(["ERROR"], {
    markFailed: async () => {
      throw new Error("db down");
    },
  });
  await assert.rejects(publishNext(deps), /container ERROR/);
});
