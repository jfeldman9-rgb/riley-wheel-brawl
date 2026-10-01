# Painted boss outcomes for Riley Wheel Brawl 1.1

Created 2026-09-30 with ten individual built-in ChatGPT image-generation calls. Each source PNG is a newly painted pose, rather than a stamped, mirrored, rotated, or duplicated idle frame. The original PNG masters are preserved byte-for-byte outside the runtime repository and in local commit `25c09927b0e9149330dc644518cc9a1a4ebc69e6`. The files shipped here are full-source-dimension WebP runtime encodings: explicitly lossy RGB, lossless alpha. No repainting, cutouts, alpha cleanup, resampling, recoloring or pose changes were performed.

## Delivered artwork

| Stage | Riley victory | Defeated boss |
|---|---|---|
| 1, Chieftain | Shoulder-height fist salute | Slumped beastman, axe released |
| 2, Fade | Adjusts blue glasses with a confident smile | Fallen on side, sword released |
| 3, Draghkar | Both fists raised in a V | Collapsed batlike body with folded and spread wings |
| 4, Be'lal | Relaxed hands-on-hips triumph | Seated collapse, sword released |
| 5, Taim | Raises Callandor with a painted, closed-hand grip | Kneeling, head bowed, magic extinguished |

Every Riley sprite preserves the established muscular sixteen-year-old design, short dark hair, thin blue glasses, sleeveless black Asha'man coat, black trousers and boots. No Twinkle Toes appears in these assets. Boss faces, costumes, colors and equipment were referenced from the actual current in-repository paintings, including Be'lal's burgundy coat and pointed beard.

## Runtime integration

- Stable asset keys and paths are registered in `js/artmanifest.js`
- `RWB.OUTCOME_ART` contains per-image visible bounds and world display heights
- `js/campaign.js` marks `riley-victory-*` and `boss-defeat-*` lazy, preserving the existing story-art behavior
- The presentation module owns outcome selection, boss-entry preparation, scaled-image caching, facing and the actual draw
- Use the complete painted sprite. Do not overlay the old idle sprite or procedural sword on the stage-five painted sword
- Recommended heights include the raised hands and sword, so Riley's actual head-to-foot body remains approximately the same size in all five outcomes
- No animation frames are claimed: this deliverable is ten unique, static painted outcome poses

## Alpha and bounds

All ten decoded runtime files are RGBA with truly transparent background pixels. All 15,730,143 alpha samples match the original PNG masters exactly, including every partially transparent edge sample. Some source previews display colored RGB haze that has alpha zero; this disappears under normal source-over compositing. Source solid-body alpha is mostly 252–253/255. This slight original translucency is preserved rather than silently altered.

`frames.json` records both the literal nonzero alpha bounds and visible bounds measured at alpha >=16. The latter are used solely as runtime source rectangles to ignore negligible near-transparent edge specks. PNG master pixels are untouched. WebP RGB is lossy; runtime alpha and dimensions are unchanged. Runtime `bounds` and `visibleBoundsAlpha16` are `[x, y, width, height]`; the diagnostic `alphaBoundsNonzero` field follows Pillow's `[left, top, right, bottom]` convention.

Approximate drawn contact baselines, in original source pixels:
- Riley: Chieftain 1423; Fade 1434; Draghkar 1449; Be'lal 1436; Taim 1523
- Chieftain: body/hoof contact around 930, foreground axe reaches 1003
- Fade: body/cloak contact around 755, foreground sword reaches 801
- Draghkar: wing/foreclaw contact reaches 787
- Be'lal: boot/coat contact around 885, foreground sword reaches 982
- Taim: robe/knee contact reaches 963

The weapon-bearing defeated sprites include foreground depth. An ellipse centered under the body, rather than under the weapon tip, is preferable. Keep contact shadows separate and stage-aware.

## Runtime encoding and provenance

- `provenance.json`: original prompt set, historical reference paths, tool mode and source filenames, plus separate master and runtime encoding fields. Historical generation references intentionally keep their original PNG paths
- `frames.json`: dimensions, unchanged source bounds/world heights, runtime byte counts and SHA-256 hashes; the `master` object preserves the original PNG hash and size. The `runtime` object records the separate codec, quality, alpha settings, byte count and hash
- `docs/review/v11/outcome-art-check.json`: ten distinct runtime and master hashes, decoded RGBA/transparent checks, byte-identical master-copy verification and legacy-art preservation hashes
- `docs/review/v11/outcome-compression-check.json`: per-image encoding sizes, exact-alpha audit, composited RGB error metrics and actual visual inspection findings
- `docs/review/outcomes-v11-art-qa.html`: checkerboard, light and dark review page loading the actual runtime WebP files

Encoding: Pillow 12.3.0 / libwebp 1.6.0, method 6, `alpha_quality=100`, `exact=True`, original dimensions. RGB quality is 95 for eight assets, 91 for defeated Taim and 84.5 for defeated Chieftain. All alpha values are preserved exactly. The lower Chieftain setting is needed for the per-file publication transport budget; its original high-resolution painting remains preserved.

| Payload | Bytes |
|---|---:|
| Original ten PNG masters | 13,637,605 |
| Ten runtime WebP files | 2,182,058 |
| Largest runtime file | 325,416 |
| Largest base64 transport payload | 433,888 |

This reduces runtime image bytes by 84.0%. Every runtime file is below 330,000 bytes. No legacy background or existing art was encoded or edited.

## Compression verification

Reproduce the numerical audit and optional comparison sheets with the preserved PNG master folder:

```sh
python tools/outcome-compression-v11.py --masters ../riley-v11-original-outcomes \
  --render-dir /tmp/riley-outcome-compression --report /tmp/compression-check.json
```

Requires Pillow and NumPy. The audit fails on changed master/runtime hashes, changed dimensions/bounds, any alpha mismatch, duplicate poses, a runtime file over the size budget, or a changed preservation hash. It does not replace or relax any existing acceptance test.

All ten final decoded runtime images were actually inspected against the masters: 40 paired native-1:1 detail crops covering blue glasses, faces, every hand/claw, Callandor grip and blade, released weapons, and fine edges; plus every full silhouette on dark, light and checkerboard surfaces. The lossless rendered sheets are stored outside the runtime repository and their hashes are recorded in the compression report. No new visible fringe, clipping, detached grip, missing fingers or silhouette displacement was found.

Lossy differences are real: fine Chieftain fur/metal/axe texture and Taim hair/embroidery show mild smoothing at native pixel size; Callandor has very slight blue-facet chroma softening. Glasses, hands, weapon grips, blade tips and silhouette edges remain clear. The 84% byte reduction is not claimed to be lossless RGB.

These checks cover decoded pixels and Pillow source-over compositions. Final browser/game acceptance for the WebP runtime paths is a separate lead-owned check; no browser completion is claimed here.

## Existing art preservation

No existing image was changed. In particular, stage-four and stage-five continuous panoramas, stage-five far painting and roof painting match the verified live base by SHA-256. Their source pixels were visually inspected: neither continuous panorama shows an obvious hard vertical join at full-plate scale. Runtime scrolling and roof transitions still require final game verification.

The pre-existing `callandor-all-poses.png` was inspected: grip attachment appears continuous, but the sword crosses the face/body in channel, hurt and kick exposures. The newly painted stage-five victory uses a visible grip between crossguard and pommel and keeps the sword clear of the head.

