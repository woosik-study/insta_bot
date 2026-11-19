# Photo Reel concept

Status: DRAFT (2026-11-18). Not yet reviewed by design review. Path B is implemented for local runs (section 4); the rest is not.

Goal: woosik uploads photos only. The pipeline returns a 20 to 45 second Reel cut to current music, in the brand look, queued as a `draft` in `reels_queue`.

This is a second format next to the talking vlog in `design/brand/README.md` (v3.1). Everything in that guide still applies (color, type, safe areas, banned terms, caption formula) except subtitles: a photo reel has no speech, so it has no subtitles.

## 1. Research summary (2026-11-18)

Vendor and blog sources. Treat numbers as directional.

| Finding | Source | Effect on the design |
| --- | --- | --- |
| Photo dumps still work for lifestyle and travel: stills with subtle pans or zooms, little polish. | [ContentStudio](https://contentstudio.io/blog/instagram-photo-trends), [Later](https://later.com/blog/instagram-reels-trends) | Real photos, light motion, no heavy effects. |
| Audio trends fade in 7 to 10 days; format trends last 3 to 4 weeks. | [Vaizle](https://insights.vaizle.com/instagram-reel-trends/) | Pick the track at render time, never from a saved list. |
| Hard cuts on the beat are the default; one photo per beat or strong hit; most cuts stay plain. | [PromptSeen](https://promptseen.com.in/capcut-beat-template/) | Beat grid drives every cut. |
| Transitions last 0.2 to 0.4 s; a 2-frame flash is the most versatile attention reset; punch zoom 100% to 115% and back on the drop. | [ARWriter](https://arwriterai.com/en/blog/best-capcut-effects-transitions-boost-views-2026/), [PromptSeen](https://promptseen.com.in/capcut-beat-template/) | Three allowed moves, listed in section 3. |
| No single best length. Studies disagree (16 s, 45 to 60 s, 90 s+). | [Buffer](https://buffer.com/library/instagram-reels-length), [Socialinsider](https://socialinsider.io/blog/instagram-reels-length/) | Keep 20 to 30 s as woosik's choice; it sits inside the guide's 20 to 45 s target. Review with the 28-post rule. |

Not found: reliable data on beat-synced photo reels versus plain slideshows. The edit rules below are craft conventions, not proven lifts.

### 1.1 Vlog-style Reels: verified findings (2026-11-18)

Primary audience: United States. Korea is secondary. Each number below was read on the source page on 2026-11-18. This section records evidence and proposals only; the rules in section 3 are unchanged until woosik decides (section 5).

**Length**

| Source | Sample | Result |
| --- | --- | --- |
| [Buffer](https://buffer.com/resources/instagram-reels-length), 2026-11-12 | 2.7M Reels, Jan 1 to Aug 15 2026, reach against each account's own baseline | 0 to 14 s -1.5%, 15 to 29 s -0.9%, 30 to 59 s +2.7%, 60 to 89 s +1.6%, 90 to 179 s +7.4%, 180 s and over -49.3%. The author calls the gaps under 90 s too small to plan around. |
| [Socialinsider](https://www.socialinsider.io/blog/instagram-reels-length/), 2026-07-14 | 9,771,822 organic Reels from brands with 1K to 1M followers, Jan to Jun 2026 | Median views: 0 to 30 s 4,700; 30 to 45 s 8,564; 45 to 60 s 10,374; 60 to 90 s 9,790; 180 s and over 4,428. |

Both studies put 20 to 30 s in their weakest band under 3 minutes. Socialinsider compares across brand accounts, so it shows correlation, not cause. This replaces the "studies disagree" row above for the 30 s boundary.

**Ranking**

- Adam Mosseri, interview with Colin and Samir, reported by [Uppbeat](https://uppbeat.io/blog/creator-news/whats-working-on-instagram-right-now-carousels-and-sends-says-adam-mosseri) on 2026-11-03: sends per reach is, for a new creator, "probably one of the most important metrics you could follow". Instagram leans on watch time less than its competitors. Original creators get more reach than repost accounts. The interview itself was not watched.
- Instagram's in-app alert, quoted by Buffer: "Reels over 3 minutes won't be recommended to new audiences."

**Formats in Later's trend log** ([Later](https://later.com/blog/instagram-reels-trends/), curated weekly, not measured reach)

| Date | Trend | Fit for photos only |
| --- | --- | --- |
| 2026-11-13 | Appointment timestamps: one event from walking in to walking out | Good with a time overlay per photo (inference) |
| 2026-10-30 | Small text zoom: small on-screen text carries the message | Good |
| 2026-10-23 | Vlog timestamps: the day in timestamped clips, no voiceover | Good with a time overlay per photo (inference) |
| 2026-10-23 | Refuse to be limited by a single niche: a statement, then a rapid photo dump per interest | Native |
| 2026-09-11 | Rapid-fire recap: flash-cut diary of a day, trip or season | Native |

**Retention** ([Emplifi](https://emplifi.io/resources/facebook-reels-data/), 2026-03-19, brand Facebook Reels, sample size not disclosed, so directional only)

- Text overlay on music-based Reels: +4% at 3 s, +6.6% at 10 s, +9.8% at 30 s.
- Slower pacing: +7.8% at 30 s.
- Speech in the first 3 s against music only: +11.7% at 3 s, +24.7% at 10 s. Music-only Reels get 11.9% more replays.

**Checked and dropped**

- "Rapid-fire photo dump" as its own trend: it is one element inside the single-niche trend.
- The three-panel "what I did" collage as a current trend: Later lists it on 2026-07-24, nothing since.
- A reported fall in average completion from 38.4% to 29.7%: vendor compilation with no stated method.

**Against the current rules**

- Supported: a text hook on a music reel, cuts on the beat, slow push-in, no voiceover.
- At risk, with data: the 30 s ceiling. Raised to 45 s on 2026-11-18 (section 3).
- At risk, opinion only: the all-caps backplate headline against a drift to small and lowercase text; the flash plus punch zoom pair, which is the stock beat-sync template recipe. No source measures either.
- Missing: a timestamp or date-stamp overlay, a small-text variant, per-topic photo bursts, tempo variation between calm and fast passages.

**Proposals** (1 adopted on 2026-11-18, the rest not adopted)

1. Raise the ceiling from 30 s to 45 s. The brand guide's target is already 20 to 45 s. Adopted: length now scales with the photo count (section 3).
2. Add a timestamp variant: a clock time or date on each photo.
3. Write hooks for sends: a line someone would forward to a friend.
4. Leave the edit style alone until the guide's 28-post review gives this account's own numbers.

## 2. Music: the hard constraint

Trending music cannot be baked into the video file. It is licensed to Instagram, not to us.

Meta's [Audio API](https://developers.facebook.com/documentation/instagram-platform/content-publishing/audio-api) attaches Instagram audio at publish time (checked 2026-11-18):

- `GET /ig_audio` with `audio_type=music` or `original_sound`. With no `search_query` it returns trending audio.
- Attach with `audio_configuration` (`audio_id`, `audio_volume`, `video_volume`) on the `POST /{ig-user-id}/media` container.
- **Facebook Login or Unified Login only. Not supported on Instagram Login**, which the publisher uses today.
- Needs a Facebook Page connected to the account. Creator accounts are supported.
- The catalog is what Meta authorizes for third parties and may differ from the app.
- No preview of the Reel with audio. No documented start offset or trim.

| Path | Music | Cost | Risk |
| --- | --- | --- | --- |
| **A. Audio API** | Real trending Instagram audio | Switch the app to Facebook Login, create and link a Facebook Page, new token flow | No documented start offset, so beat sync depends on the track starting at 0 s (unverified). Catalog may lack the track you want. |
| **B. Baked-in licensed track** | Royalty-free or licensed, mixed into the MP4 | None on the Instagram side; needs a licensed music source | Not "trending". Fully deterministic beat sync. |
| **C. Hybrid** | Render to path B, woosik swaps audio in the app when he wants a trend | Manual step on those days | Breaks hands-off posting. |

Recommendation: build the renderer against a beat grid so it does not care where the audio comes from. Ship path B first to prove the look, then add path A behind a flag once the Facebook Login switch is done and the 0 s start is verified on one private test post.

For path A the beat grid comes from the track's `download_url` preview. That URL can be null and expires after about 1.5 days, so analyze at render time and fall back to path B when it is missing.

## 3. Edit grammar

Input: 8 to 16 photos, any aspect ratio. Output: 1080x1920, 30 fps, H.264 + AAC, 20 to 45 s. The planner aims for about 2.5 s per photo and never under 24 s, so 8 photos give about 24 s, 12 about 30 s and 16 about 40 s. More photos earn a longer reel; a short set is not padded with extra replays.

**Structure**

| Part | Time | What happens |
| --- | --- | --- |
| Hook | 0 to 3 s | Strongest photo first, already moving. Hook headline on screen from frame 0 for at least 1.5 s. 3 fast cuts, one per beat. |
| Build | 3 s to drop | One photo per calm step: the whole number of beats nearest 1 s (2 beats at 120 bpm). Slow push-in on each. |
| Drop | the track's marked drop, or the beat after the build ends, never before 8 s | Punch zoom plus the one flash. Cuts go to one per beat for 8 beats (4 when 8 will not fit), replaying photos already shown. |
| Ride | drop burst to close | Replay continues at one photo per calm step, for as long as needed to reach the target length (20 to 45 s). Can be empty when the drop comes late. |
| Close | last 2 bars | Hold the final photo. Tag `DAY NNN / CITY`. No outro card. |

The drop and ride replay earlier photos, so 8 photos repeat more than 16 do. More photos means less repetition.

**Allowed moves** (nothing else)

- **Hard cut** on a beat. The default. At least 80% of cuts.
- **Push-in:** scale 100% to 108% across the photo's time on screen, linear. Alternate with a slow pan when the photo is landscape.
- **Punch zoom:** 100% to 115% to 100% over 6 frames, ease-out, on the drop and at most 2 more hits.
- **Flash:** 2 white frames. At most 2 per reel.

Not allowed: spins, glitch, 3D flips, page turns, shake longer than 6 frames, stickers, emojis.

**Framing**

- Portrait photo: fill the frame, crop from the center or a marked focal point.
- Landscape photo: fill and pan across it. Never letterbox with blurred copies of the photo.
- Faces stay inside the text-safe box when a headline is on screen.

**Brand devices** (from the guide)

- Hook headline in Anton on black backplates, one Volt word, inside x 80 to 920 and y 296 to 1500.
- Optional text beats: up to 3 more short lines (2 to 4 words), each on a beat, one at a time, never over the hook headline.
- Optional per-photo time (timestamp variant): each photo shows its clock time as `6:00 AM`, in the tag style (Gothic A1 900, 32 px, tracking 0.14em, white on a black backplate), at the bottom left of the text-safe box, on every showing of that photo including replays. Every photo has a time or none does. On the close the tag stacks 8 px above the time. The placement and style are provisional until the Design Team specifies a timestamp element in the brand guide.
- Monochrome grain at 14% over the whole frame.
- Exactly one Volt word per frame.

**Timing rules a checker can test**

- Every cut lands within 1 frame of a beat.
- No photo is on screen for less than 0.4 s or more than 3 s (except the final hold).
- A cut at least every 2 s in the first 6 s.
- Total duration 20 to 45 s; trim photos or beats to fit, never time-stretch the music.
- When any photo has a time label, every photo has one, written `H:MM AM` or `H:MM PM`.

## 4. Pipeline

1. **Upload:** woosik puts photos in a Supabase Storage folder (or the `/admin` page later).
2. **Order:** strongest photo first, then by capture time (EXIF). Manual order wins when given.
3. **Track:** path B picks from a licensed set; path A queries trending audio.
4. **Beat grid:** analyze the audio once into beat and downbeat timestamps plus the first strong hit.
5. **Render spec (JSON):** photos, per-photo in and out frames, move per photo, text beats, track id. Built by code from sections 3 and 4, so the same input gives the same reel.
6. **Render:** Remotion composition reads the spec and writes the MP4. The agent never hand-edits video.
7. **Check:** `video-check.ts` limits plus the timing rules above.
8. **Queue:** insert a `draft` row. Human approval stays on.

Renderer choice: Remotion. It is free for individuals and companies of up to 3 people ([license](https://www.remotion.dev/docs/license)), handles text and motion in React, and has official agent skills ([remotion-dev/skills](https://github.com/remotion-dev/skills)). ffmpeg alone can do Ken Burns but text layout and beat-timed motion are painful. Rendering on Vercel functions is unverified; plan for local or a render worker first.

### Implemented (path B, 2026-11-18)

`reel-renderer/` covers steps 2 and 5 to 7 for a local run. Photos play in file-name order. Tracks are listed by hand in `reel-renderer/tracks.json` with `bpm`, `firstBeatSec` and an optional `dropSec`; there is no automatic beat detection yet. The timestamp variant is built (2026-11-19): `--times <file>` takes a JSON object of photo file name to 24-hour time, such as `{ "01.jpg": "06:00" }`, with an entry for every photo. Times are typed by hand; they are not read from EXIF. The only track is a synthetic test tone, which must not be published.

```bash
cd reel-renderer && npm install && npm run track
```

```bash
node scripts/make-reel.mjs --photos <dir> --headline "One week in Seoul" --accent week --tag "DAY 001 / SEOUL"
```

Output: `reel-renderer/out/reel.mp4` and `out/spec.json`. Not built yet: upload from Supabase Storage, queue insert, beat detection, landscape focal points.

## 5. Open decisions for woosik

1. Music path: A, B or C (section 2). A needs a Facebook Page and a login switch.
2. Where the licensed tracks for path B come from.
3. Hook headline source: woosik types it, or an agent proposes it from the photos.
4. Where rendering runs: this Mac first, or a hosted worker.
5. Timestamp element: final placement and style, from the Design Team (section 3 uses the tag style for now).

Decided: length ceiling raised from 30 s to 45 s (woosik, 2026-11-18). Timestamp variant added (woosik, 2026-11-19).

## 6. Unverified

- Audio attached through the Audio API starts at 0 s of the track.
- `download_url` is returned for trending music tracks on a Creator account.
- Remotion rendering inside a Vercel function within the size and time limits.
- Whether beat-synced photo reels beat plain slideshows on watch ratio for this account. Measure with the guide's section 7.
- Whether Instagram ranks or distributes photo-slideshow Reels differently from video Reels. Two searches on 2026-11-18 found no study and no official statement.
- Whether a track baked into the file (path B) is distributed differently from audio attached in Instagram. Nothing found.
- Reels against carousels with music for a small account. [Fanpage Karma](https://www.fanpagekarma.com/insights/instagram-format-reach/) (3M+ posts, Jan to Apr 2026) gives median reach per follower under 10k followers as Reels 4.9%, images 3.5%, carousels 2.6%; another article from the same vendor reports carousels with 13% higher reach. Settle it with an A/B on this account.
- Mosseri's "watch time, likes, sends" as the top three signals: January 2025 statement, seen only through secondary pages.
- The edit-style drift to lowercase text, lo-fi and digicam looks: blog opinion only.
