# Lessons learned: insta_bot content pipeline

Read this file before every new attempt (test, render, publish, spec change). Before starting, list which entries apply and follow their rules.

How to add an entry:
- Add every attempt, including failures and deferrals. Newest entry at the top of its section.
- Fields: date, what was tried, result (pass, fail, bad outcome, or deferred), root cause, rule for next time, status (open or resolved).
- When an open entry is fixed, set its status to resolved and add the date and the commit or PR that fixed it. Do not delete entries.

Source of truth for content rules: `design/brand/README.md`. Approved version: v3.1 (2026-11-18), which replaced v2. Validator thresholds live in `reels-autopilot/lib/reels/brand-rules.ts`. Check the guide version before applying any rule; L-003 and L-004 were written under v2.

---

## Attempt log

### L-018 Conditional CTA ruling applied
- Date: 2026-11-18
- What was tried: Design Team ruled on L-017: keep the literal rule (a line that opens with `like this` or `save this` is CTA form), change the guide example to "I want to save this moment", and treat the end of a line like end punctuation. Added the end-of-line case (trailing spaces allowed) to the conditional regex, and test cases for "save this moment" at line start, "like this" before a line break, and "like this" with trailing spaces.
- Result: pass on the first run. `node --test` 53 of 53, `tsc` no new errors, ESLint clean.
- Root cause: n/a.
- Rule: same as L-017. Each pass and fail example in guide section 6 is now a test case word for word.
- Status: resolved; closes L-017.

### L-017 Conditional CTA rule for "like this" and "save this"
- Date: 2026-11-18
- What was tried: Design Team answered the two L-016 questions in the guide (v3.1 wording, version unchanged). Section 3 now says target 20 to 45 s (warn), hard range 7 to 60 s (block), which the validator already did. Section 6 adds "Conditional CTA": `like this` and `save this` are banned only at the start of a line, or when followed by `if`, `for`, `post`, `reel`, `video` or end punctuation. Moved both phrases from `hardCta` to `CONDITIONAL_CTA` in `brand-rules.ts` and added a separate regex for them.
- Result: fail, then pass. The first run failed 1 test: "save this moment" as a standalone line was banned, because the guide's start-of-line rule catches it while the guide's own example says it passes. The two clauses of the guide contradict each other for that input. The code now follows the literal rule (line start = CTA form); the test checks the example mid-sentence. `node --test` 53 of 53, `tsc` no new errors, ESLint clean.
- Root cause: a guide example was written for mid-sentence use but not stated that way, so it conflicts with the line-start clause.
- Rule: when a guide gives pass examples, test each one exactly as written; if one fails, ask the guide owner instead of picking a reading silently. A line that ends with the phrase and no punctuation is not flagged, because the guide lists only end punctuation.
- Status: resolved 2026-11-18 by L-018 (guide example reworded; line start stays CTA form).

### L-016 Independent review of the v3.1 validators
- Date: 2026-11-18
- What was tried: a fresh review agent checked L-015 against guide v3.1.
- Result: bad outcome caught before shipping. 8 risks, 4 questions, 0 blocking bugs. Fixed: a repeated tag let 6 hashtags pass the cap of 5; "you wont believe" (no apostrophe) passed; bare domains (`bit.ly/abc`, `example.com/x`) passed the no-links rule; "11AM" and "iPHONE" passed the all-caps rule; Korean letters passed although captions are English only; 100.64.0.0/10 and `#`, `\`, `@` tricks passed the URL gate; `probeVideo` now passes the parsed URL; added a test that the brand limits stay inside the platform limits. Digit-only tags (`#2026`) now count toward the cap, because it is unverified whether Instagram links them. The first fix run failed 1 test: narrowing the all-caps lookbehind to "no letter" still let "iPHONE" pass; changed it to "no capital". Final run: `node --test` 52 of 52, `tsc` no new errors, ESLint clean.
- Not fixed, sent to Design Team as questions: (1) the guide bans `like this` and `save this` as phrases, so "felt like this was the day" fails; (2) guide section 3 says "Length: 20 to 45 s" as a rule, while sections 8 and 9 treat it as a target with a 7 to 60 s hard range. Still open: a public hostname that resolves or redirects to a private address (needs a DNS check before `probeVideo` faces untrusted input).
- Root cause: tests again covered only the author's cases; the first version of a text rule misses typos, glued tokens, and other scripts.
- Rule: for every text rule, test a typo variant, a token glued to digits or letters, and a non-Latin case. When a review fix changes a regex, add the reviewer's exact example as a test before calling it fixed.
- Status: open (DNS check). Both guide questions answered 2026-11-18, see L-017.

### L-015 Validators updated to brand guide v3.1 through one shared config
- Date: 2026-11-18
- What was tried: v3.1 was approved by woosik and signed off by design review. Moved every threshold and term list into `reels-autopilot/lib/reels/brand-rules.ts` (with `GUIDE_VERSION`), and pointed both validators at it. Caption: 150 to 500 characters, 3 to 5 unique lowercase hashtags, no links, no all-caps words outside `DAY NNN`, section 6 banned phrases (whole words, case-insensitive, curly apostrophes and extra spaces handled) and banned hashtag prefixes; `part 2` passes only with `partTwoExists`. `findBannedTerms` is exported for the hook headline and cover. Video: 7 to 60 s is an error, outside 20 to 45 s is a warning. Added `allowImportingTsExtensions` to `tsconfig.json` so modules can import `./brand-rules.ts` under `node --test`.
- Result: pass on the first run. `node --test` 49 of 49. `tsc` adds no errors (only the existing `LayoutProps` one). ESLint clean on `lib/reels`. `next build` not run.
- Root cause: n/a.
- Rule: change thresholds only in `brand-rules.ts` and bump `GUIDE_VERSION` with the guide. The 7 to 60 s hard range comes from the agent spec line the guide adopted in section 9, not from section 8 (which still lists the 3 s to 15 min Graph API range); if the two disagree again, ask woosik. Still not automated: formula order, 60-character body and prompt lines, prompt cadence (2 of 7 posts), tag rotation versus the previous post, hook repeats, and the KST sign-off date (L-002).
- Status: resolved; closes L-014.

### L-014 Brand guide changed after the validators were written
- Date: 2026-11-18
- What was tried: the caption and video validators (L-010, L-011) were built from the approved v2 guide. The same day the guide moved to draft v3, pending review: caption target 150 to 500 characters (was 250 to 600), hashtags 3 to 5 with a cap of 5, a machine-checkable banned-term list (section 6), hook rules (section 3), video target 20 to 45 s, and a new accent color in place of persimmon.
- Result: bad outcome risk. The validators still pass under v3 because they only enforce hard limits (2,200 characters, 3 to 5 hashtags, 3 s to 15 min), but they do not check the v3 targets or banned terms. The rules seeded in L-003 and L-004 name v2 details (persimmon, paper style) that v3 may replace.
- Root cause: thresholds are hard-coded in each validator, and the brand direction changed after v2 approval.
- Rule: validators read every threshold and term list from one shared config that cites the guide version it follows. When the guide changes version, update that config and re-read every lesson that names a visual rule. Do not change validators for a draft guide; wait until the review session signs off, unless woosik says otherwise.
- Status: resolved 2026-11-18 by L-015 (v3.1 approved, validators read `brand-rules.ts`).

### L-013 Independent review of the validators (ladder step b)
- Date: 2026-11-18
- What was tried: a separate review agent read both validators against the brand guide.
- Result: bad outcome caught before shipping. 9 risks, 0 blocking bugs. Fixed 8: URL fragments and digit-only `#1` counted as hashtags; repeated tags counted twice; `@.` counted as a mention; (c), (r) and TM flagged as emoji; `localhost.` and `*.internal` passed as public hosts; embedded cover art read as the video stream; older ffprobe `tags.rotate` ignored; 1% aspect tolerance let 1080x1900 pass as 9:16; `probeVideo` did not check the URL and allowed any protocol. Not fixed: a public https URL that redirects to a private https host. Left as is: `#a#b` counts as one tag. After the fixes, `node --test` passes 44 of 44 (21 new), `tsc` adds no errors, ESLint is clean.
- Root cause: tests covered only the cases the author thought of; property classes like `\p{Extended_Pictographic}` include characters nobody checked.
- Rule: get a fresh-context review on every validator before it gates real posts. For any Unicode property class, list its surprising members and test them. Check ffprobe output from both old and new builds.
- Status: resolved (open part tracked in the `probeVideo` comment)

### L-012 Real publish of one test reel (ladder step c)
- Date: 2026-11-18
- What was tried: nothing yet. Queue one test row and trigger `/api/cron/reels-publish` by hand.
- Result: deferred. Waiting for woosik's explicit yes; the account is a single real Creator account, so the post goes public.
- Root cause: n/a.
- Rule: never queue or trigger a real publish without woosik's explicit yes in chat for that specific post. Run the caption and video validators (L-011, L-010) on the row first. Apply L-001 (no cover will be sent) and L-002 (sign-off date) before approving the row.
- Status: open

### L-011 Video validator with ffprobe (ladder step b)
- Date: 2026-11-18
- What was tried: added `reels-autopilot/lib/reels/video-check.ts` and `video-check.test.mjs`. The checks run on parsed ffprobe JSON, so the tests use synthetic ffprobe output and do not need ffprobe installed. Checks: container MOV or MP4, H.264 or HEVC, AAC audio, 23 to 60 fps, 3 s to 15 min, 300 MB max, 9:16 aspect, public https URL.
- Result: pass. `node --test lib/**/*.test.mjs`: 41 of 41 pass (10 new). `tsc --noEmit` shows no errors in the new files; its only error is the existing `LayoutProps` in `app/layout.tsx`, which needs `next typegen`. ESLint clean on `lib/reels`. The `probeVideo` wrapper that shells out to ffprobe is not run because ffprobe is not installed (L-006).
- Root cause: n/a.
- Rule: keep the check logic pure and feed it ffprobe JSON; only the thin wrapper touches the binary. Size limit is 300,000,000 bytes (the stricter reading of "300 MB"). A video with no audio stream passes; any audio stream must be AAC.
- Status: resolved for the logic; the run against a real file stays open under L-006.

### L-010b Caption validator, second run (ladder step b)
- Date: 2026-11-18
- What was tried: added the `u` flag to the mention regex and reran the tests.
- Result: pass. 8 of 8 caption tests pass.
- Root cause: n/a.
- Rule: see L-010a.
- Status: resolved

### L-010a Caption validator, first run (ladder step b)
- Date: 2026-11-18
- What was tried: added `reels-autopilot/lib/reels/caption-check.ts` and `caption-check.test.mjs`. Checks: 2,200 characters max, 3 to 5 hashtags, 20 @ mentions max, no emojis.
- Result: fail. 1 test failed: `a.b@example.com` was counted as the mention `@example.com`.
- Root cause: the mention regex had no `u` flag, so `\p{L}` in its lookbehind was read as literal text and did not block letters before `@`.
- Rule: any regex that uses `\p{...}` needs the `u` flag; add a test case that proves the property class works. Length counts Unicode code points, not UTF-16 units. Emails are not mentions and `#` inside a word is not a hashtag. The validator does not check the caption formula, tone, or the sign-off date (L-002); those still need a human read.
- Status: resolved (fixed in L-010b)

### L-009 Manual preview in the Instagram upload screen (ladder step a)
- Date: 2026-11-18
- What was tried: walkthrough sent to woosik: upload `design/brand/images/cover-text.jpg` and `subtitle.png` into the Reels upload screen without posting, and check whether UI overlays cover any text.
- Result: not run. On 2026-11-18 woosik reported all four checks (cover overlay, subtitle overlay, 4:5 crop, image version) as not done yet. Meanwhile the guide moved to v3.1 and the sample images were replaced (02:21 to 02:24) with `hook.png` added, so any check against the v2 files would no longer count.
- Root cause: the sample files changed under the test before it ran.
- Rule: the safe-area numbers (L-007) stay estimates until this check passes on a real phone. Never press Share during a preview; back out and discard the draft. Before a manual check, name the exact files and their modified time, and re-send the walkthrough when the guide version changes. Current set (v3.1): `cover-text.jpg`, `cover-photo.jpg`, `hook.png`, `subtitle.png`.
- Status: open

---

## Seeded lessons (before testing started)

### L-007 Safe-area pixel values never checked on a real phone
- Date: 2026-11-18
- What was tried: the brand guide set UI zones (top y 0 to 250, bottom y 1500 to 1920, right x 920 to 1080) and the text-safe box x 80 to 920, y 296 to 1500.
- Result: bad outcome risk. The values are estimates.
- Root cause: no device check; Instagram changes its overlay between app versions.
- Rule: treat the safe box as unverified until L-009 passes. Re-check on a phone after a major Instagram app update.
- Status: open

### L-006 ffprobe and ffmpeg not installed on this Mac
- Date: 2026-11-18
- What was tried: running media checks locally.
- Result: fail. `ffprobe not found`, `ffmpeg not found`. Homebrew is available at `/opt/homebrew/bin/brew`.
- Root cause: tools were never installed.
- Rule: do not assume ffprobe exists. Ask woosik before installing anything (`brew install ffmpeg` installs both). Unit tests must not depend on the binary.
- Status: open

### L-005 Agent spec conflicted with the brand guide
- Date: 2026-11-18
- What was tried: `docs/automation-agents.md` defined CTA, `cover_text` length and hook text.
- Result: bad outcome. Those rules contradicted the approved brand guide.
- Root cause: the spec was written before the guide and never checked against it.
- Rule: the brand guide is the source of truth. Check every spec, prompt, or validator against it before use.
- Status: open (spec fix pending woosik's approval, owned by another session)

### L-004 Korean titles split mid-word, English subtitles left one-word widows
- Date: 2026-11-18
- What was tried: rendering titles and subtitles from the templates.
- Result: bad outcome. Korean words broke across lines; English lines ended with a single word.
- Root cause: default browser line breaking.
- Rule: use `word-break: keep-all` and `text-wrap: balance`. Check every render visually; a passing build does not prove the text wraps well.
- Status: resolved (templates use both properties)

### L-003 Accent color used twice in one frame
- Date: 2026-11-18
- What was tried: a cover design using persimmon for more than one element.
- Result: bad outcome. Broke the one-accent rule.
- Root cause: the rule was not stated per frame.
- Rule: persimmon (`#C4562E`) once per frame at most, as the date dot. Never for text, numbers or backgrounds.
- Status: resolved (rule in the brand guide)

### L-002 Caption sign-off date off by one day
- Date: 2026-11-18
- What was tried: caption sign-off used the post date.
- Result: bad outcome. The cron posts at 17:00 UTC, which is 02:00 KST the next day, so dates were wrong.
- Root cause: mixing the UTC post time with the KST shoot day.
- Rule: the sign-off date is the shoot date in Asia/Seoul. Never derive it from `scheduled_at` or the post time.
- Status: resolved (rule in the brand guide)

### L-001 Designed covers never reach Instagram
- Date: 2026-11-18
- What was tried: designing covers per the brand guide.
- Result: bad outcome. `reels_queue` has no `cover_url` column and the publisher sends no cover, so Instagram picks the cover frame.
- Root cause: the cover was designed before the pipeline could carry it.
- Rule: until the code ships, expect Instagram to choose the cover. Any real publish (L-012) goes out without the designed cover.
- Status: open (code change proposed by another session)
