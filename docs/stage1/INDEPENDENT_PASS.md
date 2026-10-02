# Stage 1 independent correctness and evidence pass

Date: October 2, 2026. Base: `df4ef46477eb424ecd384154fa7feeff5ac7d70f` on `rwb-2`.

**Stage 1 remains playable, not accepted.** The unchanged guardrail is fight p95 ≤16.7 ms on both physical iPad and desktop. There are no new physical-device FPS claims here. No art/audio was generated, repainted, recolored, blurred, interpolated or counted as filler. No live/base branch was changed and no deployment or merge is part of this pass.

## Correctness changes

| Fix | Verification | Result |
|---|---|---|
| First two grab attacks were consumed by the throw condition | Production Riley hold tests: two knees, third attack throws, jump/back throw retained | PASS |
| Held enemies rejected their holder's knee damage | Only the actual holder, knee state, knee attack and reciprocal hold may damage the held target; bystanders remain excluded | PASS |
| Lethal light hits could leave armored boss alive | Chop and sweep lethal/nonlethal tests, single death notification | PASS |
| Sweep lacked its documented attack armor | Same damage, interruption rules and tuning as chop; heavy/down attacks retain their behavior | PASS |
| Thrown bodies could remain down forever | Landing resumes the animation; surviving bodies get up and lethal bodies finish dying | PASS |
| Esc/P/touch/gamepad pause had no gameplay handler | Independent manual/report reasons pause and resume the gameplay scene; input cleared at boundaries | Unit PASS; browser verification pending |
| Scene restart accumulated input handlers and stale HUD state | Listener unsubscribe, HUD shutdown/recreate, input and capture reset; current quality tier reapplied to recreated effects | Unit/static checks; browser restart verification pending |
| Normal demo callbacks could leak across pause/restart | Scene-clock follow-up inputs with player/bot/lifecycle checks replace wall-clock callbacks | PASS |

## Boss coverage

`?demo=boss-coverage&skip=boss` is a separate, opt-in input controller. It waits for actual melee tells, makes space for a natural charge/wall stun and phase-3 cart throw, and witnesses summons and a real cart. It never writes fighter HP, position, phase, cooldown or attack state. The report includes its observed coverage.

Eight seeded **combat-logic** simulations start with normal Riley 100 HP/3 lives and boss 360 HP, reach the actual stage-clear path and cover all phases, chop/sweep/charge/roar/lift/hurl, charge-wall stun, hounds and a cart. These use the production combat/input code and shipped frame holds, with explicit renderer/audio/timer stubs. They do not establish rendered playability, frame pacing, natural full-stage difficulty or device acceptance.

## Honest measurement and device capture

- Perf report pauses gameplay and offers Reset capture, Copy JSON and Save JSON. It is local only; nothing uploads automatically. Keyboard/touch controls are isolated from the report.
- The HUD now shows **fight p95**, separately from all-active timing, with an explicit >33.4 ms counter. Raw exports and threshold comparisons retain full precision. Display rounds upward to 0.001 ms, so 16.70001 cannot display as passing 16.7.
- The original conservative percentile index `min(N-1, floor(N*p))` is preserved. No percentile-definition change improves the score.
- Every positive active stall is counted, including stalls ≥1000 ms. Background, blur and manual/report pause boundaries are explicitly excluded, recorded and never bridged into a sample. Hit-stop remains included.
- Reset clears the baseline, counters, history and prior summary. Active suspension reasons remain effective. Rolling limits remain 1,800 all-active frames / 7,200 fight frames, with omitted counts disclosed.
- JSON records immutable URL SHA where available, build label, renderer/software flag, quality, render scale, DPR, viewport, browser/device details, allowed debug flags, raw samples and context history. This is frame cadence, not GPU execution time.
- A numerical sampled-p95 pass is not the two-device acceptance gate, a full-stage pass, or approval of lowered quality. Small samples and quality changes remain visible.

For a physical-device check: use a pinned preview, default graphics, landscape on iPad, foreground tab and sound on. Reset, close the panel and play a normal fight for 30–60 seconds; open Perf report and save/copy the JSON. Repeat separately with `?skip=boss`. Record model/OS/browser and visible stutter/control issues. A home-Wi-Fi cold load still needs a separate measurement.

## Content/load/memory audit

Run `node tools/audit-stage1.mjs`. The checked-in `evidence/content-audit.json` contains reproducible source inventory evidence.

- Riley: **72 / ≥150** unique named frames. Grunt **23 / ≥40**; spear and hound **16 / ≥40** each. These gates fail. Boss: 24 frames; the slice gate gives no separate numerical boss threshold. Atlas/frame references and positive holds are validated, not visual likeness.
- Static initial-content inventory, conservatively including complete music/all voices: about **16.5 MB / ≤25 MB**. Static budget passes; actual network transfer and **≤4 s cold load on home Wi-Fi remain unmeasured**.
- Shipped texture base levels total **224,841,500 bytes (224.84 MB / 214.43 MiB)** as RGBA8, including color and both normal-map directions. A full mip chain would be about **299.79 MB** before framebuffer/filter/canvas/driver allocations. This is an estimate, not GPU profiling. Characters alone are 155.66 MB base RGBA. The prior “fine on iPad” claim is withdrawn; device memory remains unverified. No unproven art/memory shortcut was taken.
- Hit-stop constants still provide 4 light / 9 heavy frames at 60 Hz. `sfx.hit` has three procedural components (tone/noise/tone); the planned sampled SFX library/intensity work is still absent.

## Remaining Stage 1 gate

| PLAN §10 condition | Status |
|---|---|
| Blind review ≥8/10 and ≥4 points over current 1.2 | Pending physical review; 1.2 is draft, live is 1.1 |
| Freeze-frame review 9/10 and Riley likeness | Pending human review |
| Animation density + ≥5 frames for every attack + enemy reaction sets | FAIL / incomplete; no filler frames added |
| Hit-stop 4/9 frames | Constants verified; perceptual review remains |
| Sampled layered hit audio | Incomplete; carried-over procedural audio retained |
| Dynamic light visual target, including fireball snow/fighter lighting | Existing implementation; current rendered review pending |
| ≥12 distinct actions and bot 20+ hit combo | Not established by this pass |
| Physical-device fight p95 ≤16.7 ms | UNMEASURED |
| ≤25 MB before first fight / ≤4 s cold load | Static inventory passes / physical cold-load timing unmeasured |

Co-op cast, music choice, blind review, physical-device results and release approval remain decisions/evidence for later. The next independent pass can build on these regressions to address genuine animation/impact-audio gaps and measured memory hotspots. It should remain focused on Stage 1 rather than bypassing its gate to expand all ten stages.

## Verification commands and limitations

```sh
for f in src/*.js tools/*.mjs; do node --check "$f"; done
node --test tests/*.test.mjs
node tools/audit-stage1.mjs
git diff --check
```

The new Stage 1 regression workflow runs syntax, deterministic regressions and the static asset audit. It does not label unmet art/device/review gates as CI passes.

At this pass's initial verification, local Chromium process sockets were restricted by the execution sandbox. Cloud-browser preview QA reached the hosting site's external-content notice and was paused pending permission to accept it. No current-head screenshot or physical-device FPS result is claimed without a completed run. Browser/CI results, when obtained, belong in the PR with their exact tested SHA.
