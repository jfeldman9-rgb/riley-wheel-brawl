// Docks, halls and the Heart. Nets, lamps, oil, Netweaver lines, Callandor rays.
import { LANE_TOP, LANE_BOT } from './config.js';
import { strikeRiley } from './stage5-hurt.js';
import { sfxCue } from './stage6-voice.js';

const BANDS = Object.freeze([0, 1, 2].map(i => Object.freeze([
  Math.round(LANE_TOP + (LANE_BOT - LANE_TOP) * i / 3),
  Math.round(LANE_TOP + (LANE_BOT - LANE_TOP) * (i + 1) / 3),
])));
export function bandY(i) { const b = BANDS[i] || BANDS[0]; return (b[0] + b[1]) / 2; }

function hurtEnemy(e, dmg, x) {
  if (!e || e.alive === false || e.type === 'belal' || e.type === 'hatch' || !e.takeHit) return;
  e.takeHit({ dmg, down: true, kind: 'heavy', kb: 180 }, { x: x ?? e.x - 1, facing: 1 });
}

export function createStone() {
  const stone = {
    nets: [], lamps: [], pools: [], lines: [], rays: [],
    netAt: 1.6, lampAt: 2.2, lineAt: 2, quality: 0, getupAt: -9,
    setQuality(n) { this.quality = n | 0; },
    clearZone(z) {
      this.nets = this.nets.filter(n => n.zone !== z);
      this.lamps = this.lamps.filter(n => n.zone !== z);
      this.pools = this.pools.filter(n => n.zone !== z);
    },
    dispose() { this.nets = []; this.lamps = []; this.pools = []; this.lines = []; this.rays = []; },
    cancelTells(camX, vw) {
      const on = x => x >= camX - 80 && x <= camX + vw + 80;
      this.nets = this.nets.filter(n => !(n.phase === 'tell' && on(n.x)));
      this.lamps = this.lamps.filter(n => !(n.phase === 'swing' && on(n.x)));
    },
    step(dt, w) { step(stone, dt, w); },
  };
  return stone;
}

function step(s, dt, w) {
  const R = w.riley, zone = w.zone | 0;
  if (s.snare > 0) s.snare -= dt;
  if (R && R.state === 'getup') s.getupAt = 0; else if (s.getupAt >= 0 && s.getupAt < 5) s.getupAt += dt;
  if (zone === 0 && !s.nets.some(n => n.phase === 'tell')) {
    s.netAt -= dt;
    if (s.netAt <= 0) { s.netAt = 3.2 + Math.random() * 1.4; dropNet(s, w); }
  }
  if ((zone === 1 || zone === 2) && !s.lamps.some(n => n.phase === 'swing') && s.pools.length < 1) {
    s.lampAt -= dt;
    const calm = s.getupAt >= 0 && s.getupAt < 0.8;
    if (s.lampAt <= 0 && !calm) { s.lampAt = 3.4 + Math.random() * 1.6; dropLamp(s, w); }
  }
  for (const f of w.fireballs || []) {
    const lamp = s.lamps.find(n => n.phase === 'swing' && Math.abs(f.x - n.x) < 70 && Math.abs((f.gy || f.y) - n.y) < 80);
    if (lamp) lamp.t = 1.1;
  }
  for (const n of s.nets) {
    n.t += dt;
    if (n.phase === 'tell' && n.t >= 1) { n.phase = 'hit'; n.t = 0; landNet(n, w); sfxCue('craneCreak'); }
    if (n.phase === 'hit' && n.t > 0.35) n.dead = true;
  }
  s.nets = s.nets.filter(n => !n.dead);
  for (const n of s.lamps) {
    n.t += dt;
    if (n.phase === 'swing' && n.t >= 1.1) { n.phase = 'land'; n.t = 0; landLamp(s, n, w); }
    if (n.phase === 'land' && n.t > 0.25) n.dead = true;
  }
  s.lamps = s.lamps.filter(n => !n.dead);
  for (const p of s.pools) {
    p.t += dt; p.tick = (p.tick || 0) - dt;
    if (p.tick <= 0) {
      p.tick = 0.5;
      if (R && Math.hypot(R.x - p.x, R.y - p.y) < 80 && (R.z || 0) < 30) strikeRiley(w.scene, 4, { fromX: p.x, dot: true, down: false });
      for (const e of w.enemies || []) if (e.alive && e.type !== 'hatch' && Math.hypot(e.x - p.x, e.y - p.y) < 80) hurtEnemy(e, 10, p.x);
    }
    if (p.t >= 3) p.dead = true;
  }
  s.pools = s.pools.filter(p => !p.dead);
  const boss = w.belal;
  const cap = boss && boss.phase >= 3 ? 2 : 1;
  if (boss && boss.alive && boss.phase >= 2 && w.zone === 3) {
    s.lineAt -= dt;
    const live = s.lines.filter(n => n.phase === 'tell' || n.phase === 'fire').length;
    if (s.lineAt <= 0 && live < cap) { s.lineAt = 2.4 + Math.random(); weave(s, w, cap); }
  } else if (!boss || !boss.alive) s.lines = [];
  for (const n of s.lines) {
    n.t += dt;
    if (n.phase === 'tell' && n.t >= 1.2) { n.phase = 'fire'; n.t = 0; }
    if (n.phase === 'fire') {
      const y0 = BANDS[n.band][0], y1 = BANDS[n.band][1];
      if (R && R.y >= y0 && R.y <= y1 && n.t < 0.15 && !n.snared) { strikeRiley(w.scene, 8, { fromX: R.x - 1, down: false }); if (w.stone) w.stone.snare = 1; n.snared = 1; }
      if (n.snareT > 0) n.snareT -= dt;
      if (n.t > 0.45) n.dead = true;
    }
  }
  s.lines = s.lines.filter(n => !n.dead);
  if (boss && boss.phase >= 3 && w.zone === 3) {
    if (!s.rays.length) for (let i = 0; i < 3; i++) s.rays.push({ band: i, on: i !== 1 });
    s.rayT = (s.rayT || 0) + dt;
    if (s.rayT > 4) { s.rayT = 0; const safe = s.rays.findIndex(r => !r.on); const next = (safe + 1) % 3; s.rays.forEach((r, i) => { r.on = i !== next; }); }
  } else s.rays = [];
}

function dropNet(s, w) {
  const z = w.bounds || { l: 0, r: 1200 };
  const exit = z.r - 160;
  let band = Math.floor(Math.random() * 3);
  const x = (w.riley?.x || z.l + 200);
  if (x > exit - 40) return;
  s.nets.push({ zone: 0, band, x: Math.min(x + 80, exit - 20), t: 0, phase: 'tell' });
  sfxCue('craneCreak');
}

function landNet(n, w) {
  const y0 = BANDS[n.band][0], y1 = BANDS[n.band][1], R = w.riley;
    if (R && R.y >= y0 && R.y <= y1 && Math.abs(R.x - n.x) < 200) {
    strikeRiley(w.scene, 10, { fromX: n.x, down: false });
    if (w.stone) w.stone.snare = 0.8;
  }
  for (const e of w.enemies || []) if (e.alive && e.y >= y0 && e.y <= y1 && Math.abs(e.x - n.x) < 200) hurtEnemy(e, 18, n.x);
}

function dropLamp(s, w) {
  const R = w.riley, x = (R?.x || 1600) + 140, y = bandY(1);
  s.lamps.push({ zone: w.zone | 0, x, y, t: 0, phase: 'swing' });
  sfxCue('chainRattle');
}

function landLamp(s, n, w) {
  const R = w.riley;
  if (R && Math.hypot(R.x - n.x, R.y - n.y) < 80) strikeRiley(w.scene, 12, { fromX: n.x, kb: Math.sign(R.x - n.x) || 1, down: true, launch: 360 });
  for (const e of w.enemies || []) if (e.alive && Math.hypot(e.x - n.x, e.y - n.y) < 80) hurtEnemy(e, 12, n.x);
  s.pools.push({ zone: n.zone, x: n.x, y: n.y, t: 0, tick: 0.1 });
}

function weave(s, w, cap) {
  const used = new Set(s.lines.map(n => n.band));
  const free = [0, 1, 2].filter(i => !used.has(i));
  if (free.length <= 1 && cap >= 2) return;
  if (!free.length) return;
  const band = free[Math.floor(Math.random() * free.length)];
  if (3 - (used.size + 1) < 1 && used.size + 1 >= cap) return;
  s.lines.push({ band, t: 0, phase: 'tell', snareT: 1 });
}

export function threatsOf(s, zone) {
  return {
    nets: s.nets.filter(n => n.zone === zone && n.phase === 'tell').map(n => ({ x: n.x, band: BANDS[n.band] })),
    lamps: s.lamps.filter(n => n.phase === 'swing'),
    pools: s.pools.filter(n => n.zone === zone),
    lines: s.lines.filter(n => n.phase === 'tell' || n.phase === 'fire'),
    rays: s.rays.filter(r => r.on),
  };
}

export { BANDS, LANE_TOP, LANE_BOT };
