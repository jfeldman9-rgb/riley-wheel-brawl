# Stage 2 review pass, 2026-10-03

Draft review only. Work branch: `rwb-2-stage2`; PR #19 targets `rwb-w2`. No merge or deployment is part of this pass. Starting head: `ae700b1ab3f5ac86ed30df04135c63a978585a94`; gameplay comparison baseline: `0ef2dbdf005979c3aa0530609ea05d45d77033bf`.

## Smoothness first

**UNMEASURED for this pass.** Average FPS, fight FPS, fight p95, and counts/percentages of fight frames over 33 ms are not available for either build in any of the four requested scenarios (Stage 1 start/boss and Stage 2 start/boss, three repetitions each). No matched hardware/renderer run was completed. The cloud browser lacks the necessary WebGL path; a local Chromium launch failed at the environment's socket boundary and was not retried with a workaround. No physical iPad/Mac test was performed.

`perf.json` is historical SwiftShader evidence for build `a1886fb`, against `a483d02`. Its Stage 2 boss 23.45 average FPS / 23.18 fight FPS / 59.8% slow fight frames are **not** this pass's result, a `0ef2dbd` benchmark, or a device acceptance gate. The requested 60 FPS physical-device check stays open.

## Automated verification

- Final aggregate: **407/407 tests pass**, no existing tests or thresholds weakened
- Stage 1: every record and aggregate outcome across 18 runs (nine seeds × two modes) exactly matches both `0ef2dbd` and the previously checked-in evidence
- Evidence was regenerated to record legitimate `src/stage1.js`, `src/audio.js`, and `src/powers.js` hash changes; outcomes were not edited
- Syntax and whitespace checks pass
- Audit's actual fields: pre-fight inventory **PASS** below 25,000,000 bytes; shipped attack density **PASS**; total named frame-density **FAIL** remains for Riley 104/150, grunt 23/40, spear 16/40 and hound 16/40. Chieftain/Loial have no slice count specified. Physical-device gate **UNMEASURED**; blind, freeze-frame and likeness review **PENDING**
- Audit RGBA inventory remains 329,762,776 bytes. This is a static inventory, not measured GPU memory; the audit does not represent Stage 2's new background allocations
- Exact-head GitHub CI is enabled for this PR's existing base/head branches; see the PR checks for the final remote result

## Checklist

“Done” below means implemented and regression-tested. It does not imply device, listening or rendered acceptance where those are separately outstanding.

| Item | Status | Result / limitation |
|---|---|---|
| B1 music/rain fades | Done | Removed post-ramp assignment; realistic AudioParam fake and monotonic/overlap/reversal tests. Cleanup follows audio time through suspension. Chrome/iOS listening remains pending |
| B2 safe lane | Done | A due volley stops new boss attacks, waits for flying torches and complete 7.5 s patches, then marks safe bands. During volley, harmful active moves are cancelled and Byar retreats harmlessly toward 300 px. If cornered or chased he remains harmless rather than teleporting. Torch landing markers clean up |
| B3 powers | Done | Lightning, air whip, fire shield and Balefire tag power hits; guards/parry no longer block them. Normal and boosted fireballs still glance |
| B4 painted fire | Partial | Genuine painted barn overlay and 3 flame loops integrated; 1.5 s fade, small embers, grey NORMAL smoke. All accepted source/packed frames inspected. Rendered transition, registration and banner readability still need in-game review |
| S1 archers | Partial | ≤90 px/s draw tracking, frame-2 glint, 26 px hit window, third-shot fan from zone 2, separate shot/lob slots, modest lob lead; flight count still ≤4. Hits by seed 1,2,3,4,5,10,20,100,97 are **0,0,1,2,0,1,1,1,1**, below requested 4–8. No HP buff or gate weakening to force the target |
| S2 rush | Done | 0.55 s wind-up, glint and war cry at wind-up, bright lane marker |
| S3 lightning | Done | One soft pulse ≤0.15, no ambient jump; respects reduced motion and `?flash=0` |
| S4 audio lifecycle | Done | Phaser hidden/visible, interrupted-context recovery, captured user gesture recovery; terminal cleanup tested. Physical iOS behavior remains unmeasured |
| S5 rage wording | Not done | Existing line retained; design decision pending |
| S6 landing marker | Done | Filled bright-outlined disc and shrinking shadow for lobs and torches. In-game readability review pending |
| S7 light budget | Done | Stage 2 patches capped at 2; explicit combat-first visibility budget ≤10. Worst-case P3 regression creates more than 10 candidates and proves cap; this is logic evidence, not frame-time evidence |
| S8 fire cap reset | Done | Every scene create resets Stage 1 fire cap before stage-specific configuration |
| S9 particle governor | Done | Existing barn emitters, back rain and splashes thin when quality drops to 2; painted loops retained |
| S10 iPad memory | Not done | No actual iPad failure observed, so no speculative resolution/voice cuts |
| N1 command/retreat | Done | Uses existing painted command and retreat poses |
| N2 parry cue | Done | Shield-shaped UI icon while guarding and repeated NOW cue when open |
| N3 lane constants | Done | Bands derived from LANE_TOP/LANE_BOT, with original rounded boundaries preserved |
| N4 ribbon | Done | Auto-collected once on zone clear if left behind |
| N5 score/lives carryover | Not done | Design decision pending; campaign reset unchanged |
| N6 stage arrows | Done | 120×100 hit areas, repeated edge taps and outside-boundary routing tested with stubs; physical touch pending |
| N7 art refinements | Not done | Byar rush stride repaint, volley similarity, flee/rage/collar notes remain; no character art changed |
| N8 thunder | Done | Main noise reduced 0.42 → 0.30; other layers unchanged. Listening review pending |

## Added test gaps covered

- Safe-band reachability from all three bands when idle, hurt, or in each of the three combos
- Restart mid-volley/rage/torch disposes old marker/particle/light handles
- Pause preserves volley timer
- Continue after game over during P3 resumes boss2 with restart=false
- Touch title-arrow boundaries and repeated taps (stubbed UI)
- Hidden/visible, Safari interrupted state, gesture recovery, rejection/race handling, audio-time fade cleanup and terminal disposal (fake context)
- Actual power production paths against guarding zealots and parrying Byar, including normal/boosted fireball glance
- Painted asset metadata, frame counts, loading/release, looping and fade; light cap and late quality downgrade

## Art and visual evidence

Source: ChatGPT image generation, four calls. No paid API, fallback, Grok stills, Seedance or Manus. Processing is limited to cropping, uniform downscale and anchor registration/packing. No new frames were made by recolouring, blurring, stretching, mirroring or interpolating. Eave source cell 4 was rejected as too similar to cell 1. The eleven accepted flame cells were inspected both in source strips and the final contact sheet. No Riley or other character asset changed.

- [Exact prompts](prompts/barn-fire.json) and [provenance](prompts/barn-fire-provenance.md)
- [Registered barn before/after](shots/barn-fire/barn-before-after.jpg)
- [All accepted painted flame frames](shots/barn-fire/painted-flame-contact-sheet.jpg)
- [Runtime packing/anchor metadata](../../assets/bg2/barn-fire.json)
- Original generated source sheets and repeatable packer: `art-in/barn-fire/`

These are **static art comparisons/contact sheets**, not fresh in-game screenshots. Before/after game captures for the fire transition, landing/rush/parry markers, flash and touch UI remain unavailable. Existing `shots/` gameplay pictures show the pre-pass build. All provided individual images are below 10 MB.

## Remaining acceptance work

1. Matched three-repeat Stage 1/2 start/boss benchmarks versus `0ef2dbd`, then real-device play at the 60 FPS bar
2. In-game visual inspection of the painted overlay and loops, markers, banner and touch controls
3. Listening review in Chrome and Safari, plus the original voice/music listening review
4. Archer tuning to the requested 4–8 hits/run, without weakening survival or hazard bounds
5. Rage wording / score-life carryover decisions and outstanding character-art refinements

Stage 3 is outside this pass.

## File inventory

[Every changed file and its purpose](evidence/review-pass-files.md)
