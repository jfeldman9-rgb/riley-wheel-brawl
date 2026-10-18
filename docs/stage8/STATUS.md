# Stage 8 implementation status

Stage 8 is opt-in behind `s8=1`. Stage 7 advances only with both `s7=1&s8=1`. This is the main campaign, not Waygate Gauntlet. No protected file, image or atlas was modified by this continuation. No push, branch change or merge was attempted. Commit attempts after T12, T15 and T17 failed because `.git` is read-only; the outside process has been taking checkpoints.

## Task status

| Tasks | Status |
|---|---|
| T1–T11 | First-pass implementation complete: registry/flag compatibility, story plumbing, Shaido, allies/wolves, Taim volleys, circle/Callandor, Mat→Rand calls, link, Lanfear phases/clashes and finale/title return. |
| T12 | Bot implemented; normal 9/9, calls-on 9/9, 250 ms delayed-observation bot 8/9. Cohort fairness passes both provider eras. Individual seed ratios vary outside the interval; a per-seed fairness pass is not claimed. Full playable 1→8 GPU soak remains unmeasured. |
| T13/T14/T16 | Plumbing and absent-content stubs complete. All 65 voices, both commissioned music loops and nine new clips remain human-gated. No audio/video generated. |
| T15 code | Complete: 58 delivered images + 14 atlases wired unchanged, native drawScale 1, frame mappings, per-zone streaming/release, memory tool and tests. Browser art screenshots/review evidence remain unavailable in this sandbox. |
| T17 code | Complete: browser-hardening runner, stage-scoped phone CSS, pause/death/call/clash/exit hardening. Browser/device performance, full campaign soak and human playtest/sign-off remain open. Default enable intentionally not performed. |

## T12 fixes and evidence

The Z2 wave matches the planned Stone Dog/sister/Wise One/dancer roster. Circle anchors remain rooted and reachable after knockback. The bot finishes dodges, uses ordinary crate pickups, breaks guards and counters lunges with existing jump/attack inputs. It never changes player health, damage or enemy state. Lag uses historical actor/hazard observations rather than suppressing input polling. Lanfear reserves attack tokens during wind-ups and inherits any active volley shield on arrival. New attacks cannot overlap a Taim volley. Wise One bolts use the specified 380 px/s.

The final cohort ratios (calls-on / calls-off time) are **Mat 96.70%, Rand 98.55%**. Normal runs take **379.1–430.5 seconds** including captions/outro/credits, with zero volley deaths. Every attempted clash wins with eight presses before automatic completion. Per-seed times, deaths, clash presses and individual fairness ratios are in [campaign-results.json](campaign-results.json). The one lag failure is seed 97. The test retains the requested ≥8/9 threshold.

The unchanged Stage 7 lifecycle test passes: `callInFor(8)` and `(9)` still return `moilan`; Stage 8 selects its own provider via `provider8`/`CALL8`. The new actor implementation is named `stage8-shaido.js` because the unchanged Stage 7 memory test classifies every `shaido`-prefixed filename as Stage 7. The Stages 1–7 golden fixture is unchanged.

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

Pre-fight: **20,774,865 / 21,000,000 approved ceiling**, also below the **25,000,000** audit gate. Stage 8 source/art/voice/music and both clip-folder audit lines pass. [audit-summary.json](audit-summary.json) records exact bytes.

Latest focused Stage 8/Mat run: 19 files passed, 0 failed; subsequent new story/frame hardening tests: 3 passed, 0 failed. Final campaign regression: 1 passed, 0 failed (27 runs). Final full suite: **240 files passed, 3 failed, 243 total (173.54 s)**. All 20 Stage 8/Mat files pass. See [test-results.json](test-results.json).

Browser execution is **blocked**, with zero successful runs. Chromium exits with `setsockopt: Operation not permitted` ([browser-chromium-results.json](browser-chromium-results.json)); Playwright's WebKit executable is absent ([browser-results.json](browser-results.json)). Consequently no p95, art screenshots, real texture-growth or physical-device claim is made. The browser runner is ready for an environment that can launch a browser.

The three full-suite failures are environmental/workspace limitations: unchanged Stage 7 final/polish browser tests fail to launch Chromium (`setsockopt EPERM`); the Stage 6 working-tree guard sees `tests/fixtures/stage8-bytes.json` and the new Stage 8 actor test import updated for the module rename. The expressly approved Stage 7 ceiling edit is already committed. Protected control/HUD/engine files pass their byte-identity check. No existing earlier-stage test was edited to suppress a failure. Git commit remains blocked by the read-only mount; another outside checkpoint will clear the Stage 8 working-tree guard.
