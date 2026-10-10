// Headless Stage 6 art/audio pass: NODE_PATH=$(npm root -g) RWB_URL=http://127.0.0.1:8766/ node tools/stage6/art-shots.mjs
// Steps the real game (demo bot, god mode) and saves a screenshot of each zone, Be'lal mid-fight, the Gray Man,
// Fadelt, the Defenders and Callandor (dormant and flaring), plus a Rand call if one happens. Logs which looping
// music buffers the Web Audio graph actually started (stage6 / boss6) and the music/voice files fetched.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.RWB_URL || 'http://127.0.0.1:8766/';
const out = process.env.RWB_SHOTS || '/workspace/stage6/art-shots';
const rand = process.env.RWB_RAND !== '0';
const only = (process.env.RWB_ONLY || '').split(',').filter(Boolean);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const log = { url: null, shots: [], audioStarts: [], fetched: [], errors: [], missing: [], music: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => log.errors.push(e.message));
  page.on('console', m => { const t = m.text(); if (/missing|Failed to process|404/i.test(t)) log.missing.push(t); });
  page.on('response', r => { const u = r.url(); if (/\.(mp3|webp|jpg|json)$/.test(u) && /(audio|stage6|bg6|props)/.test(u)) log.fetched.push([r.status(), u.replace(base, '')]); });
  await page.addInitScript(() => {
    window.__audioStarts = [];
    const S = window.AudioBufferSourceNode && AudioBufferSourceNode.prototype, orig = S && S.start;
    if (orig) S.start = function (...a) { if (this.loop && this.buffer && this.buffer.duration > 30) window.__audioStarts.push({ dur: +this.buffer.duration.toFixed(3), loopEnd: +this.loopEnd.toFixed(3), at: performance.now() }); return orig.apply(this, a); };
  });
  log.url = `${base}?s6=1&stage=6&demo=1&story=0&rs=1${rand ? '&rand=1' : ''}`;
  await page.goto(log.url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__stage?.riley, null, { timeout: 90000 });
  await page.mouse.click(640, 360);
  await page.evaluate(async () => { const a = await import('./src/audio.js'); a.unlock(); window.__audio = a; });
  await page.waitForFunction(() => window.__stage?.started, null, { timeout: 90000 });
  await page.evaluate(() => { window.__game.loop.stop(); window.__stage.god = true; window.__t = window.__game.loop.now; });
  const want = new Map([
    // Waits for the HUD title card to finish fading so the docks plate is not under it.
    ['zone0-docks', s => s.zoneI === 0 && s.enemies.some(e => e.alive) && !window.__game.scene.scenes.find(x => x.card)?.card?.list?.length],
    ['zone1-seagate-defenders', s => s.zoneI === 1 && s.kit?.view && s.camX >= 1200 && !s.enemies.some(e => e.state === 'drop')],
    // The quay/hall floor seam (Great Hall zone edge) near the middle of the screen.
    ['floor-seam-greathall', s => { const e = s.kit?.stage?.zones?.[2]?.l ?? 2560; return s.camX >= e - 760 && s.camX <= e - 400; }],
    ['grayman', s => s.enemies.some(e => e.type === 'grayman' && e.alive && (e.state === 'attack' || e.state === 'lunge'))],
    ['zone2-greathall', s => s.zoneI === 2 && s.camX >= 2500],
    ['fadelt-attack', s => s.enemies.some(e => e.type === 'fadelt' && e.alive && e.state === 'attack')],
    ['fadelt', s => s.enemies.some(e => e.type === 'fadelt' && e.alive && e.state !== 'blink' && e.x > s.camX + 60 && e.x < s.camX + 1220)],
    ['zone3-heart-callandor', s => s.zoneI === 3 && s.boss && s.boss.phase === 1 && s.camX >= 3880],
    ['belal-midfight', s => s.boss && s.boss.phase === 2 && (s.boss.state === 'attack' || s.boss.state === 'tell')],
    ['callandor-flaring', s => s.boss && s.boss.phase >= 3 && s.boss.alive && Math.abs(s.boss.x - 4560) > 160 && Math.abs(s.riley.x - 4560) > 120],
    ['rand-strike', s => !!s.kit?.strike?.rand],
  ]);
  if (only.length) for (const k of [...want.keys()]) if (!only.includes(k)) want.delete(k);
  const taken = new Set();
  for (let batch = 0; batch < 2400 && taken.size < want.size; batch++) {
    const st = await page.evaluate(() => {
      const g = window.__game;
      for (let i = 0; i < (window.__stage.zoneI === 2 ? 4 : 15) && !window.__stage.clearShown; i++) { window.__t += 1000 / 60; g.headlessStep(window.__t, 1000 / 60); }
      const s = window.__stage, m = window.__audio?.musicState?.();
      return { zone: s.zoneI, camX: s.camX, phase: s.boss?.phase || 0, done: !!s.clearShown, music: m?.current, decoded: m?.decoded };
    });
    const m = `${st.music}|${(st.decoded || []).join(',')}`;
    if (log.music.at(-1)?.m !== m) log.music.push({ m, zone: st.zone, phase: st.phase });
    for (const [name] of want) {
      if (taken.has(name)) continue;
      const hit = await page.evaluate(`(${want.get(name).toString()})(window.__stage)`);
      if (!hit) continue;
      await page.evaluate(() => window.__game.step(window.__t, 0));
      const file = `${out}/${name}.png`;
      await page.screenshot({ path: file });
      const actors = await page.evaluate(() => window.__stage.enemies.filter(e => e.alive).map(e => ({ type: e.type, state: e.state, x: Math.round(e.x), y: Math.round(e.y), z: Math.round(e.z || 0) })));
      taken.add(name); log.shots.push({ name, file, zone: st.zone, phase: st.phase, camX: Math.round(st.camX), actors });
    }
    if (st.done) break;
  }
  log.audioStarts = await page.evaluate(() => window.__audioStarts);
  log.notTaken = [...want.keys()].filter(k => !taken.has(k));
  log.final = await page.evaluate(() => ({ ended: window.__stage.ended, clear: window.__stage.clearShown, music: window.__audio?.musicState?.(),
    painted: ['s6belal', 's6gray', 's6fade', 's6rand', 's6def', 's6call', 's6lamp', 's6oil', 's6net', 's6streak', 's6hatch', 's6ribbon', 'crate', 'bg6mid', 'bg6mid3', 'bg6far']
      .map(k => [k, window.__game.textures.exists(k) ? (window.__game.textures.get(k).source[0].isCanvas ? 'canvas' : 'file') : 'absent']) }));
} finally { await browser.close(); }
writeFileSync(`${out}/art-shots${only.length ? '-' + only.join('-') : ''}.json`, JSON.stringify(log, null, 1));
console.log(JSON.stringify({ shots: log.shots.map(s => s.name), notTaken: log.notTaken, audioStarts: log.audioStarts, music: log.music, errors: log.errors, final: log.final }, null, 1));
