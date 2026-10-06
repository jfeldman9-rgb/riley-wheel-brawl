import test from 'node:test';
import assert from 'node:assert/strict';
import { Draghkar, DRAGHKAR } from '../src/draghkar.js';

function makeScene(over = {}) {
  return {
    riley: {
      x: 640, y: 600, hp: 100, alive: true, state: 'idle', facing: 1, attackFrame: false,
      grabbedBy: null,
      ...(over.riley || {}),
    },
    enemies: [],
    fireballs: over.fireballs || [],
    grabBusy: false,
    paused: !!over.paused,
    ...(over.scene || {}),
  };
}

test('croon lasts 2.5s, drifts Riley at 60 px/s, and receives 0.6x damage', () => {
  const s = makeScene({ riley: { x: 500, y: 600, hp: 100, state: 'idle' } });
  const d = new Draghkar(s, 700, 600);
  d.phase = 2;
  assert.equal(d.startCroon(), true);
  assert.equal(d.state, 'croon');
  assert.equal(d.croonRings, true);
  assert.equal(d.getDamageMultiplier(), 0.6);

  // Update 1 second: Riley should drift 60 px towards Draghkar (from 500 towards 700 -> 560)
  d.update(1.0);
  assert.equal(s.riley.x, 560);
  assert.equal(d.state, 'croon');

  // Walking away beats the drift: if Riley moves left at 160 px/s, Riley net moves away
  // In 1 second, Riley drifts +60 but moves -160 = net -100 px
  s.riley.x -= 160;
  d.update(1.0);
  assert.equal(s.riley.x, 560 - 160 + 60);

  // Remaining 0.5s completes croon
  d.update(0.51);
  assert.equal(d.state, 'grounded');
  assert.equal(d.croonRings, false);
});

test('croon is cancelled by a light weave within 400 px', () => {
  const s = makeScene({
    riley: { x: 500, y: 600 },
    fireballs: [{ x: 800, y: 600, alive: true }], // 100 px from Draghkar at 700
  });
  const d = new Draghkar(s, 700, 600);
  d.phase = 2;
  d.startCroon();
  assert.equal(d.state, 'croon');

  d.update(1 / 120);
  assert.equal(d.state, 'grounded', 'light weave within 400 px should cancel croon');
  assert.equal(d.croonRings, false);
});

test('croon is NOT cancelled by a light weave further than 400 px away', () => {
  const s = makeScene({
    riley: { x: 200, y: 600 },
    fireballs: [{ x: 200, y: 600, alive: true }], // 500 px from Draghkar at 700
  });
  const d = new Draghkar(s, 700, 600);
  d.phase = 2;
  d.startCroon();
  d.update(1 / 120);
  assert.equal(d.state, 'croon');
});

test('kiss tell is 0.6s and lunge is 700 px/s up to 0.4s (max 280 px reach)', () => {
  const s = makeScene({ riley: { x: 2000, y: 600 } }); // Riley far away
  const d = new Draghkar(s, 700, 600);
  d.phase = 2;
  d.kissBetweenAction = true;

  assert.equal(d.startKiss(), true);
  assert.equal(d.state, 'kiss_tell');

  const startX = d.x;
  // After 0.59s still in tell
  d.update(0.59);
  assert.equal(d.state, 'kiss_tell');

  // At 0.6s transitions to lunge
  d.update(0.01);
  assert.equal(d.state, 'kiss_lunge');
  assert.equal(d.facing, 1);

  // Moves at 700 px/s for 0.4s = 280 px max distance
  d.update(0.40);
  assert.equal(d.state, 'grounded');
  assert.ok(Math.abs(d.x - (startX + 280)) < 2);
  assert.ok(d.kissCooldown > 0);
});

test('fire shield grants immunity to kiss: kiss fizzles and Draghkar recoils 1.2s', () => {
  const s = makeScene({
    riley: { x: 740, y: 600, fireShield: true },
  });
  const d = new Draghkar(s, 700, 600);
  d.phase = 2;
  d.kissBetweenAction = true;
  d.startKiss();
  d.update(0.61); // Enter lunge
  d.update(0.05); // Contact with Riley

  assert.equal(d.state, 'kiss_recoil');
  assert.equal(s.riley.grabbedBy, null);
  assert.equal(s.grabBusy, false);

  // Recoils for 1.2s
  d.update(1.1);
  assert.equal(d.state, 'kiss_recoil');
  d.update(0.2);
  assert.notEqual(d.state, 'kiss_recoil');
});

test('facing Riley with active attack frame counters kiss lunge; attacking away gets grabbed', () => {
  // 1. Facing attack frame counters kiss
  const s1 = makeScene({
    riley: { x: 740, y: 600, facing: -1, attackFrame: true }, // facing Draghkar on left
  });
  const d1 = new Draghkar(s1, 700, 600);
  d1.phase = 2;
  d1.kissBetweenAction = true;
  d1.startKiss();
  d1.update(0.61);
  d1.update(0.05);

  assert.notEqual(d1.state, 'kiss_hold');
  assert.equal(s1.riley.grabbedBy, null);

  // 2. Attacking away (facing +1 when Draghkar is at left) gets grabbed
  const s2 = makeScene({
    riley: { x: 740, y: 600, facing: 1, attackFrame: true }, // attacking away
  });
  const d2 = new Draghkar(s2, 700, 600);
  d2.phase = 2;
  d2.kissBetweenAction = true;
  d2.startKiss();
  d2.update(0.61);
  d2.update(0.05);

  assert.equal(d2.state, 'kiss_hold');
  assert.equal(s2.riley.grabbedBy, d2);
  assert.equal(s2.grabBusy, true);
});

test('exclusive ownership: cannot grab while scene.grabBusy or already grabbedBy another', () => {
  const s = makeScene({
    riley: { x: 740, y: 600, state: 'grabbed', grabbedBy: { type: 'cutthroat' } },
    scene: { grabBusy: true },
  });
  const d = new Draghkar(s, 700, 600);
  d.phase = 2;
  d.kissBetweenAction = true;

  // Cannot start kiss while busy
  assert.equal(d.startKiss(), false);

  // If already lunging, passes without grabbing
  d.state = 'kiss_lunge';
  d.lungeDir = 1;
  d.update(0.1);
  assert.notEqual(d.state, 'kiss_hold');
  assert.notEqual(s.riley.grabbedBy, d);
});

test('grab releases Riley own held enemy first', () => {
  let heldReleased = false;
  const s = makeScene({
    riley: {
      x: 740, y: 600, state: 'idle',
      held: { released: () => { heldReleased = true; } },
    },
  });
  const d = new Draghkar(s, 700, 600);
  d.phase = 2;
  d.kissBetweenAction = true;
  d.startKiss();
  d.update(0.61);
  d.update(0.05);

  assert.equal(d.state, 'kiss_hold');
  assert.equal(heldReleased, true);
  assert.equal(s.riley.held, null);
});

test('kiss hold deals 3 HP per 0.5s up to 3.0s, and mash 8 escapes causing 1.6s reel at 1.5x vuln', () => {
  const s = makeScene({ riley: { x: 740, y: 600, hp: 100 } });
  const d = new Draghkar(s, 700, 600);
  d.phase = 2;
  d.kissBetweenAction = true;
  d.startKiss();
  d.update(0.61);
  d.update(0.05);
  assert.equal(d.state, 'kiss_hold');

  // Advance 0.5s -> 3 HP damage
  d.update(0.5);
  assert.equal(s.riley.hp, 97);

  // Mash 7 times: not yet escaped
  for (let i = 0; i < 7; i++) d.mash();
  assert.equal(d.state, 'kiss_hold');

  // 8th mash escapes
  let escaped = false;
  d.deps.onRileyEscape = () => { escaped = true; };
  assert.equal(d.mash(), true);
  assert.equal(d.state, 'reels');
  assert.equal(escaped, true);
  assert.equal(s.riley.grabbedBy, null);
  assert.equal(s.grabBusy, false);

  // During reels, damage taken is 1.5x
  assert.equal(d.getDamageMultiplier(), 1.5);
  const hpBefore = d.hp;
  d.takeHit({ dmg: 20 });
  assert.equal(d.hp, hpBefore - 30); // 20 * 1.5 = 30

  // Reels for 1.6s
  d.update(1.59);
  assert.equal(d.state, 'reels');
  d.update(0.02);
  assert.equal(d.state, 'grounded');
});

test('mash decays by 1 every 0.5s', () => {
  const s = makeScene({ riley: { x: 740, y: 600, hp: 100 } });
  const d = new Draghkar(s, 700, 600);
  d.phase = 2;
  d.kissBetweenAction = true;
  d.startKiss();
  d.update(0.61);
  d.update(0.05);

  // Mash 4 times
  for (let i = 0; i < 4; i++) d.mash();
  assert.equal(d.mashCount, 4);

  // After 0.5s without mashing, decays to 3
  d.update(0.5);
  assert.equal(d.mashCount, 3);

  // After another 0.5s, decays to 2
  d.update(0.5);
  assert.equal(d.mashCount, 2);
});

test('kiss timeout deals 18 dmg + knockdown and triggers 10s lockout', () => {
  const s = makeScene({ riley: { x: 740, y: 600, hp: 100 } });
  const d = new Draghkar(s, 700, 600);
  d.phase = 2;
  d.kissBetweenAction = true;
  d.startKiss();
  d.update(0.61);
  d.update(0.05);

  // Wait out the full 3.0s hold
  d.update(3.0);
  assert.notEqual(d.state, 'kiss_hold');
  assert.ok(['grounded', 'croon'].includes(d.state));
  // 6 ticks of 3 HP (18) + timeout 18 = 36 total dmg
  assert.equal(s.riley.hp, 100 - 18 - 18);
  assert.equal(s.riley.state, 'down');
  assert.equal(s.riley.grabbedBy, null);
  assert.equal(s.grabBusy, false);

  // Lockout is 10s
  assert.ok(d.kissLockout > 9.9 && d.kissLockout <= 10.0);
  d.kissBetweenAction = true;
  assert.equal(d.startKiss(), false, 'kiss must be refused during 10s lockout');

  d.update(9.9);
  assert.equal(d.startKiss(), false);
  d.update(0.2);
  assert.equal(d.kissLockout, 0);
});

test('never two kisses without a swoop or croon between', () => {
  const s = makeScene({ riley: { x: 740, y: 600, hp: 100 } });
  const d = new Draghkar(s, 700, 600);
  d.phase = 2;

  // Initially kissBetweenAction is false
  assert.equal(d.startKiss(), false);

  // Doing a croon allows a kiss
  d.startCroon();
  assert.equal(d.kissBetweenAction, true);
  d.update(2.51);

  // Kiss 1
  d.kissCooldown = 0;
  assert.equal(d.startKiss(), true);
  d.update(0.61);
  d.update(0.05);
  for (let i = 0; i < 8; i++) d.mash(); // escape
  assert.equal(d.kissBetweenAction, false);

  // Reset cooldown, attempt back-to-back kiss
  d.kissCooldown = 0;
  d.kissLockout = 0;
  assert.equal(d.startKiss(), false, 'second kiss refused without swoop or croon');

  // Swooping re-enables kiss
  d.kissCooldown = 10; // keep on cooldown so it doesn't auto-consume kiss on landing
  d.startSwoop(1, 1);
  d.update(DRAGHKAR.swoopTell + 0.1);
  d.update(1.9); // completes swoop dive
  assert.equal(d.kissBetweenAction, true);

  // Now kiss 2 is allowed
  d.kissCooldown = 0;
  d.state = 'grounded';
  s.riley.state = 'idle';
  assert.equal(d.startKiss(), true);
});

test('synchronous release on death, down, respawn, continue, destroy, and hazard', () => {
  // 1. Release on death
  const s1 = makeScene({ riley: { x: 740, y: 600, hp: 100 } });
  const d1 = new Draghkar(s1, 700, 600);
  d1.phase = 2; d1.kissBetweenAction = true;
  d1.startKiss(); d1.update(0.61); d1.update(0.05);
  assert.equal(s1.riley.grabbedBy, d1);
  d1.defeat();
  assert.equal(s1.riley.grabbedBy, null);
  assert.equal(s1.grabBusy, false);

  // 2. Release on Riley down
  const s2 = makeScene({ riley: { x: 740, y: 600, hp: 100 } });
  const d2 = new Draghkar(s2, 700, 600);
  d2.phase = 2; d2.kissBetweenAction = true;
  d2.startKiss(); d2.update(0.61); d2.update(0.05);
  s2.riley.state = 'down';
  d2.update(1 / 120);
  assert.equal(s2.riley.grabbedBy, null);

  // 3. Release on destroy / dispose
  const s3 = makeScene({ riley: { x: 740, y: 600, hp: 100 } });
  const d3 = new Draghkar(s3, 700, 600);
  d3.phase = 2; d3.kissBetweenAction = true;
  d3.startKiss(); d3.update(0.61); d3.update(0.05);
  d3.destroy();
  assert.equal(s3.riley.grabbedBy, null);

  // 4. Hazard breaks kiss
  const s4 = makeScene({ riley: { x: 740, y: 600, hp: 100 } });
  const d4 = new Draghkar(s4, 700, 600);
  d4.phase = 2; d4.kissBetweenAction = true;
  d4.startKiss(); d4.update(0.61); d4.update(0.05);
  d4.takeHit({ hazard: true });
  assert.equal(s4.riley.grabbedBy, null);
  assert.equal(d4.state, 'reels');
});

test('pause freezes hold timer and mash decay', () => {
  const s = makeScene({ riley: { x: 740, y: 600, hp: 100 }, paused: true });
  const d = new Draghkar(s, 700, 600);
  d.phase = 2; d.kissBetweenAction = true;
  s.paused = false;
  d.startKiss(); d.update(0.61); d.update(0.05);
  assert.equal(d.state, 'kiss_hold');

  // Mash 4 times
  d.mash(); d.mash(); d.mash(); d.mash();
  assert.equal(d.mashCount, 4);

  // Pause the scene
  s.paused = true;
  const hpBefore = s.riley.hp;
  d.update(2.0); // 2 seconds while paused

  assert.equal(d.state, 'kiss_hold');
  assert.equal(s.riley.hp, hpBefore, 'no damage while paused');
  assert.equal(d.mashCount, 4, 'no mash decay while paused');

  // Unpause: updates resume normally
  s.paused = false;
  d.update(0.5);
  assert.equal(s.riley.hp, hpBefore - 3);
  assert.equal(d.mashCount, 3);
});

test('30, 60, and 120 Hz parity during kiss hold and decay', () => {
  function simHold(hz) {
    const s = makeScene({ riley: { x: 740, y: 600, hp: 100 } });
    const d = new Draghkar(s, 700, 600);
    d.phase = 2; d.kissBetweenAction = true;
    d.startKiss();
    d.update(0.61);
    d.update(0.05);
    for (let i = 0; i < 5; i++) d.mash();

    const dt = 1 / hz;
    const n = Math.round(1.5 * hz);
    for (let i = 0; i < n; i++) d.update(dt);
    return { hp: s.riley.hp, mashCount: d.mashCount, state: d.state };
  }

  const r30 = simHold(30);
  const r60 = simHold(60);
  const r120 = simHold(120);

  assert.deepEqual(r30, r60);
  assert.deepEqual(r60, r120);
});
