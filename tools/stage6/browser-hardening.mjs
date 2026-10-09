// Live WebKit lifecycle and texture-residency probes; serve the worktree on port 8765.
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { webkit } = createRequire(import.meta.url)('playwright');
const browser = await webkit.launch({ headless: true });
const result = { transitions: [], video: [] };
const base = process.env.RWB_URL || 'http://127.0.0.1:8765/';
function inventory() {
  const g = window.__game, s = window.__stage;
  return { stage: s.stageNo, loaded: s.loadedStage, started: s.started, sourceBytes: Object.values(g.textures.list).reduce((n, t) => n + ['source', 'dataSource'].reduce((n, kind) => n + t[kind].reduce((n, v) => n + v.width * v.height * 4, 0), 0), 0),
    stage6: Object.keys(g.textures.list).filter(k => /^(s6|bg6|story6|randPortrait|belalPortrait)/.test(k)),
    normals: Object.entries(g.textures.list).flatMap(([key, t]) => [...t.dataSource.map(v => ({ key, url: v.image?.src || '', width: v.width, height: v.height })), ...(key.endsWith('_nl') ? t.source.map(v => ({ key, url: v.image?.src || '', width: v.width, height: v.height })) : [])]),
    animationsMissing: Object.values(g.anims.anims.entries).flatMap(a => a.frames.filter(f => !g.textures.exists(f.textureKey)).map(f => [a.key, f.textureKey])) };
}
try {
  for (const to of [1, 2, 3, 4, 5]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], warnings = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (/Texture.*not found|missing texture/i.test(m.text())) warnings.push(m.text()); });
    await page.goto(base + '?s6=1&stage=6&demo=1&story=0&debug=1&rs=1');
    await page.waitForFunction(() => window.__stage?.stageNo === 6 && window.__stage.started, null, { timeout: 60000 });
    const before = await page.evaluate(inventory);
    await page.evaluate(to => { const s = window.__stage; s.god = true; s.scene.restart({ stage: to, autostart: true, story: false }); }, to);
    await page.waitForFunction(to => window.__stage?.stageNo === to && window.__stage.started, to, { timeout: 60000 });
    await page.evaluate(() => { const g = window.__game; g.loop.stop(); let t = g.loop.now; for (let i = 0; i < 120; i++) g.headlessStep(t += 1000 / 60, 1000 / 60); g.step(t, 0); });
    const after = await page.evaluate(inventory);
    assert.deepEqual(after.stage6, []); assert.deepEqual(after.animationsMissing, []); assert.deepEqual(errors, []); assert.deepEqual(warnings, []);
    for (const n of after.normals) if (/^(riley|grunt|spear|hound)-/.test(n.key)) { const expected = to === 5 ? 680 : 2040; if (n.key === 'riley-0' || n.key === 'riley-0_nl') assert.equal(n.width, expected, JSON.stringify(n)); }
    result.transitions.push({ to, before, after, errors, warnings }); await page.close();
  }
  for (const mode of ['404', 'abort', 'skip']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    if (mode !== '404') await page.route('**/assets/cutscenes/rand/R*.mp4', route => route.fulfill({ contentType: 'video/mp4', body: readFileSync('assets/cutscenes/stage1.mp4') }));
    await page.goto(base + '?s6=1&stage=6&demo=1&story=0&cutscenes=1&debug=1&rs=1');
    await page.waitForFunction(() => window.__stage?.started, null, { timeout: 60000 });
    await page.evaluate(() => { const s = window.__stage; s.god = true; s.bot = null; s.zone = s.zone || { l: s.camX, r: s.camX + 1280 }; const e = s.spawn('grunt', 'R'); e.x = s.camX + 400; e.entering = false; });
    // A real captured pointer gesture blesses the second player before scene CALL.
    await page.mouse.click(640, 300);
    const initial = await page.evaluate(() => {
      const s = window.__stage, first = s.callLoial(), second = s.callLoial(), v = document.querySelector('video');
      return { spent: [first, second, s.kit.rand.calls], during: { gamePaused: window.__game.isPaused, videos: document.querySelectorAll('video').length, inline: v?.playsInline || false } };
    });
    assert.deepEqual(initial.spent, [true, false, 1]);
    assert.equal(initial.during.gamePaused, true); assert.equal(initial.during.videos, 1); assert.equal(initial.during.inline, true);
    const row = { mode, during: initial.during };
    if (mode === 'abort') {
      await page.evaluate(async () => { const m = await import('./src/rand-call-cutscene.js'); m.abortRandCall(window.__stage); window.__stage.scene.restart({ stage: 1, autostart: true, story: false }); });
      await page.waitForFunction(() => window.__stage.stageNo === 1 && window.__stage.started, null, { timeout: 60000 });
    } else if (mode === 'skip') {
      await page.waitForTimeout(1000);
      row.clipStillActiveAtSkip = await page.evaluate(() => { const s = window.__stage; if (!s.cutscene) return false; s.cutscene.press('jump'); return true; });
    }
    result.video.push(row);
    await page.waitForFunction(() => !window.__stage.cutscene && !window.__stage.kit?.strike && !window.__game.isPaused, null, { timeout: 20000 });
    const after = await page.evaluate(() => ({ stage: window.__stage.stageNo, videos: document.querySelectorAll('video').length, paused: window.__stage.paused, inv: window.__stage.riley.inv }));
    assert.equal(after.videos, 0); assert.equal(after.paused, false); assert.deepEqual(errors, []);
    row.after = after; row.errors = errors;
    await page.close();
  }
} finally { await browser.close(); writeFileSync('docs/stage6/browser-hardening.json', JSON.stringify(result, null, 2) + '\n'); }
console.log(JSON.stringify({ transitions: result.transitions.map(r => r.to), video: result.video }));
