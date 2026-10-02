// Honest frame timing: measured with performance.now() between rendered frames (not Phaser's smoothed delta).
// window.__perf.summary  -> rolling numbers for the last 1800 frames (about 30 s)
// window.__perf.fight    -> the same numbers, but only for frames where enemies were on screen and fighting
export const perf = window.__perf = {
  last: 0, all: [], fightFrames: [], inFight: false, summary: null, fight: null,
  tick(now) {
    if (this.last) {
      const d = now - this.last;
      if (d < 1000) {   // ignore tab-switch gaps
        this.all.push(d); if (this.all.length > 1800) this.all.shift();
        if (this.inFight) { this.fightFrames.push(d); if (this.fightFrames.length > 7200) this.fightFrames.shift(); }
      }
    }
    this.last = now;
  },
  stats(arr) {
    if (!arr.length) return null;
    const s = arr.slice().sort((a, b) => a - b), sum = arr.reduce((a, b) => a + b, 0);
    const recent = arr.slice(-120), rs = recent.reduce((a, b) => a + b, 0);
    return {
      fps: +(1000 * recent.length / rs).toFixed(1), avgFps: +(1000 * arr.length / sum).toFixed(1),
      p50: +s[Math.floor(s.length * 0.5)].toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), p99: +s[Math.floor(s.length * 0.99)].toFixed(1),
      over33: arr.filter(v => v > 33.4).length, over20: arr.filter(v => v > 20).length, frames: arr.length,
    };
  },
  update() {
    this.summary = this.stats(this.all);
    this.fight = this.stats(this.fightFrames);
    if (this.summary) { this.summary.fight = this.fight; this.summary.renderer = this.renderer; this.summary.quality = this.quality || 0; this.summary.rs = window.__game && window.__game.rs; this.summary.dpr = window.devicePixelRatio; }
    return this.summary;
  },
  reset() { this.all = []; this.fightFrames = []; },
};
