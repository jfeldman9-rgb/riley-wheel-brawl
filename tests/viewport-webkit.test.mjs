// Playwright WebKit: shrink the game shell ~60px mid-stage and keep the HUD on screen.
// Skips cleanly when Playwright is not installed. WebKit is not iOS Safari.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };

function serve() {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const path = normalize(join(ROOT, rel === '' ? 'index.html' : rel));
    if (!path.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    try {
      const body = readFileSync(path);
      statSync(path);
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end();
    }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

test('WebKit shrinks the stage shell by 60px and keeps the HUD canvas on screen', { timeout: 90_000 }, async (t) => {
  let webkit;
  try {
    ({ webkit } = await import('playwright'));
  } catch {
    t.skip('Playwright is not installed');
    return;
  }
  const server = await serve();
  const port = server.address().port;
  let browser;
  try {
    browser = await webkit.launch({ headless: true });
  } catch (error) {
    server.close();
    if (/missing dependencies|Host system is missing/i.test(String(error))) {
      t.skip('Playwright WebKit browser libraries are not installed');
      return;
    }
    throw error;
  }
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    await page.goto(`http://127.0.0.1:${port}/?stage=2&skip=boss&story=0&autostart=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const canvas = document.querySelector('#game canvas');
      const boot = document.getElementById('boot');
      return !!(canvas && canvas.width > 0 && !boot);
    }, null, { timeout: 30000 });
    const before = await page.evaluate(() => {
      const canvas = document.querySelector('#game canvas').getBoundingClientRect();
      const perf = document.getElementById('perf-open');
      return { top: canvas.top, bottom: canvas.bottom, height: canvas.height, perfHidden: perf.hidden };
    });
    assert.equal(before.perfHidden, true);
    assert.ok(before.top >= -1, `HUD canvas started on screen (${before.top})`);
    const after = await page.evaluate(async () => {
      const game = document.getElementById('game');
      const next = Math.round(game.getBoundingClientRect().height - 60);
      game.style.height = next + 'px';
      window.dispatchEvent(new Event('resize'));
      await new Promise(resolve => setTimeout(resolve, 400));
      const canvas = document.querySelector('#game canvas').getBoundingClientRect();
      const shell = game.getBoundingClientRect();
      return {
        shellH: shell.height, canvasTop: canvas.top, canvasBottom: canvas.bottom,
        shellTop: shell.top, shellBottom: shell.bottom, scrollY: window.scrollY,
      };
    });
    assert.ok(after.shellH <= 390 - 50, `shell shrank (${after.shellH})`);
    assert.ok(after.canvasTop >= after.shellTop - 1, `canvas top ${after.canvasTop} shell ${after.shellTop}`);
    assert.ok(after.canvasBottom <= after.shellBottom + 1, `canvas bottom ${after.canvasBottom} shell ${after.shellBottom}`);
    assert.ok(after.canvasTop >= -1 && after.canvasBottom <= 390 + 1);
    assert.equal(after.scrollY, 0);
    await page.goto(`http://127.0.0.1:${port}/?stage=3&story=0&debug=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#game canvas'), null, { timeout: 30000 });
    const flags = await page.evaluate(() => ({
      perfHidden: document.getElementById('perf-open').hidden,
      log: !!document.getElementById('rwb-viewport-log'),
    }));
    assert.equal(flags.perfHidden, false);
    assert.equal(flags.log, true);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
