/* Engine camera for a side-scrolling brawler: horizontal follow with lead,
   stage bounds, arena lock, screen shake, punch (directional kick), hit-stop,
   and white flashes. Everything respects Reduced Shake
   (RWB.settings.data.shake === 'reduced'): shake is scaled to 35%, punch to
   50%, and flashes are dimmed and shortened. */
'use strict';

RWB.Camera = class Camera {
  constructor(opts = {}) {
    this.x = 0;
    this.lead = opts.lead != null ? opts.lead : 0.42;  // player sits at this fraction of the screen
    this.min = 0; this.max = opts.length ? opts.length - RWB.W : 0;
    this.lockMin = null; this.lockMax = null;           // arena lock (wave / boss)
    this.shakeAmt = 0; this.shakeT = 0; this.shakeX = 0; this.shakeY = 0;
    this.punchX = 0; this.punchY = 0;
    this.hitstop = 0;
    this.flashT = 0; this.flashColor = '#fff'; this.flashMax = 0;
    this.noForwardBacktrack = opts.noBacktrack !== false;
  }
  static get reduced() { return RWB.settings.data.shake === 'reduced'; }
  setLength(len) { this.max = Math.max(0, len - RWB.W); }
  lock(minX, maxX) { this.lockMin = minX; this.lockMax = maxX; }
  unlock() { this.lockMin = this.lockMax = null; }
  follow(targetX, dt) {
    let want = targetX - RWB.W * this.lead;
    const lo = this.lockMin != null ? this.lockMin : this.min;
    const hi = this.lockMax != null ? Math.max(lo, this.lockMax - RWB.W) : this.max;
    want = RWB.util.clamp(want, lo, hi);
    if (this.noForwardBacktrack) want = Math.max(want, Math.min(this.x, hi));
    this.x += (want - this.x) * (1-Math.exp(-dt*8));
    this.x = RWB.util.clamp(this.x, lo, hi);
  }
  shake(amount, dur) {
    const a = amount * (Camera.reduced ? 0.35 : 1);
    this.shakeAmt = Math.max(this.shakeAmt, a); this.shakeT = Math.max(this.shakeT, dur);this.shakeDuration=this.shakeT;
  }
  punch(dirX, amount, y) { const k = Camera.reduced ? 0.5 : 1; this.punchX = dirX * amount * k; this.punchY = (y || 0) * k; }
  stop(sec) { this.hitstop = Math.max(this.hitstop, sec); }
  flash(sec, color) {
    const r = Camera.reduced;
    this.flashT = Math.max(this.flashT, sec * (r ? 0.5 : 1)); this.flashMax = this.flashT;
    this.flashColor = color || '#fff'; this.flashAlpha = r ? 0.25 : 0.7;
  }
  /** Named impact presets. Returns the hit-stop added. */
  impact(dirX, kind) {
    const P = RWB.Camera.IMPACTS[kind] || RWB.Camera.IMPACTS.light;
    if(kind==='super'||!(this.impactCooldown>0)){this.stop(P.stop);this.impactCooldown=.09;} this.punch(dirX, P.punch, P.y); this.shake(P.shake, P.shakeT);
    if (P.flash) this.flash(P.flash, P.flashColor);
    return P.stop;
  }
  /** Returns true while frozen by hit-stop (the caller should skip simulation). */
  update(dt) {
    this.impactCooldown=Math.max(0,(this.impactCooldown||0)-dt);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const fade=Math.max(0,this.shakeT/(this.shakeDuration||1)),mix=1-Math.exp(-dt*30);
      this.shakeX+=(RWB.util.rand(-1,1)*this.shakeAmt*fade-this.shakeX)*mix;this.shakeY+=(RWB.util.rand(-1,1)*this.shakeAmt*.6*fade-this.shakeY)*mix;
      if (this.shakeT <= 0) this.shakeAmt = 0;
    } else { this.shakeX = this.shakeY = 0; }
    this.punchX *= Math.exp(-dt*18); this.punchY *= Math.exp(-dt*18);
    if (this.flashT > 0) this.flashT -= dt;
    if (this.hitstop > 0) { this.hitstop -= dt; return true; }
    return false;
  }
  /** Apply shake + punch to the world transform (call inside ctx.save()). */
  apply(ctx) {
    const snap = RWB.display.mode === 'classic' ? 1 : (RWB.display.renderScale || 1);
    ctx.translate(Math.round((this.shakeX + this.punchX) * snap) / snap, Math.round((this.shakeY + this.punchY) * snap) / snap);
  }
  drawFlash(ctx) {
    if (this.flashT <= 0) return;
    ctx.save(); ctx.globalAlpha = (this.flashAlpha || 0.7) * (this.flashT / (this.flashMax || 1));
    ctx.fillStyle = this.flashColor; ctx.fillRect(0, 0, RWB.W, RWB.H); ctx.restore();
  }
};
RWB.Camera.IMPACTS = {
  light: { stop: 0.025, punch: 12, y: -4, shake: 5.6, shakeT: 0.16 },
  heavy: { stop: 0.09, punch: 18, y: 6, shake: 10, shakeT: 0.28, flash: 0.08, flashColor: '#fff6d0' },
  boss: { stop: 0.11, punch: 20, y: 7, shake: 13, shakeT: 0.4, flash: 0.1, flashColor: '#ffe0a8' },
  super: { stop: 0.14, punch: 4, y: -8, shake: 16, shakeT: 0.95, flash: 0.22 }
};
