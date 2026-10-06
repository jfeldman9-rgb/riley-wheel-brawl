import test from 'node:test';
import assert from 'node:assert/strict';
import { stage3Simulation, arena, placeC, withSeed } from './helpers/stage3-harness.mjs';
import { Myrddraal, FADE } from '../src/myrddraal.js';
import { STAGE3 } from '../src/stages.js';

const frames = (h, n) => { for (let i = 0; i < n; i++) h.step(); };
function boss(s) {
  const f = new Myrddraal(s, s.riley.x + 200, s.riley.y);
  Object.assign(f, { entering: false, introDone: true, cool: 99, nextBlink: 99 });
  f.T.speed = 0; s.enemies.push(f); return f;
}

for (const ownership of ['holder', 'grabbed']) test(`camera settles while Riley is ${ownership}; live grabs prevent zone completion`, () => withSeed(9, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s, 1502);
    s.zones = STAGE3.zones; s.zone = null; s.zoneI = 0;
    s.camX = s.camMax = 1100; s.bounds = { l: 1100, r: 2380 };
    s.updateZones(0);
    assert.equal(s.zone, STAGE3.zones[1]);
    const c = placeC(s, ownership === 'holder' ? 92 : -46);
    s.wave = s.zone.waves.length - 1; s.waveGap = 0; s.pending = [];
    if (ownership === 'holder') s.riley.startGrab(c); else c.startHold(s.riley);
    frames(h, 40);
    assert.ok(Math.abs(s.camX - s.zone.l) < 8, 'camera completes its approach to the new arena');
    assert.equal(s.zone, STAGE3.zones[1], 'live held enemy cannot be stranded by zone clear');
    assert.ok(c.x >= s.bounds.l + 40 && c.x <= s.bounds.r - 40);
    assert.ok(s.riley.x >= s.bounds.l + 40 && s.riley.x <= s.bounds.r - 40);
    frames(h, 180);
    assert.equal(s.riley.held ?? null, null); assert.equal(s.riley.grabbedBy, null);
    assert.notEqual(c.state, 'held'); assert.notEqual(c.state, 'holding');
    assert.equal(c.sprite.anims.paused, false);
    c.takeHit({ dmg: 999, kind: 'heavy', down: true }, s.riley);
    frames(h, 150);
    assert.equal(s.zone, null); assert.equal(s.locked, false);
    assert.ok(!s.riley.busy, 'input returns after both hold types and zone clear');
  } finally { h.destroy(); }
}));

for (const kind of ['fireball', 'lightning', 'airwhip', 'balefire']) {
  for (const released of [false, true]) {
    for (const outcome of ['knockdown', 'respawn', 'continue']) test(`${kind} ${released ? 'after' : 'before'} release: ${outcome} leaves no cast lock or fear immunity`, () => withSeed(9, () => {
      const h = stage3Simulation({ mode: '' }), s = h.s, R = s.riley;
      try {
        arena(s); s.god = false;
        const f = boss(s); f.auraOn = true;
        s.powers.activate('angreal'); s.powers.activate('fireshield');
        if (kind === 'fireball') R.startCast();
        else if (kind === 'balefire') R.startBalefire();
        else R.startPowerCast(kind);
        if (released) {
          R.sprite.anims.setCurrentFrame(R.sprite.anims.currentAnim.frames[3]);
          R.update(0, s.inp);
        }
        // Balefire normally blocks damage for 1.5s. Also stress interruption by
        // an external state change after that protection is explicitly exhausted.
        R.inv = 0; if (outcome === 'continue') R.lives = 1;
        assert.equal(R.takeHit({ dmg: outcome === 'knockdown' ? 12 : 999, down: true }, { x: R.x - 1 }), true);
        assert.equal(R.state, 'down');
        assert.equal(R.alive, outcome === 'knockdown');
        if (outcome !== 'knockdown') {
          assert.equal(s.powers.boost, null); assert.equal(s.powers.ter, null);
          assert.equal(s.powers.shield, null); assert.equal(s.powers.aura, null);
        }
        const firings = [s.fireballs.length, s.powers.bolts.length, s.powers.whips.length];
        frames(h, 100);
        assert.ok(s.fireballs.length <= firings[0] && s.powers.bolts.length <= firings[1] && s.powers.whips.length <= firings[2]);
        assert.equal(s.beam, null);
        if (outcome === 'continue') { assert.equal(s.gameOver, true); s.inp.press('start'); }
        frames(h, 180);
        assert.equal(R.alive, true); assert.equal(s.gameOver, false);
        assert.ok(!['cast', 'balefire', 'down', 'getup', 'grabbed'].includes(R.state));
        assert.ok(R.inv <= 0); assert.equal(R.grabbedBy, null);
        s.powers.clearAll(); f.dispelT = f.braveT = f.fear = 0;
        R.x = f.x - 200; f.tickFear(1 / 60);
        assert.ok(f.fear > 0, 'NO_FEAR ends when Riley recovers');
        f.auraOn = false;
        assert.equal(s.heroLight.visible, true); assert.equal(s.heroLight.intensity, 1);
        s.powers.activate('lightning'); s.inp.press('special'); h.step();
        assert.equal(R.state, 'cast', 'a fresh cast can start after recovery');
      } finally { h.destroy(); }
    }));
  }
}

test('a cutthroat cannot grab an ongoing cast or invulnerable Balefire', () => withSeed(9, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s); const c = placeC(s, -46), R = s.riley;
    R.startCast(); assert.equal(c.catchResult(R), null);
    R.saidin = 100; R.startBalefire(); assert.equal(c.catchResult(R), null);
    assert.equal(R.takeHit({ dmg: 999, down: true }, c), false);
    frames(h, 100); assert.equal(s.beam, null); assert.equal(R.busy, false);
  } finally { h.destroy(); }
}));

for (const state of ['attack', 'lunge', 'blinkout', 'sunk', 'blinkin', 'fear', 'split']) test(`boss dying during ${state} with active Balefire clears once and retires abilities`, () => withSeed(9, () => {
  const h = stage3Simulation({ mode: '' }), s = h.s;
  try {
    arena(s); const f = boss(s); s.boss = f;
    f.makeCopies(); const copies = [...f.copies];
    f.auraOn = true; f.auraK = 1; f.fear = 0.99;
    f.pendingFear = f.pendingSplit = true;
    f.setState(state, state === 'attack' ? 'slash' : state === 'sunk' ? 'blinkout' : state);
    if (state === 'sunk') {
      f.pool = { x: f.x, y: f.y, t: 0 }; f.st = FADE.blink.poolWarn - 0.1; f.pool.fx = s.kit.shadowPool(f.pool);
    }
    f.hp = 1;
    s.riley.startBalefire(); s.fireBalefire(s.riley);
    assert.ok(s.beam, 'beam remains an active effect at the lethal hit');
    // Sunk is intentionally unhittable. The existing beam kills on emergence.
    if (state === 'sunk') { assert.equal(f.alive, true); frames(h, 60); }
    assert.equal(f.alive, false); assert.equal(s.victoryPending, true);
    assert.equal(f.takeHit({ dmg: 999, kind: 'heavy' }, s.riley), false);
    frames(h, 600);
    assert.equal(s.beam, null); assert.equal(s.clearShown, true); assert.equal(s.ended, true);
    assert.equal(f.auraActive, false); assert.equal(f.fear, 0); assert.equal(f.pool, null);
    assert.equal(f.pendingFear, false); assert.equal(f.pendingSplit, false);
    assert.equal(f.copies.length, 0); assert.ok(copies.every(c => !c.alive && c.sprite.dead));
    assert.equal(s.kit.pools.length, 0); assert.equal(s.kit.copies.length, 0);
    assert.equal(s.vignette.strength, FADE.fear.vig[0]);
    assert.equal(h.observations.deaths.filter(e => e.type === 'fade').length, 1);
    assert.equal(h.observations.hud.filter(e => e.method === 'stageClear').length, 1);
    assert.equal(h.resources().timers, 0); assert.equal(h.resources().tweens, 0);
    assert.equal(s.inp.listeners.press.length, 1); assert.equal(s.inp.listeners.key.length, 1);
  } finally { h.destroy(); }
}));
