import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { STAGE7_PHONE_CSS } from '../src/stage7-phone.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage7Simulation, withSeed } from './helpers/stage7-harness.mjs';
import { stage1Simulation } from './helpers/stage1-simulation.mjs';
import { Asmodean } from '../src/asmodean.js';
import { installDebug7 } from '../src/stage7-debug.js';
import { q } from '../src/config.js';

function scene(fn) {
  return withSeed(1, () => {
    const h = stage7Simulation({ mode: false });
    h.setController(null);
    const s = h.s;
    s.started = true; s.paused = false; s.cutscene = null;
    s.zoneI = 3; s.zone = s.zones[3]; s.bounds = { l: 3920, r: 5200 };
    s.enemies = [];
    try { return fn(s, h); } finally { h.destroy(); }
  });
}

test('boss dialog Esc swallows duplicate pause/start events for 350 ms', () => scene(s => {
  s.hud.capWho = { text: 'ASMODEAN', setAlpha() {} };
  s.hud.capT = 5;
  s.onPress('pause');
  assert.equal(s.hud.capT, 0);
  s.onPress('pause'); s.onPress('start');
  assert.equal(s.pauseReasons.has('manual'), false);
  s.kit.echo = performance.now() - 351;
  s.onPress('pause');
  assert.equal(s.pauseReasons.has('manual'), true);
}));

for (const kind of ['three hits', 'throw']) test(`${kind} breaks give stagger and at least four seconds before re-channel`, () => scene(s => {
  const b = s.boss = new Asmodean(s, 4800, 630);
  s.enemies = [b]; b.entering = false; b.phase = 3;
  b.startChannel();
  // Reproduce a late break, when the old schedule is already nearly due.
  b.clock = b.channelAt - 0.1;
  const at = b.clock;
  if (kind === 'throw') b.takeHit({ dmg: 1, throw: true });
  else for (let i = 0; i < 3; i++) b.takeHit({ dmg: 1 });
  assert.equal(b.state, 'stagger');
  assert.ok(b.channelAt >= at + 4);
  for (let i = 0; i < 13; i++) b.step(0.1);
  assert.equal(b.state, 'stagger');
  for (let i = 0; i < 26; i++) { b.step(0.1); assert.notEqual(b.state, 'channel'); }
  b.bashAt = Infinity; b.setState('idle');
  b.step(0.2);
  assert.equal(b.state, 'channel');
}));

test('return from clear holds the title until attack mashing stops for 500 ms', () => {
  const h = stage1Simulation({ stage: 1, mode: false, followRestart: true });
  h.setController(null);
  try {
    h.s.scene.restart({ stage: 1, stage7Return: true }); h.step();
    assert.ok(h.s.titleLock > performance.now());
    for (let i = 0; i < 20; i++) h.s.onPress('attack');
    assert.equal(h.s.started, false);
    h.s.titleLock = performance.now() - 1;
    h.s.onPress('attack');
    assert.equal(h.s.started || h.s.startRequested, true);
  } finally { h.destroy(); }
});

test('debug T reuses one live Trolloc and replaces a dead one; production has no debug hook', () => scene(s => {
  assert.equal(s.kit.debug, undefined);
  const old = q.get('s7debug'); q.set('s7debug', '1');
  try {
    s.boss = new Asmodean(s, 4800, 630); s.boss.entering = false;
    installDebug7(s.kit);
    const first = s.kit.debug.forceChannel();
    for (let i = 0; i < 10; i++) assert.equal(s.kit.debug.forceChannel(), first);
    assert.equal(s.enemies.filter(e => e.alive && e.type === 'grunt').length, 1);
    first.alive = false;
    assert.notEqual(s.kit.debug.forceChannel(), first);
    assert.equal(s.enemies.filter(e => e.alive && e.type === 'grunt').length, 1);
  } finally { old === null ? q.delete('s7debug') : q.set('s7debug', old); }
}));

test("phone CALL overlay bounds clear the fight lane at 390x844 and smaller sizes", { timeout: 30_000 }, async t => {
  const chrome = [process.env.RWB_CHROME, "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find(p => p && existsSync(p));
  if (!chrome) { t.skip("Chrome/Chromium is not installed"); return; }
  const dir = mkdtempSync(join(tmpdir(), "rwb-s7-layout-"));
  // Render the shipped shared CSS with the Stage 7 override. No game renderer
  // or Playwright dependency is needed to measure the DOM control geometry.
  const sharedCss = readFileSync(new URL("../index.html", import.meta.url), "utf8").split("<style>")[1].split("</style>")[0];
  const script = `
    const sizes = [[390,844],[320,568],[360,640]];
    const rows = await Promise.all(sizes.map(([width,height]) => new Promise(resolve => {
      const frame = document.createElement('iframe');
      frame.style.cssText = 'border:0;width:'+width+'px;height:'+height+'px';
      frame.onload = () => {
        const d = frame.contentDocument, w = frame.contentWindow;
        const bottom = d.querySelector('canvas').getBoundingClientRect().bottom;
        const controls = ['stick','tbA','tbS','tbJ','tbB','tbL'].map(id => {
          const r = d.getElementById(id).getBoundingClientRect();
          return {id,top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width};
        });
        d.body.classList.add('s7-call');
        const hidden = w.getComputedStyle(d.getElementById('touch')).visibility;
        d.body.classList.remove('s7-call','stage-7');
        const restored = w.getComputedStyle(d.getElementById('touch')).visibility;
        resolve({width,height,bottom,controls,hidden,restored});
      };
      const canvasHeight = width * 720 / 1280, top = (height-canvasHeight)/2;
      frame.srcdoc = '<style>'+${JSON.stringify(sharedCss + STAGE7_PHONE_CSS)}+'</style>'+
        '<body class="touch stage-7"><div id="game"><canvas style="position:absolute;top:'+top+'px;width:'+width+'px;height:'+canvasHeight+'px"></canvas></div>'+
        '<div id="touch"><div id="stick"></div>'+['A','S','J','B','L','P'].map(id=>'<div id="tb'+id+'" class="tb"></div>').join('')+'</div></body>';
      document.body.appendChild(frame);
    })));
    document.getElementById('result').textContent = JSON.stringify(rows);
  `;
  const page = join(dir, "layout.html");
  writeFileSync(page, '<pre id="result"></pre><script type="module">'+script+'</script>');
  try {
    const { stdout } = await promisify(execFile)(chrome, ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-first-run", "--user-data-dir="+join(dir,"profile"), "--virtual-time-budget=2000", "--dump-dom", pathToFileURL(page).href], { timeout: 25_000, maxBuffer: 2 * 1024 * 1024 });
    const rows = JSON.parse(stdout.match(/<pre id="result">(.*?)<\/pre>/s)?.[1] || "null");
    assert.equal(rows?.length, 3, "browser rendered all portrait fixtures");
    for (const row of rows) {
      const call = row.controls.find(c => c.id === 'tbL');
      // The complete canvas includes the fighters above their foot lane.
      // Keeping CALL outside it also protects the entire fight, not just feet.
      assert.ok(call.top >= row.bottom, `${row.width}x${row.height}: CALL overlay clears fight lane`);
      for (const c of row.controls) {
        assert.ok(c.top >= row.bottom, `${row.width}x${row.height}: ${c.id} clears canvas`);
        assert.ok(c.width >= 44 && c.left >= 0 && c.right <= row.width && c.bottom <= row.height, `${c.id} stays reachable`);
      }
      assert.equal(row.hidden, "hidden");
      assert.equal(row.restored, "visible");
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

