# Inherited test contracts and 1.1 compatibility

No quality threshold is weakened in this pass. The original test rules remain auditable against live commit `816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc`.

## Approved metadata-only exception

`tools/check.cjs`: change only `const STAMP='20260930-release2';` to `const STAMP='20260930-v11-review';`. Every resource URL is still required to carry the expected cache stamp. The exact original file is retained at `inherited/check-live1.0.cjs`. The lock checker reverses this one literal and verifies the original SHA-256; any other change fails. This is a new version label, not an acceptance-rule change.

## Behavioral contracts still requiring review

### Exact Normal outcome / RNG parity

`tools/hard-check.cjs`, optional `--baseline=` block: `assert.deepEqual(newResult, oldResult)` plus exact RNG-call counts for seeds 1–3 and all five stages. The inherited workflow uses reference `7f3f94b`, predating verified live 1.0.

1.1 explicitly fixes offscreen enemy stalls and introduces recovery protection. The old live observer finds alive enemies hidden up to approximately 12 simulated seconds. Fixing that changes when attacks and RNG calls occur. Therefore exact old results can no longer honestly be promised. The 1.1 requirement instead measures 40 unchanged seeds/controller per stage and requires Normal rates within five percentage points of the verified live 1.0 rates (97.5 / 75 / 67.5 / 57.5 / 57.5%).

The inherited test is not edited or silently removed. Its result remains separately visible. Any decision to retire or replace the old exact-parity contract belongs to Jason/Grok after reviewing the evidence.

### Callandor wrapped-handle contact

`tools/callandor-check.cjs` explicitly expects `frame === 'idle' ? -83 : -76` for the sword pivot. Inspection finds the wrapped handle centered at y=83; y=76 attaches action/walk hands at the collar, seven units above that center. 1.1 fixes actual contact in all poses, and adds a zero-offset geometric test. The inherited action-pose expectation remains unchanged and is reported as incompatible pending review; all other pose/layer/glove checks remain intact.
