// Stage 5 exits. Holds, tethers and hazard clocks end in the same call.
import { drainHum } from './stage5-voice.js';
import { stage4Delta } from './stage4-time.js';
import { releaseBeatClock, thawBeat } from './stage5-beat.js';
import { ensureStage4Anims } from './stage4-art-thug.js';
import { releaseChars } from './assets.js';
import { createPlateStream } from './zone-stream.js';
import { finishGrab, queueBossArt, queueLoial } from './stage5-demand.js';
import { queuePlate, syncSheets } from './stage5-paint.js';
import { paintCast } from './stage5-art-cast.js';

export function clearStage5Hazards(kit) {
  const s = kit.s;
  thawBeat(kit.arena);
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
  if (kit.s.spores) kit.s.spores.length = 0;
  if (kit.s.clouds) kit.s.clouds.length = 0;
  if (kit.s.riley) kit.s.riley.fogSlow = 0;
}

function hook(kit, object, key, wrap) {
  const original = object?.[key];
  if (!object || typeof original !== 'function') return;
  const own = Object.prototype.hasOwnProperty.call(object, key);
  const replacement = wrap(original);
  object[key] = replacement;
  // Count a later wrapper, then put the original back. This scene object is reused;
  // leaving that wrapper would keep this kit alive into the next stage.
  (kit.hooks || (kit.hooks = [])).push(() => {
    if (object[key] !== replacement) kit.hookMiss = (kit.hookMiss || 0) + 1;
    if (own) object[key] = original; else delete object[key];
  });
}
export function bootStage5Memory(kit) {
  ensureStage4Anims(kit.s);
  kit.backdrops = createPlateStream(kit.s, 5, kit.view, (key, done) => queuePlate(kit.s, key, done));
  kit.backdrops.sync();
  syncSheets(kit.s);
  paintCast(kit.s);
}
export function installStage5SceneHooks(kit) {
  const s = kit.s;
  hook(kit, kit, 'update', original => function(dt) {
    this.backdrops?.sync?.();
    syncSheets(this.s);
    paintCast(this.s);
    if (this.s.zoneI === 3) queueBossArt(this.s);
    finishGrab(this.s);
    if (!this.arena?.frozen) return original.call(this, dt);
    dt = stage4Delta(dt);
    if (!dt || this.s.paused || this.s.cutscene) return;
    this.s.inp?.clear?.();
    this.arena.step(dt, this.world());
    this.view?.sync?.(this);
  });
  hook(kit, s, 'update', original => function(time, deltaMs) {
    if (this._s5freeStory && !this.cutscene) this._s5freeStory();
    if (!Number.isFinite(deltaMs) || deltaMs <= 0 || this.paused || this.cutscene) return;
    if (!kit.arena?.frozen) return original.call(this, time, deltaMs);
    kit.update(Math.min(deltaMs, 50) / 1000);
    this.riley?.sync?.();
    for (const e of this.enemies || []) e.sync?.();
  });
  hook(kit, s, 'onPress', original => function(action) {
    if (kit.arena?.frozen && action !== 'pause' && action !== 'start') { this.inp?.clear?.(); return; }
    return original.call(this, action);
  });
  hook(kit, s, 'rileyDied', original => function() {
    releaseBeatClock(kit.arena);
    this.riley?.grabbedBy?.releaseHold?.('break');
    for (const e of this.enemies || []) {
      e.releaseHold?.('break');
      if (e.state === 'held') { if ((e.hp || 0) <= 0) { e.alive = false; e.state = 'dead'; this.onEnemyDie?.(e); } else e.release?.(); }
    }
    if (this.riley) this.riley.held = null;
    return original.call(this);
  });
  hook(kit, s, 'callLoial', original => function() {
    if (!this.metas?.loial) {
      const R = this.riley;
      if (!this.started || this.gameOver || this.ended || this.victoryPending || this.paused) return false;
      if (!R?.loialReady || this.loial) return original.call(this);
      this._loialWanted = true;
      queueLoial(this);
      return false;
    }
    const called = original.call(this);
    if (called) this.riley?.grabbedBy?.releaseHold?.('break');
    return called;
  });
  hook(kit, s, 'updateLoial', original => function(dt) {
    const had = this.loial;
    const out = original.call(this, dt);
    if (had && !this.loial) releaseChars(this, ['loial']);
    return out;
  });
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
