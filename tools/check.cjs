'use strict';
const fs = require('fs');
const path = require('path');
const { boot } = require('./soak.cjs');
const root = path.resolve(__dirname, '..');
async function pageLoadChecks(check, rootDir) {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) { check(false, 'Page-load checks need Playwright'); return; }
  const http = require('http');
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(rootDir, pathname === '/' ? 'index.html' : pathname);
    if (!file.startsWith(rootDir + path.sep) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
    const type = file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : file.endsWith('.png') ? 'image/png' : file.endsWith('.jpeg') ? 'image/jpeg' : file.endsWith('.webp') ? 'image/webp' : file.endsWith('.ttf') ? 'font/ttf' : 'application/octet-stream';
    res.setHeader('Content-Type', type);
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-accelerated-2d-canvas', '--js-flags=--expose-gc'] });
    const STAGE2 = JSON.stringify({ v: 2, at: 1700000000000, level: 1, wave: 2, score: 1200, extra: { saidin: 40, loial: true, lives: 2, callandor: false } });
    const open = async (seed) => {
      const page = await browser.newPage();
      page.setDefaultTimeout(180000);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        const refs = [];
        const orig = Document.prototype.createElement;
        Document.prototype.createElement = function (tag) {
          const el = orig.call(this, String(tag));
          if (String(tag).toLowerCase() === 'canvas') refs.push(new WeakRef(el));
          return el;
        };
        window.__rwbCanvasRefs = refs;
      });
      if (seed != null) await page.addInitScript(save => localStorage.setItem('rwb-run', save), seed);
      await page.goto(url);
      await page.waitForFunction(() => window.RWB && RWB.game && (RWB.game.scene || RWB.game.nextScene), null, { timeout: 90000 });
      const menu = await page.evaluate(() => {
        const title = (RWB.game.scene && RWB.game.scene.items) ? RWB.game.scene : RWB.game.nextScene;
        return { raw: localStorage.getItem('rwb-run'), items: title && title.items ? title.items() : [] };
      });
      return { page, errors, menu };
    };
    const seeded = await open(STAGE2);
    check(seeded.errors.length === 0, 'Seeded page load has no script errors' + (seeded.errors[0] ? ' (' + seeded.errors[0] + ')' : ''));
    check(seeded.menu.raw === STAGE2, 'A Stage 2 Continue save is byte-identical after the page loads');
    await seeded.page.reload();
    await seeded.page.waitForFunction(() => window.RWB && RWB.game && (RWB.game.scene || RWB.game.nextScene), null, { timeout: 90000 });
    const reload1 = await seeded.page.evaluate(() => localStorage.getItem('rwb-run'));
    await seeded.page.reload();
    await seeded.page.waitForFunction(() => window.RWB && RWB.game && (RWB.game.scene || RWB.game.nextScene), null, { timeout: 90000 });
    const reload2 = await seeded.page.evaluate(() => localStorage.getItem('rwb-run'));
    check(reload1 === STAGE2 && reload2 === STAGE2, 'A Stage 2 Continue save is byte-identical after 2 reloads');
    check(seeded.menu.items.includes('CONTINUE'), 'A saved Stage 2 run still offers CONTINUE');
    const fresh = await open(null);
    check(fresh.errors.length === 0 && fresh.menu.raw === null && !fresh.menu.items.includes('CONTINUE'), 'A fresh profile shows no CONTINUE after warmup');
    const bootMem = await fresh.page.evaluate(() => {
      if (window.gc) window.gc();
      let bytes = 0, canvases = 0;
      for (const ref of window.__rwbCanvasRefs || []) {
        const c = ref.deref();
        if (c && c.width && c.height) { bytes += c.width * c.height * 4; canvases++; }
      }
      return { mb: Math.round(bytes / 1048576 * 10) / 10, canvases };
    });
    check(bootMem.mb <= 90 && bootMem.canvases <= 48, 'Boot canvas memory stays at or below 90MB and 48 canvases ' + JSON.stringify(bootMem));
    console.log('Boot canvas memory ' + JSON.stringify(bootMem));
    const visual = await seeded.page.evaluate(() => {
      const feet = [];
      for (const kind of Object.keys(RWB.Puppet.defs)) {
        if (kind === 'forsaken' && RWB.assets.has('belal-idle')) continue;
        RWB.Puppet.prepare(kind);
        const d = RWB.Puppet.defs[kind], scale = d.height / 80, stride = 32 * scale;
        const measure = (frames) => {
          const rows = [];
          for (const frame of frames) {
            const phase = frame / 12, body = 280 + phase * stride * 2;
            const c = document.createElement('canvas'); c.width = 720; c.height = 400;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            // Bin centers select the baked frame; the body stays where that frame was skinned.
            const actor = { x: body, y: 300, z: 0, facing: 1, state: 'walk', visualHeight: d.height, gait: { moving: true, phase: phase + 0.5 / 12, feet: [] } };
            if (!RWB.Puppet.draw(ctx, actor, 0, kind)) return null;
            const data = ctx.getImageData(0, 0, 720, 400).data;
            let maxY = -1;
            for (let y = 399; y >= 0; y--) {
              for (let x = 0; x < 720; x++) if (data[(y * 720 + x) * 4 + 3] > 48) { maxY = y; break; }
              if (maxY >= 0) break;
            }
            const bands = [];
            for (let dy = 0; dy < 5; dy++) {
              const y = maxY - dy; if (y < 0) break;
              const line = [];
              for (let x = 0; x < 720; x++) if (data[(y * 720 + x) * 4 + 3] > 48) line.push(x);
              line.sort((p, q) => p - q);
              const groups = [];
              for (const x of line) {
                const g = groups[groups.length - 1];
                if (g && x - g[g.length - 1] <= 8) g.push(x); else groups.push([x]);
              }
              bands.push(groups.filter(g => g.length >= 2).map(g => g[g.length >> 1]));
            }
            rows.push(bands);
          }
          let best = null;
          for (let depth = 1; depth <= 5; depth++) {
            const xs = rows.map(bands => {
              const flat = bands.slice(0, depth).flat();
              flat.sort((p, q) => p - q);
              const groups = [];
              for (const x of flat) {
                const g = groups[groups.length - 1];
                if (g && x - g[g.length - 1] <= 8) g.push(x); else groups.push([x]);
              }
              return groups.map(g => g[g.length >> 1]);
            });
            for (const seed of xs[0] || []) {
              let prev = seed, lo = seed, hi = seed, ok = true;
              for (let i = 1; i < xs.length; i++) {
                let near = null, nd = Infinity;
                for (const c of xs[i]) if (Math.abs(c - prev) < nd) { nd = Math.abs(c - prev); near = c; }
                if (near == null || nd > 14) { ok = false; break; }
                prev = near; lo = Math.min(lo, near); hi = Math.max(hi, near);
              }
              if (ok && (best == null || hi - lo < best)) best = hi - lo;
            }
          }
          const travel = (frames[frames.length - 1] - frames[0]) / 12 * stride * 2;
          return best == null ? null : { drift: +best.toFixed(2), travel: +travel.toFixed(2) };
        };
        feet.push({ kind, early: measure([2, 3, 4]), late: measure([8, 9, 10]) });
      }
      function puff(kind, color) {
        const c = document.createElement('canvas'); c.width = 64; c.height = 64;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        RWB.FX.KINDS[kind].draw(ctx, { t: 0, life: 1, r: 14, y: 32, color: color || '#d8d0c0' }, 32);
        const data = ctx.getImageData(0, 0, 64, 64).data;
        let minX = 64, minY = 64, maxX = -1, maxY = -1, peak = 0;
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
          const a = data[(y * 64 + x) * 4 + 3];
          if (a > 20) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
          if (a > peak) peak = a;
        }
        return { corner: data[(minY * 64 + minX) * 4 + 3], peak, w: maxX - minX, h: maxY - minY };
      }
      function row(cam, y) {
        const c = document.createElement('canvas'); c.width = 640; c.height = 360;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        RWB.display.renderScale = 1;
        RWB.StageWorld.draw(ctx, { levelIndex: 0, camera: { x: cam }, time: 0, wave: 3 });
        return Array.from(ctx.getImageData(0, y, 640, 1).data);
      }
      const whole = row(100, 210), frac = row(100.4, 210), next = row(101, 210);
      const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++; return n; };
      function bestShift(a, b) {
        let best = 0, bestN = Infinity;
        for (let s = -3; s <= 3; s++) {
          let n = 0;
          for (let x = 12; x < 628; x++) {
            const i = x * 4, j = (x + s) * 4;
            n += Math.abs(a[i] - b[j]) + Math.abs(a[i + 1] - b[j + 1]) + Math.abs(a[i + 2] - b[j + 2]);
          }
          if (n < bestN) { bestN = n; best = s; }
        }
        return best;
      }
      const floorShift = bestShift(row(100, 300), row(100.8, 300));
      const midShift = bestShift(row(100, 180), row(100.8, 180));
      function alignError(live, shown) {
        const sample = (data, x) => {
          const x0 = Math.max(0, Math.min(638, Math.floor(x)));
          const t = Math.min(1, Math.max(0, x - x0));
          const o = x0 * 4, p = o + 4;
          const a = data[o] + data[o + 1] + data[o + 2];
          const b = data[p] + data[p + 1] + data[p + 2];
          return a * (1 - t) + b * t;
        };
        let best = 0, bestN = Infinity;
        const shifts = [0];
        for (let s = 0.02; s <= 1.2; s += 0.02) shifts.push(s, -s);
        for (const s of shifts) {
          let n = 0;
          for (let x = 24; x < 616; x += 2) n += Math.abs(sample(live, x) - sample(shown, x + s));
          if (n < bestN) { bestN = n; best = s; }
        }
        return Math.abs(best);
      }
      function layerDeviation(cam) {
        const world = RWB.StageWorld;
        RWB.display.renderScale = 1;
        const scene = { levelIndex: 0, camera: { x: cam }, time: 0, wave: 3 };
        const host = document.createElement('canvas'); host.width = 640; host.height = 360;
        world._painting = false; world._layer = null;
        world.draw(host.getContext('2d'), scene);
        const rows = { base: 24, back: 120, mid: 180, floor: 300, screen: 250 };
        const round = Math.round(cam), out = {};
        for (const id of Object.keys(rows)) {
          const slot = world._views[id];
          const shift = slot.k * (round - cam);
          const shown = document.createElement('canvas'); shown.width = 640; shown.height = 360;
          const sctx = shown.getContext('2d', { willReadFrequently: true });
          sctx.imageSmoothingEnabled = shift !== 0;
          sctx.drawImage(slot.canvas, shift, 0, 640, 360);
          let liveData;
          if (id === 'back' || id === 'mid' || id === 'floor') {
            const live = document.createElement('canvas'); live.width = 640; live.height = 360;
            const lctx = live.getContext('2d', { willReadFrequently: true });
            world._painting = true; world._layer = id;
            world.draw(lctx, scene);
            world._painting = false; world._layer = null;
            liveData = lctx.getImageData(0, rows[id], 640, 1).data;
          } else {
            liveData = slot.ctx.getImageData(0, rows[id], 640, 1).data;
          }
          const shownData = sctx.getImageData(0, rows[id], 640, 1).data;
          out[id] = { k: +slot.k.toFixed(4), err: alignError(liveData, shownData) };
        }
        return out;
      }
      const layers = layerDeviation(100.5);
      const layersEdge = layerDeviation(100.8);
      let maxDev = 0;
      for (const id of Object.keys(layers)) maxDev = Math.max(maxDev, layers[id].err, layersEdge[id].err);
      return { feet, dust: puff('dust'), chunk: puff('chunk', '#c4b8a4'), bg: { sub: diff(whole, frac), step: diff(whole, next), floorShift, midShift, maxDev, layers, layersEdge } };
    });
    const planted = visual.feet.every(r => r.early && r.late && r.early.drift <= 8 && r.late.drift <= 8 && r.early.drift < r.early.travel * 0.7 && r.late.drift < r.late.travel * 0.7);
    check(planted, 'Baked walk frames keep the planted hoof fixed in world space ' + JSON.stringify(visual.feet));
    check(visual.dust.corner < visual.dust.peak * 0.5 && visual.dust.peak > 40 && visual.chunk.corner < visual.chunk.peak * 0.5 && visual.chunk.peak > 40, 'Dust and debris pixels are soft rounds, not hard rectangles ' + JSON.stringify({ dust: visual.dust, chunk: visual.chunk }));
    check(visual.bg.sub > 0 && visual.bg.step > 0, 'A fractional camera moves the cached background off the whole-pixel snap ' + JSON.stringify(visual.bg));
    check(Math.abs(visual.bg.floorShift) === 1 && visual.bg.midShift === 0, 'Parallax layers keep their own sub-pixel step (floor moves, distant mid does not jump a pixel) ' + JSON.stringify(visual.bg));
    check(visual.bg.maxDev <= 0.1, 'Every parallax layer stays within 0.1px of the scroll tiled() actually used ' + JSON.stringify(visual.bg));
    console.log('Baked hoof drift ' + JSON.stringify(visual.feet));
    console.log('Background subpixel delta ' + JSON.stringify(visual.bg));
    const hit = await seeded.page.evaluate(() => {
      const canvas = document.getElementById('game');
      const ctx = canvas.getContext('2d');
      const rs = RWB.display.renderScale || 1;
      function pass(sign) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const fight = new RWB.scenes.Play(RWB.game, 0, { wave: 3 });
        fight.camera.punchX = 20 * sign;
        fight.camera.punchY = 8 * sign;
        fight.camera.shakeX = 13 * sign;
        fight.camera.shakeY = 8 * sign;
        const prev = RWB.game.scene, prevFade = RWB.game.fade;
        RWB.game.scene = fight;
        RWB.game.fade = 0;
        RWB.clearPresentedFrame();
        ctx.setTransform(rs, 0, 0, rs, 0, 0);
        fight.draw(ctx);
        const snap = RWB.display.mode === 'classic' ? 1 : rs;
        const dx = Math.round((fight.camera.shakeX + fight.camera.punchX) * snap) / snap;
        const dy = Math.round((fight.camera.shakeY + fight.camera.punchY) * snap) / snap;
        const pushX = Math.max(1, Math.round(Math.abs(dx) * rs));
        const pushY = Math.max(1, Math.round(Math.abs(dy) * rs));
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const w = canvas.width, h = canvas.height;
        const mag = (x, y) => { const i = (y * w + x) * 4; return data[i] > 200 && data[i + 1] < 40 && data[i + 2] > 200; };
        let stale = 0, samples = 0;
        const xs = dx > 0 ? [0, pushX] : [w - pushX, w];
        const ys = dy > 0 ? [0, pushY] : [h - pushY, h];
        for (let y = 0; y < h; y += 3) for (let x = xs[0]; x < xs[1]; x += 2) { samples++; if (mag(x, y)) stale++; }
        for (let x = 0; x < w; x += 3) for (let y = ys[0]; y < ys[1]; y += 2) { samples++; if (mag(x, y)) stale++; }
        RWB.game.scene = prev;
        RWB.game.fade = prevFade;
        return { stale, samples, pushX, pushY, dx, dy };
      }
      return { pos: pass(1), neg: pass(-1) };
    });
    check(hit.pos.stale === 0 && hit.neg.stale === 0 && hit.pos.samples > 0, 'A heavy hit at max push leaves no stale pixels on the exposed edges ' + JSON.stringify(hit));
    const pause = await seeded.page.evaluate(() => {
      const canvas = document.getElementById('game');
      const ctx = canvas.getContext('2d');
      const rs = RWB.display.renderScale || 1;
      const fight = new RWB.scenes.Play(RWB.game, 0, { wave: 3 });
      fight.phase = 'play';
      fight.goTimer = 0;
      fight.bossCard = 0;
      fight.paused = false;
      const button = RWB.input.touch.buttons.find(b => b.id === 'pause');
      const prevPc = RWB.display.pc, prevTouch = RWB.input.touch.enabled;
      function stats(wx, wy, ww, wh) {
        const x = Math.max(0, Math.floor(wx * rs)), y = Math.max(0, Math.floor(wy * rs));
        const w = Math.max(1, Math.ceil(ww * rs)), h = Math.max(1, Math.ceil(wh * rs));
        const data = ctx.getImageData(x, y, w, h).data;
        let max = 0;
        for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i] + data[i + 1] + data[i + 2]);
        return max;
      }
      function shot(pc, enabled) {
        RWB.display.pc = pc;
        RWB.input.touch.enabled = enabled;
        ctx.setTransform(rs, 0, 0, rs, 0, 0);
        fight.paused = true;
        fight.draw(ctx);
        const before = {
          ii: stats(button.x - 10, button.y - 8, 20, 16),
          esc: stats(button.x + button.r + 1, button.y - 6, 24, 12)
        };
        fight.paused = false;
        fight.draw(ctx);
        const after = {
          ii: stats(button.x - 10, button.y - 8, 20, 16),
          esc: stats(button.x + button.r + 1, button.y - 6, 24, 12)
        };
        return { before, after };
      }
      const touch = shot(false, true);
      const desktop = shot(true, false);
      RWB.display.pc = prevPc;
      RWB.input.touch.enabled = prevTouch;
      return { touch, desktop, button };
    });
    check(pause.touch.after.ii > pause.touch.before.ii + 40, 'The pause button II is visible mid-fight on touch ' + JSON.stringify(pause));
    check(pause.desktop.after.esc > pause.desktop.before.esc + 30, 'The desktop ESC badge is visible mid-fight ' + JSON.stringify(pause));
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}
async function main() {
const RWB = boot(root);
const failures = [];
let passed = 0;
function check(value, message) {
  console.log((value ? 'PASS ' : 'FAIL ') + message);
  if (!value) failures.push(message); else passed += 1;
}
const game = RWB.game;
let title = new RWB.scenes.Title(game);
game.scene = title;
title.update(0, { pressed: { start: true } });
check(game.nextScene instanceof RWB.scenes.Reel, 'Title starts the opening reel');
const rileyFrames=['idle','walk1','walk2','walk3','walk4','punch','kick','fireball','hurt','jump'];
check(rileyFrames.slice(1,5).every(frame=>RWB.RILEY16.frames[frame]), 'Riley walk uses four distinct sprite frames');
function moveDamages(name) {
  const scene = new RWB.scenes.Play(game, 0, {});
  scene.enemies = [];
  const enemy = new RWB.Trolloc(scene, scene.player.x + 35, scene.player.y, 'axe');
  enemy.ai = 'recover';
  enemy.aiTimer = 9;
  scene.enemies.push(enemy);
  const before = enemy.hp;
  scene.player.beginMove(name);
  scene.player.stateT = RWB.MOVES[name].active[0] + 0.01;
  scene.player.updateAttack(0.01);
  return enemy.hp < before && scene.playerHitboxes.length > 0;
}
check(moveDamages('front'), 'Front kick creates a damaging hitbox');
check(moveDamages('round'), 'Roundhouse creates a damaging hitbox');
check(moveDamages('back'), 'Spinning back kick creates a damaging hitbox');
check(moveDamages('jump'), 'Jump kick creates a damaging hitbox');
check(moveDamages('spin'), '360 spinning kick creates a damaging hitbox');
{
  const scene = new RWB.scenes.Play(game, 0, {});
  scene.enemies = [];
  const enemy = new RWB.Trolloc(scene, scene.player.x + 42, scene.player.y, 'axe');
  enemy.ai = 'recover';
  enemy.aiTimer = 9;
  scene.enemies.push(enemy);
  const before = enemy.hp;
  const projectile = new RWB.Fireball(scene, scene.player, 0);
  for (let i = 0; i < 20 && projectile.life > 0; i += 1) projectile.update(1 / 60);
  check(enemy.hp < before, 'Fireball projectile hitbox damages a Trolloc');
}
{
  const scene = new RWB.scenes.Play(game, 0, {});
  scene.enemies = [];
  const enemy = new RWB.Trolloc(scene, scene.player.x + 18, scene.player.y, 'axe');
  scene.enemies.push(enemy);
  enemy.setState('hurt');
  scene.player.grabbed = enemy;
  enemy.grabbedBy = scene.player;
  const before = enemy.hp;
  scene.player.throwGrab(1);
  check(enemy.hp < before && enemy.thrown > 0, 'Grab throw damages and launches a Trolloc');
}
{
  const scene = new RWB.scenes.Play(game, 0, {});
  scene.enemies = [];
  scene.player.hp = 2;
  scene.player.power = 100;
  scene.player.taintAge = RWB.TUNE.taintGrace + 1;
  for (let i = 0; i < 600; i += 1) scene.player.updateTaint(1 / 60);
  check(scene.player.hp === 1, 'Taint never reduces HP below one');
}
{
  const scene = new RWB.scenes.Play(game, 0, {});
  const first = scene.callLoial();
  const second = scene.callLoial();
  const restarted = new RWB.scenes.Play(game, 0, { loial: scene.player.loialReady });
  const afterRestart = restarted.callLoial();
  const continued = new RWB.scenes.Play(game, 0, { loial: scene.player.loialReady, wave: 2 });
  const afterContinue = continued.callLoial();
  check(first && !second && !afterRestart && !afterContinue, 'Loial cannot be used twice after use, restart, or Continue');
}
{
  const original = new RWB.scenes.Play(game, 0, { wave: 3, score: 4321, saidin: 67, loial: false, lives: 1 });
  const checkpoint = { level: 0, wave: original.wave, score: original.player.score, extra: { saidin: original.player.power, loial: original.player.loialReady, lives: 0 } };
  const over = new RWB.scenes.GameOver(game, checkpoint);
  over.continueRun();
  const resumed = game.nextScene;
  check(resumed.levelIndex === 0 && resumed.wave === 3 && resumed.player.score === 3821 && !resumed.player.loialReady && resumed.player.lives === 3, 'Game Over Continue preserves level, wave, score policy, and Loial state');
}
{
  const scene = new RWB.scenes.Play(game, 0, {});
  scene.enemies = [];
  scene.props = [];
  const hp = scene.player.hp;
  const neutral = { pressed: {}, held: {}, axis: () => ({ x: 0, y: 0 }) };
  for (let i = 0; i < 30 * 60; i += 1) scene.update(1 / 60, neutral);
  check(scene.player.hp === hp, 'Player takes zero damage in 30 seconds with no attackers');
}
{
  const full = RWB.settings.data.shake;
  RWB.settings.data.shake = 'full';
  const strong = new RWB.Camera();
  strong.impact(1, 'super');
  RWB.settings.data.shake = 'reduced';
  const reduced = new RWB.Camera();
  reduced.impact(1, 'super');
  check(reduced.shakeAmt < strong.shakeAmt && reduced.flashT < strong.flashT, 'Reduced Shake lowers super shake and flash');
  RWB.settings.data.shake = full;
}
check(RWB.ART_MANIFEST.length >= 54 && RWB.ART_MANIFEST.every(src=>fs.existsSync(path.join(root,src))), 'Delivered art manifest lists existing bundled files');
const artFiles=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?artFiles(dir+'/'+e.name):[dir+'/'+e.name]);
check([...artFiles('assets/art'),...artFiles('assets/cutscenes')].filter(f=>/\.(png|jpeg)$/.test(f)&&!f.startsWith('assets/art/newplates/')).every(f=>RWB.ART_MANIFEST.includes(f) && Object.values(RWB.ART_FILES).includes(f)), 'Every committed painted image has a registered manifest key');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|ttf)[^"]*)"/g)].map(match => match[1]);
const STAMP='20260927-scroll4';console.log('Cache stamp: '+STAMP);
check(urls.every(url => url.includes('?v='+STAMP)), 'Every script, stylesheet, and font URL has the '+STAMP+' cache stamp');
const mainSource=fs.readFileSync(path.join(root,'js/main.js'),'utf8'),perfSource=fs.readFileSync(path.join(root,'js/performance.js'),'utf8');
check(mainSource.includes('new RWB.FrameClock') && perfSource.includes('STEP=1/60') && perfSource.includes('count<5'), 'Browser gameplay uses bounded fixed 60 Hz simulation ticks');
check(perfSource.includes('this.pending[key]=true') && perfSource.includes('const pressed=this.pending;this.pending={}'), 'Pressed input edges are buffered and consumed by one simulation tick');
const hotSpriteSource=fs.readFileSync(path.join(root,'js/riley.js'),'utf8')+fs.readFileSync(path.join(root,'js/puppets.js'),'utf8')+fs.readFileSync(path.join(root,'js/fx.js'),'utf8');
check(!/ctx\.filter\s*=/.test(hotSpriteSource) && !/shadowBlur\s*=/.test(hotSpriteSource), 'Riley, enemy hit flashes, Callandor, dust and debris avoid per-frame Canvas filters');
// Chunk B: exercise real collision, persistence and scene transitions, not only metadata.
const neutral = { pressed: {}, held: {}, axis: () => ({x:0,y:0}) };
const ctx = new Proxy({ createLinearGradient:()=>({addColorStop(){}}), createRadialGradient:()=>({addColorStop(){}}), measureText:t=>({width:String(t).length*8}) }, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
function bossScene(level) {
  const s = new RWB.scenes.Play(game, level, {wave:5,callandor:level===4});
  s.boss.introTimer=0; s.boss.invuln=0; s.boss.x=s.player.x+36; s.boss.y=s.player.y;
  return s;
}
{
  let advanced=0;
  for (const lines of Object.values(RWB.CAPTIONS)) {
    const reel=new RWB.scenes.Reel(game,lines,()=>{advanced++;return new RWB.scenes.Title(game);});
    for (let i=0;i<lines.length+3;i++) { reel.update(1/60,{pressed:{start:true}}); reel.draw(ctx); }
  }
  check(advanced===Object.keys(RWB.CAPTIONS).length,'Every reel skips past its last caption safely and transitions exactly once');
  const catalog=fs.readFileSync(path.join(root,'docs/VOICE_LINES.md'),'utf8');
  check(Object.values(RWB.VOICE_LINES).every(line=>catalog.includes('“'+line.text+'”')),'Every campaign subtitle is exact text from VOICE_LINES.md');
  check(RWB.CAPTIONS.joint[1].who==='kenzie','Twinkle Toes uses speaker id kenzie');
}
{
  let s=new RWB.scenes.Play(game,0,{saidin:73,score:2345,lives:2,loial:false});
  let transitions=true;
  for (let level=0;level<5;level++) {
    s.phase='clear'; if(level===3)s.player.callandor=true;
    let next=s.nextStage(); let guard=0;
    while(next instanceof RWB.scenes.Reel && guard++<6) { for(let i=0;i<next.lines.length;i++)next.advance(); next=game.nextScene; }
    if(level<4) { transitions=transitions && next.levelIndex===level+1 && next.player.score===2345 && next.player.lives===2 && next.player.loialReady; s=next; }
    else transitions=transitions && next instanceof RWB.scenes.Victory;
  }
  check(transitions,'Stage 1 -> 2 -> 3 -> 4 -> 5 -> ending uses the existing Reel flow and preserves run stats');
}
{
  const s=bossScene(2), b=s.boss, hp=b.hp;
  for(const move of ['front','round','back','spin','super','loial','throw'])s.damageEnemy(b,100,s.player.x,{move});
  check(b.flying && b.z>0 && b.hp===hp,'Flying Draghkar rejects grounded kicks, throws, Loial and super');
  s.player.z=b.z; s.player.beginMove('jump'); s.player.stateT=0.15; s.player.updateAttack(0.01);
  const kicked=b.hp<hp; s.player.z=0; s.player.facing=1; b.x=s.player.x+95;
  const fire=new RWB.Fireball(s,s.player,0), before=b.hp;
  for(let i=0;i<30 && fire.life>0;i++)fire.update(1/60);
  check(kicked && b.hp<before,'Jump-kick and aimed fireball collision can damage flying Draghkar');
  b.attack=RWB.ShadowMoves.draghkar[1]; b.ai='attack'; b.aiTimer=0.5; b.attackDidHit=false; b.facing=-1; b.x=s.player.x+35; b.y=s.player.y; b.z=24; s.player.invuln=0;
  b.activeAttack(); const grabbed=s.player.grabbedBy===b;
  for(let i=0;i<6;i++)s.player.update(0.05,{pressed:{attack:true},held:{},axis:()=>({x:0,y:0})});
  check(grabbed && !s.player.grabbedBy,'Hypnotic kiss really grabs Riley and repeated kicks break free');
}
{
  const s=new RWB.scenes.Play(game,2,{}); s.enemies=[]; const f=s.fog;
  s.player.y=f.lane; const hp=s.player.hp;
  for(let i=0;i<210;i++) { s.player.invuln=0; f.update(1/60); }
  const drained=s.player.hp<hp; s.player.y=RWB.FLOOR_BOTTOM; const safeHp=s.player.hp;
  for(let i=0;i<100;i++){s.player.invuln=0;f.update(1/60);}
  check(drained && s.player.hp===safeHp,'Mashadar drains HP in its lane and leaves the opposite lane safe');
  s.paused=true; const age=f.age; s.update(1,neutral); check(f.age===age,'Pause freezes Mashadar');
}
{
  const s=bossScene(1),b=s.boss;
  b.attack=RWB.ShadowMoves.fade[0]; b.target={x:s.player.x,y:s.player.y}; b.blinkTo=b.x-90;
  const x=b.x; b.beginActive(); check(b.x!==x,'Myrddraal blink actually relocates the boss');
  b.attack=RWB.ShadowMoves.fade[2]; b.x=s.player.x+40; b.y=s.player.y; b.beginActive();
  s.player.invuln=0; s.hazards[s.hazards.length-1].update(0.01);
  check(s.player.stunTimer>0,'Fear hit applies a finite input stun');
}
{
  const weak=bossScene(3),strong=bossScene(3); strong.player.callandor=true;
  for(const s of [weak,strong]) {s.player.power=100;s.activateBalefire();s.updateSuper(0.5);}
  check(strong.boss.hpMax-strong.boss.hp===2*(weak.boss.hpMax-weak.boss.hp),'Callandor doubles boss super damage');
  strong.levelIndex=4; strong.saveCheckpoint(); const saved=RWB.settings.loadRun();
  const continued=new RWB.scenes.Play(game,saved.level,Object.assign({},saved.extra,{wave:saved.wave}));
  continued.restartStage();
  check(saved.extra.callandor && continued.player.callandor && game.nextScene.player.callandor && game.nextScene.levelIndex===4,'Callandor survives save, Continue and stage restart');
}
{
  const s=bossScene(4),b=s.boss; b.takeHit(99999,s.player.x,{move:'super'});
  check(b.hp===1 && !b.dead && s.twinkleFreed,'Taim survives otherwise lethal damage and frees Twinkle Toes');
  const count=b.usedAttacks.size; s.player.invuln=999;
  for(let i=0;i<900;i++)b.update(1/60);
  check(b.usedAttacks.size>count && !b.dead,'Taim keeps attacking at 1 HP while joint finish is pending');
  s.player.power=0; s.damageEnemy(b,9,s.player.x,{move:'front'});
  check(s.player.power>0 && b.hp===1,'Shield hits can refill saidin after an interrupted joint attempt');
  s.player.power=100; s.player.setState('idle'); s.player.attackMove=null; s.rescueReady=true;
  const started=s.startJoint(); s.updateJoint(0.5); const alive=!b.dead;
  s.updateJoint(0.8);
  check(started && alive && s.joint.hit && b.dead && b.receivedMoves.has('joint'),'Taim dies only after both visible joint beam tips collide');
}
for(let level=0;level<5;level++) {
  const s=new RWB.scenes.Play(game,level,{}); s.enemies=[]; s.hazards=[];
  s.player.power=100; s.player.taintAge=RWB.TUNE.taintGrace+1;
  for(let i=0;i<240;i++)s.player.updateTaint(1/60);
  const hurt=s.player.hp<100; s.player.setState('idle'); s.activateBalefire();
  check(hurt && s.player.taintAge===0 && s.player.power===0,'Stage '+(level+1)+' full saidin taint hurts and spending clears it');
  s.draw(ctx);
}
check(Object.values(RWB.ART_FILES).every(src=>!src.startsWith('/') && /\.(png|jpeg|webp|json)$/.test(src)), 'Art hooks use relative image/JSON paths');
check([1,2,3,4,5].every(n=>RWB.ART_FILES['stage'+n+'-far'] && RWB.ART_FILES['stage'+n+'-mid'] && RWB.ART_FILES['stage'+n+'-near'] && RWB.ART_FILES['floor'+n]),'Every stage has four optional art layers');
check(RWB.assets.VER===STAMP && RWB.ASSET_VER===STAMP,'Runtime assets share the '+STAMP+' script cache stamp');

const brokenPath='assets/art/test-missing.png';
RWB.ART_MANIFEST.push(brokenPath);
RWB.assets.register('test-missing',brokenPath);
const beforeRequests=RWB.__assetRequests();
await RWB.assets.load();
check(RWB.__assetUrls().filter(url=>url.startsWith(brokenPath+'?')).length===2 && RWB.assets.failed().includes('test-missing') && !RWB.assets.has('test-missing'), 'A listed broken image retries once and settles to fallback');
RWB.ART_MANIFEST.pop();

// W3 regression gates: run through persisted data and real Continue constructors.
{
  for(let i=0;i<5;i++) {
    const s=bossScene(i); s.boss.hp=137; s.player.loialReady=false;
    s.boss.usedAttacks.add(s.level.attacks[0]); s.player.lives=1;
    s.beginDeath(); s.resolveDeath();
    const saved=RWB.settings.loadRun();
    const over=new RWB.scenes.GameOver(game,saved);over.continueRun();
    const resumed=game.nextScene;
    check(resumed.wave===5 && resumed.boss.hp===137 && !resumed.player.loialReady && resumed.boss.usedAttacks.has(s.level.attacks[0]),'Stage '+(i+1)+' boss Continue preserves HP and attack progress');
  }
  const s=bossScene(4);s.boss.hp=1;s.twinkleFreed=true;s.rescueReady=true;s.saveCheckpoint();
  const run=RWB.settings.loadRun(),r=RWB.resumeRun(game,run);
  r.rescueReady=false;r.saveCheckpoint();const pending=RWB.resumeRun(game,RWB.settings.loadRun());for(let i=0;i<10;i++)pending.updateDialogue(3);r.rescueReady=true;
  check(pending.rescueReady,'Continue replays an interrupted rescue readiness caption');
  check(r.boss.hp===1 && r.boss.jointReady && r.twinkleFreed && r.rescueReady && !r.twinkle.captive,'Taim last-HP Continue preserves rescue and joint-finish readiness');
}
{
  const s=bossScene(3);s.boss.dead=true;s.finishWave(1/60);
  let saved=RWB.settings.loadRun(),reel=RWB.resumeRun(game,saved);
  check(saved.extra.callandor && saved.extra.pendingReveal==='callandor' && reel.lines===RWB.CAPTIONS.callandor,'Reload after Stage 4 clear must show Callandor reveal');
  reel.advance(); saved=RWB.settings.loadRun();
  check(saved.extra.pendingReveal==='callandor','Partial reveal is still pending on reload');
  for(let i=0;i<reel.lines.length+1;i++)reel.advance();
  check(!RWB.settings.loadRun().extra.pendingReveal,'Only acknowledging the final reveal caption clears the pending flag');
}
{
  let planted=0,maxDrift=0,armOpposite=true;
  const a={x:100,y:260,z:0,state:'walk',facing:1,stateT:0,visualHeight:83};
  RWB.Puppet.updateGait(a,1/60);
  for(let f=0;f<120;f++) {
    const before=a.gait.feet.map(p=>({...p}));a.x+=128/60;RWB.Puppet.updateGait(a,1/60);
    const pose=RWB.Puppet.pose(a);
    a.gait.feet.forEach((p,i)=>{if(p.stance && before[i]?.stance){maxDrift=Math.max(maxDrift,Math.hypot(p.x-before[i].x,p.y-before[i].y));planted++;}if(p.stance){const world=a.x+pose.feet[i].x*83/80;maxDrift=Math.max(maxDrift,Math.abs(world-p.x));}});
    armOpposite=armOpposite && pose.arms.every((p,i)=>(p.x-(i?9:-9))*pose.feet[i].x<=.0001);
  }
  check(planted>40 && maxDrift<1e-8 && armOpposite,'World-space planted feet stay fixed; arms counter-swing throughout the gait');
check(Object.keys(RWB.Puppet.defs).length===11&&!RWB.Puppet.defs.riley,'Enemy, ally and boss characters retain articulated painted rigs; Riley is sprite-only');
  const stageSource=fs.readFileSync(path.join(root,'js/stages.js'),'utf8');
  const hudSource=fs.readFileSync(path.join(root,'js/hud.js'),'utf8');
  check(RWB.LEVELS[3].banner.includes('TEAR')&&RWB.LEVELS[3].banner.includes('CALLANDOR')&&RWB.LEVELS[4].banner==='THE BLACK TOWER'&&!RWB.LEVELS[4].banner.includes('CALLANDOR')&&!/'  CALLANDOR'/.test(hudSource)&&/level\.banner/.test(hudSource),'Stage banners: 4 = Tear - Callandor, 5 = The Black Tower (Callandor no longer titles Stage 5)');
  const puppetSource=fs.readFileSync(path.join(root,'js/puppets.js'),'utf8');
  check(!/scale\(\s*-1\s*,\s*1\s*\)/.test(stageSource),'Stage plate and floor tiling never mirrors a repeat');
  check(['1','2','3','4','5','-roof'].every(n=>RWB.ART_FILES['floor'+n]==='assets/art/floor'+n+'-loop.jpeg')&&/FLOOR_LOOP=1100/.test(stageSource)&&/const overlap=0/.test(stageSource),'Floors use offline-quilted seamless loops (min-error cut, no hard join) spanning 1100 units, >1.7 screens');
  check(/K_FAR=0\.08,K_MID=0\.40,K_NEAR=1\.15/.test(stageSource)&&/const farW=640\+K_FAR\*travel/.test(stageSource)&&/stage5-roof-far/.test(stageSource)&&!/sectionBlend|CAMERA_RANGE|paintLandmarks|sectionWash/.test(stageSource),'Far layer is one full-width plate at 0.08, the roof plate is locked on the arena, and nothing crossfades two versions');
  check(/plateW:720/.test(stageSource)&&/\{key:'stage2-mid',imgW:1774,plateW:700/.test(stageSource)&&/bakedNear/.test(stageSource),'Stage 1 mid plate is 720 units; later mids and the near strip are 700 and scroll on their own factors');
  const rileySource=fs.readFileSync(path.join(root,'js/riley.js'),'utf8');
  check(rileyFrames.every(frame=>RWB.ART_MANIFEST.includes('assets/art/riley16/'+frame+'.png'))&&RWB.ART_MANIFEST.includes('assets/art/riley16/portrait.png')&&/drawImage\(img, -ax \* scale, -ay \* scale/.test(rileySource),'Riley draws from all ten anchored riley16 runtime frames and the new portrait is manifested');
  check(RWB.RILEY16.height>=90&&RWB.RILEY16.height<=100&&RWB.RILEY16.height/RWB.Puppet.defs.trolloc.height>=.80&&RWB.RILEY16.height/RWB.Puppet.defs.trolloc.height<=.90,'Riley idle draw height is 90-100 units and 80-90% of a regular Trolloc');
  check(/Math\.floor\(this\.walkDistance \/ 20\) % 4/.test(rileySource),'Riley walk advances four frames by movement distance and stops at rest');
  const belalFrames=['idle','walk1','walk2','walk3','walk4','windup','slash','lunge','hurt','cast'];
  check(belalFrames.every(f=>RWB.ART_MANIFEST.includes('assets/art/belal/'+f+'.png')&&RWB.BELAL.frames[f]&&RWB.BELAL.frames[f].length===4)&&RWB.ART_MANIFEST.includes('assets/art/belal/portrait.png'),"Be'lal draws from all ten anchored painted belal frames (sword painted in hand) plus portrait");
  check(/kind==='forsaken'&&R\.assets\.has\('belal-idle'\)/.test(puppetSource)&&/m==='combo'\?'windup'/.test(puppetSource)&&/t<\.55\?'slash':'lunge'/.test(puppetSource),"Be'lal SWORD FLURRY telegraph/attack use painted windup/slash/lunge frames (no composited sword, cannot detach)");
  check(!/if\s*\(\s*!articulated\s*\)\s*ctx\.drawImage/.test(puppetSource)&&/Processed connected skin is mandatory even at idle/.test(puppetSource),'Idle uses the same processed connected rig as action states');
}

{
  const warmStart=perfSource.indexOf('function warmDisplay'),warmEnd=perfSource.indexOf('R.warmDisplay=warmDisplay');
  const warmSource=perfSource.slice(warmStart,warmEnd);
  check(warmStart>0&&warmEnd>warmStart&&!/setSceneNow\(/.test(warmSource)&&warmSource.includes('getItem(runKey)')&&warmSource.includes('setItem(runKey,saved)')&&warmSource.includes('removeItem(runKey)'),'Display warmup restores the Continue save and does not enter a fight');
  const fxSource=fs.readFileSync(path.join(root,'js/fx.js'),'utf8');
  check(/effects\.glow\('#d8d0c0'\)/.test(fxSource)&&/effects\.glow\(f\.color\)/.test(fxSource)&&!/fillRect\(sx -/.test(fxSource),'Dust and debris draw a cached radial sprite');
  const stageBlit=fs.readFileSync(path.join(root,'js/stages.js'),'utf8');
  check(/const shift=slot\.k\*\(cam-camExact\)/.test(stageBlit)&&/slot\.k=this\._layerFactor==null\?layer\.k:this\._layerFactor/.test(stageBlit)&&/R\.StageWorld\._layerFactor=factor/.test(stageBlit)&&/drawImage\(slot\.canvas,shift,0,640,360\)/.test(stageBlit),'Cached backgrounds blit each parallax layer at the capped factor tiled() used');
  const mainSource=fs.readFileSync(path.join(root,'js/main.js'),'utf8');
  const inputSource=fs.readFileSync(path.join(root,'js/input.js'),'utf8');
  const hudReuse=fs.readFileSync(path.join(root,'js/hud.js'),'utf8');
  const puppetReuse=fs.readFileSync(path.join(root,'js/puppets.js'),'utf8');
  check(/function clearPresentedFrame/.test(mainSource)&&/Math\.ceil\(48 \* rs\)/.test(mainSource)&&/RWB\.clearPresentedFrame/.test(mainSource),'Fight frames clear the border a camera punch can expose');
  check(/game\._swap\(\); game\.fadeDir = -1; last = performance\.now\(\)/.test(mainSource),'The fade-in clock starts after the scene enter bake, not before it');
  check(/drawImage\(slot\.canvas, 0, 0, RWB\.W, RWB\.H\)/.test(inputSource)&&!/RWB\.H - 160/.test(inputSource),'The cached control layer includes the pause button, not only the bottom cluster');
  check(/g\.clearRect\(0, 0, bw, bh\)/.test(inputSource)&&/g\.clearRect\(0, 0, bw, bh\)/.test(hudReuse),'HUD and touch caches clear and reuse their buffer instead of reallocating it');
  check(/function poseScaleFor/.test(puppetReuse)&&/prepareStage\(level\)/.test(puppetReuse)&&!/library\.values\(\)\)flashOf/.test(puppetReuse),'Pose atlases bake at the capped on-screen size, per stage, and flash copies are lazy');
  const crate=new RWB.FX();crate.chunks(10,10,'#8a6039',6);
  check(crate.list.length>0&&crate.list.every(p=>p.color==='#8a6039'),'Crate debris accepts a single colour string');
  const sceneSource=fs.readFileSync(path.join(root,'js/scenes.js'),'utf8');
  check(/openedPause/.test(sceneSource)&&/if \(!openedPause\)/.test(sceneSource),'The pause press that opens the menu is not fed to the menu on that update');
  const blank = { pressed: {}, held: {}, axis: () => ({ x: 0, y: 0 }), pointer: { x: 0, y: 0 } };
  const tap = (pressed, pointer) => ({ pressed, held: {}, axis: () => ({ x: 0, y: 0 }), pointer: pointer || { x: 0, y: 0 } });
  const ii = RWB.input.touch.buttons.find(b => b.id === 'pause');
  const resumeAt = { x: 240, y: RWB.PauseMenu.Y0 };
  const fight = new RWB.scenes.Play(game, 0, { wave: 0 });
  fight.update(1 / 60, tap({ pause: true }));
  const escOpen = fight.paused;
  fight.update(1 / 60, blank);
  const escStays = fight.paused;
  fight.update(1 / 60, tap({ pause: true }));
  const escClose = !fight.paused;
  fight.update(1 / 60, blank);
  const escStaysClosed = !fight.paused;
  fight.update(1 / 60, tap({ pause: true, click: true }, { x: ii.x, y: ii.y }));
  const iiOpen = fight.paused;
  fight.update(1 / 60, blank);
  const iiStays = fight.paused;
  fight.update(1 / 60, tap({ click: true }, resumeAt));
  const iiResume = !fight.paused;
  fight.update(1 / 60, tap({ pause: true }, { x: ii.x, y: ii.y }));
  const clickOpen = fight.paused;
  fight.update(1 / 60, blank);
  const clickStays = fight.paused;
  fight.update(1 / 60, tap({ start: true }));
  const clickResume = !fight.paused;
  check(escOpen && escStays && escClose && escStaysClosed, 'ESC opens the pause menu, it stays open, and pressing pause again resumes');
  check(iiOpen && iiStays && iiResume, 'Tapping II opens the pause menu, it stays open, and choosing RESUME closes it');
  check(clickOpen && clickStays && clickResume, 'Clicking II opens the pause menu, it stays open, and confirming RESUME closes it');
}
{
  check(RWB.LEVELS.every(level => level.length === 4240 && level.wavePoints.length === 6 && level.wavePoints[0] === 0 && level.wavePoints[5] === 3600 && level.wavePoints[5] + RWB.SCROLL.fight === level.length), 'Every stage is 4240 units, six fight zones, boss arena at the end');
  const walk = { pressed: {}, held: {}, axis: () => ({ x: 1, y: 0 }) };
  const scene = new RWB.scenes.Play(game, 0, { wave: 0, lives: 99 });
  for (const enemy of scene.enemies) { enemy.dead = true; enemy.deathTimer = 2; }
  let frames = 0, retreated = false;
  while (frames < 90 && !scene.marching) { scene.update(1 / 60, walk); frames += 1; }
  const unlocked = scene.marching && scene.camera.lockMin == null && scene.goTimer > 0;
  while (frames < 900 && scene.wave < 1) {
    const before = scene.camera.x;
    scene.update(1 / 60, walk);
    if (scene.camera.x < before - 0.001) retreated = true;
    frames += 1;
  }
  const offscreen = scene.wave === 1 && scene.enemies.length > 0 && scene.enemies.every(enemy => enemy.x < scene.arenaLeft - 8 || enemy.x > scene.arenaRight + 8);
  const locked = scene.wave === 1 && !scene.marching && scene.camera.lockMin === scene.level.wavePoints[1] && scene.camera.x === scene.level.wavePoints[1];
  check(unlocked, 'Clearing a wave unlocks the camera and shows the GO arrow');
  check(!retreated && locked, 'Walking into the next zone locks the camera there and the camera never goes back');
  check(offscreen, 'The next wave spawns from off-screen, not on top of the player');
  const boss = new RWB.scenes.Play(game, 4, { wave: 5, lives: 99 });
  check(boss.wave === 5 && boss.arenaLeft === boss.level.wavePoints[5] && boss.enemies.some(enemy => enemy.boss) && boss.camera.x === boss.level.wavePoints[5], 'The boss is the last zone');
  const continued = RWB.resumeRun(game, { level: 1, wave: 2, score: 100, extra: { lives: 3 } });
  check(continued.wave === 2 && continued.camera.x === continued.level.wavePoints[2] && continued.arenaLeft === continued.level.wavePoints[2] && continued.player.x === continued.arenaLeft + 90, 'Continue resumes at the saved zone');
  const march = new RWB.scenes.Play(game, 0, { wave: 0, lives: 99 });
  for (const enemy of march.enemies) { enemy.dead = true; enemy.deathTimer = 2; }
  let marchFrames = 0;
  while (marchFrames < 120 && !march.marching) { march.update(1 / 60, walk); marchFrames += 1; }
  const midRun = RWB.settings.loadRun();
  const resumedMarch = RWB.resumeRun(game, midRun);
  check(march.marching && midRun.wave === 1 && resumedMarch.wave === 1 && resumedMarch.camera.x === resumedMarch.level.wavePoints[1] && resumedMarch.player.x === resumedMarch.arenaLeft + 90, 'A mid-walk save records the next zone and resume lands there');
  const zone3 = new RWB.scenes.Play(game, 0, { wave: 3, lives: 99 });
  for (const enemy of zone3.enemies) { enemy.dead = true; enemy.deathTimer = 2; }
  let zoneFrames = 0;
  while (zoneFrames < 180 && !zone3.marching) { zone3.update(1 / 60, walk); zoneFrames += 1; }
  const zoneSave = RWB.settings.loadRun();
  const zoneResume = RWB.resumeRun(game, zoneSave);
  check(zone3.marching && zoneSave.wave === 4 && zoneResume.wave === 4 && zoneResume.camera.x === 2880, 'A mid-march reload after zone 3 resumes at wave 4 (cam 2880)');
  const travel = 3600;
  for (let n = 1; n <= 5; n++) {
    const ground = { levelIndex: n - 1, level: { length: 4240 }, wave: 0 };
    const atEnd = RWB.StageWorld.farRight(ground, travel);
    const before = RWB.StageWorld.farRight(ground, travel - 0.5);
    const roofScene = { levelIndex: n - 1, level: { length: 4240 }, wave: 5, roofOn: n === 5 };
    const roofEnd = RWB.StageWorld.farRight(roofScene, travel);
    const layout = RWB.StageWorld.midLayout(n, travel);
    const edges = [0];
    for (const piece of layout.pieces) edges.push(piece.x, piece.x + piece.w);
    let dup = false;
    for (const start of edges) {
      if (start >= layout.M) continue;
      const end = start + 640, seen = {};
      for (const piece of layout.pieces) {
        if (piece.x < end && piece.x + piece.w > start) {
          if (seen[piece.id]) dup = true;
          seen[piece.id] = true;
        }
      }
    }
    const pieces = layout.pieces.slice().sort((a, b) => a.x - b.x);
    let cursor = 0, hole = false;
    for (const piece of pieces) {
      if (piece.x > cursor + 1e-4 && cursor < layout.M) {
        const w = Math.min(piece.x, layout.M) - cursor;
        const planned = layout.planned.some(gap => Math.abs(gap[0] - cursor) < 0.1 && Math.abs(gap[1] - piece.x) < 0.1);
        if (w > 110 && !planned) hole = true;
      }
      cursor = Math.max(cursor, piece.x + piece.w);
    }
    if (cursor < layout.M - 1e-4) hole = true;
    check(atEnd >= 640 && before >= 640 && roofEnd >= 640, 'Stage ' + n + ' far plate still covers the right edge at the end of the road');
    check(!dup && !hole && cursor >= layout.M, 'Stage ' + n + ' mid strip never repeats a slice in one screen and only leaves planned gaps');
    const gaps = [];
    const ordered = layout.pieces.slice().sort((a, b) => a.x - b.x);
    let cover = 0;
    for (const piece of ordered) {
      if (piece.x > cover + 1e-3 && cover < layout.M) gaps.push(Math.min(piece.x, layout.M) - cover);
      cover = Math.max(cover, piece.x + piece.w);
    }
    if (cover < layout.M - 1e-3) gaps.push(layout.M - cover);
    let repeat = false;
    for (let x = 0; x <= layout.M; x += 20) {
      const seen = {};
      for (const piece of layout.pieces) {
        if (piece.x < x + 640 && piece.x + piece.w > x) {
          if (seen[piece.id]) repeat = true;
          seen[piece.id] = true;
        }
      }
    }
    const joins = layout.pieces.filter(piece => piece.ramp);
    check(layout.mode === 'plates' && cover >= layout.M - 1e-3 && gaps.every(gap => gap <= 80), 'Stage ' + n + ' mid plates cover the road and leave gaps of at most 80 units');
    check(!repeat, 'Stage ' + n + ' never shows the same mid plate twice inside 640 units');
    check(joins.length >= 1 && joins.every(piece => piece.ramp >= 32), 'Stage ' + n + ' bakes a ramp of at least 32 units into every plate join');
  }
  check(RWB.StageWorld.FAR_GRADE[1] === 'night' && RWB.StageWorld.FAR_GRADE[5] === 'violet', 'Far plates are night-graded on stages 1 and 5');
  const plateNames = ['stage1-mid-b','stage1-mid-c','stage2-mid-b','stage2-mid-c','stage3-mid-b','stage3-mid-c','stage4-mid-b','stage4-mid-c','stage5-mid-b','stage5-roof-mid'];
  const requested = RWB.__assetUrls();
  check(plateNames.every(name => requested.some(url => url.includes('assets/art/' + name + '.webp?v=' + STAMP)) && RWB.ART_MANIFEST.includes('assets/art/' + name + '.webp')), 'The ten new mid plates resolve with the cache stamp');
}
await pageLoadChecks(check, root);

if (failures.length) {
  console.error(failures.length + ' check(s) failed');
  process.exit(1);
}
console.log('All checks passed (' + passed + ').');

}
main().catch(error => { console.error(error); process.exitCode=1; });
