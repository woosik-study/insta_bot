# AI Image visual brief

Status: APPROVED v4.1 (2026-11-19), with brand guide v4.1 (`README.md`). Design Review signed off; approved by woosik. Owner: Design. For: the AI Image Team.

This brief sets how every generated image looks, so any set drops into `reel-renderer/` and the brand's text without fixes. Production's per-episode brief says what is in each image; this brief says how it is drawn and where things may sit. Where they disagree, stop and ask woosik (`docs/team.md` section 3).

Lessons from the two Rudy test renders (2026-11-19):
- Episode 1: captions covered the character.
- Episode 2 over-corrected. The character was about 16% of frame height, the lower 40% was empty, and 0 to 11 s measured a full-frame mean luma of 32 to 58.

The rules below fix all three with numbers.

## 1. One look per series

- **Medium:** stylised 3D animated film still, one continuous seamless frame.
- **Lock per series:** one tool, one model, one style block and one character block. Write them in the series' first `prompts.md` and paste them word for word into every prompt. Episode 2 changed tool and leaned on a reference image instead of the episode 1 style block; that is exactly the drift this rule stops. A change of tool or model needs woosik's yes and a note in `prompts.md`.
- **Character sheet:** before episode 3 of any series, generate and lock one character sheet (front, side, back) and use it as the reference for every image.
- **Color:** slightly contrasty, muted. Color comes from light (warm lamps, cool dusk), not from saturated objects.
- **Light:** one clear key light per image, soft edges, motivated by the scene (window, lamp, streetlight, overcast sky). Night scenes are lit night: a lamp, window or streetlight lights the character's face. No neon overload, no HDR look, no rim-light halo on every edge.
- **Depth:** shallow depth of field; the character is the sharpest thing in frame.
- **Finish:** no film grain, no vignette, no lens dirt, no bloom. The renderer adds one grain over the finished frame (guide section 1 "Grain").

## 2. Palette and brightness

The graphics are Black `#0A0A0A`, White `#FFFFFF` and Volt `#D4FF3A`. The images leave room for them.

- **No Volt-like color:** no saturated yellow-green or lime area larger than about 5% of the frame.
- **Character yellow stays mustard:** Rudy's hoodie is mustard (warm, orange-leaning, desaturated), never lemon or lime.
- **No pure white blowouts** larger than a window or lamp.

Brightness, measured as the mean of the grayscale image (PIL `convert("L")`, 0 to 255). Starting values, not yet checked on a phone:

| Check | Value |
| --- | --- |
| Opening image, whole frame | 90 or more |
| Opening image, headline zone (y 296 to 620) | 110 to 230, no dark wall behind the headline (the black backplates read on bright sky; ep1 01 measured 159, ep1 05 217) |
| Every image, whole frame | 60 to 180 |
| Face box (section 3.1) | 90 or more (the face is lit) |
| Images in a row with a whole-frame mean under 70 | At most 2 |
| Lower band (y 1180 to 1920) | Standard deviation 15 or more: it continues the scene with texture, never a flat dark void. The deviation alone does not prove content (ep2 02 passes it at a frame mean of 30.5); the whole-frame minimum above catches that case. |

## 3. Composition zones (1080x1920)

Text is drawn in fixed places (guide section 1 and `reel-renderer/src/PhotoReel.tsx`). The renderer pushes in to 1.08 from the centre on every image. In story mode it also cuts to tighter crops of the same image, about the centre, in steps of 1.2 up to 2 (`CROP_STEP`, `MAX_ZOOM` in `reel-renderer/src/spec.ts`), whenever an image would hold longer than 2 s in the first 6 s. A source point at y lands at 960 + (y - 960) x zoom x 1.08 on screen.

| Zone | Pixels | Rule |
| --- | --- | --- |
| Headline (opening image only) | y 296 to 620, x 80 to 920 | Calm and mid-to-light: sky, wall, ceiling. No face, hand or action. |
| Subtitles and labels | y 1180 to 1500 | May hold legs, feet, floor and plain props. No face, hands or story action. |
| Instagram UI | y 1500 to 1920, and x 920 to 1080 | Legs, floor, scene continuation. Nothing that must be seen. |
| Push-in edge loss | outside x 40 to 1040, y 71 to 1849 | Cropped away at 1.08. Nothing important here. |

### 3.1 Character size and placement

**Face box:** the rectangle from the top of the head to the chin and across the head's full width, in source pixels. Record its coordinates per image in `prompts.md`. On Rudy the chin sits about 155 px below the eyes, so place the box, not the eyes.

| Image | Rule |
| --- | --- |
| Every image | The character is at least 25% of frame height (480 px). In at least 75% of the images in a reel it is 40% or more (770 px), head to toe or as much of the body as the shot shows. |
| Opening image | Medium shot. Face box inside y 640 to 1060 (below the headline, above the crop limit) and inside x 300 to 780. |
| Images that may get crop cuts: every image in the first 6 s, and any image whose script line has 2 or more sentences (the sentence punch-in, `docs/editing/playbook.md` section 3) | Face box, hands and story action inside y 640 to 1060 and x 300 to 780 (y 640 renders at 269, below Instagram's top UI). At the 2.16 maximum crop the visible source is x 290 to 790, y 516 to 1404, and y 1060 lands at y 1176, just above the subtitles at 1180. |
| All other images (moves only, no crop cuts) | Face box, hands and story action inside y 80 to 1130 (1130 lands at 1144 at 1.08). |
| Any image | Nothing important right of x 900, where the like and share buttons sit. |

The fix is to keep the face, hands and action high, not to shrink the character: legs and feet may run through the subtitle band and off the bottom edge.

Safety net, requested from Engineering: the planner skips any crop cut that would put the face box below rendered y 1176 or off the frame at that zoom, so an image that misses these limits loses the crop instead of hiding the face.

If a scene cannot meet these numbers, tell Production before generating. Do not move text to fit the image.

## 4. Output

- 1080x1920 JPEG, sRGB, quality 90, named `01.jpg`, `02.jpg` in play order, in `content/generated/<set>/`.
- Generate at 9:16 with a native width of 1080 px or more where the tool allows. A source under 1080 px wide must be noted in `prompts.md`; the renderer then caps its crop at 1.44 (requested from Engineering).
- Resize with one uniform scale, then centre-crop. No non-uniform stretching of any region (for example stretching the floor to push the character up). Regenerate instead.
- Record every prompt, the tool, the model, the requested and returned size and every retry in `prompts.md`.

## 5. Likeness

An upright stylised raccoon is a generic character, but the nearest known characters are RJ (DreamWorks, Over the Hedge) and Rocket (Marvel). Not legal advice, unverified.

- Keep Rudy's mustard hoodie and worn suitcase fixed. They set him apart.
- Before locking a series character, put the character sheet side by side with those two characters and confirm it reads as its own design.
- Never name a studio, film, artist or franchise in prompts or captions.

## 6. Checks before handing a set to Production

- [ ] Tool, model, style block and character block match the series lock, word for word.
- [ ] No readable text, letters, numbers, signs, logos, brands or labels anywhere. Writing-like marks are invented shapes.
- [ ] No real person other than woosik. Every other human is faceless: from behind, cropped at the shoulders, or a silhouette. No celebrity likeness, no named artist or studio style.
- [ ] No real landmark that identifies a specific place, unless the script names it and woosik approved it.
- [ ] Character size and placement meet section 3.1; face box coordinates recorded in `prompts.md`.
- [ ] Brightness meets section 2, measured and recorded per image in `prompts.md`.
- [ ] No Volt-like area over about 5%; hoodie mustard, not lime.
- [ ] No baked grain, vignette or bloom. No non-uniform stretching.
- [ ] Nothing in the image claims or implies the scene is real (no fake phone UI, timestamps, news banners or watermarks).
- [ ] 1080x1920 JPEG, files in play order, `prompts.md` complete.

Not verified: the exact pixel extent of Instagram's UI on a real phone (guide section 1), and the brightness values on a phone screen.
