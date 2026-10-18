# Stage 8 implementation status

Stage 8 stays opt-in (`s8=1`); Stage 7 advances only with `s7=1&s8=1`. Main campaign implementation, no Gauntlet changes.

T1 implemented: Stage 1–7 golden recorded before shared edits (the checkout's source matched `23ccf14`), flag and call-provider predicates, shared damage deadline, compact normals, bot dispatch, conditional Stage 7 clear card. Only the approved pre-fight ceiling assertion was changed in existing tests. New golden/generalisation/byte tests: 3 passed, 0 failed. Full suite running with `/tmp/s8-file-capture.cjs` because subprocess pipes return EPERM; no assertion changes.

Pre-fight: 20,675,879 bytes, +426 over baseline, below 21,000,000 and 25,000,000 gates. Art is not loaded before Stage 8. Delivered-art residency targets: Z0 61.5, Z1 69.2, Z2 79.4 peak, C6 68.0, Z3 72.4 MiB (105 MiB gate); actual runtime measurement pending T15/T17.

T2–T12 and code portions of T15/T17 remain. T13/T14/T16 content remains human-gated: voices, two new music files, and videos absent; only plumbing/stubs will be built. Art files will be used unchanged. No default enable.

T1 full suite: 221 files passed, 4 failed. Two Chromium layout tests cannot launch (`setsockopt EPERM`); protected-tests check sees the expressly approved ceiling edit because git cannot commit; Stage 7 lifecycle pins providers 8–9 to Moiraine/Lan, contradicting the requested new provider. No unauthorized existing-test edit made; clarification requested for the provider assertion.

T2 implemented: main-game registry, four zones, Riley-only atlas roster, skeleton boss, kit lifecycle, streaming/fallback loader, title/caption patches, music keys, release wrapper and all six audit lines. New registry tests 2/2; dummy campaign 9/9 (246–250 seconds). Pre-fight 20,695,418 bytes. Texture targets unchanged; measured art integration remains T15. No additional existing test edits. T3–T12, T15/T17 code remain.

T3 implemented: separate CLIPS8 registry and empty review manifests, shared gesture-blessed video lifecycle, serialized C1–C9 panel/caption fallback, 65 exact voice ids, render manifest, and complete missing-content inventory. Story tests 6/6 across played/missing/stalled/skipped paths (all required lines accounted for, scenes serialized and panels released). Pre-fight 20,708,224 bytes. Human recordings/music/video remain absent. T4–T12 and T15/T17 code remain.

T3 correction: story tests are 5 passed (not 6), 0 failed.

T4 implemented: Stone Dog frontal buckler and rush, one-chanter Wise Ones with interruptible bolts/earth tells, human yielding, grass silhouettes and ranged-shot cap. Actor tests 2/2; nine-seed production-loop campaign checked separately. Pre-fight 20,712,307 bytes. T5–T12 and T15/T17 code remain; earlier full-suite limitations unchanged.
