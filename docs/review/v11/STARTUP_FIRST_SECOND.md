# First second of a fight: queued pose raster

1.1 does about 120 ms of boot preparation (live 1.0 does about 750 ms), so the
leftover bake work runs in the first second of a fight. CI run 36872699751
attempt 1 failed `fights.3:on` with candidate 8/2/2 against live 1/2/1 frames
over 33 ms. All eight long frames came from one run, inside the first 0.7 s,
while the bake queue was still non-empty.

## Cause

Entering a wave-3 fight queues a pose bake job for each pose of each stage rig:

| Stage | Queued pose jobs |
|---|---:|
| S1 | 70 |
| S2 | 93 |
| S3 | 92 |
| S4 | 117 |
| S5 | 141 |

The counts include kick poses, which stay deferred during active combat.

Each job records mesh faces into a pose canvas in 1-4 ms bake slices. Canvas
does not raster those faces then. It defers the raster until the surface is
first used as an image. For walk and idle poses that happens on their first blit,
inside `Play.draw`, which `Bake.flushTouches` paces at one per frame. For other
poses it happens on their first on-screen draw.

Measured on the box (headless Chrome, software canvas, S3 wave 3):

- Snapshotting one finished pose surface costs 4.2-8.2 ms. That is the deferred
  mesh raster, and it lands outside the 4 ms bake budget. S3 makes 48 such
  first blits in the first second.
- While the queue is non-empty, the RAF callback arrives 20-56 ms after its
  frame time. The game's own frame JS is only 5-15 ms. Once the queue drains,
  that latency falls to about 1 ms.
- Draining the whole queue during entry gives 0 frames over 33 ms in the full
  10 s window, but it costs about 900 ms: 240-270 ms of recording plus about
  650 ms of first-blit raster. That cannot fit in the 400 ms cold-enter budget.

With music on, one more long frame comes from a different source. 1.1 starts the
stage track's fetch and decode after the first visible frame (`main.js`,
`audio.js`). The 2.1 MB (159 s) track finishes decoding 325-350 ms into
sampling, and one frame over 33 ms lands exactly there. With music off that frame
does not occur. Live already has its track playing when sampling starts.

## Change (`js/presentation-v11.js` only)

`R.Puppet.wantPose` is wrapped. Every queued `pose:` bake job gets at most 1 ms
of face recording per slice. After each slice that recorded faces, the slice
forces their raster with the existing one-pixel `flushInto` snapshot. The raster
is therefore paid inside the frame's bake budget, in small pieces, instead of as
one 5-15 ms flush on the first blit.

Nothing else changes:

- pose geometry and pixels
- job order and priorities
- the kick-pose combat deferral
- synchronous bakes (`end >= 1e12`)
- identity poses, which already flush row by row
- every other bake job

The trade-off is readiness. On the box the queued non-kick poses finish about
2 s into the fight instead of about 1 s. Walk-frame fallback draws (a nearby
walk frame or idle shown for a not-yet-baked pose) rise from 26-86 to 56-137
per 10 s run. The earlier eight-face `getImageData` flush experiment
(`RENDERING_READINESS.md`) had the same trade-off, but at about 2.2× fallbacks
and a 1.6 → 3.9 s queue drain.

## Box measurements

Five alternating before/after runs per cell. Controller and 10 s sampler are
identical to `tools/performance-v11.cjs --immediate`. "Before" is 8a17bcd and
"after" is this change. Each cell shows frames over 33 ms summed over 5 runs as
before → after.

| Cell | First 1 s | Whole 10 s | Median FPS | Fallbacks per run |
|---|---|---|---|---|
| S1 w3 off | 19 → 0 | 19 → 0 | 59.6 → 60.0 | 26 → 88 |
| S3 w3 off | 43 → 0 | 43 → 0 | 59.1 → 60.0 | 71 → 135 |
| S5 w3 off | 22 → 0 | 35 → 0 | 59.4 → 60.0 | 33 → 56 |
| S1 w3 on | 31 → 3 | 31 → 3 | 59.3 → 59.9 | 29 → 93 |
| S3 w3 on | 56 → 5 | 56 → 5 | 58.7 → 59.9 | 86 → 137 |
| S5 w3 on | 27 → 1 | 46 → 1 | 59.1 → 60.0 | 33 → 63 |
| S4 w5 on (boss entry) | 16 → 4 | 16 → 4 | 59.7 → 59.9 | 0 → 0 |

Against live 1.0 (816eb1e), 3 alternating runs per cell (the CI rule's shape),
frames over 33 ms summed over 3 runs (live → after):

| Cell | Frames over 33 ms | Fallbacks per run |
|---|---|---|
| S1 off | 39 → 0 | 24 → 85 |
| S3 off | 62 → 0 | 63 → 124 |
| S5 off | 65 → 0 | 26 → 56 |
| S1 on | 47 → 3 | 30 → 91 |
| S3 on | 72 → 5 | 74 → 137 |
| S5 on | 76 → 3 | 32 → 64 |
| S4 w5 on | 42 → 3 | 0 → 0 |

Cold-enter medians stay under 400 ms. They are within noise of before
(3 runs, `--cold-only`):

| Stage | Music off (before → after) | Music on (before → after) |
|---|---|---|
| S1 | 109 → 106 | 117 → 118 |
| S2 | 298 → 310 | 275 → 282 |
| S3 | 305 → 296 | 289 → 312 |
| S4 | 309 → 318 | 336 → 336 |
| S5 | 346 → 346 | 396 → 382 |

`tools/diagnostics/startup-first-second/pose-raster-pixels.cjs` drains every
queued pose of Stages 1-5 through ordinary 4 ms pumps in both builds and hashes
each baked surface. All 528 poses are byte-identical, and every candidate pose
job is paced.

## Remaining

- The music-on frame comes from decode completion and needs an `audio.js` /
  `main.js` change; see the 1.2 P1 report.
- Fallback draws rise in the first two seconds.
- Hardware-accelerated canvas was not measured. There, the snapshot submits GPU
  work rather than rasterizing on the CPU.
