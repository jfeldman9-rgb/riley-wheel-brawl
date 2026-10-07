// Stage 3 intro freeze hardening: frame guard, story watchdog, load timeout, perf gate, plate painter budget.
import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { watchdogFor, cutsceneWatchdog, installFrameGuard, installCutsceneWatchdog, installLoadTimeout, WATCHDOG_PAD, WATCHDOG_FALLBACK, STUCK_FRAMES, LOAD_TIMEOUT_MS } from '../src/guard.js';
import { Cutscene, holdFor, GUARD } from '../src/twix.js';
import { perfReportEnabled } from '../src/debug-flag.js';
import { ensureStage3Plates, STAGE3_PLATE_W, STAGE3_PLATE_H, PAINT_BUDGET_MS } from '../src/stage3-art.js';

globalThis.Phaser = globalThis.Phaser || { Scene: class {} };
const { STORY3_SCRIPT } = await import('../src/stage3.js');

const stageWith = (lines, reasons = ['cutscene']) => {
  const seen = [];
  const cs = new Cutscene(lines, { onLine: line => seen.push(line.id) });
  cs.begin();
  return { stage: { cutscene: cs, pauseReasons: new Set(reasons) }, cs, seen };
};

test('watchdog allows each line its hold plus 1.5 s, or 4 s when no hold is known', () => {
  for (const line of STORY3_SCRIPT) assert.equal(watchdogFor(line), holdFor(line) + WATCHDOG_PAD, line.id);
  assert.ok(watchdogFor(STORY3_SCRIPT[1]) > STORY3_SCRIPT[1].voice + WATCHDOG_PAD);
  assert.equal(watchdogFor(null), WATCHDOG_FALLBACK);
  assert.equal(watchdogFor({}), WATCHDOG_FALLBACK);
});

test('a stalled story clock still walks every Stage 3 line to the end on wall-clock time', () => {
  // No HUD ticks and no voice playback: only the watchdog moves the story.
  const { stage, cs, seen } = stageWith(STORY3_SCRIPT);
  let ended = null; cs.onEnd = how => { ended = how; stage.cutscene = null; };
  const w = {};
  let now = 0;
  assert.equal(cutsceneWatchdog(stage, now, w), false);
  const first = watchdogFor(STORY3_SCRIPT[0]) * 1000;
  assert.equal(cutsceneWatchdog(stage, now + first - 1, w), false, 'never cuts a line short');
  for (let i = 0; i < 400 && ended === null; i++) { now += 250; cutsceneWatchdog(stage, now, w); }
  assert.equal(ended, 'end');
  assert.deepEqual(seen, STORY3_SCRIPT.map(l => l.id));
  const total = STORY3_SCRIPT.reduce((n, l) => n + watchdogFor(l), 0) * 1000;
  assert.ok(now <= total + 250 * STORY3_SCRIPT.length + 250, `${now} <= ${total}`);
});

test('watchdog waits out other pauses and restarts its count on every new line', () => {
  const { stage, cs } = stageWith(STORY3_SCRIPT, ['cutscene', 'manual']);
  const w = {}, hold = watchdogFor(cs.line) * 1000;
  cutsceneWatchdog(stage, 0, w);
  assert.equal(cutsceneWatchdog(stage, hold * 3, w), false, 'manual pause holds the story');
  stage.pauseReasons.delete('manual');
  assert.equal(cutsceneWatchdog(stage, hold * 3 + hold - 1, w), false, 'pause time does not count');
  assert.equal(cutsceneWatchdog(stage, hold * 4 + 1, w), true);
  assert.equal(cs.i, 1);
  cs.update(GUARD + 0.01); cs.press('attack');
  assert.equal(cs.i, 2, 'a tap still advances');
  assert.equal(cutsceneWatchdog(stage, hold * 4 + 2, w), false, 'count restarts on the tapped line');
  assert.equal(cutsceneWatchdog({ cutscene: null }, 0, w), false);
});

test('tap or attack advances a story line and Start skips the scene, with or without audio', () => {
  const { cs, seen } = stageWith(STORY3_SCRIPT);
  let how = null; cs.onEnd = h => { how = h; };
  cs.press('attack');
  assert.equal(cs.i, 0, 'the 0.3 s guard stops double taps');
  cs.update(GUARD); cs.press('attack');
  assert.equal(cs.i, 1);
  cs.update(GUARD); cs.press('jump');
  assert.equal(cs.i, 2);
  cs.press('start');
  assert.equal(how, 'skip');
  assert.deepEqual(seen, STORY3_SCRIPT.slice(0, 3).map(l => l.id));
  const timed = stageWith(STORY3_SCRIPT).cs;
  for (let i = 0; i < 2000 && !timed.done; i++) timed.update(0.05);
  assert.equal(timed.how, 'end', 'the HUD clock alone finishes the story');
});

function fakeGame(steps) {
  const scenes = steps.map(([key, step]) => ({ sys: { settings: { key }, step } }));
  const loop = { running: false, start(cb) { this.callback = cb; this.running = true; } };
  return { loop, scene: { scenes, getScene: () => null }, events: { once() {} } };
}

function fakeRoot() {
  const els = {};
  for (const id of ['startup-error', 'startup-title', 'startup-description', 'startup-code', 'startup-retry']) els[id] = { hidden: true, textContent: '', addEventListener(t, fn) { this.click = fn; } };
  const errors = [];
  let reloaded = 0;
  return { els, errors, reloaded: () => reloaded, root: { document: { getElementById: id => els[id] || null }, console: { error: (...a) => errors.push(a) }, location: { reload: () => reloaded++ } } };
}

test('a scene that throws no longer stops the frame loop or the HUD', () => {
  let hudSteps = 0, throws = true;
  const game = fakeGame([['hud', () => { hudSteps++; }], ['stage1', () => { if (throws) throw new TypeError('boom'); }]]);
  const { root, errors, els } = fakeRoot();
  const st = installFrameGuard(game, root);
  game.loop.start(function step(t, d) { for (const s of game.scene.scenes) s.sys.step(t, d); });
  for (let i = 0; i < 10; i++) assert.doesNotThrow(() => game.loop.callback(i * 16, 16));
  assert.equal(hudSteps, 10, 'the HUD keeps stepping (captions fade, story ticks)');
  assert.equal(st.errors, 10);
  assert.equal(errors.length, 1, 'one console line per distinct error');
  assert.match(st.last, /stage1: boom/);
  assert.equal(els['startup-error'].hidden, true, 'a short burst does not interrupt play');
  throws = false;
  game.loop.callback(200, 16);
  assert.equal(st.streak, 0, 'a clean frame resets the streak');
});

test('a loop-level throw is caught and a stuck stage gets a Reload card', () => {
  const game = fakeGame([]);
  const r = fakeRoot();
  const st = installFrameGuard(game, r.root);
  game.loop.start(() => { throw new RangeError('render'); });
  for (let i = 0; i < STUCK_FRAMES - 1; i++) game.loop.callback(i, 16);
  assert.equal(r.els['startup-error'].hidden, true);
  game.loop.callback(STUCK_FRAMES, 16);
  assert.equal(st.shown, true);
  assert.equal(r.els['startup-error'].hidden, false);
  assert.match(r.els['startup-code'].textContent, /FRAME_ERROR RangeError/);
  r.els['startup-retry'].click();
  assert.equal(r.reloaded(), 1);
  assert.equal(installFrameGuard(null).errors, 0);
});

test('the watchdog interval drives a stalled story and stops with the game', () => {
  let tick = null, cleared = null, destroy = null, now = 0;
  const { stage, cs } = stageWith(STORY3_SCRIPT);
  const game = { scene: { getScene: key => key === 'stage1' ? stage : null }, events: { once: (e, fn) => { if (e === 'destroy') destroy = fn; } } };
  const root = { setInterval: (fn, ms) => { tick = fn; assert.equal(ms, 250); return 7; }, clearInterval: id => { cleared = id; }, performance: { now: () => now }, document: { hidden: false } };
  installCutsceneWatchdog(game, root);
  tick();
  now = watchdogFor(cs.line) * 1000 + 1; tick();
  assert.equal(cs.i, 1);
  root.document.hidden = true; now += 60000; tick();
  root.document.hidden = false; now += 10; tick();
  assert.equal(cs.i, 1, 'a hidden tab does not burn through the story');
  destroy();
  assert.equal(cleared, 7);
});

test('loader requests time out instead of waiting forever', () => {
  let ready = null;
  const xhr = { timeout: 0 };
  const game = { config: { loaderTimeout: 0 }, scene: { scenes: [{ load: { xhr } }, {}] }, events: { once: (e, fn) => { if (e === 'ready') ready = fn; } } };
  installLoadTimeout(game);
  assert.equal(game.config.loaderTimeout, LOAD_TIMEOUT_MS);
  ready();
  assert.equal(xhr.timeout, LOAD_TIMEOUT_MS);
});

test('perf overlay shows only with ?debug or ?perf (no other flag, no stored state)', () => {
  const hud = readFileSync(new URL('../src/hud.js', import.meta.url), 'utf8');
  assert.match(hud, /this\.showPerf = perfOn\(\);/);
  assert.match(hud, /import \{ perfReportEnabled as perfOn \} from '\.\/debug-flag\.js';/);
  assert.doesNotMatch(hud, /get\('hud'\) !== '0'/);
  for (const dir of ['../src/']) for (const f of ['hud.js', 'perf.js', 'perf-panel.js', 'debug-flag.js', 'main.js', 'guard.js']) {
    assert.doesNotMatch(readFileSync(new URL(dir + f, import.meta.url), 'utf8'), /localStorage|sessionStorage/, f);
  }
  assert.equal(perfReportEnabled(''), false);
  assert.equal(perfReportEnabled('?hud=1'), false);
  assert.equal(perfReportEnabled('?stage=3&q=4'), false);
  assert.equal(perfReportEnabled('?debug'), true);
  assert.equal(perfReportEnabled('?perf=1'), true);
});

test('a slow plate painter falls back to gradients, frees old GPU copies and never throws', () => {
  const prior = globalThis.document;
  const calls = [];
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => recCtx(calls) }) };
  try {
    const deleted = [];
    const scene = plateScene(STAGE3_PLATE_W, STAGE3_PLATE_H, { createCanvasTexture: c => ({ c }), deleteTexture: t => deleted.push(t) });
    let t = 0;
    const slow = () => (t += PAINT_BUDGET_MS);   // every check is past budget after the first plate
    assert.equal(ensureStage3Plates(scene, slow), true);
    assert.equal(scene.stage3Painted, true);
    assert.equal(deleted.length, 7, 'each labelled card texture is released');
    for (const k of ['far3_day', 'mid3a', 'floor3c']) assert.equal(scene.textures.get(k).source[0].image.width, STAGE3_PLATE_W, k);
    assert.ok(calls.filter(c => c === 'fillRect').length >= 7);
    const broken = plateScene(STAGE3_PLATE_W, STAGE3_PLATE_H, { createCanvasTexture: () => { throw new Error('gl'); } });
    assert.doesNotThrow(() => ensureStage3Plates(broken));
    const full = plateScene(2172, 724, { createCanvasTexture: () => assert.fail('real plates are never repainted') });
    assert.equal(ensureStage3Plates(full), false);
  } finally {
    globalThis.document = prior;
  }
});

function plateScene(w, h, renderer) {
  const textures = new Map();
  for (const key of ['far3_day', 'far3_night', 'mid3a', 'mid3b', 'floor3a', 'floor3b', 'floor3c']) {
    const image = { width: w, height: h };
    textures.set(key, { getSourceImage: () => image, source: [{ image, width: w, height: h, flipY: false, glTexture: { old: key } }] });
  }
  return { textures: { get: key => textures.get(key) }, sys: { renderer } };
}

function recCtx(calls) {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(_t, p) {
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => grad;
      return () => { calls.push(p); };
    },
    set() { return true; },
  });
}
