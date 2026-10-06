// Procedural labelled Stage 4 plates. Fog is sprites. Missing add.text stays silent.
import { VW, VH, LANE_TOP, WORLD_W } from './config.js';

export const LAYOUT = Object.freeze({
  moonKeys: Object.freeze([{ x: 0, ambient: 0x2a3348 }, { x: 2000, ambient: 0x1e2c44 }, { x: 3900, ambient: 0x121828 }]),
  shafts: Object.freeze([{ x: 460, y: 630, r: 120 }, { x: 1680, y: 640, r: 110 }, { x: 2280, y: 610, r: 100 }, { x: 3100, y: 650, r: 120 }, { x: 4560, y: 630, r: 150 }]),
  vents: Object.freeze([
    { x: 280, y: 650, zone: 0, fixed: { x: 480, y: 650 } },
    { x: 980, y: 600, zone: 0, fixed: { x: 780, y: 610 } },
    { x: 1400, y: 680, zone: 1 },
    { x: 2100, y: 590, zone: 1 },
    { x: 2700, y: 660, zone: 2 },
    { x: 3500, y: 600, zone: 2 },
  ]),
});

function paint(scene, key, w, h, draw) {
  if (!scene.textures || scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}
const box = (g, w, h, color) => { g.fillStyle(color, 1); g.fillRect(0, 0, w, h); };

export function ensureStage4Textures(scene) {
  paint(scene, 'bg4far', 640, 360, g => { box(g, 640, 360, 0x141820); g.fillStyle(0xf0e6c8, 1); g.fillCircle?.(560, 70, 28); });
  paint(scene, 'bg4mid', 480, 280, g => box(g, 480, 280, 0x2c2830));
  paint(scene, 'bg4mid2', 480, 280, g => box(g, 480, 280, 0x241e28));
  paint(scene, 'bg4floor', 256, 128, g => box(g, 256, 128, 0x3a3228));
  paint(scene, 'bg4floor2', 256, 128, g => box(g, 256, 128, 0x2e2820));
  paint(scene, 'bg4floor3', 256, 128, g => box(g, 256, 128, 0x241c18));
  paint(scene, 's4tip', 32, 32, g => { box(g, 32, 32, 0xd8ff6a); });
  paint(scene, 's4seg', 24, 24, g => box(g, 24, 24, 0x3d6b28));
  paint(scene, 's4vent', 40, 24, g => box(g, 40, 24, 0x1a3a14));
  paint(scene, 's4wall', 32, 160, g => box(g, 32, 160, 0x163018));
  paint(scene, 's4shaft', 64, 64, g => { box(g, 64, 64, 0xfff2b0); });
  paint(scene, 's4tower', 48, 220, g => box(g, 48, 220, 0x6a6258));
  paint(scene, 's4rubble', 72, 28, g => box(g, 72, 28, 0x5a5048));
  paint(scene, 's4drag', 64, 96, g => box(g, 64, 96, 0xc8b8e0));
  paint(scene, 's4cult', 48, 80, g => box(g, 48, 80, 0x8a5048));
  paint(scene, 's4bolt', 16, 16, g => box(g, 16, 16, 0x9dff6a));
  paint(scene, 's4fog', 128, 256, g => box(g, 128, 256, 0x1e3a22));
  paint(scene, 'story4p1', 320, 180, g => box(g, 320, 180, 0x1a2438));
  paint(scene, 'story4p2', 320, 180, g => box(g, 320, 180, 0x2a2418));
  paint(scene, 'story4p3', 320, 180, g => box(g, 320, 180, 0x14301c));
  paint(scene, 'draghkarPortrait', 68, 68, g => box(g, 68, 68, 0xc8b8e0));
}

export function moonAmbient(camX, keys = LAYOUT.moonKeys) {
  let a = keys[0];
  for (const k of keys) if (camX >= k.x) a = k;
  return a.ambient;
}

export function createStage4View(scene) {
  const pools = { tip: [], seg: [], vent: [], wall: [], shaft: [], tower: [], rubble: [], bolt: [], label: [] };
  const live = new Set();
  const texts = new Map();
  function take(kind, key) {
    const pool = pools[kind];
    let s = pool.find(o => !o._on);
    if (!s) {
      s = scene.add.image(0, 0, key);
      s.setDepth?.(1200);
      pool.push(s);
    }
    s._on = true; live.add(s); s.setVisible?.(true); return s;
  }
  function label(x, y, text) {
    if (!scene.add.text) return;
    let t = texts.get(text);
    if (!t) {
      t = scene.add.text(x, y, text, { fontFamily: 'sans-serif', fontSize: '14px', color: '#d8ff6a', stroke: '#000', strokeThickness: 3 });
      t.setDepth?.(2500);
      texts.set(text, t);
    }
    t.setPosition?.(x, y); t._on = true;
  }
  return {
    buildBackdrop() {
      ensureStage4Textures(scene);
      const far = scene.add.image(0, 80, 'bg4far').setOrigin?.(0, 0).setScrollFactor?.(0.15).setDepth?.(-100);
      far?.setDisplaySize?.(VW + 400, VH * 0.62);
      scene.add.image(0, LANE_TOP, 'bg4mid').setOrigin?.(0, 1).setScrollFactor?.(0.4).setDepth?.(-50);
      scene.add.image(900, LANE_TOP, 'bg4mid2').setOrigin?.(0, 1).setScrollFactor?.(0.4).setDepth?.(-50);
      const fh = VH - LANE_TOP + 40;
      scene.add.tileSprite?.(0, LANE_TOP - 20, 1800, fh, 'bg4floor')?.setOrigin?.(0, 0).setDepth?.(-40);
      scene.add.tileSprite?.(1800, LANE_TOP - 20, 1800, fh, 'bg4floor2')?.setOrigin?.(0, 0).setDepth?.(-40);
      scene.add.tileSprite?.(3600, LANE_TOP - 20, WORLD_W, fh, 'bg4floor3')?.setOrigin?.(0, 0).setDepth?.(-40);
      this.moon = scene.lights?.addLight?.(VW * 0.85, 90, 520, 0xf0e6c8, 0.9, 80);
      this.shaftLights = [];
      label(80, 120, 'SHADAR LOGOTH');
    },
    addShaftLight(m) {
      this.shaftSpecs = this.shaftSpecs || [];
      this.shaftSpecs.push(m);
      this.shaftLights = this.shaftLights || [];
    },
    budget(cam, on) {
      const specs = (this.shaftSpecs || []).filter(m => m.x > cam - 80 && m.x < cam + VW + 80).slice(0, 2);
      for (const L of this.shaftLights.slice()) {
        if (!specs.some(m => Math.abs(m.x - L.x) < 1)) {
          scene.lights?.removeLight?.(L);
          this.shaftLights.splice(this.shaftLights.indexOf(L), 1);
        }
      }
      for (const m of specs) {
        if (this.shaftLights.some(L => Math.abs(L.x - m.x) < 1)) continue;
        const L = scene.lights?.addLight?.(m.x, m.y - 80, m.r * 3, 0xfff2b0, on ? 1.15 : 0, 70);
        if (L) this.shaftLights.push(L);
      }
    },
    sync(kit) {
      for (const s of live) s._on = false;
      live.clear();
      const fog = kit.fog;
      if (fog) {
        for (const v of fog.vents) {
          const s = take('vent', 's4vent'); s.setPosition?.(v.x, v.y);
          if (v.phase === 'tell') label(v.x, v.y - 36, 'FOG');
        }
        const q = scene.fx?.quality >= 2 ? 5 : 8;
        for (const t of fog.tendrils) {
          const segs = t.segments || [];
          const n = Math.min(q, segs.length);
          for (let i = 0; i < n; i++) {
            const p = segs[Math.floor(i * (segs.length - 1) / Math.max(1, n - 1))];
            const s = take(i === n - 1 ? 'tip' : 'seg', i === n - 1 ? 's4tip' : 's4seg');
            s.setPosition?.(p.x, p.y);
          }
        }
      }
      for (const m of kit.shafts || []) {
        const s = take('shaft', 's4shaft'); s.setPosition?.(m.x, m.y); s.setScale?.(m.r / 40);
      }
      for (const tw of kit.towers?.towers || []) {
        const s = take('tower', 's4tower'); s.setPosition?.(tw.x, tw.y - 80);
        label(tw.x, tw.y - 140, tw.harmless ? 'SHOW' : 'TOWER');
      }
      for (const r of kit.towers?.rubble || []) { const s = take('rubble', 's4rubble'); s.setPosition?.(r.x, r.y); }
      const wall = kit.towers?.zoneWall;
      if (wall) { const s = take('wall', 's4wall'); s.setPosition?.(wall.x, 630); s.setScale?.(1, 4); label(wall.x, 560, 'FOG WALL'); }
      const arena = kit.arena;
      if (arena?.active) {
        const a = take('wall', 's4wall'); a.setPosition?.(arena.left, 640); a.setScale?.(1, 4);
        const b = take('wall', 's4wall'); b.setPosition?.(arena.right, 640); b.setScale?.(1, 4);
        if (arena.swoop?.tell) label((arena.left + arena.right) / 2, 540, 'FOG SWOOP');
      }
      for (const bolt of scene.fogBolts || []) { const s = take('bolt', 's4bolt'); s.setPosition?.(bolt.x, bolt.y); }
      for (const pool of Object.values(pools)) for (const s of pool) if (!s._on && s.setVisible) s.setVisible(false);
      for (const t of texts.values()) if (!t._on) t.setVisible?.(false); else t.setVisible?.(true);
      for (const t of texts.values()) t._on = false;
    },
    glimpse() {
      const g = scene.add.image(3600, LANE_TOP - 40, scene.textures.exists('fade_far') ? 'fade_far' : 's4fog');
      g.setScrollFactor?.(0.2).setDepth?.(-20).setAlpha?.(0.85);
      this._glimpse = g;
      label(3400, 500, 'THERE, ON THE BRIDGE');
    },
    moveMoon(camX) { if (this.moon) this.moon.x = camX + VW * 0.85; },
    destroy() {
      for (const pool of Object.values(pools)) for (const s of pool) s.destroy?.();
      this._glimpse?.destroy?.();
      for (const t of texts.values()) t.destroy?.();
      for (const L of this.shaftLights || []) scene.lights?.removeLight?.(L);
      if (this.moon) scene.lights?.removeLight?.(this.moon);
      this.shaftLights = [];
    },
  };
}
