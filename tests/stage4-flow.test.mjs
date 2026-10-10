import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers/stage4-harness.mjs';

const { STORY4_SCRIPT } = await import('../src/stage4.js');
const { STAGE_NAMES, clearPrompt, bossLabel, placeholderArt } = await import('../src/hud.js');
const { croonArc, kissHint } = await import('../src/stage4-hud.js');

test('the walk to Shadar Logoth is six lines and the clear prompt continues only when stage 4 is next', () => {
  assert.equal(STORY4_SCRIPT.length, 6);
  assert.equal(STORY4_SCRIPT[0].who, 'NARRATOR');
  assert.match(STORY4_SCRIPT[2].text, /Aridhol/);
  assert.equal(STORY4_SCRIPT[4].who, 'MORDETH');
  assert.match(STORY4_SCRIPT[5].text, /walked in/);
  assert.match(STAGE_NAMES[4], /SHADAR LOGOTH/);
  assert.match(clearPrompt(3, false, 4), /CONTINUE TO STAGE 4/);
  assert.match(clearPrompt(3, false, 1), /RETURN TO THE TITLE/);
  assert.match(clearPrompt(4, false, 1), /RETURN TO THE TITLE/);
  assert.match(clearPrompt(4, false, 5), /CONTINUE TO STAGE 5/);
  assert.match(clearPrompt(5, false, 1), /RETURN TO THE TITLE/);
  assert.match(clearPrompt(1, false, 2), /CONTINUE TO STAGE 2/);
});

test('the boss bar, croon arc and kiss hint read the Draghkar fight', () => {
  const s = {
    stageNo: 4,
    stageDef: { boss: { name: 'THE DRAGHKAR', portrait: 'draghkarPortrait' } },
    boss: { alive: true, state: 'croon', st: 1.25 },
    riley: { state: 'grabbed', x: 100, y: 630, grabbedBy: { type: 'draghkar', mashN: 4, mashNeed: 8 } },
  };
  assert.equal(bossLabel(s).name, 'THE DRAGHKAR');
  assert.equal(bossLabel({ stageNo: 3, stageDef: { boss: { name: 'THE MYRDDRAAL', portrait: 'fadePortrait' } } }).name, 'THE MYRDDRAAL');
  assert.ok(Math.abs(croonArc(s).fill - 0.5) < 1e-6);
  assert.equal(kissHint(s), 'MASH ATTACK');
  // Stage 4 sets ph4 only under ?debug while code-drawn art is on screen, so the owner never sees the tag
  assert.equal(placeholderArt(s), false);
  assert.equal(placeholderArt({ ...s, ph4: true }), true);
  assert.equal(croonArc({ stageNo: 3, boss: s.boss }), null);
});
