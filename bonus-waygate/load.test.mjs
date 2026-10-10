// Loads the bonus level with image fetches blocked, the way raw.githack 403s the WebP atlases.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bonus = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(bonus, '..');
const chromeBin = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']
  .map((name) => {
    const found = ['/usr/bin/' + name, '/usr/local/bin/' + name].find((p) => fs.existsSync(p));
    return found || null;
  })
  .find(Boolean);

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js') || file.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (/\.(webp|png|jpe?g|gif|ico)$/i.test(url.pathname) || url.pathname.includes('/atlases/')) {
      res.writeHead(403, { 'content-type': 'text/plain', 'access-control-allow-origin': '*' });
      res.end('blocked');
      return;
    }
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.join(root, rel);
    if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end('missing'); return;
    }
    res.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function cdp(ws, method, params = {}, sessionId) {
  const id = cdp.next++;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  ws.send(JSON.stringify(payload));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout ${method}`)), 20000);
    cdp.wait.set(id, (msg) => {
      clearTimeout(timer);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    });
  });
}
cdp.next = 1;
cdp.wait = new Map();

test('blocked image fetches still reach a tappable title and the run begins', { timeout: 60000 }, async (t) => {
  if (!chromeBin) {
    t.skip('chrome is not installed');
    return;
  }
  const server = await startServer();
  const port = server.address().port;
  const userDir = fs.mkdtempSync('/tmp/waygate-load-');
  const chrome = spawn(chromeBin, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--remote-debugging-port=9333', `--user-data-dir=${userDir}`, 'about:blank'
  ], { stdio: 'ignore' });
  let ws;
  try {
    let version;
    for (let i = 0; i < 40; i++) {
      try {
        version = await fetch('http://127.0.0.1:9333/json/version').then((r) => r.json());
        break;
      } catch { await new Promise((r) => setTimeout(r, 150)); }
    }
    assert.ok(version && version.webSocketDebuggerUrl, 'chrome devtools did not come up');
    ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && cdp.wait.has(msg.id)) {
        const done = cdp.wait.get(msg.id);
        cdp.wait.delete(msg.id);
        done(msg);
      }
    });
    const { targetId } = await cdp(ws, 'Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp(ws, 'Target.attachToTarget', { targetId, flatten: true });
    await cdp(ws, 'Page.enable', {}, sessionId);
    await cdp(ws, 'Network.enable', {}, sessionId);
    await cdp(ws, 'Network.setBlockedURLs', { urls: ['*.webp', '*.png', '*.jpg', '*.jpeg', '*.gif', '*.ico', '*atlases*'] }, sessionId);
    const requests = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === 'Network.requestWillBeSent' && msg.sessionId === sessionId) {
        requests.push(msg.params.request.url);
      }
    });
    await cdp(ws, 'Page.navigate', { url: `http://127.0.0.1:${port}/bonus-waygate/index.html` }, sessionId);
    let ready = null;
    for (let i = 0; i < 80; i++) {
      const result = await cdp(ws, 'Runtime.evaluate', {
        expression: `(() => {
          const loading = document.querySelector('#loading');
          const panel = document.querySelector('#panel-content');
          const start = document.querySelector('[data-action="start"]');
          const scene = window.__waygateGame && window.__waygateGame.scene && window.__waygateGame.scene.getScene('waygate');
          return {
            ready: !!window.__waygateReady,
            loading: loading ? loading.style.display : 'missing',
            text: panel ? panel.innerText : '',
            start: !!start,
            mode: scene ? scene.mode : null,
            atlas: !!(window.WAYGATE_ATLAS_DATA && window.WAYGATE_ATLAS_DATA.riley0),
            rileyW: window.__WAYGATE_IMAGES && window.__WAYGATE_IMAGES.riley0 ? window.__WAYGATE_IMAGES.riley0.naturalWidth : 0,
            gruntW: window.__WAYGATE_IMAGES && window.__WAYGATE_IMAGES.grunt0 ? window.__WAYGATE_IMAGES.grunt0.naturalWidth : 0,
            placeholders: scene && scene.placeholderKeys ? scene.placeholderKeys.size : -1,
            input: typeof window.WaygateInput === 'function',
            samePad: window.WAYGATE_PAD_MAP && window.__waygateInput && window.WAYGATE_PAD_MAP[2] === 'attack'
          };
        })()`,
        returnByValue: true
      }, sessionId);
      ready = result.result.value;
      if (ready && ready.ready && ready.start && ready.mode === 'title') break;
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.equal(ready.ready, true, JSON.stringify(ready));
    assert.equal(ready.loading, 'none');
    assert.match(ready.text, /WAYGATE/);
    assert.match(ready.text, /ENTER THE WAYS/);
    assert.equal(ready.mode, 'title');
    assert.equal(ready.atlas, true);
    assert.ok(ready.rileyW > 2 && ready.rileyW <= 4096, `riley atlas width ${ready.rileyW}`);
    assert.ok(ready.gruntW > 2 && ready.gruntW <= 4096, `grunt atlas width ${ready.gruntW}`);
    assert.equal(ready.placeholders, 0, JSON.stringify(ready));
    assert.equal(ready.input, true, JSON.stringify(ready));
    assert.equal(ready.samePad, true, JSON.stringify(ready));
    assert.match(ready.text, /Shift or double-tap/);
    assert.doesNotMatch(ready.text, /Dodge roll/);
    assert.ok(requests.some((url) => url.includes('/src/input.js')), `input module was not requested: ${requests.join(', ')}`);
    const imageHits = requests.filter((url) => /\.(webp|png|jpe?g|gif|ico)(\?|$)/i.test(url) || url.includes('/atlases/'));
    assert.deepEqual(imageHits, [], `image fetches leaked: ${imageHits.join(', ')}`);
    const began = await cdp(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const start = document.querySelector('[data-action="start"]');
        start.dispatchEvent(new Event('touchend', { bubbles: true, cancelable: true }));
        const scene = window.__waygateGame.scene.getScene('waygate');
        return { mode: scene.mode, started: scene.heroData.started };
      })()`,
      returnByValue: true
    }, sessionId);
    assert.equal(began.result.value.mode, 'play');
    assert.equal(began.result.value.started, true);
  } finally {
    try { if (ws) ws.close(); } catch { /* already closed */ }
    try { chrome.kill('SIGKILL'); } catch { /* already gone */ }
    await new Promise((r) => server.close(r));
    await new Promise((r) => setTimeout(r, 200));
    for (let i = 0; i < 5; i++) {
      try { fs.rmSync(userDir, { recursive: true, force: true }); break; }
      catch { await new Promise((r) => setTimeout(r, 150)); }
    }
  }
});
