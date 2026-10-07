import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Balthamel, BALTH } from '../src/balthamel.js';
import { createArena, BEAT } from '../src/stage5-arena.js';
import { STAGE5 } from '../src/stage5-def.js';

function world() {
  const riley = { x: 100, y: 630, z: 0, hp: 100, maxHp: 100, alive: true, state: 'idle', facing: 1, grabbedBy: null, inv: 0, enterGrabbed() { this.state = 'grabbed'; }, leaveGrabbed(how) { this.state = how === 'escape' ? 'shoved' : 'idle'; this.how = how; }, face() {} };
  const scene = {
    riley, enemies: [], koCount: 0, bounds: { l: 0, r: 2000 }, god: false,
    kit: { onEmbrace() {}, onEscape() {}, onFlail() {}, onParry() {}, onCoil() {}, onStep() {}, onBalthDown() {} },
    grabBusy() { return false; },
  };
  const b = new Balthamel(scene, 160, 630);
  b.state = 'idle';
  return { scene, riley, b };
}

test('a lethal hit during the flail ends the swing and the corpse does not get up', () => {
  const { riley, b } = world();
  b.startFlail();
  b.st = BALTH.tell + 0.02;
  b.hp = 5;
  b.takeHit({ dmg: 50 });
  assert.equal(b.state, 'down');
  assert.equal(b._down, true);
  const hp = riley.hp;
  b.update(0.5);
  assert.equal(riley.hp, hp);
  assert.equal(b.state, 'down');
  b.st = BALTH.down + 1;
  b.update(0.2);
  assert.equal(b.state, 'down');
  assert.equal(riley.hp, hp);
});

function clockScene() {
  const timers = [];
  const scene = {
    events: new EventEmitter(), ended: false, clearShown: false, cleared: 0,
    time: { delayedCall(ms, fn) {
      const t = { ms, fn, removed: false, remove() { this.removed = true; const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); } };
      timers.push(t); return t;
    } },
    hud: { stageClear() { scene.cleared++; } },
    stats() { return { score: 1 }; },
    music: { set() {} }, caption() {},
    kit: { onDefeat() {}, clearHazards() {} },
  };
  return { scene, timers };
}
function fireDue(timers, ms) {
  for (const t of timers.slice()) {
    if (t.removed) continue;
    t.elapsed = (t.elapsed || 0) + ms;
    if (t.elapsed >= t.ms) { t.remove(); t.fn(); }
  }
}

test('outro timers cancel on shutdown and a dead scene cannot stage-clear', () => {
  const live = clockScene();
  STAGE5.bossDown(live.scene);
  assert.equal(live.timers.length, 6);
  fireDue(live.timers, 11200);
  assert.equal(live.scene.ended, true);
  assert.equal(live.scene.cleared, 1);
  const tail = live.timers.find(t => t.ms === 1200);
  assert.ok(tail);
  live.scene.events.emit('shutdown');
  assert.equal(tail.removed, true);
  fireDue(live.timers, 1200);
  assert.equal(live.scene.clearShown, false);

  const dropped = clockScene();
  STAGE5.bossDown(dropped.scene);
  const kept = dropped.timers.slice();
  dropped.scene.events.emit('shutdown');
  assert.equal(dropped.timers.length, 0);
  fireDue(kept, 20000);
  assert.equal(dropped.scene.ended, false);
  assert.equal(dropped.scene.cleared, 0);

  const dead = clockScene();
  dead.scene.sys = { isActive: () => false };
  STAGE5.bossDown(dead.scene);
  fireDue(dead.timers, 20000);
  assert.equal(dead.scene.ended, false);
  assert.equal(dead.scene.cleared, 0);
});

function mashAt(rate) {
  const { riley, b } = world();
  b.catch(riley);
  const dt = 1 / 60;
  let acc = 0, presses = 0;
  const limit = Math.ceil((BALTH.hold + 0.05) / dt);
  for (let i = 0; i < limit && b.state === 'holding'; i++) {
    acc += dt;
    if (acc + 1e-9 >= 1 / rate) { acc -= 1 / rate; presses++; b.mash(); }
    if (b.state === 'holding') b.update(dt);
  }
  return { how: riley.how, presses, state: b.state, mashN: b.mashN };
}

test('seven presses inside 2.8s escape at 3/sec and at 2.5/sec', () => {
  const fast = mashAt(3);
  assert.equal(fast.how, 'escape');
  assert.equal(fast.state, 'shoved');
  assert.ok(fast.presses >= BALTH.mash, `3/sec landed ${fast.presses}`);
  const edge = mashAt(2.5);
  assert.equal(edge.how, 'escape', `2.5/sec how=${edge.how} presses=${edge.presses} mashN=${edge.mashN}`);
  assert.equal(edge.state, 'shoved');
  assert.equal(edge.presses, BALTH.mash);
  const slow = mashAt(2);
  assert.equal(slow.how, 'throw');
  assert.ok(slow.presses < BALTH.mash);
});

test('embrace chips skip god mode and i-frames', () => {
  const { scene, riley, b } = world();
  b.catch(riley);
  b.hold(BALTH.chipEvery, riley);
  assert.equal(riley.hp, 100 - BALTH.chip);
  scene.god = true;
  b.hold(BALTH.chipEvery, riley);
  assert.equal(riley.hp, 100 - BALTH.chip);
  assert.equal(riley.alive, true);
  assert.equal(b.state, 'holding');
  scene.god = false;
  riley.inv = 0.4;
  b.hold(BALTH.chipEvery, riley);
  assert.equal(riley.hp, 100 - BALTH.chip);
  assert.equal(b.state, 'holding');
});

test('the oak heals as soon as it is open, before phase 3', () => {
  const arena = createArena({ left: 0, right: 2000 });
  const boss = { alive: true, phase: 2, hp: 400, maxHp: 600, x: 1000, y: 630, beatDone: false, markBeat() { this.beatDone = true; } };
  const riley = { x: arena.centre, y: 630, hp: 20, maxHp: 100, alive: true, state: 'idle', fogSlow: 0 };
  const world = { aginor: boss, riley, scene: {} };
  arena.startBeat(boss, null, world);
  arena.beat.t = BEAT.dur;
  arena.step(0.016, world);
  assert.equal(boss.phase, 2);
  assert.equal(arena.oak?.open, true);
  assert.equal(arena.surge, null);
  const hp = riley.hp;
  arena.step(1, world);
  assert.ok(riley.hp > hp, `hp ${riley.hp} did not rise from ${hp}`);
  assert.equal(boss.phase, 2);
  assert.equal(arena.surge, null);
});
