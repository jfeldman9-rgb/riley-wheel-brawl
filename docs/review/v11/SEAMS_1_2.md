# 1.2 mid-layer seams: Stages 1-3

## Summary

- `joinscan.cjs` and `seams-visual-v11.cjs` pass, but the six Stage 1-3 mid-layer joins are visibly broken in game: cut trees, sky-tone edges, ghosted facades.
- The new check `tools/seam-continuity-v11.cjs` catches all six. It is not wired into CI.
- Cause: in each of Stages 1-3, plates a, b and c are three separate paintings, and no placement of them lines up. **All six joins need repainted join art.**
- Stages 4 and 5 have one continuous mid painting each (0 joins), so they pass.

## The check

**What it renders.** Offline real-art `StageWorld` renders (`soak.cjs` boot, `@napi-rs/canvas`), 1280x720 at renderScale 2, at each join centre (the same cameras as `seams-visual` and the in-game shots). These match the Chrome shots to a mean |ΔRGB| of 1.5-3.5 levels.

**What it measures.** Each join is compared against the same frame rendered with only plate P, then only plate N, both unramped:

- **ghost:** the worst 8-unit window of `min(|shown−P|, |shown−N|)`, after a 4-unit blur. This catches:
  - double exposure;
  - half-faded structures;
  - far-layer bleed.
- **cut:** the 2-px step where a plate ends without a ramp. Only rows where that plate is actually seen count.

**References.** Both scores are divided by the frame's own texture under a 2-unit misregistration, i.e. how a continuous painting looks when its halves are offset by 2 units.

**Pass/fail.** A join fails when ghost > 3.0× or cut > 2.0×.

**Calibration.** Synthetic continuous joins are built from each stage's real plates:

| control | score |
|---|---|
| shift 0-4 units | max 2.48× ghost, 1.38× cut |
| real joins | 3.52-10.15× ghost; cut up to 2.55× |

Continuous controls with a shift of ≤ 2 units must pass, or the tool exits 2.

**Outputs:**
- report: `docs/review/v11/seam-continuity/seam-continuity.json`
- crops (in-game frame + ghost map): `stage{n}-join{j}.png`
- unit test: `tools/seam-continuity-v11.test.cjs`

## Per-join results

| join | ghost | cut | result | cause |
|---|---|---|---|---|
| S1 j1 (stage1-mid→b) | 3.52× | 2.40× | FAIL | Different paintings. a's canvas crops a bare tree at its right edge, and a ends hard at x=720 (S1 has no `rampOut`). |
| S1 j2 (b→c) | 5.11× / 8.10× | 2.55× | FAIL | Different paintings. b runs 266 units under c and ends hard through c's sky. |
| S2 j1 (a→b) | 5.92× | 0 | FAIL | Different paintings. Also code defect 1 (below). |
| S2 j2 (b→c) | 7.75× | 0 | FAIL | Facade versus full-height palace wall. Also code defect 2 (below). |
| S3 j1 (a→b) | 6.36× | 0 | FAIL | Different paintings. Also code defect 1. |
| S3 j2 (b→c) | 10.15× | 0 | FAIL | Ruins versus full-height courtyard facade. Also code defect 2. |
| S4, S5 | — | — | PASS | Continuous plate, no joins. |

## Is it the placement?

No. `tools/seam-placement-search-v11.cjs` (results in `placement-search.json`) tries:
- every overlap over the right 60% of P;
- vertical offsets of ±76 px;
- scales of 0.8-1.225.

The best placement for each join is still 2.5-4.2× worse than a continuous painting misregistered by 2 units. It is only 0.60-0.89× of a random placement. A split of one real plate recovers its true offset exactly.

Code-side scale, height and vertical alignment are consistent within each stage.

## Code defects (secondary, not landed)

**Defect 1 (S2/S3 join 1).** The fade-out of a and the fade-in of b sit on the same columns, and both are composited source-over. Their alphas only sum to 0.75 mid-band, so the far layer bleeds through. On continuous art this alone scores 1.8-5.1×.

**Defect 2 (S2/S3 join 2).** b's fade-out sits 49 units right of c's fade-in.

**Fix.** A patch ('lighter' dissolve, b cropped to c's fade, crop-aware piece height) is kept outside the repo as `stages-seam-fix.patch`.
- It brings continuous dual-ramp controls to 0.09-0.32×.
- All existing checks still pass with it.
- It leaves the real joins failing.
- It is not committed: `js/stages.js` is outside the s4-startup diagnostic's allowed runtime files. It needs approval to extend that list.

## Art needed

Six join images. The full spec and edge-strip templates are in the external P2 report.

| image | size | covers |
|---|---|---|
| `stage1-join-ab` | 650×941 | world 560-840 |
| `stage1-join-bc` | 669×941 | world 1240-1528 |
| `stage2-join-ab` | 710×887 | world 540-820 |
| `stage2-join-bc` | 730×887 | world 1260-1548 |
| `stage3-join-ab` | 710×887 | world 540-820 |
| `stage3-join-bc` | 730×887 | world 1260-1548 |

Each image:
- is drawn at the plate's density (S1 2.3222 px/unit; S2/S3 2.5343 px/unit) and full plate height;
- has a transparent sky;
- has its left and right 24 units reproducing the neighbouring plates' pixels.

The code would insert each as a mid piece between P and N, with 24-unit dissolves and P and N cropped. This needs the patch plus `js/stages.js`, `js/artmanifest.js` and `assets/` changes, so it needs the same approval.
