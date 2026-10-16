// Boss phase banners share one backed plate that stays off the burning barn and its roof flames.
// Layout is in the 1280×720 canvas (FIT-scaled onto phone landscape, upright phone and iPad).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };
globalThis.Phaser = { Scene: class {}, Geom: { Rectangle: class {} } };
const { VW, VH } = await import('../src/config.js');
const { BOSS_BANNER, BOSS_BANNER_TEXT, bossBannerBox } = await import('../src/hud.js');
const { BARN_ART, MID_Y } = await import('../src/stage2.js');
const { STAGE2 } = await import('../src/stages.js');

const plates = JSON.parse(readFileSync(new URL('../assets/bg2/plates.json', import.meta.url)));
const boss = STAGE2.zones.find(z => z.boss);
const camX = boss.l;
const ms = plates.midScale, par = plates.midParallax;
const mid2b = (plates.midX0 || 0) + 2172 * ms;
const top = MID_Y - 724 * ms;
const screenX = wx => wx - camX * par;

function rectsOverlap(a, b) { return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }

const overlay = {
  left: screenX(mid2b + BARN_ART.overlay.x * ms),
  top,
  right: screenX(mid2b + BARN_ART.overlay.x * ms) + 1024 * ms,
  bottom: top + 768 * ms,
};
const flames = BARN_ART.flames.map(art => {
  const sc = art.scale * ms, ox = screenX(mid2b + art.x * ms), oy = top + art.y * ms;
  return { key: art.key, left: ox - 128 * sc, right: ox + 128 * sc, top: oy - 350 * sc, bottom: oy + (384 - 350) * sc };
});

test('boss phase banners share one plate left of the burning barn and its flames', () => {
  assert.equal(boss.r - boss.l, VW, 'the boss arena locks the camera on the barn');
  const box = bossBannerBox();
  const lines = [...BOSS_BANNER_TEXT.values()];
  assert.deepEqual(lines.map(t => t.replaceAll('\n', ' ')), [
    'BYAR IS TORCHING THE BARN!',
    'JARET BYAR CALLS HIS ARCHERS',
    'THE CHIEFTAIN IS ENRAGED',
  ]);
  for (const text of BOSS_BANNER_TEXT.values()) {
    const widest = Math.max(...text.split('\n').map(line => line.length));
    assert.ok(widest * BOSS_BANNER.fontSize <= BOSS_BANNER.maxWidth, `${JSON.stringify(text)} fits the plate`);
  }
  // Inset from the canvas so FIT scaling does not clip the plate on a phone or an iPad,
  // and below the health / power slots (those occupy about y=140–220 on the left).
  assert.ok(box.left >= 16 && box.right <= VW - 16 && box.top >= 228 && box.bottom <= VH - 160, JSON.stringify(box));
  assert.ok(box.right < overlay.left - 16, `plate right ${box.right} overlaps the barn at ${overlay.left}`);
  assert.equal(rectsOverlap(box, overlay), false, 'the plate does not cover the barn');
  for (const flame of flames) {
    assert.equal(rectsOverlap(box, flame), false, `the plate covers ${flame.key}`);
    assert.ok(box.right < flame.left - 16, `${flame.key} is clear of the plate`);
  }
});
