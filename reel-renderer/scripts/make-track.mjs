// Writes a synthetic 120 bpm test track so renders can be checked without any licensed music.
// It is a test tone, not music: do not publish a reel that uses it.
import { mkdirSync, writeFileSync } from "node:fs";

const RATE = 44100;
const BPM = 120;
const SECONDS = 48; // covers the longest reel (45 s)
const beat = 60 / BPM;
const samples = new Float32Array(RATE * SECONDS);

let seed = 1;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 31) - 1; // deterministic

function add(startSec, lengthSec, fn) {
  const start = Math.round(startSec * RATE);
  const length = Math.round(lengthSec * RATE);
  for (let i = 0; i < length && start + i < samples.length; i++) samples[start + i] += fn(i / RATE, i / length);
}

for (let b = 0; b * beat < SECONDS; b++) {
  const t = b * beat;
  // Kick on every beat: a sine that falls from 120 Hz to 45 Hz.
  add(t, 0.25, (s, p) => Math.sin(2 * Math.PI * (45 * s + (75 / 18) * (1 - Math.exp(-18 * s)))) * (1 - p) ** 2 * 0.9);
  // Snare on beats 2 and 4.
  if (b % 2 === 1) add(t, 0.15, (_, p) => noise() * (1 - p) ** 3 * 0.45);
  // Off-beat hats from 8 s on, so the second half sounds fuller.
  if (t >= 8) add(t + beat / 2, 0.05, (_, p) => noise() * (1 - p) ** 2 * 0.2);
  // One bass note per bar.
  if (b % 4 === 0) add(t, beat * 4, (s, p) => Math.sin(2 * Math.PI * 55 * s) * (1 - p) * 0.25);
}

const pcm = Buffer.alloc(44 + samples.length * 2);
pcm.write("RIFF", 0);
pcm.writeUInt32LE(36 + samples.length * 2, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20); // PCM
pcm.writeUInt16LE(1, 22); // mono
pcm.writeUInt32LE(RATE, 24);
pcm.writeUInt32LE(RATE * 2, 28);
pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(samples.length * 2, 40);
samples.forEach((v, i) => pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));

const dir = new URL("../public/tracks/", import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL("test-120.wav", dir), pcm);
console.log("wrote public/tracks/test-120.wav");
