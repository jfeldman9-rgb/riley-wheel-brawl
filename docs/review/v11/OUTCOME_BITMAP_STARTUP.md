# Outcome artwork startup repair

The unchanged runtime at `1a930986076c20cdf6d1a8df0bfaadee7181e680`
failed the matched S4 wave5 music-ON count rule: three candidate gaps over33ms
versus two live. All six main cells, ten cold medians,28 native families and
eight browser families passed. The diagnostic-only update `731bdd133baa989ec272ce4ad17b9d9d3ca8ea4d`
preserved that runtime and repeated the same valid3-versus2 result.

## Observed cause

[Diagnostic run36810948107](https://github.com/jfeldman9-rgb/riley-wheel-brawl/actions/runs/36810948107)
retained complete raw captures for its first OFF/ON pair before an observer
validation bug stopped the planned six captures. The six-run diagnostic is
incomplete; these two recordings are attribution evidence, not an acceptance pass.

Both retained Chrome timelines show the same image references decoded on a
worker and subsequently decoded again on the renderer main thread when drawn:

| Condition | Main-thread task | WebP decode inside it | Guard preparation begins afterward |
|---|---:|---:|---:|
| OFF |62.993ms|57.640ms|9.444ms later|
| ON |64.280ms|58.945ms|2.487ms later|

The only WebP requests in each capture are the current Riley victory and Be'lal
defeat images. Their1070×1470 and1536×1024 dimensions identify the two decode
records; reference ordering changes with response ordering. The source path is
`presentation-v11.js` boss-wave loading followed by `pose()` drawing each master
into its small cached canvas. Exact JavaScript call-site attribution is a
source-backed inference because the native trace task has no JavaScript stack.

Guard's8.7/9.0ms image-bitmap submission is a separate measured cost after the
long task. Music finished decoding before the instrumented ON sample. Neither
fact explains away the image decode task or justifies blaming sword rendering,
muting audio, dropping an acceptance cell or delaying artwork until after capture.

## Narrow change

Only the ten outcome resources opt into retained decoded ImageBitmaps. Their
unchanged bytes are fetched as Blobs and decoded into owned pixel resources,
so pose-cache draws do not depend on an evictable HTML image decode cache.
The naturalWidth/naturalHeight compatibility getters return the bitmap's actual
dimensions. Stage release and stale-generation completion close owned bitmaps.
Unsupported or rejected bitmap creation retains the existing HTML-image fallback.

The two-fetch queue, boss-wave request timing, master resolution, alpha, crop,
high-quality pose resizing, music timing, gameplay, cold timers and every
acceptance threshold stay unchanged. No source artwork is compressed or edited
by this repair. Other images keep their existing loader.

The new lifecycle test covers ownership, stale completion, repeated readiness,
release, reload, retries and fallback. A separate real-Chrome check requires
zero changed RGBA channels for all ten full-resolution images and all thirty
cached-pose comparisons against independently decoded HTML images, and confirms
master disposal. The inherited presentation checks continue to run unchanged.

## Observer correction and retest

The failed observer compared a RAF's scheduled timestamp with a later
performance.now() marker. The recorded ON first RAF was2061.1ms, while sample
setup executed at2062.1ms. That difference is legitimate. The corrected observer
retains the original RAF timestamps and entire1.5-second window, records actual
callback-arrival times separately, and validates markers against those arrivals.
No acceptance sampler, time window or threshold is changed.

The new diagnostic profiles the outcome-loader candidate, allowing only the
two stated runtime files to differ from the reviewed source. It still runs
three ON and three OFF fresh contexts and records its own overhead. The ordinary
three-pair live comparison remains the blocking timing decision. Pixel checks,
complete traces and exact-head CI results are required before claiming this
candidate resolves the startup hitch.
