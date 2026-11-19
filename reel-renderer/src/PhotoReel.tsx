import React from "react";
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadGothic } from "@remotion/google-fonts/GothicA1";
import { HEADLINE_PAD, HEADLINE_PX } from "./spec";
import type { ReelSpec, Segment } from "./spec";

// Brand tokens: design/brand/README.md v3.1.
const BLACK = "#0A0A0A";
const WHITE = "#FFFFFF";
const VOLT = "#D4FF3A";
const SAFE = { left: 80, top: 296, right: 920, bottom: 1500 };
const PUNCH_FRAMES = 6;
const FLASH_FRAMES = 2;

const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const gothic = loadGothic("normal", { weights: ["900"], subsets: ["latin"] }).fontFamily;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Photo: React.FC<{ spec: ReelSpec; segment: Segment }> = ({ spec, segment }) => {
  const local = useCurrentFrame();
  const photo = spec.photos[segment.photo];
  const sinceDrop = segment.from + local - spec.dropFrame;
  const push = interpolate(local, [0, segment.frames], [1, 1.08], clamp);
  const punch =
    sinceDrop >= 0 && sinceDrop < PUNCH_FRAMES
      ? interpolate(sinceDrop, [0, 2, PUNCH_FRAMES], [1, 1.15, 1], { ...clamp, easing: Easing.out(Easing.quad) })
      : 1;
  // Landscape photos fill the frame and pan across instead of letterboxing.
  const panX = photo.landscape ? interpolate(local, [0, segment.frames], [35, 65], clamp) : 50;
  return (
    <AbsoluteFill style={{ backgroundColor: BLACK }}>
      <Img
        src={staticFile(photo.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${panX}% 50%`,
          transform: `scale(${push * punch})`,
        }}
      />
    </AbsoluteFill>
  );
};

const Headline: React.FC<{ spec: ReelSpec }> = ({ spec }) => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      top: SAFE.top,
      width: SAFE.right - SAFE.left,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 8,
      fontFamily: anton,
      fontSize: HEADLINE_PX,
      lineHeight: 1.04,
      color: WHITE,
    }}
  >
    {spec.headlineLines.map((line, i) => (
      <div key={i} style={{ display: "flex" }}>
        {line.map((word, j) => (
          <span
            key={j}
            style={{
              backgroundColor: word.accent ? VOLT : BLACK,
              color: word.accent ? BLACK : WHITE,
              padding: `12px ${j === line.length - 1 ? HEADLINE_PAD.end : HEADLINE_PAD.inner}px 10px ${j === 0 ? HEADLINE_PAD.end : HEADLINE_PAD.inner}px`,
              whiteSpace: "nowrap",
            }}
          >
            {word.text}
          </span>
        ))}
      </div>
    ))}
  </div>
);

// Small label in the guide's tag style. Used for the closing tag and the per-photo time.
const Label: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      backgroundColor: BLACK,
      color: WHITE,
      padding: "12px 20px 10px",
      fontFamily: gothic,
      fontWeight: 900,
      fontSize: 32,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
    }}
  >
    {text}
  </div>
);

// Monochrome grain at 14%, same recipe as design/brand/templates/comps.html, reseeded per frame.
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.14, mixBlendMode: "overlay" }}>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  );
};

export const PhotoReel: React.FC<ReelSpec> = (spec) => {
  const frame = useCurrentFrame();
  const close = spec.segments[spec.segments.length - 1];
  const current = spec.segments.find((s) => frame >= s.from && frame < s.from + s.frames);
  const time = current ? spec.photos[current.photo].timeLabel : undefined;
  const flash = frame >= spec.dropFrame && frame < spec.dropFrame + FLASH_FRAMES;
  return (
    <AbsoluteFill style={{ backgroundColor: BLACK }}>
      {spec.segments.map((segment) => (
        <Sequence key={segment.from} from={segment.from} durationInFrames={segment.frames}>
          <Photo spec={spec} segment={segment} />
        </Sequence>
      ))}
      {frame < spec.headlineFrames ? <Headline spec={spec} /> : null}
      {/* Bottom left of the text-safe box. The time keeps its place; the closing tag stacks above it. */}
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          bottom: 1920 - SAFE.bottom,
          maxWidth: SAFE.right - SAFE.left,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        {spec.tag && frame >= close.from ? <Label text={spec.tag} /> : null}
        {time ? <Label text={time} /> : null}
      </div>
      <Grain />
      {flash ? <AbsoluteFill style={{ backgroundColor: WHITE }} /> : null}
      <Audio
        src={staticFile(spec.audio.file)}
        trimBefore={spec.audio.trimBeforeFrames}
        volume={(f) => interpolate(f, [spec.durationInFrames - 15, spec.durationInFrames], [1, 0], clamp)}
      />
    </AbsoluteFill>
  );
};
