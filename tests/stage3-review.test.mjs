import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, withSeed } from './helpers/stage3-harness.mjs';

const { Myrddraal, FADE } = await import('../src/myrddraal.js');
function placeFade(h) {
  const s = h.s;
  arena(s, 640);
  s.riley.y = 630;
  const f = new Myrddraal(s, s.riley.x + 300, s.riley.y);
  f.entering = false;
  f.introDone = true;
  f.cool = 9;
  f.nextBlink = 99;
  s.enemies.push(f);
  s.boss = f;
  h.step();
  return f;
}

test('fade: approach cooldown and knockdown time advance once per frame', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const f = placeFade(h);
      f.setState('approach', 'walk');
      f.cool = 3;
      f.nextBlink = 99;
      f.pendingFear = f.pendingSplit = false;
      for (let i = 0; i < 60; i++) h.step();
      assert.ok(Math.abs(f.cool - 2) < 0.02, `cool ${f.cool} should drop by about 1s`);
      assert.equal(f.state, 'approach');

      f.setState('down', 'knockdown');
      for (let i = 0; i < 30; i++) h.step();
      assert.equal(f.state, 'down');
      assert.equal(f.done, false);
      assert.ok(Math.abs(f.st - 0.5) < 0.02, `down st ${f.st} should be about 0.5s`);
    } finally {
      h.destroy();
    }
  });
});

test('fade: a punish lunge latches through a slash and fires on the next open frame', () => {
  withSeed(1, () => {
    const h = stage3Simulation({ mode: '' });
    try {
      const f = placeFade(h);
      f.hp = 0.33 * 440 - 1;
      h.step();
      assert.equal(f.phase, 3);
      f.pendingFear = f.pendingSplit = false;
      f.nextBlink = 99;
      f.cool = 9;
      f.startAttack();
      f.onCopyPopped({});
      assert.equal(f.forceLungeT, FADE.split.wrongHitPunish);
      for (let i = 0; i < 30; i++) h.step();
      assert.equal(f.state, 'attack');
      assert.ok(f.forceLungeT > 0.2, `forceLungeT ${f.forceLungeT} held during the slash`);
      let frames = 0;
      while (f.state === 'attack' && frames < 90) {
        h.step();
        frames++;
      }
      assert.equal(f.state, 'approach');
      assert.ok(f.forceLungeT > 0, `forceLungeT ${f.forceLungeT} still armed`);
      h.step();
      assert.equal(f.state, 'lunge');
    } finally {
      h.destroy();
    }
  });
});

