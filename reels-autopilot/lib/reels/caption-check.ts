// Caption checks from the pre-approval checklist in design/brand/README.md (sections 4 to 6 and 8).
// Thresholds live in brand-rules.ts. Pure so it runs under `node --test`.
// Still needs a human: formula order, line lengths, the prompt cadence and the KST sign-off date.
// `findBannedTerms` must also run on the hook headline and the cover text (guide section 6).

import { BANNED_HASHTAG_PREFIXES, BANNED_PHRASES, CAPTION, CONDITIONAL_CTA, PART_TWO } from "./brand-rules.ts";

// `#` must not follow a word character or `/`, so "c#", "a#b" and URL fragments are not tags.
// Digit-only tags like "#1" count too: unverified whether Instagram links them, so stay conservative on the cap.
const HASHTAG = /(?<![\p{L}\p{N}_&#/])#[\p{L}\p{N}_]+/gu;
// `@` must not follow a word character, so emails are not mentions. Handles start with a letter, digit or `_`.
const MENTION = /(?<![\p{L}\p{N}_@])@[A-Za-z0-9_][A-Za-z0-9._]*/gu;
// Pictographs, flags and keycaps. Plain digits, # and *, and the text symbols (c) (r) TM are not flagged.
const EMOJI = /(?![\u00A9\u00AE\u2122])\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u;
// Schemes, www., and bare domains on common TLDs ("bit.ly/x", "example.com"). "day.one" is not a link.
const LINK = /https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(com|co|net|org|io|ly|me|kr|gg|app|link|to|tv)(?![\p{L}\p{N}])/iu;
// English only: any letter outside the Latin script (Hangul, kana, Cyrillic...) fails.
const NON_LATIN_LETTER = /(?!\p{Script=Latin})\p{L}/u;
// The sign-off tag is the only place all caps are allowed.
const SIGN_OFF_TAG = /\bDAY \d{3}\b/g;
// Two or more capitals not touching another letter: "LOVE", "OK", "11AM", "iPHONE". "I" and "TVs" pass.
const ALL_CAPS_WORD = /(?<![\p{Lu}_#@])\p{Lu}{2,}(?![\p{L}])/gu;

export type CaptionOptions = { partTwoExists?: boolean };

export type CaptionReport = {
  ok: boolean;
  errors: string[];
  length: number;
  hashtags: string[];
  mentions: string[];
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const WORD_CHAR = "[\\p{L}\\p{N}_]";
// Spaces match any whitespace. The apostrophe is optional and may be curly, so "you wont believe" still matches.
const phraseBody = (phrase: string) => escape(phrase).replace(/ /g, "\\s+").replace(/'/g, "['\u2019]?");

// Whole-word, case-insensitive.
function phraseRegex(phrase: string) {
  return new RegExp(`(?<!${WORD_CHAR})${phraseBody(phrase)}(?!${WORD_CHAR})`, "iu");
}

// CTA form only: at the start of a line (after optional spaces), or followed by a listed word,
// end punctuation, or the end of the line (trailing spaces allowed).
function conditionalRegex(phrase: string) {
  const body = phraseBody(phrase);
  const followers = CONDITIONAL_CTA.followers.join("|");
  const punct = CONDITIONAL_CTA.endPunctuation.map(escape).join("");
  const atLineStart = `^[^\\S\\n]*${body}(?!${WORD_CHAR})`;
  const beforeCtaWord = `(?<!${WORD_CHAR})${body}(?:\\s+(?:${followers})(?!${WORD_CHAR})|\\s*[${punct}]|[^\\S\\n]*$)`;
  return new RegExp(`${atLineStart}|${beforeCtaWord}`, "imu");
}

const PHRASES = [
  ...[...BANNED_PHRASES.bait, ...BANNED_PHRASES.hardCta].map((p) => ({ p, re: phraseRegex(p) })),
  ...CONDITIONAL_CTA.phrases.map((p) => ({ p, re: conditionalRegex(p) })),
];

// Section 6 terms found in any text: caption, hook headline or cover.
export function findBannedTerms(text: string, { partTwoExists = false }: CaptionOptions = {}): string[] {
  const found: string[] = PHRASES.filter(({ p, re }) => !(p === PART_TWO && partTwoExists) && re.test(text)).map(
    ({ p }) => p,
  );
  for (const tag of text.match(HASHTAG) ?? []) {
    const prefix = BANNED_HASHTAG_PREFIXES.find((b) => tag.toLowerCase().startsWith(b));
    if (prefix) found.push(tag);
  }
  return found;
}

export function checkCaption(caption: string, options: CaptionOptions = {}): CaptionReport {
  const errors: string[] = [];
  const length = [...caption].length;
  const hashtags = caption.match(HASHTAG) ?? [];
  const mentions = caption.match(MENTION) ?? [];

  if (length < CAPTION.minChars || length > CAPTION.maxChars) {
    errors.push(`caption is ${length} characters, need ${CAPTION.minChars} to ${CAPTION.maxChars}`);
  }
  // Repeats do not help reach the minimum, but every tag counts toward the platform cap.
  const unique = new Set(hashtags.map((t) => t.toLowerCase())).size;
  if (unique < CAPTION.hashtagsMin) errors.push(`${unique} unique hashtags, need ${CAPTION.hashtagsMin} to ${CAPTION.hashtagsMax}`);
  else if (hashtags.length > CAPTION.hashtagsMax) errors.push(`${hashtags.length} hashtags, max ${CAPTION.hashtagsMax}`);
  const upperTags = hashtags.filter((t) => /\p{Lu}/u.test(t));
  if (upperTags.length) errors.push(`hashtags must be lowercase: ${upperTags.join(" ")}`);
  if (mentions.length > CAPTION.mentionsMax) errors.push(`${mentions.length} @ mentions, max ${CAPTION.mentionsMax}`);

  const emoji = caption.match(EMOJI);
  if (emoji) errors.push(`contains an emoji (${emoji[0]})`);
  if (LINK.test(caption)) errors.push("contains a link");
  const nonLatin = caption.match(NON_LATIN_LETTER);
  if (nonLatin) errors.push(`not English only (${nonLatin[0]})`);

  const caps = caption.replace(SIGN_OFF_TAG, "").replace(HASHTAG, "").match(ALL_CAPS_WORD);
  if (caps) errors.push(`all-caps words outside the sign-off: ${caps.join(" ")}`);

  const banned = findBannedTerms(caption, options);
  if (banned.length) errors.push(`banned terms: ${banned.join(", ")}`);

  return { ok: errors.length === 0, errors, length, hashtags, mentions };
}
