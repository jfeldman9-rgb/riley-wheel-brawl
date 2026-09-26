# W3 review evidence

Evidence is generated from `rwb-w2`; the PR embeds the required images directly.

## Reproduce

```sh
node tools/check.cjs
node tools/soak.cjs
node tools/soak.cjs --natural
CHROMIUM_PATH=/path/to/chromium node tools/review.cjs
```

The browser tool requires Playwright. `CHROMIUM_PATH` is optional if Playwright's
Chromium is installed. It serves the checkout locally, waits for painted images
and fonts, simulates normal gameplay input, and captures the real Canvas renderer.
The natural soak retains a failing exit code for failed individual runs; consult
its table rather than treating that status as an assisted-completion failure.

- `stage1-midfight.jpeg` through `stage5-midfight.jpeg`: regular fights with painted layers and effects.
- `stage1-boss.jpeg` through `stage5-boss.jpeg`: the five boss arenas, including the separate Taim roof.
- `character-closeups.jpeg`: all twelve walking rigs, including Riley, Twinkle and Loial.
- `walk-riley.jpeg`, `walk-trolloc.jpeg`, `walk-darkfriend.jpeg`: eight phases across a full stride, drawn by the runtime rig.
- `rig-poses.jpeg`: runtime walk, attack, channel, hurt and knockdown diagnostics for Riley, Trolloc and Darkfriend.
- `rendered-foot-contacts.json`: all twelve rigs; actual mesh-interpolated sole positions across both directions, diagonal travel, varying speed and 30/60/120 Hz steps. The browser command fails if drift/contact error exceeds 0.15 world pixels.
- Matching walk JSON files: maximum measured stance-contact drift and sample count.
- `cutscene-callandor.jpeg`: painted reveal with the dialogue portrait and caption.
- `title.jpeg`: supplied key art and logo.
- `lido-reference.png`: headless Chromium capture of level 0 from
  `jfeldman9-rgb/whale-lance-buffet-brawl`, commit
  `34fbd7c3728cf74f33988b99a39058717a38ecc9`, for visual comparison.
- `check.txt`, `soak-natural.txt`, `soak-assisted.txt`, `browser-audit.json`: complete verification outputs.

Fight captures use seeds fixed by `tools/review.cjs` and the normal update/input
path. They do not inject damage, an attack pose or a projectile for the screenshot.
They clear intro cards/expired subtitles and tutorial text to expose the scene.
Closeups, walk strips and the pose board are diagnostic drawings, not representations of a live
encounter. Screenshots are captured directly as JPEG at quality 85 to keep review uploads small; they have not been composited or retouched.

The browser audit includes a separate intentional failure test for `stage3-mid`:
one initial request, one retry, then a playable fallback. Its normal-load missing
and failed lists remain empty.

The background/foreground integration and source-detail comparison are visible
here. The follow-up replaces hard leg cuts with continuous skinning and rigid sole contacts; elastic cloth deformation remains a reviewable limitation; Riley now uses the top-middle side panel. See
`../STATUS.md` for the exact natural/assisted tables and remaining weaknesses.

## Fixes in this round (`w3b`)

`tools/review.cjs` retains every listed output, including four-camera seam boards for each actual stage, and writes oversized canvases through `toDataURL` rather than hanging on element screenshots larger than the viewport. All JPEGs use quality 85. Runtime plates are bottom-anchored at a minimum 896px width, so the 640px view contains at most one narrow, misted join.

Riley is runtime-baked from the top-middle side panel of `riley-sheet.jpeg`: the neutral-grey background is soft-keyed, the coat ends at the hip with trouser texture continued beneath it, and the 64-unit rig has a >=1/4.6 head plus short child limbs. `rig-riley.png` is fallback only. The transparent composite is cleared every frame and drawn once. Be'lal's blade is bound to his front hand and the pivot-like pommel dot is gone.

Playwright is not installed in this checkout, so regenerate the JPEGs with the command above before visual sign-off. This text-only round does not claim refreshed images.
