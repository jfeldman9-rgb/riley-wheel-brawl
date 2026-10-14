// Stage 7 owns one damage deadline across melee and direct hazard paths.
// Unlike Riley.inv, it cannot be shortened by a reaction/respawn state reset.
export function damageReady7(scene) {
  const k = scene?.kit;
  return scene?.stageNo !== 7 || !k ||
    (k.combatClock || 0) + 1e-9 >= (k.damageUntil || 0);
}
export function recordDamage7(scene) {
  if (scene?.stageNo !== 7) return;
  const k = scene.kit;
  if (k) k.damageUntil = (k.combatClock || 0) + 0.5;
  scene.riley.inv = Math.max(scene.riley.inv || 0, 0.5);
}
