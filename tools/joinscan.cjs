'use strict';
// Read-only scan of baked mid plates. Renders each plate the way bakedPlate does
// and writes docs/review/joinscan.json. No pixels are rewritten.
const fs = require('fs'), path = require('path'), http = require('http');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('joinscan.cjs requires optional Playwright'); process.exit(2); }
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const clean = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, clean === '/' ? 'index.html' : clean);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
  const ext = path.extname(file);
  const types = { '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpeg': 'image/jpeg' };
  res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  let browser;
  try {
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-accelerated-2d-canvas'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/');
    await page.waitForFunction(() => window.RWB && RWB.assets.done && RWB.StageWorld && RWB.StageWorld.bakedPlate, { timeout: 90000 });
    const report = await page.evaluate(() => {
      const travel = 3600;
      function stats(canvas, worldW) {
        const w = canvas.width, h = canvas.height, d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
        const y0 = Math.floor(h * 0.15), y1 = Math.floor(h * 0.85);
        const E = new Float64Array(w), sky = new Int16Array(w), floor = new Int16Array(w);
        const raw = [];
        for (let x = 0; x < w; x++) {
          let sum = 0, n = 0, top = -1, bot = -1;
          for (let y = 0; y < h; y++) {
            const i = (y * w + x) * 4;
            if (d[i + 3] >= 240) { if (top < 0) top = y; bot = y; }
          }
          sky[x] = top; floor[x] = bot;
          if (x === 0) { E[x] = 0; continue; }
          for (let y = y0; y < y1; y++) {
            const i = (y * w + x) * 4, p = i - 4;
            sum += Math.abs(d[i] - d[p]) + Math.abs(d[i + 1] - d[p + 1]) + Math.abs(d[i + 2] - d[p + 2]);
            n++;
          }
          raw.push(n ? sum / n : 0);
          E[x] = n ? sum / n : 0;
        }
        const sorted = raw.slice().sort((a, b) => a - b);
        const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 1;
        for (let x = 1; x < w; x++) E[x] = med > 0 ? E[x] / med : 0;
        const ppu = w / worldW;
        const minPx = Math.ceil(40 * ppu);
        const windows = [];
        let run = null;
        for (let x = 1; x < w; x++) {
          const slope = x > 1 && sky[x] >= 0 && sky[x - 1] >= 0 ? Math.abs(sky[x] - sky[x - 1]) : 99;
          const quiet = E[x] <= 1.5 && slope <= 2;
          if (quiet) {
            if (!run) run = { x0: x, x1: x, maxE: E[x] };
            else { run.x1 = x; run.maxE = Math.max(run.maxE, E[x]); }
          } else if (run) {
            if (run.x1 - run.x0 + 1 >= minPx) windows.push(run);
            run = null;
          }
        }
        if (run && run.x1 - run.x0 + 1 >= minPx) windows.push(run);
        return {
          w, h, worldW: +worldW.toFixed(2), med: +med.toFixed(3), ppu: +ppu.toFixed(3),
          windows: windows.map(win => ({ x0: win.x0, x1: win.x1, u: +((win.x1 - win.x0 + 1) / ppu).toFixed(1), maxE: +win.maxE.toFixed(3) })),
          sky: Array.from(sky), floor: Array.from(floor), E: Array.from(E)
        };
      }
      function seamCost(a, b, a0, a1, b0, b1) {
        const ah = a.h, bh = b.h, aw = a1 - a0, bw = b1 - b0;
        const W = Math.min(aw, bw);
        if (W < 2) return null;
        const ad = a.ctx.getImageData(a0, 0, W, ah).data, bd = b.ctx.getImageData(b0, 0, W, bh).data;
        let prev = new Float64Array(W);
        const arg = new Array(ah);
        let skyD = 0, floorD = 0, rows = 0;
        for (let y = 0; y < ah; y++) {
          const yb = Math.min(bh - 1, Math.round(y * (bh - 1) / Math.max(1, ah - 1)));
          const next = new Float64Array(W), from = new Int16Array(W);
          for (let x = 0; x < W; x++) {
            const ia = (y * W + x) * 4, ib = (yb * W + x) * 4;
            const cost = Math.abs(ad[ia] - bd[ib]) + Math.abs(ad[ia + 1] - bd[ib + 1]) + Math.abs(ad[ia + 2] - bd[ib + 2]) + Math.abs(ad[ia + 3] - bd[ib + 3]);
            let best = x, bestV = prev[x];
            if (x > 0 && prev[x - 1] < bestV) { bestV = prev[x - 1]; best = x - 1; }
            if (x + 1 < W && prev[x + 1] < bestV) { bestV = prev[x + 1]; best = x + 1; }
            next[x] = (y ? bestV : 0) + cost; from[x] = best;
          }
          arg[y] = from; prev = next;
        }
        let x = 0; for (let i = 1; i < W; i++) if (prev[i] < prev[x]) x = i;
        const total = prev[x];
        const path = new Int16Array(ah);
        for (let y = ah - 1; y >= 0; y--) { path[y] = x; x = arg[y][x]; }
        for (let col = 0; col < W; col += Math.max(1, Math.floor(W / 16))) {
          let as = -1, bs = -1, af = -1, bf = -1;
          for (let y = 0; y < ah; y++) if (ad[(y * W + col) * 4 + 3] >= 240) { if (as < 0) as = y; af = y; }
          for (let y = 0; y < bh; y++) if (bd[(y * W + col) * 4 + 3] >= 240) { if (bs < 0) bs = y; bf = y; }
          if (as >= 0 && bs >= 0) { skyD += Math.abs(as / ah - bs / bh); floorD += Math.abs(af / ah - bf / bh); rows++; }
        }
        return { mean: +(total / ah).toFixed(2), sky: rows ? +(skyD / rows).toFixed(4) : null, floor: rows ? +(floorD / rows).toFixed(4) : null, overlapPx: W };
      }
      const plates = [], joins = [];
      for (let n = 1; n <= 5; n++) {
        const layout = RWB.StageWorld.midLayout(n, travel);
        const baked = [];
        for (const piece of layout.pieces) {
          const img = RWB.assets.get(piece.key); if (!img) continue;
          const fullH = piece.w * img.height / img.width;
          const drawH = /^stage4-mid/.test(piece.key) ? 248 : fullH;
          const canvas = RWB.StageWorld.bakedPlate(piece, drawH, 0); if (!canvas) continue;
          const st = stats(canvas, piece.w);
          const entry = { stage: n, id: piece.id, key: piece.key, x: +piece.x.toFixed(1), w: +piece.w.toFixed(1), seam: piece.seam || null, repeat: piece.repeat || null, sx0: piece.sx0 || 0, windows: st.windows, wpx: st.w, hpx: st.h, med: st.med };
          plates.push(entry);
          baked.push({ piece, canvas, ctx: canvas.getContext('2d'), st, entry });
        }
        for (let i = 1; i < baked.length; i++) {
          const left = baked[i - 1], right = baked[i];
          const ovU = (right.piece.seam && right.piece.seam.overlap) || right.piece.fade || 32;
          const lPx = Math.max(2, Math.round(ovU / left.piece.w * left.canvas.width));
          const rPx = Math.max(2, Math.round(ovU / right.piece.w * right.canvas.width));
          const a0 = Math.max(0, left.canvas.width - lPx), b1 = Math.min(right.canvas.width, rPx);
          const cost = seamCost(left, right, a0, left.canvas.width, 0, b1);
          joins.push({ stage: n, from: left.entry.id, to: right.entry.id, overlapU: +ovU.toFixed(2), cost });
        }
      }
      return { plates: plates.map(p => ({ stage: p.stage, id: p.id, key: p.key, x: p.x, w: p.w, seam: p.seam, repeat: p.repeat, sx0: p.sx0, wpx: p.wpx, hpx: p.hpx, med: p.med, windows: p.windows })), joins };
    });
    report.errors = errors;
    report.note = 'E is mean |ΔRGB| over rows 0.15h–0.85h divided by the plate median. A quiet window is at least 40 units wide, max E ≤ 1.5, and skyline slope ≤ 2 px/col. Seam cost is the min-error DP on |ΔRGB|+|Δalpha| across the live join overlap. Nothing is blurred or rewritten.';
    const out = path.join(root, 'docs/review/joinscan.json');
    fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
    console.log('wrote', out);
    for (const p of report.plates) console.log('S' + p.stage, p.id, 'windows', p.windows.length, p.windows.slice(0, 3));
    for (const j of report.joins) console.log('join', j.stage, j.from, '->', j.to, 'ov', j.overlapU, 'cost', j.cost && j.cost.mean);
    if (errors.length) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
