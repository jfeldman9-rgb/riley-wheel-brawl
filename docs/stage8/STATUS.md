# Stage 8 implementation status

Stage 8 is opt-in behind `s8=1`. Stage 7 advances only with both `s7=1&s8=1`. This is the main campaign, not Waygate Gauntlet. Follow-up starts from committed `0cc69ec`. No protected file, earlier-stage test, image or atlas was modified by this continuation. No push, branch change or merge was attempted. Commit attempts after T12, T15 and T17 failed because `.git` is read-only; the outside process has been taking checkpoints.

## Task status

| Tasks | Status |
|---|---|
| T1–T11 | First-pass implementation complete: registry/flag compatibility, story plumbing, Shaido, allies/wolves, Taim volleys, circle/Callandor, Mat→Rand calls, link, Lanfear phases/clashes and finale/title return. |
| T12 | Bot implemented; normal 9/9, calls-on 9/9, 250 ms delayed-observation bot 8/9. Cohort fairness passes both provider eras. Individual seed ratios vary outside the interval; a per-seed fairness pass is not claimed. Full playable 1→8 GPU soak remains unmeasured. |
| T13/T14/T16 | Plumbing and absent-content stubs complete. All 65 voices, both commissioned music loops and nine new clips remain human-gated. No audio/video generated. |
| T15 code | Complete: 58 delivered images + 14 atlases wired unchanged, native drawScale 1, frame mappings, per-zone streaming/release, memory tool and tests. Supervisor screenshots were reviewed for the follow-up below; corrected browser screenshots remain pending outside the sandbox. |
| T17 code | Complete: browser-hardening runner, stage-scoped phone CSS, pause/death/call/clash/exit hardening. Browser/device performance, full campaign soak and human playtest/sign-off remain open. Default enable intentionally not performed. |

## T12 fixes and evidence

The Z2 wave matches the planned Stone Dog/sister/Wise One/dancer roster. Circle anchors remain rooted and reachable after knockback. The bot finishes dodges, uses ordinary crate pickups, breaks guards and counters lunges with existing jump/attack inputs. It never changes player health, damage or enemy state. Lag uses historical actor/hazard observations rather than suppressing input polling. Lanfear reserves attack tokens during wind-ups and inherits any active volley shield on arrival. New attacks cannot overlap a Taim volley. Wise One bolts use the specified 380 px/s.

The final cohort ratios (calls-on / calls-off time) are **Mat 96.70%, Rand 98.29%**. Normal runs take **381.0–451.3 seconds** including captions/outro/credits, with zero volley deaths. Every attempted clash wins with eight presses before automatic completion. Per-seed times, deaths, clash presses and individual fairness ratios are in [campaign-results.json](campaign-results.json). The one lag failure is seed 97. The test retains the requested ≥8/9 threshold.

The unchanged Stage 7 lifecycle test passes: `callInFor(8)` and `(9)` still return `moilan`; Stage 8 selects its own provider via `provider8`/`CALL8`. The new actor implementation is named `stage8-shaido.js` because the unchanged Stage 7 memory test classifies every `shaido`-prefixed filename as Stage 7. The Stages 1–7 golden fixture is unchanged.

## Screenshot follow-up (0cc69ec)

Reviewed all four supervisor captures in `/workspace/stage8/shots/`. Fixed the four requested issues in Stage 8 modules:

- The Stage 8 HUD hook replaces the inherited boss name and portrait with **LANFEAR / lanfearPortrait**, including normal campaign entry, `skip=boss`, and HUD recreation. `src/hud.js` is unchanged.
- Z2's `bg8mid3` canopy now starts at y=-24 with height 604, preserving its lower overlap with the floor at y=540. Its formerly visible, cropped top edge is above the viewport. No new texture or image edit.
- C1 now uses the paused panel path even in demo mode. Art loading also holds gameplay. The opening narration and all six Rand/Lews lines show delivered `story8p2`; Riley's final approach lines show `story8p4`. Missing art is hidden behind the caption deck, which still holds gameplay. Completion/skip releases the panels and resumes the fight.
- `skip=boss` now arms Taim at 60 seconds of gameplay. Normal entry preserves the existing volley clock. In Z3, a two-second reservation before each due volley prevents new enemy/boss wind-ups from starving it; already committed attacks finish, and the existing four-second postponement/skip safeguard remains. Lanfear shields throughout each volley.

**Z3 volley toggle:** `VOLLEY8.inBoss` in `src/stage8-volley.js` defaults to `true`. Set that single constant to `false` to disable Z3 volleys and their reservation window; an inherited volley is cleared on entering Z3 so Lanfear cannot remain shielded. No query flag is required. The 60-second cadence is gameplay time: pauses, cutscenes and strikes do not advance it.

Eight new regressions cover both boss entry paths, recreated HUD objects, canopy coverage, the asynchronous paused demo opening, missing-panel captions, a volley within the first 95 seconds of the actual skip-boss simulation, normal cadence across Z3 entry, and the disabled-toggle handoff. The bot and all damage/HP/attack timing constants are unchanged. The stricter per-seed call-fairness gate remains open; this pass does not claim it or change its threshold.

## Art and memory

Taim uses arms-crossed frame 0 (5 alias), arrival frame 3. Lanfear has 23 frames and its accepted 4.20 MiB sheet cap is tested at 4.21 MiB. Mat has eight frames; wolf pack/lead have six/eight; tether and aura are separate. Stone Dog hurt 9 preserves the delivered alias. The rounded foreground cap is unchanged; a soft alpha fade remains.

Circle/helper textures are freed before C6, and the boss set loads after C6. Display references are dropped before texture removal; generation guards reject late loader cache writes. All Stage 8 keys are released on exit, including transient panels and credits. Missing files retain code-drawn fallbacks with safe frame selection. No Stage 8 painted art enters the pre-fight download.

| Phase | Handoff total MiB | Actual static residency MiB |
|---|---:|---:|
| Z0 | 61.5 | 65.74 |
| Z1 | 69.3 | 67.02 |
| Z2 | 79.6 | 78.15 |
| C6 | 68.2 | 66.31 |
| Z3 | 72.6 | 71.15 |

Z0's static maximum includes the early Taim volley and Mat entrance. The handoff sprite/FX/UI totals are 6.84 / 16.27 / 24.92 / 13.48 / 21.56 MiB. The implementation's largest such set is **24.26 MiB**, below 26. With previous-plate overlap and four transient panels added conservatively, the source-RGBA upper estimate is **95.86 MiB**, below 105. These are static estimates, not measured GPU or iPhone results. See [texture-estimate.json](texture-estimate.json) and `node tools/stage8/memory.mjs`.

## Media and ending

[STAGE8-ASSETS-NEEDED.md](../STAGE8-ASSETS-NEEDED.md) lists every missing voice, music file and clip. Voices are caption-only; optional clips use panels or in-engine captions. Music keys reserve the two requested new paths and select shipped stage5/boss6 loops while absent, without failed file requests. Registration occurs only on Stage 8 activation, so earlier-stage music inventories remain unchanged.

The P4 scream is spoken once; a full finale clip cannot repeat it. Until a reviewed continuation cut exists, that path uses panels, with the two final quips during the playable sassy walk. The doorway closes, the silver crown rolls, and Riley flicks a wrapper. Credits are skippable, followed by CAMPAIGN COMPLETE and the title; demo/autostart flags are cleared at completion.

## Validation

Baseline outside-sandbox verification at `0cc69ec`: **1,817 passed, 0 failed, 2 skipped**, supplied by the supervisor; Chromium launched there. These are baseline results, not results for this follow-up.

Current pre-fight: **20,776,756 / 21,000,000 approved ceiling**, also below the **25,000,000** audit gate. Stage 8 source/art/voice/music and both clip-folder audit lines pass. [audit-summary.json](audit-summary.json) records exact bytes. Texture estimates above are unchanged.

The eight new follow-up regressions pass. Focused Stage 8/Mat run: **21 test files passed, 0 failed**. Full suite: **241 test files passed, 3 failed, 244 total (164.48 s)**. This sandbox reports file-level TAP totals; these are not the outside baseline’s individual assertion totals. See [test-results.json](test-results.json). Campaign rerun: normal 9/9, calls-on 9/9, 250 ms lag 8/9; cohort fairness Mat 96.70%, Rand 98.29%, zero volley deaths. [campaign-results.json](campaign-results.json) includes every seed and individual ratios.

Chromium still exits inside this sandbox with `setsockopt: Operation not permitted`; the follow-up launch probe reproduced that restriction. Updated rendered screenshots, device performance and GPU soak therefore require the outside supervisor. The reviewed supervisor screenshots are evidence of the original defects, not evidence of the corrected rendering. Git is read-only; no commit or push was attempted in this follow-up.

The three failures are the unchanged Stage 7 final/polish browser tests (Chromium `setsockopt EPERM`) and the Stage 6 working-tree guard (the updated Stage 8 byte fixture is not yet committed). A direct guard run passes protected-file byte identity and Safari syntax checks. No earlier-stage test was edited. The Stages 1–7 golden comparison and all 21 Stage 8/Mat test files pass. The outside process can commit the byte fixture and repeat the browser/full suite in its unrestricted environment.
