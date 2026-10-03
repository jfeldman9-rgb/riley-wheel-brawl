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
