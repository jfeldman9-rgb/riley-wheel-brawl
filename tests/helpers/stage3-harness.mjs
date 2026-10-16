import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stage1Simulation, withSeed, FULL_STAGE_SEEDS } from './stage1-simulation.mjs';
import { startFrameClock } from './animation-clock.mjs';

const { q } = await import('../../src/config.js');
const { Cutthroat } = await import('../../src/darkfriends.js');
const { Stage3Kit } = await import('../../src/stage3.js');

export { withSeed, FULL_STAGE_SEEDS };

export const STAGE3_METAS = Object.fromEntries(
  ['cutthroat', 'riley3', 'fade'].map(k => [
    k,
    JSON.parse(readFileSync(new URL(`../../assets/stage3/chars/${k}.anims.json`, import.meta.url)))
  ])
);

for (const [k, m] of Object.entries(STAGE3_METAS)) {
  assert.equal(m.dir, 'assets/stage3/chars', `${k} dir must be assets/stage3/chars`);
}

const EXTRA = Object.fromEntries(Object.values(STAGE3_METAS).flatMap(m => m.anims.map(a => [a.name, a])));
const PATCHED = Symbol('stage3.patched');

function wrapVisualPlay(v) {
  const origPlay = v.play;
  v.play = function(name, ...args) {
    if (EXTRA[name]) {
      startFrameClock(this.anims, EXTRA[name]);
      return this;
    }
    return origPlay.call(this, name, ...args);
  };
  return v;
}

export function patch(s) {
  if (s[PATCHED]) return;
  s[PATCHED] = true;

  if (s.metas) Object.assign(s.metas, STAGE3_METAS);

  const origJsonGet = s.cache.json.get.bind(s.cache.json);
  s.cache.json.get = function(key) {
    const k = key.replace(/\.A$/, '');
    if (STAGE3_METAS[k]) return STAGE3_METAS[k];
    return origJsonGet(key);
  };

  const origAnimsExists = s.anims.exists.bind(s.anims);
  s.anims.exists = function(key) {
    if (EXTRA[key]) return true;
    return origAnimsExists(key);
  };

  const origAddSprite = s.add.sprite.bind(s.add);
  s.add.sprite = function(...args) {
    const v = origAddSprite(...args);
    return wrapVisualPlay(v);
  };

  if (s.riley?.sprite) {
    wrapVisualPlay(s.riley.sprite);
  }
}

export function stage3Simulation(opts = {}) {
  q.set('s3', '1');
  q.set('story', '0');
  let h;
  try {
    h = stage1Simulation({ ...opts, stage: 3 });
  } catch (err) {
    q.delete('s3');
    q.delete('story');
    throw err;
  }
  const s = h.s;
  patch(s);

  const origDestroy = h.destroy.bind(h);
  h.destroy = function() {
    try {
      origDestroy();
    } finally {
      q.delete('s3');
      q.delete('story');
    }
  };

  let steps = 0;
  while (!s.started && steps < 120) {
    h.step();
    steps++;
  }
  if (s.cutscene) {
    s.endTwixCutscene?.('skip');
  }

  assert.equal(s.stageNo, 3, 'stageNo must be 3');
  assert.ok(s.kit instanceof Stage3Kit, 's.kit must be Stage3Kit');

  return h;
}

export function arena(s, x = 640) {
  s.zones = [];
  s.zone = { l: 0, r: 1280, boss: true };
  s.locked = true;
  s.enemies = [];
  s.riley.x = x;
  s.riley.y = 630;
  s.riley.z = 0;
  s.riley.vz = 0;
  s.riley.vx = 0;
  s.riley.vy = 0;
  s.riley.state = 'idle';
  s.riley.cur = 'riley_idle';
  s.riley.grabbedBy = null;
  s.riley.alive = true;
  s.riley.inv = 0;
  s.god = true;
  s.camX = 0;
  s.bounds = { l: 0, r: 1280 };
}

export function placeC(s, dx, dy = 0) {
  const R = s.riley;
  const c = new Cutthroat(s, R.x + dx, R.y + dy);
  c.entering = false;
  c.cool = 9;
  c.grabCool = 99;
  s.enemies.push(c);
  return c;
}
