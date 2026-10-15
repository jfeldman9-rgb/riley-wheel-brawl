// Job 2 (UI/HUD & layering) regressions: mash hints below cards, Green Man Y-sort, misc HUD guards.
import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function textStub() {
  const o = { depth: 0, visible: true };
  o.setOrigin = () => o; o.setScrollFactor = () => o;
  o.setDepth = d => { o.depth = d; return o; };
  o.setText = () => o; o.setVisible = v => { o.visible = v; return o; };
  return o;
}
function fakeHud() {
  const hud = { made: [] };
  hud.add = { text: () => { const t = textStub(); hud.made.push(t); return t; } };
  return hud;
}

test('Stage 4 kiss-mash hint sits below the title/pause/cutscene cards (depth < 100)', async () => {
  const { drawStage4Meters } = await import('../src/stage4-hud.js');
  const hud = fakeHud();
  const s = { stageNo: 4, camX: 0, boss: null, riley: { x: 100, y: 600, state: 'grabbed', grabbedBy: { type: 'draghkar' } }, hud };
  drawStage4Meters(s, {});
  assert.ok(hud.kissHintT, 'hint created');
  assert.ok(hud.kissHintT.depth < 100, `depth ${hud.kissHintT.depth} would cover card (100), pause (200) and cutscene (300)`);
});

test('Stage 5 mash hint sits below the title/pause/cutscene cards (depth < 100)', async () => {
  const { drawStage5Meters } = await import('../src/stage5-hud.js');
  const hud = fakeHud();
  const s = { stageNo: 5, camX: 0, boss: null, enemies: [], kit: { arena: {}, blight: {} }, riley: { x: 100, y: 600, saidin: 0, state: 'grabbed', grabbedBy: { type: 'balthamel' } }, hud };
  drawStage5Meters(s, {});
  assert.ok(hud.s5Hint, 'hint created');
  assert.ok(hud.s5Hint.depth < 100, `depth ${hud.s5Hint.depth} would cover card (100), pause (200) and cutscene (300)`);
});

test('Stage 5 Green Man Y-sorts at his feet (630), not in front of every fighter', async () => {
  const { createStage5View } = await import('../src/stage5-view.js');
  let green = null;
  const gfx = { setDepth() { return gfx; }, clear() {}, lineStyle() {}, strokeCircle() {}, fillStyle() {}, fillRect() {}, strokeRect() {}, fillCircle() {}, beginPath() {}, moveTo() {}, lineTo() {}, strokePath() {} };
  const scene = {
    zoneI: 3, enemies: [], spores: [], clouds: [],
    textures: { exists: () => false, get: () => ({ source: [{ width: 64, height: 64, isCanvas: true }] }) },
    cache: { json: { get: () => null } }, lights: null,
    add: {
      graphics: () => gfx, image: () => null,
      sprite: () => { green = textStub(); green.setLighting = () => green; green.setFlipX = () => green; green.setFrame = () => green; green.setScale = () => green; green.setPosition = () => green; return green; },
    },
  };
  const kit = { s: { fx: { quality: 5 }, zoneI: 3, camX: 0, lightsOn: true, riley: { x: 2100 } }, arena: { green: { state: 'idle' }, frozen: true, centre: 2000, surge: null, oak: null, ring: null, hands: [] }, blight: { thorns: [], trees: [], seeps: [] } };
  createStage5View(scene).sync(kit);
  assert.ok(green, 'green man sprite created');
  assert.equal(green.depth, 1000 + 630, 'a fighter below y=630 must draw in front, one above must draw behind');
});

test('Stage 6 defender Y-sort and Stage 4 glimpse-label pin stay applied', () => {
  const s6 = readFileSync('src/stage6-view.js', 'utf8');
  assert.ok(s6.includes('setDepth?.(1000 + 640 - 2)'), 'Defenders Y-sort at their feet like Stage 5 dressing');
  const s4 = readFileSync('src/stage4-view.js', 'utf8');
  assert.ok(s4.includes('_glimpseLabel'), 'bridge glimpse label is pinned across syncs');
});
