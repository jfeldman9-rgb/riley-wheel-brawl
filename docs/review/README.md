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
encounter. Screenshots are captured directly as JPEG at quality 92 to keep review uploads small; they have not been composited or retouched.

The browser audit includes a separate intentional failure test for `stage3-mid`:
one initial request, one retry, then a playable fallback. Its normal-load missing
and failed lists remain empty.

The background/foreground integration and source-detail comparison are visible
here. The follow-up replaces hard leg cuts with continuous skinning and rigid sole contacts; elastic cloth deformation and the front-facing Riley silhouette remain reviewable limitations. See
`../STATUS.md` for the exact natural/assisted tables and remaining weaknesses.

## Fixes in this round (w3)

`tools/review.cjs` now produces `stage1-vs-lido.jpeg` through
`stage5-vs-lido.jpeg`, `seams-stage1.jpeg` through `seams-stage5.jpeg`,
`walk-riley.jpeg`, `walk-trolloc.jpeg`, `walk-darkfriend.jpeg`,
`walk-cultist.jpeg`, `joints-closeup.jpeg`, `riley-closeup.jpeg`, and
`belal-closeup.jpeg`. The seam strips render camera positions 0, 700, 1400 and 2000 and mark each mid-layer join with a small top tick;
Stage 5's strip uses the Taim roof. Joint crops are genuine 3x runtime walk or
attack poses. The new files are intentionally generated rather than committed so
this fix-round diff remains text-only.

The final w3 renderer crops each scenery layer at measured best-match columns, limits opaque dissolves to 6%, and feathers transparent mid edges over 10% with a stage-tinted mist at each marked join. Floor tops retain a 24px-class feather and haze. All puppet states share a processed connected composite with one rim and
shading pass. Riley is the 64-unit child bake in gameplay and HUD; Be'lal is the
104-unit male, crimson/pewter swordsman bake with an articulated long sword.

### Final fix-round note

Character shading is composited onto the transparent offscreen skin, so it cannot tint the main-canvas background. Riley's enlarged head overpaints the original without clearing his collar; Be'lal's complete sword is attached to the extended front wrist and his fire weave is removed with a feathered halo. The audit ignores only `docs/review/` reference requests, not runtime assets. Playwright is not installed in the current checkout, so regenerate the JPEGs with the command above before visual sign-off; this text-only round does not claim refreshed images.
