'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { boot } = require('./soak.cjs');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'docs/review/v11');
(async () => {
  const R = boot(root), images = {};
  for (const frame of Object.keys(R.RILEY16.frames)) images['riley16-' + frame] = await loadImage(path.join(root, R.ART_FILES['riley16-' + frame]));
  R.assets.get = key => images[key] || null; R.assets.has = key => !!images[key];
  fs.mkdirSync(out, { recursive: true });
  let checks = 0; const check = (value, label) => { assert.ok(value, label); checks++; };
  const frames = Object.keys(R.RILEY16.frames), sheet = createCanvas(7 * 180, 6 * 160), sg = sheet.getContext('2d');
  sg.fillStyle = '#273249'; sg.fillRect(0, 0, sheet.width, sheet.height);
  // Art-grounded check: the authored source pivot really touches the painted
  // palm, independent of the sword transform (and independent of the old table).
  for (const [frame, point] of Object.entries(R.RILEY16.handPixels)) {
    const c=createCanvas(images['riley16-'+frame].width,images['riley16-'+frame].height),g=c.getContext('2d');
    g.drawImage(images['riley16-'+frame],0,0);
    const pixels=g.getImageData(point[0]-2,point[1]-2,5,5).data;
    let opaque=0;for(let p=3;p<pixels.length;p+=4)if(pixels[p]>=240)opaque++;
    check(opaque>=20,frame+' grip meets the opaque painted glove: '+opaque+'/25 pixels');
  }
  const gripRows = [];
  for (const [i, frame] of frames.entries()) for (const [j, facing] of [-1, 1].entries()) {
    const player = new R.Riley({ levelIndex: 4 }, { callandor: true });
    player.x = 90; player.y = 133; player.facing = facing; player.ghost = true; player.drawShadow = () => {};
    let distance = 0;
    if (frame.startsWith('walk')) { const n = Number(frame.slice(4)); for (let k = 1; k < n; k++) distance += R.RILEY16.feet['walk' + k][3]; distance += R.RILEY16.feet[frame][3] * 0.8; player.state = 'walk'; }
    player.walkDistance = distance; player.spriteFrame = () => frame;
    const c = createCanvas(180, 160), ctx = c.getContext('2d');
    let bodyTransform, swordTransform;
    const drawImage = ctx.drawImage.bind(ctx);
    ctx.drawImage = (source, ...args) => {
      const tr = ctx.getTransform();
      if (source.width === 24 && source.height === 92) swordTransform = { tr, args };
      else if (!bodyTransform) bodyTransform = tr;
      return drawImage(source, ...args);
    };
    player.draw(ctx, 0);
    check(bodyTransform && swordTransform, frame + ' both body and sword render');
    const h = R.RILEY16.hands[frame], bodyHand = { x: bodyTransform.e + facing * h[0], y: bodyTransform.f + h[1] };
    const t = swordTransform.tr;
    check(Math.hypot(bodyHand.x - t.e, bodyHand.y - t.f) < 1e-5, frame + ' grip pivot follows the exact body transform');
    const gripX = swordTransform.args[0] + 12, gripY = swordTransform.args[1] + 83;
    const grip = { x: t.e + t.a * gripX + t.c * gripY, y: t.f + t.b * gripX + t.d * gripY };
    check(Math.hypot(grip.x - bodyHand.x, grip.y - bodyHand.y) < 1e-5, frame + ' wrapped grip centre exactly matches the authored hand');
    gripRows.push({ frame, facing, hand: bodyHand, wrappedGrip: grip, bodyAligned: true });
    // Render actual poses at 1x for reviewer inspection, both directions.
    const cell = i * 2 + j, x = cell % 7 * 180, y = Math.floor(cell / 7) * 160;
    sg.drawImage(c, x, y); sg.fillStyle = '#ffffff'; sg.font = '11px sans-serif'; sg.fillText(frame + (facing < 0 ? ' ←' : ' →'), x + 5, y + 13);
  }
  for(const frame of frames)for(const facing of [-1,1])for(const progress of [0,.25,.6,1]) {
    const p=new R.Riley({levelIndex:4},{callandor:true});p.facing=facing;p.spriteFrame=()=>frame;p.attackMove=R.MOVES.front;p.stateT=progress*R.MOVES.front.duration;
    const c=createCanvas(640,360),g=c.getContext('2d');let offset;
    g.drawImage=(source,...args)=>{const t=g.getTransform(),dx=args[0]+12,dy=args[1]+83;offset=Math.hypot(t.a*dx+t.c*dy,t.b*dx+t.d*dy);};
    p.drawCallandor(g,0);check(offset<1e-5,frame+' attack rotation never displaces its wrapped grip at '+progress);
  }
  fs.writeFileSync(path.join(out, 'callandor-all-poses.png'), sheet.toBuffer('image/png'));
  fs.writeFileSync(path.join(out, 'callandor-grips.json'), JSON.stringify(gripRows, null, 2) + '\n');
  for (const scale of [1,2,3]) for (const facing of [-1,1]) {
    const player=new R.Riley({levelIndex:4},{callandor:true});Object.assign(player,{x:160,y:230,z:0,ghost:true,state:'idle',facing});
    const images=[false,true].map(callandor=>{const c=createCanvas(640*scale,360*scale),g=c.getContext('2d');g.scale(scale,scale);player.callandor=callandor;player.draw(g,0);return g.getImageData(0,0,c.width,c.height).data;});
    const h=R.RILEY16.hands.idle,cx=(player.x+facing*h[0])*scale,cy=(player.y+h[1])*scale;
    let opaque=0,changed=0;
    for(let y=Math.ceil(cy-2*scale);y<=Math.floor(cy+2*scale);y++)for(let x=Math.ceil(cx-2*scale);x<=Math.floor(cx+2*scale);x++){const p=(y*640*scale+x)*4;if(images[0][p+3]!==255)continue;opaque++;if([0,1,2,3].some(k=>images[0][p+k]!==images[1][p+k]))changed++;}
    check(opaque>=8*scale*scale&&changed===0,'Original idle glove pixels unchanged at scale '+scale+' facing '+facing);
  }
  // Shadow rendering is stage-aware, transparent outside its own footprint,
  // gets smaller/fainter with altitude, and never leaks Canvas state.
  const shadowRows = [], shadowSheet = createCanvas(500, 160), sh = shadowSheet.getContext('2d');
  sh.fillStyle = '#b4b8c2'; sh.fillRect(0, 0, 500, 160);
  for (let stage = 0; stage < 5; stage++) {
    const actor = new R.Entity({ levelIndex: stage }, 50, 45, {}), samples = []; actor.y = 45;
    for (const z of [0, 80]) {
      actor.z = z; const c = createCanvas(100, 80), ctx = c.getContext('2d'); ctx.globalAlpha = 0.8;
      actor.drawShadow(ctx, 0, 24); check(Math.abs(ctx.globalAlpha - 0.8) < 0.01, 'shadow restores alpha');
      const d = ctx.getImageData(0, 0, 100, 80).data; let ink = 0; for (let p = 3; p < d.length; p += 4) ink += d[p];
      check(d[3] === 0, 'shadow leaves distant pixels untouched'); samples.push(ink);
      sh.drawImage(c, stage * 100, z); sh.fillStyle = '#152136'; sh.font = '11px sans-serif'; sh.fillText('Stage ' + (stage + 1) + ' z=' + z, stage * 100 + 4, z + 12);
    }
    check(samples[1] < samples[0] * 0.6, 'airborne shadow shrinks and fades: stage ' + stage + ' ' + samples.join('/')); shadowRows.push(samples);
  }
  check(new Set(shadowRows.map(r => r.join('/'))).size === 5, 'five stage shadow treatments differ');
  fs.writeFileSync(path.join(out, 'fighter-shadows.png'), shadowSheet.toBuffer('image/png'));
  // Every big boss move draws enough non-transparent warning pixels and its
  // floor lane uses the same snapshot geometry as the strike.
  const tellRows = [], tellSheet = createCanvas(640 * 3, 360 * 5), tg = tellSheet.getContext('2d');
  tg.fillStyle = '#273249'; tg.fillRect(0, 0, tellSheet.width, tellSheet.height);
  const g = { arenaLeft: 0, arenaRight: 640, difficulty: 'normal', player: { x: 200, y: 275 }, wave: 5, releaseAttacker() {} };
  for (const [row, kind] of ['fade', 'draghkar', 'forsaken', 'taim'].entries()) for (const [col, move] of R.ShadowMoves[kind].entries()) {
    const boss = new R.ShadowBoss(g, 460, 260, kind); boss.attack = move; boss.ai = 'telegraph'; boss.target = { x: 200, y: 275 }; boss.blinkTo = 264; boss.facing = -1;
    const c = createCanvas(640, 360), ctx = c.getContext('2d'); boss.drawTell(ctx, 0);
    const data = ctx.getImageData(0, 0, 640, 360).data; let pixels = 0;
    for (let p = 3; p < data.length; p += 4) if (data[p] > 24) pixels++;
    check(pixels > 1800, move.name + ' visibly outlines and fills its threat lane');
    if (move.mode === 'beam') check(boss.tellRegions()[0].y === boss.target.y && boss.tellRegions()[0].w === 640, 'beam marks its locked full-screen damage lane');
    tellRows.push({ kind, move: move.name, pixels }); tg.drawImage(c, col * 640, row * 360); tg.fillStyle = '#fff'; tg.font = '16px sans-serif'; tg.fillText(move.name, col * 640 + 10, row * 360 + 24);
  }
  for (const [col, move] of [R.EnemyAttacks.crash, R.EnemyAttacks.charge, R.EnemyAttacks.stomp].entries()) {
    const boss = new R.Chieftain(g, 320, 260); boss.ai = 'telegraph'; boss.attack = move; boss.facing = -1;
    const c = createCanvas(640, 360), ctx = c.getContext('2d'); boss.drawTell(ctx, 0); const data = ctx.getImageData(0, 0, 640, 360).data; let pixels = 0;
    for (let p = 3; p < data.length; p += 4) if (data[p] > 24) pixels++;
    check(pixels > 1800, move.name + ' has a strong warning footprint'); tellRows.push({ kind: 'chieftain', move: move.name, pixels });
    tg.drawImage(c, col * 640, 4 * 360); tg.fillStyle = '#fff'; tg.font = '16px sans-serif'; tg.fillText(move.name, col * 640 + 10, 4 * 360 + 24);
  }
  fs.writeFileSync(path.join(out, 'boss-telegraphs.png'), tellSheet.toBuffer('image/png'));
  fs.writeFileSync(path.join(out, 'combat-render.json'), JSON.stringify({ checks, shadowRows, tellRows, method: 'Offline native Canvas render, not browser or human-play certification' }, null, 2) + '\n');
  console.log('PASS v1.1 combat render: ' + checks + ' assertions; 38 Callandor views, 15 boss tells, five stage shadows');
})().catch(e => { console.error(e); process.exitCode = 1; });
