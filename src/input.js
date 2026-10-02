// Keyboard + touch + gamepad. Same bindings as 1.2: attack E/J/Z, jump Space/K/X, special Q/L/C, run Shift (or double-tap).
// Touch controls are shown only on touch devices: on the first real touch, or when the primary pointer is coarse.
const KEYS = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyE: 'attack', KeyJ: 'attack', KeyZ: 'attack', Space: 'jump', KeyK: 'jump', KeyX: 'jump', KeyQ: 'special', KeyL: 'special', KeyC: 'special',
  ShiftLeft: 'run', ShiftRight: 'run', Escape: 'pause', KeyP: 'pause', Enter: 'start',
};
export class Input {
  constructor() {
    this.held = {}; this.buf = {}; this.t = 0; this.touchAxis = { x: 0, y: 0 }; this.touchHeld = {}; this.lastTap = { left: -9, right: -9 }; this.runLatch = false;
    this.listeners = {}; this.isTouch = false; this.demo = null;
    addEventListener('keydown', e => {
      const a = KEYS[e.code]; if (e.repeat) return;
      if (a) { e.preventDefault(); this.press(a); this.held[a] = true; }
      this.emit('key', e.code);
    });
    addEventListener('keyup', e => { const a = KEYS[e.code]; if (a) this.held[a] = false; });
    addEventListener('blur', () => this.clear());
    if (matchMedia && matchMedia('(pointer: coarse)').matches) this.enableTouch();
    addEventListener('touchstart', () => this.enableTouch(), { once: true, passive: true });
    this.bindTouch();
  }
  on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); return () => this.off(ev, fn); }
  off(ev, fn) { this.listeners[ev] = (this.listeners[ev] || []).filter(f => f !== fn); }
  clear() {
    this.held = {}; this.buf = {}; this.touchHeld = {}; this.touchAxis = { x: 0, y: 0 };
    this.demo = null; this.x = 0; this.y = 0; this.run = false; this.runLatch = false;
    this.lastTap = { left: -9, right: -9 };
    const knob = document.getElementById('knob'); if (knob) knob.style.transform = '';
    document.querySelectorAll('.tb.on').forEach(el => el.classList.remove('on'));
  }
  emit(ev, v) { (this.listeners[ev] || []).forEach(f => f(v)); }
  press(a) {
    this.buf[a] = this.t;
    if (a === 'left' || a === 'right') { if (this.t - this.lastTap[a] < 0.26) this.runLatch = true; this.lastTap[a] = this.t; }
    this.emit('press', a);
  }
  /** consume a buffered press made within `win` seconds */
  take(a, win = 0.18) { if (this.buf[a] !== undefined && this.t - this.buf[a] <= win) { delete this.buf[a]; return true; } return false; }
  peek(a, win = 0.18) { return this.buf[a] !== undefined && this.t - this.buf[a] <= win; }
  enableTouch() { if (this.isTouch) return; this.isTouch = true; document.body.classList.add('touch'); this.emit('touch'); }
  bindTouch() {
    const stick = document.getElementById('stick'), knob = document.getElementById('knob'); if (!stick) return;
    let sid = null, ox = 0, oy = 0;
    const move = (t) => {
      const r = stick.getBoundingClientRect(), R = r.width / 2;
      let dx = t.clientX - (r.left + R), dy = t.clientY - (r.top + R); const m = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, m / R); dx = dx / m * k; dy = dy / m * k;
      knob.style.transform = `translate(${dx * R * 0.6}px,${dy * R * 0.6}px)`;
      const nx = Math.abs(dx) > 0.28 ? Math.sign(dx) : 0, ny = Math.abs(dy) > 0.38 ? Math.sign(dy) : 0;
      if (nx && nx !== this.touchAxis.x) this.press(nx < 0 ? 'left' : 'right');
      this.touchAxis = { x: nx, y: ny, run: k > 0.92 && Math.abs(dx) > 0.8 };
    };
    stick.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; sid = t.identifier; move(t); }, { passive: false });
    stick.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === sid) move(t); }, { passive: false });
    const end = e => { for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; this.touchAxis = { x: 0, y: 0 }; knob.style.transform = ''; } };
    stick.addEventListener('touchend', end); stick.addEventListener('touchcancel', end);
    for (const [id, a] of [['tbA', 'attack'], ['tbJ', 'jump'], ['tbS', 'special'], ['tbP', 'pause']]) {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', e => { e.preventDefault(); this.press(a); this.touchHeld[a] = true; el.classList.add('on'); this.emit('anytouch'); }, { passive: false });
      const up = e => { e.preventDefault(); this.touchHeld[a] = false; el.classList.remove('on'); };
      el.addEventListener('touchend', up, { passive: false }); el.addEventListener('touchcancel', up, { passive: false });
    }
  }
  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; const p = pads && [...pads].find(Boolean);
    if (!p) return { x: 0, y: 0 };
    const map = { 2: 'attack', 0: 'jump', 3: 'special', 9: 'pause', 5: 'run', 4: 'run' };
    this.padPrev = this.padPrev || {};
    for (const b in map) { const d = p.buttons[b] && p.buttons[b].pressed; if (d && !this.padPrev[b]) this.press(map[b]); this.padPrev[b] = d; this.touchHeld['pad' + b] = d; }
    let x = p.axes[0] || 0, y = p.axes[1] || 0;
    if (p.buttons[14] && p.buttons[14].pressed) x = -1; if (p.buttons[15] && p.buttons[15].pressed) x = 1;
    if (p.buttons[12] && p.buttons[12].pressed) y = -1; if (p.buttons[13] && p.buttons[13].pressed) y = 1;
    return { x: Math.abs(x) > 0.35 ? Math.sign(x) : 0, y: Math.abs(y) > 0.45 ? Math.sign(y) : 0, run: (p.buttons[5] && p.buttons[5].pressed) || (p.buttons[4] && p.buttons[4].pressed) };
  }
  update(dt) {
    this.t += dt;
    const pad = this.pollPad();
    const h = this.held, ta = this.touchAxis, d = this.demo || {};
    this.x = (h.left ? -1 : 0) + (h.right ? 1 : 0) || ta.x || pad.x || d.x || 0;
    this.y = (h.up ? -1 : 0) + (h.down ? 1 : 0) || ta.y || pad.y || d.y || 0;
    if (!this.x) this.runLatch = false;
    this.run = !!(h.run || ta.run || pad.run || this.runLatch || d.run);
  }
}
