// Quality governor (moved out of main.js for the restart fix). If frames run long over 2 s windows, step down:
// bloom off -> fewer particles -> lower render scale -> unlit backdrop (sprites stay lit) -> render scale 1.
// Software WebGL (SwiftShader/llvmpipe) starts at level 4. ?q=fixed disables it, ?q=N pins a starting level.
// In the Stage 1 pre-fight sum (main.js imports it) and capped again under restartHotfix.
import { releaseIdleRenderTargets } from './render-resources.js';

export const WINDOW_MS = 2000, SLOW_AVG_MS = 21, MAX_SAMPLE_MS = 100;
// A lost WebGL context writes this so the next boot does not allocate the full canvas again.
export const QUALITY_FLOOR_KEY = 'rwb-q-floor';

export function readQualityFloor(storage) {
  try {
    const store = storage === undefined ? globalThis.sessionStorage : storage;
    const n = +store?.getItem?.(QUALITY_FLOOR_KEY);
    return n >= 1 && n <= 5 ? n | 0 : 0;
  } catch (e) { return 0; }
}

function writeQualityFloor(level, storage) {
  try {
    const store = storage === undefined ? globalThis.sessionStorage : storage;
    store?.setItem?.(QUALITY_FLOOR_KEY, String(level | 0));
  } catch (e) { /* cookie-blocked boots keep the floor in memory only */ }
}

/**
 * Render scale for a quality tier, from the device's starting scale: tiers 3 and 4 are 0.5 lower, tier 5 is 1.
 * Absolute, never relative to the current scale, so reapplying a tier after a restart cannot ratchet it down.
 */
export function tierScale(level, rs0) {
  return level >= 5 ? 1 : level >= 3 ? Math.max(1, rs0 - 0.5) : rs0;
}

/**
 * One governor window. Each frame counts at most MAX_SAMPLE_MS, so a single hitch (the first texture upload
 * after a restart, a GC pause, a voice decode) cannot trip a tier by itself. Only a sustained slow average does.
 * Returns the window's average frame time when it closes, else null.
 */
export function createWindow() {
  let acc = 0, n = 0;
  return {
    add(d) {
      if (!Number.isFinite(d) || d < 0) return null;
      acc += Math.min(d, MAX_SAMPLE_MS); n++;
      if (acc < WINDOW_MS) return null;
      const avg = acc / n; acc = 0; n = 0;
      return avg;
    },
    reset() { acc = 0; n = 0; },
  };
}

/** Installs game.setRS and game.governor(dt). stage1 calls the governor once per update. */
export function installGovernor(game, { q, rs0, vw, vh, meter, floor = 0, log = (...a) => console.log(...a) }) {
  const win = createWindow();
  let level = 0, inited = false, appliedRun = null;
  let storedFloor = floor | 0;
  // apply=false records the floor during context loss (GL is dead). apply=true, on restorewebgl,
  // turns bloom off and lowers the scale, and a later boot reads the same floor.
  game.keepLoweredQuality = (apply = true) => {
    storedFloor = Math.max(storedFloor, 3);
    writeQualityFloor(storedFloor);
    if (!apply) return storedFloor;
    const st = game.scene.getScene('stage1');
    if (st && storedFloor > level) applyLevel(st, storedFloor);
    return storedFloor;
  };
  game.setRS = rs => {
    if (game.rs === rs) return;
    game.rs = rs; game.scale.resize(vw * rs, vh * rs);
    for (const k of ['stage1', 'hud']) { const s = game.scene.getScene(k); if (s && s.cameras && s.cameras.main) s.cameras.main.setZoom(rs); }
    // Quality changes happen during update, between renderer passes. Release only
    // idle old-size targets; asset textures and checked-out filter targets remain.
    releaseIdleRenderTargets(game);
    game.refitViewport?.();
  };
  function applyLevel(st, lv) {
    let removedBloom = false;
    while (level < lv) {
      level++; st.fx.quality = level;
      if (level === 1) { st.setBloom(false); removedBloom = true; }
      if (level === 2) { if (st.snowFront) st.snowFront.frequency = 240; }
      if (level === 4) st.setBackdropLit(false);
    }
    st.fx.quality = level;
    st.kit?.setQuality?.(level);
    // The scale follows the tier, so a scene restart that replays the tiers lands on the same scale.
    game.setRS(tierScale(level, rs0));
    if (removedBloom) releaseIdleRenderTargets(game);
    meter.quality = level;
  }
  game.governor = () => {
    const st = game.scene.getScene('stage1'); if (!st) return;
    if (appliedRun !== st.runId) {
      // Scene restarts recreate filters/particles. Reapply the current quality tier
      // instead of reporting q5 while silently rendering full-cost q0 effects.
      if (inited) { const previous = level; level = 0; applyLevel(st, previous); }
      appliedRun = st.runId; win.reset();
    }
    if (!inited) {
      inited = true;
      try { const gl = game.renderer.gl, ext = gl.getExtension('WEBGL_debug_renderer_info'); meter.renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { meter.renderer = '?'; }
      meter.software = /swiftshader|llvmpipe|software|basic render/i.test(meter.renderer || '');
      if (q.get('q') !== 'fixed' && meter.software) applyLevel(st, 4);
      if (q.get('q') && /^\d$/.test(q.get('q'))) applyLevel(st, +q.get('q'));
      else if (q.get('q') !== 'fixed' && storedFloor > level) applyLevel(st, storedFloor);
    }
    if (q.get('q') === 'fixed' || !st.started) return;
    const avg = win.add(meter.lastSampleMs);
    if (avg !== null && avg > SLOW_AVG_MS && level < 5) { applyLevel(st, level + 1); log('quality ->', level, 'avg frame', avg.toFixed(1)); }
  };
  return { get level() { return level; } };
}
