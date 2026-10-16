// Offline deterministic render: steps the Phaser game at exactly 1/60 s per frame and screenshots each frame.
// This shows what the game looks like at 60 fps; it is NOT a device performance measurement.
const { chromium } = require('playwright'); const fs = require('fs'); const { execSync } = require('child_process');
(async () => {
  const url = process.argv[2], out = process.argv[3], frames = +process.argv[4] || 600, rs = +(process.argv[5] || 1);
  const dir = '/tmp/rv_' + Date.now(); fs.mkdirSync(dir);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: rs });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url); await p.waitForFunction(() => window.__spike && window.__spike.R, null, { timeout: 60000 });
  await p.evaluate(() => { window.__game.loop.sleep(); window.__t = performance.now(); });
  const canvas = await p.$('canvas');
  for (let i = 0; i < frames; i++) {
    await p.evaluate(() => { window.__t += 1000 / 60; window.__game.step(window.__t, 1000 / 60); });
    await canvas.screenshot({ path: `${dir}/${String(i).padStart(5, '0')}.png` });
    if (process.argv[6] && process.argv[6].split(',').map(Number).includes(i)) fs.copyFileSync(`${dir}/${String(i).padStart(5, '0')}.png`, `${out.replace(/\.mp4$/, '')}-f${i}.png`);
  }
  execSync(`ffmpeg -y -loglevel error -framerate 60 -i ${dir}/%05d.png -vf "scale=1280:-2" -c:v libx264 -pix_fmt yuv420p -crf 18 ${out}`);
  console.log('wrote', out, 'errors:', errs.slice(0, 5));
  await b.close();
})();
