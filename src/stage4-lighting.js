// Keep transient combat lights inside the renderer's ten-light budget.
const EMPTY = [];
function add(kit, L) {
  if (L && !kit.lightSeen.has(L)) { kit.lightSeen.add(L); kit.lightScratch.push(L); }
}
export function stage4LightBudget(kit) {
  const s = kit.s;
  const active = kit.lightScratch || (kit.lightScratch = []);
  const seen = kit.lightSeen || (kit.lightSeen = new Set());
  active.length = 0; seen.clear();
  add(kit, s.heroLight);
  for (const L of s.beam?.lights || EMPTY) add(kit, L);
  add(kit, s.powers?.shield?.L);
  for (const b of s.powers?.bolts || EMPTY) add(kit, b.L);
  for (const f of s.fireballs || EMPTY) add(kit, f.light);
  add(kit, s.fx?.hitLight);
  for (const b of s.fx?.booms || EMPTY) add(kit, b.L);
  for (const p of s.patches || EMPTY) add(kit, p.L);
  for (const p of s.pickups || EMPTY) add(kit, p.L);
  add(kit, kit.view?.moon);
  for (const L of kit.view?.shaftLights || EMPTY) add(kit, L);
  let count = 0, candidates = 0;
  for (const L of active) {
    const on = s.lightsOn !== false && L.intensity > 0;
    if (on) candidates++;
    const visible = on && count < 10;
    L.setVisible?.(visible);
    if (visible) count++;
  }
  const budget = kit.lightBudget || (kit.lightBudget = { active: 0, candidates: 0, cap: 10 });
  budget.active = count; budget.candidates = candidates;
}
