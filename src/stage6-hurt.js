// Direct Stage 6 hits share the existing damage rules, including Rand's local freeze.
import { strikeRiley as strike, damageAllowed as allowed } from './stage5-hurt.js';
export function damageAllowed(scene) { return !scene?.kit?.strike && allowed(scene); }
export function strikeRiley(scene, dmg, opts) { return damageAllowed(scene) && strike(scene, dmg, opts); }
