// Event clips use the same overlay/player and pause ownership as stage-entry clips.
import { CutscenePlayer, SKIP_ACTIONS, cutscenesEnabled } from './cutscene.js';
import { q } from './config.js';
import { isMuted, stopSceneAudio } from './audio.js';
import { LINES } from './stage8-voice.js';

/** false: caller continues immediately. done(how, failed) never fires after shutdown. */
export function playStage8Video(scene, key, done, query = q) {
  const root = scene.cutRoot || globalThis, ids = CLIPS8[key]?.present ? [CLIPS8[key].id] : null;
  if (!ids || !root.document?.createElement || !cutscenesEnabled(query, root.navigator) ||
      scene.bot || scene.stageData?.story === false || scene.cutscene || scene.ended || scene.gameOver) return false;
  // Reuse the gesture-blessed stage player, including its iOS sound permission.
  const player = root.__rwbCutscenes?.player || new CutscenePlayer(root);
  if (player.active) return false;
  const game = scene.game, ownsPause = !!game && !game.isPaused && typeof game.pause === 'function';
  const music = scene.music, state = music?.state;
  let handle, finished = false;
  const stub = { i: 0, line: null, done: false, video: key, update() {},
    press(a) { if (SKIP_ACTIONS.has(a)) handle?.skip(a, a === 'start' || a === 'pause'); },
    next() { handle?.next('watchdog'); }, skip() { handle?.skip('press', true); } };
  const cleanup = () => {
    if (finished) return false;
    finished = stub.done = true;
    scene.events?.off?.('shutdown', abort);
    // Consume held pad edges while input is still owned by this cutscene.
    try { scene.inp?.pollPad?.(); scene.inp?.flushPresses?.(); } catch { /* disconnected pad */ }
    if (scene.cutscene === stub) scene.cutscene = null;
    scene.setPauseReason?.('cutscene', false);
    if (ownsPause && game.isPaused && !game.pendingDestroy) game.resume?.();
    if (state) music?.set?.(state);
    return true;
  };
  const abort = () => { handle?.abort(); cleanup(); };
  try {
    scene.cutscene = stub;
    scene.setPauseReason?.('cutscene', true);
    stopSceneAudio();
    music?.set?.('silent'); // the video has its own soundtrack
    if (ownsPause) game.pause();
    scene.events?.once?.('shutdown', abort);
    let uncap = () => {};
    handle = player.play(ids, {
      touch: !!scene.inp?.isTouch, muted: isMuted(),
      progress: n => { stub.i = n; },
      done(how) {
        uncap();
        const failed = how === 'skip' || player.log[player.log.length - 2] !== `${ids[0]}:ended`;
        if (cleanup()) done(how, failed);
      },
    });
    if (!finished) uncap = captions8(player, key);
    return true;
  } catch {
    handle?.abort();
    // play() can throw after creating its overlay/timer; release that run too.
    if (player.run) player.finish(player.run, null);
    cleanup();
    return false;
  }
}

export const CLIPS8=Object.freeze({
  "intro": {
    "id": "stage8/intro",
    "present": true,
    "panels": [
      "story8p1",
      "story8p2",
      "story8p3",
      "story8p4"
    ]
  },
  "taim": {
    "id": "stage8/taim",
    "present": true,
    "panels": []
  },
  "circle": {
    "id": "stage8/circle",
    "present": true,
    "panels": []
  },
  "link": {
    "id": "stage8/link",
    "present": true,
    "panels": [
      "story8c1",
      "story8c2"
    ]
  },
  "finale": {
    "id": "stage8/finale",
    "present": true,
    "panels": [
      "story8f1",
      "story8f2",
      "story8f3",
      "story8f4"
    ]
  },
  "wolves": {
    "id": "stage8/wolves",
    "present": true,
    "panels": []
  }
});
export const FLOW_PRIORITY8=Object.freeze(['V5.3','V3.1','V5.2','V1.2','V5.4']);
/** Baked voice timing per clip: [start s, hold s, line id]. Captions follow video.currentTime. */
export const CUES8=Object.freeze({"intro": [[0.4, 9.18, "st8_story_01"], [9.63, 7.67, "st8_story_02"], [17.35, 8.05, "st8_story_03"], [25.85, 6.95, "st8_rand_box_01"], [32.85, 4.81, "st8_lews_01"], [37.71, 2.12, "st8_rand_box_02"], [40.28, 7.16, "st8_lews_02"], [47.49, 2.36, "st8_rand_box_03"], [49.9, 7.12, "st8_lews_03"], [57.47, 4.04, "riley_st8_story_01"], [61.56, 2.41, "riley_st8_story_02"]], "taim": [[0.4, 3.85, "st8_taim_intro_01"], [6.0, 3.08, "st8_taim_kill_01"]], "circle": [[0.4, 3.73, "riley_st8_callandor_01"], [6.5, 2.03, "riley_st8_circle_02"]], "link": [[0.4, 3.23, "st8_tt_link_01"], [3.68, 1.64, "riley_st8_link_01"], [7.5, 3.44, "st8_tt_link_02"], [10.99, 2.17, "riley_st8_link_02"]], "wolves": [[0.4, 2.15, "st8_perrin_wolves_01"]], "finale": [[0.4, 3.35, "st8_lanfear_final_01"], [13.6, 5.56, "st8_lanfear_final_02"], [21.2, 3.95, "st8_tt_final_01"], [28.8, 2.48, "riley_st8_final_01"]]});
/** DOM caption strip inside the cutscene overlay, driven by the clip's own clock (so pause/seek/stall stay in sync). */
export function captions8(player, key) {
  const r = player?.run, v = player?.video, cues = CUES8[key];
  if (!r?.overlay || !v || !cues?.length || !player.root?.document?.createElement) return () => {};
  const el = player.root.document.createElement('div');
  Object.assign(el.style, { position: 'absolute', left: '6%', right: '6%', bottom: '9%', textAlign: 'center', pointerEvents: 'none',
    color: '#fff', font: "12px/1.6 PressStart, system-ui, sans-serif", textShadow: '0 0 4px #000, 0 0 2px #000', opacity: '0' });
  el.id = 'rwb-cutscene-caption'; r.overlay.appendChild(el);
  let shown = null;
  const tick = () => { const t = v.currentTime || 0, c = cues.find(([a, d]) => t >= a && t < a + d) || null;
    if (c === shown) return; shown = c; const line = c && LINES[c[2]];
    el.textContent = line ? `${line[0]}: ${line[1]}` : ''; el.style.opacity = line ? '1' : '0'; };
  v.addEventListener?.('timeupdate', tick);
  return () => { v.removeEventListener?.('timeupdate', tick); el.remove?.(); };
}
