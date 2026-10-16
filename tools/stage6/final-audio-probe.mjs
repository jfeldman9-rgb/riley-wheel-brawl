// Native WebAudio lifecycle evidence; baseline serves HEAD source for the files changed in this pass.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const baseline = process.env.RWB_BASELINE === '1';
const base = process.env.RWB_URL || 'http://127.0.0.1:18767/';
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const log = { baseline, errors: [], samples: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => log.errors.push(e.message));
  if (baseline) for (const file of ['audio', 'stage6-lifecycle', 'rand-call-cutscene', 'stage6-art', 'stage6-view']) {
    const body = execFileSync('git', ['show', `HEAD:src/${file}.js`], { encoding: 'utf8' });
    await page.route(`**/src/${file}.js`, r => r.fulfill({ contentType: 'text/javascript', body }));
  }
  await page.addInitScript(() => {
    window.__nativeSources = [];
    const p = AudioBufferSourceNode.prototype, start = p.start, stop = p.stop;
    p.start = function(...args) { window.__nativeSources.push({ source: this, loop: this.loop, seconds: this.buffer?.duration, stopped: false }); return start.apply(this,args); };
    p.stop = function(...args) { const row = window.__nativeSources.find(x => x.source === this); if (row) row.stopped = true; return stop.apply(this,args); };
  });
  await page.goto(base + '?s6=1&stage=6&autostart=1&story=0');
  await page.waitForFunction(() => window.__stage?.started, null, { timeout: 60000 });
  await page.evaluate(async () => { window.__game.loop.stop(); window.__audio = await import('./src/audio.js'); window.__audio.unlock(); window.__stage.god = true; window.__stage.enemies = []; });
  await page.waitForFunction(() => window.__nativeSources.some(x => x.loop && x.seconds > 60), null, { timeout: 30000 });
  const sample = async name => log.samples.push({ name, state: await page.evaluate(() => ({ music: window.__audio.musicState().current, director: window.__stage.music.state,
    activeLoops: window.__nativeSources.filter(x => x.loop && !x.stopped).length,
    activeVoices: window.__nativeSources.filter(x => !x.loop && !x.stopped && x.seconds > 2).length })) });
  const voice = async () => {
    const before = await page.evaluate(() => window.__nativeSources.length);
    await page.evaluate(() => window.__audio.say('belal_intro_01'));
    await page.waitForFunction(before => window.__nativeSources.length > before, before, { timeout: 30000 });
  };
  await voice(); await sample('before-death');
  await page.evaluate(() => { window.__stage.riley.alive = false; window.__stage.rileyDied(); }); await sample('death');
  await page.evaluate(() => { const s = window.__stage; s.riley.alive = true; s.update(100,0); }); await page.waitForTimeout(100); await sample('respawn');
  await voice(); await page.evaluate(() => window.__stage.continueGame()); await sample('continue');
  await voice();
  await page.evaluate(async () => {
    const r = await import('./src/rand-call-cutscene.js'), { q } = await import('./src/config.js'); q.set('cutscenes','1');
    window.__randModule = r; r.playCall(window.__stage, () => {});
  }); await sample('rand-video');
  await page.evaluate(() => window.__randModule.abortRandCall(window.__stage)); await page.waitForTimeout(100); await sample('rand-abort');
  await voice(); await page.evaluate(() => window.__stage.music.set('boss'));
  await page.waitForFunction(() => window.__nativeSources.filter(x => x.loop && !x.stopped).length === 2,null,{timeout:30000});
  await sample('crossfade-before-quit');
  await page.evaluate(() => { const g = window.__game; window.__stage.scene.stop(); g.headlessStep(g.loop.now + 17, 17); }); await page.waitForTimeout(100); await sample('quit');
} finally { await browser.close(); }
writeFileSync(`docs/stage6/final-audio-browser${baseline ? '-before' : ''}.json`, JSON.stringify(log,null,2) + '\n');
console.log(JSON.stringify(log));
