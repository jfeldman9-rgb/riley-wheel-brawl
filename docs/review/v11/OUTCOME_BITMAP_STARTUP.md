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

## Decoded-master result and sampling correction

Candidate `aa9c4d0d13eeb1a17a93810c5d49bafa4b5a483c` passed the complete
matched timing policy, including S4 (three candidate long frames versus five
live), with a386.9ms worst cold median. Six complete startup diagnostics had
zero gaps over33ms; their traces show the repeated outcome WebP decoding was
removed from the main thread, not moved before sampling. The existing Stage4
background decode remains inside the measured scene entry.

The newly added pixel check still failed: the first full-resolution master
matched exactly, but its three resized cache images differed. The original
HTML reference and zero-difference requirement were retained. Chromium's
software decode cache crops and scales encoded images to a ceil-sized mip,
then uses bilinear filtering for the final adjustment. Direct ImageBitmap
drawing takes a different sampling path despite identical decoded pixels.

The focused follow-up reproduces the crop/medium-mip/low-final stages only for
outcome ImageBitmaps. HTML fallback, source bytes, pose sizes and cache keys
stay unchanged. This is source-informed implementation, not a claim that Canvas
Medium is guaranteed identical to native SkPixmap.scalePixels. The real-browser
zero-RGBA check must prove equivalence. The original check file is unchanged, including its exact HTML reference,
assertions and zero-difference tolerance.

Sources: [Chromium decode-cache sampling](https://raw.githubusercontent.com/chromium/chromium/main/cc/tiles/software_image_decode_cache_utils.cc)
and [mip sizing](https://raw.githubusercontent.com/chromium/chromium/main/cc/tiles/mipmap_util.cc).

## Exact pose pixels via a lossless lazy-image proxy (Grok takeover)

Measured in Chrome 151 (Playwright 1.62.1 headless shell, the CI build): the
2513 crop/Medium/Low emulation differs from the reference because canvas
`imageSmoothingQuality='medium'` blends two mip levels, while the decode cache's
`SkPixmap::scalePixels` uses nearest-mip sampling. No public canvas call reproduces
that exactly, so the pose cache now takes the browser's own encoded-image path:

- After the owned master ImageBitmap is created, a copy is transferred to a small
  inline worker, painted unscaled to an OffscreenCanvas, read back and written as
  an uncompressed 32-bit BMP (BI_BITFIELDS with alpha). Its decode is a
  near-memcpy; the premultiply round trip is lossless (full-resolution proxy vs
  master: 0 changed channels for all ten images).
- `pose()` draws that proxy exactly like the reference draws the HTML image
  (`drawImage(img, ...bounds, 0, 0, w, h)`, High). Chromium therefore applies its
  own crop, ceil mip, nearest-mip Medium resize and Low final filter.
- The master ImageBitmap remains the full-resolution resource and is still closed
  on release; the proxy URL is revoked with it. No Worker/OffscreenCanvas, a
  failed one-time 2x2 BMP-alpha probe, worker error or 5 s stall keeps the
  previous ImageBitmap path. The ten masters, their bytes and all test files are
  unchanged.
- Canvas draws are deferred, so each boss-wave pose is now rasterized in its own
  task right after a frame (about 11-15 ms each on the review box) instead of
  both landing in one task or on the first clear frame. The repeated WebP decode
  (57-59 ms) is not reintroduced.

Box result: `tools/outcome-bitmap-browser-v11.cjs` passes all 31 checks (ten full
images and thirty pose scales, each 0 changed channels; masters released).
