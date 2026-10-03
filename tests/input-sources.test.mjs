import test from 'node:test';
import assert from 'node:assert/strict';
const events = {};
globalThis.addEventListener = (name, fn) => { (events[name] ||= []).push(fn); };
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = { getElementById: () => null, querySelectorAll: () => [] };
let pads = [];
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true });
const { Input } = await import('../src/input.js');
function input() { for (const key of Object.keys(events)) delete events[key]; pads = []; return new Input(); }
function key(type, code, repeat = false) { for (const fn of events[type] || []) fn({ code, repeat, preventDefault() {} }); }
function pad(id = 'pad-a', index = 0) { return { id, index, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) }; }
test('releasing one keyboard alias does not cancel another held alias', () => {
  const i = input(); key('keydown', 'KeyD'); key('keydown', 'ArrowRight');
  key('keyup', 'KeyD'); i.update(1 / 60); assert.equal(i.x, 1);
  key('keyup', 'ArrowRight'); i.update(1 / 60); assert.equal(i.x, 0);
});
test('two Shift keys retain run until both are released', () => {
  const i = input(); key('keydown', 'ShiftLeft'); key('keydown', 'ShiftRight');
  key('keyup', 'ShiftLeft'); i.update(1 / 60); assert.equal(i.run, true);
  key('keyup', 'ShiftRight'); i.update(1 / 60); assert.equal(i.run, false);
});
test('blur clears physical keyboard sources as well as action state', () => {
  const i = input(); key('keydown', 'KeyD'); key('keydown', 'ArrowRight');
  events.blur[0](); key('keyup', 'KeyD'); i.update(1 / 60);
  assert.equal(i.x, 0); assert.equal(i.keysDown.size, 0);
});
test('gamepad Start is a start action and remains edge-triggered across input clear', () => {
  const i = input(), p = pad(), pressed = []; pads = [p]; i.on('press', a => pressed.push(a));
  p.buttons[9].pressed = true; i.update(1 / 60); i.clear(); i.update(1 / 60);
  assert.deepEqual(pressed, ['start']);
  p.buttons[9].pressed = false; i.update(1 / 60); p.buttons[9].pressed = true; i.update(1 / 60);
  assert.deepEqual(pressed, ['start', 'start']);
});
test('a disconnected or replaced gamepad does not retain stale button edges', () => {
  const i = input(), p = pad(), pressed = []; i.on('press', a => pressed.push(a));
  p.buttons[2].pressed = true; pads = [p]; i.update(1 / 60);
  pads = []; i.update(1 / 60); pads = [p]; i.update(1 / 60);
  const replacement = pad('pad-b'); replacement.buttons[2].pressed = true; pads = [replacement]; i.update(1 / 60);
  assert.deepEqual(pressed, ['attack', 'attack', 'attack']);
});
test('keyboard auto-repeat never creates extra buffered attack edges', () => {
  const i = input(); key('keydown', 'KeyJ'); assert.equal(i.take('attack'), true);
  key('keydown', 'KeyJ', true); assert.equal(i.take('attack'), false);
});
