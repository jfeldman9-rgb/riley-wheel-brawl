// HUD power slots and the cutscene pause card. Unit-level: HUD methods on stub text/image objects.
import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };
globalThis.Phaser = { Scene: class {} };
const { HUD } = await import('../src/hud.js');
const { Stage1 } = await import('../src/stage1.js');
function slotStub(log, name) {
  const o = { visible: false, alpha: 1 };
  for (const m of ['setText', 'setColor', 'setVisible', 'setTexture', 'setDisplaySize', 'setAlpha']) o[m] = function (v) { if (m !== 'setAlpha' && m !== 'setDisplaySize') log.push([name, m, v]); if (m === 'setVisible') this.visible = v; return this; };
  return o;
}
test('power slots show icon, name and a countdown; text is only redrawn when the power or whole second changes', () => {
  const hud = Object.create(HUD.prototype), log = [], bars = [];
  hud.slots = ['boost', 'ter'].map((slot, i) => ({ slot, y: 158 + i * 44, icon: slotStub(log, slot + '.icon'), label: slotStub(log, slot + '.label'), secs: slotStub(log, slot + '.secs'), kind: null, shown: null }));
  hud.bar = (...a) => bars.push(a); hud.game = { inp: { isTouch: false } };
  const s = { powers: { boost: null, ter: null } };
  for (let f = 0; f < 60; f++) hud.updatePowerSlots(s);
  assert.deepEqual(log, []); assert.equal(bars.length, 0);
  s.powers.boost = { kind: 'angreal', t: 10, total: 10 };
  hud.updatePowerSlots(s);
  assert.ok(log.some(e => e[0] === 'boost.label' && e[1] === 'setText' && e[2] === 'ANGREAL'));
  assert.ok(log.some(e => e[0] === 'boost.secs' && e[2] === '10s')); assert.ok(log.some(e => e[0] === 'boost.icon' && e[1] === 'setTexture' && e[2] === 'hud_angreal'));
  log.length = 0;
  for (let f = 0; f < 90; f++) { s.powers.boost.t -= 1 / 60; hud.updatePowerSlots(s); }
  assert.deepEqual(log, [['boost.secs', 'setText', '9s']], 'one redraw in a second and a half');
  assert.equal(bars.length, 91); assert.ok(Math.abs(bars.at(-1)[4] - s.powers.boost.t / 10) < 1e-9, 'bar shows time left');
  s.powers.ter = { kind: 'lightning', t: 12, total: 12 }; log.length = 0; hud.updatePowerSlots(s);
  assert.ok(log.some(e => e[0] === 'ter.label' && e[2] === 'LIGHTNING [L/Q]'), 'cast powers name their button');
  s.powers.boost = null; log.length = 0; hud.updatePowerSlots(s);
  assert.ok(log.some(e => e[0] === 'boost.icon' && e[1] === 'setVisible' && e[2] === false));
});
test('the PAUSED card stays hidden for the cutscene alone and shows for any other pause reason', () => {
  const s = Object.create(Stage1.prototype);
  Object.assign(s, { paused: true, pauseReasons: new Set(['cutscene']) });
  assert.equal(s.showPauseLabel(), false);
  s.pauseReasons.add('manual'); assert.equal(s.showPauseLabel(), true);
  s.pauseReasons = new Set(['report']); assert.equal(s.showPauseLabel(), true);
  s.paused = false; s.pauseReasons = new Set(); assert.equal(s.showPauseLabel(), false);
});
