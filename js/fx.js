/* Engine particle system: pooled particles with a per-device cap
   (RWB.perf.fxCap / fxScale, LITE mode halves bursts). Generic kinds:
   spark (additive streak), chunk (gravity + bounce debris), dust puff, ring
   (ground shockwave), glow (additive soft orb), text (floating callout, never
   dropped). Content can add kinds with RWB.FX.defineKind(name, {update, draw}). */
'use strict';

RWB.FX = class FX {
  constructor() { this.list = []; this.pool = []; this.counts = Object.create(null); this._drawSparks = []; this._drawGlows = []; this._drawRest = []; }
  _p(kind, x, y, life, force) {
    if (!force && this.list.length >= RWB.perf.fxCap) return null;
    // Repeated multi-target hits cannot turn sparks or sword streaks into an
    // unbounded draw batch. Readable text keeps its existing force guarantee.
    const kindCap = kind === 'spark' ? Math.min(96, RWB.perf.fxCap) : kind === 'slash' ? 12 : Infinity;
    if (!force && (this.counts[kind] || 0) >= kindCap) return null;
    const f = this.pool.pop() || {};
    f.kind = kind; f.x = x; f.y = y; f.t = 0; f.life = life;
    f.vx = 0; f.vy = 0; f.r = 2; f.color = '#fff'; f.str = ''; f.big = false;
    f.floor = 0; f.rest = false; f.rot = 0; f.vr = 0; f.data = null;
    this.list.push(f);
    this.counts[kind] = (this.counts[kind] || 0) + 1;
    return f;
  }
  n(count) { return Math.max(1, Math.round(count * RWB.perf.fxScale)); }
  spawn(kind, x, y, life, props) { const f = this._p(kind, x, y, life); if (f && props) Object.assign(f, props); return f; }
  sparks(x, y, color, count, speed) {
    for (let i = 0, n = this.n(count || 8); i < n; i++) {
      const a = RWB.util.fxRand(0, Math.PI * 2), v = RWB.util.fxRand(0.4, 1) * (speed || 300);
      const f = this._p('spark', x, y, RWB.util.fxRand(0.2, 0.4));
      if (!f) return;
      f.vx = Math.cos(a) * v; f.vy = Math.sin(a) * v - 60; f.color = color || '#fff6c8';
    }
  }
  impact(x, y, dir, weight, color) {
    const scale=weight==='boss'?1.8:weight==='finisher'?1.55:weight==='heavy'?1.3:1;
    const n=this.n(Math.round(8*scale)), d=dir||1;
    for(let i=0;i<n;i++){
      const a=RWB.util.fxRand(-1.05,1.05),v=RWB.util.fxRand(150,340)*scale;
      const f=this._p('spark',x,y,RWB.util.fxRand(.18,.38));if(!f)break;
      f.vx=Math.cos(a)*v*d;f.vy=Math.sin(a)*v-35;f.color=color||'#fff6c8';
    }
    this.ring(x,y,scale>1.25,color);this.glow(x,y,10+scale*8,color,.16);
  }
  chunks(x, y, colors, count, floor) {
    const list = Array.isArray(colors) ? colors : (colors ? [colors] : ['#ccc']);
    for (let i = 0, n = this.n(count || 10); i < n; i++) {
      if (!this.spawn('chunk', x, y, RWB.util.fxRand(0.8, 1.3), { vx: RWB.util.fxRand(-200, 200), vy: RWB.util.fxRand(-300, -80), color: RWB.util.fxPick(list), r: RWB.util.fxRand(2, 4.5), floor: floor || y + 30, rot: RWB.util.fxRand(0, 6.28), vr: RWB.util.fxRand(-12, 12) })) return;
    }
  }
  dust(x, y, r) { for (let i = 0, n = RWB.perf.lite ? 2 : 4; i < n; i++) { const f = this.spawn('dust', x + RWB.util.fxRand(-8, 8), y + RWB.util.fxRand(-3, 3), 0.5, { r: (r || 6) * RWB.util.fxRand(0.6, 1) }); if (!f) return; f.t = -i * 0.03; } }
  ring(x, y, big, color) { this.spawn('ring', x, y, 0.26, { big: !!big, color: color || '#fff' }); }
  glow(x, y, r, color, life) { this.spawn('glow', x, y, life || 0.4, { r: r || 20, color: color || '#9eeaff' }); }
  text(x, y, str, color, life) { const f = this._p('text', x, y, life || 1.1, true); f.str = str; f.color = color || '#fff'; f.vy = -30; return f; }
  _recycle(f) {
    this.counts[f.kind] = Math.max(0, (this.counts[f.kind] || 1) - 1);
    if (this.pool.length < 384) this.pool.push(f);
  }
  clear() { while (this.list.length) this._recycle(this.list.pop()); }
  update(dt) {
    const list = this.list, K = FX.KINDS;
    let j = 0;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      f.t += dt;
      const k = K[f.kind];
      if (k && k.update) k.update(f, dt);
      if (f.t < f.life) list[j++] = f; else this._recycle(f);
    }
    list.length = j;
  }
  draw(ctx, camX) {
    const K = FX.KINDS, sparks = this._drawSparks, glows = this._drawGlows, rest = this._drawRest;
    sparks.length = glows.length = rest.length = 0;
    for (const f of this.list) {
      if (f.t < 0 || Math.abs(f.x - (camX || 0) - 320) > 440 + f.r || f.y < -100 - f.r || f.y > 460 + f.r) continue;
      if (f.kind === 'spark') sparks.push(f);
      else if (f.kind === 'glow') glows.push(f);
      else rest.push(f);
    }
    // One blend-mode switch for the whole burst. Per-particle 'lighter'
    // was a full framebuffer copy on SwiftShader and blew the frame budget.
    if (sparks.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.5;
      for (const f of sparks) {
        const k = f.t / f.life, sx = f.x - (camX || 0);
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = f.color;
        ctx.beginPath();
        ctx.moveTo(sx, f.y);
        ctx.lineTo(sx - f.vx * 0.022, f.y - f.vy * 0.022);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (glows.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const f of glows) {
        const sx = f.x - (camX || 0);
        ctx.globalAlpha = 1 - f.t / f.life;
        ctx.drawImage(RWB.effects.glow(f.color), sx - f.r, f.y - f.r, f.r * 2, f.r * 2);
      }
      ctx.restore();
    }
    for (const f of rest) {
      const k = K[f.kind];
      if (k && k.draw) k.draw(ctx, f, f.x - (camX || 0));
    }
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
      const alpha = ctx.globalAlpha;
      ctx.globalAlpha = alpha * Math.max(0, Math.min(1, (f.life - f.t) / (f.life * 0.35)));
      const r = f.r;
      ctx.drawImage(RWB.effects.glow(f.color), sx - r, f.y - r * 0.7, r * 2, r * 1.4);
      ctx.globalAlpha = alpha;
    }
  },
  dust: {
    update(f, dt) { f.y -= 10 * dt; },
    draw(ctx, f, sx) {
      const k = f.t / f.life, alpha = ctx.globalAlpha, r = f.r * (1 + k);
      ctx.globalAlpha = alpha * 0.45 * (1 - k);
      ctx.drawImage(RWB.effects.glow('#d8d0c0'), sx - r, f.y - r * 0.6, r * 2, r * 1.2);
      ctx.globalAlpha = alpha;
    }
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
  slash: {
    draw(ctx, f, sx) {
      const k = f.t / f.life, dir = f.vx || 1;
      const color=f.color||'#fff6d0';
      const stamp=RWB.effects.stamp('slash:'+color,g=>{
        g.setTransform(2,0,0,2,40,48);g.strokeStyle=color;g.lineWidth=3;g.lineCap='round';
        g.beginPath();g.moveTo(-16,-12);g.lineTo(24,8);g.moveTo(-6,-20);g.lineTo(16,-2);g.stroke();
      },96,72);
      ctx.save();ctx.globalAlpha=Math.max(0,1-k);ctx.translate(sx,f.y);ctx.scale(dir<0?-1:1,1);
      ctx.drawImage(stamp,-20,-24,48,36);ctx.restore();
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
