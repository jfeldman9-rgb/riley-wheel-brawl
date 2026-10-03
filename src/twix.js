// The joke ter'angreal: a Twix bar falls into the fight, Riley grabs it, and Stage 1 pauses for a campfire snack
// break with the Trollocs. The cutscene logic is renderer-free; the HUD scene draws it and ticks it while the
// gameplay scene is paused, so every gameplay timer, tween and actor resumes exactly where it stopped.
// Attack / Jump / Fireball / tap = next line. Start / Esc / P / Enter / II / the SKIP button = skip the scene.
import { EXTRA_VOICE } from './audio.js';
export const TWIX_PANELS = 3;
// Lines and speakers live in audio.js EXTRA_VOICE (captions + TTS files); this sets their order and painted panel.
export const TWIX_SCRIPT = Object.freeze([
  // [voice id, panel, TTS clip seconds]
  ['twix_01', 0, 3.02], ['twix_02', 1, 3.98], ['twix_03', 1, 4.73], ['twix_04', 1, 2.54], ['twix_05', 1, 4.15], ['twix_06', 1, 4.94], ['twix_07', 2, 2.88], ['twix_08', 2, 2.16], ['twix_09', 2, 1.73],
].map(([id, panel, voice]) => Object.freeze({ id, who: EXTRA_VOICE[id][0], text: EXTRA_VOICE[id][1], panel, voice })));
// Reading time: captions stay up at least MIN_HOLD seconds, longer for long lines, and never cut off their voice
// clip; a press can advance after GUARD.
export const MIN_HOLD = 2.4, PER_CHAR = 0.05, GUARD = 0.3;
export const holdFor = line => Math.max(MIN_HOLD, 0.8 + line.text.length * PER_CHAR, (line.voice || 0) + 0.6);
const NEXT = new Set(['attack', 'jump', 'special']), SKIP = new Set(['start', 'pause']);

export class Cutscene {
  constructor(lines, { onLine = () => {}, onEnd = () => {} } = {}) {
    this.lines = lines; this.onLine = onLine; this.onEnd = onEnd;
    this.i = -1; this.t = 0; this.elapsed = 0; this.done = false; this.how = null;
  }
  get line() { return this.lines[this.i] || null; }
  begin() { this.next(); return this; }
  update(dt) {
    if (this.done) return;
    this.t += dt; this.elapsed += dt;
    if (this.t >= holdFor(this.line)) this.next();
  }
  next() {
    if (this.done) return;
    this.i++; this.t = 0;
    if (this.i >= this.lines.length) return this.finish('end');
    this.onLine(this.line, this.i);
  }
  skip() { this.finish('skip'); }
  /** input routed here by Stage1.onPress while the cutscene owns the screen */
  press(action) {
    if (this.done) return;
    if (SKIP.has(action)) return this.skip();
    if (NEXT.has(action) && this.t >= GUARD) this.next();
  }
  finish(how) {
    if (this.done) return;
    this.done = true; this.how = how; this.onEnd(how);
  }
}
