import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { stage1Simulation } from './helpers/stage1-simulation.mjs';
import { createFrameClock, startFrameClock } from './helpers/animation-clock.mjs';

const source = readFileSync(new URL('../lib/phaser.min.js', import.meta.url), 'utf8');
const entry = 'i(85454)})());'; assert.ok(source.endsWith(entry));
const sandbox = { module: { exports: {} }, exports: {}, console: { warn() {} } };
runInNewContext(source.slice(0, -entry.length) + 'i})());', sandbox, { timeout: 1000 });
const Animation = sandbox.module.exports(42099), AnimationState = sandbox.module.exports(9674);

function pinnedState() {
  const events = [], frames = [1, 2].map(index => ({ index, textureFrame: String(index), frame: { texture: {} } }));
  const currentAnim = { frames, key: 'riley_walk' };
  const state = Object.assign(Object.create(AnimationState.prototype), {
    currentAnim, currentFrame: frames[0], accumulator: 37, nextTick: 95, repeatCounter: 12,
    pendingRepeat: true, isPlaying: true, hasStarted: true, _paused: false, _pendingStop: 0,
    parent: { setSizeToFrame() {}, emit(...args) { events.push(args); } },
  });
  return { state, frames, events };
}

test('pinned setCurrentFrame preserves accumulator, hold threshold and repeat counters', () => {
  const { state, frames, events } = pinnedState();
  const parent = state.setCurrentFrame(frames[1]);
  assert.equal(parent, state.parent); assert.equal(state.currentFrame, frames[1]);
  assert.equal(state.accumulator, 37); assert.equal(state.nextTick, 95); assert.equal(state.repeatCounter, 12);
  assert.equal(state.pendingRepeat, true); assert.equal(events.length, 1); assert.equal(events[0][0], 'animationupdate');
});

test('pinned frame selection while stopped or paused does not resume or emit animation events', () => {
  for (const paused of [false, true]) {
    const { state, frames, events } = pinnedState(); state.isPlaying = false; state._paused = paused;
    state.setCurrentFrame(frames[1]);
    assert.equal(state.currentFrame, frames[1]); assert.equal(state.isPlaying, false); assert.equal(state._paused, paused);
    assert.equal(state.accumulator, 37); assert.equal(state.repeatCounter, 12); assert.equal(events.length, 0);
  }
});

test('pinned setCurrentFrame accepts foreign frames without changing currentAnim and rejects missing texture frames', () => {
  const { state } = pinnedState(), anim = state.currentAnim;
  const foreign = { index: 4, textureFrame: 'foreign', frame: { texture: {} } };
  state.setCurrentFrame(foreign); assert.equal(state.currentAnim, anim); assert.equal(state.currentFrame, foreign);
  assert.throws(() => state.setCurrentFrame({ index: 1 }), /texture/);
});

test('Phaser filters missing textures and atlas frames when building animation frames', () => {
  const textureManager = { getFrame: () => null };
  const frames = Animation.prototype.getFrames.call({}, textureManager, [{ key: 'missing', frame: 'missing' }]);
  assert.equal(frames.length, 0);
});

test('direct walk/run switches preserve stride and footstep phase using animation length', () => {
  const h = stage1Simulation({ mode: null }), r = h.s.riley;
  try {
    for (const [from, to, ts] of [['walk', 'run', 1.2], ['run', 'walk', 0.85]]) {
      r.setState(from, from); r.st = 0.77;
      r.sprite.anims.setCurrentFrame(r.sprite.anims.currentAnim.frames[5]);
      const phase = (r.fi + 0.5) / r.sprite.anims.currentAnim.frames.length;
      r.setLoco(to);
      assert.equal(r.fi, Math.floor(phase * r.sprite.anims.currentAnim.frames.length));
      assert.ok(Math.abs(r.st - 0.17) < 1e-12); assert.equal(r.sprite.anims.timeScale, ts); assert.equal(r.done, false);
    }
    // The existing helper supports a shorter source cycle too.
    r.state = 'walk'; r.st = 0.44;
    startFrameClock(r.sprite.anims, { frames: ['a', 'b', 'c', 'd'], holds: [95, 95, 95, 95], loop: true });
    r.sprite.anims.setCurrentFrame(r.sprite.anims.currentAnim.frames[2]);
    r.setLoco('run'); assert.equal(r.fi, 5);
  } finally { h.destroy(); }
});

test('locomotion after interruptions never inherits frame phase, elapsed st or timeScale', () => {
  const h = stage1Simulation({ mode: null }), r = h.s.riley;
  try {
    for (const from of ['walk', 'run']) for (const [state, anim] of [
      ['hurt', 'hurt'], ['combo1', 'combo1'], ['squat', 'jump_crouch'], ['air', 'jump_rise'],
      ['airkick', 'airkick'], ['grab', 'grab'], ['hold', 'hold'], ['down', 'knockdown'], ['getup', 'getup'], ['throw', 'throw'],
    ]) {
      r.setState(from, from); r.st = 0.77; r.sprite.anims.setCurrentFrame(r.sprite.anims.currentAnim.frames[5]);
      r.setState(state, anim); r.st = 2.67; r.sprite.anims.timeScale = 0.3;
      const frames = r.sprite.anims.currentAnim.frames;
      r.sprite.anims.setCurrentFrame(frames[frames.length - 1]);
      const to = from === 'walk' ? 'run' : 'walk'; r.setLoco(to);
      assert.equal(r.fi, 0); assert.equal(r.st, 0); assert.equal(r.sprite.anims.timeScale, 1); assert.equal(r.done, false);
    }
  } finally { h.destroy(); }
});

test('same locomotion state preserves fi, done, st and animation clock', () => {
  const h = stage1Simulation({ mode: null }), r = h.s.riley;
  try {
    r.setState('walk', 'walk'); r.st = 0.62;
    r.sprite.anims.setCurrentFrame(r.sprite.anims.currentAnim.frames[3]); r.sprite.anims.isPlaying = false;
    const clock = r.sprite.anims; r.setLoco('walk');
    assert.equal(r.sprite.anims, clock); assert.equal(r.fi, 3); assert.equal(r.done, true); assert.equal(r.st, 0.62);
  } finally { h.destroy(); }
});

test('stride switches guard null currentAnim, empty source/target frames and absent frame-selection methods', () => {
  const h = stage1Simulation({ mode: null }), r = h.s.riley;
  try {
    for (const old of [null, {}, { frames: [] }]) {
      r.setState('walk', 'walk'); r.sprite.anims.currentAnim = old; r.setLoco('run'); assert.equal(r.fi, 0);
    }
    const play = r.sprite.play;
    for (const target of [null, {}, { frames: [] }, { frames: [undefined] }]) {
      r.sprite.play = play; r.setState('walk', 'walk');
      r.sprite.play = () => { r.sprite.anims.currentAnim = target; };
      assert.doesNotThrow(() => r.setLoco('run'));
    }
    r.sprite.play = play; r.setState('walk', 'walk'); r.sprite.anims.setCurrentFrame = undefined;
    assert.doesNotThrow(() => r.setLoco('run'));
  } finally { h.destroy(); }
});

test('stride selection does not allocate a replacement clock or consume randomness', () => {
  const h = stage1Simulation({ mode: null }), r = h.s.riley;
  const clock = createFrameClock(); let calls = 0; const random = Math.random;
  try {
    Math.random = () => { calls++; return 0.5; };
    r.sprite.anims = clock; r.setState('walk', 'walk');
    for (let i = 0; i < 50; i++) r.setLoco(i % 2 ? 'walk' : 'run');
    assert.equal(r.sprite.anims, clock); assert.equal(calls, 0);
  } finally { Math.random = random; h.destroy(); }
});
