// iPhone landscape hotfix: visual-viewport fit, Stage 2 → 3 asset paths, perf button.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import './helpers/stage1-simulation.mjs';
import { fitGame, canvasInsideVisual, hudScreenY } from '../src/viewport.js';
import { perfReportEnabled, applyPerfButton } from '../src/debug-flags.js';
import { directoryBaseHref, resolvePageAsset } from '../src/page-base.js';
import { drawPlate, isPlaceholderPlate, paintStage3Art, STAGE3_PLATE_KEYS } from '../src/stage3-art.js';
import { audit } from '../tools/audit-stage1.mjs';

const { queueStage3 } = await import('../src/stage3.js');
const { STAGE2, STAGE3, resolveStage } = await import('../src/stages.js');

const PAGES = 'https://jfeldman9-rgb.github.io/riley-wheel-brawl/';
const PHONES = [
  { width: 844, height: 390 },
  { width: 932, height: 430 },
];

function fakeContext() {
  const ctx = {
    texts: [], rects: 0,
    fillStyle: '', strokeStyle: '', globalAlpha: 1, lineWidth: 1,
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    fillRect() { ctx.rects++; },
    fill() { ctx.rects++; }, stroke() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() {}, arc() {},
    fillText(t) { ctx.texts.push(String(t)); },
    strokeText(t) { ctx.texts.push(String(t)); },
  };
  return ctx;
}

test('iPhone landscape visual viewport keeps the HUD inside the screen, including a mid-stage shrink', () => {
  for (const phone of PHONES) {
    const fit = fitGame({ ...phone, offsetTop: 0, offsetLeft: 0 });
    assert.ok(canvasInsideVisual(fit), `${phone.width} canvas stays inside the visual viewport`);
    assert.ok(hudScreenY(fit, 18) >= 0, 'Riley name stays on screen');
    assert.ok(hudScreenY(fit, 58) >= 0 && hudScreenY(fit, 100) < phone.height, 'health bars stay on screen');
    const shrunk = fitGame({ width: phone.width, height: Math.round(phone.height * 0.82), offsetTop: 28, offsetLeft: 0 });
    assert.ok(canvasInsideVisual(shrunk), `${phone.width} shrink keeps the canvas in the visual viewport`);
    assert.ok(shrunk.canvas.height < fit.canvas.height);
    assert.ok(hudScreenY(shrunk, 18) >= shrunk.parent.top);
    // The bug: FIT against a layout box taller than the phone, shifted up, crops y=18.
    const layout = fitGame({ width: phone.width, height: phone.height + 220, offsetTop: -110, offsetLeft: 0 });
    assert.ok(hudScreenY(layout, 18) < 0, `${phone.width} tall layout parent crops the HUD`);
    assert.ok(layout.canvas.height > phone.height * 0.9);
  }
});

test('Perf report shows only for ?debug or ?perf', () => {
  assert.equal(perfReportEnabled(''), false);
  assert.equal(perfReportEnabled('?stage=3'), false);
  assert.equal(perfReportEnabled('?debug'), true);
  assert.equal(perfReportEnabled('?debug=1'), true);
  assert.equal(perfReportEnabled('?perf'), true);
  assert.equal(perfReportEnabled('?perf=1'), true);
  const button = { hidden: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } };
  const doc = { getElementById: id => id === 'perf-open' ? button : null };
  assert.equal(applyPerfButton(doc, ''), false);
  assert.equal(button.hidden, true);
  assert.equal(applyPerfButton(doc, '?perf'), true);
  assert.equal(button.hidden, false);
});

test('Stage 3 campaign URLs stay repo-relative and resolve under the GitHub Pages base', () => {
  const next = STAGE2.next(new URLSearchParams(''));
  assert.deepEqual(next, { stage: 3, fromStage2: true, autostart: true });
  assert.equal(resolveStage(next, new URLSearchParams('')), 3);
  const next4 = STAGE3.next(new URLSearchParams(''));
  assert.equal(next4.stage, 4);
  assert.equal(resolveStage(next4, new URLSearchParams('')), 4);
  assert.equal(directoryBaseHref(PAGES), PAGES);
  assert.equal(directoryBaseHref(PAGES.slice(0, -1)), PAGES);
  assert.equal(directoryBaseHref(PAGES + 'index.html'), PAGES + 'index.html');

  const queued = [];
  const scene = {
    queued,
    load: {
      image: (key, url) => queued.push({ key, urls: [url].flat() }),
      atlas: (key, tex, atl) => queued.push({ key, urls: [tex, atl] }),
      spritesheet: (key, url) => queued.push({ key, urls: [url] }),
      json: (key, url) => queued.push({ key, urls: [url] }),
      once() {},
    },
    textures: { exists: () => false },
    cache: { json: { get: () => undefined } },
    events: { once() {}, off() {} },
  };
  queueStage3(scene);
  const urls = queued.flatMap(e => e.urls);
  assert.ok(urls.some(u => u === 'assets/bg3/bg3-mid.webp'));
  assert.ok(urls.some(u => u === 'assets/bg3/bg3-floor.jpg'));
  assert.ok(urls.some(u => u === 'assets/bg3/plates.json'));
  for (const url of urls) {
    assert.equal(url, url.toLowerCase(), url);
    assert.ok(!url.startsWith('/'), url);
    assert.ok(!url.startsWith('assets/bg/') && !url.startsWith('assets/bg2/'), url);
    assert.ok(existsSync(new URL('../' + url, import.meta.url)), url);
    const resolved = resolvePageAsset(PAGES.slice(0, -1), url);
    assert.equal(resolved, PAGES + url, url);
    assert.ok(!resolved.includes('github.io/assets/'), url);
  }
});

test('half-res placeholder plates are painted over and full-res plates are left alone', () => {
  for (const key of STAGE3_PLATE_KEYS) {
    const g = fakeContext();
    drawPlate(g, key, 1086, 362);
    assert.ok(g.rects > 8, key);
    assert.ok(!g.texts.some(t => /placeholder/i.test(t)), key);
  }
  assert.equal(isPlaceholderPlate({ width: 1086, height: 362 }), true);
  assert.equal(isPlaceholderPlate({ width: 2172, height: 724 }), false);
  const removed = [];
  const added = [];
  const n = paintStage3Art({
    textures: {
      exists: () => true,
      get: () => ({ getSourceImage: () => ({ width: 1086, height: 362 }) }),
      remove(k) { removed.push(k); },
      addCanvas(k, canvas) { added.push([k, canvas.width, canvas.height]); },
    },
  }, (w, h) => ({ width: w, height: h, getContext: () => fakeContext() }));
  assert.equal(n, STAGE3_PLATE_KEYS.length);
  assert.deepEqual(removed, [...STAGE3_PLATE_KEYS]);
  assert.equal(added.length, STAGE3_PLATE_KEYS.length);
  let created = 0;
  const kept = paintStage3Art({
    textures: {
      exists: () => true,
      get: () => ({ getSourceImage: () => ({ width: 2172, height: 724 }) }),
      remove() { throw new Error('full-res plate must stay'); },
    },
  }, () => { created++; return null; });
  assert.equal(kept, 0);
  assert.equal(created, 0);
  const bare = paintStage3Art({
    textures: {
      exists: () => true,
      get: () => ({ getSourceImage: () => ({ width: 1086, height: 362 }) }),
      remove() { throw new Error('no document canvas'); },
    },
  });
  assert.equal(bare, 0);
});

test('iOS hotfix source has its own cap and the 25 MB pre-fight gate still passes', () => {
  const data = audit();
  assert.equal(data.preFight.inventoryStatus, 'PASS');
  assert.ok(data.preFight.inventoryUpperBoundBytes <= 25_000_000);
  assert.equal(data.iosHotfix.source.status, 'PASS');
  assert.ok(data.iosHotfix.source.bytes <= data.iosHotfix.source.budgetBytes);
  assert.ok(data.preFight.inventoryUpperBoundBytes + data.iosHotfix.source.bytes > data.preFight.budgetBytes);
});
