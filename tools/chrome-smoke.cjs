#!/usr/bin/env node
/* Chrome smoke on the software raster path: real mouse clicks on ATK and BOX,
   BOX turns into PICK UP while the relic is out and back once it's picked up,
   the same in Classic 640x360, then a busy village fight timed at 1280x720 DPR 1.
   Usage: node tools/chrome-smoke.cjs [shotDir]   (needs google-chrome and python3) */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const shots = process.argv[2] || null;
if (shots) fs.mkdirSync(shots, { recursive: true });
const HTTP = 8765 + Math.floor(Math.random() * 400), CDP = HTTP + 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, what, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + what + (extra ? '  ' + extra : '')); if (!ok) failed++; };

const server = spawn('python3', ['-m', 'http.server', String(HTTP), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const profile = fs.mkdtempSync('/tmp/rwb-chrome-');
const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--mute-audio',
  '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
  '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
const done = code => { chrome.kill('SIGKILL'); server.kill('SIGKILL'); process.exit(code); };

(async () => {
  let tabs;
  for (let i = 0; i < 100 && !tabs; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); } catch { await sleep(100); } }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  let id = 0;
  const waiting = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; waiting.set(i, m => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async expr => {
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text);
    return r.result.value;
  };
  const shot = async name => { if (!shots) return; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(shots, name + '.png'), Buffer.from(s.data, 'base64')); };
  const viewport = (width, height, dpr) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
  // World (640x360) point to a CSS pixel on the canvas.
  const at = (wx, wy) => js(`const r = document.querySelector('canvas').getBoundingClientRect(); return [r.left + ${wx} * r.width / RWB.W, r.top + ${wy} * r.height / RWB.H];`);
  const click = async (wx, wy) => {
    const [x, y] = await at(wx, wy);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
    await sleep(90);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
  };
  await viewport(1280, 720, 1);
  await send('Page.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${HTTP}/index.html` });
  for (let i = 0; i < 200; i++) { if (await js('return !!(window.RWB && RWB.game && RWB.game.scene instanceof RWB.scenes.Title)').catch(() => false)) break; await sleep(100); }
  check(await js('return RWB.game.scene instanceof RWB.scenes.Title'), 'boots to the title');
  check(await js(`return !!RWB.art.plate('village-far') && RWB.art.has('riley')`), 'painted atlases and urn load over HTTP');
  const stamp = await js(`return [...document.scripts].map(s => (s.src.match(/v=([\\w-]+)/) || [])[1]).filter(Boolean)`);
  check(stamp.length > 5 && stamp.every(v => v === '20260926-g1'), 'every script served with ?v=20260926-g1');
  const imgs = await js(`return performance.getEntriesByType('resource').map(e => e.name).filter(n => /assets\\/art\\//.test(n))`);
  check(imgs.length >= 15 && imgs.every(n => /\\?v=20260926-g1/.test(n)), 'painted art requested with ?v=20260926-g1', imgs.length + ' art requests');
  check((await js('return RWB.assets.criticalMissing().length')) === 0, 'no critical painted art missing, no failure banner');

  // Watch what the touch/mouse layer draws so the BOX badge can be checked.
  await js(`
    const orig = RWB.input.drawTouch;
    RWB.input.drawTouch = function (ctx, o) { window.__touchOpts = o; return orig.apply(this, arguments); };
    window.__errors = [];
    window.addEventListener('error', e => window.__errors.push(String(e.message)));
  `);
  const toPlay = async () => {
    await js('RWB.game.debug.play(0); RWB.game.debug.invuln(true);');
    for (let i = 0; i < 100; i++) { if (await js('return RWB.game.scene instanceof RWB.scenes.Play && RWB.game.fadeDir === 0')) break; await sleep(50); }
    await js(`const s = RWB.game.scene; s.banner = null; s.bannerT = 0; s.tutorialT = 0; s.phase = 'play';`);
    await sleep(300);
  };
  const BTN = { attack: [640 - 118, 360 - 62], tool: [640 - 60, 360 - 34] };

  async function controls(label) {
    await toPlay();
    check(await js('return !!(window.__touchOpts && window.__touchOpts.always)'), `${label}: whole-fight controls are drawn`);
    // ATK by mouse
    await js(`const p = RWB.game.scene.player; p.setState('idle'); window.__atk = 0; const o = p.setState.bind(p); p.setState = (st, ...a) => { if (st === 'attack') window.__atk++; return o(st, ...a); };`);
    await click(...BTN.attack);
    await sleep(200);
    check(await js('return window.__atk > 0 || RWB.game.scene.player.state === "attack"'), `${label}: mouse click on ATK attacks`);
    await sleep(500);
    // BOX by mouse: the relic flies, the badge turns into PICK UP
    await js(`const p = RWB.game.scene.player; p.setState('idle'); p.hasRelic = true;`);
    await click(...BTN.tool);
    await sleep(700);
    const thrown = await js('const s = RWB.game.scene; return { has: s.player.hasRelic, flying: s.projectiles.some(p => p.kind === "relic"), pickup: s.pickups.some(p => p.kind === "relic") }');
    check(!thrown.has && (thrown.flying || thrown.pickup), `${label}: mouse click on BOX throws the relic`, JSON.stringify(thrown));
    await sleep(900);
    check(await js('return window.__touchOpts && window.__touchOpts.hasRelic === false'), `${label}: BOX reads PICK UP while the relic is out`);
    await shot(label.toLowerCase().replace(/\W+/g, '-') + '-pick-up');
    // walk riley onto the dropped box
    await js(`const s = RWB.game.scene, b = s.pickups.find(p => p.kind === 'relic'); if (b) { s.player.x = b.x - 8; s.player.y = b.y; }`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    await sleep(400);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    await sleep(200);
    check(await js('return RWB.game.scene.player.hasRelic && window.__touchOpts.hasRelic !== false'), `${label}: walking over the box recovers it, BOX is back`);
  }

  await js(`RWB.display.setMode('auto')`);
  await controls('Auto 1280x720');
  await js(`RWB.display.setMode('classic')`);
  await sleep(200);
  const cls = await js('const c = document.querySelector("canvas"); return [c.width, c.height, RWB.display.mode]');
  check(cls[0] === 640 && cls[1] === 360, 'Classic backs the canvas at 640x360', cls.join('x'));
  await controls('Classic');
  await js(`RWB.display.setMode('auto')`);

  // Frame budget: a crowded village fight on the software path, rAF-paced.
  await viewport(1280, 720, 1);
  await sleep(300);
  await toPlay();
  await js(`
    const s = RWB.game.scene; RWB.perf.runtimeLite = false;
    s.locked = true; s.player.x = s.camX + 260; s.player.y = 280;
    for (const [t, dx, dy] of [['trolloc', 80, -10], ['assassin', 150, -40], ['trollocCaptain', -90, 20], ['trollocCaptain', 190, 30], ['Darkfriend', -150, -30], ['trollocCaptain', 40, 50]]) s.spawnEnemy(t, s.player.x + dx, s.player.y + dy, { side: dx > 0 ? 1 : -1 });
  `);
  const perf = await js(`
    const s = RWB.game.scene, P = RWB.scenes.Play.prototype, od = s.draw;
    let work = [];
    s.draw = function (ctx) { const t0 = performance.now(); od.call(this, ctx); work.push(performance.now() - t0); };
    const beat = setInterval(() => { s.fx.turnedAshaman(s.player.x + 30, s.player.y - 40, true); s.fx.battleDebris(s.player.x + 30, s.player.y - 40, 'trolloc'); }, 250);
    let frames = 0, run = true;
    const tick = () => { frames++; if (run) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    await new Promise(r => setTimeout(r, 1000)); frames = 0; work = [];
    const t0 = performance.now();
    await new Promise(r => setTimeout(r, 5000));
    run = false; clearInterval(beat);
    const secs = (performance.now() - t0) / 1000;
    work.sort((a, b) => a - b);
    return { fps: frames / secs, drawMs: work.reduce((a, b) => a + b, 0) / work.length, p95: work[Math.floor(work.length * 0.95)], lite: RWB.perf.runtimeLite || RWB.perf.lite, scale: RWB.display.renderScale, fx: s.fx.list.length };
  `);
  check(perf.fps >= 55 && !perf.lite, 'village fight at 1280x720 on the software path holds ~60 fps', `${perf.fps.toFixed(1)} fps, draw ${perf.drawMs.toFixed(2)} ms avg / ${perf.p95.toFixed(2)} ms p95, ${perf.fx} fx, ${perf.scale}x`);
  await shot('perf-1280x720');

  // Story: painted urn versioned and loaded, the opening is scored (real signal on the
  // master bus, not just calls), keys advance and skip, and the reel holds frame rate.
  await js(`await RWB.assets.ready(['story'])`);
  const story = await js(`return performance.getEntriesByType('resource').map(e => e.name).filter(n => /assets\\/cutscenes\\//.test(n))`);
  check(story.length >= 15 && story.every(n => /\\?v=20260926-g1/.test(n)), 'story urn requested with ?v=20260926-g1', story.length + ' plate requests');
  check(await js(`return RWB.assets.STORY.every(n => !!RWB.assets.get('story:' + n))`), 'every story plate decoded');
  check(await js('return RWB.audio.unlocked'), 'audio unlocked by a real key press');
  await js('RWB.audio.trace.length = 0; RWB.game.startNewGame(true);');
  for (let i = 0; i < 100; i++) { if (await js('return RWB.game.scene instanceof RWB.scenes.Cutscene && RWB.game.fadeDir === 0')) break; await sleep(50); }
  const scored = await js(`
    let peak = 0, frames = 0, run = true;
    const tick = () => { frames++; peak = Math.max(peak, RWB.audio.level()); if (run) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const t0 = performance.now();
    await new Promise(r => setTimeout(r, 3500));
    run = false;
    const s = RWB.game.scene;
    return { peak, fps: frames / ((performance.now() - t0) / 1000), song: RWB.audio.song, playing: RWB.audio.playing, cues: RWB.audio.trace.map(c => c.name), plate: !!RWB.assets.get('story:' + s.beat.plate), beat: s.i, line: s.currentLine() };
  `);
  check(scored.playing && scored.song === 'story', 'music bed plays under the opening', scored.song);
  check(scored.cues.includes('stinger:alarm') && scored.cues.includes('voLine') && scored.cues.includes('babble'), 'opening card 1 fires its stinger and VO chirps', [...new Set(scored.cues)].join(','));
  check(scored.peak > 0.01, 'opening is audible on the master bus (not silent)', 'peak ' + scored.peak.toFixed(3));
  check(scored.plate && scored.beat === 0, 'opening card 1 is on its painted plate');
  check(scored.fps >= 55, 'opening reel holds ~60 fps at 1280x720 on the software path', scored.fps.toFixed(1) + ' fps');
  await shot('story-opening-1');
  const key = async (k, code, vk) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk }); await sleep(60); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }); await sleep(120); };
  const before = await js('const s = RWB.game.scene; return [s.i, s.currentLine(), s.t]');
  for (let k = 0; k < 3; k++) await key('Enter', 'Enter', 13);
  const after = await js('const s = RWB.game.scene; return [s.i, s.currentLine(), s.t]');
  check(after[0] > before[0] || after[1] > before[1], 'Enter advances the dialogue / beat', JSON.stringify({ before, after }));
  await sleep(700);
  await shot('story-after-enter');
  await key('p', 'KeyP', 80);
  for (let i = 0; i < 60; i++) { if (await js('return RWB.game.scene instanceof RWB.scenes.Play')) break; await sleep(50); }
  check(await js('return RWB.game.scene instanceof RWB.scenes.Play && RWB.game.scene.levelIndex === 0'), 'P skips the story into stage 1');
  await js('RWB.game.levelComplete(0, RWB.game.scene.player)');
  for (let i = 0; i < 60; i++) { if (await js('return RWB.game.scene instanceof RWB.scenes.StoryBeat && RWB.game.fadeDir === 0')) break; await sleep(50); }
  await sleep(2500);
  const beat = await js(`const s = RWB.game.scene; return { urn: s.beats.map(b => b.plate).join(), cues: RWB.audio.trace.map(c => c.name).slice(-40), song: RWB.audio.song, peak: (() => { let p = 0; for (let i = 0; i < 20; i++) p = Math.max(p, RWB.audio.level()); return p; })() }`);
  check(beat.urn === 'stage1-clear,stage2-caemlyn', 'stage clear plays the outro, then the next stage intro', beat.urn);
  check(beat.cues.includes('stinger:fixed') && beat.song === 'story', 'StoryBeat is scored: stinger + music bed', beat.song);
  await shot('story-storybeat');
  const errs = await js('return window.__errors');
  check(!errs.length, 'no page errors', errs.join(' | '));

  // A painted file that won't load is retried once, then reported on screen.
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['*village-far.webp*', '*riley.webp*'] });
  const warns = [];
  await send('Runtime.enable');
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'warning') warns.push(m.params.args.map(a => a.value).join(' ')); });
  await send('Page.navigate', { url: `http://127.0.0.1:${HTTP}/index.html` });
  for (let i = 0; i < 200; i++) { if (await js('return !!(window.RWB && RWB.game && RWB.game.scene instanceof RWB.scenes.Title)').catch(() => false)) break; await sleep(100); }
  await sleep(400);
  const miss = await js('return RWB.assets.criticalMissing()');
  const retried = await js(`return performance.getEntriesByType('resource').filter(e => /village-far\\.webp/.test(e.name)).map(e => e.name)`);
  check(miss.includes('art:riley') && miss.includes('plate:village-far'), 'blocked riley/village-far are reported missing', miss.join(', '));
  check(warns.some(w => /painted art failed/.test(w)), 'console.warn names the failed keys', warns.join(' | '));
  const red = await js(`const c = document.querySelector('canvas'), g = c.getContext('2d'), s = c.width / RWB.W, d = g.getImageData(Math.round(RWB.W / 2 * s) - 100, Math.round(99 * s), 200, 4).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 90 && d[i + 1] < 40 && d[i + 2] < 40) n++; return n / (d.length / 4);`);
  check(red > 0.3, 'PAINTED ART FAILED TO LOAD banner is on the title', 'red ' + red.toFixed(2));
  await shot('art-failed-banner');
  await send('Network.setBlockedURLs', { urls: [] });
  console.log(failed ? `${failed} check(s) failed` : 'Chrome smoke: all checks passed');
  ws.close();
  done(failed ? 1 : 0);
})().catch(e => { console.error(e); done(1); });
