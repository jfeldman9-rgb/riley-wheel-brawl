// Asmodean's phrases. 96 BPM on the game clock (beat 0.625 s), never audio time.
// Every phrase leaves at least one band free for its whole length; one note per phrase is gold.
import { VOLLEY_BANDS } from './stages.js';
import { strikeRiley } from './stage7-hurt.js';
import { sfxCue } from './stage7-voice.js';

export const BEAT = 0.625;
export const NOTE = Object.freeze({ speed: 360, dmg: 7, reflectR: 90, reflectSpeed: 520 });
export const PHRASES = Object.freeze([
  Object.freeze({ bands: Object.freeze([0, 1, 0, 1]), gold: 2 }),
  Object.freeze({ bands: Object.freeze([1, 2, 1, 2]), gold: 1 }),
  Object.freeze({ bands: Object.freeze([0, 2, 0, 2]), gold: 3 }),
  Object.freeze({ bands: Object.freeze([2, 1, 2, 1]), gold: 0 }),
  Object.freeze({ bands: Object.freeze([1, 0, 1, 0]), gold: 2 }),
  Object.freeze({ bands: Object.freeze([2, 0, 2, 0]), gold: 1 }),
  Object.freeze({ bands: Object.freeze([0, 1, 1, 0]), gold: 1 }),
  Object.freeze({ bands: Object.freeze([2, 2, 1, 1]), gold: 3 }),
]);

export function freeBand(phrase) {
  const used = new Set(phrase?.bands || []);
  for (let b = 0; b < 3; b++) if (!used.has(b)) return b;
  return -1;
}

export function bandMid(band) {
  const b = VOLLEY_BANDS[band] || VOLLEY_BANDS[0];
  return (b[0] + b[1]) / 2;
}

export function createNotes() {
  return { notes: [], tells: [], phraseI: 0, at: 1.6, pending: [] };
}

export function clearNotes(field) {
  if (!field) return 0;
  const n = field.notes.length + field.tells.length + field.pending.length;
  field.notes = []; field.tells = []; field.pending = [];
  return n;
}

function launch(field, boss, band, gold) {
  const dir = boss.facing || -1;
  field.notes.push({ x: boss.x + dir * 40, y: bandMid(band), band, dir, gold: !!gold, reflected: false, dead: false, age: 0 });
  sfxCue(gold ? 'harpGold' : 'harpPluck');
}

/** w: { scene, riley, boss, interval (5 or 10), active, onReflect } */
export function stepNotes(field, dt, w) {
  if (!field || !(dt > 0)) return;
  const boss = w.boss, R = w.riley;
  if (w.active && boss?.alive) {
    field.at -= dt;
    if (field.at <= 0) {
      const phrase = PHRASES[field.phraseI % PHRASES.length];
      field.phraseI++;
      field.at = w.interval || 5;
      phrase.bands.forEach((band, i) => {
        field.pending.push({ band, gold: i === phrase.gold, t: i * BEAT, told: false });
      });
    }
  }
  for (const p of field.pending) {
    p.t -= dt;
    if (!p.told && p.t <= BEAT) { p.told = true; field.tells.push({ band: p.band, gold: p.gold, t: Math.max(0, p.t) }); }
    if (p.t <= 0 && !p.done) { p.done = true; if (boss?.alive) launch(field, boss, p.band, p.gold); }
  }
  field.pending = field.pending.filter(p => !p.done);
  for (const t of field.tells) t.t -= dt;
  field.tells = field.tells.filter(t => t.t > 0);
  const camL = (w.scene?.camX || 0) - 240, camR = (w.scene?.camX || 0) + 1520;
  for (const n of field.notes) {
    n.age = (n.age || 0) + dt;
    n.x += n.dir * (n.reflected ? NOTE.reflectSpeed : NOTE.speed) * dt;
    if (n.x < camL || n.x > camR) { n.dead = true; continue; }
    if (n.reflected) {
      if (boss?.alive && Math.abs(n.x - boss.x) < 44 && Math.abs(n.y - boss.y) < 60) {
        n.dead = true;
        boss.takeReflected?.();
        w.onReflect?.(n);
      }
      continue;
    }
    if (!R || !R.alive) continue;
    const near = Math.hypot(n.x - R.x, n.y - R.y);
    if (n.gold && R.attackFrame && near <= NOTE.reflectR && Math.sign(n.x - R.x || R.facing) === (R.facing || 1)) {
      n.reflected = true; n.dir = -n.dir;
      sfxCue('harpGold');
      continue;
    }
    // A note arms 0.2 s after it leaves the harp, so point-blank phrases stay readable.
    if (n.age >= 0.2 && Math.abs(n.x - R.x) < 28 && Math.abs(n.y - R.y) < 26) {
      n.dead = true;
      strikeRiley(w.scene, NOTE.dmg, { fromX: n.x, kb: n.dir * 120 });
    }
  }
  field.notes = field.notes.filter(n => !n.dead);
}
