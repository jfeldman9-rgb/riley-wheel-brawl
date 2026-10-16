# Stage 3 plates still needed

The files in `assets/bg3/` are labelled half-resolution stand-in cards (1086×362). The campaign loads those exact relative paths. While a plate's source is that size, `src/stage3-art.js` paints a deterministic Caemlyn stand-in into the same texture so Stage 3 is playable. The paint keeps the placeholder dimensions, so `plateScale` (double scale when `width * 2 === 2172`), floor tiling, parallax, and light positions stay aligned.

These stand-ins are not the production paintings. Replace the bytes below with the prompted 2172×724 plates (see `docs/stage3/prompts/`). A wider source skips the procedural paint and uses the file as-is. Do not flip `placeholder` in `assets/stage3/ART_STATUS.json` until the usual provenance (source, tries, contact sheet) is filled in.

| Texture key | File the game loads | Prompt | What the painting is |
| --- | --- | --- | --- |
| `far3_day` | `assets/bg3/bg3-far-day.jpg` | `docs/stage3/prompts/bg3-far-day.json` | Caemlyn from far off in golden afternoon: palace hill, outer wall, New City roofs. Opaque, 2172×724. |
| `far3_night` | `assets/bg3/bg3-far-night.jpg` | `docs/stage3/prompts/bg3-far-night.json` | The same skyline at night: indigo sky, torch-lit domes, cool moon rims. Opaque, 2172×724. |
| `mid3a` | `assets/bg3/bg3-mid.webp` | `docs/stage3/prompts/bg3-mid.json` | Left: New City market street. Right: the Queen's Blessing inn. Transparent sky, 2172×724. |
| `mid3b` | `assets/bg3/bg3-mid2.webp` | `docs/stage3/prompts/bg3-mid2.json` | Left: rooftops at sunset. Right: the royal palace garden at night. Transparent sky, 2172×724. |
| `floor3a` | `assets/bg3/bg3-floor.jpg` | `docs/stage3/prompts/bg3-floor.json` | Pale cobbles, seamless horizontally, 2172×724. |
| `floor3b` | `assets/bg3/bg3-floor2.jpg` | `docs/stage3/prompts/bg3-floor2.json` | Lead rooftop walkway at sunset, seamless horizontally, 2172×724. |
| `floor3c` | `assets/bg3/bg3-floor3.jpg` | `docs/stage3/prompts/bg3-floor3.json` | Moonlit garden gravel path, seamless horizontally, 2172×724. |

Normal maps (`*_n.webp`) stay the flat cards shipped with the placeholders. They are not replaced by the procedural stand-in.

Character sheets under `assets/stage3/chars/` are still marked `placeholder: true`. The yellow `PLACEHOLDER ART` tag is hidden only while a Stage 3 scene has `stage3Painted` set, because the backdrop was generated in memory. Shipping the real plates and clearing those character flags is what removes the stand-in for good.

## Status 2026-10-07: painted plates shipped (branch `rwb-w2-s3-plates`)

All seven plates are now painted, cel-style backgrounds (Grok Bot image generation, 1280×720 sources kept verbatim in `art-in/bg3/*.src.jpg`), post-processed by `tools/stage3/process_bg3_plates.py`. None of them is 1086×362 any more, so `ensureStage3Plates` returns early and the procedural stand-in no longer paints.

| Texture key | Shipped size | Processing |
| --- | --- | --- |
| `far3_day`, `far3_night` | 1280×427 | 3:1 band, rows 90–517 of the source at native resolution (the skyline sits around 47% of the height). |
| `mid3a`, `mid3b` | 2172×724 | 3:1 band with the street or parapet on the bottom edge. The flat magenta sky is keyed to real alpha with a soft edge, colour unmix and despill, then a premultiplied Lanczos upscale. |
| `floor3a`, `floor3b`, `floor3c` | 1080×360 | Horizontal light flattening and a min-error-seam horizontal wrap, so each plate tiles seamlessly. `floor3a`'s centre gutter is cut out. Periodic Lanczos resample. |

The far and floor plates are below 2172×724 on purpose. `tests/stage3-memory.test.mjs` caps the Stage 3 resident RGBA estimate at 110 MB, and seven full-size plates would come to about 131 MB. `farImg` sizes the far plate from the texture, and the floor tile scale is `fh / height`, so the on-screen layout is unchanged. The mid plates stay at 2172×724 because `plateScale` and the torch coordinates in `lights.json` assume that width. `tools/stage3/art-manifest.json` records the shipped sizes, and its `normalSize` field records the untouched 1086×362 flat normal cards.

**Approved 2026-10-07.** Jason approved these seven stills, so their `ART_STATUS.json` entries are `placeholder: false` with `source: "grokbot-image"`, `contactSheet`, and an `art` provenance block (`approvedBy`, source sha256, post-process). `tests/stage3-assets.test.mjs` allows that source only for these seven ids (`APPROVED_STILLS`). The prompt JSONs record `tries: 1` and `generatedWith`. `assets/bg3/plates.json` now carries `placeholder: false`.

The in-game `PLACEHOLDER ART` tag stayed on in Stage 3 at this point, because `placeholderArt` (`src/hud.js`) also counts the character sheets. They were cleared on 2026-10-07 by the character reskins below.

Follow-ups in the same PR:
- **Floor hand-offs** (world x 2540 and 3880): the next floor now fades in over 280 px with corner alphas `setAlpha(0, 1, 0, 1)`. It used to be a 200 px strip at 0.5 alpha.
- **mid3a → mid3b cut:** mid3b's left 240 px ease into a cool shadow. A pure alpha feather showed the far plate through translucent roofs.
- **Torches** (`lights.json`): they now sit on the painted lanterns. On mid3a that is the inn door pair at (1615,424) and (1835,422). On mid3b it is the rooftop street lamp (308,493) and the garden lanterns (1228,577), (1410,384), (1908,387) for the pair, (1914,547) and (2045,580).

## Status 2026-10-07: character reskins shipped (branch `rwb-w2-s3-chars`)

The grey `PLACEHOLDER` cards for `cutthroat`, `fade` and `riley3` are gone. Each atlas is built from an existing painted sheet by `tools/stage3/reskin_chars.py` (helpers in `reskin_lib.py`). Frames are copied 1:1 at the source pack scale (zealot and cutthroat 0.62, Byar and Fade 0.6, Riley 0.85). They are re-registered so the anchor and baseline land on the same pixel of the Stage 3 canvas, and repacked with a skyline packer. Identical frames share one rect. Normal maps are cut from the source sheet's own `_n`/`_nl` with the same rects, at half resolution like every shared atlas (`normalScale: 0.5` in `anims.json`). `reskin_status.py` writes provenance and `reskin_contact.py` writes the contact sheets.

| Sheet | Source | What changed |
| --- | --- | --- |
| `cutthroat` | `assets/chars/zealot` | Charcoal hood (was the helmet) and cloak/tabard, oxblood shirt (was mail), brown leather, copper fittings. Every anim key maps onto zealot frames: slash = slash, lunge = charge-up + shoulder charge, hold = guard/block poses, grabthrow = shield slam, shoved = hurt + guard break, stalk = walk at 140 ms, flee = flee. The 6-slot walk is the 4-pose zealot cycle with contact poses doubled (holds 90/90/130/90/90/130). |
| `fade` | `assets/chars/byar` | Black cloak and armour, black hair, pale grey face with the eyes and brows smoothed out. slash = Byar's combo (thrust on the active frame 4), lunge = rush, fear = volley/accuse poses (pointing on the aura frame), split = rage poses, blinkout/blinkin = the figure sinking into and rising out of the floor (generated from parry/riposte frames). |
| `riley3` | `assets/chars/riley` | Riley's own frames, unchanged: grabbed = hurt struggle loop, escape = back kick (hit on frame 1). |
| `fadePortrait` | `assets/ui/byar-portrait.webp` | The same recolour, with the eyes and brows inpainted. |

Contact sheets: `docs/stage3/shots/contact-cutthroat-reskin.jpg`, `contact-fade-reskin.jpg`, `contact-riley3.jpg`. `ART_STATUS.json` records `source: "reskin"`, the source sheet and its sha256, and `approvedBy`. `tests/stage3-assets.test.mjs` allows `reskin` only for the character ids (`APPROVED_STILLS`). This departs from PLAN rule 5 ("no recolouring ... existing sprites into new frames"; real art only from ChatGPT or Gemini). The owner asked for these reskins on 2026-10-07 as the replacement for the grey cards, so they are recorded as reskins, not as new paintings. The Fade's blink frames are also derived: the parry and riposte frames are cut at the floor line, darkened and frayed. The PLAN prompts remain in `docs/stage3/prompts/` for a future painted pass.

Texture memory (RGBA8 estimate, colour + `_n` + `_nl`): the Stage 3 character atlases dropped from 186.9 MB to 139.7 MB (MiB), and the Stage 3-only pages from 81.1 to 33.9. `tests/stage3-memory.test.mjs` now caps Stage 3 pages + plates at 66 MB (was 110; 62.0 today) and every Stage 3 character atlas together at 142 MB. Stage 2 is 124.6 MB. The Stage 3 total stays above it because the shared sheets alone (Riley 48.7, hound 22.4, zealot 13.2, archer 11.3, Loial 10.1 = 105.7) leave less than 19 MB for the cutthroat and the Fade at native density.

`src/stage4-art-thug.js` no longer paints its stick-figure stand-in over `cutthroat-0` once the sheet says `placeholder: false`, so Stage 4 shows the same painted cutthroats.

## Status 2026-10-07: story panels shipped (branch `rwb-w2-s3-story`)

The Stage 3 intro no longer shows the grey `PLACEHOLDER PAINTING` cards. That text was baked into the placeholder JPGs by `tools/stage3/make_placeholders.py`; nothing draws it at runtime. Jason approved three Grok Bot panels (sources in `art-in/story3/`, 1280×720):

| Panel | Lines | Subject |
| --- | --- | --- |
| `story3_panel_1.jpg` | `st3_story_01` | Riley from behind at the gates of Caemlyn, golden afternoon |
| `story3_panel_2.jpg` | `st3_story_02`–`05` | Basel Gill at the Queen's Blessing; Riley holds the blue ribbon |
| `story3_panel_3.jpg` | `st3_story_06` | Sunset rooftops; the cloaked figure flees with the bundle |

`tools/stage3/process_story3_panels.py` re-encodes each source at native size with `story_panel_1.jpg`'s own quantisation tables (about q86, 4:2:0, baseline). The files are 256 KB, 200 KB and 177 KB, against 235–364 KB for the Stage 2 panels. The same script writes `docs/stage3/shots/contact-story3-panels.jpg`, the `ART_STATUS.json` provenance (`source: "grokbot-image"`, source sha256, `approvedBy`) and `tries: 1` in the prompt files. `assets/story/` is outside the Stage 1 pre-fight audit, and the panels are queued only by Stage 3 (`STAGE_TEXTURES[3]`), so the 25 MB gate is unchanged. The decoded size is the same as the cards' (1280×720).

The HUD shows a panel full-frame (`setDisplaySize(VW, VH)`, no Ken Burns pan or crop). The caption box covers y 524–680 of 720. In every panel the main subjects sit above that: Riley's head and torso and the gate (1), Basel Gill's face and the ribbon (2), and the fleeing figure and Riley's fireball (3).

