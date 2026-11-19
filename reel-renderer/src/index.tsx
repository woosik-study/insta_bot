import React from "react";
import { Composition, registerRoot } from "remotion";
import { PhotoReel } from "./PhotoReel";
import { FPS, buildSpec } from "./spec";

// Placeholder so Remotion Studio opens; real renders pass --props from scripts/make-reel.mjs.
const sample = buildSpec(
  Array.from({ length: 8 }, (_, i) => ({ src: `job/${String(i + 1).padStart(2, "0")}.jpg`, landscape: false })),
  { id: "test-120", file: "tracks/test-120.wav", bpm: 120, firstBeatSec: 0, license: "synthetic" },
  { headline: "A day in photos", accent: "day", tag: "DAY 001" },
);

const Root: React.FC = () => (
  <Composition
    id="PhotoReel"
    component={PhotoReel}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={sample.durationInFrames}
    defaultProps={sample}
    calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames })}
  />
);

registerRoot(Root);
