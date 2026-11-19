// The single place for brand and platform thresholds used by the pre-approval validators.
// Source: design/brand/README.md. When the guide changes version, update this file first,
// then re-read docs/lessons-learned.md (L-014).

export const GUIDE_VERSION = "v3.1 (2026-11-18)";

export const CAPTION = {
  // Sections 4 and 8: the length target is a checklist item, so it fails approval.
  minChars: 150,
  maxChars: 500,
  // Instagram hard limit.
  platformMaxChars: 2200,
  // Section 5: 3 to 5, lowercase. Instagram caps hashtags at 5.
  hashtagsMin: 3,
  hashtagsMax: 5,
  // Instagram limit.
  mentionsMax: 20,
} as const;

// Section 6. Phrases match case-insensitively on word boundaries; hashtags match by prefix.
export const BANNED_PHRASES = {
  bait: ["wait for it", "watch till the end", "you won't believe", "secret", "part 2"],
  hardCta: [
    "follow for",
    "link in bio",
    "share this",
    "tag a",
    "comment below",
    "subscribe",
  ],
} as const;

// Section 6 "Conditional CTA": banned only in CTA form, meaning at the start of a line, or followed
// by one of `followers`, end punctuation or the end of the line. "felt like this was the day" and
// "I want to save this moment" pass; "save this moment" at the start of a line fails.
export const CONDITIONAL_CTA = {
  phrases: ["like this", "save this"],
  followers: ["if", "for", "post", "reel", "video"],
  endPunctuation: [".", "!", "?", "…"],
} as const;

// "part 2" is allowed only when a part 2 exists.
export const PART_TWO = "part 2";

export const BANNED_HASHTAG_PREFIXES = ["#fyp", "#viral", "#explore", "#reels", "#foryou"] as const;

export const VIDEO = {
  // Section 8 (Graph API limits).
  fpsMin: 23,
  fpsMax: 60,
  platformMinS: 3,
  platformMaxS: 15 * 60,
  // "300 MB" read strictly as decimal megabytes.
  sizeMaxBytes: 300_000_000,
  // Section 3 target, and the hard range from the aligned agent spec (guide section 9, line 104).
  hardMinS: 7,
  hardMaxS: 60,
  targetMinS: 20,
  targetMaxS: 45,
  videoCodecs: ["h264", "hevc"],
  audioCodecs: ["aac"],
  // 1080x1920, 720x1280 and 2160x3840 are exact; 1080x1900 (0.568) is not.
  aspect: 9 / 16,
  aspectTolerance: 0.001,
} as const;
