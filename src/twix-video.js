// Video-first Twix snack break; the original painted scene remains the failure fallback.
import { Cutscene, TWIX_SCRIPT } from './twix.js';
import { sfx, say } from './audio.js';
import { q } from './config.js';
import { playSceneVideo } from './cutscene-scene.js';

export function startTwix(scene) {
  if (scene.cutscene || scene.victoryPending || scene.ended || scene.gameOver) return false;
  sfx.pickup();
  const panels = () => {
    const cs = scene.cutscene = new Cutscene(TWIX_SCRIPT, {
      onLine: line => { if (/TROLLOC/.test(line.who)) sfx.grumble(); say(line.id, null); scene.hud.cutsceneLine(line); },
      onEnd: how => scene.endTwixCutscene(how),
    });
    scene.setPauseReason('cutscene', true);
    scene.music?.set('cutscene');
    scene.hud.showCutscene(cs);
    cs.begin();
    return true;
  };
  // Debug replay bypasses autostart's video gate for this clip only. Explicit off still wins.
  const query = new URLSearchParams(q);
  if (q.get('debug') === '1' && q.get('twix') === '1' && !q.has('cutscenes')) query.set('cutscenes', '1');
  if (playSceneVideo(scene, 'twix', (how, failed) => {
    if (failed) return panels();
    // Keep the original resume/voice cleanup and HUD dismissal path.
    scene.cutscene = { done: true };
    scene.endTwixCutscene(how);
  }, query)) return true;
  return panels();
}

/** Debug-only Stage 1 replay, after entry scenes have released gameplay. */
export function scheduleTwixDebug(scene) {
  if (scene.stageNo !== 1 || q.get('debug') !== '1' || q.get('twix') !== '1' || scene.bot) return;
  const runId = scene.runId;
  const tryStart = () => {
    if (scene.runId !== runId || scene.ended || scene.gameOver || scene.victoryPending) return;
    if (scene.paused || scene.cutscene) { scene.time.delayedCall(250, tryStart); return; }
    scene.startTwixCutscene();
  };
  scene.time.delayedCall(750, tryStart);
}

