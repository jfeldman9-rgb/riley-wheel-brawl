// Direct Stage 6 hits share the existing damage rules, including Rand's local freeze.
import { damageReady7, recordDamage7, damageSource7, capDamage7 } from './stage7-hurt.js';
import { strikeRiley as strike, damageAllowed as allowed } from './stage5-hurt.js';
export function damageAllowed(scene) { return !scene?.kit?.strike && damageReady7(scene) && allowed(scene); }
export function strikeRiley(scene, dmg, opts = {}) {
  const source = opts.source || (opts.from?.type === 'asmodean' ? 'asmodean.bash' : 'hazard');
  const hit = damageAllowed(scene) && damageSource7(scene, source,
    () => strike(scene, capDamage7(scene, dmg, source), opts));
  if (hit && scene.stageNo === 7)
    recordDamage7(scene);
  return hit;
}
