import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCaption, findBannedTerms } from "./caption-check.ts";

// The example from design/brand/README.md v3.1 section 4.
const GOOD = `I quit coffee for a week

day one: headache by 11am.
day four: weirdly fine?
day seven: not going back. maybe.

could you last a week without it?

DAY 042 · 2026.11.18

#dayinmylife #dailyvlog #nocoffee #challenge`;

const TAGS = "#dayinmylife #dailyvlog #nocoffee";
// Body text that pads a caption to `n` characters, ending in the three tags.
const pad = (n, body = "a") => body + "a".repeat(n - body.length - TAGS.length - 1) + " " + TAGS;
const errorsFor = (text, opts) => checkCaption(text, opts).errors;

test("the brand guide example passes", () => {
  assert.deepEqual(errorsFor(GOOD), []);
  assert.deepEqual(checkCaption(GOOD).hashtags, ["#dayinmylife", "#dailyvlog", "#nocoffee", "#challenge"]);
});

test("150 to 500 characters", () => {
  assert.deepEqual(errorsFor(pad(150)), []);
  assert.deepEqual(errorsFor(pad(500)), []);
  assert.match(errorsFor(pad(149))[0], /149 characters, need 150 to 500/);
  assert.match(errorsFor(pad(501))[0], /501 characters/);
});

test("length counts code points, so Korean and the middle dot count once each", () => {
  assert.equal(checkCaption("오늘 · " + TAGS).length, 5 + TAGS.length);
});

test("hashtags must be 3 to 5 unique, lowercase", () => {
  const withTags = (tags) => "a".repeat(200) + " " + tags;
  assert.match(errorsFor(withTags("#a #b"))[0], /2 unique hashtags/);
  assert.deepEqual(errorsFor(withTags("#a #b #c")), []);
  assert.deepEqual(errorsFor(withTags("#a #b #c #d #e")), []);
  assert.match(errorsFor(withTags("#a #b #c #d #e #f"))[0], /6 hashtags, max 5/);
  assert.match(errorsFor(withTags("#a #b #b"))[0], /2 unique hashtags/);
  assert.match(errorsFor(withTags("#a #a #b #c #d #e"))[0], /6 hashtags, max 5/);
  assert.match(errorsFor(withTags("#a #b #c #d #2026"))[0] ?? "", /^$/);
  assert.match(errorsFor(withTags("#a #b #c #d #e #2026"))[0], /6 hashtags, max 5/);
  assert.match(errorsFor(withTags("#a #b #DailyVlog"))[0], /lowercase: #DailyVlog/);
});

test("# inside a word and URL fragments are not hashtags", () => {
  assert.deepEqual(checkCaption("learning c# and a#b about/#top " + TAGS).hashtags, TAGS.split(" "));
});

test("at most 20 @ mentions; emails and a bare @ do not count", () => {
  const mentions = (n) => Array.from({ length: n }, (_, i) => `@user${i}`).join(" ");
  assert.deepEqual(errorsFor(pad(400, mentions(20) + " ")), []);
  assert.match(errorsFor(pad(400, mentions(21) + " "))[0], /21 @ mentions/);
  assert.deepEqual(checkCaption(`mail a.b@example.com, see @. and @ there, hi @_x ${TAGS}`).mentions, ["@_x"]);
});

test("emojis are rejected, plain text symbols are not", () => {
  for (const e of ["☕", "\u{1F327}️", "\u{1F1F0}\u{1F1F7}", "1️⃣", "❤"]) {
    assert.ok(errorsFor(pad(200, `coffee ${e} `)).some((m) => /emoji/.test(m)), e);
  }
  assert.deepEqual(errorsFor(pad(200, "2026.11.18 - ok © ® ™ ")), []);
});

test("links are rejected", () => {
  for (const link of ["https://x.co/a", "http://x.co", "www.example.com", "bit.ly/abc", "example.com/x", "shop.kr"]) {
    assert.ok(errorsFor(pad(200, `see ${link} `)).some((m) => /link/.test(m)), link);
  }
  assert.deepEqual(errorsFor(pad(200, "day.one was fine. me.too ")), []);
});

test("English only: non-Latin letters fail in the body and in hashtags", () => {
  assert.match(errorsFor(pad(200, "오늘 coffee "))[0], /not English only \(오\)/);
  assert.ok(errorsFor(pad(200, "#일상 ")).some((m) => /not English only/.test(m)));
  assert.deepEqual(errorsFor(pad(200, "café naïve ")), []);
});

test("all-caps words fail except the DAY NNN sign-off", () => {
  assert.match(errorsFor(pad(200, "this was SO good "))[0], /all-caps words outside the sign-off: SO/);
  assert.match(errorsFor(pad(200, "DAY one "))[0], /: DAY/);
  assert.match(errorsFor(pad(200, "up at 11AM and 3AM "))[0], /: AM AM/);
  assert.match(errorsFor(pad(200, "new iPHONE "))[0], /: PHONE/);
  assert.deepEqual(errorsFor(pad(200, "DAY 042 · I got 2 TVs ")), []);
});

test("banned phrases match whole words, case-insensitive", () => {
  for (const [text, term] of [
    ["Wait for it", "wait for it"],
    ["WATCH   TILL THE END", "watch till the end"],
    ["you won’t believe this", "you won't believe"],
    ["you wont believe this", "you won't believe"],
    ["my secret.", "secret"],
    ["Follow for more", "follow for"],
    ["link in bio", "link in bio"],
    ["tag a friend", "tag a"],
    ["please subscribe", "subscribe"],
    ["comment below!", "comment below"],
  ]) {
    assert.deepEqual(findBannedTerms(text), [term], text);
  }
});

test("banned phrases do not hit inside other words", () => {
  for (const text of ["tag along", "secretly", "felt like that", "subscribers", "save thistle", "part 20"]) {
    assert.deepEqual(findBannedTerms(text), [], text);
  }
});

test("like this and save this are banned only in CTA form", () => {
  for (const [text, term] of [
    ["Like this if you agree", "like this"],
    ["day one\n  save this for later", "save this"],
    ["you should like this post", "like this"],
    ["please save this reel", "save this"],
    ["like this video", "like this"],
    ["go on, save this!", "save this"],
    ["you will like this.", "like this"],
    ["would you SAVE   THIS?", "save this"],
    ["just like this…", "like this"],
    ["save this moment", "save this"],
    ["I felt like this\nnext line", "like this"],
    ["do it like this  ", "like this"],
  ]) {
    assert.deepEqual(findBannedTerms(text), [term], text);
  }
  for (const text of [
    "felt like this was the day",
    "I want to save this moment",
    "it looked like this one time",
    "unlike this morning",
    "save thistle",
    "like thistles",
  ]) {
    assert.deepEqual(findBannedTerms(text), [], text);
  }
  assert.deepEqual(errorsFor(pad(200, "I felt like this was the day, save this moment ")), []);
});

test("part 2 is banned unless a part 2 exists", () => {
  assert.deepEqual(findBannedTerms("part 2 tomorrow"), ["part 2"]);
  assert.deepEqual(findBannedTerms("part 2 tomorrow", { partTwoExists: true }), []);
});

test("banned hashtags match by prefix", () => {
  assert.deepEqual(findBannedTerms("#fyp #fyppage #viralvideo #explorepage #reelsinstagram #foryoupage #dailyvlog"), [
    "#fyp",
    "#fyppage",
    "#viralvideo",
    "#explorepage",
    "#reelsinstagram",
    "#foryoupage",
  ]);
  assert.ok(errorsFor(pad(200, "#fyp ")).some((m) => /banned terms: #fyp/.test(m)));
});

test("reports every failure at once", () => {
  assert.equal(errorsFor("x".repeat(2300) + " ☕ LOUD").length, 4);
});
