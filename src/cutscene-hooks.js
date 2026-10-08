// Wires the video cutscenes into the game without touching the counted Stage 1 modules:
// the intro sequence and the Stage 2-4 clips wrap STAGES[n].start (first title tap / stage entry,
// before the painted story panels); Stage 1's Chieftain clip wraps Stage1.startBoss.
// While a clip plays the stage is paused through the existing 'cutscene' reason with a stand-in
// scene.cutscene, so Stage1.onPress routes presses here and the freeze guard's watchdog covers it,
// and the Phaser game loop is paused so nothing renders under the video.
import { q } from './config.js';
import { STAGES } from './stages.js';
import { Stage1 } from './stage1.js';
import { CutscenePlayer, STAGE_CLIPS, SKIP_ACTIONS, cutscenesEnabled, createSeen } from './cutscene.js';

const FADE_OUT = 0.5;
/** fade the stage music out quickly; the stage's own start/boss code brings music back afterwards */
export function silence(music) {
  if (!music || music.state === 'silent') return;
  const from = music.state; music.state = 'silent';
  if (music.track === null) return;
  music.track = null; music.log?.push?.({ from, to: 'silent', track: null, fade: FADE_OUT, restart: false });
  try { music.backend(null, { fade: FADE_OUT }); } catch (e) { }
}

export function installCutscenes({ root = globalThis, stages = STAGES, Scene = Stage1, query = q, player, seen } = {}) {
  if (!root?.document || root.__rwbCutscenes) return root?.__rwbCutscenes || null;
  player = player || new CutscenePlayer(root);
  seen = seen || createSeen(root.sessionStorage);
  const api = root.__rwbCutscenes = { player, seen, plays: [] };
  const gesture = () => player.bless();
  for (const ev of ['touchend', 'click', 'keydown']) root.addEventListener?.(ev, gesture, true);

  /** Pause the stage and play `key`'s clips, then run then(). false: nothing played, the caller runs then() itself. */
  api.playFor = (scene, key, then) => {
    const ids = STAGE_CLIPS[key];
    if (!ids || !cutscenesEnabled(query, root.navigator) || seen.has(key) || player.active || scene.cutscene) return false;
    if (!scene.started || scene.ended || scene.gameOver || scene.victoryPending) return false;
    seen.add(key);
    let h = null;
    const stub = { i: 0, line: null, done: false, video: key, onLine() { }, onEnd() { },
      press(a) { if (!stub.done && SKIP_ACTIONS.has(a)) h?.skip('press', a === 'start' || a === 'pause'); }, update() { },
      next() { h?.next('watchdog'); }, skip() { h?.skip('press', true); } };
    // Stop Phaser's update + render while the video decodes (no bloom/lighting passes under the overlay).
    // Same ownership rule as graphics-lifecycle: only undo a game pause this clip made.
    const game = scene.game, ownsPause = !!game && !game.isPaused && typeof game.pause === 'function';
    const unpause = () => { if (ownsPause && game.isPaused && !game.pendingDestroy) game.resume?.(); };
    const off = () => { if (!stub.done) { stub.done = true; h?.abort(); unpause(); } };
    scene.cutscene = stub; scene.setPauseReason('cutscene', true); silence(scene.music);
    if (ownsPause) game.pause();
    scene.events?.once?.('shutdown', off);
    api.plays.push(key);
    h = player.play(ids, {
      touch: !!scene.inp?.isTouch,
      frame: () => scene.game?.canvas?.getBoundingClientRect?.(),
      progress: n => { stub.i = n; },
      done: how => {
        if (stub.done) return;
        stub.done = true; scene.events?.off?.('shutdown', off);
        unpause();
        if (scene.cutscene === stub) scene.cutscene = null;
        scene.setPauseReason('cutscene', false);
        then(how);
      },
    });
    return true;
  };
  const wrapStart = (n, key) => {
    const def = stages[n], orig = def?.start;
    if (typeof orig !== 'function' || orig.rwbVideo) return;
    def.start = Object.assign(scene => { if (!api.playFor(scene, key, () => orig(scene))) return orig(scene); }, { rwbVideo: true });
  };
  wrapStart(1, 'intro'); wrapStart(2, 2); wrapStart(3, 3); wrapStart(4, 4);
  const P = Scene?.prototype, startBoss = P?.startBoss;
  if (typeof startBoss === 'function' && !startBoss.rwbVideo) {
    P.startBoss = Object.assign(function (...a) {
      if (this.stageNo === 1 && api.playFor(this, 1, () => startBoss.apply(this, a))) return;
      return startBoss.apply(this, a);
    }, { rwbVideo: true });
  }
  return api;
}

