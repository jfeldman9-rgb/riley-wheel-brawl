// Stage 3 flow (T10 part 1; T11 appends part 2): title stage select behind s3=1
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage1Simulation, withSeed } from './helpers/stage1-simulation.mjs';
const { Stage1 } = await import('../src/stage1.js');
const { HUD, STAGE_NAMES } = await import('../src/hud.js');
const { STAGES } = await import('../src/stages.js');
const { q } = await import('../src/config.js');

function titleHUD() {
  const hud = Object.create(HUD.prototype), pressed = [], handlers = new Map(), objects = [];
  const visual = (x = 0, y = 0, text = '') => {
    const v = { x, y, text, width: 40, height: 48, handlers: new Map(), active: true,
      setOrigin(x, y = x) { this.displayOriginX = this.width * x; this.displayOriginY = this.height * y; return this; },
      setInteractive(config) { this.input = config; return this; },
      setAlpha(alpha) { this.alpha = alpha; return this; }, setText(text) { this.text = text; return this; },
      on(name, fn) { this.handlers.set(name, fn); return this; }, fillStyle() {}, fillRect() {},
    }; objects.push(v); return v;
  };
  hud.add = { graphics: visual, text: visual }; hud.card = { removeAll() {}, add() {} }; hud.tweens = { add() {} };
  hud.game = { inp: { isTouch: true, press: a => pressed.push(a) } }; hud.input = { on: (name, fn) => handlers.set(name, fn) };
  hud.stage = { stageNo: 1, titleSel: 1, started: false, ended: false, hud,
    selectStage(dir) { Stage1.prototype.selectStage.call(this, dir); } };
  class Rectangle {
    constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); }
    static Contains(a, x, y) { return x >= a.x && y >= a.y && x <= a.x + a.width && y <= a.y + a.height; }
  }
  const before = Phaser.Geom; Phaser.Geom = { ...before, Rectangle };
  try { hud.titleCard(); } finally { Phaser.Geom = before; }
  // Phaser converts from pointer world coordinates to local top-left coordinates before applying the hit area.
  const tap = (x, y) => {
    const over = objects.filter(o => o.input && o.input.hitAreaCallback(o.input.hitArea, x - o.x + o.displayOriginX, y - o.y + o.displayOriginY));
    const pointer = { wasTouch: true, x, y };
    for (const o of over) o.handlers.get('pointerdown')?.(pointer);
    handlers.get('pointerdown')(pointer, over);
    return over;
  };
  return { hud, pressed, tap };
}

test('flag on: title select clamps at 3 and reports [2, 3, 2] for right, right, right, left', () => withSeed(1, () => {
  q.set('s3', '1');
  try {
    const h = stage1Simulation({ mode: '' }), s = h.s;
    try {
      s.selectStage(1);
      assert.equal(s.titleSel, 2);
      s.selectStage(1);
      assert.equal(s.titleSel, 3);
      s.selectStage(1);
      assert.equal(s.titleSel, 3);
      s.selectStage(-1);
      assert.equal(s.titleSel, 2);
      assert.deepEqual(h.observations.hud.filter(e => e.method === 'titleSelect').map(e => e.args[0]), [2, 3, 2]);
      assert.equal(s.music.state, 'title');
    } finally {
      h.destroy();
    }
  } finally {
    q.delete('s3');
  }
}));

test('flag off: title select still clamps at 2 and never names Stage 3', () => withSeed(1, () => {
  assert.equal(q.get('s3'), null);
  const h = stage1Simulation({ mode: '' }), s = h.s;
  try {
    s.selectStage(-1);
    assert.equal(s.titleSel || s.stageNo, 1, 'already on Stage 1');
    s.selectStage(1);
    assert.equal(s.titleSel, 2);
    s.selectStage(1);
    assert.equal(s.titleSel, 2);
    s.selectStage(-1);
    assert.equal(s.titleSel, 1);
    s.selectStage(1);
    assert.equal(s.titleSel, 2);
    const selectCalls = h.observations.hud.filter(e => e.method === 'titleSelect').map(e => e.args[0]);
    assert.deepEqual(selectCalls, [2, 1, 2]);
    assert.ok(!selectCalls.includes(3), 'no titleSelect(3) call');
  } finally {
    h.destroy();
  }

  const { hud } = titleHUD();
  hud.stage.selectStage(1);
  assert.equal(hud.stage.titleSel, 2);
  assert.equal(hud.titleArrowR.alpha, 0.25);
  assert.equal(hud.titleStageT.text, STAGE_NAMES[2]);
  assert.notEqual(hud.titleStageT.text, STAGE_NAMES[3]);
  hud.stage.selectStage(1);
  assert.equal(hud.stage.titleSel, 2);
  assert.equal(hud.titleArrowR.alpha, 0.25);
  assert.notEqual(hud.titleStageT.text, STAGE_NAMES[3]);
}));

test('flag on: the 120×100 arrow targets select STAGE 3 · CAEMLYN and dim the right arrow at 3', () => {
  q.set('s3', '1');
  try {
    const { hud, pressed, tap } = titleHUD();
    const arrow = hud.titleArrowR;
    assert.equal(arrow.input.hitArea.width, 120);
    assert.equal(arrow.input.hitArea.height, 100);

    tap(arrow.x, arrow.y);
    assert.equal(hud.stage.titleSel, 2);
    assert.equal(hud.titleArrowR.alpha, 1);

    for (const [dx, dy] of [[-59, -49], [59, 49], [-59, 49], [59, -49], [0, 0]]) {
      assert.deepEqual(tap(arrow.x + dx, arrow.y + dy), [arrow], 'expanded touch target catches the tap');
      assert.equal(hud.stage.titleSel, 3);
      assert.equal(hud.titleStageT.text, STAGE_NAMES[3]);
      assert.equal(hud.titleArrowR.alpha, 0.25);
      assert.equal(hud.titleArrowL.alpha, 1);
      assert.equal(pressed.length, 0, 'stage selection never emits Start, even on repeated/clamped taps');
    }
  } finally {
    q.delete('s3');
  }
});

test('starting with Stage 3 selected restarts into { stage: 3, autostart: true } and loads Caemlyn', () => withSeed(1, () => {
  q.set('s3', '1');
  try {
    const h = stage1Simulation({ mode: '' }), s = h.s;
    try {
      s.selectStage(1);
      s.selectStage(1);
      assert.equal(s.titleSel, 3);
      h.step();
      assert.deepEqual(h.observations.restartData, [{ stage: 3, autostart: true }]);
      assert.equal(STAGES[3].loading, 'Loading Caemlyn…');
    } finally {
      h.destroy();
    }
  } finally {
    q.delete('s3');
  }
}));

// ---- part 2: story beat and campaign flow (T11) ----
const { execFileSync } = await import('node:child_process');
const { readFileSync } = await import('node:fs');
const { STORY3_SCRIPT, STORY3_PANELS, STAGE3_VOICES } = await import('../src/stage3.js');
const { clearPrompt } = await import('../src/hud.js');
const { FADES } = await import('../src/music.js');
const { stage3Simulation, patch } = await import('./helpers/stage3-harness.mjs');
const { EXTRA_VOICE } = await import('../src/audio.js');

const probe3 = search => JSON.parse(execFileSync(process.execPath, [new URL('./helpers/stage3-query-probe.mjs', import.meta.url).pathname], { env: { ...process.env, RWB_SEARCH: search }, encoding: 'utf8' }));

test('?stage=3&s3=1 queues only Caemlyn art, releases Stage 2\'s own art and builds four zones with the boss last', () => {
  const r = probe3('?stage=3&s3=1');
  for (const k of ['far3_day', 'mid3a', 'story3_panel_1', 'plates3', 'lights3', 'cutthroat.A']) {
    assert.ok(r.queued.includes(k), `queued includes ${k}`);
  }
  for (const k of ['far2', 'mid2a', 'story_panel_1', 'byar-0']) {
    assert.ok(r.removed.includes(k), `removed includes ${k}`);
    assert.ok(!r.queued.includes(k), `queued does not include ${k}`);
  }
  assert.ok(!r.removed.some(k => /^(riley|hound|loial)-/.test(k)), 'shared characters not released');
  assert.equal(r.zones, 4);
  assert.equal(r.boss, true);
  assert.equal(r.stageNo, 3);

  const r2 = probe3('?stage=3');
  assert.equal(r2.stageNo, 1);
});

test('the Stage 3 story beat plays six lines on three panels; Attack advances and Start skips', () => withSeed(1, () => {
  q.set('s3', '1');
  q.delete('story');
  try {
    const h = stage1Simulation({ stage: 3 }), s = h.s;
    patch(s);
    try {
      while (!s.started) h.step();
      assert.ok(s.cutscene, 'cutscene active');
      const shown = h.observations.hud.filter(e => e.method === 'showCutscene').at(-1);
      assert.ok(shown, 'showCutscene was called');
      assert.equal(shown.args[1], STORY3_PANELS);
      assert.equal(s.music.state, 'cutscene');
      assert.equal(s.paused, true);

      // Line 0 is started immediately by cs.begin()
      const line0 = h.observations.hud.filter(e => e.method === 'cutsceneLine').at(-1);
      assert.equal(line0.args[0].id, STORY3_SCRIPT[0].id);

      // Pressing attack advances cutsceneLine ids in STORY3_SCRIPT order
      s.cutscene.t = 1;
      s.onPress('attack');
      const line1 = h.observations.hud.filter(e => e.method === 'cutsceneLine').at(-1);
      assert.equal(line1.args[0].id, STORY3_SCRIPT[1].id);

      s.cutscene.t = 1;
      s.onPress('attack');
      const line2 = h.observations.hud.filter(e => e.method === 'cutsceneLine').at(-1);
      assert.equal(line2.args[0].id, STORY3_SCRIPT[2].id);

      // Pressing start skips
      s.onPress('start');
      assert.equal(s.cutscene, null);
      assert.equal(s.storyResult, 'skip');
      assert.equal(s.music.state, 'stage');
    } finally {
      h.destroy();
    }
  } finally {
    q.delete('s3');
    q.delete('story');
  }
}));

test('story=0 skips the Stage 3 story beat entirely', () => withSeed(1, () => {
  q.set('s3', '1');
  q.set('story', '0');
  try {
    const h = stage1Simulation({ stage: 3 }), s = h.s;
    patch(s);
    try {
      let kitStarts = 0;
      const origKitStart = s.kit.start.bind(s.kit);
      s.kit.start = () => { kitStarts++; origKitStart(); };
      while (!s.started) h.step();
      assert.equal(h.observations.hud.filter(e => e.method === 'showCutscene').length, 0);
      assert.equal(s.music.state, 'stage');
      assert.equal(s.cutscene, null);
      assert.equal(kitStarts, 1);
    } finally {
      h.destroy();
    }
  } finally {
    q.delete('s3');
    q.delete('story');
  }
}));

test('flag on, clearing Stage 2 restarts into Stage 3; flag off it still returns to Stage 1', () => withSeed(1, () => {
  // Flag on:
  q.set('s3', '1');
  q.set('story', '0');
  try {
    const h = stage1Simulation({ stage: 2 }), s = h.s;
    try {
      while (!s.started) h.step();
      s.ended = s.clearShown = true;
      const promptOn = clearPrompt(s.stageNo, false, s.stageDef.next(q)?.stage);
      assert.ok(promptOn.includes('CONTINUE TO STAGE 3'), `promptOn: ${promptOn}`);
      s.onPress('attack');
      assert.deepEqual(h.observations.restartData.at(-1), { stage: 3, fromStage2: true, autostart: true });
    } finally {
      h.destroy();
    }
  } finally {
    q.delete('s3');
    q.delete('story');
  }

  // Flag off:
  q.delete('s3');
  q.set('story', '0');
  try {
    const h = stage1Simulation({ stage: 2 }), s = h.s;
    try {
      while (!s.started) h.step();
      s.ended = s.clearShown = true;
      const promptOff = clearPrompt(s.stageNo, false, s.stageDef.next(q)?.stage);
      assert.ok(promptOff.includes('RETURN TO THE TITLE'), `promptOff: ${promptOff}`);
      s.onPress('attack');
      assert.deepEqual(h.observations.restartData.at(-1), { stage: 1 });
    } finally {
      h.destroy();
    }
  } finally {
    q.delete('story');
  }
}));

test('clearing Stage 3 returns to the title with { stage: 1 }', () => withSeed(1, () => {
  const h = stage3Simulation(), s = h.s;
  try {
    s.ended = s.clearShown = true;
    const prompt = clearPrompt(s.stageNo, false, s.stageDef.next(q)?.stage);
    assert.ok(prompt.includes('RETURN TO THE TITLE'), `prompt: ${prompt}`);
    s.onPress('attack');
    assert.deepEqual(h.observations.restartData.at(-1), { stage: 1 });
  } finally {
    h.destroy();
  }
}));

test('continuing after a game over in phase 3 resumes boss3 without restarting it', () => withSeed(1, () => {
  const h = stage3Simulation(), s = h.s;
  try {
    s.startBoss();
    for (let i = 0; i < 60 && !s.boss; i++) h.step();
    assert.ok(s.boss, 'boss spawned');
    assert.equal(s.boss.phase, 1);
    s.boss.phase = 3;
    s.gameOver = true;
    s.music.set('gameover');
    s.continueGame();
    assert.deepEqual(s.music.log.at(-1), { from: 'gameover', to: 'boss', track: 'boss3', fade: FADES.resume, restart: false });
  } finally {
    h.destroy();
  }
}));

test('score and lives reset between Stage 2 and Stage 3 (Q3 carry-over is off)', () => withSeed(1, () => {
  const nextData = STAGES[2].next(new URLSearchParams('s3=1'));
  assert.equal(nextData.score, undefined);
  assert.equal(nextData.lives, undefined);

  const h = stage3Simulation(), s = h.s;
  try {
    assert.equal(s.riley.score, 0);
    assert.equal(s.riley.lives, 3);
  } finally {
    h.destroy();
  }
}));

test('STORY3_SCRIPT is six Stage 3 voice lines with captions, panels 0–2 and recorded clip lengths', () => {
  const manifest = JSON.parse(readFileSync(new URL('../assets/audio/stage3-voice-manifest.json', import.meta.url), 'utf8'));
  const expectedIds = ['st3_story_01', 'st3_story_02', 'st3_story_03', 'st3_story_04', 'st3_story_05', 'st3_story_06'];
  assert.equal(STORY3_SCRIPT.length, 6);
  assert.deepEqual(STORY3_SCRIPT.map(e => e.id), expectedIds);
  for (const id of expectedIds) {
    assert.ok(STAGE3_VOICES.includes(id), `${id} must be in STAGE3_VOICES`);
  }
  for (const entry of STORY3_SCRIPT) {
    assert.equal(entry.who, EXTRA_VOICE[entry.id][0], `who for ${entry.id}`);
    assert.equal(entry.text, EXTRA_VOICE[entry.id][1], `text for ${entry.id}`);
  }
  assert.deepEqual(STORY3_SCRIPT.map(e => e.panel), [0, 1, 1, 1, 1, 2]);
  for (const entry of STORY3_SCRIPT) {
    const mf = manifest.lines.find(l => l.id === entry.id);
    assert.ok(mf, `manifest line for ${entry.id}`);
    assert.ok(Math.abs(entry.voice - mf.duration_s) <= 0.01, `duration match for ${entry.id}: ${entry.voice} vs ${mf.duration_s}`);
  }
});

