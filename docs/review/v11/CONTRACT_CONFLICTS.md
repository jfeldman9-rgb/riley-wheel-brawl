# Inherited test contracts and 1.1 compatibility

No quality threshold is weakened in this pass. The original test rules remain auditable against live commit `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc`.

## Approved metadata-only exception

`tools/check.cjs`: change only `const STAMP='20260930-release2';` to `const STAMP='20260930-v11-review';`. Every resource URL is still required to carry the expected cache stamp. The exact original file is retained at `inherited/check-live1.0.cjs`. The lock checker reverses this one literal and verifies the original SHA-256; any other change fails. This is a new version label, not an acceptance-rule change.

## Behavioral contracts still requiring review

### Approved exact Normal reference update

Jason approved retaining the both-mode player/enemy boundary repairs and documented Normal damage factors, then freezing the reviewed 1.1 behavior. The exact comparison reference changes from `7f3f94bd5aef9cc650aab74219f67b476014b5d5` to `4c9997521d62d91cb40abcd9623df334f1209618`. The `hard-check.cjs` result and RNG equality assertions are unmodified.

Stage 1, seed 1 whole-stage damage is 205.8 in both historical and actual live 1.0, versus 164.4 in the approved candidate. Current Normal clear rates are 100 / 80 / 67.5 / 60 / 57.5%. The live performance and 40-seed Normal-rate reference remains `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc`. No offscreen, walk, save, audio, or other functional limit changes.

Controlled ablations found no Hard-only leak. Reverting the boundary repairs and Normal factors restores exact old parity but also restores 72 enemy offscreen violations in the 15-case sample, so that diagnostic revert stays unapplied. Get-up protection had no effect in those cases: its one observed exit already had 1.10 seconds of invulnerability. That is a tested-sample result, not a global claim.

The public PR description contains the approved per-change inventory and separate tuning effects. This reference is an approved 1.1 regression reference, not a relabeling of live 1.0.

### Callandor wrapped-handle contact

`tools/callandor-check.cjs` explicitly expects `frame === 'idle' ? -83 : -76` for the sword pivot. Inspection finds the wrapped handle centered at y=83; y=76 attaches action/walk hands at the collar, seven units above that center. 1.1 fixes actual contact in all poses, and adds a zero-offset geometric test. The inherited action-pose expectation remains unchanged and is reported as incompatible pending review; all other pose/layer/glove checks remain intact.
