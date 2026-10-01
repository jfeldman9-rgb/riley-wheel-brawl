# Stage 4 startup attribution

This is a bounded, **instrumented diagnostic**, not an acceptance test. It changes
no runtime source, scheduler policy, pixels, audio selection, thresholds, controller,
or sampling boundary. It never calls a scheduler, readiness predicate, drain,
flush, additional RAF, or pixel readback on its own.

## Probe interface

`startup-probe.cjs` exports `installStartupProbe(world, options = {})`, which is
browser-serializable with `installStartupProbe.toString()` and uses no Node APIs.
Install it before page scripts to catch initial music requests and decoding.

- `attachR(RWB)`: call after the runtime exists, **before scene entry**. Wraps
  currently queued and future job callbacks and public audio methods. It returns
  no special scheduling state. Reattaching the same runtime is harmless.
- `mark(label, scalarExtra = {})`: records a performance.now marker and, when
  supported, `performance.mark('rwb-s4:' + label)` for CDP timebase alignment.
  Labels are bounded to 160 characters. A mark failure invalidates completeness
  but does not throw into game execution.
- `snapshot()`: returns an independent JSON-serializable report with events,
  feature support, `complete`, `overflow`, `droppedEvents`, `observerFaults`, and
  recent original audio trace context. Snapshot before restoring.
- `restore()`: removes owned wrappers, restores exact original descriptors, and
  silences pending Promise observers. It does not overwrite a later application
  replacement. Repeated restoration is harmless.

`maxEvents` defaults to 12000. At the cap, the probe stops accumulating events,
marks `overflow=true` and `complete=false`, and continues application execution.
No timing inference is valid from an overflowing, incomplete or faulted report.
Missing optional APIs are separate from installation failures; the driver must
validate its required feature names (`createImageBitmap`, `fetch`,
`Response.arrayBuffer`, `decodeAudioData`, `AudioBufferSourceNode.start`,
`canvas.getContext`, the four `canvas.*` operations, `Bake.enqueue`, `job.run`).
`performanceMark` is optional only when another reliable CDP alignment is used.

## What gets attributed

Events use performance.now milliseconds. `audioTime` is explicitly a separate
AudioContext clock in seconds. Source strings contain asset basenames only, with
query/fragment and path components removed.

- Bitmap calls: source dimensions/name and requested resize, synchronous native
  submission cost, Promise settlement latency, and active job/step identity
- Fetch → response.arrayBuffer → decode: correlated IDs and byte lengths, native
  call costs, settlement times, success/error callback timing, and original
  Promise identity preserved throughout
- Audio source starts: decoded-buffer ID, audio scheduling time, dimensions of
  decoded audio, loop state and native start-call cost; original audio trace
  pushes are copied with their unmodified audio clock
- Jobs: callback start/end, actual deadline, priority, state.phase before/after,
  presence of ready predicate/rig, done/throw status, and Canvas operations grouped
  by source-specific atom. **The probe never calls job.ready().**
- Canvas: per-step operation count/total/max and the first eight operations taking
  at least 1 ms. This 1 ms threshold only selects diagnostic detail; it is not a
  game or test budget. `slowOpCount` reports all matching operations even when
  only the first eight have details.

The private `advanceRig` state is not exposed in runtime. `job.state.phase='rig'`
alone cannot distinguish its texture/alpha/weights subphases. Native operation
signatures provide narrower, explicitly **inferred** atom labels:

- `rig-copy:strip-readback`: one-pixel-wide read following a drawImage
- `rig-shade:strip-readback`: one-pixel-wide read following source-atop fillRect
- `rig-pixels:getImageData`: wider rig readback
- `rig-alpha:*`: the current runtime's 64×96 alpha scratch canvas
- `pose-flat:*` and `pose-raster:*`: directly read from the public job state

These labels are tied to this source revision, not a general Canvas profiler.
Record source hashes in the driver. A texture-copy early return before the
existing rig-shade mark is a concrete instrumentation hole this fills.

## Minimal experiment contract

Use the exact current source, ordinary asset-ready boot and original keyboard
unlock, original Stage 4 / wave 5 / normal / lives 99 / callandor=false seeded
controller from `tools/performance-v11.cjs`. Keep the same two-RAF boundary and
unaltered ten-second acceptance sampler. Run three music-ON and three music-OFF
fresh contexts as a **separate diagnostic**, recording all results rather than
retrying to select a favorable run. Neither OFF results nor this instrumented
ON matrix substitute for the unchanged release gates.

A bounded CDP trace from immediately before scene entry through the first ~1.5 s
should include main-thread tasks, rendering/raster/compositor activity and user
marks. Capturing audio from page initialization is important even though this
short trace starts later. Align trace monotonic timestamps with the
`rwb-s4:scene-entry-start` user mark and the probe's performance.now marker. Preserve
both timebases; do not assume timeOrigin and CDP monotonic clocks match.

Interpretation:

1. Long `bitmap-return.syncMs` inside guard idle identifies synchronous image
   bitmap submission/resize work. Promise latency alone does not prove main-thread
   blocking or distinguish worker decode from queue wait.
2. Long Canvas atoms inside the callback identify texture copy/shade/readback or
   pose raster submission. Many small calls are cumulative work, not one atom.
3. Short measured callbacks followed by a frame gap require the timeline to
   distinguish deferred Canvas work, audio/background contention, another task,
   or browser/host scheduling. An API wrapper cannot measure off-thread raster
   cost or prove physical presentation.
4. Audio ON/OFF differences plus aligned decode/start events support a startup
   overlap hypothesis. Coincidence is not sufficient to call audio causal.

There are no CPU sampling profiles or screenshots/readbacks in the probe. Side
Promise observers add microtasks, callbacks are wrapped, and Canvas timings add
bookkeeping. Native return/throw values and Promise objects remain the same;
application callback order is covered in mocks, but instrumentation is not
zero-overhead or a guarantee of identical scheduling. Wrapper restoration holds
job references until restore, so this run is not uninstrumented GC evidence.

## Source audit and conditional next step

Inspected runtime: remote `1a930986076c20cdf6d1a8df0bfaadee7181e680`, matching local
source `4de8662733034fac101dbf2088748d9aaf7a5822` for the parent investigation.

- `js/puppets.js:83-94`: high-quality createImageBitmap resize is one native call
  with no internal slow-step mark. Existing timers start later at line 96.
- `js/puppets.js:110-118`: a copy-strip draw/read may return before either the
  rig-shade or rig-read marker. Absence of those marks does not exonerate readback.
- `js/puppets.js:121-138`: shade/read marks are cumulative from the same t0,
  not exclusive costs; neither enforces preemption within a native operation.
- `js/puppets.js:217-236`: 1.2 ms/8-iteration checks happen after atomic work.
  Promise readiness prevents polling, but cannot bound a synchronous bitmap call.
- `js/puppets.js:431-517`: flat-pose draw+readback lacks a separate mark; raster
  drawFace timers measure submissions, not deferred presentation work.
- `js/audio.js:463-514`, `js/main.js:287-293`: new music starts after the first
  visible frame via a timer; audio decoding/start completion is outside normal
  frame-cost rows. A post-RAF timer is not proof of physical display completion.
- `js/content.js:26-29`: title/story/all five stages share the same main track.
  Music may already have been requested before stage entry.
- `js/puppets.js:646-650, 724-764`: S4 includes nonvisible guard/darkfriend/ashaman
  idle work. Moving those jobs merely out of the sampled window would conceal
  the defect and could degrade subsequent readiness.

Existing three-run evidence has one 66.7 ms candidate gap per S4 ON run at about
+50 ms. Adjacent measured frame work is only 5.1/5.2/12.2 ms. Guard idle is 14.1/
13.7 ms one frame earlier in runs 1/2 and 8.8 ms immediately before run 3's gap.
This does **not** identify the responsible native atom. All candidates start with
music not yet playing; baseline starts playing in two of three runs. Candidate
boot is ~1.4 s versus baseline ~2.8 s, so unchanged sampling can now expose work
that previously completed before sampling. This is an overlap clue, not proof.

Do not change runtime until the diagnostic identifies an atom. Smallest candidate
branches, only if supported by observed data:

- Synchronous bitmap resize dominates: first assess removing the optional
  pre-resize and using the existing rejection-fallback strip path, with exact
  decoded-pixel/pose/lifecycle checks. It may change sampling or move work to
  drawImage, so it is not a presumed equivalent optimization. A cached/prepared
  resized source preserving actual pixels is a separate larger option.
- Copy/shade/flat readback dominates: reduce the demonstrated atomic strip extent
  only where cost scales with that extent. First-read materialization may have a
  fixed cost; changing every canvas to willReadFrequently conflicts with an
  existing documented first-blit regression and is not a safe global fix.
- Deferred raster dominates: bound actual raster submissions with existing
  priorities and publish only completed surfaces; do not simply move work past
  the metric boundary or change visible outcomes.
- Audio dominates: preserve first-frame music semantics and music-on coverage.
  Investigate the specific decode/start task before proposing a change. Muting,
  waiting for music before sampling, delaying music past capture, changing the
  track or relaxing the gate are not acceptable fixes.

## Offline tests

Run `node tools/diagnostics/s4-startup/startup-probe.test.cjs`. These are mocked
semantic/attribution checks only. They launch no browser/server and do not claim
browser performance or prove native API cost.

## GitHub-only driver

`run-startup.cjs REVIEWED_ROOT OUTPUT --run-browser` requires the authorized
GitHub Actions environment. It refuses a runtime differing from full commit
`1a930986076c20cdf6d1a8df0bfaadee7181e680`; the controller function is extracted
from the existing acceptance script and checked against a fixed SHA-256.

The driver records six fresh contexts in OFF/ON, ON/OFF, OFF/ON order. It observes
page initialization, begins Chrome tracing and 1 ms CPU sampling before the
original keyboard unlock, and captures the first 1.5 seconds after the same
two-RAF boundary. The separate ordinary ten-second acceptance sampler remains
unaltered. These diagnostic windows do not replace any timing gate.

Each report, complete Chrome JSON timeline and CPU profile is saved with byte
count and SHA-256, then gzip/base64 encoded into the existing free CI logs.
Overflow, missing features, trace data loss, missing alignment marks, invalid
conditions, incomplete arrays or browser errors fail diagnostic validity.
All runtime, asset, controller and acceptance sources remain unchanged.

Run `node tools/diagnostics/s4-startup/run-startup.test.cjs` for offline fixture,
validity, trace-read and no-local-browser controls. Both test files use mocks or
source checks; neither establishes browser performance. The workflow retains
all existing jobs and adds this single bounded diagnostic job. It does not add
another workflow trigger, deployment, permission, secret, cache or paid artifact.

Protocol references: [Chrome Tracing](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/)
and [Chrome IO](https://chromedevtools.github.io/devtools-protocol/tot/IO/).

## Outcome-loader candidate follow-up

The first instrumentation-only run retained one OFF/ON pair, then stopped on
an incorrect scheduled-RAF versus callback-arrival comparison. It remains
incomplete. The corrected driver records both clocks without trimming any
frames or changing the1.5-second diagnostic window. With --candidate it permits
only js/assets.js and js/campaign.js to differ from reviewed1a930; all source
and diagnostic hashes remain recorded. The full ordinary acceptance matrix is
unchanged. See [the decode evidence and focused repair](../../../../docs/review/v11/OUTCOME_BITMAP_STARTUP.md).
