// Riley Wheel Brawl 2.0 - Stage 1 vertical slice (Phaser 4, WebGL, lit sprites).
import { VW, VH, RS0, q } from './config.js';
import { installAudioLifecycle } from './audio.js';
import { Input } from './input.js';
import { perf } from './perf.js';
import { queueCharJson } from './assets.js';
import { Stage1 } from './stage1.js';
import { HUD } from './hud.js';
import { releaseIdleRenderTargets } from './render-resources.js';
import { installGraphicsLifecycle } from './graphics-lifecycle.js';
import { installGraphicsNotice } from './graphics-notice.js';
class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() { window.__rwbStartup?.watchLoader(this.load); this.load.setCORS('anonymous'); queueCharJson(this); this.load.image('portrait', 'assets/ui/riley-portrait.webp'); this.load.image('bossPortrait', 'assets/ui/chief-portrait.webp'); this.load.image('loialPortrait', 'assets/ui/loial-portrait.webp'); this.load.image('byarPortrait', 'assets/ui/byar-portrait.webp'); }
  create() { if (!window.__rwbStartup?.failed) this.scene.start('stage1'); }
}
const game = window.__game = new Phaser.Game({
  type: Phaser.WEBGL, parent: 'game', backgroundColor: '#05070d', width: VW * RS0, height: VH * RS0,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, maxLights: +q.get('ml') || 10, powerPreference: 'high-performance', preserveDrawingBuffer: !!q.get('capture') },
  fps: { target: 60 }, scene: [Boot, Stage1, HUD],
});
game.inp = new Input(); game.rs = RS0;
installAudioLifecycle(game);
const graphicsNotice = installGraphicsNotice(window);
game.graphicsRecovery = installGraphicsLifecycle({ game, meter: perf,
  onLost: () => graphicsNotice.lost(), onRestored: () => graphicsNotice.restored() });
game.events.on('destroy', () => graphicsNotice.destroy());
// Keep polling gamepads while the gameplay scene is paused so Start can resume it.
game.events.on('step', (time, delta) => game.inp.update(Math.min(delta || 0, 50) / 1000));
// Quality governor: if frames run long (2 s windows), step down: bloom off -> fewer particles -> lower render scale ->
// unlit backdrop (sprites stay lit) -> render scale 1. Software WebGL (SwiftShader/llvmpipe) starts at level 4. ?q=fixed disables it.
let acc = 0, n = 0, level = 0, inited = false, appliedRun = null;
game.setRS = (rs) => {
  if (game.rs === rs) return;
  game.rs = rs; game.scale.resize(VW * rs, VH * rs);
  for (const k of ['stage1', 'hud']) { const s = game.scene.getScene(k); if (s && s.cameras && s.cameras.main) s.cameras.main.setZoom(rs); }
  // Quality changes happen during update, between renderer passes. Release only
  // idle old-size targets; asset textures and checked-out filter targets remain.
  releaseIdleRenderTargets(game);
};
function applyLevel(st, lv) {
  let removedBloom = false;
  while (level < lv) {
    level++; st.fx.quality = level;
    if (level === 1) { st.setBloom(false); removedBloom = true; }
    if (level === 2) { if (st.snowFront) st.snowFront.frequency = 240; if (typeof st.kit?.setQuality === 'function') st.kit.setQuality(level); }
    if (level === 3 && game.rs > 1) game.setRS(Math.max(1, game.rs - 0.5));
    if (level === 4) { st.setBackdropLit(false); }
    if (level === 5 && game.rs > 1) game.setRS(1);
  }
  if (removedBloom) releaseIdleRenderTargets(game);
  perf.quality = level;
}
game.governor = (dt) => {
  const st = game.scene.getScene('stage1'); if (!st) return;
  if (appliedRun !== st.runId) {
    // Scene restarts recreate filters/particles. Reapply the current quality tier
    // instead of reporting q5 while silently rendering full-cost q0 effects.
    if (inited) { const previous = level; level = 0; applyLevel(st, previous); }
    appliedRun = st.runId; acc = 0; n = 0;
  }
  if (!inited) {
    inited = true;
    try { const gl = game.renderer.gl, ext = gl.getExtension('WEBGL_debug_renderer_info'); perf.renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { perf.renderer = '?'; }
    perf.software = /swiftshader|llvmpipe|software|basic render/i.test(perf.renderer || '');
    if (q.get('q') !== 'fixed' && perf.software) applyLevel(st, 4);
    if (q.get('q') && /^\d$/.test(q.get('q'))) applyLevel(st, +q.get('q'));
  }
  if (q.get('q') === 'fixed' || !st.started) return;
  const d = perf.lastSampleMs; if (d === null || d === undefined) return;
  acc += d; n++; if (acc < 2000) return;
  const avg = acc / n; acc = 0; n = 0;
  if (avg > 21 && level < 5) { applyLevel(st, level + 1); console.log('quality ->', level, 'avg frame', avg.toFixed(1)); }
};
