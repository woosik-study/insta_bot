import { test } from "node:test";
import assert from "node:assert/strict";
import { publishNext } from "./publish-next.ts";

function fakeDeps(statuses, row = { id: "r1", video_url: "https://x/v.mp4", caption: "hi" }) {
  const log = [];
  return {
    log,
    deps: {
      claimNext: async () => row,
      markPublished: async (id, mediaId) => log.push(["published", id, mediaId]),
      markFailed: async (id, err) => log.push(["failed", id, err]),
      createContainer: async () => "c1",
      getStatus: async () => statuses.shift(),
      publish: async () => "m1",
      sleep: async () => {},
    },
  };
}

test("publishes once the container finishes", async () => {
  const { deps, log } = fakeDeps(["IN_PROGRESS", "FINISHED"]);
  assert.deepEqual(await publishNext(deps), { status: "published", id: "r1", mediaId: "m1" });
  assert.deepEqual(log, [["published", "r1", "m1"]]);
});

test("idle when nothing is approved", async () => {
  const { deps } = fakeDeps([], null);
  assert.deepEqual(await publishNext(deps), { status: "idle" });
});

test("marks failed on ERROR and on polling timeout", async () => {
  const err = fakeDeps(["ERROR"]);
  await assert.rejects(publishNext(err.deps), /container ERROR/);
  assert.equal(err.log[0][0], "failed");

  const slow = fakeDeps(Array(8).fill("IN_PROGRESS"));
  await assert.rejects(publishNext(slow.deps), /still IN_PROGRESS/);
  assert.equal(slow.log[0][0], "failed");
});
