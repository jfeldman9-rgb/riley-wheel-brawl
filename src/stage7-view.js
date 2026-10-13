// Rhuidean backdrop. One portal light, unlit dust, streamed plates.
import { VW, LANE_TOP, q } from './config.js';
import { paintStage7Art } from './stage7-art.js';
import { plateRect, STREAMS, residentKeys, plateKeyList } from './zone-stream.js';
import { STAGE7 } from './stage7-def.js';
import { COLUMNS } from './stage7-arena.js';

const PLATES = ['bg7mid', 'bg7mid2', 'bg7mid3', 'bg7mid4'];

function img(scene, x, y, key) {
  const s = scene.add?.image ? scene.add.image(x, y, key) : null;
  s?.setOrigin?.(0, 0);
  return s;
}

export function createStage7View(scene) {
  const owned = [];
  const plates = new Map();
  let far, dust, veil, portal, light;
  const columns = [];
  const view = {
    quality: 0,
    buildBackdrop() {
      const keep = residentKeys(scene, STREAMS[7]);
      const skip = new Set(plateKeyList(STREAMS[7]).filter(k => !keep.has(k)));
      if (q.get('story') === '0') for (const n of [1, 2, 3]) skip.add('story7p' + n);
      paintStage7Art(scene, skip);
      far = img(scene, 0, 0, 'bg7far');
      far?.setScrollFactor?.(0); far?.setDepth?.(-100); far?.setDisplaySize?.(VW, LANE_TOP + 8);
      if (far) owned.push(far);
      dust = img(scene, 0, 0, 's7dust');
      dust?.setScrollFactor?.(0); dust?.setDepth?.(3000); dust?.setAlpha?.(0); dust?.setDisplaySize?.(VW, 720);
      if (dust) owned.push(dust);
      veil = img(scene, 2560, LANE_TOP - 200, 's7veil');
      veil?.setDepth?.(-20); veil?.setDisplaySize?.(48, 280);
      if (veil) owned.push(veil);
      portal = img(scene, 360, LANE_TOP - 80, 's7portal');
      portal?.setDepth?.(-10); portal?.setDisplaySize?.(70, 120);
      if (portal) owned.push(portal);
      light = scene.lights?.addLight?.(400, 520, 160, 0xd9822b, 0.7);
      COLUMNS.forEach(x => {
        const c = img(scene, x, LANE_TOP - 220, 's7column');
        c?.setDepth?.(-15); c?.setDisplaySize?.(28, 260); c?.setAlpha?.(0.35);
        if (c) { columns.push(c); owned.push(c); }
      });
      for (const key of keep) view.showBackdrop(key);
    },
    showBackdrop(key) {
      if (plates.has(key) || key === 'bg7far') return;
      const i = PLATES.indexOf(key);
      const floors = ['bg7floor', 'bg7floor2', 'bg7floor3'];
      const fi = floors.indexOf(key);
      if (i < 0 && fi < 0) return;
      const zoneI = i >= 0 ? i : [0, 2, 3][fi] || 0;
      const rect = plateRect(zoneI, STAGE7.zones, STREAMS[7].bleed);
      const y = key.startsWith('bg7floor') ? LANE_TOP + 8 : 80;
      const h = key.startsWith('bg7floor') ? 160 : LANE_TOP;
      const node = img(scene, rect.x, y, key);
      node?.setDepth?.(key.startsWith('bg7floor') ? -30 : -40);
      node?.setDisplaySize?.(rect.w, h);
      if (node) { plates.set(key, node); owned.push(node); }
    },
    dropBackdrop(keep) {
      for (const [key, node] of plates) if (!keep?.has?.(key)) { node?.destroy?.(); plates.delete(key); }
    },
    paintBackdrop(key) { paintStage7Art(scene, new Set(plateKeyList(STREAMS[7]).filter(k => k !== key))); },
    dropPortal() { if (light) { scene.lights?.removeLight?.(light); light = null; } portal?.setAlpha?.(0.25); },
    dropDust() { dust?.destroy?.(); dust = null; },
    move(camX) { far?.setTilePosition?.(camX * 0.2, 0); if (veil) veil.setAlpha?.(camX > 2700 ? Math.max(0, 1 - (camX - 2700) / 400) : 0.85); },
    sync(kit) {
      const s = scene;
      if (light && (s.zoneI > 0 || s.wave >= 1)) view.dropPortal();
      dust?.setAlpha?.(Math.min(0.35, kit?.storm?.alpha || 0));
      const hum = kit?.arena?.hum;
      columns.forEach((c, i) => c?.setAlpha?.(hum === i ? 0.95 : 0.35));
    },
    setQuality(n) { view.quality = n | 0; },
    destroy() { if (light) scene.lights?.removeLight?.(light); light = null; for (const n of owned) n?.destroy?.(); owned.length = 0; },
  };
  return view;
}
