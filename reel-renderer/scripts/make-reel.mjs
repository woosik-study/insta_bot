// Photos in, MP4 out.
//   node scripts/make-reel.mjs --photos <dir> --headline "I quit coffee for a week" --accent quit \
//     [--tag "DAY 001 / SEOUL"] [--times times.json] [--track test-120] [--out out/reel.mp4] [--spec-only]
// --times: JSON object of photo file name to 24-hour time, e.g. { "01.jpg": "06:00" }. It needs an
// entry for every photo; each photo then shows its clock time ("6:00 AM").
// Photos play in file-name order, so name them 01.jpg, 02.jpg, ... with the strongest first.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { imageSizeFromFile } from "image-size/fromFile";
import { buildSpec, checkSpec, clockLabel } from "../src/spec.ts";

const root = resolve(import.meta.dirname, "..");
const { values: args } = parseArgs({
  options: {
    photos: { type: "string" },
    headline: { type: "string" },
    accent: { type: "string" },
    tag: { type: "string", default: "" },
    times: { type: "string" },
    track: { type: "string", default: "test-120" },
    out: { type: "string", default: "out/reel.mp4" },
    "spec-only": { type: "boolean", default: false },
  },
});
const fail = (message) => {
  console.error(`make-reel: ${message}`);
  process.exit(1);
};
if (!args.photos || !args.headline || !args.accent) fail("--photos, --headline and --accent are required");

const track = JSON.parse(readFileSync(join(root, "tracks.json"), "utf8")).find((t) => t.id === args.track);
if (!track) fail(`unknown track "${args.track}" (see tracks.json)`);
if (!existsSync(join(root, "public", track.file))) fail(`missing public/${track.file}`);

const dir = resolve(args.photos);
const files = readdirSync(dir)
  .filter((f) => [".jpg", ".jpeg", ".png", ".webp"].includes(extname(f).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

let times;
if (args.times !== undefined) {
  if (!args.times) fail("--times needs a file path");
  try {
    times = JSON.parse(readFileSync(resolve(args.times), "utf8"));
  } catch (e) {
    fail(`cannot read --times ${args.times}: ${e.message}`);
  }
  if (times === null || typeof times !== "object" || Array.isArray(times)) fail("--times must be a JSON object of file name to HH:MM");
  const unknown = Object.keys(times).filter((name) => !files.includes(name));
  if (unknown.length) fail(`--times names files that are not in ${dir}: ${unknown.join(", ")}`);
  const untimed = files.filter((name) => typeof times[name] !== "string");
  if (untimed.length) fail(`--times has no time for: ${untimed.join(", ")}`);
  // Checked here, before the last job's photos are cleared, so a typo costs nothing.
  const bad = files.filter((name) => !clockLabel(times[name]));
  if (bad.length) fail(`--times needs 24-hour HH:MM, got: ${bad.map((name) => `${name} "${times[name]}"`).join(", ")}`);
}

// Remotion serves only from public/, so copy this job's photos there.
const job = join(root, "public", "job");
rmSync(job, { recursive: true, force: true });
mkdirSync(job, { recursive: true });
const photos = [];
for (const [i, file] of files.entries()) {
  const { width, height, orientation } = await imageSizeFromFile(join(dir, file));
  const rotated = orientation >= 5; // EXIF 5 to 8 swap width and height
  const name = `${String(i + 1).padStart(2, "0")}${extname(file).toLowerCase()}`;
  copyFileSync(join(dir, file), join(job, name));
  photos.push({ src: `job/${name}`, landscape: rotated ? height > width : width > height, ...(times ? { time: times[file] } : {}) });
}

let spec;
try {
  spec = buildSpec(photos, track, { headline: args.headline, accent: args.accent, tag: args.tag });
} catch (e) {
  fail(e.message);
}
const problems = checkSpec(spec);
if (problems.length) fail(`spec failed its checks:\n- ${problems.join("\n- ")}`);

// The track must cover the whole reel, or the tail plays silent.
const probe = spawnSync(
  "npx",
  ["remotion", "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(root, "public", track.file)],
  { cwd: root, encoding: "utf8" },
);
const trackSec = Number.parseFloat(probe.stdout);
const needSec = track.firstBeatSec + spec.durationInFrames / spec.fps;
if (!(trackSec >= needSec)) fail(`track ${track.id} is ${probe.stdout.trim() || "unreadable"} s long, need ${needSec.toFixed(2)} s`);

mkdirSync(join(root, "out"), { recursive: true });
const propsPath = join(root, "out", "spec.json");
writeFileSync(propsPath, JSON.stringify(spec, null, 2));
console.log(
  `${photos.length} photos, ${spec.segments.length} cuts, ${(spec.durationInFrames / spec.fps).toFixed(2)} s, ` +
    `drop at ${(spec.dropFrame / spec.fps).toFixed(2)} s, track ${track.id} (${track.license})`,
);
if (args["spec-only"]) process.exit(0);

const render = spawnSync(
  "npx",
  ["remotion", "render", "src/index.tsx", "PhotoReel", resolve(root, args.out), `--props=${propsPath}`, "--codec=h264"],
  { cwd: root, stdio: "inherit" },
);
process.exit(render.status ?? 1);
