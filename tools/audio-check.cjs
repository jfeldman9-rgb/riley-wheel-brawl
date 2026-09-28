'use strict';
// Browser audio check: music unlock + loop points, M toggle + localStorage, a narrator
// line and a boss line actually playing, and a stage cold enter + 10 s mid-fight with
// the music running.  node tools/audio-check.cjs [url] [--shot=path]
// Without a url it serves this checkout on 127.0.0.1. Needs optional Playwright.
const fs = require('fs'), path = require('path'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('audio-check.cjs requires optional Playwright'); process.exit(2); }
const root = path.resolve(__dirname, '..');
const arg = process.argv.slice(2).find(a => !a.startsWith('--'));
const shot = (process.argv.find(a => a.startsWith('--shot=')) || '').slice(7);
const TYPES = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const server = http.createServer((req, res) => {
  const clean = decodeURIComponent(req.url.split('?')[0]), file = path.join(root, clean === '/' ? 'index.html' : clean);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
});
const results = []; const check = (ok, name, info) => { results.push({ ok: !!ok, name }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
(async () => {
  let browser;
  try {
    let url = arg;
    if (!url) { await new Promise(r => server.listen(0, '127.0.0.1', r)); url = 'http://127.0.0.1:' + server.address().port + '/'; }
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-accelerated-2d-canvas'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const consoleErrors = [], pageErrors = [], missing = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) missing.push(r.status() + ' ' + r.url()); });
    // Stand-in for a dropped-in recording (a shipped villain clip served under Riley's
    // file name), to prove the drop-in path. Riley's real voice is never generated.
    const standIn = fs.readFileSync(path.join(root, 'assets/audio/voice/taim_phase_01.mp3'));
    await page.route(/\/assets\/audio\/voice\/riley_fire_01\.mp3/, r => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: standIn }));
    await page.goto(url);
    await page.waitForFunction(() => window.RWB && RWB.assets && RWB.assets.done && RWB.game && RWB.game.scene, null, { timeout: 120000 });
    const before = await page.evaluate(() => ({ scene: RWB.game.scene.constructor.name, state: RWB.audio.track, unlocked: RWB.audio.unlocked }));
    check(before.scene === 'Title' && !before.unlocked && !(before.state && before.state.playing), 'Before any gesture the title is silent (autoplay rule)', before);
    await page.keyboard.press('Shift'); // first key press = the gesture that unlocks audio
    await page.waitForFunction(() => RWB.audio.track && RWB.audio.track.playing, null, { timeout: 60000 });
    const music = await page.evaluate(() => RWB.audio.track);
    check(music.loaded && music.playing && music.name === 'main', 'First key press starts the music track on the title', { url: music.url, duration: +music.duration.toFixed(3), loopStart: +music.loopStart.toFixed(3), loopEnd: +music.loopEnd.toFixed(3) });
    check(music.duration > 158 && music.loopEnd <= music.duration && music.loopEnd - music.loopStart > 127, 'Loop points sit inside the decoded track', { loopSeconds: +(music.loopEnd - music.loopStart).toFixed(3) });
    await page.keyboard.press('m');
    await page.waitForTimeout(200);
    const off = await page.evaluate(() => ({ level: RWB.audio.musicLevel, playing: RWB.audio.track.playing, saved: JSON.parse(localStorage.getItem('rwb-settings') || localStorage.getItem(Object.keys(localStorage).find(k => /setting/i.test(k)) || '') || '{}').music }));
    check(off.level === 0 && !off.playing && off.saved === 0, 'M turns the music off and saves it', off);
    await page.keyboard.press('m');
    await page.waitForTimeout(600);
    const on = await page.evaluate(() => ({ level: RWB.audio.musicLevel, playing: RWB.audio.track.playing, pos: +RWB.audio.track.position.toFixed(2) }));
    check(on.level > 0 && on.playing, 'M turns it back on where it left off', on);
    // Stage 2 intro card: narrator line with its caption.
    await page.evaluate(() => { const R = RWB; R.game.setSceneNow(new R.scenes.Reel(R.game, R.CAPTIONS.stage2, () => new R.scenes.Title(R.game), R.LEVELS[1].name, 1)); R.game.fade = 0; R.game.fadeDir = 0; });
    await page.waitForFunction(() => RWB.audio.voicePlaying === 'st2_narrator_01', null, { timeout: 20000 });
    const nar = await page.evaluate(() => ({ voice: RWB.audio.voicePlaying, music: RWB.audio.track.playing, trace: RWB.audio.trace.filter(t => /clip:|track/.test(t.name)).map(t => t.name) }));
    check(nar.voice === 'st2_narrator_01' && nar.music, 'Narrator intro plays over the music on the Caemlyn card', nar);
    await page.waitForTimeout(2600);
    if (shot) { await page.screenshot({ path: shot, type: shot.endsWith('.png') ? 'png' : 'jpeg', ...(shot.endsWith('.png') ? {} : { quality: 90 }) }); console.log('screenshot', shot); }
    // Boss entrance line (Taim) plays from the subtitle queue.
    await page.evaluate(() => { const R = RWB, s = new R.scenes.Play(R.game, 4, { lives: 99, callandor: true }); R.game.setSceneNow(s); R.game.fade = 0; R.game.fadeDir = 0; s.wave = 5; s.spawnWave(5); });
    await page.waitForFunction(() => RWB.audio.voicePlaying === 'taim_phase_01', null, { timeout: 20000 });
    check(true, 'Taim entrance line plays when the boss arrives', await page.evaluate(() => ({ voice: RWB.audio.voicePlaying, subtitle: RWB.game.scene.subtitle && RWB.game.scene.subtitle.line.text })));
    await page.waitForTimeout(500);
    await page.waitForTimeout(2500);
    const kid = await page.evaluate(async () => {
      const R = RWB, a = R.audio;
      const placeholder = await a.loadClip('riley_super_01', R.voiceUrl('riley_super_01'), { minDuration: 0.25 });
      await a.loadClip('riley_fire_01', R.voiceUrl('riley_fire_01'), { minDuration: 0.25 });
      const dropped = R.voice('riley_fire_01');
      return { placeholderIgnored: placeholder === null, droppedPlays: dropped && a.voicePlaying === 'riley_fire_01', bubble: R.game.scene.bark && R.game.scene.bark.line.text };
    });
    check(kid.placeholderIgnored && kid.droppedPlays && kid.bubble === 'Fire!', 'Kid lines: silent placeholder is ignored (chirp + bubble); a dropped-in riley_fire_01.mp3 plays automatically', kid);
    // Cold enters (fresh page per stage, music already playing) and 10 s fights.
    const measure = async (level, wave, seconds) => {
      const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      p.on('pageerror', e => pageErrors.push(e.message));
      p.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      p.on('response', r => { if (r.status() >= 400) missing.push(r.status() + ' ' + r.url()); });
      await p.goto(url);
      await p.waitForFunction(() => window.RWB && RWB.assets && RWB.assets.done && RWB.game && RWB.game.scene, null, { timeout: 120000 });
      await p.keyboard.press('Shift');
      await p.waitForFunction(() => RWB.audio.track && RWB.audio.track.playing, null, { timeout: 60000 });
      await p.waitForTimeout(1500);
      const r = await p.evaluate(async ({ level, wave, seconds }) => {
        const R = RWB, s = new R.scenes.Play(R.game, level, { wave, lives: 99, callandor: level === 4 });
        const t0 = performance.now(); R.game.setSceneNow(s); R.game.fade = 0; R.game.fadeDir = 0;
        R.perf.runtimeLite = false; R.perf.lite = false; R.perf.quality = 1; R.perf.observe = () => {};
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const enterMs = performance.now() - t0;
        if (!seconds) return { enterMs: +enterMs.toFixed(1), music: R.audio.track.playing };
        let n = 0; const pressed = R.input.pressed;
        R.input.beginFrame = () => { n++; for (const k in pressed) delete pressed[k]; if (n % 24 === 0) pressed.attack = true; if (n % 97 === 0) pressed.special = true; if (n % 181 === 0) pressed.jump = true; s.player.hp = s.player.hpMax; };
        R.input.axis = () => { const e = s.enemies.filter(x => !x.dead).sort((a, b) => Math.abs(a.x - s.player.x) - Math.abs(b.x - s.player.x))[0]; return e ? { x: Math.abs(e.x - s.player.x) > 45 ? Math.sign(e.x - s.player.x) : 0, y: Math.abs(e.y - s.player.y) > 8 ? Math.sign(e.y - s.player.y) * .7 : 0 } : { x: 0, y: 0 }; };
        const gaps = []; let prior = performance.now(); const start = prior;
        await new Promise(done => { const tick = t => { gaps.push(t - prior); prior = t; if (t - start < seconds * 1000) requestAnimationFrame(tick); else done(); }; requestAnimationFrame(tick); });
        gaps.shift();
        const sorted = [...gaps].sort((a, b) => a - b);
        return { enterMs: +enterMs.toFixed(1), frames: gaps.length, fps: +(gaps.length / seconds).toFixed(1), p99: +sorted[Math.floor((sorted.length - 1) * 0.99)].toFixed(1), over33: gaps.filter(g => g > 33).length, over34: gaps.filter(g => g > 34).length, max: +sorted[sorted.length - 1].toFixed(1), music: R.audio.track.playing, voices: R.audio.trace.filter(t => /^clip:/.test(t.name)).length };
      }, { level, wave, seconds });
      await p.close();
      return r;
    };
    const enters = [];
    for (let level = 0; level < 5; level++) enters.push((await measure(level, 0, 0)).enterMs);
    check(enters.every(ms => ms < 400), 'Every stage cold enter (wave 0, fresh page, music playing) is under 400 ms', { enterMs: enters });
    for (const [level, wave] of [[0, 3], [4, 3], [3, 5]]) {
      const f = await measure(level, wave, 10);
      // over33 counts single missed vsyncs (33.3 ms) too; on a shared headless box those
      // also show up without audio, so the pass line is fps >= 59 and nothing over 34 ms.
      check(f.fps >= 59 && f.over34 === 0 && f.music, 'Stage ' + (level + 1) + ' wave ' + wave + ': ~60 fps mid-fight with music on, no frame over 34 ms (over33 = ' + f.over33 + ')', f);
    }
    check(pageErrors.length === 0 && consoleErrors.length === 0 && missing.length === 0, 'No script errors, no console errors, no failed requests (all pages)', { pageErrors, consoleErrors, missing });
  } catch (e) { check(false, 'audio check crashed: ' + e.message); }
  finally { if (browser) await browser.close(); server.close(); }
  const failed = results.filter(r => !r.ok).length;
  console.log(failed ? failed + ' audio checks failed.' : results.length + ' audio checks passed.');
  process.exitCode = failed ? 1 : 0;
})();
