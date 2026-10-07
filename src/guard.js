// Phone freeze hardening. Phaser's rAF step asks for the next frame only after
// this one returns, so one thrown error stops the game on its last picture.
// Scene steps and the loop are guarded, story lines get a wall-clock watchdog,
// and loader requests time out instead of hanging.
import { installViewportFit } from './viewport.js';
import { holdFor } from './twix.js';

export const WATCHDOG_PAD = 1.5, WATCHDOG_FALLBACK = 4, STUCK_FRAMES = 180, LOAD_TIMEOUT_MS = 30000;

/** Wall-clock seconds a story line may stay up: its hold + 1.5 s, else 4 s. */
export function watchdogFor(line) {
  let d = NaN;
  try { d = holdFor(line); } catch (e) { }
  return d > 0 ? d + WATCHDOG_PAD : WATCHDOG_FALLBACK;
}

/** Advance a stalled cutscene. Time under another pause reason does not count. */
export function cutsceneWatchdog(stage, now, w = {}) {
  const cs = stage?.cutscene;
  if (!cs || cs.done) { w.cs = null; return false; }
  if (w.cs !== cs || w.i !== cs.i) { w.cs = cs; w.i = cs.i; w.since = now; return false; }
  for (const r of stage.pauseReasons || []) if (r !== 'cutscene') { w.since = now; return false; }
  if ((now - w.since) / 1000 < watchdogFor(cs.line)) return false;
  w.since = now; cs.next(); w.i = cs.i;
  return true;
}

function showStuck(root, error) {
  const by = id => root.document?.getElementById?.(id), set = (id, t) => { const el = by(id); if (el) el.textContent = t; };
  const card = by('startup-error'); if (!card) return false;
  set('startup-title', 'The game hit a snag');
  set('startup-description', 'This stage stopped running. Reload game starts again from the title.');
  set('startup-code', `Code: FRAME_ERROR ${error?.name || ''}`);
  by('startup-retry')?.addEventListener?.('click', () => root.location?.reload?.());
  card.hidden = false;
  return true;
}

/** Errors log once per message; STUCK_FRAMES failing frames in a row show the Reload card. */
export function installFrameGuard(game, root = globalThis) {
  const st = { errors: 0, streak: 0, bad: false, seen: new Set(), shown: false, last: '' };
  if (!game) return st;
  game.frameErrors = st;
  const report = where => error => {
    st.errors++; st.last = `${where}: ${error?.message || error}`;
    if (!st.bad) { st.bad = true; st.streak++; }
    if (!st.seen.has(st.last) && st.seen.size < 20) { st.seen.add(st.last); root.console?.error?.(`Riley frame error in ${where}; still running.`, error); }
    if (st.streak >= STUCK_FRAMES && !st.shown) st.shown = showStuck(root, error);
  };
  const wrap = () => {
    for (const { sys } of game.scene?.scenes || []) {
      if (!sys || sys.rwbGuard || typeof sys.step !== 'function') continue;
      const step = sys.step, onError = report(sys.settings?.key || 'scene');
      sys.rwbGuard = true;
      sys.step = function (...a) { try { return step.apply(this, a); } catch (e) { onError(e); } };
    }
  };
  const frame = inner => function (time, delta) {
    st.bad = false; wrap();
    try { inner.call(this, time, delta); } catch (e) { report('frame')(e); }
    if (!st.bad) st.streak = 0;
  };
  const loop = game.loop;
  if (loop?.start && !loop.rwbGuard) {
    loop.rwbGuard = true;
    const start = loop.start;
    loop.start = function (cb) { return start.call(this, typeof cb === 'function' ? frame(cb) : cb); };
    if (typeof loop.callback === 'function' && loop.running) loop.callback = frame(loop.callback);
  }
  return st;
}

/** Story lines advance on wall-clock time if the HUD stops ticking them. */
export function installCutsceneWatchdog(game, root = globalThis, everyMs = 250) {
  const w = {};
  if (!game || !root.setInterval) return w;
  w.tick = () => {
    const now = root.performance?.now?.() ?? Date.now();
    if (root.document?.hidden) { w.since = now; return; }
    try { cutsceneWatchdog(game.scene?.getScene?.('stage1'), now, w); } catch (e) { root.console?.error?.(e); }
  };
  const id = root.setInterval(w.tick, everyMs);
  id?.unref?.(); // let Node exit
  game.events?.once?.('destroy', () => root.clearInterval(id));
  return w;
}

/** Loader files time out (Phaser retries, then completes) instead of hanging. */
export function installLoadTimeout(game, ms = LOAD_TIMEOUT_MS) {
  if (game?.config && !(game.config.loaderTimeout > 0)) game.config.loaderTimeout = ms;
  game?.events?.once?.('ready', () => { for (const s of game.scene?.scenes || []) if (s.load?.xhr && !(s.load.xhr.timeout > 0)) s.load.xhr.timeout = ms; });
}

/** main.js entry: viewport fit plus freeze guards. */
export function fit(game, root = globalThis) {
  installFrameGuard(game, root);
  installCutsceneWatchdog(game, root);
  installLoadTimeout(game);
  return installViewportFit(game, root);
}
