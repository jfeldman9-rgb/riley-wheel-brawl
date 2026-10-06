import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };

const { canEscapeTower, createTowers, TOWER } = await import('../src/stage4-towers.js');

test('a tower tell is long enough to walk out, and a downed Riley is not given a new tell', () => {
  const half = TOWER.width / 2;
  assert.equal(canEscapeTower({ x: 1000, y: 630 }, { x: 1000, width: TOWER.width, tell: TOWER.tell }), true);
  assert.equal(canEscapeTower({ x: 1000 + half - 10, y: 630 }, { x: 1000, width: TOWER.width, tell: TOWER.tell }), true);
  const towers = createTowers();
  const R = { x: 3000, y: 630, hp: 100, state: 'down' };
  let tells = 0;
  towers.arm(2);
  towers.setWave(0);
  towers.step(3, { riley: R, enemies: [], onTowerTell: () => tells++ });
  assert.equal(tells, 0);
  assert.equal(towers.towers.filter(t => !t.harmless).length, 0);
});

test('the zone-2 fog wall stops with at least 640 px of street left', () => {
  const towers = createTowers();
  towers.setWall({ x: 2560, zoneL: 2560, zoneR: 3840 });
  const R = { x: 3600, y: 630, hp: 100, state: 'idle' };
  towers.step(100, { riley: R, enemies: [] });
  assert.ok(towers.zoneWall.x <= 3840 - 640);
  assert.equal(R.state, 'idle');
  const before = R.hp;
  R.x = towers.zoneWall.x;
  towers.step(0.5, { riley: R, enemies: [] });
  assert.ok(R.hp < before);
  assert.equal(R.state, 'idle');
});
