import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  VIEWPORT_CSS, VIEWPORT_SETTLE_MS, readVisualFrame, elementClipped, fitCanvasRect,
  applyPinFallback, createViewportScheduler, syncGameViewport, installViewportCss,
} from '../src/viewport.js';
import { debugViewportEnabled, perfReportEnabled } from '../src/debug-flag.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('viewport shell CSS locks scroll and uses dvh without editing index.html', () => {
  assert.match(html, /viewport-fit=cover/);
  assert.equal(html.includes('100dvh'), false);
  assert.equal(html.includes('rwb-viewport-css'), false);
  assert.match(VIEWPORT_CSS, /overflow:\s*hidden/);
  assert.match(VIEWPORT_CSS, /overscroll-behavior:\s*none/);
  assert.match(VIEWPORT_CSS, /#game canvas \{\s*touch-action:\s*none;/);
  assert.match(VIEWPORT_CSS, /position:\s*fixed/);
  assert.match(VIEWPORT_CSS, /inset:\s*0/);
  const vh = VIEWPORT_CSS.indexOf('height: 100vh');
  const dvh = VIEWPORT_CSS.indexOf('height: 100dvh');
  assert.ok(vh !== -1 && dvh > vh, '100vh is the fallback and 100dvh overrides it');
  assert.equal(VIEWPORT_CSS.includes('RESIZE'), false);
});

test('iPhone landscape frames keep the HUD inside the fitted canvas, including a 60px shrink', () => {
  for (const [w, h] of [[844, 390], [932, 430]]) {
    const frame = { width: w, height: h, offsetLeft: 0, offsetTop: 0 };
    const rect = fitCanvasRect(frame);
    assert.equal(elementClipped(rect, frame), false);
    const hud = { x: rect.left + 58 * rect.scale, y: rect.top + 18 * rect.scale };
    assert.ok(hud.y >= 0 && hud.y < 80, `hud y ${hud.y} on ${w}x${h}`);
    assert.ok(hud.x >= rect.left && hud.x <= rect.right);
    const shrunk = fitCanvasRect({ width: w, height: h - 60, offsetLeft: 0, offsetTop: 0 });
    assert.equal(elementClipped(shrunk, { width: w, height: h - 60 }), false);
    assert.ok(shrunk.top >= -1 && shrunk.bottom <= h - 60 + 1);
    const hud2 = shrunk.top + 18 * shrunk.scale;
    assert.ok(hud2 >= shrunk.top && hud2 <= shrunk.bottom);
  }
});

test('visualViewport offset is a fallback and is not applied twice', () => {
  const frame = readVisualFrame({ innerWidth: 844, innerHeight: 390, visualViewport: { width: 844, height: 340, offsetLeft: 0, offsetTop: 50 } });
  assert.deepEqual(frame, { width: 844, height: 340, offsetLeft: 0, offsetTop: 50 });
  const el = { style: {}, dataset: {} };
  const alreadyVisible = { top: 0, left: 0, right: 844, bottom: 340, width: 844, height: 340 };
  assert.equal(applyPinFallback(el, frame, alreadyVisible).pinned, false);
  assert.equal(el.style.top, undefined);
  const clipped = { top: -50, left: 0, right: 844, bottom: 290, width: 844, height: 340 };
  const pin = applyPinFallback(el, frame, clipped);
  assert.equal(pin.pinned, true);
  assert.equal(el.style.top, '50px');
  assert.equal(el.dataset.vvPin, '1');
  applyPinFallback(el, frame, clipped);
  assert.equal(el.style.top, '50px');
  const cleared = applyPinFallback(el, { width: 844, height: 390, offsetLeft: 0, offsetTop: 0 }, { top: 0, left: 0, right: 844, bottom: 390, width: 844, height: 390 });
  assert.equal(cleared.cleared, true);
  assert.equal(el.style.top, '');
  assert.equal(el.dataset.vvPin, undefined);
});

test('resize, orientation and visualViewport events share one frame and one 250ms settle', () => {
  const queue = [];
  const timers = [];
  let calls = [];
  const schedule = createViewportScheduler(force => calls.push(force), {
    requestAnimationFrame(fn) { queue.push(fn); return queue.length; },
    setTimeout(fn) { const t = { fn }; timers.push(t); return t; },
    clearTimeout(t) { t.fn = null; },
  });
  schedule(); schedule(); schedule();
  assert.equal(queue.length, 1);
  assert.equal(timers.length, 3);
  assert.equal(timers[0].fn, null);
  assert.equal(timers[1].fn, null);
  assert.equal(VIEWPORT_SETTLE_MS, 250);
  queue[0]();
  assert.deepEqual(calls, [false]);
  timers[2].fn();
  assert.deepEqual(calls, [false, true]);
});

test('a mid-stage container shrink refreshes Phaser against the new parent', () => {
  const doc = fakeDoc();
  const game = fakeGame(doc);
  const root = fakeRoot(doc, 844, 390);
  const first = syncGameViewport(game, root, { force: true });
  assert.equal(first.refreshed, true);
  assert.equal(game.scale.refreshes, 1);
  doc.nodes.get('game').clientHeight = 330;
  doc.nodes.get('game').rect = { top: 0, left: 0, right: 844, bottom: 330, width: 844, height: 330 };
  root.visualViewport.height = 330;
  const second = syncGameViewport(game, root);
  assert.equal(second.height, 330);
  assert.equal(second.refreshed, true);
  assert.equal(game.scale.refreshes, 2);
  assert.equal(game.scale.parent.height, 330);
  const hudTop = 18 * Math.min(844 / 1280, 330 / 720);
  assert.ok(hudTop >= 0 && hudTop < 330);
});

test('viewport logger exists only for ?debug=1', () => {
  assert.equal(debugViewportEnabled('?debug=1'), true);
  assert.equal(debugViewportEnabled('?debug'), false);
  assert.equal(debugViewportEnabled('?debug=0'), false);
  assert.equal(debugViewportEnabled('?perf=1'), false);
  assert.equal(perfReportEnabled(''), false);
  assert.equal(perfReportEnabled('?debug'), true);
  assert.equal(perfReportEnabled('?debug=0'), false);
  assert.equal(perfReportEnabled('?perf=1'), true);
  const doc = fakeDoc();
  const game = fakeGame(doc);
  syncGameViewport(game, fakeRoot(doc, 844, 390, ''));
  assert.equal(doc.getElementById('rwb-viewport-log'), null);
  syncGameViewport(game, fakeRoot(doc, 844, 390, '?debug=1'), { force: true });
  const log = doc.getElementById('rwb-viewport-log');
  assert.ok(log);
  assert.match(log.textContent, /vv 844×390/);
  assert.equal(log.style.pointerEvents || log.style.cssText.includes('pointer-events:none'), true);
});

test('injected stylesheet is installed once', () => {
  const doc = fakeDoc();
  installViewportCss(doc);
  installViewportCss(doc);
  assert.equal([...doc.nodes.keys()].filter(id => id === 'rwb-viewport-css').length, 1);
  assert.match(doc.nodes.get('rwb-viewport-css').textContent, /100dvh/);
});

function fakeDoc() {
  const nodes = new Map();
  const doc = {
    nodes,
    head: { appendChild(el) { nodes.set(el.id, el); } },
    body: { appendChild(el) { nodes.set(el.id, el); } },
    getElementById(id) { return nodes.get(id) || null; },
    createElement() { return { id: '', style: {}, textContent: '', dataset: {}, setAttribute() {} }; },
  };
  const game = {
    id: 'game', style: {}, dataset: {}, clientWidth: 844, clientHeight: 390,
    rect: { top: 0, left: 0, right: 844, bottom: 390, width: 844, height: 390 },
    getBoundingClientRect() { return this.rect; },
  };
  nodes.set('game', game);
  return doc;
}

function fakeGame(doc) {
  const el = doc.getElementById('game');
  return {
    canvas: { parentElement: el, getBoundingClientRect: () => ({ top: 0, left: 112, width: 620, height: el.clientHeight, right: 732, bottom: el.clientHeight }) },
    scale: {
      refreshes: 0, parent: null, displaySize: { width: 1280, height: 720 },
      getParentBounds() {},
      refresh() { this.refreshes++; this.parent = { width: el.clientWidth, height: el.clientHeight }; },
    },
  };
}

function fakeRoot(doc, w, h, search = '') {
  return {
    document: doc, innerWidth: w, innerHeight: h, scrollX: 0, scrollY: 0,
    location: { search },
    visualViewport: { width: w, height: h, offsetLeft: 0, offsetTop: 0 },
  };
}
