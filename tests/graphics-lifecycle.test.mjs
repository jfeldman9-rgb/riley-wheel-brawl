import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { createPerf } from '../src/perf.js';
import { installGraphicsLifecycle, GRAPHICS_CONTEXT_REASON as REASON } from '../src/graphics-lifecycle.js';

// Execute the pinned loss/restore/Game.step functions, without requiring the
// renderer module's DOM dependency or allocating any browser/WebGL resources.
const source = readFileSync(new URL('../lib/phaser.min.js', import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), '66348b1b5141e49b7d5ebbe688cddcb502eab1cb00f21c538686a5b2c5abe4de');
const events = { PRE_STEP: 'prestep', STEP: 'step', POST_STEP: 'poststep', PRE_RENDER: 'prerender', POST_RENDER: 'postrender', LOSE_WEBGL: 'losewebgl', RESTORE_WEBGL: 'restorewebgl' };
function pinned(pattern) {
  const match = source.match(pattern); assert.ok(match, 'Unknown pinned Phaser method shape');
  return runInNewContext('(' + match[1] + ')', { m: events, h: events, r: (items, fn) => items.forEach(fn),
    A: { getDefault: () => ({}) }, console: { log() {}, warn() {} } }, { timeout: 1000 });
}
const dispatchLost = pinned(/dispatchContextLost:(function\(t\)\{.*?\}),dispatchContextRestored:/);
const dispatchRestored = pinned(/dispatchContextRestored:(function\(t\)\{.*?\}),captureFrame:/);
const gameStep = pinned(/step:(function\(t,e\)\{.*?\}),headlessStep:/);

function fixture({ reasons = [], gamePaused = false, initializeStage = true, rendererReady = true, onLost, onRestored } = {}) {
  let now = 0, glLost = false, ticks = 0, clears = 0, prevented = 0, pauses = 0, resumes = 0;
  const sequence = [], meter = createPerf({ now: () => now, metadata: () => ({}) });
  const stage = { events: new EventEmitter(), pauseReasons: initializeStage ? new Set(reasons) : undefined, paused: reasons.length > 0,
    setPauseReason(reason, value) {
      value ? this.pauseReasons.add(reason) : this.pauseReasons.delete(reason);
      this.paused = this.pauseReasons.size > 0; meter.setSuspended(reason, value);
    } };
  for (const reason of reasons) meter.setSuspended(reason, true);
  const renderer = Object.assign(new EventEmitter(), { contextLost: false, gl: { isContextLost: () => glLost },
    setExtensions() {}, glWrapper: { update() {} }, glTextureUnits: { init() {}, bindUnits() {}, units: [] }, getCompressedTextures: () => ({}),
    resize() { sequence.push('resize'); }, preRender() {}, postRender() {},
    ...Object.fromEntries(['Texture', 'Buffer', 'Framebuffer', 'Program', 'VAO'].map(kind => ['gl' + kind + 'Wrappers', [{ createResource() { sequence.push(kind); } }]])) });
  const game = { renderer: rendererReady ? renderer : null, events: new EventEmitter(), isPaused: gamePaused,
    inp: { held: true, clear() { clears++; this.held = false; } },
    pause() { pauses++; this.isPaused = true; }, resume() { resumes++; this.isPaused = false; }, scale: { baseSize: { width: 1280, height: 720 } },
    scene: { getScene: () => stage, update() { if (!stage.paused) { ticks++; meter.tick(now, { inFight: true }); } }, render() {} } };
  renderer.game = game;
  const callbackEvents = [];
  const guard = installGraphicsLifecycle({ game, meter,
    onLost: info => { callbackEvents.push(['lost', info.reason]); onLost?.(info); },
    onRestored: info => { sequence.push('notified'); callbackEvents.push(['restored', info.reason]); onRestored?.(info); } });
  return { game, renderer, stage, meter, guard, sequence, callbackEvents,
    get counts() { return { ticks, clears, prevented, pauses, resumes }; },
    at(t) { now = t; }, step(t) { now = t; gameStep.call(game, t, 16); },
    lose() { glLost = true; dispatchLost.call(renderer, { preventDefault() { prevented++; } }); },
    restore(stillLost = false) { glLost = stillLost; dispatchRestored.call(renderer, { preventDefault() { prevented++; } }); } };
}

test('loss freezes Game.step, excludes its gap, clears held input, and restores after resource rebuild', () => {
  const f = fixture(); f.step(0); f.step(16); f.at(20); f.lose();
  assert.equal(f.guard.lost, true); assert.equal(f.game.isPaused, true); assert.equal(f.game.inp.held, false);
  assert.ok(f.stage.pauseReasons.has(REASON)); f.step(5000); assert.equal(f.counts.ticks, 2);
  f.game.inp.held = true; f.at(6000); f.restore();
  assert.equal(f.guard.lost, false); assert.equal(f.game.isPaused, false); assert.equal(f.game.inp.held, false);
  assert.deepEqual(f.sequence, ['Texture', 'Buffer', 'Framebuffer', 'Program', 'VAO', 'resize', 'notified']);
  f.step(6016); f.step(6032);
  assert.deepEqual(f.meter.all, [16, 16]);
  assert.deepEqual(f.meter.report().sampling.excludedByReason[REASON], { boundaries: 2, durationMs: 5980 });
  assert.deepEqual(f.counts, { ticks: 4, clears: 2, prevented: 2, pauses: 1, resumes: 1 });
});

for (const reasons of [['manual'], ['report'], ['manual', 'report']]) test(`restore preserves independent ${reasons.join('/')} pause`, () => {
  const f = fixture({ reasons }); f.lose(); f.restore();
  assert.deepEqual([...f.stage.pauseReasons], reasons); assert.equal(f.stage.paused, true);
  f.step(100); assert.equal(f.counts.ticks, 0);
  assert.deepEqual(f.meter.suspended, reasons);
});

test('a preexisting global pause is never resumed by graphics recovery', () => {
  const f = fixture({ gamePaused: true }); f.lose(); f.restore();
  assert.equal(f.game.isPaused, true); assert.equal(f.counts.pauses, 0); assert.equal(f.counts.resumes, 0);
});

test('duplicate loss is idempotent and failed restoration keeps the game paused', () => {
  const f = fixture(); f.lose(); f.lose(); f.restore(true);
  assert.equal(f.guard.lost, true); assert.equal(f.game.isPaused, true);
  assert.equal(f.counts.pauses, 1); assert.equal(f.counts.resumes, 0);
  assert.deepEqual(f.callbackEvents, [['lost', REASON]]);
  assert.equal(f.meter.report().sampling.excludedByReason[REASON].boundaries, 1);
  f.restore(); f.renderer.emit('restorewebgl');
  assert.equal(f.counts.resumes, 1); assert.equal(f.callbackEvents.length, 2);
});

test('resource rebuild failure never reports restored or resumes invisible gameplay', () => {
  const f = fixture(); f.lose();
  f.renderer.glTextureWrappers[0].createResource = () => { throw Error('resource rebuild failed'); };
  assert.throws(() => f.restore(), /resource rebuild failed/);
  assert.equal(f.renderer.contextLost, true); assert.equal(f.guard.lost, true);
  assert.equal(f.game.isPaused, true); assert.equal(f.counts.resumes, 0);
  assert.deepEqual(f.callbackEvents, [['lost', REASON]]);
});

test('closing a report or resetting capture while lost cannot resume gameplay or sampling', () => {
  const f = fixture({ reasons: ['report'] }); f.lose(); f.stage.setPauseReason('report', false);
  assert.equal(f.stage.paused, true); f.meter.reset(); f.step(4000);
  assert.deepEqual(f.meter.suspended, [REASON]); assert.deepEqual(f.meter.all, []);
  f.restore(); f.step(5000); f.step(5016); assert.deepEqual(f.meter.all, [16]);
});

test('delayed renderer and stage initialization attach safely without duplicate listeners', () => {
  const f = fixture({ rendererReady: false, initializeStage: false });
  f.game.renderer = f.renderer; f.game.events.emit('boot'); f.game.events.emit('ready'); f.guard.refresh();
  assert.equal(f.renderer.listenerCount('losewebgl'), 1); assert.equal(f.stage.events.listenerCount('create'), 1);
  f.lose(); assert.equal(f.game.isPaused, true);
  f.stage.pauseReasons = new Set(['manual']); f.stage.events.emit('create');
  assert.ok(f.stage.pauseReasons.has(REASON)); f.restore();
  assert.deepEqual([...f.stage.pauseReasons], ['manual']);
});

test('an already-lost renderer is recognized when the lifecycle is installed late', () => {
  const f = fixture({ rendererReady: false }); f.lose();
  f.game.renderer = f.renderer; f.game.events.emit('boot');
  assert.equal(f.guard.lost, true); assert.equal(f.game.isPaused, true); assert.equal(f.counts.pauses, 1);
});

test('UI callback failures cannot escape the loss event or prevent native preventDefault', () => {
  const warn = console.warn; console.warn = () => {};
  try {
    const f = fixture({ onLost() { throw Error('missing UI'); }, onRestored() { throw Error('missing UI'); } });
    assert.doesNotThrow(() => f.lose()); assert.equal(f.counts.prevented, 1);
    assert.doesNotThrow(() => f.restore()); assert.equal(f.counts.prevented, 2); assert.equal(f.game.isPaused, false);
  } finally { console.warn = warn; }
});

test('game destruction detaches every listener without resuming an invisible game', () => {
  const f = fixture(); f.lose(); f.game.events.emit('destroy'); f.guard.destroy();
  assert.equal(f.renderer.listenerCount('losewebgl'), 0); assert.equal(f.renderer.listenerCount('restorewebgl'), 0);
  assert.equal(f.stage.events.listenerCount('create'), 0);
  for (const event of ['boot', 'ready', 'destroy']) assert.equal(f.game.events.listenerCount(event), 0);
  assert.deepEqual(f.meter.suspended, []); assert.equal(f.counts.resumes, 0);
  f.restore(); assert.equal(f.callbackEvents.length, 1);
});

test('an absent game or stage is harmless and teardown is idempotent', () => {
  const guard = installGraphicsLifecycle(); guard.refresh(); guard.destroy(); guard.destroy();
  const game = { events: new EventEmitter(), renderer: new EventEmitter(), inp: { clear() {} } };
  const meter = createPerf(); const other = installGraphicsLifecycle({ game, meter, getStage: () => null });
  assert.doesNotThrow(() => game.renderer.emit('losewebgl'));
  assert.deepEqual(meter.suspended, [REASON]); other.destroy(); assert.deepEqual(meter.suspended, []);
});
