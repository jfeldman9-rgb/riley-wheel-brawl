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
