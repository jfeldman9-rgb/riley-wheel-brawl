## Fixes in this round (w3)

- Removed flipped background/floor repeats and replaced them with cached 24%
  alpha-crossfaded overlaps, feathered layer tops, and join haze across all five
  stages and the Taim roof. Review: `seams-stage1.jpeg` …
  `seams-stage5.jpeg`, plus `stage1-vs-lido.jpeg` … `stage5-vs-lido.jpeg`.
- Unified every rig state behind the processed connected-skin compositor with a
  shared rim/shading pass and no flat joint patches. Review:
  `joints-closeup.jpeg` and the four `walk-*.jpeg` strips.
- Re-proportioned Riley as a roughly ten-year-old, 64-unit child and routed the
  HUD through that same bake. Review: `riley-closeup.jpeg`.
- Rebuilt Be'lal as a distinct 104-unit male swordsman from the lunging turned
  Asha'man source, erased the fire weave, regraded him crimson/pewter/grey, and
  added a 0.55-height articulated sword used in every state and SWORD FLURRY.
  Review: `belal-closeup.jpeg`.

All images above are produced directly by `node tools/review.cjs`; no binary
art or screenshots are added by this text-only fix round.
