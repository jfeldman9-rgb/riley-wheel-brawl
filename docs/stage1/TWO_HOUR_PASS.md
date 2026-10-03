# Stage 1 hardening and handoff

October 3, 2026. Scope: the Stage 1 slice on `rwb-2-stage1-evidence`, draft [PR #13](https://github.com/jfeldman9-rgb/riley-wheel-brawl/pull/13) into `rwb-2`. No merge or release is included.

**Stage 1 is still not accepted.** This pass fixes reproducible startup, combat, input, audio and resource-lifecycle defects and makes the remaining evidence more useful. It does not establish rendered gameplay quality, device performance, likeness or the missing art/audio targets.

## What changed

| Area | Defect and correction | Evidence |
|---|---|---|
| Startup recovery | A missing WebGL context previously left an endless loading screen. DOM recovery now reports the failure and offers Reload. Required-file and module failures use the same safe path. Failed/uninitialized scenes no longer update underneath it. | Startup tests; real cloud-browser before/after captures |
| Startup ordering | A held controller Start could run the game before the queued HUD scene built its title card. A HUD-ready handshake now preserves the request until the UI exists. | HUD/input and scene lifecycle regressions |
| Enemy entrance | Entering actors could attack while immune, or be grabbed into a hold whose knees did no damage. Entrance now owns a short inward walk before combat; both walls work even with Riley at the edge. Death still completes for entering adds. | Entry fixtures, full-stage runs and random-input invariants |
| Terminal state | Late hounds, carts and fire could interfere with a boss victory. Conversely, a last fireball could win after Game Over while leaving both terminal flags active. Victory is now committed once, cancels stale summons/death outcomes and replaces an already-shown Game Over, including its scheduled audio. | Forward/reverse race and projectile fixtures |
| Player controls | Interrupted air kicks could disable the next jump attack; overlapping keyboard aliases released each other; disconnected pads retained stale edges; Start failed at the title. These states now reset or route correctly. | Player/input regressions |
| Arena boundary | Post-physics body separation could push Riley outside a locked screen, especially at low or jittered update intervals. The existing fighter margin is enforced after separation. | Left/right wall fixtures and timing variants |
| DOM accessibility | Gameplay keys swallowed native recovery-button activation. Native controls now keep their keyboard behavior; report controls remain shielded and other DOM surfaces are inert behind the modal. | Input/report tests; browser click checks, keyboard browser test blocked |
| HUD lifecycle | Battlefield taps no longer act as controller Start. First touch after HUD creation repositions captions above the thumb controls. Corpse shadows retain their fade without copying Riley's invulnerability flicker. | HUD and shadow-alpha tests; perceived appearance unverified |
| Audio lifecycle | Decode completion reordered dialogue; pending barks overwrote captions; mute/restart could revive stale speech; finished one-shots remained connected. Voice requests now have ownership, canceled sources disconnect, and music/mute preferences remain coherent. | 26 mocked-WebAudio regressions; no listening claim |
| Graphics loss | Pinned Phaser stops drawing after context loss but otherwise keeps combat advancing. The game now pauses simulation and adds a separate perf exclusion until Phaser has rebuilt resources. Failed restoration stays paused. A DOM notice leaves report access available. | 13 pinned-renderer lifecycle tests plus DOM-notice checks |
| Replay resources | Cached atlas JSON was requeued, and released old-size render targets could stay pooled indefinitely. Cache-aware loading avoids six redundant JSON loads per replay; explicit quality transitions clear only released targets. | Loader tests and actual pinned pool-method tests |
| Evidence | Both combat simulation clocks now match tested Phaser animation behavior, including manual frame changes. A source-hashed report and freshness checks prevent stale results from silently surviving code edits. Atlas geometry checks allow new art without pixel locks. | Clock contracts, evidence tests and asset audit |

The shipped Phaser bundle reports version 4.2.1 and requests `webgl`/`experimental-webgl`. Earlier documentation calling the shipped renderer WebGL2 was inaccurate. The bundle and rendering stack were not replaced.

## What the automated evidence proves

The combined suite passes **233 automated checks**, up from 70 at the start of this continuation. Syntax, whitespace and the static asset audit also pass. These checks do not turn the open acceptance gates into passes.

The checked-in [full-stage report](evidence/full-stage-simulation.json) contains 18 runs: normal demo and boss-coverage input controllers over nine deterministic seeds. All 18 clear the three fight zones, six waves and Chieftain arena with the production starting HP/lives. Tests check exact initial enemy order, entry completion, lane/camera bounds, attack-token caps, one death notification per enemy, replay and logical transient-resource cleanup. Additional tests cover synthetic 30 Hz, 20 Hz and jittered update intervals, ordinary death/pause/continue, and a complete second run.

The maximum actual landed-hit combo in this final report is **18**. No 20-hit result is established. Earlier exploratory counters were withdrawn after the timer/animation harness was corrected; only the current source-hashed report is evidence.

The simulation runs production combat/input code and shipped frame holds with explicit renderer, HUD, audio, tween and scene-clock stubs. Particle/render RNG is not reproduced. Tween timing and timer cleanup are approximations. The tests are not a browser playthrough, a difficulty rating, a rendering/performance measurement, or a physical-memory test.

A separate exploratory 120-seed semantic-input stress sweep ran 1,470,713 frame steps after the entrance fixes, including 719 grabs, 41 natural continues and 1,164 pause requests. A later rerun after the shadow fix reproduced those same counts. It found no tracked nonfinite state, orphan hold, dead attacker, living zero-HP actor, long-stuck corpse or entering grab. Eight bounded versions of that input-invariant test are in CI. The archived runner/results are separate exploratory evidence; these counts are simulation activity, not 120 claimed clears, rendered frames or device FPS.

## Browser evidence and limitations

- Actual game preview: the managed cloud browser cannot create the WebGL context. The failure was reproduced, then the clear recovery UI and same-URL Reload action were observed. No current-head gameplay image is claimed.
- `tests/browser/dom-ui.html` is a labelled **DOM-only fixture**. It loads the real shipped DOM/CSS, input and report modules with a scene stub and records no timing samples. Open/reset/close, the no-samples report, touch-control hiding and report access above the graphics notice were checked in the cloud browser.
- The browser's keyboard action was denied twice, including the authorized retry. Keyboard shielding/focus behavior is unit-tested; a real-browser keyboard pass is not claimed.
- Save JSON displayed its download-request status, but the managed download event timed out, so completed file delivery was not verified. Copy displayed success, but the browser clipboard bridge did not return verifiable bytes. The report contents remain available in the textarea. These are explicit verification gaps, not a claim that device export is broken.
- The earlier local Chromium socket/sandbox failure is an inherited result; its original command and stderr were not available. A bounded read-only review found no supported cloud graphics provisioning route. No denied launch was retried, no security-reducing software-renderer flag was enabled, and no user computer was accessed.

Screenshots in the separate handoff archive are labelled by their exact build and purpose. The report/graphics-notice shots are fixture screenshots, not gameplay or physical-device evidence.

## Art candidate

Two genuine six-pose front-kick sheets were generated against the approved Riley masters. Candidate 1 is useful reviewable source, but neither sheet is integration-ready: contact boots cross nominal grid cells, and the correction attempt did not fix the framing. Original PNG bytes, prompts, checksums and per-frame QA are in the handoff archive. No candidate was installed or counted. Lossless extraction/registration, alpha-edge compositing, timing and in-game review are still needed before any integration decision.

## Unchanged open gates

- Riley **72 / 150** named frames; grunt **23 / 40**, spear **16 / 40**, hound **16 / 40**. Boss has 24; no separate numeric boss count was specified for this slice
- Eight of nine mapped player attack actions remain below five named frames; run kick still shares combo2's artwork. Counting references does not prove genuinely unique painted poses or anticipation/recovery quality
- Sampled hit audio and music-intensity layers remain absent. Approved voice/music files and the procedural synthesis recipes were retained
- Blind review at least 8/10 and at least 4 points above 1.2, freeze-frame review 9/10, likeness, dynamic-light appearance, and the full combat-depth target remain open
- Fight p95 **at most 16.7 ms on both physical iPad and desktop** remains unmeasured
- Static initial-content upper bound is **16,533,306 bytes / 25,000,000**. Actual transfer and a cold load within 4 seconds on home Wi-Fi remain unmeasured
- Base RGBA texture estimate remains **224,841,500 bytes**, before framebuffer/filter/canvas/driver costs. Default mipmaps are disabled; 299,788,667 bytes is only a hypothetical full mip-chain bound. Resource cleanup is not a measured GPU-memory or OOM fix

No threshold was lowered. No shipped image, animation manifest, music file, voice file, plan target, live branch, merge or deployment was changed by this hardening pass.

## Reproduce and continue

```sh
for f in src/*.js tools/*.mjs tests/*.mjs tests/helpers/*.mjs; do node --check "$f"; done
node --test tests/*.test.mjs
node tools/audit-stage1.mjs
node tests/helpers/run-full-stage-simulations.mjs > docs/stage1/evidence/full-stage-simulation.json
git diff --check
```

After changing combat sources or the simulation harness, regenerate its report before running the freshness test. Re-run the static audit after source/asset changes and refresh `evidence/content-audit.json` when recording a new snapshot.

Next priority is rendered Stage 1 QA in a supported WebGL environment: normal full-stage play, pause/report overlap, controller Start across load, both entrance edges, last-projectile victory, replay, and context loss/recovery. Then collect the unchanged physical-device perf/load evidence and complete genuine art/audio work. Keep Stage 1's gate before expanding later stages.
