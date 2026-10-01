# Combat-time speculative pose work

## Measured starting point

The reviewed parent is `9ef27affe732d7847c43bf2e23e24c6cd0ca2f7a`.
[Its completed acceptance run](https://github.com/jfeldman9-rgb/riley-wheel-brawl/actions/runs/36796847262)
failed the approved matched performance rule and the unchanged Callandor grip
assertion. Normal exact parity passed all 72 assertions. All ten candidate cold
medians passed; the highest was 388.3 ms.

All 304 candidate matched frame gaps over 33 ms began within the first two
seconds and followed active baking. Of these, 302 followed pending jobs. This
associates the failures with startup work; it does not identify the complete
cause of each gap. A callback's measured JavaScript time does not necessarily
include all deferred Canvas work or operating-system scheduling delay.

## Narrow candidate

The Puppet cache defines 24 pose keys per rig, including six kick keys `k0` to
`k5`. The runtime's `frameKey` selects those six keys only when an actor has
`attackMove`. Production assignments to that property are confined to Riley,
whose painted-frame renderer does not call `Puppet.draw`. Puppet dispatch instead
covers Trolloc and Shadow enemies, Loial, and a synthetic Twinkle actor. The
other assignment is the synthetic `actorFor` baking fixture.

The retained readiness traces contain zero observed kick-key priority-0 demand
attempts: 432 fight plus 54 cold attempts for the candidate and 444 plus 54 for
the control. Pending snapshots nevertheless contain 48 distinct kick-job names
across eight kinds. The traces alone do not prove global unreachability or
provide total per-kick CPU cost; the source dispatch analysis supplies the
reachability rationale.

The proposed optimization therefore defers only speculative kick-pose jobs
during active combat. It retains urgent requests, every idle/walk/attack/cast
pose, all non-pose work, all queued state, and full processing outside active
combat. This removes six of 24 keys from eager combat work, **not a demonstrated
25% saving in time**. It removes this work from active-combat frames, not from
the entire application lifetime. The retained jobs resume outside active combat;
their existing priority can precede next-stage prefetch work during a transition.
Transition and cold-readiness regressions must therefore remain visible.
Explicit kick-pose requests must still promote and render
normally, including future actors and diagnostic fixtures.

Idle preparation is deliberately retained. Deferring unseen rigs' idle jobs
could make newly spawned enemies invisible until their first requested rig is
ready. No absent-kind or camera-visibility filter is included.

## Accounting and acceptance

- The original queue length, queue-empty timestamp, and stage-ready definition
  remain truthful; intentionally deferred work is still pending
- Additional queue counts distinguish policy-deferred work from policy-eligible
  work. They are sampled at pump end, before later draw requests can change the
  queue. Eligibility does not assert that an asynchronous dependency is ready
- The original pump deadline, raster operations, image pixels, actor state,
  simulation timing, source artwork, and measurement boundaries stay unchanged
- Full native, exact-render, queue/lifecycle, promotion, transition, and browser
  checks are required. Readiness and fallback counts remain part of the report
- Performance is not established by offline tests. The same three serial
  live/candidate pairs and accepted per-cell rules remain blocking
- Normal parity stays at approved `4c9997521d62d91cb40abcd9623df334f1209618`;
  actual-live comparison stays at `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc`
- The Callandor expected pivot is unchanged and remains an open decision

## Rejected alternatives

Previous flush8/16/32 experiments and their measurements are preserved. A new
variant that merely postponed a readback until the next budget slice was
rejected before editing or running CI: it did not eliminate raster work and a
1-by-1 readback is not a specified whole-surface GPU fence. No hard 4 ms cap is
claimed for non-preemptible Canvas operations.

## Status

The focused offline test passes 17 checks, including ten actual main-loop phase
cases, and 48 exact decoded pose/facing comparisons against the unchanged
reviewed runtime. All 23 inherited test-source locks and the CI-policy integration
check also pass. Full native/render validation and the matched browser comparison
are still required. No new performance pass,
same-Mac comparison, physical-device pass, merge, or deployment is claimed.
