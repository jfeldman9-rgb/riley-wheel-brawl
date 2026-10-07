// Riley Wheel Brawl 2.0 - Stage 1 vertical slice (Phaser 4, WebGL, lit sprites).
import { VW, VH, RS0, q } from './config.js';
import { installAudioLifecycle } from './audio.js';
import { Input } from './input.js';
import { perf } from './perf.js';
import { queueCharJson } from './assets.js';
import { Stage1 } from './stage1.js';
import { HUD } from './hud.js';
import { installGraphicsLifecycle } from './graphics-lifecycle.js';
import { installGraphicsNotice } from './graphics-notice.js';
import { fit } from './guard.js';
import { installGovernor } from './quality-governor.js';
import { resumeGame, installResumeCleanup } from './recovery.js';
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
const graphicsNotice = installGraphicsNotice(window, () => resumeGame(window, game));
game.graphicsRecovery = installGraphicsLifecycle({ game, meter: perf,
  onLost: () => graphicsNotice.lost(), onRestored: () => graphicsNotice.restored() });
game.events.on('destroy', () => graphicsNotice.destroy());
// Keep polling gamepads while the gameplay scene is paused so Start can resume it.
game.events.on('step', (time, delta) => game.inp.update(Math.min(delta || 0, 50) / 1000));
installGovernor(game, { q, rs0: RS0, vw: VW, vh: VH, meter: perf });
fit(game);
installResumeCleanup(game, q, window);
