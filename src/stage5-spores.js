// Spore flight and the cloud it leaves. Kept beside the pod so blightspawn.js stays inside its cap.
import { stage4Delta } from './stage4-time.js';
import { strikeRiley } from './stage5-hurt.js';
import { SPOREPOD } from './blightspawn.js';

export function updateSpores(scene, dt) {
  dt = stage4Delta(dt);
  if (!dt || scene.paused || scene.cutscene || scene.kit?.arena?.frozen) return;
  const R = scene.riley, kept = [], P = SPOREPOD;
  for (const p of scene.spores || []) {
    if (!p.alive) continue;
    p.t += dt;
    const u = Math.min(1, p.t / p.flight);
    p.x += (p.tx - p.x) * 0.35; p.y += (p.ty - p.y) * 0.35;
    if (u < 1) { kept.push(p); continue; }
    p.alive = false; p.landed = true;
    (scene.clouds = scene.clouds || []).push({ x: p.tx, y: p.ty, r: p.r, t: P.cloud });
    if (R?.alive && Math.hypot(R.x - p.tx, R.y - p.ty) <= p.r && (R.z || 0) < 40) strikeRiley(scene, P.dmg, { fromX: p.tx });
    scene.kit?.onSplat?.(p);
  }
  scene.spores = kept;
  scene.clouds = (scene.clouds || []).filter(c => {
    c.t -= dt;
    if (c.t <= 0) return false;
    if (R && Math.hypot(R.x - c.x, R.y - c.y) <= c.r) scene._cloudSlow = P.slow;
    return true;
  });
}

// Recheck at launch: other swelling pods may have filled the flight pool.
export function launchSpore(pod) {
  const s = pod.scene, R = pod.target, P = SPOREPOD;
  if (R?.alive && !['grabbed', 'down', 'getup'].includes(R.state) && (s.spores || []).filter(p => p.alive !== false).length < P.spores) {
    s.spores.push({ alive: true, x: pod.x, y: pod.y, tx: R.x, ty: R.y, t: 0, flight: P.flight, r: P.r, from: pod });
    s.kit?.onLob?.(pod);
  }
  pod.state = 'idle'; pod.st = 0; pod.cool = P.cool;
}
