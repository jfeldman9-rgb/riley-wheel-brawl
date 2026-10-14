Stage 7 r7 follow-up (base HEAD 7729e3a)

Browser investigation was run before source edits with /usr/bin/google-chrome,
Playwright, --use-gl=swiftshader, and python3 -m http.server on port 8078.
The reported double-action pause did not reproduce in the baseline: all six
live boss checks and four opening-story checks dismissed without manual pause,
and all ten fresh gameplay checks paused. Baseline tracing did show Phaser's
keydown-ESC event preceding the game's window Input listener for the boss dialog.
No production JustDown pause poll was present in src; the shared Input press
listeners were the manual-pause path. This evidence does not establish the cause
of the r7 screenshots.

The Stage 7 fix consumes dialog/story Escape, P and Enter in window capture,
before Phaser's keyboard manager, key objects and scene events see the down edge.
It also drains queued pause aliases and resets their Phaser key objects. Existing
physical-release ownership prevents repeats and Input.clear from resurrecting
the same press. Fresh gameplay Escape still takes the usual manual-pause path.
The capture listener is removed with the Stage 7 kit.

Riley.vulnerable already honored Riley.inv. The missing protection was granting
that invulnerability consistently: direct notes/columns/shockwaves did not grant
it, so hazards could stack on the same frame. Collision separation itself did no
HP damage, and the bash's counterUsed flag already limited one attack to one
attempt across substeps. Stage 7 hits now grant 0.5 seconds of protection, including
ordinary melee. Direct Riley.takeHit had legacy god semantics (HP could fall to
1); the Stage 7 hook now applies the shared damage gate. The bash routes through
strikeRiley, with an opt-in takeHit reaction retaining knockback, flinch and sound.
The bash telegraph is 700 ms, retaining a 200 ms late-parry window and 12 HP damage.

A reflected note could call stagger(0.8) during the 1.4-second channel-break
stagger. Shared state age and subsequent state resets were also unsafe recovery
clocks. A monotonic combat-clock deadline now owns the recovery; later hits,
reflection, helper stun, hurt/down/idle resets and physics cannot shorten it.
New note phrases already stopped during stagger; column creation now does too.
Explicit channel starts cannot interrupt a channel-break stagger.

The veil caption already used the ambient caption path, with no caption-based
movement freeze found. It is now a 1.2-second beat, skippable with Escape/P/Enter.
The regression uses production Riley movement with D held while it is visible.

Run the real browser check with:

    python3 -m http.server 8078
    RWB_URL=http://127.0.0.1:8078 node tools/stage7/esc-cdp-check.cjs

The check starts from the title with CDP Enter, advances to the arena through
updateZones/startBoss, and tests rawKeyDown and keyDown, 0/120 ms holds with repeat
downs, story skip at 2.5/6 seconds, and fresh gameplay pause. It observes frames
following dismissal and real Phaser key/JustDown state. Recorded output is in
r7-esc-cdp-results.json (20/20 passing, no page errors).

Regression coverage is in tests/stage7-r7.test.mjs. Existing tests are unchanged.
The Stage 7 campaign tests pass all nine base, assisted, and 250 ms lag seeds,
including the stricter 9/9 lag gate, and keep the existing assistance timing bounds.
Stages 1-6 retain their damage semantics; shared changes are opt-in or Stage 7 only.
No commit or push was made.

Final full-suite command: node --test tests/*.test.mjs
Result: 1,591 tests, 1,589 passed, 0 failed, 2 existing skips.
