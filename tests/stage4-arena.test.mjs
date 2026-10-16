import test from 'node:test';
import assert from 'node:assert/strict';
import { createArena } from '../src/stage4-arena.js';

test('phase-3 walls never close under 640 px, even on a huge dt, and contact does not knock down', () => {
  const arena = createArena({ left: 3920, right: 5200 });
  const R = { x: 4500, y: 630, hp: 100, state: 'idle' };
  arena.step(100, { riley: R });
  assert.ok(arena.width >= 640, `width ${arena.width}`);
  assert.equal(R.state, 'idle');
  R.x = arena.left - 10;
  const hp = R.hp;
  arena.step(0.5, { riley: R });
  assert.ok(R.hp < hp);
  assert.equal(R.state, 'idle');
  assert.ok(R.x > arena.left - 10);
});

test('pushLight opens a wall and holdWalls freezes the squeeze', () => {
  const arena = createArena({ left: 0, right: 2000 });
  arena.step(1, { riley: { x: 1000, y: 630, hp: 50, state: 'idle' } });
  const left = arena.left;
  arena.pushLight('left');
  assert.ok(arena.left < left);
  const heldL = arena.left, heldR = arena.right;
  arena.step(5, { riley: { x: 1000, y: 630, hp: 50, state: 'idle' }, holdWalls: true });
  assert.equal(arena.left, heldL);
  assert.equal(arena.right, heldR);
  assert.ok(arena.width >= 640);
});

test('dispose drops the arena and its fog swoop', () => {
  const arena = createArena();
  arena.step(2, { riley: { x: 4500, y: 630, hp: 40, state: 'idle' } });
  arena.dispose();
  assert.equal(arena.active, false);
  assert.equal(arena.swoop, null);
});
