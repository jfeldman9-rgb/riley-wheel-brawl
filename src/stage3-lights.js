// Stage 3 owns a sun in addition to the inherited combat lights. Budget every
// candidate before Phaser's distance selector so it cannot drop Riley's light.
export function budgetStage3Lights(kit) {
  const s = kit.s, active = [], seen = new Set();
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
  let count = 0;
  for (const L of active) { const visible = L.intensity > 0 && count < cap; L.setVisible(visible); if (visible) count++; }
  kit.lightBudget = { active: count, candidates: active.filter(L => L.intensity > 0).length, cap };
}
