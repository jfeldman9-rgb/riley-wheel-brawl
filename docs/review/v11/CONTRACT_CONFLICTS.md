# Inherited test contracts and 1.1 compatibility

No quality threshold is weakened in this pass. The original test rules remain auditable against live commit `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc`.

## Approved metadata-only exception

`tools/check.cjs`: change only `const STAMP='20260930-release2';` to `const STAMP='20260930-v11-review';`. Every resource URL is still required to carry the expected cache stamp. The exact original file is retained at `inherited/check-live1.0.cjs`. The lock checker reverses this one literal and verifies the original SHA-256; any other change fails. This is a new version label, not an acceptance-rule change.

## Reviewed contract decisions

### Approved exact Normal reference update

Jason approved retaining the both-mode player/enemy boundary repairs and documented Normal damage factors, then freezing the reviewed 1.1 behavior. The exact comparison reference changes from `7f3f94bd5aef9cc650aab74219f67b476014b5d5` to `4c9997521d62d91cb40abcd9623df334f1209618`. The `hard-check.cjs` result and RNG equality assertions are unmodified.

Stage 1, seed 1 whole-stage damage is 205.8 in both historical and actual live 1.0, versus 164.4 in the approved candidate. Current Normal clear rates are 100 / 80 / 67.5 / 60 / 57.5%. The live performance and 40-seed Normal-rate reference remains `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc`. No offscreen, walk, save, audio, or other functional limit changes.

Controlled ablations found no Hard-only leak. Reverting the boundary repairs and Normal factors restores exact old parity but also restores 72 enemy offscreen violations in the 15-case sample, so that diagnostic revert stays unapplied. Get-up protection had no effect in those cases: its one observed exit already had 1.10 seconds of invulnerability. That is a tested-sample result, not a global claim.

The public PR description contains the approved per-change inventory and separate tuning effects. This reference is an approved 1.1 regression reference, not a relabeling of live 1.0.

### Callandor wrapped-handle contact

The reviewed comparison places the wrapped handle center at stamp y=83; y=76 places the collar at the authored palm instead. The user approved retaining y=83 and changing only the corresponding expected value on 2026-10-01. The sole inherited assertion change is `frame === 'idle' ? -83 : -76` to `-83`. Every other byte of that test is preserved, including its one-blit, layer-order and opaque idle-glove checks.

The original test is retained at `inherited/callandor-live1.0.cjs`; the entire pre-approval lock manifest is retained at `inherited/test-lock-before-grip-approval.json`. `approved-callandor-pivot-v11.cjs` pins both archives and the approved current test to exact hashes, reverses the one assertion byte-for-byte, and rejects any other manifest entry, threshold or metadata change. Its mutation tests reject attempts to remove/rebaseline other locks or expand the exception.

The accompanying requested cosmetic refinement displays the unchanged cached crystal stamp at 0.76 width and 0.82 length around the same (12,83) grip center. The visual trail follows the resized blade apex. Combat reach, damage, timing, RNG, Riley's original paintings, authored anchors and body rendering are unchanged. The separate size check covers all 38 pose/facing views, expanded transform cases and identical unarmed body pixels. Native/backend walk-tear diagnostics are labeled separately; inherited browser limits remain unchanged.
