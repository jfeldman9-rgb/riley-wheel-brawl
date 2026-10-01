# Riley Wheel Brawl 1.1: review plan

## Starting point and authority

- Verified live 1.0: `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc` on `rwb-w2`, PR #9 merged, Pages deployment successful. This includes the cooperative campaign test and deferred story-art decode fixes added after the original 1.0 handoff.
- Candidate branch: `rwb-1-1-polish`. Draft PR targets `rwb-w2`; never direct-push `rwb-w2` or `main`.
- Jason and Grok review the complete candidate. Publishing requires Jason's fresh GO. A draft PR is not release approval.
- The original Grok workspace's `PASS2_PLAN.md` is unavailable here. These 50 work items preserve the scope supplied for this pass and can be reconciled with the original without losing work.
- Additional levels/cutscenes and a separate 500-improvement roadmap are future passes. They do not change this five-stage acceptance matrix.

## Evidence rules

All inherited acceptance tools remain protected by exact locks. The only specific source exceptions are the reviewed version-stamp literal and approved Callandor pivot expectation; their original sources remain archived. `tools/locked-tests-v11.cjs` enforces the unchanged remainder. The exact Normal reference and CI timing policy have separate explicit approvals documented in the review notes. New behavior is covered by additive tests. No failed gate is relabeled as a pass; no machine result is represented as a physical-device result. Runtime clocks and assistance are disclosed.

Performance comparisons run baseline and candidate on the same executor with identical browser, viewport, settings, inputs and instrumentation, three runs each. Cloud measurements are development evidence only. The required comparison on Jason's Mac remains a separate gate until that computer is available. Cold entries include all five stages, with music both on and off. Loading/preparation before entry is separately reported, not hidden.

## Fifty acceptance items

| ID | Work item | Acceptance evidence |
|---|---|---|
| 01 | Verify live 1.0 and branch from it | Exact SHA, merged PR and successful deployment; live HTML hash match |
| 02 | Open a draft review PR | New branch into `rwb-w2`; no merge or deployment |
| 03 | Correct current handoff documentation | Live 1.0 fact supersedes historical unmerged statements |
| 04 | Measure Jason's live baseline | Same Mac, three runs; blocked while offline |
| 05 | Resolve workflow-edit permissions safely | Parent/user handles any required permission expansion; do not change settings silently |
| 06 | Lock inherited acceptance rules | 23 protected tools; exact archived exceptions only, no other relaxed assertions or thresholds |
| 07 | Profile Stage 3 before optimization | Raw baseline draw-cost breakdown with environment clearly labeled |
| 08 | Cache completed background layers | Equivalent painted content and parallax; bounded cache memory |
| 09 | Remove redundant entry camera setup | One meaningful preparation path; save and camera state preserved |
| 10 | Bound and reuse sparks/trails | Effect cap and reuse tests; heavy impacts remain readable |
| 11 | Cache resized enemy sprites | Reuse measured at stable scale; no per-frame resize allocation |
| 12 | Invalidate HUD only on visible changes | No redraw for invisible timers or unchanged displayed values |
| 13 | Prepare stage backgrounds before fades | No uncovered/blank first frame; loading time disclosed |
| 14 | Start music after first visible frame | Frame-order regression; audio still unlocks on user gesture |
| 15 | Verify strict fight pacing | Absolute Stages 1/3/5: at least 59.5 fps and zero gaps >33 ms, still reported and required on real Chrome. Approved CI: three-run candidate median FPS >= live minus 0.3 and long-frame totals <= live, per stage/music cell; no clock manipulation |
| 16 | Verify strict cold starts | Every stage/music condition, three runs each; approved CI blocking median <400 ms, individual samples still reported |
| 17 | Fix Stage 5 enemy left-edge deadlock | Reproducing case progresses without teleporting a visible actor |
| 18 | Catch every offscreen enemy stall | Regression fails for any alive enemy offscreen >2 seconds |
| 19 | Keep Riley inside the left edge | Painted body remains visible in supported poses and facings |
| 20 | Validate every Callandor grip | Existing pose checks plus visual action-pose evidence |
| 21 | Preserve approved walk tear limits | walk3 ≤8px, walk4 ≤4px, walk8 ≤9px, all others ≤2px |
| 22 | Fix pause and resume flows | Repeated controls, interrupted states, no accidental resume |
| 23 | Fix Options BACK everywhere | Title and pause contexts; keyboard, pointer, touch and pad |
| 24 | Verify Continue across all five stages | Each stage/wave preserves intended checkpoint state |
| 25 | Preserve Hard and legacy saves | Current run mode survives; old saves remain Normal |
| 26 | Tune late Hard stage difficulty | 40-run clear aims S3/S4/S5 =50/35/25%; exact results reported |
| 27 | Preserve Normal difficulty | Each stage within 5 percentage points of freshly measured live 1.0 |
| 28 | Make big boss attacks readable | Distinct visible warning before active damage and clear recovery |
| 29 | Add brief get-up protection | Recovery invulnerability measured; no permanent immunity |
| 30 | Make Loial/saidin useful in Hard | Bounded, tested assistance without HP padding or trivial bosses |
| 31 | Run forty playthroughs per mode | Fixed existing seeds/controller, all five per-stage rates reported |
| 32 | Inventory every voice | Full line, speaker, path and objective signal audit |
| 33 | Audit pronunciation and robotic delivery | USER APPROVED current voices; no claim of agent listening or of which individual clips were auditioned |
| 34 | Regenerate only flagged stock-synth lines | Current voices USER APPROVED; no replacement needed. Future changes retain original stock voices/provenance, no cloning or paid service |
| 35 | Normalize dialogue consistently | Measured loudness/peak results; no clipping introduced |
| 36 | Verify ducking and voice exclusivity | Music ducks under speech; no overlapping voice sources |
| 37 | Deliver all changed-line auditions | Every new/changed line individually playable and identified |
| 38 | Polish heavy-hit sparks and small shake | Visible impact within effect/accessibility budgets |
| 39 | Paint five Riley victory poses | Genuine image-generated paintings, distinct poses, consistent model |
| 40 | Paint five boss defeat poses | Genuine boss-specific paintings; kid-friendly defeats |
| 41 | Match fighter shadows to stages | Stage-aware color/opacity and height scaling; art untouched |
| 42 | Add missing enemy intro cards | First encounter explains enemy and one useful tactic without input trap |
| 43 | Preserve Riley/TT character identity | Riley muscular 16, short dark hair, thin blue glasses, sleeveless black coat; TT age 8 |
| 44 | Scan background seams honestly | Inspect continuous camera positions; no blur/recolor/fake duplicate frames |
| 45 | Preserve Stage 4/5 panorama and brightness | Source assets unchanged; rendered comparison including Stage 5 roof |
| 46 | Improve iPad landscape touch safety | Readable button targets/spacing; sliding fingers cannot spend limited powers |
| 47 | Verify Xbox/PlayStation input | Standard mapping and disconnect handling; real hardware gate separate |
| 48 | Fit phone/iPad menus and How to Play | No clipped rows; reliable Back; simple action explanations |
| 49 | Deliver complete review evidence | Local + exact-commit GitHub results, screenshots, numeric pass/fail table, auditions and full-SHA preview |
| 50 | Hold release for review and fresh GO | Jason/Grok decide; only then deploy and verify live commit/screenshots |

## Current blockers (not waived)

1. Jason's Mac is offline, so same-Mac live/candidate measurements are unrun.
2. Physical iPad/phone and Xbox/PlayStation hardware are unavailable; automation will be labeled emulation.
3. Shell Chromium cannot create sockets in this executor (`EPERM`). Real-browser automated tests will run in GitHub Actions on standard free public-repository runners. Supported cloud-browser screenshots are visual checks only.
4. Agent audio input remains unsupported, but Jason has approved the current voices overall. Preserve this as USER APPROVED, not an agent-listening or per-clip-audition claim; no regeneration is needed.
5. Any GitHub login/permission expansion for Grok needs the appropriate account owner action. Existing repository code and workflow changes do not authorize expanding persistent access.

## Delivery checklist

- Exact candidate commit and `https://raw.githack.com/jfeldman9-rgb/riley-wheel-brawl/<fullsha>/index.html`
- Source and test commands, raw evidence and all exceptions
- Same-runner baseline/candidate comparison, plus the still-separate Mac gate
- Screenshots of gameplay, outcomes, menus, touch layouts and seam review
- Voice inventory/auditions, exact approved clip hashes, and separate user approval / agent-listening status
- Every acceptance item marked passed, failed, blocked, pending review or not run
