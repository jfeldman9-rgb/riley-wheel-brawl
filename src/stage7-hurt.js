// Direct Stage 7 hits share the existing damage rules, including the call freeze.
import { strikeRiley as strike, damageAllowed as allowed } from './stage5-hurt.js';
export { bandOf, sameBand } from './stage5-hurt.js';
export function damageAllowed(scene, opts) { return !scene?.kit?.strike && allowed(scene, opts); }
export function strikeRiley(scene, dmg, opts) { return damageAllowed(scene, opts) && strike(scene, dmg, opts); }
