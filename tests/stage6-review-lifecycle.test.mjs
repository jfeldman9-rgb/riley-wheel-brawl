import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { q } from '../src/config.js';
import { callRand, lateEnemies, warmRand } from '../src/stage6-lifecycle.js';
import { resetRandCall, abortRandCall } from '../src/rand-call-cutscene.js';
import { videoEnv } from './stage6-hardening-fixtures.mjs';
import { stage6Simulation, withSeed } from './helpers/stage6-harness.mjs';

for (const access of ['initial', 'finish', 'warm']) test(`throwing sessionStorage getter at ${access} cannot strand a spent Rand call`, async () => {
  const e = videoEnv(), h = withSeed(1, () => stage6Simulation({ mode: null })), s = h.s, k = s.kit;
  Object.assign(s, { cutRoot: e.root }); k.quality = 0; q.set('cutscenes', '1');
  s.enemies.push({ type: 'grunt', alive: true, x: 300, y: 630, hp: 10, maxHp: 10, sync() {} });
  const deny = () => Object.defineProperty(e.root, 'sessionStorage', { configurable: true, get() { throw new Error('storage denied'); } });
  resetRandCall();
  try {
    if (access !== 'finish') deny();
    if (access === 'warm') assert.equal(await warmRand(s), false);
    assert.equal(callRand(k), true); assert.equal(k.rand.calls, 1);
    assert.ok(s.cutscene); if (access === 'finish') deny();
    e.videos[0].fire('ended'); assert.ok(k.strike, 'completion runs the strike');
    for (let i = 0; i < 121; i++) s.update(i * 17, 1000 / 60);
    assert.equal(k.strike, null); assert.equal(k.rand.on, false);
    assert.equal(s.cutscene, null); assert.equal(e.timers.size, 0);
  } finally { abortRandCall(s); h.destroy(); q.delete('cutscenes'); }
});

test('delayed bot memory follows current living enemies across replacement waves', () => {
  const s = { enemies: [] }, bot = { s, lag: 0.25, t: 0 };
  const foe = () => ({ type: 'grunt', alive: true, canBeHit: true, state: 'idle', x: 400, y: 630, st: 0, hp: 10 });
  for (let wave = 0; wave < 30; wave++) {
    const live = foe(), dead = foe(), gone = foe(); s.enemies = [live, dead, gone];
    bot.t += 0.3; lateEnemies(bot); assert.equal(bot.mem.size, 3);
    dead.alive = false; gone.gone = true; bot.t += 0.3;
    const sampled = lateEnemies(bot);
    assert.equal(bot.mem.size, 1); assert.equal(bot.mem.has(live), true);
    assert.equal(sampled.length, 1); assert.equal(sampled[0].x, live.x);
    s.enemies = []; lateEnemies(bot); assert.equal(bot.mem.size, 0);
  }
});
