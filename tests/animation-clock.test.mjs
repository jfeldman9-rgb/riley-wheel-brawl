// Validate the headless animation clock against actual methods from the pinned
// Phaser bundle. Renderer/sprite allocation are stubs; no browser or GPU starts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { createFrameClock, startFrameClock, advanceFrameClock } from './helpers/animation-clock.mjs';

const source = readFileSync(new URL('../lib/phaser.min.js', import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), '66348b1b5141e49b7d5ebbe688cddcb502eab1cb00f21c538686a5b2c5abe4de');
const entry = 'i(85454)})());'; assert.ok(source.endsWith(entry));
const sandbox = { module: { exports: {} }, exports: {}, console };
runInNewContext(source.slice(0, -entry.length) + 'i})());', sandbox, { timeout: 1000, filename: 'phaser-animation-contract.vm.js' });
const Animation = sandbox.module.exports(42099), AnimationState = sandbox.module.exports(9674);

function fixture(data) {
  const frames = data.holds.map((duration, i) => ({ index: i + 1, duration, isFirst: i === 0, isLast: i === data.holds.length - 1, textureFrame: data.frames[i], frame: { texture: {} } }));
  frames.forEach((f, i) => { f.nextFrame = frames[(i + 1) % frames.length]; f.prevFrame = frames[(i + frames.length - 1) % frames.length]; });
  const anim = Object.assign(Object.create(Animation.prototype), { frames, frameRate: 60, key: data.name || 'fixture', paused: false });
  const actual = Object.assign(Object.create(AnimationState.prototype), {
    currentAnim: anim, currentFrame: frames[0], frameRate: 60, msPerFrame: 1000 / 60,
    parent: { emit() {}, setSizeToFrame() {} }, animationManager: { globalTimeScale: 1 },
    isPlaying: true, hasStarted: true, forward: true, timeScale: 1, accumulator: 0, nextTick: data.holds[0],
    skipMissedFrames: true, repeatCounter: data.loop ? Number.MAX_VALUE : 0, repeatDelay: 0, pendingRepeat: false,
    _pendingStop: 0, _paused: false, _wasPlaying: true, nextAnim: null,
  });
  const clock = createFrameClock(); startFrameClock(clock, data);
  function same(label) {
    assert.equal(clock.currentFrame.index, actual.currentFrame.index, label + ': current frame');
    assert.equal(clock.isPlaying, actual.isPlaying, label + ': playing');
    assert.equal(clock.paused, actual._paused, label + ': paused');
    assert.ok(Math.abs(clock.elapsed - actual.accumulator) < 1e-7, label + ': accumulator');
    assert.equal(clock.nextTick, actual.nextTick, label + ': next tick');
  }
  return { clock, actual, same,
    step(ms, globalScale = 1) { actual.animationManager.globalTimeScale = globalScale; actual.update(0, ms); advanceFrameClock(clock, ms / 1000, globalScale); same(`advance ${ms}ms at ${globalScale}`); },
    select(index) { actual.setCurrentFrame(frames[index]); clock.setCurrentFrame(clock.currentAnim.frames[index]); same(`select ${index}`); },
    pause() { actual.pause(); clock.pause(); same('pause'); },
    resume() { actual.resume(); clock.resume(); same('resume'); },
  };
}

test('manual landing-frame selection preserves elapsed time and the prior nextTick', () => {
  const f = fixture({ frames: ['rise', 'fall', 'lie'], holds: [90, 90, 900], loop: false });
  f.step(20); f.select(2);
  assert.equal(f.clock.elapsed, 20); assert.equal(f.clock.nextTick, 90);
  f.step(69); assert.equal(f.clock.isPlaying, true);
  f.step(1); assert.equal(f.clock.isPlaying, false, 'Landing does not invent a fresh 900ms hold');
});

test('skipped animation frames retain pinned strict-boundary and 60-additional-frame behavior', () => {
  const boundary = fixture({ frames: ['a', 'b', 'c'], holds: [10, 10, 10], loop: true });
  boundary.step(20); assert.equal(boundary.clock.currentFrame.index, 2);
  boundary.step(0); assert.equal(boundary.clock.currentFrame.index, 3);
  const capped = fixture({ frames: ['a', 'b'], holds: [1, 1], loop: true });
  capped.step(1000); assert.equal(capped.clock.elapsed, 939);
  capped.step(0); assert.equal(capped.clock.elapsed, 878);
});

test('all shipped animation clocks agree under variable intervals, manual frames, pause and time scaling', () => {
  for (const name of ['riley', 'grunt', 'spear', 'hound', 'chief']) {
    const meta = JSON.parse(readFileSync(new URL(`../assets/chars/${name}.anims.json`, import.meta.url)));
    for (const data of meta.anims) {
      const f = fixture(data), intervals = [16.666666666666668, 33.333333333333336, 50, 0, 5, 95, 120];
      for (let frame = 0; frame < 100 && f.clock.isPlaying; frame++) {
        if (frame === 2 && data.frames.length > 2) f.select(2);
        if (frame === 3) { f.pause(); f.step(900); f.resume(); }
        f.clock.timeScale = f.actual.timeScale = [1, 0.75, 0.25, 0.0001][frame % 4];
        f.step(intervals[frame % intervals.length], frame % 9 === 4 ? 0 : frame % 7 === 3 ? 0.3 : 1);
      }
    }
  }
});
