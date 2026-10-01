# Hard calibration after painted-body containment

The body-containment repair is genuine gameplay geometry, not an art-only offset. Once transient camera shake was separated from physics, Normal remained within five points of live with no Normal coefficient changes. Hard Stage 5 became much easier, so its existing damage coefficients were recalibrated openly.

## Selected narrow changes

| Coefficient | Before | After |
|---|---:|---:|
| Hard Stage 3 incoming damage | 1.18 | 1.16 |
| Hard Stage 5 incoming damage | 0.75 | 0.94 |
| Hard Stage 5 named-boss damage | 1.00 | 1.10 |

All Normal values, Hard Stage 1/2 and Stage 4 values, HP, AI, telegraphs, recovery, controller inputs, seeds and test thresholds are unchanged.

Diagnostic late-stage clears are **50% / 30% / 25%** versus the requested **50% / 35% / 25%** aims. Stage 4 remains five points below its aim. The added harness uses a disclosed ±5-point diagnostic window; that is not a waiver or a claim that Jason approved an exact 30% target.

Stage 4's sampled coefficients produced a sharp jump from 30% to 47.5%; the existing pair was retained rather than selecting an unmeasured value. Stage 5 at incoming 0.94 gave 40% with the existing boss factor , 35% at boss 1.05 , 25% at 1.10 and 22.5% at 1.15. Only named Taim techniques use that latter factor; ordinary wave HP and attacks remain unchanged.

The review archive retains all 23 diagnostic configurations (920 stage-seed runs), each with 40 ordered unique seeds 1001–1040 and the unchanged unassisted controller, coefficient-only patch, original/final data files, helper and SHA256 manifest. Those experiments do not substitute for the final no-override 400-run acceptance suite.

Frozen runtime SHA256 for integration: `4fc6ff472aebd51e947d233b7e8cb33d26b4631242eaf355863f604795e26d0e`.

Frozen `js/data.js` SHA256: `a1362b4a25a641c24d310ea2001c53d5833c93de763a7dfb65518b6e6cdcf201`.
