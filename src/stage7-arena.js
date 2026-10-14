// Glass-column plaza: resonance rains and the access-key shockwave. Game clock only.
import { strikeRiley } from './stage7-hurt.js';
import { sfxCue } from './stage7-voice.js';

export const COLUMNS = Object.freeze([4100, 4350, 4600, 4850, 5050]);
export const RESONANCE = Object.freeze({ every: 3.2, tell: 1.0, rain: 0.9, halfW: 110, dmg: 12, enemyDmg: 20 });
export const SHOCK = Object.freeze({ speed: 520, life: 0.5, dmg: 16, band: 30 });

export function createArena7() {
  return {
    columns: COLUMNS.map(x => ({ x, glow: 0 })),
    rain: null, at: RESONANCE.every, order: 0, shock: null, cleared: false,
    setQuality() {},
    dispose() { this.rain = null; this.shock = null; for (const c of this.columns) c.glow = 0; },
    clearShards() { const had = !!this.rain; this.rain = null; for (const c of this.columns) c.glow = 0; return had; },
    fireShock(x, y) { this.shock = { x, y, r: 0, t: 0, hit: false }; sfxCue('shockRing'); },
    step(dt, w) { stepArena(this, dt, w); },
  };
}

function hurtEnemy(e, dmg, x) {
  if (!e || e.alive === false || !e.takeHit || e.type === 'asmodean') return;
  e.takeHit({ dmg, down: true, kind: 'heavy', kb: 160 }, { x: x ?? e.x - 1, facing: 1 });
}

function stepArena(a, dt, w) {
  if (!(dt > 0)) return;
  const R = w.riley, boss = w.boss;
  for (const c of a.columns) if (c.glow > 0) c.glow = Math.max(0, c.glow);
  if (w.resonance && boss?.alive && !a.cleared) {
    if (!a.rain) {
      a.at -= dt;
      if (a.at <= 0) {
        const col = a.columns[a.order % a.columns.length];
        a.order++;
        a.rain = { x: col.x, col, t: 0, phase: 'tell', hitRiley: false, hit: new Set() };
        col.glow = 2;
        a.at = RESONANCE.every;
        sfxCue('glassHum');
        w.onColumn?.(a.rain);
      }
    }
  }
  if (a.rain) {
    const rain = a.rain;
    rain.t += dt;
    rain.col.glow = rain.phase === 'tell' ? 2 : 1;
    if (rain.phase === 'tell' && rain.t >= RESONANCE.tell) { rain.phase = 'rain'; rain.t = 0; sfxCue('shardCrack'); }
    if (rain.phase === 'rain') {
      if (R && !rain.hitRiley && Math.abs(R.x - rain.x) <= RESONANCE.halfW && (R.z || 0) < 40) {
        rain.hitRiley = true;
        strikeRiley(w.scene, RESONANCE.dmg, { fromX: rain.x, kb: Math.sign(R.x - rain.x) || 1, down: true, launch: 380 });
      }
      for (const e of w.enemies || []) {
        if (!e?.alive || rain.hit.has(e) || Math.abs(e.x - rain.x) > RESONANCE.halfW) continue;
        rain.hit.add(e);
        hurtEnemy(e, RESONANCE.enemyDmg, rain.x);
      }
      if (rain.t >= RESONANCE.rain) { rain.col.glow = 0; a.rain = null; }
    }
  }
  if (a.shock) {
    const s = a.shock;
    s.t += dt; s.r = SHOCK.speed * s.t;
    if (R && !s.hit && (R.z || 0) < 40) {
      const d = Math.hypot(R.x - s.x, (R.y - s.y) * 0.6);
      if (Math.abs(d - s.r) <= SHOCK.band) {
        s.hit = true;
        strikeRiley(w.scene, SHOCK.dmg, { fromX: s.x, kb: Math.sign(R.x - s.x) || 1, down: true, launch: 400 });
      }
    }
    if (s.t >= SHOCK.life) a.shock = null;
  }
}

export function threats7(a) {
  return {
    rain: a?.rain ? { x: a.rain.x, phase: a.rain.phase, halfW: RESONANCE.halfW } : null,
    shock: a?.shock ? { x: a.shock.x, y: a.shock.y, r: a.shock.r } : null,
  };
}
