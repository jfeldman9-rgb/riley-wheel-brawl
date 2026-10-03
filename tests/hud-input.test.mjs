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
