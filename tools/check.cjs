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
    const type = file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : file.endsWith('.png') ? 'image/png' : file.endsWith('.jpeg') ? 'image/jpeg' : file.endsWith('.ttf') ? 'font/ttf' : 'application/octet-stream';
    res.setHeader('Content-Type', type);
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-accelerated-2d-canvas'] });
    const STAGE2 = JSON.stringify({ v: 2, at: 1700000000000, level: 1, wave: 2, score: 1200, extra: { saidin: 40, loial: true, lives: 2, callandor: false } });
    const open = async (seed) => {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
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
    check(seeded.menu.items.includes('CONTINUE'), 'A saved Stage 2 run still offers CONTINUE');
    const fresh = await open(null);
    check(fresh.errors.length === 0 && fresh.menu.raw === null && !fresh.menu.items.includes('CONTINUE'), 'A fresh profile shows no CONTINUE after warmup');
    const visual = await seeded.page.evaluate(() => {
      const feet = [];
      for (const kind of Object.keys(RWB.Puppet.defs)) {
        if (kind === 'forsaken' && RWB.assets.has('belal-idle')) continue;
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
      function row(cam) {
        const c = document.createElement('canvas'); c.width = 640; c.height = 360;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        RWB.display.renderScale = 1;
        RWB.StageWorld.draw(ctx, { levelIndex: 0, camera: { x: cam }, time: 0, wave: 3 });
        return Array.from(ctx.getImageData(0, 210, 640, 1).data);
      }
      const whole = row(100), frac = row(100.4), next = row(101);
      const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++; return n; };
      return { feet, dust: puff('dust'), chunk: puff('chunk', '#c4b8a4'), bg: { sub: diff(whole, frac), step: diff(whole, next) } };
    });
    const planted = visual.feet.every(r => r.early && r.late && r.early.drift <= 8 && r.late.drift <= 8 && r.early.drift < r.early.travel * 0.7 && r.late.drift < r.late.travel * 0.7);
    check(planted, 'Baked walk frames keep the planted hoof fixed in world space ' + JSON.stringify(visual.feet));
    check(visual.dust.corner < visual.dust.peak * 0.5 && visual.dust.peak > 40 && visual.chunk.corner < visual.chunk.peak * 0.5 && visual.chunk.peak > 40, 'Dust and debris pixels are soft rounds, not hard rectangles ' + JSON.stringify({ dust: visual.dust, chunk: visual.chunk }));
    check(visual.bg.sub > 0 && visual.bg.step > 0, 'A fractional camera moves the cached background off the whole-pixel snap ' + JSON.stringify(visual.bg));
    console.log('Baked hoof drift ' + JSON.stringify(visual.feet));
    console.log('Background subpixel delta ' + JSON.stringify(visual.bg));
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}
async function main() {
const RWB = boot(root);
const failures = [];
function check(value, message) {
  console.log((value ? 'PASS ' : 'FAIL ') + message);
  if (!value) failures.push(message);
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
check([...artFiles('assets/art'),...artFiles('assets/cutscenes')].filter(f=>/\.(png|jpeg)$/.test(f)).every(f=>RWB.ART_MANIFEST.includes(f) && Object.values(RWB.ART_FILES).includes(f)), 'Every committed painted image has a registered manifest key');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|ttf)[^"]*)"/g)].map(match => match[1]);
const STAMP='20260926-grok3b';console.log('Cache stamp: '+STAMP);
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
check(Object.values(RWB.ART_FILES).every(src=>!src.startsWith('/') && /\.(png|jpeg|json)$/.test(src)), 'Art hooks use relative image/JSON paths');
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
  check(/SINGLE_WIDE=\/\^stage\[2-5\]-\(\?:mid\|near\)\$\//.test(stageSource)&&/SINGLE_WIDE\.test\(key\)\?700/.test(stageSource)&&/\(\?:roof-\)\?far/.test(stageSource),'Mid/near/far (incl. roof) plates draw one full-width painting per view: no repeated landmark or internal join on screen');
  check(/stage1Wide\?720/.test(stageSource)&&/far\?700/.test(stageSource)&&/factor=Math\.min\(factor,Math\.max\(0,\(width-640\)\/CAMERA_RANGE\)\)/.test(stageSource),'Stage 1 mid/near plates are 720 units wide and far skies cap parallax to one soft join');
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
  check(/const shift=cam-camExact/.test(stageBlit)&&/drawImage\(slot\.canvas,shift,0,640,360\)/.test(stageBlit),'Cached backgrounds blit at the sub-pixel camera offset');
}
await pageLoadChecks(check, root);

if (failures.length) {
  console.error(failures.length + ' check(s) failed');
  process.exit(1);
}
console.log('All checks passed.');

}
main().catch(error => { console.error(error); process.exitCode=1; });
