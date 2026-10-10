// Riley damage from Stage 5 hazards and bosses. A hit releases a Balthamel hold
// in the same call. God mode and i-frames skip the hp loss. fogSlow is owned
// by the kit, which clears it when no snare, cloud or seep is active.
export function damageAllowed(scene, opts = {}) {
  const R = scene?.riley;
  return !!(R && R.alive !== false && R.hp > 0 && !scene.paused && !scene.cutscene && !scene.kit?.arena?.frozen && !scene.god && !(R.inv > 0 && !opts.throughInv));
}

export function strikeRiley(scene, dmg, opts = {}) {
  const R = scene?.riley;
  if (!damageAllowed(scene, opts)) return false;
  R.grabbedBy?.releaseHold?.('break');
  if (!opts.throughVuln && R.vulnerable === false && !opts.dot) return false;
  R.hp = Math.max(0, (R.hp || 0) - dmg);
  if (opts.down) {
    const dir = opts.dir || Math.sign((R.x || 0) - (opts.fromX ?? R.x - 1)) || 1;
    R.vx = dir * (opts.kb || 360);
    R.vz = opts.launch ?? 420;
    R.z = Math.max(R.z || 0, 1);
    if (R.setState) R.setState('down', 'knockdown');
    else R.state = 'down';
    R.st = 0;
  }
  if (R.hp <= 0 && R.alive) {
    R.alive = false;
    R.grabbedBy?.releaseHold?.('break');
    scene.rileyDied?.();
  }
  return true;
}

export function sameBand(a, b, bands) {
  return bandOf(a, bands) === bandOf(b, bands);
}

export function bandOf(y, bands) {
  if (!bands || !bands.length) return 0;
  for (let i = 0; i < bands.length; i++) if (y >= bands[i][0] && y <= bands[i][1]) return i;
  let best = 0, dist = 1e9;
  for (let i = 0; i < bands.length; i++) {
    const mid = (bands[i][0] + bands[i][1]) / 2, d = Math.abs(y - mid);
    if (d < dist) { dist = d; best = i; }
  }
  return best;
}
