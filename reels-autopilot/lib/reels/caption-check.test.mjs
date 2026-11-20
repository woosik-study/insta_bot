import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCaption, findBannedTerms, usPostDate } from "./caption-check.ts";

// The example from design/brand/README.md v4.1 section 4, word for word.
const GOOD = `Raccoon vs the roommate

rudy's plan: find a roommate.
four interviews. one drum kit. one snake named rudy.
he found the one. there is a catch.

what was your worst roommate interview?

EP 02 · 2026.11.21

#storytime #roommates #roommatelife`;

const TAGS = "#dayinmylife #dailyvlog #nocoffee";
const SIGN = "DAY 042 · 2026.11.21";
// Body text padded to `n` characters, then a valid sign-off line and the three tags.
const pad = (n, body = "a") =>
  body + "a".repeat(n - body.length - SIGN.length - TAGS.length - 2) + "\n" + SIGN + "\n" + TAGS;
const errorsFor = (text, opts) => checkCaption(text, opts).errors;

test("the brand guide example passes", () => {
  assert.deepEqual(errorsFor(GOOD), []);
  assert.deepEqual(errorsFor(GOOD, { postAt: "2026-11-21T17:00:00Z" }), []);
  assert.deepEqual(checkCaption(GOOD).hashtags, ["#storytime", "#roommates", "#roommatelife"]);
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
  const withTags = (tags) => "a".repeat(200) + "\n" + SIGN + "\n" + tags;
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

test("all-caps words fail except the DAY NNN and EP NN sign-off tags", () => {
  assert.match(errorsFor(pad(200, "this was SO good "))[0], /all-caps words outside the sign-off: SO/);
  assert.match(errorsFor(pad(200, "DAY one "))[0], /: DAY/);
  assert.match(errorsFor(pad(200, "up at 11AM and 3AM "))[0], /: AM AM/);
  assert.match(errorsFor(pad(200, "new iPHONE "))[0], /: PHONE/);
  assert.deepEqual(errorsFor(pad(200, "I got 2 TVs ")), []);
  // The tags are exempt only on the sign-off line itself.
  assert.match(errorsFor(pad(200, "this is EP 02 of it "))[0], /: EP/);
  assert.match(errorsFor(pad(200, "DAY 042 again "))[0], /: DAY/);
  assert.match(errorsFor(pad(200, "EP two "))[0], /: EP/);
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
  // Length, hashtags, emoji, all caps, sign-off.
  assert.equal(errorsFor("x".repeat(2300) + " ☕ LOUD").length, 5);
});

test("real-life claims are banned (v4)", () => {
  for (const [text, term] of [
    ["Real footage from today", "real footage"],
    ["caught   on camera", "caught on camera"],
    ["a TRUE STORY.", "true story"],
    ["this actually happened", "actually happened"],
    ["#reallife", "#reallife"],
    ["#RealLifeStory", "#RealLifeStory"],
    ["#truestory", "#truestory"],
    ["#caughtoncamera", "#caughtoncamera"],
  ]) {
    assert.deepEqual(findBannedTerms(text), [term], text);
  }
  for (const text of ["really happened", "a true storyline", "unreal footage", "#real", "the camera caught it"]) {
    assert.deepEqual(findBannedTerms(text), [], text);
  }
});

test("sign-off must be one DAY NNN or EP NN line with a real YYYY.MM.DD date", () => {
  const withSign = (line) => "a".repeat(150) + "\n" + line + "\n" + TAGS;
  for (const ok of ["DAY 042 · 2026.11.21", "EP 02 · 2026.11.21", "  EP 12 · 2027.01.01  "]) {
    assert.deepEqual(errorsFor(withSign(ok)), [], ok);
  }
  for (const [line, why] of [
    ["DAY 001 · [date]", /no sign-off line/],
    ["DAY 42 · 2026.11.21", /no sign-off line/],
    ["EP 2 · 2026.11.21", /no sign-off line/],
    ["DAY 042 - 2026.11.21", /no sign-off line/],
    ["DAY 042 · 2026-11-21", /no sign-off line/],
    ["DAY 042 · 2026.11.21 / RUDY", /no sign-off line/],
    ["DAY 042 · 2026.02.30", /not a real date/],
    ["DAY 042 · 2026.11.21\nEP 02 · 2026.11.21", /2 sign-off lines/],
  ]) {
    assert.ok(errorsFor(withSign(line)).some((m) => why.test(m)), line);
  }
});

test("with postAt, the sign-off date must be the US post date", () => {
  // 17:00 UTC is 09:00 in Los Angeles (and 07:00 in Honolulu, 12:00 in New York): one date.
  assert.deepEqual(errorsFor(GOOD, { postAt: new Date("2026-11-21T17:00:00Z") }), []);
  assert.match(errorsFor(GOOD, { postAt: "2026-11-22T17:00:00Z" })[0], /not the US post date 2026.11.22/);
  // The Korean date is wrong: 2026-11-21 17:00 UTC is 11-22 02:00 KST but 11-21 in the US.
  assert.match(
    errorsFor(GOOD.replace("2026.11.21", "2026.11.22"), { postAt: "2026-11-21T17:00:00Z" })[0],
    /not the US post date 2026\.11\.21/,
  );
  // Supabase timestamptz strings carry an offset; strings without one are refused.
  assert.deepEqual(errorsFor(GOOD, { postAt: "2026-11-21T17:00:00+00:00" }), []);
  assert.deepEqual(errorsFor(GOOD, { postAt: "2026-11-21 17:00:00+00" }), []);
  for (const bare of ["2026-11-21 17:00:00", "2026-11-21"]) {
    assert.match(errorsFor(GOOD, { postAt: bare })[0], /needs a UTC offset/, bare);
  }
  // One reference zone, California (guide section 4, L-023): any run time has one answer.
  // Los Angeles midnight decides: in November (PST, UTC-8) 07:59 UTC is still 11-20, 08:00 UTC is 11-21.
  assert.match(errorsFor(GOOD, { postAt: "2026-11-21T07:59:00Z" })[0], /not the US post date 2026\.11\.20/);
  assert.deepEqual(errorsFor(GOOD, { postAt: "2026-11-21T08:00:00Z" }), []);
  // A late manual run the next morning in Korea (01:00 UTC on 11-22) is still 11-21 in California.
  assert.deepEqual(errorsFor(GOOD, { postAt: "2026-11-22T01:00:00Z" }), []);
  // Daylight time: in July Los Angeles is UTC-7, so 07:00 UTC is already the new day.
  const july = GOOD.replace("2026.11.21", "2026.07.01");
  assert.deepEqual(errorsFor(july, { postAt: "2026-07-01T07:00:00Z" }), []);
  assert.equal(usPostDate(new Date("2026-07-01T06:59:00Z")), "2026.06.30");
  assert.match(errorsFor(GOOD, { postAt: "not a date" })[0], /needs a UTC offset/);
  assert.match(errorsFor(GOOD, { postAt: "2026-13-45T99:00:00Z" })[0], /postAt is not a valid date/);
});

test("the Rudy episode 1 draft fails on its date placeholder (L-019)", () => {
  const draft = `Raccoon vs the rent

rudy just moved to new york with one suitcase.
three apartments. one has a shower in the kitchen.
he has a plan. mostly.

DAY 001 · [date]

#storytime #nycapartment #apartmenthunt`;
  // The placeholder line is not a sign-off, so its DAY tag also counts as an all-caps word.
  const errors = errorsFor(draft);
  assert.equal(errors.length, 2);
  assert.ok(errors.some((m) => /no sign-off line/.test(m)));
  assert.ok(errors.some((m) => /all-caps words outside the sign-off: DAY/.test(m)));
  assert.deepEqual(errorsFor(draft.replace("DAY 001 · [date]", "EP 01 · 2026.11.21")), []);
});
