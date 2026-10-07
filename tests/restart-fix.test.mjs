import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tierScale, createWindow, installGovernor, MAX_SAMPLE_MS } from '../src/quality-governor.js';
import { resumeUrl, resumeGame, showStuck, installResumeCleanup } from '../src/recovery.js';
import { installGraphicsNotice } from '../src/graphics-notice.js';
import { audit } from '../tools/audit-stage1.mjs';

function rig(qs, rs0 = 2) {
  const st = { runId: 1, started: true, fx: {}, snowFront: {}, lit: true, setBloom() {}, setBackdropLit(v) { this.lit = v; }, cameras: { main: { setZoom() {} } } };
  const sizes = [];
  const game = { rs: rs0, scene: { getScene: k => k === 'stage1' ? st : null }, scale: { resize: (w, h) => sizes.push([w, h]) },
    renderer: { gl: { getExtension: () => null, getParameter: () => 'Apple GPU' }, drawingContextPool: { clear() {} } } };
  const meter = { lastSampleMs: null };
  const gov = installGovernor(game, { q: new URLSearchParams(qs), rs0, vw: 1280, vh: 720, meter, log() {} });
  const feed = (ms, frames) => { for (let i = 0; i < frames; i++) { meter.lastSampleMs = ms; game.governor(1 / 60); } };
  const restart = () => { st.runId++; st.fx = {}; meter.lastSampleMs = null; game.governor(1 / 60); };
  return { st, game, gov, meter, sizes, feed, restart };
}

test('each tier has one absolute render scale from the device scale', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(l => tierScale(l, 2)), [2, 2, 2, 1.5, 1.5, 1]);
  assert.deepEqual([0, 3, 5].map(l => tierScale(l, 1.5)), [1.5, 1, 1]);
  assert.deepEqual([0, 3, 5].map(l => tierScale(l, 1)), [1, 1, 1]);
});

test('restarts reapply the tier without ratcheting the render scale down (was 2 -> 1.5 -> 1)', () => {
  const r = rig('?q=3');
  r.game.governor(1 / 60);
  assert.equal(r.gov.level, 3); assert.equal(r.game.rs, 1.5);
  for (let i = 0; i < 4; i++) { r.restart(); assert.equal(r.gov.level, 3); assert.equal(r.game.rs, 1.5, `restart ${i + 1}`); assert.equal(r.st.fx.quality, 3); }
  assert.deepEqual(r.sizes, [[1920, 1080]], 'the canvas is resized once, not on every restart');
  const sw = rig('?q=5');
  sw.game.governor(1 / 60); sw.restart(); sw.restart();
  assert.equal(sw.game.rs, 1); assert.equal(sw.st.lit, false);
});

test('a single long hitch after a restart does not drop a tier; sustained slow frames still do', () => {
  const r = rig('');
  r.game.governor(1 / 60);
  for (let run = 0; run < 3; run++) {
    r.restart();
    r.feed(2500, 1);          // first-use texture upload / GC stall
    r.feed(16.7, 240);         // then four seconds of normal frames
    assert.equal(r.gov.level, 0, `run ${run}`); assert.equal(r.game.rs, 2);
  }
  r.feed(40, 3 * Math.ceil(2000 / 40));  // six seconds at 25 fps
  assert.equal(r.gov.level, 3); assert.equal(r.game.rs, 1.5);
  r.restart(); r.feed(16.7, 240);
  assert.equal(r.gov.level, 3); assert.equal(r.game.rs, 1.5, 'the restart keeps the earned tier and its scale');
  const w = createWindow();
  assert.equal(w.add(5000), null, 'one frame never closes a window alone');
  assert.ok(MAX_SAMPLE_MS < 2000);
});

test('?q=fixed and software WebGL keep their existing behaviour', () => {
  const f = rig('?q=fixed'); f.game.governor(1 / 60); f.feed(60, 200);
  assert.equal(f.gov.level, 0); assert.equal(f.game.rs, 2);
  const s = rig(''); s.game.renderer.gl.getParameter = () => 'SwiftShader';
  s.game.governor(1 / 60);
  assert.equal(s.gov.level, 4); assert.equal(s.game.rs, 1.5); assert.equal(s.meter.software, true);
  s.restart(); assert.equal(s.game.rs, 1.5);
});

test('resumeUrl keeps every parameter and points at the stage', () => {
  const u = new URL(resumeUrl('https://x.test/rwb/?god=1&stage=1&q=3#a', 4));
  assert.equal(u.pathname, '/rwb/');
  assert.equal(u.searchParams.get('stage'), '4'); assert.equal(u.searchParams.get('autostart'), '1'); assert.equal(u.searchParams.get('resume'), '1');
  assert.equal(u.searchParams.get('god'), '1'); assert.equal(u.searchParams.get('q'), '3');
});

function loc(href = 'https://x.test/?debug=1') {
  const calls = [];
  return { calls, href, replace: url => calls.push(['replace', url]), reload: () => calls.push(['reload']) };
}

test('the reload card resumes the running stage, and reloads plainly from the title', () => {
  const l = loc();
  const playing = { scene: { getScene: () => ({ started: true, stageNo: 3 }) } };
  assert.equal(resumeGame({ location: l }, playing), 'resume');
  assert.equal(new URL(l.calls[0][1]).searchParams.get('stage'), '3');
  const t = loc();
  assert.equal(resumeGame({ location: t }, { scene: { getScene: () => ({ started: false, stageNo: 2 }) } }), 'reload');
  assert.deepEqual(t.calls, [['reload']]);
  let reloads = 0;
  assert.equal(resumeGame({ location: { reload: () => reloads++ } }, playing), 'reload', 'no URL support: plain reload');
  assert.equal(reloads, 1);
});

test('showStuck says Reload picks up at this stage and its button resumes', () => {
  const els = {};
  for (const id of ['startup-error', 'startup-title', 'startup-description', 'startup-code', 'startup-retry']) els[id] = { hidden: true, textContent: '', addEventListener(t, fn) { this.click = fn; } };
  const l = loc();
  const root = { document: { getElementById: id => els[id] }, location: l };
  assert.equal(showStuck(root, new RangeError('x'), { scene: { getScene: () => ({ started: true, stageNo: 4 }) } }), true);
  assert.equal(els['startup-error'].hidden, false);
  assert.match(els['startup-description'].textContent, /picks up at the start of this stage/);
  assert.doesNotMatch(els['startup-description'].textContent, /title/);
  els['startup-retry'].click();
  assert.equal(new URL(l.calls[0][1]).searchParams.get('stage'), '4');
});

test('a resumed boot drops autostart/resume once the stage starts, keeping ?stage', () => {
  const q = new URLSearchParams('?stage=4&autostart=1&resume=1&god=1');
  const handlers = new Map(); let started = false; const replaced = [];
  const game = { scene: { getScene: () => ({ started }) }, events: { on: (k, f) => handlers.set(k, f), off: k => handlers.delete(k) } };
  const root = { location: { href: 'https://x.test/?stage=4&autostart=1&resume=1&god=1' }, history: { state: null, replaceState: (s, t, u) => replaced.push(u) } };
  assert.equal(installResumeCleanup(game, q, root), true);
  handlers.get('step')(); assert.equal(q.get('autostart'), '1', 'nothing changes before the stage starts');
  started = true; handlers.get('step')();
  assert.equal(q.has('autostart'), false); assert.equal(q.has('resume'), false); assert.equal(q.get('stage'), '4');
  assert.deepEqual(replaced, ['https://x.test/?stage=4&god=1']);
  assert.equal(handlers.has('step'), false);
  assert.equal(installResumeCleanup(game, new URLSearchParams('?stage=4&autostart=1'), root), false, 'a plain autostart link is left alone');
});

test('the graphics notice retry uses the same resume path', () => {
  let n = 0; const btn = { addEventListener(t, f) { this.f = f; }, removeEventListener() {} };
  installGraphicsNotice({ document: { getElementById: id => id === 'graphics-retry' ? btn : null }, location: { reload() { throw new Error('should resume'); } } }, () => n++);
  btn.f(); assert.equal(n, 1);
});

test('the fix lives outside the 25 MB pre-fight sum and main.js only installs it', () => {
  const a = audit();
  assert.equal(a.preFight.inventoryStatus, 'PASS');
  assert.equal(a.restartHotfix.source.status, 'PASS');
  assert.deepEqual(a.restartHotfix.source.files.sort(), ['src/quality-governor.js', 'src/recovery.js']);
  assert.equal(a.iosHotfix.source.status, 'PASS');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /installGovernor\(game,/);
  assert.doesNotMatch(main, /game\.rs - 0\.5/);
  assert.match(readFileSync(new URL('../src/guard.js', import.meta.url), 'utf8'), /import \{ showStuck \} from '\.\/recovery\.js'/);
});
