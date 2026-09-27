/* Engine particle system: pooled particles with a per-device cap
   (RWB.perf.fxCap / fxScale, LITE mode halves bursts). Generic kinds:
   spark (additive streak), chunk (gravity + bounce debris), dust puff, ring
   (ground shockwave), glow (additive soft orb), text (floating callout, never
   dropped). Content can add kinds with RWB.FX.defineKind(name, {update, draw}). */
'use strict';

RWB.FX = class FX {
  constructor() { this.list = []; this.pool = []; }
  _p(kind, x, y, life, force) {
    if (!force && this.list.length >= RWB.perf.fxCap) return null;
    const f = this.pool.pop() || {};
    f.kind = kind; f.x = x; f.y = y; f.t = 0; f.life = life;
    f.vx = 0; f.vy = 0; f.r = 2; f.color = '#fff'; f.str = ''; f.big = false;
    f.floor = 0; f.rest = false; f.rot = 0; f.vr = 0; f.data = null;
    this.list.push(f);
    return f;
  }
  n(count) { return Math.max(1, Math.round(count * RWB.perf.fxScale)); }
  spawn(kind, x, y, life, props) { const f = this._p(kind, x, y, life); if (f && props) Object.assign(f, props); return f; }
  sparks(x, y, color, count, speed) {
    for (let i = 0, n = this.n(count || 8); i < n; i++) {
      const a = RWB.util.rand(0, Math.PI * 2), v = RWB.util.rand(0.4, 1) * (speed || 300);
      if (!this.spawn('spark', x, y, RWB.util.rand(0.2, 0.4), { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, color: color || '#fff6c8' })) return;
    }
  }
  chunks(x, y, colors, count, floor) {
    for (let i = 0, n = this.n(count || 10); i < n; i++) {
      if (!this.spawn('chunk', x, y, RWB.util.rand(0.8, 1.3), { vx: RWB.util.rand(-200, 200), vy: RWB.util.rand(-300, -80), color: RWB.util.pick(colors || ['#ccc']), r: RWB.util.rand(2, 4.5), floor: floor || y + 30, rot: RWB.util.rand(0, 6.28), vr: RWB.util.rand(-12, 12) })) return;
    }
  }
  dust(x, y, r) { for (let i = 0, n = RWB.perf.lite ? 2 : 4; i < n; i++) { const f = this.spawn('dust', x + RWB.util.rand(-8, 8), y + RWB.util.rand(-3, 3), 0.5, { r: (r || 6) * RWB.util.rand(0.6, 1) }); if (!f) return; f.t = -i * 0.03; } }
  ring(x, y, big, color) { this.spawn('ring', x, y, 0.26, { big: !!big, color: color || '#fff' }); }
  glow(x, y, r, color, life) { this.spawn('glow', x, y, life || 0.4, { r: r || 20, color: color || '#9eeaff' }); }
  text(x, y, str, color, life) { const f = this._p('text', x, y, life || 1.1, true); f.str = str; f.color = color || '#fff'; f.vy = -30; return f; }
  clear() { while (this.list.length) this.pool.push(this.list.pop()); }
  update(dt) {
    const list = this.list, K = FX.KINDS;
    let j = 0;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      f.t += dt;
      const k = K[f.kind];
      if (k && k.update) k.update(f, dt);
      if (f.t < f.life) list[j++] = f; else this.pool.push(f);
    }
    list.length = j;
  }
  draw(ctx, camX) {
    const K = FX.KINDS;
    for (const f of this.list) { if (f.t < 0 || Math.abs(f.x-(camX||0)-320)>440+f.r || f.y < -100-f.r || f.y > 460+f.r) continue; const k = K[f.kind]; if (k && k.draw) k.draw(ctx, f, f.x - (camX || 0)); }
  }
  static defineKind(name, def) { FX.KINDS[name] = def; }
};
RWB.FX.KINDS = {
  spark: {
    update(f, dt) { f.vy += 900 * dt; f.vx *= 1 - dt * 3; f.x += f.vx * dt; f.y += f.vy * dt; },
    draw(ctx, f, sx) {
      const k = f.t / f.life; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = f.color; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, f.y); ctx.lineTo(sx - f.vx * 0.022, f.y - f.vy * 0.022); ctx.stroke(); ctx.restore();
    }
  },
  chunk: {
    update(f, dt) {
      if (f.rest) { f.vx *= Math.max(0, 1 - dt * 8); f.x += f.vx * dt; return; }
      f.vy += 700 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      if (f.floor && f.y > f.floor && f.vy > 0) { f.y = f.floor; f.vy *= -0.36; f.vx *= 0.6; f.vr *= 0.5; if (f.vy > -45) { f.vy = 0; f.rest = true; } }
    },
    draw(ctx, f, sx) {
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, (f.life - f.t) / (f.life * 0.35)));
      ctx.translate(sx, f.y); ctx.rotate(f.rot); ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.moveTo(-f.r, f.r * 0.6); ctx.lineTo(f.r, 0); ctx.lineTo(0, -f.r); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  },
  dust: {
    update(f, dt) { f.y -= 10 * dt; },
    draw(ctx, f, sx) { const k = f.t / f.life; ctx.save(); ctx.globalAlpha = 0.45 * (1 - k); RWB.draw.circle(ctx, sx, f.y, f.r * (1 + k), '#d8d0c0'); ctx.restore(); }
  },
  ring: {
    draw(ctx, f, sx) {
      const k = f.t / f.life, r = (f.big ? 28 : 16) + k * (f.big ? 40 : 26);
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k); ctx.strokeStyle = f.color; ctx.lineWidth = Math.max(1, (1 - k) * 3);
      ctx.beginPath(); ctx.ellipse(sx, f.y, r, r * 0.42, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  },
  glow: {
    draw(ctx, f, sx) {
      const k = f.t / f.life; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k;
      ctx.drawImage(RWB.effects.glow(f.color),sx-f.r,f.y-f.r,f.r*2,f.r*2); ctx.restore();
    }
  },
  text: {
    update(f, dt) { f.y += f.vy * dt; },
    draw(ctx, f, sx) {
      ctx.save(); ctx.globalAlpha = Math.min(1, (f.life - f.t) * 2);
      RWB.text.draw(ctx, f.str, sx, f.y, { size: RWB.settings.data.bigHud ? 10 : 8, align: 'center', color: f.color, stroke: '#000', strokeWidth: 3 });
      ctx.restore();
    }
  }
};
