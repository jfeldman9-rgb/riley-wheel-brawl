import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '' };
globalThis.window = { devicePixelRatio: 1 };
globalThis.document = { getElementById: () => null, querySelectorAll: () => [], addEventListener() {} };
globalThis.addEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false });
globalThis.Phaser = { Scene: class {} };
const { Riley } = await import('../src/riley.js');
const { Input } = await import('../src/input.js');
const { Stage1 } = await import('../src/stage1.js');
const { perf } = await import('../src/perf.js');

function holder(knees = 0) {
  const r = Object.create(Riley.prototype);
  Object.assign(r, { held: { alive: true, state: 'held' }, state: 'hold', knees, facing: 1, holdT: 0,
    placeHeld() {}, setState(s) { this.state = s; }, startThrow() { this.state = 'throw'; } });
  return r;
}
function press(action, x = 0) {
  return { x, pending: action, calls: {}, take(a) { this.calls[a] = (this.calls[a] || 0) + 1; if (this.pending !== a) return false; this.pending = null; return true; } };
}
for (const knees of [0, 1]) test(`grab attack ${knees + 1} starts a knee and consumes exactly once`, () => {
  const r = holder(knees), i = press('attack'); r.hold(1 / 60, i);
  assert.equal(r.state, 'knee'); assert.equal(r.knees, knees + 1); assert.equal(i.calls.attack, 1);
});
test('third grab attack throws; jump and back+attack still throw', () => {
  for (const [knees, action, x] of [[2, 'attack', 0], [0, 'jump', 0], [0, 'attack', -1]]) {
    const r = holder(knees), i = press(action, x); r.hold(1 / 60, i); assert.equal(r.state, 'throw');
  }
});
test('one knee frame damages its held target once', () => {
  const r = holder(); r.state = 'knee'; r.kneeHit = false;
  // Frame 0 is the pull-down anticipation; the knee lands on frame 1 (the contact frame).
  let fi = 0; Object.defineProperty(r, 'fi', { get: () => fi }); Object.defineProperty(r, 'done', { value: false });
  const calls = []; r.scene = { hitTarget: (...args) => calls.push(args) };
  r.hold(1 / 60, press(null)); assert.equal(calls.length, 0, 'anticipation frame does not hit');
  fi = 1; r.hold(1 / 60, press(null)); r.hold(1 / 60, press(null));
  assert.equal(calls.length, 1); assert.equal(calls[0][0], r); assert.equal(calls[0][1], r.held);
  assert.equal(calls[0][2].dmg, 8); assert.equal(calls[0][2].anim, 'knee');
});
test('input clear drops buffered/held touch and keyboard movement', () => {
  const i = new Input(); i.press('attack'); i.held.left = true; i.touchAxis.x = 1; i.runLatch = true;
  i.demo = { x: 1 }; i.clear();
  assert.equal(i.take('attack'), false); assert.deepEqual(i.held, {}); assert.equal(i.touchAxis.x, 0);
  assert.equal(i.demo, null); assert.equal(i.runLatch, false); assert.equal(i.x, 0);
});
test('scene listener unsubscribe prevents repeated start handlers', () => {
  const i = new Input(); let calls = 0;
  for (let restart = 0; restart < 4; restart++) { const off = i.on('press', () => calls++); i.press('start'); off(); }
  assert.equal(calls, 4); assert.equal(i.listeners.press.length, 0);
});
function stage() {
  const s = Object.create(Stage1.prototype), events = [];
  Object.assign(s, { pauseReasons: new Set(), paused: false, started: true, ended: false, gameOver: false,
    inp: { clear() { events.push('clear'); } }, scene: { pause() { events.push('pause'); }, resume() { events.push('resume'); } },
    hud: { pauseLabel: { setVisible(v) { events.push(v); } } } });
  return { s, events };
}
test('manual and report pause reasons are independent; resume waits for both', () => {
  const { s, events } = stage();
  s.setPauseReason('manual', true); s.setPauseReason('report', true); s.setPauseReason('report', false);
  assert.equal(s.paused, true); assert.equal(events.filter(e => e === 'resume').length, 0);
  s.setPauseReason('manual', false); assert.equal(s.paused, false);
  assert.equal(events.filter(e => e === 'pause').length, 1); assert.equal(events.filter(e => e === 'resume').length, 1);
  assert.deepEqual(perf.suspended, []);
});
test('pause key toggles during a fight and cannot dismiss report suspension', () => {
  const { s } = stage(); s.onPress('pause'); assert.equal(s.paused, true);
  s.onPress('pause'); assert.equal(s.paused, false);
  s.setPauseReason('report', true); s.onPress('pause'); assert.equal(s.paused, true);
  s.setPauseReason('report', false);
});
test('pause on title does not accidentally start the game', () => {
  const { s } = stage(); s.started = false; s.start = () => { throw Error('must not start'); };
  s.onPress('pause'); assert.equal(s.paused, false);
});
