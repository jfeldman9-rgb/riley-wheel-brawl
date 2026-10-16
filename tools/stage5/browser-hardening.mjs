// Live Phaser integration checks, including failures the pure Node harness cannot model.
// NODE_PATH=$(npm root -g) node tools/stage5/browser-hardening.mjs
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { webkit } = createRequire(import.meta.url)('playwright');
const browser = await webkit.launch();
const base = process.env.RWB_URL || 'http://127.0.0.1:8765/';
const runs = [];
try {
  for (const fail of [null, 's5agin.webp', 's5balt.json', 'aginor-portrait.webp', 'audio']) {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    if (fail) await page.route('**/assets/**', route => {
      const url = route.request().url();
      return (fail === 'audio' ? url.includes('/audio/') : url.endsWith('/' + fail)) ? route.abort() : route.continue();
    });
    await page.goto(`${base}?stage=5&skip=boss&story=0&demo=1&god=1&rs=1`);
    await page.waitForFunction(() => window.__stage?.started && window.__stage.boss, null, { timeout: 60000 });
    const start = await page.evaluate(() => {
      const s = window.__stage, b = s.boss;
      // Exercise the actual gates with burst damage, then the full live scene cinematic.
      b.takeHit({ dmg: 99999 }); b.takeHit({ dmg: 99999 });
      s.kit.startBeat(b);
      return { phase: b.phase, hp: b.hp, beatDone: b.beatDone, frozen: s.kit.arena.frozen,
        cachedUpdate: String(s.sys.sceneUpdate), update: String(s.update), clocks: { timePaused: s.time.paused, animScale: s.anims.globalTimeScale } };
    });
    await page.waitForFunction(() => window.__stage.boss.beatDone && !window.__stage.kit.arena.frozen, null, { timeout: 45000 });
    const end = await page.evaluate(() => {
      const s = window.__stage, b = s.boss;
      const outcome = { phase: b.phase, hp: b.hp, beatDone: b.beatDone, frozen: s.kit.arena.frozen, t: s.kit.arena.beat?.t,
        clocks: { timePaused: s.time.paused, animScale: s.anims.globalTimeScale }, riley: { state: s.riley.state, hp: s.riley.hp } };
      b.takeHit({ dmg: 99999 }); outcome.afterHit = { hp: b.hp, state: b.state }; return outcome;
    });
    assert.equal(end.phase, 3); assert.equal(end.hp, 198);
    assert.equal(end.afterHit.hp, 0); assert.equal(end.afterHit.state, 'burn');
    assert.deepEqual(errors, []);
    runs.push({ fail, start, end, errors }); console.log(JSON.stringify({ fail, end, errors }));
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync('docs/stage5/browser-hardening.json', JSON.stringify(runs, null, 2) + '\n');
