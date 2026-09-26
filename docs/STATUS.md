# Riley Wheel Brawl - W3 implementation status

Branch `rwb-w2`, based on the latest supplied-art commit on `rwb-w1`:
`5a576d4ca36a1054e5b7f41a4489e7141ae91a54`.
Runtime cache stamp: `?v=20260926-w3`. No changes to `main`; no merge.

## Changed

- All 52 supplied images plus two reproducible, clean-alpha model-sheet cutouts are allowlisted and registered. Five painted far/mid/near/floor compositions replace procedural scenery when files are available. Measured best-match source crops, narrow non-mirrored joins, transparent mid-layer edge feathers, and stage-tinted join mist eliminate the broad double exposures and hard repeat seams. The Black Tower uses its interior art for regular encounters and the roof background/floor for Taim.
- All enemy/boss cutouts, Loial, dialogue portraits, ten story stills, title key art and logo are connected. Missing boss portraits use face crops of their cutouts. Riley and Twinkle use their actual supplied model-sheet art, with edge-connected grey removed by `tools/prepare-rigs.py`.
- Twelve walking-character rigs preserve painted source pixels. Head, torso, upper/lower arms and upper/lower legs have authored bind joints. A connected triangle mesh blends upper/lower leg IK through the knees and coat hems, eliminating the hard segment gaps from the first W2 pass. Arms counter-swing visibly; rigid sole regions translate with measured painted contacts. The guard uses authored contacts for its overlapping boots. Partially transparent actors composite once so death fades do not reveal triangle seams. Kicks respect the authored leg length. Stance contacts stay fixed in world space until toe-off; stride advances with actual horizontal/lane displacement, not elapsed time. Arms counter-swing and the body bobs. Attacks, hurt and knockdown use the same rig. Idle uses the same processed connected composite; Draghkar retains its separate airborne wing motion.
- Consistent visual heights and foot origins, grounded shadows, per-stage lighting/grade, floor depth wash, hit sparks/rings, step/impact dust and fireball trails. Camera shake/punch was being calculated but not applied by Play; it now affects the world while the HUD stays stable. Foreground props remain below the fight lanes. Default control opacity is reduced, with the sticky controls, hit regions and user-adjustable setting retained. Large-HUD boss bars no longer overlap the player panels.
- Boss Continue restores HP, attack-cycle progress, attack coverage, phase two, and Taim rescue/readiness state. Death writes immediately; live boss progress writes once per second. An interrupted Twinkle readiness caption is replayed after Continue. Explicit Restart Stage still starts the stage over.
- Stage 4 clear persists `pendingReveal: 'callandor'`. Reload/Continue must replay the reveal; only acknowledging its last caption removes the flag. Callandor remains awarded and Stage 5 starts afterward.
- Incoming-damage scales are tuned per stage; boss move sets and hitbox rules remain intact. Chieftain attack-cycle advancement now occurs when a move activates, preventing a stagger during its tell from silently skipping that move.

## Verification

- `node tools/check.cjs`: passes. Includes inherited combat/campaign checks, every art path, w2 cache stamps, missing-image retry, all five boss Continue snapshots, final Taim readiness, interrupted Callandor reveal, fixed stance anchors and arm counter-swing.
- `node tools/soak.cjs`: **50/50 assisted clears**, all three attacks active for every boss on every seed. It retains the inherited HP top-ups and 99 lives; these are completion/coverage results, not unassisted balance results.
- `node tools/soak.cjs --natural`: **41/50 clears**, three lives, no HP top-ups. Same bot and seeds 1-10. Its exit status remains nonzero when any individual seed fails; the failures have not been hidden or converted to passes.
- The last committed Headless Chromium audit loaded all **54 images**. This round fixes its reference-asset stamp false positive, canvas framing, seam camera coverage, and render defects, but Chromium/Playwright is unavailable in this checkout, so the regenerated browser evidence still requires the documented review command. The deliberate Stage 3 missing-image fallback remains covered by that audit.
- The follow-up browser contact audit checks the actual rendered mesh triangles for all twelve rigs, both facing directions, diagonal travel, changing speed, and 30/60/120 Hz update steps: **zero measured sole drift/contact error** across 4,104 planted samples. It caught and fixed the Stone Guard overlapping-boot error. See `review/rendered-foot-contacts.json`.
- Screenshots are actual browser Canvas output. Fight captures use deterministic normal input, without replacing actor poses or injecting projectiles. Intro cards/expired subtitles are cleared for inspection. Walk strips, closeups and `rig-poses.jpeg` are explicit diagnostic views of the runtime rigs.

### Natural, three lives and no HP top-ups

| Stage | Clears | Seconds, min-max | Median damage | All boss attacks / seeds |
| --- | --- | --- | --- | --- |
| 1 - Emond's Field | 10/10 | 82.9-97.4 | 196.74 | 10/10 |
| 2 - Caemlyn | 9/10 | 58.0-73.2 | 238.25 | 10/10 |
| 3 - Shadar Logoth | 8/10 | 121.2-153.9 | 242.21 | 10/10 |
| 4 - Stone of Tear | 6/10 | 64.2-76.1 | 241.93 | 10/10 |
| 5 - Black Tower | 8/10 | 67.2-107.1 | 244.89 | 10/10 |

### Assisted, inherited top-ups and 99 lives

| Stage | Clears | Seconds, min-max | Median damage | All boss attacks / seeds |
| --- | --- | --- | --- | --- |
| 1 - Emond's Field | 10/10 | 81.8-96.1 | 211.97 | 10/10 |
| 2 - Caemlyn | 10/10 | 55.5-69.1 | 281.05 | 10/10 |
| 3 - Shadar Logoth | 10/10 | 116.6-147.6 | 259.25 | 10/10 |
| 4 - Stone of Tear | 10/10 | 61.6-82.2 | 288.13 | 10/10 |
| 5 - Black Tower | 10/10 | 69.7-109.0 | 245.65 | 10/10 |

Full seed rows: [natural](review/soak-natural.txt), [assisted](review/soak-assisted.txt).
[Check output](review/check.txt), [browser audit](review/browser-audit.json),
[visual review and reproduction](review/README.md).

## Still weak / limits

- The rigs deform single painted poses, not hand-painted animation atlases. Continuous skinning removes the previous knee/hem gaps and detached fragments, but long cloaks and extreme poses can still look elastic. Riley retains the front-facing model-sheet silhouette, so crossing legs read less naturally than a purpose-painted side-view walk. Source-contact tests now cover the rendered mesh, not just skeleton targets; they do not assess anatomical appeal or every edge pixel. Closeups, walk strips and the action-pose board expose these limits.
- Stage 1 is intentionally easiest at 10/10. Stage 2 is 9/10, slightly above the requested approximate 5-8/10 range. Stage 3 is still the longest encounter, and the ten-seed masher is not a substitute for child playtesting.
- Be'lal now uses a distinct male swordsman bake. All Trolloc variants share the supplied Trolloc cutout; their AI differs, but their visual silhouettes are similar.
- Painted repeats are non-mirrored and crop to per-layer best-match loop points. Opaque joins dissolve across only 6%; transparent middle layers feather to the far plate with a subtle mist column. Floor tops feather into the scene and near layers remain clipped below the fight lane.
- Graphics comparison with Lido is visual review, not an automated quality score. The committed Lido reference and five stage captures make that comparison reviewable; automated checks alone cannot certify that subjective gate.
- No new recorded voices, full physical gamepad/phone campaign run, or real-device performance certification. Existing controls and accessibility paths are retained; the current evidence is automated desktop/browser evidence.

## Fixes in this round (w3 final)

- Moved actor shading onto the cleared offscreen skin surface before its normal source-over draw, removing the canvas-sized rectangle around every character while retaining the shared shadow/rim pass.
- Cropped every painted plate at its measured matching columns. Opaque layers use a narrow 6% dissolve; alpha-bearing mid layers feather both sides over 10% and add low-alpha, stage-colored mist at the join. Floors retain a feathered top and haze.
- Re-baked Riley with a tight face/hair crop scaled 1.5x wide and 1.4x tall, overpainting rather than clearing his collar. The chin is feathered, the mesh torso/legs are shorter, and the check derives a 22.2% head height from the baked crop and collar anchor.
- Attached Be'lal's connected pommel/grip/guard/blade to the extended front wrist, behind the painted fist. SWORD FLURRY rotates it in that hand. Expanded warm/green/near-white weave removal includes a four-pixel feather and the coat now maps original luminance smoothly onto a deep-crimson ramp.
- Review seam strips now show cameras 0, 700, 1400, and 2000 with top-edge mid-join ticks. Reference assets are excluded from cache-stamp auditing and Riley's review canvas matches its viewport.
- `node tools/check.cjs` passes and the assisted soak remains 50/50. No binary evidence changed in this text-only round.
