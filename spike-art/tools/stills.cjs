// Deterministic stills: lit vs unlit, fireball light, hit-stop spark. Steps the game at 1/60 s.
const { chromium } = require('playwright');
(async () => {
  const out = '/workspace/rwb-2/spike/shots';
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: +(process.env.DPR||1) });
  await p.goto('http://localhost:8765/?clean=1&rs='+(process.env.DPR||1)+'&capture=1'); await p.waitForFunction(() => window.__spike && window.__spike.R, null, { timeout: 90000 });
  await p.evaluate(() => { window.__game.loop.sleep(); window.__t = performance.now(); });
  const step = (n) => p.evaluate((n) => { for (let i = 0; i < n; i++) { window.__t += 1000 / 60; window.__game.step(window.__t, 1000 / 60); } }, n);
  const c = await p.$('canvas');
  await p.evaluate(() => { const s = __spike; s.R.x = 470; s.R.y = 640; s.T.x = 860; s.T.y = 632; s.T.cool = 99; });
  await step(90);
  await p.screenshot({ path: `${out}/still-lit.png` });
  await p.evaluate(() => __spike.toggleLights()); await step(1); await p.screenshot({ path: `${out}/still-unlit.png` });
  await p.evaluate(() => __spike.toggleLights()); await step(1);
  await p.evaluate(() => { __spike.buffer.fire = 0.3; }); await step(22); await p.screenshot({ path: `${out}/still-fireball-light.png` });
  await step(40);
  await p.evaluate(() => { const s = __spike; s.T.x = s.R.x + 170; s.T.y = s.R.y; s.setState(s.T, 'walk'); s.T.hp = 5; s.T.cool = 99; }); await step(150);
  await p.evaluate(() => { __spike.buffer.atk = 0.3; });
  for (let i = 0; i < 30; i++) { await step(1); const hs = await p.evaluate(() => __spike.hitstop); if (hs > 0) { await p.screenshot({ path: `${out}/still-hitstop-spark.png` }); break; } }
  console.log('done'); await b.close();
})();
