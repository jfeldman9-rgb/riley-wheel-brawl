// Stage 3 owns a sun in addition to the inherited combat lights. Budget every
// candidate before Phaser's distance selector so it cannot drop Riley's light.
import { VW } from './config.js';
import { VOLLEY_BANDS } from './stages.js';
import { sfx } from './audio.js';

// Same states tickFear treats as calm. Duplicated so myrddraal.js stays untouched.
const FEAR_CALM = ['hurt', 'down', 'getup', 'cast', 'balefire', 'grabbed', 'escape'];
export function budgetStage3Lights(kit) {
  const s = kit.s, active = kit._budgetLights || (kit._budgetLights = []), seen = kit._budgetSeen || (kit._budgetSeen = new Set());
  active.length = 0; seen.clear();
  const add = L => { if (L && !seen.has(L)) { seen.add(L); active.push(L); } };
  add(s.heroLight); for (const L of s.beam?.lights || []) add(L);
  add(s.powers?.shield?.L); for (const b of s.powers?.bolts || []) add(b.L);
  for (const a of kit.torches) add(a.L); for (const f of s.fireballs || []) add(f.light);
  add(s.fx?.hitLight);
  for (const p of s.patches || []) add(p.L); for (const p of s.pickups || []) add(p.L);
  for (const b of s.fx?.booms || []) add(b.L);
  // placeFires restores each fire's screen visibility before this call.
  for (const L of s.fires || []) if (L.visible !== false) add(L);
  add(kit.sun);
  const cap = s.lights.getMaxVisibleLights?.() ?? 10;
  let count = 0, candidates = 0;
  for (const L of active) {
    const on = L.intensity > 0; if (on) candidates++;
    const visible = on && count < cap; L.setVisible(visible); if (visible) count++;
  }
  const budget = kit.lightBudget || (kit.lightBudget = { active: 0, candidates: 0, cap: 0 });
  budget.active = count; budget.candidates = candidates; budget.cap = cap;
  budget.peak = Math.max(budget.peak || 0, candidates);
}

/** Perf readout for Stage 3. Empty on every other stage. */
export function stageLightLine(s) {
  const b = s?.stageNo === 3 ? s.kit?.lightBudget : null;
  if (!b) return '';
  return `L ${b.active}/${b.candidates}/${b.cap} pk ${b.peak || 0}`;
}

/** Heartbeat while fear is at least 60% and still rising, and one sting per shake. */
export function playFearCues(kit) {
  const s = kit.s, b = s.boss, R = s.riley;
  const shaken = kit.stats?.shaken || 0;
  if (kit._shakenSeen === undefined) kit._shakenSeen = shaken;
  else if (shaken > kit._shakenSeen) { sfx.shaken?.(); kit._shakenSeen = shaken; }
  if (!b?.alive || !R) return;
  const fear = b.fear || 0, prev = kit._fearSeen;
  kit._fearSeen = fear;
  const calm = b.braveT > 0 || b.copies?.some(c => c.alive && c.state === 'lunge') || R.inv > 0 || FEAR_CALM.includes(R.state);
  if (prev !== undefined && fear >= 0.6 && fear > prev && !calm) sfx.dread?.();
}

/** Cutthroat coil tell lasts the whole 0.45 s. Stage 2 zealots keep the short glint. */
export function coilTell(kit, z) {
  if (z?.type !== 'cutthroat') { kit.glint(z.x - z.facing * 50, z.y - 150, 0xffffff); sfx.glint(); return; }
  const glint = kit.img('glow', z.x - z.facing * 50, z.y - 150, 4004).setBlendMode('ADD').setTint(0xffffff).setScale(0.3);
  const floor = kit.img('glow', z.x, z.y + 2, 900).setTint(0xc4b4a4).setAlpha(0.7).setScale(0.5).setLighting(false);
  kit.sticks.push({ img: glint, t: 0, life: 0.45 }, { img: floor, t: 0, life: 0.45 });
  sfx.glint();
}

/** Half-res plates (width === ref/2) draw at the reference plate width. Other widths keep design scale. */
export function plateScale(design, src, refW = 2172) { return src * 2 === refW ? design * 2 : design; }

/** One threats record per kit. The bot reads it in the same turn it is filled. */
export function stage3Threats(kit) {
  const t = kit._threats || (kit._threats = {});
  t.arrows = kit.arrows; t.sky = kit.skyArrows; t.volley = kit.volley; t.torches = kit.torches; t.beams = kit.beams;
  t.tiles = kit.tiles; t.drops = kit.drops; t.pools = kit.pools; t.copies = kit.copies;
  t.aura = !!kit.s.boss?.auraActive;
  return t;
}

/** One rooftile sprite per marked band, all sharing x and frame. k.img stays the first. */
export function armRoofTiles(kit, k, s) {
  k.x = k.dir > 0 ? s.camX - 120 : s.camX + VW + 120;
  const imgs = k.imgs = [];
  for (const b of k.bands) {
    const [y0, y1] = VOLLEY_BANDS[b];
    const im = kit.img('rooftiles', k.x, (y0 + y1) / 2, 1000 + y1).setScale(0.5).setLighting(true);
    im.flipX = k.dir > 0; im.band = b; imgs.push(im);
  }
  k.img = imgs[0] || null;
}

export function stepRoofTiles(k, frame) {
  k.frame = frame;
  for (const im of k.imgs || []) { im.setPosition(k.x, im.y); im.setFrame?.(frame); }
}

/** A marked band with no sprite cannot hit. */
export function roofTileDrawn(k, band) {
  for (const im of k.imgs || []) if (im.band === band) return true;
  return false;
}

export function dropRoofTiles(k) {
  for (const im of k.imgs || []) im.destroy();
  k.cue?.destroy();
  k.imgs = null;
}

/** Amber mark on the edge the tile will enter from. It rides the camera during the warning. */
export function armTileCue(kit, k) {
  const s = kit.s;
  const x = k.dir > 0 ? s.camX + 40 : s.camX + VW - 40;
  const [y0, y1] = VOLLEY_BANDS[k.bands[0]];
  k.cue = kit.img('glow', x, (y0 + y1) / 2, 960).setTint(0xffb040).setAlpha(0.95).setScale(0.45);
}

export function stepTileCue(k, s) {
  if (!k.cue) return;
  k.cue.setPosition(k.dir > 0 ? s.camX + 40 : s.camX + VW - 40, k.cue.y);
}
