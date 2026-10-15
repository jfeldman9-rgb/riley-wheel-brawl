// Event clips use the same overlay/player and pause ownership as stage-entry clips.
import { CutscenePlayer, EVENT_CLIPS, SKIP_ACTIONS, cutscenesEnabled } from './cutscene.js';
import { q } from './config.js';
import { isMuted, stopSceneAudio } from './audio.js';

/** false: caller continues immediately. done(how, failed) never fires after shutdown. */
export function playSceneVideo(scene, key, done, query = q) {
  const root = scene.cutRoot || globalThis, ids = EVENT_CLIPS[key];
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
    handle = player.play(ids, {
      touch: !!scene.inp?.isTouch, muted: isMuted(),
      progress: n => { stub.i = n; },
      done(how) {
        const failed = how !== 'skip' && player.log[player.log.length - 2] !== `${ids[0]}:ended`;
        if (cleanup()) done(how, failed);
      },
    });
    return true;
  } catch {
    handle?.abort();
    // play() can throw after creating its overlay/timer; release that run too.
    if (player.run) player.finish(player.run, null);
    cleanup();
    return false;
  }
}
