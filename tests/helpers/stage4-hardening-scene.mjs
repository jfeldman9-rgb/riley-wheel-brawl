import { stage4Simulation } from './stage4-harness.mjs';
import { DraghkarActor } from '../../src/stage4-actors.js';
export function kissScene() {
  const h = stage4Simulation({ mode: null });
  const s = h.s, R = s.riley;
  s.zones = []; s.enemies = []; s.boss = null;
  s.zone = { l: 0, r: 1280, boss: true }; s.bounds = { l: 0, r: 1280 };
  s.zoneI = 3; s.wave = -1; s.started = true;
  R.x = 740; R.y = 630; R.z = 0; R.inv = 0; R.hp = 100; R.alive = true;
  R.setState('idle', 'idle');
  const d = new DraghkarActor(s, 700, 630); s.boss = d;
  d.phase = 2; d.hp = 300; d.kissBetweenAction = true;
  return { h, s, R, d, hold() { d.startKiss(); d.update(0.61); d.update(0.05); } };
}
