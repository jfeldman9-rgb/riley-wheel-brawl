import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { shieldPerfControls, reportSummary, installPerfPanel } from '../src/perf-panel.js';
import { frameStats, fightGate, perf } from '../src/perf.js';

test('panel event shield stops gameplay bubbling without blocking touch scroll or native controls', () => {
  const el = new EventTarget(); let keys = 0;
  const dispose = shieldPerfControls(el, () => keys++);
  for (const type of ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchmove', 'touchend', 'keydown', 'keyup']) {
    const event = new Event(type, { cancelable: true, bubbles: true }); let stops = 0;
    event.stopPropagation = () => { stops++; };
    el.dispatchEvent(event);
    assert.equal(stops, 1, type); assert.equal(event.defaultPrevented, false, `${type}: native behavior preserved`);
  }
  assert.equal(keys, 1);
  dispose(); el.dispatchEvent(new Event('keydown')); assert.equal(keys, 1);
});

function report(values, software = false) {
  const fight = frameStats(values);
  return { fight, all: fight, gate: fightGate(fight), context: { mode: 'manual' },
    metadata: { quality: 1, renderScale: 2, dpr: 2, viewport: { width: 1024, height: 768 }, renderer: 'Test Renderer', softwareRenderer: software } };
}

test('report wording makes an over-budget p95 and the >33.4 threshold explicit', () => {
  const text = reportSummary(report([16.70001]));
  assert.match(text, /SAMPLED p95 OVER TARGET/); assert.match(text, /16\.701 ms/);
  assert.match(text, /fight p95 ≤ 16\.7 ms/); assert.match(text, />33\.4 ms/);
  assert.doesNotMatch(text, /MEETS TARGET/);
});

test('software capture never claims physical-device acceptance, and empty capture has no pass', () => {
  const text = reportSummary(report([16], true));
  assert.match(text, /SOFTWARE RENDERER: not physical-device acceptance evidence/);
  const empty = reportSummary(report([]));
  assert.match(empty, /NO FIGHT SAMPLES YET/); assert.doesNotMatch(empty, /MEETS TARGET/);
});


// Minimal ordinary DOM objects exercise the real panel controller without adding a browser dependency.
function panelDOM() {
  const doc = new EventTarget(), nodes = new Map();
  class Element extends EventTarget {
    constructor(id) {
      super(); this.id = id; this.attributes = new Map(); this.style = {}; this.dataset = {}; this.hidden = false;
      this.inert = false; this.isConnected = true; this.disabled = false; this.children = [];
      this.classList = { values: new Set(), add: name => this.classList.values.add(name), remove: name => this.classList.values.delete(name) };
    }
    setAttribute(name, value) { this.attributes.set(name, value); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    removeAttribute(name) { this.attributes.delete(name); }
    focus() { doc.activeElement = this; }
    blur() { if (doc.activeElement === this) doc.activeElement = doc.body; }
    contains(target) { return target === this || this.children.some(child => child.contains(target)); }
    querySelectorAll() { return this.children.filter(node => ['perf-close', 'perf-reset', 'perf-copy', 'perf-save', 'perf-json'].includes(node.id)); }
  }
  const make = id => { const node = new Element(id); nodes.set(id, node); return node; };
  for (const id of ['game', 'touch', 'graphics-notice', 'perf-open', 'perf-overlay', 'perf-dialog', 'perf-summary', 'perf-json', 'perf-status', 'perf-close', 'perf-reset', 'perf-copy', 'perf-save', 'canvas']) make(id);
  const dialog = nodes.get('perf-dialog');
  dialog.children = ['perf-close', 'perf-summary', 'perf-copy', 'perf-save', 'perf-reset', 'perf-status', 'perf-json'].map(id => nodes.get(id));
  nodes.get('perf-overlay').children = [dialog]; nodes.get('game').children = [nodes.get('canvas')];
  doc.body = make('body'); doc.documentElement = make('html'); doc.activeElement = doc.body;
  doc.getElementById = id => nodes.get(id); doc.querySelectorAll = () => []; doc.querySelector = () => null;
  return { doc, nodes };
}

test('panel pauses safely, exports observed coverage, closes to playable canvas and cleans up over repeated cycles', () => {
  const oldDocument = globalThis.document, { doc, nodes } = panelDOM();
  globalThis.document = doc;
  let clears = 0;
  const reasons = new Set(['manual']), calls = [];
  const stage = { bot: { coverage: { phases: [1, 2], attacks: ['charge'], complete: false } },
    setPauseReason(reason, enabled) { calls.push([reason, enabled]); if (enabled) reasons.add(reason); else reasons.delete(reason); } };
  const game = { canvas: nodes.get('canvas'), inp: { clear: () => clears++ } };
  const click = id => nodes.get(id).dispatchEvent(new Event('click'));
  let panel;
  try {
    perf.reset();
    panel = installPerfPanel({ game, getStage: () => stage });
    for (let i = 0; i < 3; i++) {
      nodes.get('perf-open').focus(); click('perf-open');
      assert.equal(doc.activeElement, nodes.get('perf-close'));
      assert.equal(nodes.get('game').inert, true); assert.equal(nodes.get('perf-overlay').hidden, false);
      assert.equal(nodes.get('graphics-notice').inert, true);
      assert.equal(nodes.get('graphics-notice').getAttribute('aria-hidden'), 'true');
      assert.deepEqual([...reasons], ['manual', 'report']);
      const exported = JSON.parse(nodes.get('perf-json').value);
      assert.deepEqual(exported.observations.bossCoverage, stage.bot.coverage);
      assert.equal(exported.gate.status, 'NO_SAMPLES');
      if (i === 0) {
        click('perf-reset'); assert.deepEqual(perf.suspended, ['report']);
        assert.match(nodes.get('perf-status').textContent, /Capture reset/);
      }
      if (i === 1) {
        const esc = new Event('keydown', { cancelable: true }); esc.key = 'Escape';
        nodes.get('perf-overlay').dispatchEvent(esc); assert.equal(esc.defaultPrevented, true);
      } else click('perf-close');
      assert.equal(doc.activeElement, game.canvas, 'gameplay keys no longer land on the shielded opener');
      assert.equal(game.canvas.getAttribute('tabindex'), '-1');
      assert.equal(nodes.get('game').inert, false); assert.equal(nodes.get('game').getAttribute('aria-hidden'), null);
      assert.equal(nodes.get('graphics-notice').inert, false);
      assert.equal(nodes.get('graphics-notice').getAttribute('aria-hidden'), null);
      assert.equal(nodes.get('perf-overlay').hidden, true); assert.deepEqual([...reasons], ['manual']);
      assert.deepEqual(perf.suspended, []); assert.equal(doc.documentElement.classList.values.has('perf-open'), false);
    }
    assert.equal(clears, 6); assert.equal(calls.length, 6);
    panel.destroy(); click('perf-open'); assert.equal(calls.length, 6, 'old listener removed');
    panel = installPerfPanel({ game, getStage: () => stage });
    click('perf-open'); assert.equal(calls.length, 7, 'new HUD creates exactly one opener listener');
    panel.destroy(); assert.deepEqual([...reasons], ['manual']); assert.deepEqual(perf.suspended, []);
  } finally {
    panel?.destroy(); perf.reset();
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
  }
});

test('the perf panel shows the stage 3 light budget and its peak', () => {
  const oldDocument = globalThis.document, { doc, nodes } = panelDOM();
  globalThis.document = doc;
  const stage = {
    stageNo: 3,
    kit: { lightBudget: { active: 4, candidates: 7, cap: 10, peak: 9 } },
    setPauseReason() {},
  };
  const game = { canvas: nodes.get('canvas'), inp: { clear() {} } };
  let panel;
  try {
    perf.reset();
    panel = installPerfPanel({ game, getStage: () => stage });
    nodes.get('perf-open').dispatchEvent(new Event('click'));
    assert.match(nodes.get('perf-summary').textContent, /L 4\/7\/10 pk 9/);
    assert.equal(JSON.parse(nodes.get('perf-json').value).lights, 'L 4/7/10 pk 9');
    panel.destroy();
    panel = installPerfPanel({ game, getStage: () => ({ stageNo: 1, setPauseReason() {} }) });
    nodes.get('perf-open').dispatchEvent(new Event('click'));
    assert.doesNotMatch(nodes.get('perf-summary').textContent, /L \d+\//);
    assert.equal(JSON.parse(nodes.get('perf-json').value).lights, undefined);
  } finally {
    panel?.destroy(); perf.reset();
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
  }
});
