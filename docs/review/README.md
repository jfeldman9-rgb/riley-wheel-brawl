# W2 review evidence

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

- `stage1-midfight.png` through `stage5-midfight.png`: regular fights with painted layers and effects.
- `stage1-boss.png` through `stage5-boss.png`: the five boss arenas, including the separate Taim roof.
- `character-closeups.png`: all twelve walking rigs, including Riley, Twinkle and Loial.
- `walk-riley.png`, `walk-trolloc.png`, `walk-darkfriend.png`: eight phases across a full stride, drawn by the runtime rig.
- Matching walk JSON files: maximum measured stance-contact drift and sample count.
- `cutscene-callandor.png`: painted reveal with the dialogue portrait and caption.
- `title.png`: supplied key art and logo.
- `lido-reference.png`: headless Chromium capture of level 0 from
  `jfeldman9-rgb/whale-lance-buffet-brawl`, commit
  `34fbd7c3728cf74f33988b99a39058717a38ecc9`, for visual comparison.
- `check.txt`, `soak-natural.txt`, `soak-assisted.txt`, `browser-audit.json`: complete verification outputs.

Fight captures use seeds fixed by `tools/review.cjs` and the normal update/input
path. They do not inject damage, an attack pose or a projectile for the screenshot.
They clear intro cards/expired subtitles and tutorial text to expose the scene.
Closeups and walk strips are diagnostic drawings, not representations of a live
encounter. No screenshots have been composited or retouched.

The browser audit includes a separate intentional failure test for `stage3-mid`:
one initial request, one retry, then a playable fallback. Its normal-load missing
and failed lists remain empty.

The background/foreground integration and source-detail comparison are visible
here; cutout seams and cloth deformation remain reviewable limitations. See
`../STATUS.md` for the exact natural/assisted tables and remaining weaknesses.
