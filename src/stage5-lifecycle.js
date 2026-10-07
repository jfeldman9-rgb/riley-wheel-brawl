// Stage 5 exits. Holds, tethers and hazard clocks end in the same call.
import { drainHum } from './stage5-voice.js';

export function clearStage5Hazards(kit) {
  const s = kit.s;
  drainHum(false);
  for (const e of s.enemies || []) e.releaseHold?.('break');
  s.boss?.releaseHold?.('break');
  s.riley && (s.riley.fogSlow = 0);
  if (s.spores) s.spores.length = 0;
  if (s.clouds) s.clouds.length = 0;
  kit.blight?.dispose();
  kit.arena?.dispose();
  kit.view?.sync?.(kit);
}
export function clearStage5Zone(kit, zone) {
  kit.cleared = kit.cleared || new Set();
  kit.cleared.add(zone);
  kit.blight?.clearZone(zone);
  if (kit.s.spores) kit.s.spores = kit.s.spores.filter(p => false);
  if (kit.s.clouds) kit.s.clouds = [];
  if (kit.s.riley) kit.s.riley.fogSlow = 0;
}

function hook(kit, object, key, wrap) {
  const original = object?.[key];
  if (!object || typeof original !== 'function') return;
  const own = Object.prototype.hasOwnProperty.call(object, key);
  const replacement = wrap(original);
  object[key] = replacement;
  (kit.hooks || (kit.hooks = [])).push(() => { if (object[key] !== replacement) kit.hookMiss = (kit.hookMiss || 0) + 1; if (own) object[key] = original; else delete object[key]; });
}
export function installStage5SceneHooks(kit) {
  const s = kit.s;
  hook(kit, s, 'update', original => function(time, deltaMs) { if (!Number.isFinite(deltaMs) || deltaMs <= 0) return; return original.call(this, time, deltaMs); });
  hook(kit, s, 'rileyDied', original => function() {
    this.riley?.grabbedBy?.releaseHold?.('break');
    for (const e of this.enemies || []) {
      e.releaseHold?.('break');
      if (e.state === 'held') { if ((e.hp || 0) <= 0) { e.alive = false; e.state = 'dead'; this.onEnemyDie?.(e); } else e.release?.(); }
    }
    if (this.riley) this.riley.held = null;
    return original.call(this);
  });
  hook(kit, s, 'callLoial', original => function() { const called = original.call(this); if (called) this.riley?.grabbedBy?.releaseHold?.('break'); return called; });
}
export function installStage5RileyHook(kit) {
  hook(kit, kit.s.riley, 'setState', original => function(state, anim, ts) {
    if (state !== 'grabbed' && this.grabbedBy?.type === 'balthamel') this.grabbedBy.releaseHold('break');
    return original.call(this, state, anim, ts);
  });
}
export function restoreStage5Hooks(kit) {
  for (let i = (kit.hooks?.length || 0) - 1; i >= 0; i--) kit.hooks[i]();
  if (kit.hooks) kit.hooks.length = 0;
}
