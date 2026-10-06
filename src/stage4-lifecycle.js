// Scene-owned Stage 4 exits. Keep holds and audio teardown synchronous.
import { croon } from './stage4-voice.js';

export function clearStage4Hazards(kit) {
  const s = kit.s;
  croon(false);
  for (const e of s.enemies || []) {
    e.releaseHold?.('break');
    if (e.type === 'cultist') { e.alive = false; e.gone = true; e.state = 'gone'; }
  }
  s.boss?.releaseHold?.('break');
  kit.fog?.dispose(); kit.towers?.dispose(); kit.arena?.dispose();
  if (s.fogBolts) s.fogBolts.length = 0;
  if (s.boss) { s.boss.alive = false; s.boss.gone = true; }
  kit.view?.sync(kit);
}

export function clearStage4Zone(kit, zone) {
  kit.clearedZones = kit.clearedZones || new Set();
  kit.clearedZones.add(zone);
  kit.fog.clearZone(zone);
  kit.towers.arm(-1);
  kit.towers.clearRubble();
}

// Stage 4-only hooks live with the kit so Stage 1's inventory and combat path
// retain their original costs. Restore scene methods before another stage reuses it.
function hook(kit, object, key, wrap) {
  const original = object[key];
  if (typeof original !== 'function') return;
  const own = Object.prototype.hasOwnProperty.call(object, key);
  const replacement = wrap(original);
  object[key] = replacement;
  (kit.hooks || (kit.hooks = [])).push(() => {
    if (object[key] !== replacement) return;
    if (own) object[key] = original; else delete object[key];
  });
}
export function installStage4SceneHooks(kit) {
  const s = kit.s;
  hook(kit, s, 'update', original => function(time, deltaMs) {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    return original.call(this, time, deltaMs);
  });
  hook(kit, s, 'rileyDied', original => function() {
    this.riley.grabbedBy?.releaseHold?.('break');
    return original.call(this);
  });
  hook(kit, s, 'callLoial', original => function() {
    const called = original.call(this);
    if (called) this.riley.grabbedBy?.releaseHold?.('break');
    return called;
  });
}
export function installStage4RileyHook(kit) {
  hook(kit, kit.s.riley, 'setState', original => function(state, anim, ts) {
    if (state !== 'grabbed' && this.grabbedBy?.type === 'draghkar') this.grabbedBy.releaseHold('break');
    return original.call(this, state, anim, ts);
  });
}
export function restoreStage4Hooks(kit) {
  for (let i = (kit.hooks?.length || 0) - 1; i >= 0; i--) kit.hooks[i]();
  if (kit.hooks) kit.hooks.length = 0;
}
