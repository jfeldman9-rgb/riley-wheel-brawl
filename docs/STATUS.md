# Riley Wheel Brawl - W3 implementation status

Branch `rwb-w2`, based on the latest supplied-art commit on `rwb-w1`:
`5a576d4ca36a1054e5b7f41a4489e7141ae91a54`.
Runtime cache stamp: `?v=20260926-w3c`. No changes to `main`; no merge.

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
- The last committed Headless Chromium audit loaded all **54 images**. This follow-up corrects the Riley and Be'lal defects found in those captures, but Chromium/Playwright is unavailable in this checkout (`node tools/review.cjs` stops at the missing `playwright` module), so the regenerated closeups still require the documented review command. The deliberate Stage 3 missing-image fallback remains covered by the prior audit.
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

- The rigs deform single painted poses, not hand-painted animation atlases. Continuous skinning removes the previous knee/hem gaps and detached fragments, but long cloaks and extreme poses can still look elastic. Riley now uses the supplied top-middle side panel, though it remains a single deformed painting rather than purpose-painted animation frames. Source-contact tests now cover the rendered mesh, not just skeleton targets; they do not assess anatomical appeal or every edge pixel. Closeups, walk strips and the action-pose board expose these limits.
- Stage 1 is intentionally easiest at 10/10. Stage 2 is 9/10, slightly above the requested approximate 5-8/10 range. Stage 3 is still the longest encounter, and the ten-seed masher is not a substitute for child playtesting.
- Be'lal now uses a distinct male swordsman bake. All Trolloc variants share the supplied Trolloc cutout; their AI differs, but their visual silhouettes are similar.
- Painted repeats are non-mirrored, crop to per-layer best-match loop points, and render at least 896px wide. Their narrow 4.5% overlap dissolves at the single possible on-screen join, with a subtle mist column. Floor tops feather into the scene and near layers remain clipped below the fight lane.
- Graphics comparison with Lido is visual review, not an automated quality score. The committed Lido reference and five stage captures make that comparison reviewable; automated checks alone cannot certify that subjective gate.
- No new recorded voices, full physical gamepad/phone campaign run, or real-device performance certification. Existing controls and accessibility paths are retained; the current evidence is automated desktop/browser evidence.

## Fixes in this round (`w3b`)

- Enlarged every far/mid/near plate to at least 1.4x the view width, bottom anchoring it and allowing the source top to overflow. Loop crops, narrow cross-fades, mist, and non-mirroring remain.
- Re-authored the 64-unit Riley rig around the sheet's top-middle side figure. Runtime baking soft-keys the grey, removes coat pixels below the hip, continues trousers beneath a short tunic, and enlarges the head beyond 1/4.6 height. `rig-riley.png` is fallback only.
- Removed the duplicate blurred actor composite; each freshly cleared transparent surface now reaches gameplay/review exactly once.
- Bound Be'lal's sword to the front hand and removed its dot-like pivot/pommel marker.
- Reworked oversized review captures to use offscreen-canvas data URLs, creates the correct stage for each seam board, preserves every requested output at JPEG quality 85, and stamps runtime requests `20260926-w3c`.
- `node tools/check.cjs` passes and the refreshed assisted soak is 50/50. No binary evidence changed. Playwright is unavailable locally, so refreshed visual evidence remains explicitly pending.

## Headless-render follow-up

- Riley now uses the measured 320x1140 side-figure crop. An edge-connected flood fill removes only the noisy neutral-grey exterior with a 28-40 colour-distance ramp; the short-jacket fill and 1.45x round-cheek head overlay both read back from that keyed canvas. Bind points, ankle contacts, and the authored 0.985 sole line match the measured figure.
- Be'lal's complete sword is attached to front-arm bones 2/3, painted over the body, and rotated as one wrist-local pommel/grip/crossguard/blade assembly during SWORD FLURRY. His crimson coat grade uses locally blurred luminance and a gentler blend to suppress posterised striping.
- The automated check now explicitly rejects a sword attachment other than `bones[3]`. Checks pass and the refreshed assisted soak clears 50/50. Visual regeneration remains pending solely because Playwright is not installed; no binary review evidence was changed.

## Fixes in this round (`w3c`)

- Restored the five skyline plates to their natural 222-260px height range. Narrow crops use one forward-only two-tile strip, and their per-layer parallax is capped so the full 2,360px camera range exposes no more than one soft internal join. Floor feathering, near clipping, haze, and non-mirrored rendering remain.
- Locked Be'lal's sword grip to the same barycentrically skinned front-wrist point used by the painted mesh and removed the sword-arm displacement caps. The headless regression samples SWORD FLURRY from `t=0` through `t=1` in 0.1 increments and requires less than 1.5 source pixels of separation.
- Replaced the coat recolour with a 5x5 blurred-luminance, smooth crimson ramp blended 70/30 with the source. Smooth masks protect skin while the existing silver-trim/hair treatment remains.
- Expanded `belal-closeup.jpeg` generation to idle, walk, and SWORD FLURRY at `t=.2`, `.5`, and `.8`; all previous review outputs remain in the script. Runtime resource and audit stamps are now `20260926-w3c`.
- This remains a text-only change: review binaries were deliberately not regenerated.
- Not achieved locally: Chromium evidence regeneration could not run because the checkout does not provide the `playwright` module. The review script and its under-two-minute timeout target are updated, but visual sign-off remains pending in the documented Playwright environment.
