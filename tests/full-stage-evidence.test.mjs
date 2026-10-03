import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const report = JSON.parse(readFileSync(new URL('../docs/stage1/evidence/full-stage-simulation.json', import.meta.url)));
const regenerate = 'Regenerate with node tests/helpers/run-full-stage-simulations.mjs > docs/stage1/evidence/full-stage-simulation.json';

test('checked-in full-stage evidence identifies the current runtime, assets and tested clock', () => {
  for (const required of ['src/stage1.js', 'src/riley.js', 'src/loial.js', 'assets/chars/loial.anims.json', 'src/enemies.js', 'src/bot.js', 'src/input.js', 'src/fx.js',
    'lib/phaser.min.js', 'tests/helpers/animation-clock.mjs', 'tests/animation-clock.test.mjs',
    'tests/helpers/stage1-simulation.mjs', 'tests/helpers/run-full-stage-simulations.mjs', 'tests/full-stage-simulation.test.mjs']) {
    assert.ok(report.sourceSha256[required], `Missing evidence source: ${required}`);
  }
  for (const [path, expected] of Object.entries(report.sourceSha256)) {
    assert.ok(!path.startsWith('/') && !path.split('/').includes('..'), 'Evidence hashes stay inside the repository');
    const actual = createHash('sha256').update(readFileSync(new URL('../' + path, import.meta.url))).digest('hex');
    assert.equal(actual, expected, `Stale evidence for ${path}. ${regenerate}`);
  }
});

test('full-stage aggregate counters agree with every recorded seed and mode', () => {
  const { parameters, records, results } = report;
  assert.equal(report.evidenceKind, 'deterministic combat-logic simulation');
  const expectedPairs = parameters.modes.flatMap(mode => parameters.seeds.map(seed => `${mode}:${seed}`));
  const actualPairs = records.map(r => `${r.mode}:${r.seed}`);
  assert.equal(new Set(actualPairs).size, actualPairs.length); assert.deepEqual(actualPairs, expectedPairs);
  assert.equal(results.runs, records.length); assert.equal(results.clears, records.filter(r => r.clear).length);
  assert.equal(results.gameOvers, records.filter(r => r.gameOver).length);
  assert.equal(results.maximumActualCombo, Math.max(...records.map(r => r.maxCombo)));
  assert.equal(results.runsWithActualComboAtLeast20, records.filter(r => r.maxCombo >= 20).length);
  for (const r of records) {
    assert.equal(r.clear, true); assert.equal(r.gameOver, false);
    assert.ok(r.simulatedSecondsToOutcome > 0 && r.simulatedSecondsToOutcome <= parameters.deadlineSeconds);
    assert.ok(Number.isInteger(r.maxCombo) && r.maxCombo >= 0);
    assert.equal(r.actualLandedHitComboAtLeast20, r.maxCombo >= 20);
    assert.deepEqual(r.zones, [0, 1, 2, 3]); assert.deepEqual(r.waves, ['0:0', '0:1', '1:0', '1:1', '2:0', '2:1']);
    assert.equal(r.spawns, r.deaths); assert.equal(r.stageClearNotifications, 1);
    if (r.mode === 'boss-coverage') assert.equal(r.coverage.complete, true);
    const resources = r.resources;
    for (const key of ['remainingEnemies', 'remainingFireballs', 'remainingCarts', 'remainingPatches', 'remainingBooms']) assert.equal(resources[key], 0);
    assert.equal(resources.afterSettle.timers, 0); assert.equal(resources.afterSettle.tweens, 0);
    assert.equal(resources.afterSettle.lights, resources.baseline.lights + resources.remainingPickups);
    assert.equal(resources.afterSettle.visuals, resources.baseline.visuals - resources.brokenBarrels * 2 + resources.remainingPickups * 2);
  }
});
