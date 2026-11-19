// Video file checks from the pre-approval checklist in design/brand/README.md (sections 3 and 8).
// Thresholds live in brand-rules.ts. `checkVideo` is pure and takes parsed ffprobe JSON;
// only `probeVideo` needs the ffprobe binary.

import { execFile } from "node:child_process";
import { VIDEO } from "./brand-rules.ts";

const VIDEO_CODECS: readonly string[] = VIDEO.videoCodecs;
const AUDIO_CODECS: readonly string[] = VIDEO.audioCodecs;

export type FfprobeStream = {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  side_data_list?: { rotation?: number }[];
  tags?: { rotate?: string };
  disposition?: { attached_pic?: number };
};

export type FfprobeOutput = {
  streams?: FfprobeStream[];
  format?: { format_name?: string; duration?: string; size?: string };
};

// Errors block approval. Warnings (outside the 20 to 45 s target) are for the reviewer.
export type VideoReport = { ok: boolean; errors: string[]; warnings: string[] };

// "30000/1001" -> 29.97. "0/0" (unknown) -> NaN.
function parseRate(rate: string | undefined): number {
  if (!rate) return NaN;
  const [num, den = "1"] = rate.split("/");
  const value = Number(num) / Number(den);
  return Number.isFinite(value) && value > 0 ? value : NaN;
}

const PRIVATE_HOST =
  /^(localhost|.*\.localhost|.*\.local|.*\.internal|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+|0\.0\.0\.0|\[.*\])$/i;

// Syntax only: Instagram must be able to fetch it. Reachability is proven by probeVideo.
export function checkVideoUrl(url: string): string[] {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return [`video_url is not a valid URL`];
  }
  if (parsed.protocol !== "https:") return [`video_url must be https, got ${parsed.protocol}`];
  const host = parsed.hostname.replace(/\.$/, "");
  if (PRIVATE_HOST.test(host)) return [`video_url host ${parsed.hostname} is not public`];
  if (parsed.username || parsed.password) return [`video_url must not need login`];
  // ffmpeg splits URLs its own way; refuse characters where the two parsers could disagree on the host.
  if (/[\\#@]/.test(url)) return [`video_url must not contain \\, # or @`];
  return [];
}

export function checkVideo(url: string, probe: FfprobeOutput): VideoReport {
  const errors = checkVideoUrl(url);
  const streams = probe.streams ?? [];
  const format = probe.format ?? {};

  const containers = (format.format_name ?? "").split(",");
  if (!containers.includes("mov") && !containers.includes("mp4")) {
    errors.push(`container must be MOV or MP4, got ${format.format_name ?? "unknown"}`);
  }

  // Embedded cover art is a video stream too; check the real one.
  const video = streams.find((s) => s.codec_type === "video" && !s.disposition?.attached_pic);
  if (!video) {
    errors.push("no video stream");
  } else {
    if (!VIDEO_CODECS.includes(video.codec_name ?? "")) {
      errors.push(`video codec must be H.264 or HEVC, got ${video.codec_name ?? "unknown"}`);
    }
    const fps = parseRate(video.avg_frame_rate);
    const rate = Number.isNaN(fps) ? parseRate(video.r_frame_rate) : fps;
    if (Number.isNaN(rate)) errors.push("frame rate unknown");
    else if (rate < VIDEO.fpsMin || rate > VIDEO.fpsMax) {
      errors.push(`frame rate ${rate.toFixed(2)} fps, need ${VIDEO.fpsMin} to ${VIDEO.fpsMax}`);
    }

    if (video.width && video.height) {
      // Newer ffprobe reports rotation in side data, older builds in tags.rotate.
      const sideRotation = video.side_data_list?.find((d) => d.rotation !== undefined)?.rotation;
      const rotation = Math.abs(sideRotation ?? Number(video.tags?.rotate ?? 0));
      const [w, h] = rotation % 180 === 90 ? [video.height, video.width] : [video.width, video.height];
      if (Math.abs(w / h - VIDEO.aspect) > VIDEO.aspectTolerance) errors.push(`aspect ${w}x${h} is not 9:16`);
    } else {
      errors.push("video size unknown");
    }
  }

  // A silent video passes; any audio track must be AAC.
  for (const audio of streams.filter((s) => s.codec_type === "audio")) {
    if (!AUDIO_CODECS.includes(audio.codec_name ?? "")) {
      errors.push(`audio codec must be AAC, got ${audio.codec_name ?? "unknown"}`);
    }
  }

  // The brand hard range (7 to 60 s) sits inside the Graph API range (3 s to 15 min), so one check covers both.
  const warnings: string[] = [];
  const duration = Number(format.duration);
  if (!Number.isFinite(duration)) errors.push("duration unknown");
  else if (duration < VIDEO.hardMinS || duration > VIDEO.hardMaxS) {
    errors.push(`duration ${duration.toFixed(1)} s, need ${VIDEO.hardMinS} to ${VIDEO.hardMaxS} s`);
  } else if (duration < VIDEO.targetMinS || duration > VIDEO.targetMaxS) {
    warnings.push(`duration ${duration.toFixed(1)} s is outside the ${VIDEO.targetMinS} to ${VIDEO.targetMaxS} s target`);
  }

  const size = Number(format.size);
  if (!Number.isFinite(size)) errors.push("file size unknown");
  else if (size > VIDEO.sizeMaxBytes) errors.push(`file is ${size} bytes, max ${VIDEO.sizeMaxBytes}`);

  return { ok: errors.length === 0, errors, warnings };
}

// Runs ffprobe on the URL itself, so a URL that needs login or is not a direct file fails here.
// Needs ffprobe on PATH (`brew install ffmpeg`). The URL is checked first and ffprobe may only
// speak https, so it cannot read local files or follow a redirect to plain http.
// ponytail: a public hostname that resolves or redirects to a private https host is not blocked;
// only call this on queued URLs. Add a DNS check before exposing it to untrusted input.
export function probeVideo(url: string, timeoutMs = 60_000): Promise<FfprobeOutput> {
  const urlErrors = checkVideoUrl(url);
  if (urlErrors.length) return Promise.reject(new Error(urlErrors[0]));
  const args = [
    "-v", "error",
    "-protocol_whitelist", "https,tls,tcp",
    "-print_format", "json", "-show_format", "-show_streams",
    new URL(url).href,
  ];
  return new Promise((resolve, reject) => {
    execFile("ffprobe", args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`ffprobe failed: ${stderr.trim() || err.message}`));
      try {
        resolve(JSON.parse(stdout) as FfprobeOutput);
      } catch {
        reject(new Error("ffprobe returned non-JSON output"));
      }
    });
  });
}
