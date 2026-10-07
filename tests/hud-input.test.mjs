import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };
globalThis.Phaser = { Scene: class {} };
const { HUD } = await import('../src/hud.js');
test('only a title tap emits Start; tapping during play cannot pause the fight', () => {
  const hud = Object.create(HUD.prototype), pressed = [];
  hud.game = { inp: { press: action => pressed.push(action) } };
  hud.onTitlePointer(); assert.deepEqual(pressed, [], 'stage link not ready');
  hud.stage = { started: false, ended: false }; hud.onTitlePointer();
  assert.deepEqual(pressed, ['start']);
  hud.stage.started = true; hud.onTitlePointer();
  hud.stage.ended = true; hud.onTitlePointer();
  assert.deepEqual(pressed, ['start']);
});
test('HUD readiness completes pending Start only after the card is built', () => {
  const hud = Object.create(HUD.prototype), calls = [];
  const stage = { hudReady: false, startRequested: true, started: false,
    start() { assert.equal(this.hudReady, true); assert.ok(hud.card); calls.push('start'); } };
  hud.game = { scene: { getScene: () => stage } }; hud.card = {};
  window.__rwbStartup = { ready() { calls.push('ready'); } };
  try { hud.readyForPlay(); } finally { delete window.__rwbStartup; }
  assert.equal(hud.stage, stage); assert.deepEqual(calls, ['start', 'ready']);
});
test('HUD readiness dismisses a title for an already-started stage and missing cards are harmless', () => {
  const hud = Object.create(HUD.prototype); let hidden = 0;
  hud.stage = { started: true }; hud.hideTitle = () => hidden++;
  hud.readyForPlay(); assert.equal(hidden, 1);
  assert.doesNotThrow(() => HUD.prototype.hideTitle.call({ card: null }));
});
test('first touch after HUD creation moves the live caption and its backdrop above controls', () => {
  const hud = Object.create(HUD.prototype), rectangles = [];
  hud.game = { inp: { isTouch: false } }; hud.capWho = {}; hud.capText = { width: 400, height: 30 };
  hud.capBg = { clear() {}, fillStyle() {}, fillRoundedRect(...args) { rectangles.push(args); } };
  hud.positionCaptions(); assert.equal(hud.capY, 614); assert.equal(hud.capText.y, 656);
  hud.game.inp.isTouch = true; hud.positionCaptions();
  assert.equal(hud.capWho.y, 98); assert.equal(hud.capText.y, 126); assert.equal(rectangles.at(-1)[1], 84);
});

// ---- Stage 3 HUD (T9; additive block) ----
const hud3 = await import('../src/hud.js');

test('Stage 3 boss bar shows THE MYRDDRAAL with the fadePortrait key', async () => {
  const { STAGES } = await import('../src/stages.js');
  const { bossLabel } = hud3;
  assert.deepEqual(bossLabel({ stageNo: 3, stageDef: STAGES[3] }, () => true), { name: 'THE MYRDDRAAL', portrait: 'fadePortrait' });
  assert.deepEqual(bossLabel({ stageNo: 3, stageDef: STAGES[3] }, () => false), { name: 'THE MYRDDRAAL', portrait: 'bossPortrait' });
  assert.deepEqual(bossLabel({ stageNo: 3, stageDef: STAGES[3] }), { name: 'THE MYRDDRAAL', portrait: 'fadePortrait' });
});

test('Stage 1 and Stage 2 boss bar strings and portraits are unchanged', () => {
  const { bossLabel } = hud3;
  assert.deepEqual(bossLabel({ stageNo: 1 }, () => true), { name: 'TROLLOC CHIEFTAIN', portrait: 'bossPortrait' });
  assert.deepEqual(bossLabel({ stageNo: 1 }, () => false), { name: 'TROLLOC CHIEFTAIN', portrait: 'bossPortrait' });
  assert.deepEqual(bossLabel({ stageNo: 2 }, () => true), { name: 'JARET BYAR, CHILD OF THE LIGHT', portrait: 'byarPortrait' });
  assert.deepEqual(bossLabel({ stageNo: 2 }, () => false), { name: 'JARET BYAR, CHILD OF THE LIGHT', portrait: 'bossPortrait' });
});

test('PLACEHOLDER ART watermark shows with placeholder metas and hides when none is a placeholder', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { placeholderArt } = hud3;

  const real3 = {};
  for (const f of readdirSync('assets/stage3/chars').filter(f => f.endsWith('.anims.json'))) {
    real3[f] = JSON.parse(readFileSync(`assets/stage3/chars/${f}`, 'utf8'));
  }
  // Every Stage 3 sheet is real art now, so a stand-in card takes the placeholder role.
  assert.equal(placeholderArt({ metas: real3 }), false);
  const st3Metas = { ...real3, 'card.anims.json': { placeholder: true } };
  assert.equal(placeholderArt({ metas: st3Metas }), true);

  const st1Metas = {};
  for (const f of readdirSync('assets/chars').filter(f => f.endsWith('.anims.json'))) {
    st1Metas[f] = JSON.parse(readFileSync(`assets/chars/${f}`, 'utf8'));
  }
  assert.equal(placeholderArt({ metas: st1Metas }), false);

  assert.equal(placeholderArt({ metas: {}, cache: { json: { get: k => k === 'plates3' ? { placeholder: true } : null } } }), true);
  assert.equal(placeholderArt({ metas: {}, cache: { json: { get: () => ({ placeholder: false }) } } }), false);

  let calls = 0;
  const phTag = { setVisible(v) { calls++; } };
  const fakeHud = Object.create(hud3.HUD.prototype);
  fakeHud.phTag = phTag;
  fakeHud.phShown = false;

  fakeHud.updateWatermark({ metas: st3Metas });
  assert.equal(calls, 1);
  assert.equal(fakeHud.phShown, true);

  fakeHud.updateWatermark({ metas: st3Metas });
  assert.equal(calls, 1);

  fakeHud.updateWatermark({ metas: st1Metas });
  assert.equal(calls, 2);
  assert.equal(fakeHud.phShown, false);

  fakeHud.updateWatermark({ metas: st1Metas });
  assert.equal(calls, 2);
});

