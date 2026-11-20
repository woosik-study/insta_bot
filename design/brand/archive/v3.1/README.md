# Reels Brand and Content Guide

> Archived copy of v3.1. The sign-off rule is restored to the text approved on 2026-11-18 (Asia/Seoul shoot date). Two wording clarifications made after approval remain: the conditional CTA rule in section 6 and the length wording in section 3. Superseded by v4 in `../../README.md`.

Status: APPROVED v3.1 (2026-11-18). Design review signed off; approved by woosik. Replaces v2 (calm paper diary), archived in `archive/v2/`.

Account: personal daily-life vlog.

Language: **English everywhere** (covers, captions, hashtags, headlines). **On-screen subtitles are the only bilingual element**: English line on top, Korean translation below.

Direction in one sentence: **loud text, real footage.** Black and white, one acid-lime word per frame, huge condensed headlines, heavy outlined subtitles, fast cuts over unpolished real moments.

Why this direction (research, 2026-11-18; vendor and press sources, treat numbers as directional):
- Captions or text overlays appear in about 80% of viral clips in OpusClip's 1.95M-clip analysis; many viewers watch with sound off ([OpusClip](https://www.opus.pro/research/how-to-go-viral-instagram-reels)).
- The first 1 to 2 seconds decide retention; fast cuts and direct-to-camera storytime are leading 2026 formats ([Manychat](https://manychat.com/blog/instagram-trends-for-creators-2026/)).
- Adam Mosseri names watch time, likes per reach and sends per reach as the top Reels signals ([Lindsey Gamble](https://www.lindseygamble.com/blog/unpacking-instagrams-focus-on-sends-per-reach-a-timeline-why-it-matters-and-tips-for-creators-brands)).
- Instagram capped hashtags at 5 per post and Reel in December 2025 ([Social Media Today](https://www.socialmediatoday.com/news/instagram-implements-new-limits-on-hashtag-use/808309/)).
- Socialinsider data on 140K business Reels: 30 to 60 second Reels had the highest reach rate; small accounts see the highest early skip rates (relayed by [Bento](https://bentosocial.ai/blogs/instagram-hooks-reels), unverified at source).

Files in this folder:

| File | Use |
| --- | --- |
| `templates/reels-templates.html` | Editable source. Open with `#cover-photo`, `#cover-text`, `#hook`, `#subtitle` or `#safe-area`. |
| `images/cover-photo.jpg`, `images/cover-text.jpg` | Sample covers (1080x1920 JPEG). |
| `images/hook.png`, `images/subtitle.png` | Sample hook frame and subtitle frame. |
| `images/safe-area.png` | Safe-area overlay for 9:16. |
| `archive/v2/` | The approved v2 calm direction, kept for reference. |

---

## 1. Visual direction

### Color

| Token | Hex | Role |
| --- | --- | --- |
| Black | `#0A0A0A` | Dominant. Text covers, subtitle outlines, text on Volt. |
| White | `#FFFFFF` | Headlines and subtitle fill. |
| Gray | `#9A9A9A` | Secondary labels (location, cover dek). |
| Volt | `#D4FF3A` | Accent. **Exactly one word per frame**: a solid block behind one headline word, or the color of one subtitle word. Never two Volt words in one frame. |

Footage: real, slightly contrasty, no heavy grade, no LUT that tints skin. Darken a busy photo cover with a flat 35% black scrim, never a gradient.

### Type

| Family | Job | Weights |
| --- | --- | --- |
| Anton | Headlines and cover titles only. Always uppercase. Latin only. | 400 |
| Gothic A1 | Subtitles (English and Korean), tags, dek. | 700, 800, 900 |

Both are free on Google Fonts (SIL OFL). Gothic A1 covers Korean and Latin.

| Element | Font | Size / line height |
| --- | --- | --- |
| Text cover headline | Anton | 200 / 1.04 |
| Photo cover headline | Anton | 168 / 1.04 |
| Hook headline (in video) | Anton | 128 / 1.04 |
| Subtitle, English | Gothic A1 900, 10 px black stroke | 68 / 1.18 |
| Subtitle, Korean | Gothic A1 800, 8 px black stroke | 42 / 1.35 |
| Tag (`DAY 042 / SEOUL`) | Gothic A1 900, tracking 0.14em, uppercase | 32 |
| Cover dek | Gothic A1 800, Gray | 44 / 1.25 |

Spacing: 8 px base unit. Left margin 80 px on every frame. Everything is left-aligned.

### On-screen text

![hook frame](images/hook.png)

- **Hook headline:** Anton, uppercase, 2 to 6 words, one Volt word, top of the text-safe box. On screen from 0.0 s for at least 1.5 s.
- **Subtitles:** white Gothic A1 with a black stroke, bottom of the text-safe box. English on top, Korean translation below. One English line of about 22 characters, two lines at most. One subtitle on screen at a time.
- **Accent word:** the emotional or surprising word ("quit", "flooded"). Never a filler word such as "for", "a" or "the".
- **One Volt word per frame, counted across headline and subtitle.** While the hook headline is on screen, subtitles carry no Volt word.
- **Headline fit:** at most 10 characters per line at 168 px and 13 at 128 px. Re-render and check that nothing passes x 920 before export.
- **Headline backplates:** on an image, every headline line sits on a solid black backplate (padding 12 px 20 px 10 px, 8 px between lines) and the accent word on a Volt backplate. This keeps white text readable on any frame without a scrim and is the brand's signature device.
- **Grain:** a monochrome film-grain overlay at 14% over the whole frame, so graphics and footage read as one image.
- No boxes behind subtitles, no drop shadows, no emojis, no animated stickers. Word-by-word pop-in is allowed; bouncing or spinning text is not.
- The templates use `text-wrap: balance` and `word-break: keep-all` so no line ends on one stray word and no Korean word splits.

### Safe areas (1080x1920)

![safe area](images/safe-area.png)

| Zone | Pixels | Rule |
| --- | --- | --- |
| Top UI | y 0 to 250 | No text. |
| Bottom UI (caption, audio, username) | y 1500 to 1920 | No text. |
| Right action buttons | x 920 to 1080 | No text. |
| 4:5 feed crop | y 285 to 1635 | Cover headline must be inside this. |
| **Text-safe box** | **x 80 to 920, y 296 to 1500** | All text, every frame and every cover. |

The UI zones are conservative estimates, not yet checked on a real phone.

---

## 2. Cover images

The Graph API takes `cover_url` (a public JPEG) or `thumb_offset` (milliseconds into the video). Prefer `cover_url`.

Not wired yet: `reels_queue` has no `cover_url` column and the publisher sends no cover, so Instagram picks the cover frame until that ships.

| Photo cover | Text cover |
| --- | --- |
| ![photo cover](images/cover-photo.jpg) | ![text cover](images/cover-text.jpg) |
| The day's strongest frame, 35% black scrim, tag, giant headline with one Volt word. Default. | Black background, headline at 200 px, gray dek. For days with no strong still. |

Rules:
- Cover headline = the hook headline, word for word. 2 to 6 words.
- Tag reads `DAY NNN`, optionally `/ CITY`. NNN counts up by one per post.
- It must be true to the video. No promise the video does not deliver.
- Export 1080x1920 JPEG, sRGB, quality 85 to 90.

Export: edit the `[data-edit]` text in the template (replace `.footage` with an `<img>` for photo covers), then from `design/brand/`:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --virtual-time-budget=8000 --window-size=1080,1920 --screenshot="$PWD/cover.png" "file://$PWD/templates/reels-templates.html#cover-photo"
```

```bash
sips -s format jpeg -s formatOptions 90 cover.png --out cover.jpg
```

---

## 3. Hook and edit rules

Every rule below can be checked from the video file or the frame at 0 s.

- **Frame 0** is real footage already in motion. No black frame, fade-in, logo or title card.
- **0.0 s:** the hook headline is on screen and stays at least 1.5 s.
- **By 0.5 s:** the first subtitle is on screen.
- **First 6 s:** a cut at least every 2 s.
- **Formats that fit:** direct-to-camera storytime, challenge or experiment ("I quit coffee for a week"), before and after, "what happened today" fast recap.
- **Hook headline may** address the viewer or ask a question.
- **Hook headline may not** contain any banned term (section 6) or promise something the video does not show.
- **Length:** target 20 to 45 s (warn outside), hard range 7 to 60 s (block outside). Review after 28 posts (section 7).
- **No repeats:** the headline's first two words must not match any hook from the last 14 posts.

---

## 4. Caption formula

English only. Blocks separated by blank lines. 150 to 500 characters, hard limit 2,200.

```
[1. Hook line]   I quit coffee for a week

[2. Body, 1 to 3 short lines]
day one: headache by 11am.
day four: weirdly fine?
day seven: not going back. maybe.

[3. Prompt, optional]   could you last a week without it?

[4. Sign-off]   DAY 042 · 2026.11.18

[5. Hashtags]   #dayinmylife #dailyvlog #nocoffee #challenge
```

- Line 1 is the cover headline in sentence case, word for word. It must work alone in the one-line feed preview.
- Body lines are short. Lowercase is fine. Each line is at most 60 characters.
- Sign-off date is the **shoot date in Asia/Seoul**. The cron posts at 17:00 UTC (02:00 KST the next day), so the sign-off date is normally one day before the post date.
- No emojis, no links, no all-caps words outside the sign-off tag (`DAY NNN`).

## 5. CTA and hashtags

CTA:
- The only CTA is the optional prompt in block 3: one question of 60 characters or fewer, about the viewer.
- Use it on at most 2 of any 7 consecutive posts. The posts without it are the control group.
- Never ask for follows, likes, saves, shares or tags. Shares come from content worth sending, not from asking.

Hashtags:
- 3 to 5, lowercase English, at the end. Instagram's cap is 5.
- 1 or 2 broad tags from a rotating pool: `#dayinmylife #dailyvlog #vlog #storytime #reallife`.
- 1 or 2 tags for the day's specific topic (`#nocoffee`, `#rainyday`).
- `#<handle>_daily` once the handle exists. It counts toward the 5.
- Change at least 2 tags versus the previous post.

## 6. Banned terms (machine-checkable)

Hook headline, cover and caption. Match case-insensitive whole words or phrases (word boundaries), so `tag a` does not hit "tag along" and `secret` does not hit "secretly". Hashtags match by prefix.

- **Bait:** `wait for it`, `watch till the end`, `you won't believe`, `secret`, `part 2` (unless a part 2 exists).
- **Hard CTA:** `follow for`, `link in bio`, `share this`, `tag a`, `comment below`, `subscribe`. Bare `like` is allowed, to avoid false hits such as "felt like".
- **Conditional CTA:** `like this` and `save this` are banned only in CTA form: at the start of a line, or followed by `if`, `for`, `post`, `reel`, `video`, end punctuation or the end of the line. "felt like this was the day" and "I want to save this moment" pass; "save this moment" at the start of a line fails.
- **Hashtags:** `#fyp`, `#viral`, `#explore`, `#reels`, `#foryou`.

## 7. How we will know it works

Read per Reel at the day-7 snapshot. Use medians. Exclude posts with reach under 100.

| Metric | Formula | Measures |
| --- | --- | --- |
| Watch ratio | average watch time / duration | Hook and edit |
| Sends per reach | shares / reach | Shareability (top signal) |
| Likes per reach | likes / reach | Resonance |
| Comments per 1,000 reach | comments / reach x 1000, prompt vs no-prompt posts | CTA |
| Skip rate | in-app Insights only | Hook (availability unverified) |

Graph API field names (`ig_reels_avg_watch_time`, `reach`, `shares`, `likes`, `comments`) are unverified. Check them against current Meta docs before wiring them up.

Decision rule after **28 posts** (wait until 42 if fewer than 20 qualify). Change **at most one rule per 28-post block**, and keep a change only if its metric improves 10% or more:
- **Hook:** if median watch ratio is below 40%, shorten the target length to 15 to 30 s for the next block.
- **Prompt:** if prompt posts reach 1.5x the comments per 1,000 reach of no-prompt posts, allow 3 of 7. At 1.0x or less, drop it.
- **Hashtags:** do not tune. Mosseri says tags categorize, not distribute.

---

## 8. Pre-approval checklist

Run this before a row in `reels_queue` is set to `approved`.

**File (Graph API limits)**
- [ ] MOV or MP4, H.264 or HEVC video, AAC audio.
- [ ] 23 to 60 fps. 3 s to 15 min (target 20 to 45 s). 300 MB or less.
- [ ] 9:16, ideally 1080x1920.
- [ ] `video_url` is a public https URL that returns the file directly.

**Hook and brand**
- [ ] Frame 0 is moving footage with the hook headline on screen.
- [ ] First subtitle visible by 0.5 s, English over Korean, Korean translation checked.
- [ ] Exactly one Volt word per frame, counted across headline and subtitle. Only Anton and Gothic A1.
- [ ] All text inside the text-safe box.
- [ ] Cover headline = hook headline = caption line 1.

**Caption**
- [ ] Formula followed, 150 to 500 characters, English only, no emojis.
- [ ] 3 to 5 hashtags. Prompt used on no more than 2 of the last 7 posts.
- [ ] No banned terms (section 6).
- [ ] Sign-off date = shoot date in Asia/Seoul.

**Rights and safety**
- [ ] Music is original, licensed or none.
- [ ] No strangers' faces without consent. No addresses, plates or screens with personal data.

---

## 9. Agent spec alignment (applied 2026-11-18)

`docs/automation-agents.md` was updated with this text, approved by woosik. The Producer's text layout (line 127) now uses the text-safe box too.

- **Line 104:** "- duration_s: target 20 to 45 (hard range 7 to 60)."
- **Line 85** (Strategist idea hook): "hook (the hook headline on screen, 2 to 6 words, see the brand guide)"
- **Line 106:** "- hook: frame 0 is real footage in motion with the hook headline (Anton, uppercase, 2 to 6 words, one Volt word) on screen from 0.0 to at least 1.5 seconds; the first subtitle (English over Korean) is visible by 0.5 seconds; cut at least every 2 seconds in the first 6 seconds; no banned terms from the brand guide."
- **Line 107:** "- caption: English only, 150 to 500 characters (hard limit 2200), following the brand guide formula: line 1 is the hook headline in sentence case, 1 to 3 short body lines, an optional prompt question (at most 2 of any 7 consecutive posts), the sign-off `DAY NNN · YYYY.MM.DD` with the Asia/Seoul shoot date, then 3 to 5 hashtags. No emojis, no links, no hard calls to action."
- **Line 108:** "- cover_text: identical to the hook headline, 2 to 6 words, true to the video."
- **Line 150** (Reviewer check 5): "5. Craft: frame 0 shows moving footage with the hook headline on screen, the first subtitle is visible by 0.5 seconds, exactly one Volt word per frame, all text inside x 80 to 920 and y 296 to 1500, audio is audible, no black frames or glitches."
- **Reviewer check 7:** "3 to 5 hashtags" in place of "at most 5 hashtags".
- **Scene schema:** add a Korean subtitle field next to the English one.
