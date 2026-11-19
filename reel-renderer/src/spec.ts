// Pure cut planner for photo reels. Rules: docs/photo-reel-concept.md section 3.
// No I/O here so it runs under `node --test` and inside the Remotion bundle.

export const FPS = 30;
const MIN_PHOTO_SEC = 0.4;
const MAX_PHOTO_SEC = 3;
const MIN_SEC = 20;
const MAX_SEC = 45;
// Aim for about 2.5 s per photo, never under 24 s: more photos earn a longer reel, and a short
// set is not padded out with extra replays.
const TARGET_FLOOR_SEC = 24;
const TARGET_SEC_PER_PHOTO = 2.5;
const MIN_DROP_SEC = 8;
const CLOSE_BEATS = 8; // 2 bars of 4/4
const HEADLINE_MIN_FRAMES = 45; // 1.5 s
const HEADLINE_LINE_CHARS = 13; // brand guide: 13 characters per line at 128 px

export type Track = {
  id: string;
  file: string;
  bpm: number;
  firstBeatSec: number;
  dropSec?: number;
  license: string;
};
// `time` is the input, 24-hour "HH:MM". `timeLabel` is what the reel shows ("6:00 AM"); buildSpec
// writes it. Either every photo has a time or none does.
export type Photo = { src: string; landscape: boolean; time?: string; timeLabel?: string };
export type Part = "hook" | "build" | "drop" | "ride" | "close";
export type Segment = { photo: number; from: number; frames: number; part: Part };
export type Word = { text: string; accent: boolean };

export type ReelSpec = {
  fps: number;
  durationInFrames: number;
  photos: Photo[];
  segments: Segment[];
  dropFrame: number;
  headlineLines: Word[][];
  headlineFrames: number;
  tag: string;
  audio: { file: string; trimBeforeFrames: number };
  bpm: number;
};

export type Options = { headline: string; accent: string; tag: string };

// Anton Regular advance widths in 1/1000 em, read from the Google Fonts TTF on 2026-11-18.
// Unknown glyphs count as the widest one (M), so the estimate errs wide.
const ANTON: Record<string, number> = {
  "0": 494, "1": 331, "2": 494, "3": 494, "4": 494, "5": 494, "6": 494, "7": 494, "8": 494, "9": 494,
  A: 485, B: 479, C: 474, D: 493, E: 412, F: 399, G: 485, H: 499, I: 227, J: 466, K: 472, L: 397, M: 746,
  N: 498, O: 486, P: 472, Q: 494, R: 477, S: 461, T: 396, U: 474, V: 469, W: 712, X: 484, Y: 446, Z: 410,
  "'": 214, "!": 229, "?": 492, ".": 229, ",": 236, "-": 311, "&": 520, ":": 242,
};
export const HEADLINE_PX = 128;
export const HEADLINE_MAX_WIDTH = 840; // text-safe box, x 80 to 920
// Backplate padding from PhotoReel.tsx: 20 px at the line ends, 14 px on each side between words.
export const HEADLINE_PAD = { end: 20, inner: 14 };

export function headlineLineWidth(words: string[]): number {
  const glyphs = words.join("").toUpperCase();
  const text = [...glyphs].reduce((sum, ch) => sum + (ANTON[ch] ?? ANTON.M), 0) * (HEADLINE_PX / 1000);
  return Math.ceil(text + 2 * HEADLINE_PAD.end + 2 * HEADLINE_PAD.inner * (words.length - 1));
}

function wrapHeadline(headline: string, accent: string): Word[][] {
  const words = headline.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 6) throw new Error("headline must be 2 to 6 words");
  const hits = words.filter((w) => w.toLowerCase() === accent.toLowerCase());
  if (hits.length !== 1) throw new Error("accent must match exactly one headline word");
  const fits = (line: string[]) =>
    line.join(" ").length <= HEADLINE_LINE_CHARS && headlineLineWidth(line) <= HEADLINE_MAX_WIDTH;
  const lines: string[][] = [];
  let line: string[] = [];
  for (const text of words) {
    if (!fits([text])) throw new Error(`headline word "${text}" is too wide for one line`);
    if (line.length && !fits([...line, text])) {
      lines.push(line);
      line = [];
    }
    line.push(text);
  }
  lines.push(line);
  return lines.map((l) => l.map((text) => ({ text: text.toUpperCase(), accent: text.toLowerCase() === accent.toLowerCase() })));
}

const TIME_INPUT = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
const TIME_LABEL = /^(1[0-2]|[1-9]):[0-5][0-9] (AM|PM)$/;

// "06:00" to "6:00 AM". Returns null for anything that is not a 24-hour HH:MM string.
export function clockLabel(time: unknown): string | null {
  const m = typeof time === "string" ? TIME_INPUT.exec(time) : null;
  if (!m) return null;
  const hour = Number(m[1]);
  return `${hour % 12 || 12}:${m[2]} ${hour < 12 ? "AM" : "PM"}`;
}

// Photo numbers in every message count from 1, like the file names (01.jpg).
function withTimeLabels(photos: Photo[]): Photo[] {
  const missing = photos.flatMap((p, i) => (p.time === undefined ? [i + 1] : []));
  if (missing.length === photos.length) return photos.map(({ timeLabel, ...p }) => p);
  if (missing.length) throw new Error(`photos ${missing.join(", ")} have no time; give every photo a time or none`);
  return photos.map((p, i) => {
    const timeLabel = clockLabel(p.time);
    if (!timeLabel) throw new Error(`photo ${i + 1} time ${JSON.stringify(p.time)} is not 24-hour HH:MM`);
    return { ...p, timeLabel };
  });
}

export function buildSpec(input: Photo[], track: Track, opts: Options): ReelSpec {
  const n = input.length;
  if (n < 8 || n > 16) throw new Error(`need 8 to 16 photos, got ${n}`);
  const photos = withTimeLabels(input);
  if (!(track.bpm > 0)) throw new Error("track bpm must be positive");

  const beatSec = 60 / track.bpm;
  const frameOf = (beat: number) => Math.round(beat * beatSec * FPS);
  const unit = Math.ceil(MIN_PHOTO_SEC / beatSec); // fewest beats one photo may hold
  const maxBeats = Math.floor(MAX_PHOTO_SEC / beatSec);
  if (maxBeats < unit) throw new Error(`bpm ${track.bpm} cannot fit a photo between 0.4 and 3 s`);

  // Photos 0..2 hook, 3..n-2 build, n-1 close. The drop recaps photos already shown.
  const hookBeats = 3 * unit;
  const buildCount = n - 4;
  // Beats the build must fill: up to the track's marked drop, or to the first beat at or after 8 s.
  const marked = track.dropSec !== undefined;
  // The calm pace: the whole number of beats nearest 1 s (2 beats at 120 bpm). With no marked
  // drop, each build photo gets that long, so a large set is not all spent before the drop.
  // Fall back to the shortest build when that would not leave room to finish.
  const firstDropBeat = Math.ceil(MIN_DROP_SEC / beatSec - 1e-9);
  const nearest = Math.max(1, Math.round(1 / beatSec));
  // Never calmer in name only: a step under 0.75 s takes one more beat.
  const calmStep = Math.min(maxBeats, Math.max(unit, nearest * beatSec < 0.75 ? nearest + 1 : nearest));
  const calmDrop = Math.max(hookBeats + buildCount * calmStep, firstDropBeat);
  const tightDrop = Math.max(hookBeats + buildCount * unit, firstDropBeat);
  const dropBeat = marked
    ? Math.round((track.dropSec! - track.firstBeatSec) / beatSec)
    : (calmDrop + 4 + CLOSE_BEATS) * beatSec <= MAX_SEC
      ? calmDrop
      : tightDrop;
  if (dropBeat * beatSec < MIN_DROP_SEC - 1e-9) throw new Error("the drop must be at or after 8 s into the reel");
  const fitError = marked
    ? `track drop at ${track.dropSec}s does not fit ${n} photos; add or remove photos`
    : `cannot place a drop with ${n} photos at ${track.bpm} bpm`;
  const buildBeats: number[] = Array(buildCount).fill(unit);
  let spare = dropBeat - hookBeats - buildCount * unit;
  if (spare < 0) throw new Error(fitError);
  // Hand out spare beats one at a time to the shortest photo, later photos first. A photo that
  // starts in the first 6 s may hold 2 s at most; later ones may hold up to 3 s.
  const earlyCap = Math.max(unit, Math.floor(2 / beatSec));
  while (spare > 0) {
    let pick = -1;
    let start = hookBeats + buildBeats.reduce((a, b) => a + b, 0);
    for (let i = buildCount - 1; i >= 0; i--) {
      start -= buildBeats[i];
      const cap = start * beatSec < 6 ? earlyCap : maxBeats;
      if (buildBeats[i] < cap && (pick < 0 || buildBeats[i] < buildBeats[pick])) pick = i;
    }
    if (pick < 0) throw new Error(fitError);
    buildBeats[pick]++;
    spare--;
  }

  // After the drop: a burst of fast cuts (8 beats, or 4 when 8 will not fit), then a slower
  // ride that fills the time to the close. Both recap photos already shown.
  const rideStep = calmStep;
  const targetSec = Math.min(MAX_SEC, Math.max(TARGET_FLOOR_SEC, n * TARGET_SEC_PER_PHOTO));
  let burstBeats = 0;
  let rideCount = -1;
  for (const burst of [8, 4]) {
    if (burst % unit) continue;
    for (let r = 0; (dropBeat + burst + r * rideStep + CLOSE_BEATS) * beatSec <= MAX_SEC; r++) {
      const sec = (dropBeat + burst + r * rideStep + CLOSE_BEATS) * beatSec;
      if (sec < MIN_SEC) continue;
      const best = (dropBeat + burstBeats + rideCount * rideStep + CLOSE_BEATS) * beatSec;
      if (rideCount < 0 || Math.abs(sec - targetSec) < Math.abs(best - targetSec)) {
        burstBeats = burst;
        rideCount = r;
      }
    }
    if (rideCount >= 0) break;
  }
  if (rideCount < 0) throw new Error(marked ? fitError : `cannot fit 20 to 45 s with ${n} photos at ${track.bpm} bpm`);

  const segments: Segment[] = [];
  let beat = 0;
  const push = (photo: number, beats: number, part: Part) => {
    const from = frameOf(beat);
    segments.push({ photo, from, frames: frameOf(beat + beats) - from, part });
    beat += beats;
  };
  for (let i = 0; i < 3; i++) push(i, unit, "hook");
  buildBeats.forEach((beats, i) => push(3 + i, beats, "build"));
  let recap = 0;
  for (let i = 0; i < burstBeats / unit; i++) push(recap++ % (n - 1), unit, "drop");
  for (let i = 0; i < rideCount; i++) push(recap++ % (n - 1), rideStep, "ride");
  push(n - 1, CLOSE_BEATS, "close");

  const spec: ReelSpec = {
    fps: FPS,
    durationInFrames: frameOf(beat),
    photos,
    segments,
    dropFrame: frameOf(dropBeat),
    headlineLines: wrapHeadline(opts.headline, opts.accent),
    headlineFrames: Math.max(HEADLINE_MIN_FRAMES, frameOf(hookBeats)),
    tag: opts.tag.toUpperCase(),
    audio: { file: track.file, trimBeforeFrames: Math.round(track.firstBeatSec * FPS) },
    bpm: track.bpm,
  };
  // Never hand back a spec that breaks its own rules.
  const problems = checkSpec(spec);
  if (problems.length) throw new Error(`cannot build a valid reel: ${problems.join("; ")}`);
  return spec;
}

// The timing rules a checker can test. Returns a list of problems, empty when the spec passes.
export function checkSpec(spec: ReelSpec): string[] {
  const errors: string[] = [];
  const sec = spec.durationInFrames / spec.fps;
  if (sec < MIN_SEC || sec > MAX_SEC) errors.push(`duration ${sec.toFixed(2)}s is outside 20 to 45 s`);

  const beatFrames = (60 / spec.bpm) * spec.fps;
  let expected = 0;
  for (const s of spec.segments) {
    if (s.from !== expected) errors.push(`gap or overlap at frame ${s.from}`);
    expected = s.from + s.frames;
    const beats = s.from / beatFrames;
    if (Math.abs(beats - Math.round(beats)) * beatFrames > 1) errors.push(`cut at frame ${s.from} is off the beat`);
    const held = s.frames / spec.fps;
    if (held < MIN_PHOTO_SEC - 1 / spec.fps) errors.push(`photo ${s.photo + 1} held ${held.toFixed(2)}s, under 0.4 s`);
    if (s.part !== "close" && held > MAX_PHOTO_SEC) errors.push(`photo ${s.photo + 1} held ${held.toFixed(2)}s, over 3 s`);
    if (s.from < 6 * spec.fps && s.frames > 2 * spec.fps) errors.push(`no cut for over 2 s at frame ${s.from}`);
    if (s.photo < 0 || s.photo >= spec.photos.length) errors.push(`segment points at missing photo ${s.photo + 1}`);
  }
  if (expected !== spec.durationInFrames) errors.push("segments do not cover the full duration");
  if (spec.dropFrame < MIN_DROP_SEC * spec.fps) errors.push("drop is before 8 s");
  if (spec.headlineFrames < HEADLINE_MIN_FRAMES) errors.push("headline is on screen under 1.5 s");
  for (const line of spec.headlineLines) {
    const width = headlineLineWidth(line.map((w) => w.text));
    if (width > HEADLINE_MAX_WIDTH) errors.push(`headline line "${line.map((w) => w.text).join(" ")}" is ${width} px wide, over ${HEADLINE_MAX_WIDTH}`);
  }
  const labelled = spec.photos.some((p) => p.timeLabel !== undefined || p.time !== undefined);
  spec.photos.forEach((p, i) => {
    if (p.timeLabel === undefined) {
      if (labelled) errors.push(`photo ${i + 1} has no time label`);
    } else if (!TIME_LABEL.test(p.timeLabel)) {
      errors.push(`photo ${i + 1} time label "${p.timeLabel}" is not H:MM AM or PM`);
    } else if (p.time !== undefined && clockLabel(p.time) !== p.timeLabel) {
      errors.push(`photo ${i + 1} time label "${p.timeLabel}" does not match its time ${JSON.stringify(p.time)}`);
    }
  });
  const accents = spec.headlineLines.flat().filter((w) => w.accent).length;
  if (accents !== 1) errors.push(`headline has ${accents} accent words, need exactly 1`);
  return errors;
}
