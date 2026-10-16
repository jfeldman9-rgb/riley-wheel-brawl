import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, withSeed } from './helpers/stage3-harness.mjs';
import { Myrddraal, FADE, lightNear } from '../src/myrddraal.js';
import { LIGHTNING } from '../src/powers.js';

const sources = {
  fireball: s => s.spawnFireball(s.riley),
  lightning: s => {
    s.powers.fireLightning(s.riley);
    s.powers.bolts[0].t = LIGHTNING.life - 1 / 120;
  },
  fireshield: s => {
    s.powers.activate('fireshield');
    s.powers.ter.t = 1 / 120;
  },
  balefire: s => s.fireBalefire(s.riley),
};

for (const [name, light] of Object.entries(sources)) {
  test(`${name} dispels on the aura's activation frame, including expiring light`, () => withSeed(1, () => {
    const h = stage3Simulation({ mode: '' }), s = h.s;
    try {
      arena(s);
      s.riley.face(1);
      const f = new Myrddraal(s, s.riley.x + 200, s.riley.y);
      Object.assign(f, { entering: false, introDone: true, cool: 99, nextBlink: 99 });
      s.enemies.push(f);
      f.startFear();
      light(s);
      f.sprite.anims.setCurrentFrame(f.sprite.anims.currentAnim.frames[FADE.fear.auraFrame]);
      assert.equal(f.auraOn, false);
      assert.equal(lightNear(s, f.x, FADE.fear.dispelRange), name);
      s.fx.hitstop = s.fx.slowmo = 0;
      h.step();
      assert.equal(f.auraOn, true);
      assert.equal(f.auraActive, false, 'activation cannot expose a live aura for one frame');
      assert.equal(f.dispelT, FADE.fear.dispel);
      assert.equal(s.kit.stats.fears, 1);
      assert.equal(s.kit.stats.dispels, 1);
      assert.equal(f.fear, 0);
      if (name === 'lightning') assert.equal(s.powers.bolts.length, 0, 'light expired on the activation frame');
      if (name === 'fireshield') assert.equal(s.powers.active('fireshield'), false);
      s.fx.hitstop = s.fx.slowmo = 0;
      h.step();
      assert.equal(f.auraActive, false);
      assert.equal(s.kit.stats.dispels, 1, 'sustained light does not double count the dispel');
    } finally { h.destroy(); }
  }));
}
