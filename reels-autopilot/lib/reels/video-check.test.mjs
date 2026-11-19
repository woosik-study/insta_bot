import { test } from "node:test";
import assert from "node:assert/strict";
import { checkVideo, checkVideoUrl, probeVideo } from "./video-check.ts";
import { CAPTION, VIDEO } from "./brand-rules.ts";

test("brand limits stay inside the platform limits", () => {
  assert.ok(VIDEO.hardMinS >= VIDEO.platformMinS && VIDEO.hardMaxS <= VIDEO.platformMaxS);
  assert.ok(VIDEO.targetMinS >= VIDEO.hardMinS && VIDEO.targetMaxS <= VIDEO.hardMaxS);
  assert.ok(CAPTION.maxChars <= CAPTION.platformMaxChars);
});

test("probeVideo refuses a bad URL before running ffprobe", async () => {
  await assert.rejects(probeVideo("file:///etc/passwd"), /must be https/);
  await assert.rejects(probeVideo("https://127.0.0.1/v.mp4"), /not public/);
});

const URL_OK = "https://cdn.example.com/reels/2026-11-18.mp4";

// Synthetic ffprobe output for a good 1080x1920 H.264/AAC reel.
function probe({ video = {}, audio = {}, format = {}, noAudio = false } = {}) {
  const streams = [
    { codec_type: "video", codec_name: "h264", width: 1080, height: 1920, avg_frame_rate: "30000/1001", r_frame_rate: "30000/1001", ...video },
  ];
  if (!noAudio) streams.push({ codec_type: "audio", codec_name: "aac", ...audio });
  return {
    streams,
    format: { format_name: "mov,mp4,m4a,3gp,3g2,mj2", duration: "42.5", size: "52428800", ...format },
  };
}

test("a good reel passes", () => {
  assert.deepEqual(checkVideo(URL_OK, probe()), { ok: true, errors: [], warnings: [] });
});

test("HEVC passes, other video codecs fail", () => {
  assert.equal(checkVideo(URL_OK, probe({ video: { codec_name: "hevc" } })).ok, true);
  assert.match(checkVideo(URL_OK, probe({ video: { codec_name: "vp9" } })).errors[0], /H\.264 or HEVC, got vp9/);
});

test("audio must be AAC; no audio track is allowed", () => {
  assert.match(checkVideo(URL_OK, probe({ audio: { codec_name: "opus" } })).errors[0], /AAC, got opus/);
  assert.equal(checkVideo(URL_OK, probe({ noAudio: true })).ok, true);
});

test("container must be MOV or MP4", () => {
  assert.match(checkVideo(URL_OK, probe({ format: { format_name: "matroska,webm" } })).errors[0], /MOV or MP4/);
});

test("frame rate 23 to 60 fps, falling back to r_frame_rate", () => {
  for (const ok of ["23/1", "24000/1001", "60/1"]) {
    assert.equal(checkVideo(URL_OK, probe({ video: { avg_frame_rate: ok } })).ok, true, ok);
  }
  for (const bad of ["22/1", "120/1"]) {
    assert.match(checkVideo(URL_OK, probe({ video: { avg_frame_rate: bad } })).errors[0], /frame rate/, bad);
  }
  assert.equal(checkVideo(URL_OK, probe({ video: { avg_frame_rate: "0/0", r_frame_rate: "25/1" } })).ok, true);
});

test("duration hard range 7 to 60 s blocks approval", () => {
  for (const ok of ["7", "60"]) assert.equal(checkVideo(URL_OK, probe({ format: { duration: ok } })).ok, true, ok);
  // 3 s and 15 min pass the Graph API but not the brand.
  for (const bad of ["6.9", "60.1", "3", "900", "N/A"]) {
    assert.match(checkVideo(URL_OK, probe({ format: { duration: bad } })).errors[0], /duration/, bad);
  }
});

test("outside the 20 to 45 s target only warns", () => {
  for (const d of ["20", "45"]) assert.deepEqual(checkVideo(URL_OK, probe({ format: { duration: d } })).warnings, [], d);
  for (const d of ["19.9", "45.1"]) {
    const r = checkVideo(URL_OK, probe({ format: { duration: d } }));
    assert.equal(r.ok, true, d);
    assert.match(r.warnings[0], /20 to 45 s target/, d);
  }
});

test("300 MB max", () => {
  assert.equal(checkVideo(URL_OK, probe({ format: { size: "300000000" } })).ok, true);
  assert.match(checkVideo(URL_OK, probe({ format: { size: "300000001" } })).errors[0], /max 300000000/);
});

test("must be 9:16, honouring rotation metadata", () => {
  assert.match(checkVideo(URL_OK, probe({ video: { width: 1920, height: 1080 } })).errors[0], /not 9:16/);
  assert.equal(checkVideo(URL_OK, probe({ video: { width: 720, height: 1280 } })).ok, true);
  const rotated = { width: 1920, height: 1080, side_data_list: [{ rotation: -90 }] };
  assert.equal(checkVideo(URL_OK, probe({ video: rotated })).ok, true);
  const oldTag = { width: 1920, height: 1080, tags: { rotate: "90" } };
  assert.equal(checkVideo(URL_OK, probe({ video: oldTag })).ok, true);
  assert.match(checkVideo(URL_OK, probe({ video: { width: 1080, height: 1900 } })).errors[0], /not 9:16/);
});

test("embedded cover art is skipped; the real video stream is checked", () => {
  const p = probe({ video: { codec_name: "vp9" } });
  p.streams.unshift({ codec_type: "video", codec_name: "mjpeg", width: 600, height: 600, disposition: { attached_pic: 1 } });
  assert.match(checkVideo(URL_OK, p).errors[0], /got vp9/);
});

test("video_url must be public https without login", () => {
  assert.deepEqual(checkVideoUrl(URL_OK), []);
  for (const bad of [
    "http://cdn.example.com/v.mp4",
    "https://localhost/v.mp4",
    "https://192.168.0.10/v.mp4",
    "https://10.0.0.5/v.mp4",
    "https://[::1]/v.mp4",
    "https://localhost./v.mp4",
    "https://media.corp.internal/v.mp4",
    "file:///etc/passwd",
    "https://100.64.0.1/v.mp4",
    "https://cdn.example.com#@127.0.0.1/v.mp4",
    "https://cdn.example.com\\@127.0.0.1/v.mp4",
    "https://user:pw@cdn.example.com/v.mp4",
    "not a url",
  ]) {
    assert.equal(checkVideoUrl(bad).length, 1, bad);
  }
});

test("missing streams and format are reported, not thrown", () => {
  const r = checkVideo(URL_OK, {});
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /no video stream/.test(e)));
});
