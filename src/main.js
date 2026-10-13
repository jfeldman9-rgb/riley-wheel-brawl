// Riley Wheel Brawl 2.0 - Stage 1 vertical slice (Phaser 4, WebGL, lit sprites).
import { VW, VH, RS0, q } from './config.js';
import { installGovernor, readQualityFloor, tierScale } from './quality-governor.js';
import { installAudioLifecycle } from './audio.js';
import { Input } from './input.js';
import { perf } from './perf.js';
import { queueCharJson } from './assets.js';
import { Stage1 } from './stage1.js';
import { HUD } from './hud.js';
import { installGraphicsLifecycle } from './graphics-lifecycle.js';
import { installGraphicsNotice } from './graphics-notice.js';
import { fit } from './guard.js';
import { resumeGame, installResumeCleanup } from './recovery.js';
import { installCutscenes } from './cutscene-hooks.js';
class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() { window.__rwbStartup?.watchLoader(this.load); this.load.setCORS('anonymous'); queueCharJson(this); this.load.image('portrait', 'assets/ui/riley-portrait.webp'); this.load.image('bossPortrait', 'assets/ui/chief-portrait.webp'); this.load.image('loialPortrait', 'assets/ui/loial-portrait.webp'); this.load.image('byarPortrait', 'assets/ui/byar-portrait.webp'); }
  create() { if (!window.__rwbStartup?.failed) this.scene.start('stage1'); }
}
// After a context loss, the next boot opens at the lowered scale. ?rs= still wins for screenshots.
const bootFloor = readQualityFloor();
const explicitRs = q.has('rs') && +q.get('rs') > 0;
const bootRs = explicitRs || bootFloor < 3 ? RS0 : tierScale(bootFloor, RS0);
const game = window.__game = new Phaser.Game({
  type: Phaser.WEBGL, parent: 'game', backgroundColor: '#05070d', width: VW * bootRs, height: VH * bootRs,
  // Game audio is its own AudioContext. noAudio selects Phaser's silent manager; disableWebAudio
  // keeps a second context from being constructed on iOS, where WebAudio exists.
  audio: { noAudio: true, disableWebAudio: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, maxLights: +q.get('ml') || 10, powerPreference: 'high-performance', preserveDrawingBuffer: !!q.get('capture') },
  fps: { target: 60 }, scene: [Boot, Stage1, HUD],
});
game.inp = new Input(); game.rs = bootRs;
installAudioLifecycle(game);
const graphicsNotice = installGraphicsNotice(window, () => resumeGame(window, game));
game.graphicsRecovery = installGraphicsLifecycle({ game, meter: perf,
  onLost: () => graphicsNotice.lost(), onRestored: () => graphicsNotice.restored() });
game.events.on('destroy', () => graphicsNotice.destroy());
// Keep polling gamepads while the gameplay scene is paused so Start can resume it.
game.events.on('step', (time, delta) => game.inp.update(Math.min(delta || 0, 50) / 1000));
installGovernor(game, { q, rs0: RS0, vw: VW, vh: VH, meter: perf, floor: explicitRs ? 0 : bootFloor });
fit(game);
installResumeCleanup(game, q, window);
installCutscenes();
