---
name: photo-reel
description: Turn a set of photos into a 20 to 45 second beat-synced Instagram Reel in the insta_bot brand look. Use when asked to make, render, edit or review a photo reel, a photo dump reel, or a reel "from photos".
---

# Photo reel

Source of truth: `docs/photo-reel-concept.md` (edit grammar, music paths) and `design/brand/README.md` (color, type, safe areas, banned terms, caption). Read both before any work. If they disagree, stop and ask woosik.

Before any render, test or publish, read `docs/lessons-learned.md`, list the entries that apply, and add an entry for the attempt afterward.

## Steps

1. **Inputs.** Confirm 8 to 16 photos, the hook headline (2 to 6 words, one accent word) and the music path (A, B or C). Ask only for what is missing.
2. **Order.** Strongest photo first, then capture time. Keep a manual order when given.
3. **Beat grid.** Analyze the track into beat times, downbeats and the first strong hit after 8 s. Never time-stretch the music.
4. **Render spec.** Build JSON from the concept doc: Hook 0 to 3 s, Build, Drop, Close. Every cut on a beat.
5. **Render.** From `reel-renderer/`: `node scripts/make-reel.mjs --photos <dir> --headline "..." --accent <word> --tag "DAY NNN / CITY" --track <id>`. It plans the cuts, checks them, and renders `out/reel.mp4` (1080x1920, 30 fps, H.264 + AAC). Do not hand-edit video. Tracks live in `tracks.json`; the `test-120` track is a test tone and must never be published.
6. **Check.** Run the video validator and the timing rules below. Look at frame 0, the drop and the last frame.
7. **Queue.** Insert as `draft`. Never set `approved` and never call the publisher.

## Allowed moves

- Hard cut on a beat (at least 80% of cuts).
- Push-in 100% to 108% over the photo's time on screen.
- Punch zoom 100% to 115% to 100% in 6 frames, on the drop and at most 2 more hits.
- Flash: 2 white frames, at most 2 per reel.

Anything else (spins, glitch, 3D flips, stickers, emojis, blurred letterbox) is not allowed.

## Checks

- Duration 20 to 45 s, about 2.5 s per photo and never under 24 s (8 photos about 24 s, 16 about 40 s).
- Every cut within 1 frame of a beat. A cut at least every 2 s in the first 6 s.
- No photo under 0.4 s or over 3 s, except the final hold.
- Frame 0 is a photo in motion with the hook headline on screen for at least 1.5 s.
- All text inside x 80 to 920, y 296 to 1500. Exactly one Volt (`#D4FF3A`) word per frame.
- Only Anton and Gothic A1. Grain at 14%.
- Music is licensed (path B) or attached through Meta's Audio API (path A). Never bake a commercial track into the file.

## Report

State the photos used and their order, the track and its source, the duration, each check as pass or fail, and anything unverified.
