// Stage 3 owns a sun in addition to the inherited combat lights. Budget every
// candidate before Phaser's distance selector so it cannot drop Riley's light.
export function budgetStage3Lights(kit) {
  const s = kit.s, active = kit._budgetLights || (kit._budgetLights = []), seen = kit._budgetSeen || (kit._budgetSeen = new Set());
  active.length = 0; seen.clear();
  const add = L => { if (L && !seen.has(L)) { seen.add(L); active.push(L); } };
  add(s.heroLight); for (const L of s.beam?.lights || []) add(L);
  add(s.powers?.shield?.L); for (const b of s.powers?.bolts || []) add(b.L);
  for (const a of kit.torches) add(a.L); for (const f of s.fireballs || []) add(f.light);
  add(s.fx?.hitLight); for (const b of s.fx?.booms || []) add(b.L);
  for (const p of s.patches || []) add(p.L); for (const p of s.pickups || []) add(p.L);
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
