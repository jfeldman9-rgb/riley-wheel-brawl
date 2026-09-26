## Fixes in this round (w3 final)

- Removes the actor-sized tint rectangles by applying the gradient to the cleared offscreen skin before the source-over canvas draw.
- Uses the supplied best-match crop points for every stage plate. Opaque joins crossfade only 6%; transparent mid plates feather to the far layer over 10% and receive a low-alpha, stage-tinted mist column. Floors have feathered top edges.
- Enlarges Riley's tight hair/face region 1.5x horizontally and 1.4x vertically, anchors the chin at the collar without clearing body pixels, feathers the chin, and shortens his rig proportions while retaining a 64-unit total height.
- Moves Be'lal's complete connected sword to the extended front wrist, layers the painted fist over its grip, keeps the attack flourish, removes the remaining warm/green/white weave with a four-pixel feather, and smoothly luminance-maps the coat to deep crimson.
- Expands seam evidence to cameras 0, 700, 1400, and 2000 with mid-join ticks; fixes Riley framing and excludes review-only reference assets from the runtime cache-stamp audit.

`node tools/check.cjs` passes and `node tools/soak.cjs` clears 50/50 assisted runs. The fix remains text-only. Playwright is not installed in this checkout, so the committed JPEGs were not regenerated here; run `node tools/review.cjs` in the documented Playwright environment for final visual sign-off.
