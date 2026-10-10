import { EventEmitter } from 'node:events';

export class Element {
  constructor(tag) { this.tag = tag; this.style = {}; this.attrs = {}; this.children = []; this.parent = null; this.listeners = new EventEmitter(); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; if (k === 'src') this.src = ''; }
  appendChild(c) { c.remove(); c.parent = this; this.children.push(c); return c; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); this.parent = null; }
  addEventListener(t, f) { this.listeners.on(t, f); }
  removeEventListener(t, f) { this.listeners.off(t, f); }
  fire(t) { if (this.listeners.listenerCount(t)) this.listeners.emit(t, { type: t, preventDefault() {} }); }
}
export function videoEnv() {
  const e = { t: 0, id: 0, timers: new Map(), videos: [], plays: [], clock: true, store: {}, refused: null };
  class Video extends Element {
    constructor() { super('video'); this.src = ''; this.paused = true; this.ended = false; this.muted = false; }
    get currentTime() { return e.clock ? e.t / 1000 : 0; }
    play() { e.plays.push({ video: this, src: this.src, muted: this.muted }); if (e.refused) return Promise.reject(e.refused); this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    load() {}
  }
  const doc = new Element('document'); doc.body = new Element('body'); doc.hidden = false;
  doc.createElement = tag => { const v = tag === 'video' ? new Video() : new Element(tag); if (tag === 'video') e.videos.push(v); return v; };
  const events = new Element('window');
  e.root = { document: doc, navigator: {}, console: { error() {} }, performance: { now: () => e.t }, innerWidth: 1280, innerHeight: 720,
    sessionStorage: { getItem: k => e.store[k] ?? null, setItem: (k, v) => { e.store[k] = v; } },
    fetch: async () => ({ ok: false }),
    setInterval(f, ms) { const id = ++e.id; e.timers.set(id, { f, ms, at: e.t + ms }); return id; },
    clearInterval(id) { e.timers.delete(id); },
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) };
  e.advance = ms => { const end = e.t + ms; for (;;) { let next; for (const row of e.timers) if (row[1].at <= end && (!next || row[1].at < next[1].at)) next = row; if (!next) break; e.t = next[1].at; next[1].at += next[1].ms; next[1].f(); } e.t = end; };
  e.scene = { cutRoot: e.root, events: new EventEmitter(), inp: { flushes: 0, flushPresses() { this.flushes++; } }, kit: { quality: 4 },
    music: { state: 'boss', gainMul: 0.7 }, pauseReasons: new Set(), paused: false,
    setPauseReason(k, on) { if (on) this.pauseReasons.add(k); else this.pauseReasons.delete(k); this.paused = this.pauseReasons.size > 0; },
    scene: { resumes: 0, pause() {}, resume() { this.resumes++; } } };
  return e;
}
export const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
