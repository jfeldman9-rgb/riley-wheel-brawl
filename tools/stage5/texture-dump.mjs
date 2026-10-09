// Serve the worktree, then: NODE_PATH=$(npm root -g) node tools/stage5/texture-dump.mjs
// Uses the actual Phaser renderer/scene, including attached normal sources and GL render targets.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const { webkit, chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.RWB_URL || 'http://127.0.0.1:8765/';
const output = process.env.RWB_TEXTURE_OUTPUT || 'docs/stage5/texture-dump.json';
const scale = Number(process.env.RWB_RS || 1);
const stages = (process.env.RWB_STAGES || '4,5').split(',').map(Number);
const engines = (process.env.RWB_ENGINES || 'webkit,chromium').split(',');
const result = { method: 'RGBA base levels: all Texture.source + Texture.dataSource; renderer glTextureWrappers separately (includes render targets). No process-RSS claim.', viewport: [1280, 720], deviceScaleFactor: scale, renderScale: scale, runs: [] };

function snapshot(label) {
  const game = window.__game, scene = window.__stage;
  const entries = Object.entries(game.textures.list).map(([key, t]) => ({ key,
    sources: ['source', 'dataSource'].flatMap(kind => t[kind].map((s, index) => ({ kind, index, width: s.width, height: s.height,
      bytes: s.width * s.height * 4, canvas: s.isCanvas, gpu: !!s.glTexture, url: s.image?.src || null }))) }));
  const gl = game.renderer.glTextureWrappers.filter(t => t.webGLTexture).map(t => ({ width: t.width, height: t.height,
    bytes: t.width * t.height * 4, minFilter: t.minFilter, magFilter: t.magFilter, format: t.format, type: t.type }));
  return { label, stage: scene.stageNo, zone: scene.zoneI, phase: scene.boss?.phase, state: scene.boss?.state,
    started: scene.started, ended: scene.ended, clearShown: scene.clearShown, rs: game.rs,
    rendererConfig: { mipmapFilter: game.config.mipmapFilter, mipmapRegeneration: game.config.mipmapRegeneration },
    diagnostics: { gamePaused: game.isPaused, paused: scene.paused, pauseReasons: Array.from(scene.pauseReasons || []),
      hp: scene.riley.hp, state: scene.riley.state, x: scene.riley.x, y: scene.riley.y, bossHp: scene.boss?.hp,
      p2t: scene.boss?.p2t, beat: scene.kit?.arena?.beat, enemies: scene.enemies.map(e => ({ type: e.type, hp: e.hp, state: e.state, x: e.x, y: e.y })) },
    sourceBytes: entries.reduce((n, e) => n + e.sources.reduce((n, s) => n + s.bytes, 0), 0),
    colorBytes: entries.reduce((n, e) => n + e.sources.filter(s => s.kind === 'source').reduce((n, s) => n + s.bytes, 0), 0),
    glBytes: gl.reduce((n, s) => n + s.bytes, 0), gl, entries };
}

for (const [engine, launcher] of [['webkit', webkit], ['chromium', chromium]]) {
  if (!engines.includes(engine)) continue;
  const browser = await launcher.launch({ headless: true });
  try {
    for (const stage of stages) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: scale });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}?stage=${stage}&demo=1&story=0&debug=1&rs=${scale}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__stage?.riley, null, { timeout: 60000 });
      const samples = [await page.evaluate(snapshot, 'title')];
      await page.waitForFunction(() => window.__stage?.started, null, { timeout: 60000 });
      // Advance real game ticks with full pre/post update; render at each sample.
      // God mode avoids a random failed campaign masking later texture allocations; it changes no assets.
      await page.evaluate(() => { window.__game.loop.stop(); window.__stage.god = true; window.__dumpTime = window.__game.loop.now; });
      const seen = new Set();
      for (let batch = 0; batch < 100; batch++) {
        const state = await page.evaluate(() => {
          const g = window.__game;
          for (let i = 0; i < 300 && !window.__stage.clearShown; i++) { window.__dumpTime += 1000 / 60; g.headlessStep(window.__dumpTime, 1000 / 60); }
          // Render at each sample so lazy textures / current filter render targets are allocated.
          g.step(window.__dumpTime, 0);
          const s = window.__stage;
          return { tag: `${s.zoneI}/${s.boss?.phase || 0}/${!!s.kit?.arena?.frozen}/${!!s.ended}`, done: s.clearShown };
        });
        if (!seen.has(state.tag) || state.done) { seen.add(state.tag); samples.push(await page.evaluate(snapshot, state.tag)); }
        if (state.done) break;
      }
      samples.push(await page.evaluate(snapshot, 'final'));
      // Keep a complete dump at the largest source and GL sample, plus compact progression.
      const peak = samples.reduce((a, b) => b.sourceBytes > a.sourceBytes ? b : a);
      const glPeak = samples.reduce((a, b) => b.glBytes > a.glBytes ? b : a);
      const run = { engine, stage, errors, progression: samples.map(({ entries, gl, ...s }) => s), peak, glPeak };
      result.runs.push(run);
      console.log(JSON.stringify({ engine, stage, sourceMiB: peak.sourceBytes / 2 ** 20, colorMiB: peak.colorBytes / 2 ** 20,
        glMiB: glPeak.glBytes / 2 ** 20, reachedClear: samples.some(s => s.clearShown), errors }));
      // Check restart residency in the same TextureManager rather than a fresh browser.
      if (stage === 4) {
        await page.evaluate(() => { window.__stage.scene.restart({ stage: 5, autostart: true, story: false }); window.__game.loop.start(window.__game.step.bind(window.__game)); });
        await page.waitForFunction(() => window.__stage?.stageNo === 5 && window.__stage?.started, null, { timeout: 60000 });
        run.transitionTo5 = await page.evaluate(snapshot, 'stage4-to-stage5');
      }
      await page.close();
    }
  } finally { await browser.close(); }
}
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
