// iPhone landscape hotfix: shell fit, Stage 2 → 3 paths, perf button, audit cap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fitCanvasRect, elementClipped } from '../src/viewport.js';
import { perfReportEnabled, applyPerfButton } from '../src/debug-flag.js';
import { directoryBaseHref, resolvePageAsset } from '../src/page-base.js';
import { audit } from '../tools/audit-stage1.mjs';
import { STAGE2, STAGE3, resolveStage } from '../src/stages.js';

const PAGES = 'https://jfeldman9-rgb.github.io/riley-wheel-brawl/';

test('a layout box taller than the phone crops the HUD, and a fitted visual box does not', () => {
  for (const phone of [{ width: 844, height: 390 }, { width: 932, height: 430 }]) {
    const fit = fitCanvasRect({ ...phone, offsetTop: 0, offsetLeft: 0 });
    assert.equal(elementClipped(fit, phone), false);
    assert.ok(fit.top + 18 * fit.scale >= 0);
    assert.ok(fit.top + 100 * fit.scale < phone.height);
    const shrunk = fitCanvasRect({ width: phone.width, height: phone.height - 60, offsetTop: 0, offsetLeft: 0 });
    assert.equal(elementClipped(shrunk, { width: phone.width, height: phone.height - 60 }), false);
    assert.ok(shrunk.top + 18 * shrunk.scale >= 0);
    const layout = fitCanvasRect({ width: phone.width, height: phone.height + 220, offsetTop: -110, offsetLeft: 0 });
    assert.ok(layout.top + 18 * layout.scale < 0, `${phone.width} tall layout parent crops the HUD`);
  }
});

test('Perf report shows only for ?debug or ?perf', () => {
  assert.equal(perfReportEnabled(''), false);
  assert.equal(perfReportEnabled('?stage=3'), false);
  assert.equal(perfReportEnabled('?debug'), true);
  assert.equal(perfReportEnabled('?debug=1'), true);
  assert.equal(perfReportEnabled('?debug=0'), false);
  assert.equal(perfReportEnabled('?perf'), true);
  const button = { hidden: false, tabIndex: 0, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } };
  const doc = { getElementById: id => id === 'perf-open' ? button : null };
  assert.equal(applyPerfButton(doc, ''), false);
  assert.equal(button.hidden, true);
  assert.equal(applyPerfButton(doc, '?perf'), true);
  assert.equal(button.hidden, false);
});

test('Stage 3 and 4 campaign URLs resolve under the GitHub Pages directory', () => {
  const next = STAGE2.next(new URLSearchParams(''));
  assert.deepEqual(next, { stage: 3, fromStage2: true, autostart: true });
  assert.equal(resolveStage(next, new URLSearchParams('')), 3);
  const next4 = STAGE3.next(new URLSearchParams(''));
  assert.equal(next4.stage, 4);
  assert.equal(resolveStage(next4, new URLSearchParams('')), 4);
  assert.equal(directoryBaseHref(PAGES), PAGES);
  assert.equal(directoryBaseHref(PAGES.slice(0, -1)), PAGES);
  assert.equal(resolvePageAsset(PAGES.slice(0, -1), 'assets/bg3/bg3-mid.webp'), PAGES + 'assets/bg3/bg3-mid.webp');
});

test('iOS hotfix source has its own cap and the 25 MB pre-fight gate still passes', () => {
  const data = audit();
  assert.equal(data.preFight.inventoryStatus, 'PASS');
  assert.ok(data.preFight.inventoryUpperBoundBytes <= 25_000_000);
  assert.equal(data.iosHotfix.source.status, 'PASS');
  assert.ok(data.iosHotfix.source.bytes <= data.iosHotfix.source.budgetBytes);
  assert.ok(data.preFight.inventoryUpperBoundBytes + data.iosHotfix.source.bytes > data.preFight.budgetBytes);
});
