// The pure boss core reports strikes by changing HP. Route scene strikes through
// Riley's normal hit/death contract, preserving the boss's damage and push values.
const STRIKES = new Set(['swoop_dive', 'claw', 'buffet']);

export function beginDraghkarStrike(boss) {
  const R = boss.target;
  if (!R || !STRIKES.has(boss.state)) return null;
  const hit = boss.strikeScratch || (boss.strikeScratch = {});
  hit.riley = R; hit.hp = R.hp; hit.state = R.state; hit.x = R.x; hit.vx = R.vx;
  hit.buffet = boss.state === 'buffet';
  return hit;
}

export function finishDraghkarStrike(boss, hit) {
  if (!hit || hit.riley.hp === hit.hp) return;
  const R = hit.riley, damage = hit.hp - R.hp, down = R.state === 'down';
  const pushedX = R.x, pushedVx = R.vx;
  R.hp = hit.hp; R.state = hit.state; R.x = hit.x; R.vx = hit.vx;
  if (R.takeHit({ dmg: damage, down, kb: hit.buffet ? Math.abs(pushedVx) : undefined }, boss) && hit.buffet) {
    R.x = pushedX; R.vx = pushedVx;
  }
}

// Hold damage bypasses ordinary hit reactions. A fatal tick must still finish
// death before pickups or another actor can act against a zero-HP live Riley.
export function finishDraghkarKiss(boss) {
  const R = boss.target;
  if (!R || R.hp > 0 || !R.alive) return;
  if (boss.scene.god) { R.hp = 1; return; }
  R.alive = false;
  R.setState('down', 'knockdown');
  boss.scene.rileyDied();
}
