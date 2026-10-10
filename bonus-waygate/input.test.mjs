// The Waygate must use src/input.js itself, not a copied binding table.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PAD_MAP, Input } from '../src/input.js';

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const inputSrc = read('../src/input.js');
const mainHtml = read('../index.html');
const wayHtml = read('./index.html');
const game = read('./game.js');
const boot = read('./boot-input.js');
const hud = read('../src/hud.js');

test('the Waygate imports the stage PAD_MAP object', async () => {
  assert.match(boot, /import\s*\{[^}]*\bInput\b[^}]*\bPAD_MAP\b[^}]*\}\s*from\s*['"]\.\.\/src\/input\.js['"]/);
  await import('./boot-input.js');
  assert.equal(globalThis.WAYGATE_PAD_MAP, PAD_MAP);
  assert.equal(globalThis.WaygateInput, Input);
  assert.doesNotMatch(game, /PAD_MAP\s*=/);
  assert.doesNotMatch(game, /const KEYS/);
  assert.doesNotMatch(game, /dodge:\s*['"]SHIFT['"]/);
  assert.doesNotMatch(game, /restart:\s*['"]R['"]/);
  assert.doesNotMatch(game, /startDodge/);
  assert.match(game, /__waygateInput/);
  for (const action of ['attack', 'jump', 'special', 'power', 'assist', 'pause', 'start']) {
    assert.match(game, new RegExp(`take\\('${action}'`));
  }
  assert.match(game, /\.run/);
});

test('keyboard and pad bindings are the stage map', () => {
  const block = inputSrc.slice(inputSrc.indexOf('const KEYS'), inputSrc.indexOf('export const PAD_MAP'));
  const pairs = [...block.matchAll(/([A-Za-z0-9]+):\s*'([a-z]+)'/g)].map((m) => [m[1], m[2]]);
  assert.ok(pairs.length >= 24, `expected the stage key table, got ${pairs.length}`);
  const listeners = {};
  globalThis.addEventListener = (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); };
  globalThis.matchMedia = () => ({ matches: false });
  globalThis.document = {
    body: { classList: { add() {}, remove() {} } },
    getElementById() { return null; },
    querySelectorAll() { return []; }
  };
  const nav = { getGamepads() { return []; } };
  Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true });
  const fire = (type, code) => {
    const e = {
      code, repeat: false, defaultPrevented: false, target: { closest: () => null },
      preventDefault() { this.defaultPrevented = true; }
    };
    for (const fn of listeners[type] || []) fn(e);
  };
  const inp = new Input();
  for (const [code, action] of pairs) {
    fire('keydown', code);
    inp.update(0.001);
    assert.equal(inp.take(action), true, `${code} should be ${action}`);
    if (action === 'run' || action === 'left' || action === 'right' || action === 'up' || action === 'down') {
      assert.equal(!!inp.held[action], true, `${code} should hold ${action}`);
    }
    fire('keyup', code);
    inp.update(0.001);
  }
  assert.equal(inp.take('attack'), false);

  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  const axes = [0, 0];
  nav.getGamepads = () => [{ index: 0, id: 'test-pad', buttons, axes }];
  const pad = new Input();
  for (const [index, action] of Object.entries(PAD_MAP)) {
    buttons[index].pressed = true;
    pad.update(0.01);
    assert.equal(pad.take(action), true, `pad ${index} should be ${action}`);
    buttons[index].pressed = false;
    pad.update(0.01);
  }
  buttons[14].pressed = true;
  pad.update(0.01);
  assert.equal(pad.x, -1);
  buttons[14].pressed = false;
  buttons[15].pressed = true;
  pad.update(0.01);
  assert.equal(pad.x, 1);
  buttons[15].pressed = false;
  buttons[12].pressed = true;
  pad.update(0.01);
  assert.equal(pad.y, -1);
  buttons[12].pressed = false;
  buttons[13].pressed = true;
  pad.update(0.01);
  assert.equal(pad.y, 1);
  buttons[13].pressed = false;
  axes[0] = 0.8;
  pad.update(0.01);
  assert.equal(pad.x, 1);
  axes[0] = 0;
  buttons[5].pressed = true;
  pad.update(0.01);
  assert.equal(pad.run, true, 'RB is run');
});

test('touch stick, labels, and CSS match the main game', () => {
  const binds = [...inputSrc.matchAll(/\['(tb[A-Z])',\s*'(\w+)'\]/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(binds, [
    ['tbA', 'attack'], ['tbJ', 'jump'], ['tbS', 'special'], ['tbP', 'pause'], ['tbB', 'power'], ['tbL', 'assist']
  ]);
  const snippet = '<div id="touch"><div id="stick"><div id="knob"></div></div>\n<div class="tb" id="tbA">KICK</div><div class="tb" id="tbJ">JUMP</div><div class="tb" id="tbS">FIRE</div><div class="tb" id="tbP">II</div><div class="tb off" id="tbB">BALE</div><div class="tb" id="tbL">CALL</div></div>';
  assert.ok(mainHtml.includes(snippet), 'main touch markup drifted');
  assert.ok(wayHtml.includes(snippet), 'Waygate touch markup is not the stage stick and buttons');
  assert.doesNotMatch(wayHtml, /id="touch-controls"/);
  assert.doesNotMatch(wayHtml, />ROLL</);
  const start = mainHtml.indexOf('#touch{position:fixed');
  const end = mainHtml.indexOf('/* Performance capture');
  assert.ok(start > 0 && end > start);
  const css = mainHtml.slice(start, end).trim();
  assert.ok(wayHtml.includes(css), 'Waygate touch CSS drifted from the main game');
  for (const [id] of binds) assert.match(wayHtml, new RegExp(`id="${id}"`));
  const touchHelp = hud.match(/Stick: move \(push far to run\)[^']+/)[0];
  const keyHelp = 'WASD/Arrows move · Shift or double-tap: run · J/Z attack · K/Space jump · L/Q fireball · F balefire (full saidin) · R call Loial';
  assert.ok(hud.includes(touchHelp));
  assert.ok(hud.includes(keyHelp));
  assert.ok(game.includes(touchHelp));
  assert.ok(game.includes(keyHelp));
  assert.ok(game.includes('PRESS ENTER OR ATTACK'));
  assert.ok(game.includes('TAP TO START'));
  assert.ok(game.includes('P / Esc / Enter / Start or II to resume'));
  assert.ok(game.includes('PRESS ATTACK TO CONTINUE'));
  assert.ok(game.includes('TAP KICK TO CONTINUE'));
  assert.ok(game.includes('PRESS ATTACK TO PLAY AGAIN'));
  assert.ok(game.includes('TAP KICK TO PLAY AGAIN'));
  assert.equal(game.includes('Dodge roll'), false);
  assert.equal(game.includes('Press R to restart'), false);
});
