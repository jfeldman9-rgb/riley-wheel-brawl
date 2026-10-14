// Serve the repository with python3 -m http.server, then:
// RWB_URL=http://127.0.0.1:8078 node tools/stage7/esc-cdp-check.cjs
// No skip=boss or debug-start: updateZones/startBoss owns the boss introduction.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/home/box/.local/lib/node_modules/playwright');
const base = process.env.RWB_URL || 'http://127.0.0.1:8078/';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function snapshot(page) {
  return page.evaluate(() => {
    const s = window.__stage, k = s.input.keyboard;
    return { paused: s.paused, manual: s.pauseReasons.has('manual'), cutscene: !!s.cutscene,
      capT: s.hud.capT, who: s.hud.capWho.text, pauseLabel: s.hud.pauseLabel.visible,
      held: !!s.inp.held.pause, buffered: s.inp.peek('pause'),
      phaser: { down: !!k.keys[27]?.isDown, justDown: !!k.keys[27]?._justDown,
        queue: k.manager.queue.filter(e => e.keyCode === 27).length },
      observedFrames: window.__escWatch?.frames || 0,
      frameFailures: window.__escWatch?.failures || [], trace: window.__escTrace };
  });
}
async function esc(page, hold, type = 'rawKeyDown') {
  const cdp = await page.context().newCDPSession(page);
  const key = { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 };
  await cdp.send('Input.dispatchKeyEvent', { ...key, type });
  if (hold) {
    for (let elapsed = 0; elapsed < hold; elapsed += 40) {
      await sleep(Math.min(40, hold - elapsed));
      await cdp.send('Input.dispatchKeyEvent', { ...key, type: 'keyDown', autoRepeat: true });
    }
  }
  await cdp.send('Input.dispatchKeyEvent', { ...key, type: 'keyUp' });
  await cdp.detach();
  await sleep(500); // Beyond the old 350ms echo guard, and across gameplay frames.
}
async function watchDismissal(page) {
  await page.evaluate(() => { window.__escTrace = []; window.__escWatch = { frames: 0, failures: [] }; });
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
    args: ['--use-gl=swiftshader', '--no-sandbox'] });
  const checks = [], errors = [];
  const newPage = async story => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '?stage=7&s7=1' + (story ? '' : '&story=0'));
    await page.waitForFunction(() => window.__stage?.hudReady, null, { timeout: 60000 });
    const cdp = await page.context().newCDPSession(page);
    for (const type of ['rawKeyDown', 'keyUp']) await cdp.send('Input.dispatchKeyEvent',
      { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await cdp.detach();
    await page.waitForFunction(() => window.__stage?.started, null, { timeout: 60000 });
    await page.evaluate(() => {
      const s = window.__stage;
      window.__escTrace = [];
      for (const method of ['onPress', 'setPauseReason']) {
        const original = s[method];
        s[method] = function (...args) {
          window.__escTrace.push({ method, args, event: window.event?.type, phase: window.event?.eventPhase });
          return original.apply(this, args);
        };
      }
      // Observe the real plugin; do not add any pause handlers or change input routing.
      s.input.keyboard.addKey(27, false);
      s.input.keyboard.on('keydown-ESC', () => window.__escTrace.push({ method: 'phaserEsc' }));
      const frame = () => {
        const w = window.__escWatch;
        if (w && !s.cutscene) {
          w.frames++;
          if (s.paused || s.inp.held.pause || s.inp.peek('pause') ||
              s.input.keyboard.keys[27].isDown || s.input.keyboard.keys[27]._justDown)
            w.failures.push({ frame: w.frames, paused: s.paused,
              held: !!s.inp.held.pause, buffered: s.inp.peek('pause') });
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    return page;
  };
  try {
    for (const hold of [0, 120]) for (let run = 1; run <= 3; run++) {
      const page = await newPage(false);
      await page.evaluate(() => {
        const s = window.__stage;
        s.pending = []; s.enemies.forEach(e => e.destroy()); s.enemies = [];
        s.zoneI = 2; s.zone = null; s.locked = false;
        s.riley.x = 4200; s.camX = s.camMax = 3920; s.bounds = { l: 3920, r: 5200 };
      });
      await page.waitForFunction(() => window.__stage.boss && window.__stage.hud.capT > 0 &&
        window.__stage.hud.capWho.text === 'ASMODEAN', null, { timeout: 60000 });
      const before = await snapshot(page);
      await watchDismissal(page);
      await esc(page, hold, run === 2 ? 'keyDown' : 'rawKeyDown');
      const after = await snapshot(page);
      checks.push({ check: 'liveBossDialog', run, holdMs: hold,
        pass: before.capT > 0 && after.capT <= 0 && !after.paused && !after.pauseLabel &&
          !after.held && !after.buffered && !after.phaser.down && !after.phaser.justDown &&
          after.observedFrames > 0 && !after.frameFailures.length &&
          !after.trace.some(e => e.method === 'phaserEsc'), before, after });
      await page.evaluate(() => { window.__escWatch = null; });
      await esc(page, 0);
      const fresh = await snapshot(page);
      checks.push({ check: 'freshGameplayEsc', run, holdMs: hold, pass: fresh.paused && fresh.manual && fresh.pauseLabel, after: fresh });
      await page.close();
    }
    for (const atMs of [2500, 6000]) for (const hold of [0, 120]) {
      const page = await newPage(true);
      await page.waitForFunction(() => !!window.__stage.cutscene, null, { timeout: 60000 });
      await sleep(atMs);
      const before = await snapshot(page);
      await watchDismissal(page);
      await esc(page, hold);
      const after = await snapshot(page);
      checks.push({ check: 'openingStoryEsc', atMs, holdMs: hold,
        pass: before.cutscene && !after.cutscene && !after.paused && !after.pauseLabel &&
          !after.held && !after.buffered && !after.phaser.down && !after.phaser.justDown &&
          after.observedFrames > 0 && !after.frameFailures.length &&
          !after.trace.some(e => e.method === 'phaserEsc'), before, after });
      await page.evaluate(() => { window.__escWatch = null; });
      await esc(page, 0);
      const fresh = await snapshot(page);
      checks.push({ check: 'freshGameplayEscAfterStory', atMs, holdMs: hold, pass: fresh.paused && fresh.manual, after: fresh });
      await page.close();
    }
  } catch (error) { errors.push(error.stack); }
  finally { await browser.close(); }
  const pass = checks.length === 20 && checks.every(row => row.pass) && !errors.length;
  console.log(JSON.stringify({ pass, checks, errors }, null, 2));
  if (!pass) process.exitCode = 1;
})();
