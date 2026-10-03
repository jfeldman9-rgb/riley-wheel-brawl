// Reproduce the checked-in 60 Hz combat-logic evidence, without a browser/GPU.
// node tests/helpers/run-full-stage-simulations.mjs > docs/stage1/evidence/full-stage-simulation.json
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { stage1Simulation, withSeed, FULL_STAGE_SEEDS, FULL_STAGE_MODES } from './stage1-simulation.mjs';

const records = [];
for (const mode of FULL_STAGE_MODES) for (const seed of FULL_STAGE_SEEDS) withSeed(seed, () => {
  const h = stage1Simulation({ mode }), s = h.s;
  try {
    for (let frame = 0; frame < 60 * 600 && !s.ended && !s.gameOver; frame++) h.step();
    const result = h.summary();
    for (let frame = 0; frame < 60 * 15; frame++) h.step();
    records.push({ seed, mode, simulatedSecondsToOutcome: result.seconds, clear: result.ended, gameOver: result.gameOver,
      lives: result.lives, hp: result.hp, score: result.score, maxCombo: result.maxCombo, actualLandedHitComboAtLeast20: result.maxCombo >= 20,
      zones: result.zones, waves: result.waves, spawns: h.observations.spawns.length, deaths: h.observations.deaths.length,
      coverage: result.coverage, peak: result.peak,
      resources: { settleSeconds: 15, baseline: h.baseline, afterSettle: h.resources(), brokenBarrels: s.barrels.filter(b => b.broken).length,
        remainingPickups: s.pickups.length, remainingEnemies: s.enemies.length, remainingFireballs: s.fireballs.length, remainingCarts: s.carts.length,
        remainingPatches: s.patches.length, remainingBooms: s.fx.booms.length },
      maxCompletedEntrySeconds: Math.max(...[...h.observations.entries.values()].filter(e => e.end !== null).map(e => (e.end - e.start) / 1000)),
      stageClearNotifications: h.observations.hud.filter(e => e.method === 'stageClear').length,
    });
  } finally { h.destroy(); }
});
const sourceFiles = [
  ...['stage1', 'riley', 'loial', 'enemies', 'fighter', 'bot', 'input', 'fx', 'assets', 'config', 'audio'].map(name => `src/${name}.js`),
  ...['riley', 'grunt', 'spear', 'hound', 'chief', 'loial'].map(name => `assets/chars/${name}.anims.json`),
  'assets/bg/plates.json', 'assets/props/staves.json', 'lib/phaser.min.js',
  'tests/helpers/animation-clock.mjs', 'tests/animation-clock.test.mjs', 'tests/helpers/stage1-simulation.mjs',
  'tests/helpers/run-full-stage-simulations.mjs', 'tests/full-stage-simulation.test.mjs',
];
const repo = new URL('../../', import.meta.url);
const sourceSha256 = Object.fromEntries(sourceFiles.map(path => [path, createHash('sha256').update(readFileSync(new URL(path, repo))).digest('hex')]));
const report = {
  schemaVersion: 1,
  evidenceKind: 'deterministic combat-logic simulation',
  baseGitCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
  sourceSha256,
  reproduction: 'node tests/helpers/run-full-stage-simulations.mjs > docs/stage1/evidence/full-stage-simulation.json',
  parameters: { seeds: FULL_STAGE_SEEDS, modes: FULL_STAGE_MODES, updateSeconds: 1 / 60, deadlineSeconds: 600, settleSeconds: 15,
    startingHp: 100, startingLives: 3, startingSaidin: 100, godMode: false, playerStateOverridesAfterConstruction: false },
  boundaries: [
    'Production Stage1.create/update/camera, Riley, enemies, Bot, Input and FX timing; shipped animation holds',
    'Renderer, particle output, HUD drawing/readiness, scene-manager disposal, tween scheduling and scene clock are explicit Node stubs',
    'Animation clock is contract-tested against pinned Phaser; animation updates precede elapsed-delta timers, then tweens, then Stage1.update',
    'Audio output is unavailable; renderer performance sampling and quality governor are disabled',
    'Seeded randomness is deterministic in this stub environment; particle/render randomness is not reproduced',
    'Resource counts track logical light/visual/timer/tween ownership, not GPU/browser memory or device safety',
    'No rendered playability, perceptual/human review, physical-device FPS or cold-load acceptance claim',
    'Actual landedHit combo counters are recorded without forced attacks, HP/phase/cooldown/position/life writes or tuning changes',
  ],
  results: { runs: records.length, clears: records.filter(r => r.clear).length, gameOvers: records.filter(r => r.gameOver).length,
    maximumActualCombo: Math.max(...records.map(r => r.maxCombo)), runsWithActualComboAtLeast20: records.filter(r => r.actualLandedHitComboAtLeast20).length },
  records,
};
console.log(JSON.stringify(report, null, 2));
if (records.some(r => !r.clear || r.gameOver)) process.exitCode = 1;
