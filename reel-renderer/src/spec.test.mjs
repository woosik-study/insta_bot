import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSpec, checkSpec, headlineLineWidth } from "./spec.ts";

const photos = (n) => Array.from({ length: n }, (_, i) => ({ src: `p${i}.jpg`, landscape: false }));
const track = (bpm, extra = {}) => ({ id: "t", file: "t.wav", bpm, firstBeatSec: 0, license: "test", ...extra });
const opts = { headline: "I quit coffee for a week", accent: "quit", tag: "day 001 / seoul" };

test("every photo count at every tempo from 60 to 200 bpm yields a spec that passes its own rules", () => {
  for (let bpm = 60; bpm <= 200; bpm += 0.5) {
    for (let n = 8; n <= 16; n++) {
      const spec = buildSpec(photos(n), track(bpm), opts);
      assert.deepEqual(checkSpec(spec), [], `bpm ${bpm}, ${n} photos`);
    }
  }
});

test("a marked drop either builds a spec that passes or is rejected with a reason", () => {
  let built = 0;
  for (const bpm of [70, 85, 90, 100, 117, 120, 128, 150, 174]) {
    for (const n of [8, 11, 16]) {
      for (let dropSec = 4; dropSec <= 22; dropSec += 0.25) {
        for (const firstBeatSec of [0, 0.4]) {
          const label = `bpm ${bpm}, ${n} photos, drop ${dropSec}, first beat ${firstBeatSec}`;
          try {
            const spec = buildSpec(photos(n), track(bpm, { dropSec, firstBeatSec }), opts);
            assert.deepEqual(checkSpec(spec), [], label);
            built++;
          } catch (e) {
            assert.match(e.message, /does not fit|at or after 8 s|cannot (fit|build)/, label);
          }
        }
      }
    }
  }
  assert.ok(built > 100);
});

test("a headline of wide letters wraps by pixel width, not only by character count", () => {
  const spec = buildSpec(photos(8), track(120), { ...opts, headline: "summer moment", accent: "summer" });
  assert.deepEqual(spec.headlineLines.map((l) => l.map((w) => w.text).join(" ")), ["SUMMER", "MOMENT"]);
  for (const line of spec.headlineLines) assert.ok(headlineLineWidth(line.map((w) => w.text)) <= 840);
  assert.equal(headlineLineWidth(["SUMMER", "MOMENT"]), 913);
  assert.throws(() => buildSpec(photos(8), track(120), { ...opts, headline: "mmmmmmmmmmmmm wow", accent: "wow" }), /too wide/);
});

test("structure: three hook photos first, every photo shown, last photo closes", () => {
  const spec = buildSpec(photos(10), track(120), opts);
  assert.deepEqual(spec.segments.slice(0, 3).map((s) => [s.photo, s.part]), [[0, "hook"], [1, "hook"], [2, "hook"]]);
  assert.equal(new Set(spec.segments.map((s) => s.photo)).size, 10);
  const last = spec.segments.at(-1);
  assert.deepEqual([last.photo, last.part], [9, "close"]);
  assert.equal(spec.segments.find((s) => s.part === "drop").from, spec.dropFrame);
});

test("the recap never repeats the photo right before it or the closing photo", () => {
  const spec = buildSpec(photos(8), track(120), opts);
  const recap = spec.segments.filter((s) => s.part === "drop" || s.part === "ride");
  const before = spec.segments[spec.segments.indexOf(recap[0]) - 1];
  assert.notEqual(recap[0].photo, before.photo);
  assert.ok(recap.every((s) => s.photo !== 7));
  recap.slice(1).forEach((s, i) => assert.notEqual(s.photo, recap[i].photo));
});

test("the fast burst after the drop is at most 8 beats at every tempo and photo count", () => {
  for (let bpm = 60; bpm <= 200; bpm++) {
    for (let n = 8; n <= 16; n++) {
      const spec = buildSpec(photos(n), track(bpm), opts);
      const burstFrames = spec.segments.filter((s) => s.part === "drop").reduce((a, s) => a + s.frames, 0);
      assert.ok(burstFrames <= Math.round(8 * (60 / bpm) * 30) + 1, `bpm ${bpm}, ${n} photos`);
      assert.ok(burstFrames > 0);
    }
  }
});

test("a track with a marked drop puts the drop on that beat", () => {
  const spec = buildSpec(photos(10), track(120, { dropSec: 10 }), opts);
  assert.equal(spec.dropFrame, 300);
  assert.deepEqual(checkSpec(spec), []);
});

test("a marked drop that cannot fit the photos is rejected", () => {
  assert.throws(() => buildSpec(photos(16), track(120, { dropSec: 4 }), opts), /at or after 8 s/);
  assert.throws(() => buildSpec(photos(16), track(80, { dropSec: 8 }), opts), /does not fit/);
  assert.throws(() => buildSpec(photos(8), track(120, { dropSec: 25 }), opts), /does not fit/);
});

test("firstBeatSec trims the audio so beat 0 is frame 0", () => {
  const spec = buildSpec(photos(8), track(120, { firstBeatSec: 0.5 }), opts);
  assert.equal(spec.audio.trimBeforeFrames, 15);
  assert.equal(spec.segments[0].from, 0);
});

test("headline wraps at 13 characters, is uppercase, and has one accent word", () => {
  const spec = buildSpec(photos(8), track(120), opts);
  assert.deepEqual(spec.headlineLines.map((l) => l.map((w) => w.text).join(" ")), ["I QUIT COFFEE", "FOR A WEEK"]);
  assert.deepEqual(spec.headlineLines.flat().filter((w) => w.accent).map((w) => w.text), ["QUIT"]);
  assert.ok(spec.headlineFrames >= 45);
});

test("bad input is rejected", () => {
  assert.throws(() => buildSpec(photos(7), track(120), opts), /8 to 16/);
  assert.throws(() => buildSpec(photos(17), track(120), opts), /8 to 16/);
  assert.throws(() => buildSpec(photos(8), track(120), { ...opts, headline: "Hello" }), /2 to 6 words/);
  assert.throws(() => buildSpec(photos(8), track(120), { ...opts, accent: "tea" }), /exactly one/);
  assert.throws(() => buildSpec(photos(8), track(120), { ...opts, headline: "the day the rain", accent: "the" }), /exactly one/);
  assert.throws(() => buildSpec(photos(8), track(0), opts), /bpm/);
});

test("checkSpec catches a broken spec", () => {
  const spec = buildSpec(photos(8), track(120), opts);
  const offBeat = structuredClone(spec);
  offBeat.segments[1].from += 4;
  assert.ok(checkSpec(offBeat).some((e) => e.includes("off the beat")));
  const tooLong = structuredClone(spec);
  tooLong.durationInFrames = 46 * 30;
  assert.ok(checkSpec(tooLong).some((e) => e.includes("outside 20 to 45")));
});

test("more photos give a longer reel, about 2.5 s per photo, never past 45 s", () => {
  const seconds = (n, bpm) => {
    const spec = buildSpec(photos(n), track(bpm), opts);
    return spec.durationInFrames / spec.fps;
  };
  assert.equal(seconds(8, 120), 24);
  assert.equal(seconds(12, 120), 29.5);
  assert.equal(seconds(16, 120), 39.5);
  for (let bpm = 60; bpm <= 200; bpm++) {
    for (let n = 8; n <= 16; n++) {
      const sec = seconds(n, bpm);
      assert.ok(sec >= 20 && sec <= 45, `bpm ${bpm}, ${n} photos: ${sec}`);
      // The ride moves in steps of about 1 s, so the length lands within 1 s of the target.
      assert.ok(Math.abs(sec - Math.max(24, n * 2.5)) <= 1, `bpm ${bpm}, ${n} photos: ${sec}`);
    }
  }
});

const timed = (n, times) => photos(n).map((p, i) => ({ ...p, time: times[i] }));

test("a time on every photo becomes a 12-hour clock label on that photo", () => {
  const times = ["00:05", "06:00", "09:30", "11:59", "12:00", "13:07", "18:45", "23:59"];
  const spec = buildSpec(timed(8, times), track(120), opts);
  assert.deepEqual(
    spec.photos.map((p) => p.timeLabel),
    ["12:05 AM", "6:00 AM", "9:30 AM", "11:59 AM", "12:00 PM", "1:07 PM", "6:45 PM", "11:59 PM"],
  );
  assert.deepEqual(checkSpec(spec), []);
});

test("photos with no time give a reel with no time labels, even if a stale label is passed in", () => {
  const stale = photos(8).map((p) => ({ ...p, timeLabel: "6:00 AM" }));
  const spec = buildSpec(stale, track(120), opts);
  assert.ok(spec.photos.every((p) => !("timeLabel" in p)));
});

test("a time that is not 24-hour HH:MM is rejected", () => {
  // Typo, out of range, glued token, 12-hour input and non-Latin digits.
  for (const bad of ["6:00", "24:00", "12:60", "0600", "06:00am", "6:00 AM", "06:00:00", " 06:00", "٠٦:٠٠", ""]) {
    const times = Array(8).fill("06:00");
    times[3] = bad;
    assert.throws(() => buildSpec(timed(8, times), track(120), opts), /photo 4 .*24-hour HH:MM/, `"${bad}"`);
  }
  // A non-string must not slip through by being turned into text.
  for (const bad of [["06:00"], 600, null]) {
    const times = Array(8).fill("06:00");
    times[3] = bad;
    assert.throws(() => buildSpec(timed(8, times), track(120), opts), /photo 4 .*24-hour HH:MM/);
  }
});

test("times on only some photos are rejected, naming the photos without one", () => {
  const times = Array(8).fill("06:00");
  times[1] = undefined;
  times[6] = undefined;
  assert.throws(() => buildSpec(timed(8, times), track(120), opts), /photos 2, 7 have no time/);
});

test("checkSpec catches a missing or malformed time label", () => {
  const spec = buildSpec(timed(8, Array(8).fill("06:00")), track(120), opts);
  const missing = structuredClone(spec);
  delete missing.photos[2].timeLabel;
  assert.ok(checkSpec(missing).some((e) => e.includes("photo 3 has no time label")));
  const malformed = structuredClone(spec);
  for (const bad of ["06:00", "0:30 AM", "13:00 PM", "6:00 am", "6:00AM"]) {
    malformed.photos[0].timeLabel = bad;
    assert.ok(checkSpec(malformed).some((e) => e.includes(`time label "${bad}"`)), bad);
  }
  // A hand-edited spec: times with no labels, or a label that is not the photo's time.
  const unlabelled = structuredClone(spec);
  unlabelled.photos.forEach((p) => delete p.timeLabel);
  assert.ok(checkSpec(unlabelled).some((e) => e.includes("photo 1 has no time label")));
  const wrong = structuredClone(spec);
  wrong.photos[4].timeLabel = "7:00 PM";
  assert.ok(checkSpec(wrong).some((e) => e.includes('photo 5 time label "7:00 PM" does not match its time "06:00"')));
});

test("problems name photos counting from 1, like the file names", () => {
  const spec = buildSpec(photos(8), track(120), opts);
  spec.segments[0].frames = 4;
  assert.ok(checkSpec(spec).some((e) => e.startsWith("photo 1 held")));
});

test("with no marked drop, a large set spends about 1 s per photo before the drop", () => {
  for (let bpm = 60; bpm <= 200; bpm++) {
    const spec = buildSpec(photos(16), track(bpm), opts);
    const build = spec.segments.filter((s) => s.part === "build");
    const shortest = Math.min(...build.map((s) => s.frames)) / spec.fps;
    // The calm step is a whole number of beats between 0.75 s and 1.5 s (one frame of rounding).
    assert.ok(shortest >= 0.75 - 1 / 30, `bpm ${bpm}: shortest build photo ${shortest}s`);
    // At 2.5 s per photo each photo is seen two to three times, so replays are most of the reel
    // by design; this guards against the build collapsing and replays taking nearly all of it.
    const replay = spec.segments.filter((s) => s.part === "drop" || s.part === "ride").reduce((a, s) => a + s.frames, 0);
    assert.ok(replay / spec.durationInFrames <= 0.7, `bpm ${bpm}: replay share ${replay / spec.durationInFrames}`);
  }
});
