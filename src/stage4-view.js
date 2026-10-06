// Shadar Logoth view. Art is painted at boot; this places it and keeps the fog readable.
import { VW, VH, LANE_TOP, WORLD_W } from './config.js';
import { paintStage4Art } from './stage4-art.js';
const EMPTY = [];

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

export function ensureStage4Textures(scene) { paintStage4Art(scene); }

export function moonAmbient(camX, keys = LAYOUT.moonKeys) {
  let a = keys[0];
  for (const k of keys) if (camX >= k.x) a = k;
  return a.ambient;
}

export function createStage4View(scene) {
  const pools = { tip: [], seg: [], vent: [], wall: [], shaft: [], tower: [], rubble: [], bolt: [], label: [] };
  const poolList = Object.values(pools), specs = [];
  const live = new Set();
  const texts = new Map();
  function take(kind, key) {
    const pool = pools[kind];
    let s;
    for (const o of pool) if (!o._on) { s = o; break; }
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
  function placeWall(x, y, flip, now) {
    const s = take('wall', 's4wall');
    s.setPosition?.(x, y);
    s.setOrigin?.(0.5, 0.86);
    s.setDisplaySize?.(90, 560);
    s.setAlpha?.(0.78);
    s.setFrame?.((now * 3 | 0) % 2);
    s.setFlipX?.(!!flip);
    s.setBlendMode?.('ADD');
    s.setDepth?.(860);
  }
  function hasX(list, x) {
    for (const item of list) if (Math.abs(item.x - x) < 1) return true;
    return false;
  }
  return {
    buildBackdrop() {
      ensureStage4Textures(scene);
      const far = scene.add.image(0, 0, 'bg4far').setOrigin?.(0, 0).setScrollFactor?.(0).setDepth?.(-100);
      far?.setDisplaySize?.(VW, LANE_TOP + 30);
      scene.backdropLit = scene.backdropLit || [];
      for (let x = -40; x < WORLD_W; x += 500) {
        const mid = scene.add.image(x, LANE_TOP + 8, (x / 500) % 2 ? 'bg4mid2' : 'bg4mid').setOrigin?.(0, 1).setScrollFactor?.(0.38).setDepth?.(-50);
        mid?.setLighting?.(true);
        if (mid) scene.backdropLit.push(mid);
      }
      const fh = VH - LANE_TOP + 40;
      const floors = [
        scene.add.tileSprite?.(0, LANE_TOP - 20, 1800, fh, 'bg4floor'),
        scene.add.tileSprite?.(1800, LANE_TOP - 20, 1800, fh, 'bg4floor2'),
        scene.add.tileSprite?.(3600, LANE_TOP - 20, WORLD_W, fh, 'bg4floor3'),
      ];
      for (const f of floors) { f?.setOrigin?.(0, 0).setDepth?.(-40).setLighting?.(true); if (f) scene.backdropLit.push(f); }
      this.banks = [];
      for (let x = 160; x < WORLD_W; x += 620) {
        const b = scene.add.image(x, 675, 's4fog');
        b.setDepth?.(-16); b.setAlpha?.(0.7); b.setScale?.(2.4, 1.35); b.setBlendMode?.('ADD');
        this.banks.push(b);
      }
      this.moon = scene.lights?.addLight?.(VW * 0.85, 90, 640, 0xf0e6c8, 1.05, 80);
      this.shaftLights = [];
      if (scene.add.graphics) this.marks = scene.add.graphics().setDepth?.(1400);
    },
    addShaftLight(m) {
      this.shaftSpecs = this.shaftSpecs || [];
      this.shaftSpecs.push(m);
      this.shaftLights = this.shaftLights || [];
    },
    budget(cam, on) {
      specs.length = 0;
      for (const m of this.shaftSpecs || EMPTY) {
        if (m.x > cam - 80 && m.x < cam + VW + 80) specs.push(m);
        if (specs.length === 2) break;
      }
      for (let i = this.shaftLights.length - 1; i >= 0; i--) {
        const L = this.shaftLights[i];
        if (!hasX(specs, L.x)) {
          scene.lights?.removeLight?.(L);
          this.shaftLights.splice(this.shaftLights.indexOf(L), 1);
        }
      }
      for (const m of specs) {
        if (hasX(this.shaftLights, m.x)) continue;
        const L = scene.lights?.addLight?.(m.x, m.y - 80, m.r * 3, 0xfff2b0, on ? 1.15 : 0, 70);
        if (L) this.shaftLights.push(L);
      }
      for (const L of this.shaftLights) L.intensity = on ? 1.15 : 0;
    },
    sync(kit) {
      const now = (scene.time?.now || 0) / 1000;
      const thin = (scene.fx?.quality || 0) >= 2;
      for (let i = 0; i < (this.banks || EMPTY).length; i++) {
        const b = this.banks[i];
        b.x = 160 + i * 620 + Math.sin(now * 0.28 + i) * 34;
        b.setVisible?.(!thin || i % 2 === 0);
        b.setAlpha?.(thin ? 0.22 : 0.62);
      }
      for (const s of live) s._on = false;
      live.clear();
      const fog = kit.fog;
      if (fog) {
        for (const v of fog.vents) {
          const s = take('vent', 's4vent');
          const hot = v.phase === 'tell';
          s.setPosition?.(v.x, v.y);
          s.setFrame?.(hot ? 1 : 0);
          s.setScale?.(hot ? 1.3 + Math.sin(now * 16) * 0.08 : 1);
          s.setBlendMode?.('ADD');
          s.setDepth?.(1000 + v.y);
        }
        const q = thin ? 5 : 8;
        const pulse = 1 + Math.sin(now * 10) * 0.16;
        for (const t of fog.tendrils) {
          const segs = t.segments || EMPTY;
          const n = Math.min(q, segs.length);
          for (let i = 0; i < n; i++) {
            const p = segs[Math.floor(i * (segs.length - 1) / Math.max(1, n - 1))];
            const tip = i === n - 1;
            const s = take(tip ? 'tip' : 'seg', tip ? 's4tip' : 's4seg');
            const k = n <= 1 ? 1 : i / (n - 1);
            s.setPosition?.(p.x, p.y);
            s.setScale?.(tip ? 1.85 * pulse : 1.5 - k * 0.85);
            s.setAlpha?.(tip ? 1 : 0.45 + k * 0.4);
            s.setBlendMode?.('ADD');
            s.setDepth?.(1000 + p.y + (tip ? 12 : 2));
          }
        }
      }
      for (const m of kit.shafts || EMPTY) {
        const s = take('shaft', 's4shaft');
        s.setOrigin?.(0.5, 1);
        s.setPosition?.(m.x, m.y + 30);
        s.setScale?.(m.r / 110, 2.5);
        s.setAlpha?.(0.5);
        s.setBlendMode?.('ADD');
        s.setDepth?.(-8);
      }
      for (const tw of kit.towers?.towers || EMPTY) {
        const s = take('tower', 's4tower');
        s.setOrigin?.(0.5, 1);
        s.setPosition?.(tw.x, tw.harmless ? 430 : (tw.y || 640) + 6);
        s.setScale?.(tw.harmless ? 0.7 : 1);
        s.setFrame?.((((tw.t || 0) * 6) | 0) % 2);
        s.setRotation?.(tw.harmless ? 0 : Math.min(0.4, (tw.t || 0) * 0.22));
        s.setDepth?.(980);
      }
      for (const r of kit.towers?.rubble || EMPTY) {
        const s = take('rubble', 's4rubble');
        s.setOrigin?.(0.5, 0.8);
        s.setPosition?.(r.x, r.y);
        s.setDepth?.(1000 + r.y);
      }
      const wall = kit.towers?.zoneWall;
      if (wall) placeWall(wall.x, 640, false, now);
      const arena = kit.arena;
      if (arena?.active) {
        placeWall(arena.left, 650, false, now);
        placeWall(arena.right, 650, true, now);
      }
      for (const bolt of scene.fogBolts || EMPTY) {
        for (let i = 2; i >= 0; i--) {
          const s = take('bolt', 's4bolt');
          s.setPosition?.(bolt.x - (bolt.vx || 0) * 0.04 * i, bolt.y);
          s.setScale?.(1.15 - i * 0.28);
          s.setAlpha?.(1 - i * 0.3);
          s.setBlendMode?.('ADD');
          s.setDepth?.(1200);
        }
      }
      const g = this.marks;
      g?.clear?.();
      if (g?.fillStyle) {
        for (const tw of kit.towers?.towers || EMPTY) {
          if (tw.phase !== 'tell' || tw.harmless) continue;
          g.fillStyle(0x000000, 0.4);
          g.fillEllipse?.(tw.x, (tw.y || 640) + 4, 78, 16);
        }
      }
      const boss = scene.boss;
      if (g?.fillStyle && boss?.floorShadow) {
        const y = boss.deps?.bandY || boss.y;
        const dir = boss.swoopDir || 1;
        const ax = (scene.riley?.x || boss.x);
        g.fillStyle(0x041008, 0.5);
        g.fillEllipse?.(ax, y + 8, 110, 24);
        g.lineStyle(4, 0xd8ff6a, 0.9);
        g.beginPath?.();
        g.moveTo?.(ax - dir * 34, y - 14);
        g.lineTo?.(ax + dir * 8, y);
        g.lineTo?.(ax - dir * 34, y + 14);
        g.strokePath?.();
      }
      if (g?.lineStyle && boss?.state === 'croon') {
        const p = now % 1;
        g.lineStyle(3, 0xd8ff6a, 1 - p);
        g.strokeCircle?.(boss.x, boss.y - 170, 28 + p * 70);
        g.lineStyle(2, 0xf0d878, 0.8);
        g.strokeCircle?.(boss.x, boss.y - 170, 46);
      }
      for (const pool of poolList) for (const s of pool) if (!s._on && s.setVisible) s.setVisible(false);
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
      for (const b of this.banks || []) b.destroy?.();
      this.marks?.destroy?.();
      for (const L of this.shaftLights || []) scene.lights?.removeLight?.(L);
      if (this.moon) scene.lights?.removeLight?.(this.moon);
      this.shaftLights = [];
    },
  };
}
