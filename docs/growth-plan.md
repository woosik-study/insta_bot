# Growth plan for photo reels

Status: DRAFT (2026-11-19). Owned by the Production Team. Not reviewed.

Decided by woosik on 2026-11-19: week 1 has 5 posts from 3 shoot days; the timestamp variant is adopted and enters as test 1 once the overlay ships; the sign-off date moves to the local time zone of the city woosik lives in; series B starts shooting in week 1 and first posts in week 2.

Still open, and blocking week 1: the series angle (section 1) and the licensed music source (section 7).

Evidence lives in `docs/photo-reel-concept.md` section 1.1. Each item below is marked EVIDENCE (cited there) or HYPOTHESIS (to be tested on this account). Nothing here promises reach. The plan controls content quality, consistency and format fit. It does not control ranking.

## 1. Positioning

Audience: United States first. Content: woosik's real daily life in the US, shot as stills.

| Series | Format | Example hook (accent word) | Photos to shoot |
| --- | --- | --- | --- |
| **A. Timestamped day** (lead) | One real day, a clock time on each photo, no voiceover | "UP BEFORE SUNRISE" (SUNRISE) | One photo per hour or event, from leaving home to the last thing at night. Include food, transit and signage. Shoot the same doorway or street at the start and the end. |
| **B. One week of** (weekly) | A small experiment or routine across 7 days | "I QUIT COFFEE FOR A WEEK" (QUIT) | The same angle once a day, plus the result. Needs 7 shooting days before the first post, so it cannot post in week 1. |
| **C. Interests dump** (occasional) | A statement, then 3 photos per interest | "NOT JUST FOOD" (FOOD) | 3 interests, 3 photos each. |

Why A leads: Later logged timestamp formats on 2026-10-23 and 2026-11-13 (EVIDENCE for the trend, not for reach). It is original material, and original creators get more reach than repost accounts (EVIDENCE, Mosseri via Uppbeat, 2026-11-03).

Open point: US daily life for a US audience has a lot of supply. The series needs a specific angle (a city, a routine, a job, a constraint) that woosik has not chosen yet. HYPOTHESIS: a narrow, repeatable angle earns more sends than a general diary.

The example hooks are placeholders until the angle is chosen. Every real hook is checked against the renderer rules (2 to 6 words, one accent word that appears once, at most 13 characters per line) and the guide's rules (accent on the emotional or surprising word, no banned terms, first two words not used in the last 14 posts).

## 2. Shareability with stills only

The brand guide bans asking for shares, so the content has to be forwardable on its own.

- Optimize for sends per reach. EVIDENCE: Mosseri names it for new creators.
- Hook lines that name a situation or a kind of person, so a viewer thinks of someone to send it to. HYPOTHESIS.
- A timestamp on every photo. EVIDENCE for the trend, HYPOTHESIS for sends.
- Up to 3 text beats of 2 to 4 words. EVIDENCE (weak): text overlay on music Reels gave +9.8% retention at 30 s in Emplifi's Facebook data.
- Loop ending: the last held photo matches the first. HYPOTHESIS.
- Series numbering with the guide's `DAY NNN` tag. HYPOTHESIS.

## 3. Format roadmap

| Order | Format | Renderer change |
| --- | --- | --- |
| 1 | Rapid-fire recap | None. Works today. |
| 2 | Timestamp variant | A `time` field per photo and a small overlay inside the text-safe box. |
| 3 | Small text | A small-text style in Gothic A1. |
| 4 | Statement plus topic bursts | Group photos by topic, 3 per burst. |

Later: an optional loop ending.

## 4. Posting plan

- Week 1: 5 posts from 3 shoot days (decided 2026-11-19). A series A reel is one real day, so 3 shoot days give 3 A reels. The other two are 1 series C reel and 1 rapid-fire recap of the week, both cut from photos not used in the A reels.
- Series B: shoot one photo a day from week 1; the first B reel posts in week 2.
- Cadence from week 2 is set after week 1, from how many days woosik could actually shoot. HYPOTHESIS: no verified source shows that daily posting beats 5 a week.
- At 5 posts a week the guide's 28-post review lands in week 6, not week 4.
- Keep the 17:00 UTC slot for the first 28 posts: 12:00 Eastern and 09:00 Pacific in winter. HYPOTHESIS; it keeps one variable fixed.
- Weeks 2 and later: keep the stronger series, retire the weakest once each has at least 8 posts.
- Captions and hashtags follow the brand guide as written, except the sign-off date: the shoot date in the local time zone of the city woosik lives in (decided 2026-11-19). The tag reads `DAY NNN / CITY`. The guide still says Asia/Seoul; the Design Team owns that change, and no post goes out until the guide and this plan agree.

## 5. Distribution by hand

Reach effects are all HYPOTHESIS. No bots, pods, bought engagement or automated messages.

- Pin the best reel of each series.
- Reshare each reel to Stories on the day it posts.
- One or two Collab posts a month with real, relevant accounts, invited by a personal message.
- Reply to every comment in the first 2 hours.
- No cross-posting until the music path allows it.

## 6. Measurement

Per post at day 7, medians only, posts with reach under 100 excluded (guide section 7): sends per reach first, then watch ratio, likes per reach, comments per 1,000 reach, reach, follower gain. Graph API field names are unverified.

Sends: the Analytics Team reported on 2026-11-19 that the Instagram API exposes `shares`, not sends. If that holds, the first metric is measured as shares per reach, which is also the formula in guide section 7. Unverified: not yet double-checked against Meta's docs.

Tests in priority order, at least 8 posts per arm, one or two at a time. Small samples are directional only.

1. Timestamp variant against headline only. Adopted on 2026-11-19; starts when the per-photo time overlay ships. Until then every reel is the headline-only arm.
2. 24 s (8 photos) against 40 s (16 photos).
3. Reel with baked-in music against a carousel with music added in the app.
4. Loop ending against a plain close.

Keep a series when its median sends per reach beats the account median. HYPOTHESIS; no benchmark was verified.

## 7. Risks and unknowns

- Baked-in audio (path B) may be distributed differently from Instagram audio. Nothing found.
- Photo slideshows may rank differently from video. Nothing found.
- The brand guide assumes speech and subtitles. Photo reels have no subtitles, so the guide's checklist item "first subtitle visible by 0.5 s" cannot pass as written. Design Team to add the exception.
- The guide's sign-off still uses the Asia/Seoul shoot date. woosik chose the local time zone on 2026-11-19; the guide is not updated yet.
- No licensed track exists yet. `test-120` must never be published.

Verify first: the licensed music source, the text-safe zones on a real phone, the Graph API metric fields.

## 8. First 7 days

Before day 1 (blocking):

- [ ] woosik: choose the series angle and name the city.
- [ ] woosik: choose the licensed track source. Engineering adds the track to `reel-renderer/tracks.json`.
- [ ] Design Team: change the sign-off rule to the local time zone and add the subtitle exception for photo reels.
- [ ] `docs/lessons-learned.md` is in the main checkout (today it is only in QA's worktree) and has been read.

Week 1:

- [ ] Production: week 1 calendar, 3 shot lists and at least 10 checked hook headlines in `docs/production/`.
- [ ] Shoot day 1: one full day, 16 photos, noting the time of each. Start the daily series B photo.
- [ ] Render reel 1 as a rapid-fire recap; check frame 0, the drop and the last frame. Check the text-safe zones on a real phone.
- [ ] woosik approves each post himself; reshare to Stories; reply to comments for 2 hours.
- [ ] Shoot days 2 and 3: two more series A days. Cut the series C reel and the week recap from unused photos.
- [ ] 5 posts by the end of the week; log each attempt; read day-7 numbers only at day 7.
- [ ] Engineering: per-photo `time` field and overlay inside the text-safe box, so test 1 can start in week 2.
