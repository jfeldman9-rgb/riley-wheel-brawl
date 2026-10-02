// Riley Wheel Brawl 2.0 - Stage 1 vertical slice (Phaser 4, WebGL2, lit sprites).
import { VW, VH, RS0, q } from './config.js';
import { Input } from './input.js';
import { perf } from './perf.js';
import { queueCharJson } from './assets.js';
import { Stage1 } from './stage1.js';
import { HUD } from './hud.js';
class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() { this.load.setCORS('anonymous'); queueCharJson(this); this.load.image('portrait', 'assets/ui/riley-portrait.webp'); this.load.image('bossPortrait', 'assets/ui/chief-portrait.webp'); }
  create() { this.scene.start('stage1'); }
}
const game = window.__game = new Phaser.Game({
  type: Phaser.WEBGL, parent: 'game', backgroundColor: '#05070d', width: VW * RS0, height: VH * RS0,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, maxLights: +q.get('ml') || 10, powerPreference: 'high-performance', preserveDrawingBuffer: !!q.get('capture') },
  fps: { target: 60 }, scene: [Boot, Stage1, HUD],
});
game.inp = new Input(); game.rs = RS0;
// Quality governor: if frames run long (2 s windows), step down: bloom off -> fewer particles -> lower render scale ->
// unlit backdrop (sprites stay lit) -> render scale 1. Software WebGL (SwiftShader/llvmpipe) starts at level 4. ?q=fixed disables it.
let acc = 0, n = 0, level = 0, inited = false;
game.setRS = (rs) => {
  game.rs = rs; game.scale.resize(VW * rs, VH * rs);
  for (const k of ['stage1', 'hud']) { const s = game.scene.getScene(k); if (s && s.cameras && s.cameras.main) s.cameras.main.setZoom(rs); }
};
function applyLevel(st, lv) {
  while (level < lv) {
    level++; st.fx.quality = level;
    if (level === 1) st.setBloom(false);
    if (level === 2) { st.snowFront.frequency = 240; }
    if (level === 3 && game.rs > 1) game.setRS(Math.max(1, game.rs - 0.5));
    if (level === 4) { st.setBackdropLit(false); }
    if (level === 5 && game.rs > 1) game.setRS(1);
  }
  perf.quality = level;
}
game.governor = (dt) => {
  const st = game.scene.getScene('stage1'); if (!st) return;
  if (!inited) {
    inited = true;
    try { const gl = game.renderer.gl, ext = gl.getExtension('WEBGL_debug_renderer_info'); perf.renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { perf.renderer = '?'; }
    perf.software = /swiftshader|llvmpipe|software|basic render/i.test(perf.renderer || '');
    if (q.get('q') !== 'fixed' && perf.software) applyLevel(st, 4);
    if (q.get('q') && /^\d$/.test(q.get('q'))) applyLevel(st, +q.get('q'));
  }
  if (q.get('q') === 'fixed' || !st.started) return;
  const d = perf.all[perf.all.length - 1]; if (d === undefined) return;
  acc += d; n++; if (acc < 2000) return;
  const avg = acc / n; acc = 0; n = 0;
  if (avg > 21 && level < 5) { applyLevel(st, level + 1); console.log('quality ->', level, 'avg frame', avg.toFixed(1)); }
};
