Stage 7 r8 verification, based on 28a4e6e (uncommitted)

The first reproduction attempt used real CDP keyDown/keyUp, CPU throttling at rate 6 and a delayed 10 fps clock. All 10 boss-dialog and 5 opening-story quick presses passed even before the changes. The reported intermittent pause and full-life bash loss were not reproduced in that baseline run. The added whole-scene regressions did expose lost time, reduced movement, and duplicate late texture insertion.

Findings and changes:

- Stage1.update discarded time above 50 ms, while Phaser animations and timers received longer deltas. Stage 7 now catches up the whole scene in slices of at most 50 ms; Asmodean and hazards keep their existing 120 Hz substeps. No shared clock or Phaser configuration was changed for Stages 1–6. The browser checker disables smoothing and limits the actual game loop to 10 fps, and asserts that long scene deltas occurred.
- A consumed keyup previously reached Phaser after the physical-release ownership guard had reset. Stage 7 now captures both edges, drains its pause aliases, and routes fresh gameplay pause presses through the same event handler. Tests observe the PAUSED label throughout two seconds after dismissal, then require fresh Esc to pause.
- Damage previously depended entirely on Riley.inv, which reaction/state resets can shorten. A Stage 7 combat-clock deadline now gates both Riley.takeHit (including contact) and direct damage. The bash still consumes its swing once and costs 12 HP.
- Asmodean physics could use the entire frame after update crossed the stagger deadline. Physics now preserves a frame that began staggered; the existing channel-break deadline still prevents attacks and re-channeling for 1.4 game seconds. Explicit helper-stun overrides retain their existing behavior.
- Caption dismissal used Input.clear, erasing a held D. It now clears only dialogue actions; full elapsed-time movement works during and after the veil caption.
- Queue-time textures.exists checks did not protect late file/multifile cache writes after a fallback or restart. Stage 7 also guards addToCache and releases pending-key bookkeeping on completion/shutdown so streamed plates can reload.
- Loop metadata was repaired only before asynchronous decode. Stage 7 now supplies a callback immediately before startBuffer's loop setters, also bounding loopEnd to the decoded duration. Earlier tracks do not opt in. The startup byte inventory remains exactly unchanged.

Regression coverage: tests/stage7-r8.test.mjs steps stage7Simulation at both 100 and 150 ms. Existing test assertions remain unchanged. Stage 1 evidence was regenerated after the audio hook changed its source hash; every simulation record and aggregate result stayed identical.

Browser reproduction command (after serving this repository with python3 -m http.server 8078):

```sh
RWB_URL=http://127.0.0.1:8078/ node tools/stage7/esc-cdp-check.cjs --throttled
```

The additional live combat/restart probe results are in evidence/r8-live-check.json: one non-god bash cost 12 HP, the painted stagger frame stayed stationary before the 1.4-second deadline, held D moved Riley during the veil caption, and two restarts plus reload produced no application errors or texture/audio warnings. Optional texture requests were delayed beyond the fallback deadline in that probe.

Final validation:

- `node --test tests/*.test.mjs`: 1,608 passed, 0 failed, 2 existing skips (1,610 total).
- Stage 7 campaign: 9/9 base, 9/9 assisted, 9/9 with 250 ms lag; no failed seeds.
- Throttled CDP: 10/10 quick boss presses, 5/5 quick opening-story presses, 15/15 fresh gameplay pause checks; no application errors or texture/audio warnings. Observed scene deltas ranged from 100 to 350 ms.
- Full CDP traces and campaign records are in `evidence/r8-esc-cdp.json` and `evidence/r8-tests.json`.
