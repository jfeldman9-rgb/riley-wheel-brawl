# Stage 7 implementation status

Stage 7 remains opt-in with `?stage=7&s7=1`. Stage 6 continues to it when enabled; Stage 7 continues to Stage 1. Moiraine and Lan are the only Stage 7 call-ins. The fallback story panels show Riley from behind and no unreviewed video is enabled.

The combined #55 review fixes and per-finding evidence are recorded in [FIXES-S7.md](../../FIXES-S7.md). The new tests exercise scene behavior, animated throws, loader/video/audio failures, touch bracing, HUD state, bot helpers, lag campaigns and warning timing. `?call7=1` retains the boss-assist benchmark; `?call7=all` enables calls throughout the campaign and note/channel counter tactics.

The earlier statement that no existing test had been edited was incorrect: the input branch already changed `tests/stage6-loial-unchanged.test.mjs` to expect `moilan` for Stage 7. This fix commit additionally corrects the video-wait expectation in `tests/stage7-lifecycle.test.mjs`. No other existing test, protected control/HUD file, pinned Phaser file or entrypoint is edited by these fixes.

The pre-fight audit remains 24,948,685 / 25,000,000 bytes. [Static estimate](texture-estimate.json) now accounts for final painted decoded caps rather than labeling fallback canvases as painted assets. [Actual Chromium texture dump](texture-art.json) reaches clear with no page errors: 74.46 MiB source peak and 77.98 MiB GL peak, including normals and render targets. The conservative final painted/story projection is 102.85 MiB source, below the 105 MiB source gate; painted cast/props including Fade are 10.18 MiB, below 12 MiB. Physical iPhone/WebKit compliance is still unmeasured. Local WebKit cannot launch because its required runtime libraries are absent.

The [asset inventory](../STAGE7-ASSETS-NEEDED.md) and committed `assets/stage7/ART_STATUS.json` remain explicit about missing content: 33 new painted keys, 26 voice recordings, two commissioned 96 BPM music loops, six reviewed call clips and optional intro. Code-drawn art, captions, synthesized SFX and older music keep the stage playable. These content/device release gates remain open; no finished-media or physical-device acceptance is claimed.

The final suite counts and exact campaign results are in FIXES-S7.md. No push or merge is performed by this local fix task.
