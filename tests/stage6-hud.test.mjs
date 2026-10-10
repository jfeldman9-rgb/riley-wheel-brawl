import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRand } from '../src/rand-call.js';
import { installStage6Hud, bindRandLabel, syncRandReady } from '../src/stage6-hud.js';
import { HUD } from '../src/hud.js';

test('the call button keeps its label', () => {
  assert.match(readFileSync('index.html', 'utf8'), /id="tbL">CALL</);
});

test('the Rand slot reports ready, counting, and spent without touching the button text', async () => {
  await installStage6Hud();
  const button = { className: 'tb', text: 'CALL', classList: { toggle(name, on) { this.name = name; this.on = on; } } };
  const prevDoc = globalThis.document;
  globalThis.document = { getElementById: id => id === 'tbL' ? button : null };
  const hud = Object.create(HUD.prototype);
  let sets = 0, tex = '';
  hud.loialT = { text: '', setText(t) { sets++; this.text = t; return this; }, setColor(c) { hud.col = c; return this; } };
  hud.loialPic = { texture: { key: 'loialPortrait' }, setTexture(k) { tex = k; return this; }, setDisplaySize() { return this; }, setAlpha() { return this; } };
  hud.pauseLabel = { setVisible() {} };
  hud.g = { clear() {} };
  hud.bar = () => {};
  hud.baleT = { setAlpha() {} };
  hud.updatePowerSlots = () => {};
  hud.lives = { setText() {} };
  hud.score = { setText() {} };
  hud.enemyName = { setAlpha() {}, setText() { return this; } };
  const rand = createRand();
  hud.stage = { stageNo: 6, loial: null, riley: { hp: 100, maxHp: 100, saidin: 0, lives: 3, score: 0, loialReady: false }, kit: { rand }, textures: { exists: k => k === 'randPortrait' || k === 'belalPortrait' } };
  bindRandLabel(hud);
  try {
    syncRandReady(hud.stage);
    hud.update(0, 16);
    assert.equal(hud.loialT.text, 'RAND READY');
    assert.equal(hud.stage.riley.loialReady, true);
    assert.equal(button.text, 'CALL');
    assert.equal(button.classList.on, false);
    assert.equal(tex, 'randPortrait');
    const once = sets;
    hud.update(32, 16);
    assert.equal(sets, once);
    rand.charges = 0; rand.kos = 4; rand.since = 10;
    syncRandReady(hud.stage);
    hud.update(48, 16);
    assert.equal(hud.loialT.text, 'RAND 4/10');
    assert.equal(sets, once + 1);
    hud.update(64, 16);
    assert.equal(sets, once + 1);
    rand.calls = 3; rand.charges = 0;
    syncRandReady(hud.stage);
    hud.update(80, 16);
    assert.equal(hud.loialT.text, 'RAND SPENT');
    assert.equal(hud.stage.riley.loialReady, false);
    assert.equal(button.classList.on, true);
    assert.equal(button.text, 'CALL');
    hud._randUnbind();
    assert.equal(tex, 'loialPortrait');
    assert.equal(Object.prototype.hasOwnProperty.call(hud, 'updateLoialLabel'), false);
    hud.bossName = { text: 'TROLLOC CHIEFTAIN', setText(t) { this.text = t; return this; } };
    hud.bossPic = { setTexture() { return this; }, setDisplaySize() { return this; } };
    hud.stage.boss = { alive: true };
    hud.stage.stageDef = { boss: { name: "BE'LAL", portrait: 'belalPortrait' } };
    hud.stage.textures.exists = k => k === 'belalPortrait';
    hud.update(0, 16);
    assert.equal(hud.bossName.text, "BE'LAL");
  } finally { globalThis.document = prevDoc; }
});
