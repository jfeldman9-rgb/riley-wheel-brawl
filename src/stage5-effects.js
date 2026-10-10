// World tells use the existing hazard footprints and clocks. No extra lights.
export function createStage5Effects(scene) {
  const g = scene.add?.graphics?.() || scene.make?.graphics?.({ add: true });
  g?.setDepth?.(950);
  const circle = (x, y, r, color, alpha = 0.9) => { g?.lineStyle?.(3, color, alpha); g?.strokeCircle?.(x, y, r); };
  return {
    sync(kit) {
      if (!g) return;
      g.clear?.();
      const z = Math.max(0, scene.zoneI || 0), b = kit.blight, a = kit.arena;
      for (const t of b?.thorns || []) if (t.zone === z && t.on && t.burn <= 0) {
        const band = scene.bands?.[t.band] || [612, 650];
        g.fillStyle?.(0xa92c38, 0.65); g.fillRect?.(t.x - t.w / 2, band[0], t.w, band[1] - band[0]);
      }
      for (const t of b?.trees || []) if (t.zone === z) {
        circle(t.x, t.y, 22, t.dormant > 0 ? 0x685944 : 0x8a4832);
        if (t.lashed) {
          const band = scene.bands?.[t.band] || [612, 650];
          g.lineStyle?.(4, 0xffb070, 0.9); g.strokeRect?.(t.x - 300, band[0], 600, band[1] - band[0]);
        }
      }
      for (const s of b?.seeps || []) if (s.zone === z && s.phase !== 'gone') circle(s.x, s.y, 110, s.phase === 'tell' ? 0xff7040 : 0x654332);
      if (a?.ring) circle(a.ring.x, a.ring.y, a.ring.phase === 'tell' ? 30 : a.ring.r, 0xd8ff6a);
      for (const h of a?.hands || []) circle(h.x, h.y, 80, 0xffb070);
      for (const p of scene.spores || []) {
        circle(p.tx, p.ty, p.r, 0xff5544);
        g.fillStyle?.(0xc6e060, 0.9); g.fillCircle?.(p.x, p.y - 70 * Math.sin(Math.PI * Math.min(1, p.t / p.flight)), 8);
      }
      for (const c of scene.clouds || []) { g.fillStyle?.(0x6a8a30, 0.25); g.fillCircle?.(c.x, c.y, c.r); }
      for (const e of scene.enemies || []) if (e.type === 'balthamel' && e.state === 'step' && e.dest) circle(e.dest.x, e.dest.y, 70, 0xb890e0);
      if (a?.oak) circle(a.oak.x, a.oak.y, a.oak.r, a.oak.root ? 0xffd070 : 0x8ac868, a.oak.open ? 0.9 : 0.3);
      if (a?.green && a.frozen) circle(a.centre, 630, 55, 0x8ac868);
    },
    destroy() { g?.destroy?.(); },
  };
}
