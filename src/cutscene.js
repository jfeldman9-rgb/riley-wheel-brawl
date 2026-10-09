// Photoreal video cutscenes (Grok Imagine clips in assets/cutscenes/). Nothing is preloaded: one
// <video playsinline> is put on screen only while a clip plays, then taken out of the page with its
// src cleared so the decoder and buffers are released (iPhone memory). The same element object is
// reused for later clips because iOS grants sound per element after a user gesture.
// Never blocks the game: a load error, a refused play() or 3 s without progress skips the clip.
// Kept out of the 25 MB pre-fight sum; tools/audit-stage1.mjs counts it under cutscenes.

export const CLIP_BASE = 'assets/cutscenes/';
/** Which clips play where. intro: after the first title tap, before Stage 1. 1: before the Chieftain fight. */
export const STAGE_CLIPS = Object.freeze({
  intro: Object.freeze(['twinkletoes', 'moiraine', 'intro', 'intro_battle']),
  1: Object.freeze(['stage1']),
  2: Object.freeze(['stage2']),
  3: Object.freeze(['stage3']),
  4: Object.freeze(['stage4']),
});
/** Game actions that skip the current clip. Stick directions and run do not. Start/pause (Enter, Esc) skip the whole sequence. */
export const SKIP_ACTIONS = Object.freeze(new Set(['attack', 'jump', 'special', 'power', 'assist', 'start', 'pause']));
export const START_MS = 4000, STALL_MS = 3000, MAX_CLIP_MS = 30000, TICK_MS = 250, GUARD_MS = 450, VOLUME = 0.85;
export const SEEN_KEY = 'rwb-cutscenes-seen';

const on = (q, k) => !!q?.has?.(k) && q.get(k) !== '0';

/** Off in demo/bot, ?skip=, ?autostart=, ?story=0 and webdriver runs unless ?cutscenes=1. ?nocutscenes=1 always wins. */
export function cutscenesEnabled(q, nav) {
  if (on(q, 'nocutscenes') || q?.get?.('cutscenes') === '0') return false;
  if (on(q, 'cutscenes')) return true;
  if (on(q, 'demo') || q?.get?.('skip') || on(q, 'autostart') || q?.get?.('story') === '0') return false;
  return !nav?.webdriver;
}

/** Played-once memory for this tab session (survives the freeze-guard reload too). */
export function createSeen(storage) {
  const seen = new Set();
  try { for (const k of JSON.parse(storage?.getItem?.(SEEN_KEY) || '[]')) seen.add(String(k)); } catch (e) { }
  return {
    has: k => seen.has(String(k)),
    add(k) { seen.add(String(k)); try { storage?.setItem?.(SEEN_KEY, JSON.stringify([...seen])); } catch (e) { } },
    keys: () => [...seen],
  };
}

const css = (el, style) => { for (const k in style) el.style[k] = style[k]; return el; };

export class CutscenePlayer {
  constructor(root = globalThis, o = {}) {
    this.root = root; this.base = o.base ?? CLIP_BASE;
    this.startMs = o.startMs ?? START_MS; this.stallMs = o.stallMs ?? STALL_MS; this.maxMs = o.maxMs ?? MAX_CLIP_MS;
    this.tickMs = o.tickMs ?? TICK_MS; this.guardMs = o.guardMs ?? GUARD_MS; this.volume = o.volume ?? VOLUME;
    this.video = null; this.run = null; this.blessed = false; this.log = [];
  }
  get active() { return !!this.run; }
  now() { return this.root.performance?.now?.() ?? Date.now(); }
  element() {
    if (this.video) return this.video;
    const v = this.video = this.root.document.createElement('video');
    v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.playsInline = true;
    v.preload = 'auto'; v.controls = false; v.disablePictureInPicture = true; v.setAttribute('disableremoteplayback', '');
    css(v, { width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block', pointerEvents: 'none' });
    return v;
  }
  /** From a real gesture: let iOS bless the element for sound, or unmute a clip that fell back to muted. */
  bless() {
    try {
      const v = this.element(), r = this.run;
      if (r && r.muted) { v.muted = false; r.muted = false; this.log.push('unmuted'); return; }
      if (r || this.blessed) return;
      this.blessed = true;
      const p = v.play(); p?.catch?.(() => { });
    } catch (e) { }
  }
  /** Play ids in order. done(how) gets 'end' or 'skip'; never called after abort(). */
  /** Sit the video exactly on the game canvas (the iPhone shell can shift it off-centre); else contain in the viewport. */
  layout(r) {
    const v = this.video, W = this.root.innerWidth, H = this.root.innerHeight;
    let b = null; try { b = r.frame?.(); } catch (e) { }
    if (b && b.width > 40 && b.height > 40 && W > 0 && H > 0) {
      css(v, { position: 'absolute', left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
      css(r.hint, { right: `${Math.max(10, W - b.right + 10)}px`, bottom: `${Math.max(10, H - b.bottom + 10)}px` });
    } else {
      css(v, { position: 'static', left: '', top: '', width: '100%', height: '100%' });
      css(r.hint, { right: 'max(14px, env(safe-area-inset-right))', bottom: 'max(12px, env(safe-area-inset-bottom))' });
    }
  }
  play(ids, { done = () => { }, progress = () => { }, touch = false, frame = null } = {}) {
    if (this.run) this.finish(this.run, null);
    const doc = this.root.document, v = this.element();
    const overlay = css(doc.createElement('div'), { position: 'fixed', inset: '0', left: '0', top: '0', right: '0', bottom: '0', zIndex: '80',
      background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', cursor: 'pointer' });
    overlay.id = 'rwb-cutscene'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-label', 'Cutscene. Tap or press any button to skip.');
    const hint = css(doc.createElement('div'), { position: 'absolute', right: 'max(14px, env(safe-area-inset-right))', bottom: 'max(12px, env(safe-area-inset-bottom))',
      padding: '7px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.55)', color: '#ffe9a8', font: "10px/1.4 PressStart, system-ui, sans-serif",
      letterSpacing: '0.04em', pointerEvents: 'none', opacity: '0.9' });
    hint.id = 'rwb-cutscene-hint'; hint.textContent = touch ? 'TAP TO SKIP ▶▶' : 'PRESS ANY BUTTON TO SKIP ▶▶';
    overlay.appendChild(v); overlay.appendChild(hint);
    const r = this.run = { ids: [...ids], i: -1, done, progress, overlay, hint, muted: false, ended: false, ticks: 0, t0: this.now(), how: null, timer: null };
    r.padHeld = this.padDown(); r.frame = frame;
    const relayout = () => this.layout(r);
    this.layout(r);
    const tap = e => { if (e?.type === 'touchend') e.preventDefault?.(); this.skip(r, 'tap'); };
    const onEnded = () => this.next(r, 'ended'), onError = () => this.next(r, 'error');
    r.unbind = () => {
      overlay.removeEventListener('touchend', tap); overlay.removeEventListener('click', tap);
      v.removeEventListener('ended', onEnded); v.removeEventListener('error', onError);
      this.root.removeEventListener?.('resize', relayout);
    };
    this.root.addEventListener?.('resize', relayout);
    overlay.addEventListener('touchend', tap, { passive: false }); overlay.addEventListener('click', tap);
    v.addEventListener('ended', onEnded); v.addEventListener('error', onError);
    doc.body.appendChild(overlay);
    r.timer = this.root.setInterval(() => this.tick(r), this.tickMs);
    this.next(r, 'begin');
    return {
      skip: (why, all = false) => this.skip(r, why || 'press', all),
      next: why => this.next(r, why || 'watchdog'),
      abort: () => this.finish(r, null),
      get active() { return !r.ended; },
    };
  }
  /** user skip: the current clip (a tap, an action, a pad button); all: the rest of the sequence too.
   *  Each clip has its own short guard so one tap cannot skip two clips. */
  skip(r, why, all = false) {
    if (r.ended || this.now() - (r.clipT0 ?? r.t0) < this.guardMs) return false;
    this.log.push(`skip:${why}${all ? ':all' : ''}`);
    r.skipped = true;
    if (all) this.finish(r, 'skip'); else this.next(r, 'skipped');
    return true;
  }
  /** next clip (end, error, stall); after the last one the run ends */
  next(r, why) {
    if (r.ended) return;
    if (r.i >= 0) this.log.push(`${r.ids[r.i]}:${why}`);
    if (++r.i >= r.ids.length) return this.finish(r, why === 'skipped' ? 'skip' : 'end');
    const v = this.video, id = r.ids[r.i];
    r.clipT0 = r.lastT = this.now(); r.lastTime = 0; r.started = false;
    try {
      v.poster = this.base + id + '.jpg';
      v.src = this.base + id + '.mp4';
      v.muted = r.muted; v.volume = this.volume;
      this.start(r, v, id);
    } catch (e) { this.next(r, 'error'); }
  }
  start(r, v, id) {
    let p;
    try { p = v.play(); } catch (e) { return this.refused(r, v, id, e); }
    p?.catch?.(e => this.refused(r, v, id, e));
  }
  refused(r, v, id, e) {
    if (r.ended || r.ids[r.i] !== id) return;
    if (e?.name === 'NotAllowedError' && !v.muted) {   // autoplay with sound blocked: play muted instead
      r.muted = true; v.muted = true; this.log.push(`${id}:muted`);
      return this.start(r, v, id);
    }
    if (e?.name !== 'AbortError') this.next(r, 'refused');
  }
  /** any gamepad button down (the game loop is paused during a clip, so the pad is polled here) */
  padDown() {
    try { for (const p of this.root.navigator?.getGamepads?.() || []) if (p?.buttons?.some?.(b => b?.pressed)) return true; } catch (e) { }
    return false;
  }
  /** wall-clock stall check; a hidden page does not count */
  tick(r) {
    if (r.ended) return;
    const pad = this.padDown();
    if (pad && !r.padHeld && this.skip(r, 'pad')) return;
    r.padHeld = pad;
    const v = this.video, now = this.now();
    if (this.root.document?.hidden) { r.lastT = now; return; }
    // iOS pauses inline video in the background; nudge it once a second after the page comes back
    if (v.paused && !v.ended && r.i >= 0 && now - (r.nudged || 0) > 1000) { r.nudged = now; this.start(r, v, r.ids[r.i]); }
    const t = +v.currentTime || 0;
    if (t > r.lastTime + 0.01) { r.lastTime = t; r.lastT = now; if (t > 0) r.started = true; r.ticks++; try { r.progress(r.ticks); } catch (e) { } return; }
    if (now - r.lastT > (r.started ? this.stallMs : this.startMs) || now - r.clipT0 > this.maxMs) this.next(r, r.started ? 'stall' : 'timeout');
  }
  /** take the video out of the page and free it; how === null means aborted (no callback) */
  finish(r, how) {
    if (r.ended) return;
    r.ended = true; r.how = how; this.root.clearInterval(r.timer); r.unbind();
    const v = this.video;
    try { v.pause(); } catch (e) { }
    try { v.removeAttribute('src'); v.removeAttribute('poster'); v.load(); } catch (e) { }
    try { r.overlay.remove(); } catch (e) { }
    if (this.run === r) this.run = null;
    this.log.push(`finish:${how}`);
    if (how) try { r.done(how); } catch (e) { this.root.console?.error?.(e); }
  }
}
