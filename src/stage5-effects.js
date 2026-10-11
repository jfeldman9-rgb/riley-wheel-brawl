// World tells. Painted sprites replace the filled shapes when those sheets are in; the thin rings stay.
import { isPainted } from './stage5-paint.js';
import { tetherLine } from './stage5-hud.js';

export function createStage5Effects(scene) {
  const g = scene.add?.graphics?.() || scene.make?.graphics?.({ add: true });
  g?.setDepth?.(950);
  const circle = (x, y, r, color, alpha = 0.9) => { g?.lineStyle?.(3, color, alpha); g?.strokeCircle?.(x, y, r); };
  const pools = { thorn: new Map(), seep: new Map(), spore: new Map(), cloud: new Map(), hand: new Map() };
  let ring, tether;
  const sprite = (map, obj, key) => {
    let s = map.get(obj);
    if (!s && scene.add?.sprite) { s = scene.add.sprite(0, 0, key, 0); s.setDepth?.(940); map.set(obj, s); }
    return s;
  };
  const reap = (map, live) => { for (const [k, s] of map) if (!live.has(k)) { s.destroy?.(); map.delete(k); } };
  return {
    sync(kit) {
      if (!g) return;
      g.clear?.();
      const z = Math.max(0, scene.zoneI || 0), b = kit.blight, a = kit.arena;
      const thornOn = isPainted(scene, 's5thorn'), seepOn = isPainted(scene, 's5seep');
      const liveT = new Set(), liveS = new Set();
      for (const t of b?.thorns || []) if (t.zone === z && t.on) {
        const band = scene.bands?.[t.band] || [612, 650];
        const bh = band[1] - band[0];
        if (thornOn) {
          const sp = sprite(pools.thorn, t, 's5thorn');
          if (sp) {
            liveT.add(t);
            const frame = t.burn > 0 ? 2 : ((t.pulse % 1) < 0.35 ? 1 : 0);
            sp.setFrame?.(frame); sp.setOrigin?.(0.5, 1); sp.setPosition?.(t.x, band[1]);
            sp.setDisplaySize?.(t.w, bh * 1.8); sp.setVisible?.(true);
          }
        }
        if (!thornOn && t.burn <= 0) { g.fillStyle?.(0xa92c38, 0.65); g.fillRect?.(t.x - t.w / 2, band[0], t.w, bh); }
      }
      reap(pools.thorn, liveT);
      for (const t of b?.trees || []) if (t.zone === z) {
        circle(t.x, t.y, 22, t.dormant > 0 ? 0x685944 : 0x8a4832);
        if (t.lashed) {
          const band = scene.bands?.[t.band] || [612, 650];
          g.lineStyle?.(4, 0xffb070, 0.9); g.strokeRect?.(t.x - 300, band[0], 600, band[1] - band[0]);
        }
      }
      for (const s of b?.seeps || []) if (s.zone === z && s.phase !== 'gone') {
        circle(s.x, s.y, 110, s.phase === 'tell' ? 0xff7040 : 0x654332);
        if (seepOn) {
          const sp = sprite(pools.seep, s, 's5seep');
          if (sp) {
            liveS.add(s);
            const frame = s.phase === 'tell' ? (s.st > 0.85 ? 2 : 1) : 0;
            sp.setFrame?.(frame); sp.setOrigin?.(0.5, 1); sp.setPosition?.(s.x, s.y + 8); sp.setScale?.(1); sp.setVisible?.(true);
          }
        }
      }
      reap(pools.seep, liveS);
      if (a?.ring) {
        circle(a.ring.x, a.ring.y, a.ring.phase === 'tell' ? 30 : a.ring.r, 0xd8ff6a);
        if (isPainted(scene, 's5ring') && scene.add?.image) {
          if (!ring) { ring = scene.add.image(0, 0, 's5ring'); ring.setDepth?.(945); }
          const rr = Math.max(30, a.ring.r || 0);
          ring.setPosition?.(a.ring.x, a.ring.y); ring.setOrigin?.(0.5, 0.5); ring.setScale?.(rr / 128); ring.setVisible?.(true);
        } else ring?.setVisible?.(false);
      } else ring?.setVisible?.(false);
      const liveH = new Set();
      for (const h of a?.hands || []) {
        circle(h.x, h.y, 80, 0xffb070);
        if (isPainted(scene, 's5hand')) {
          const sp = sprite(pools.hand, h, 's5hand');
          if (sp) {
            liveH.add(h);
            sp.setFrame?.(h.phase === 'tell' ? 0 : 1); sp.setOrigin?.(0.5, 1); sp.setPosition?.(h.x, h.y); sp.setScale?.(0.85); sp.setVisible?.(true);
          }
        }
      }
      reap(pools.hand, liveH);
      const liveP = new Set();
      for (const p of scene.spores || []) {
        circle(p.tx, p.ty, p.r, 0xff5544);
        const y = p.y - 70 * Math.sin(Math.PI * Math.min(1, p.t / p.flight));
        if (isPainted(scene, 's5spore')) {
          const sp = sprite(pools.spore, p, 's5spore');
          if (sp) { liveP.add(p); sp.setPosition?.(p.x, y); sp.setScale?.(0.45); sp.setVisible?.(true); }
        } else { g.fillStyle?.(0xc6e060, 0.9); g.fillCircle?.(p.x, y, 8); }
      }
      reap(pools.spore, liveP);
      const liveC = new Set();
      for (const c of scene.clouds || []) {
        if (isPainted(scene, 's5cloud')) {
          const sp = sprite(pools.cloud, c, 's5cloud');
          if (sp) {
            liveC.add(c);
            sp.setFrame?.((c.t || 0) > (c.life || 1) * 0.6 ? 1 : 0);
            sp.setOrigin?.(0.5, 0.5); sp.setPosition?.(c.x, c.y); sp.setScale?.((c.r || 90) / 80); sp.setVisible?.(true);
          }
        } else { g.fillStyle?.(0x6a8a30, 0.25); g.fillCircle?.(c.x, c.y, c.r); }
      }
      reap(pools.cloud, liveC);
      for (const e of scene.enemies || []) if (e.type === 'balthamel' && e.state === 'step' && e.dest) circle(e.dest.x, e.dest.y, 70, 0xb890e0);
      if (a?.oak) circle(a.oak.x, a.oak.y, a.oak.r, a.oak.root ? 0xffd070 : 0x8ac868, a.oak.open ? 0.9 : 0.3);
      if (a?.green && a.frozen) circle(a.centre, 630, 55, 0x8ac868);
      const line = tetherLine(scene);
      if (line && isPainted(scene, 's5tether') && scene.add?.tileSprite) {
        if (!tether) { tether = scene.add.tileSprite(0, 0, 32, 36, 's5tether'); tether.setDepth?.(1100); tether.setOrigin?.(0, 0.5); }
        const dx = line.x1 - line.x0, dy = line.y1 - line.y0, len = Math.hypot(dx, dy) || 1;
        tether.setPosition?.(line.x0, line.y0);
        tether.rotation = Math.atan2(dy, dx);
        tether.width = len; tether.height = 36;
        tether.setDisplaySize?.(len, 36);
        tether.tilePositionX = ((scene.time?.now || 0) / 6) % 512;
        tether.setAlpha?.(line.locked ? 0.95 : 0.55);
        tether.setVisible?.(true);
      } else tether?.setVisible?.(false);
    },
    destroy() {
      g?.destroy?.(); ring?.destroy?.(); tether?.destroy?.();
      for (const map of Object.values(pools)) for (const s of map.values()) s.destroy?.();
    },
  };
}
