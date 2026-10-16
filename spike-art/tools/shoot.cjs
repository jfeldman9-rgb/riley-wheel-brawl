const { chromium } = require('playwright');
(async () => {
  const url = process.argv[2] || 'http://localhost:8765/?demo=1';
  const out = process.argv[3] || '/workspace/rwb-2/spike/shots';
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errs = []; p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto(url); await p.waitForTimeout(4000);
  for (let i = 0; i < 6; i++) { await p.screenshot({ path: `${out}/proto-test-${i}.png` }); await p.waitForTimeout(900); }
  const st = await p.evaluate(() => { const s = window.__spike; return s ? { R: s.R.state, T: s.T.state, fr: window.__perf.frames.length } : null; });
  console.log(JSON.stringify(st)); console.log(errs.slice(0, 20).join('\n'));
  await b.close();
})();
