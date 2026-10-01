'use strict';
// Additive real-decoded-pixel left-wall regression. This uses native Skia, not
// browser/device evidence. The inherited acceptance tools and limits are unchanged.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { boot } = require('./soak.cjs');
const arg = name => process.argv.find(a => a.startsWith('--'+name+'='))?.split('=').slice(1).join('=');
const root = path.resolve(arg('root') || path.join(__dirname, '..'));
const artRoot = path.resolve(arg('art-root') || root);
const out = path.resolve(arg('out') || path.join(__dirname, '../docs/review/v11/left-body'));
const baseline = process.argv.includes('--record-baseline');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const still = { pressed:{}, held:{}, axis:()=>({x:0,y:0}) };
const round = n => Number(n.toFixed(6));
const scales = [.75,1,1.25,1.5,2,2.5,3], phases = [0,.2,.5,.8,.99999];
const origins = [{arena:0,camera:0},{arena:720,camera:720},{arena:720,camera:740.125}];
function leftWall(s) { return Math.max(s.arenaLeft,s.camera.x); }
function legacy(p) { p.x = Math.max(leftWall(p.g)+40,Math.min(p.g.arenaRight-40,p.x)); }
function contain(p) { if (p.containPaintedBody) p.containPaintedBody(); else legacy(p); }
// A tiny interior offset avoids modulo rounding into the previous decimal exposure.
function distance(R,frame,phase) { let d=0; for(let n=1;n<Number(frame.slice(4));n++)d+=R.RILEY16.feet['walk'+n][3]; return d+R.RILEY16.feet[frame][3]*phase+(phase===0?1e-9:0); }
function player(R,frame,facing,origin,phase=0) {
  const s={arenaLeft:origin.arena,arenaRight:origin.camera+640,camera:{x:origin.camera},levelIndex:4,phase:'play'};
  const p=new R.Riley(s,{});p.x=leftWall(s)+40;p.y=143.125;p.facing=facing;p.ghost=true;
  p.state=frame==='lying'?'lying':frame==='getup'?'getup':frame.startsWith('walk')?'walk':'idle';
  // Select all authored frames, but do NOT pass forcedFrame to drawSprite:
  // normal walking body correction and source-row skinning must remain active.
  if(frame.startsWith('walk')){p.walkDistance=distance(R,frame,phase);assert.equal(p.spriteFrame(),frame,'real walk exposure selection');}
  else p.spriteFrame=()=>frame;
  return p;
}
function pixels(p,rs,wall=leftWall(p.g)) {
  const pad=120,c=createCanvas(Math.ceil(320*rs),Math.ceil(180*rs)),g=c.getContext('2d');
  g.scale(rs,rs);g.translate(pad,0);
  const camera=p.g.camera,shift=Math.round(((camera.shakeX||0)+(camera.punchX||0))*rs)/rs;
  g.translate(shift,0);p.drawSprite(g,camera.x);
  const width=c.width,height=c.height,a=g.getImageData(0,0,width,height).data;
  let min=Infinity,max=-Infinity,outside=0,painted=0,anyOutside=0;
  const edge=(pad+Math.max(0,wall-camera.x+shift))*rs;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const alpha=a[(y*width+x)*4+3];if(alpha&&x+.5<edge)anyOutside++;
    if(alpha<=128)continue;painted++;min=Math.min(min,(x-pad*rs)/rs);max=Math.max(max,(x-pad*rs)/rs);if(x+.5<edge)outside++;
  }
  return {canvas:c,minX:round(min),maxX:round(max),opaqueBodyPixels:painted,pixelsLeftOfWall:outside,nonzeroPixelsLeftOfWall:anyOutside};
}
function plain(p){const {canvas,...rest}=p;return rest;}
(async()=>{
  fs.mkdirSync(out,{recursive:true});const R=boot(root);await new Promise(r=>setImmediate(r));
  const images={},art={},sourceRows={};for(const frame of Object.keys(R.RILEY16.frames)){
    const key='riley16-'+frame,file=path.join(artRoot,R.ART_FILES[key]),im=await loadImage(file);images[key]=im;
    const c=createCanvas(im.width,im.height),g=c.getContext('2d');g.drawImage(im,0,0);const a=g.getImageData(0,0,c.width,c.height).data;
    let min=Infinity,max=-Infinity;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]){min=Math.min(min,x);max=Math.max(max,x+1);}
    assert.equal(min,2,frame+' left source support');assert.equal(max,im.width-2,frame+' right source support');
    sourceRows[frame]=[];for(let y=0;y<im.height;y++){let left=Infinity,right=-Infinity;for(let x=0;x<im.width;x++)if(a[(y*im.width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x+1);}if(Number.isFinite(left))sourceRows[frame].push({y,left,right});}
    art[frame]={file:R.ART_FILES[key],sha256:hash(file),width:im.width,height:im.height,alphaBounds:[min,max]};
  }
  R.assets.get=k=>images[k]||null;R.assets.has=k=>!!images[k];
  const sources={riley:hash(path.join(root,'js/riley.js')),scenes:hash(path.join(root,'js/scenes.js'))};
  if(!baseline)assert.equal(typeof R.Riley.prototype.containPaintedBody,'function');
  // Independently project EVERY occupied source row, rather than reusing the
  // runtime convex support, and verify the support is exact at all exposures.
  let supportChecks=0;
  if(!baseline)for(const frame of Object.keys(R.RILEY16.frames))for(const facing of [-1,1])for(const phase of frame.startsWith('walk')?phases:[0])for(const flash of [false,true]){
    const p=player(R,frame,facing,origins[0],phase);p.hitFlash=flash?.1:0;
    const [w,h,ax,ay]=R.RILEY16.frames[frame],scale=R.RILEY16.height/R.RILEY16.frames.idle[1];
    let body=0,leg=0;
    if(frame.startsWith('walk')){const n=Number(frame.slice(4)),first=R.RILEY16.feet[n<=4?'walk1':'walk5'][0],stancePhase=p.walkDistance-(n<=4?0:32),correction=facing*(first-stancePhase-R.RILEY16.feet[frame][0]);body=Math.max(-2,Math.min(2,correction));leg=(correction-body)*facing;}
    let left=Infinity,right=-Infinity;
    for(const row of sourceRows[frame]){const t=Math.max(0,Math.min(1,(row.y+.5-(ay-88))/88)),shift=leg*t*t*(3-2*t);left=Math.min(left,(row.left-ax)*scale+shift);right=Math.max(right,(row.right-ax)*scale+shift);if(flash){left=Math.min(left,(row.left-ax)*scale);right=Math.max(right,(row.right-ax)*scale);}}
    const expected=facing<0?{minX:body-right,maxX:body-left}:{minX:body+left,maxX:body+right},actual=p.paintedBodyBounds();
    assert.ok(Math.abs(actual.minX-expected.minX)<1e-9&&Math.abs(actual.maxX-expected.maxX)<1e-9,frame+' exact decoded row support, facing '+facing+', phase '+phase+', flash '+flash);supportChecks++;
  }
  const rows=[];let worstRequired=0,preserved40=0;
  for(const frame of Object.keys(R.RILEY16.frames))for(const facing of [-1,1])for(const phase of frame.startsWith('walk')?phases:[0])for(const rs of scales)for(const origin of origins){
    R.display.renderScale=rs;R.display.mode='sharp';const p=player(R,frame,facing,origin,phase),before=pixels(p,rs);
    const bounds=p.paintedBodyBounds?.();contain(p);const after=pixels(p,rs);
    if(bounds){worstRequired=Math.max(worstRequired,-bounds.minX);if(bounds.minX>=-40){assert.equal(p.x,leftWall(p.g)+40);preserved40++;}}
    rows.push({frame,facing,phase,renderScale:rs,...origin,x:round(p.x),requiredLeftExtent:bounds?round(-bounds.minX):null,before:plain(before),after:plain(after)});
    before.canvas.width=1;after.canvas.width=1;
  }
  const scenarios=[];
  function scene(){const s=new R.scenes.Play(R.game,0,{});s.enemies=[];s.projectiles=[];s.hazards=[];s.pickups=[];s.allies=[];s.boss=null;s.camera.x=0;s.player.x=40;s.player.y=143.125;s.player.facing=-1;s.player.ghost=true;s.player.invuln=0;return s;}
  function capture(name,s,extra={}){const m=pixels(s.player,2);scenarios.push({name,x:round(s.player.x),state:s.player.state,frame:s.player.spriteFrame(),...plain(m),...extra});m.canvas.width=1;}
  R.display.renderScale=2;
  for(const state of ['hurt','knockdown']){
    const s=scene();s.enemies=[{dead:false,remove:false,update(){s.player.takeHit(1,s.player.x+30,{kb:240});if(state==='knockdown')s.player.setState(state);}}];
    s.update(1/60,still);capture('same-frame '+state+' after player.update',s);
  }
  {const s=scene();s.hazards=[{life:1,update(){s.player.takeHit(1,s.player.x+30,{kb:240});}}];s.update(1/60,still);capture('same-frame hazard hurt after player.update',s);}
  for(const state of ['hurt','knockdown','lying','getup']){
    const s=scene();s.player.state=state;s.player.x=-20;s.player.vx=-480;s.player.update(1/60,still);capture('direct '+state+' recoil',s);
  }
  for(const early of ['stunned','grabbed','dead']){
    const s=scene();s.player.x=-20;s.player.state='hurt';
    if(early==='stunned')s.player.stunTimer=1;if(early==='grabbed'){s.player.grabbedBy={dead:false};s.player.grabTimer=1;s.player.grabDamageClock=0;}if(early==='dead'){s.player.dead=true;s.player.state='death';}
    s.player.update(1/60,still);capture('early-return '+early,s);
  }
  {const s=scene();s.camera.follow=function(){this.x+=18.125;};s.update(1/60,still);capture('camera advances after player.update',s);}
  // Exercise real Play.draw order while replacing unrelated art/HUD overlays.
  // Motion.apply uses the CURRENT state with interpolated old x/z/walkDistance.
  const saveHUD=R.drawHUD,saveFailure=R.drawArtFailure,saveTouch=R.input.drawTouch;
  R.drawHUD=R.drawArtFailure=R.input.drawTouch=()=>{};
  function rendered(name,s,alpha){
    const p=s.player,authoritative={x:p.x,y:p.y,z:p.z,walkDistance:p.walkDistance,state:p.state,cameraX:s.camera.x,grabbedX:p.grabbed?.x};
    let observed;s.drawWorld=()=>{observed=plain(pixels(p,2));};s.drawBark=()=>{};s.bossCard=0;s.twinkleFreed=false;
    R.Motion.alpha=alpha;const c=createCanvas(640,360);s.draw(c.getContext('2d'));R.Motion.alpha=1;c.width=1;
    assert.deepEqual({x:p.x,y:p.y,z:p.z,walkDistance:p.walkDistance,state:p.state,cameraX:s.camera.x,grabbedX:p.grabbed?.x},authoritative,'draw restores authoritative actor/camera/grabbed actor');
    scenarios.push({name,alpha,...observed,restored:true});
  }
  {const s=scene();s.player.state='round';contain(s.player);const x=s.player.x;s.camera.hitstop=.1;s.camera.punchX=-12;s.update(1/60,still);if(!baseline)assert.equal(s.player.x,x,'camera hit-stop translation cannot push authoritative x');rendered('hit-stop camera translation stays render-only',s,1);}
  for(const alpha of [0,.1,.5,.9,1])for(const kind of ['new wider pose','walking exposure','camera motion']){
    const s=scene(),p=s.player;p.facing=kind==='walking exposure'?1:-1;
    if(kind==='walking exposure'){p.state='walk';p.walkDistance=26.6;}
    R.Motion.capture(s);
    if(kind==='new wider pose')p.state='round';
    if(kind==='walking exposure')p.walkDistance=27.1;
    if(kind==='camera motion'){s.camera.x=10.125;s.camera.punchX=-8.25;}
    contain(p);rendered('interpolation '+kind,s,alpha);
  }
  for(const mode of ['alpha=1','no previous','paused']){
    const s=scene(),p=s.player;p.grabbed={x:p.x-22,y:p.y,z:0};s.enemies.push(p.grabbed);
    if(mode!=='no previous')R.Motion.capture(s);
    p.state='round';contain(p);const x=p.x,grabbedX=p.grabbed.x;s.camera.punchX=-24;
    contain(p);if(!baseline){assert.equal(p.x,x,'shake must not move simulation x');assert.equal(p.grabbed.x,grabbedX,'shake must not move grabbed simulation x');}
    if(mode==='paused')s.paused=true;
    rendered(mode+' restores Riley and grabbed actor',s,mode==='alpha=1'?1:.5);
  }
  R.drawHUD=saveHUD;R.drawArtFailure=saveFailure;R.input.drawTouch=saveTouch;
  // A review sheet repeats the independently reported 38-frame 80%-span probe.
  const sheet=createCanvas(1520,950),sg=sheet.getContext('2d');sg.fillStyle='#1b2638';sg.fillRect(0,0,sheet.width,sheet.height);sg.font='12px sans-serif';
  const probe=[];for(const [i,frame]of Object.keys(R.RILEY16.frames).entries())for(const [j,facing]of [-1,1].entries()){
    const p=player(R,frame,facing,origins[0],.8);p.y=143;const before=pixels(p,1);contain(p);const after=pixels(p,1);const n=i*2+j,x=n%8*190,y=Math.floor(n/8)*190;
    for(const [k,m]of [before,after].entries()){sg.drawImage(m.canvas,75,25,145,135,x+k*93,y+16,93,145);sg.strokeStyle=k?'#70dfb3':'#ff718b';const wallX=x+k*93+45/145*93;sg.beginPath();sg.moveTo(wallX,y+16);sg.lineTo(wallX,y+160);sg.stroke();}
    sg.fillStyle='#fff';sg.fillText(frame+(facing<0?' L':' R'),x+4,y+13);sg.fillText('x40: '+before.minX+'  fixed: '+after.minX,x+4,y+178);
    probe.push({frame,facing,before:plain(before),after:plain(after),x:round(p.x)});before.canvas.width=1;after.canvas.width=1;
  }
  fs.writeFileSync(path.join(out,'left-body-before-after.png'),sheet.toBuffer('image/png'));
  const failures=rows.filter(r=>r.after.pixelsLeftOfWall),nonzeroFailures=rows.filter(r=>r.after.nonzeroPixelsLeftOfWall),scenarioFailures=scenarios.filter(r=>r.pixelsLeftOfWall);
  const report={method:'Native Skia Canvas2D with actual decoded, unmodified source PNGs. Body only (ghost=true); all 19 frames, both facings, five walking phases, seven render scales, three arena/camera origin combinations. Overscan counts alpha>128 pixels beyond wall; alpha>0 also reported. Original 40-unit clamp is a negative control. No forcedFrame bypass of gait. Includes same-frame hurt/knockdown, recoil, early returns, camera advance/translation and actual Play.draw interpolation restore.',baseline,sources,art,summary:{supportChecks,cases:rows.length,baselineClipped:rows.filter(r=>r.before.pixelsLeftOfWall).length,afterClipped:failures.length,nonzeroAfterClipped:nonzeroFailures.length,scenarioCases:scenarios.length,scenarioClipped:scenarioFailures.length,worstRequiredLeftExtent:round(worstRequired),preservedDefault40Cases:preserved40,probeCases:probe.length,probeBeforeClipped:probe.filter(r=>r.before.pixelsLeftOfWall).length,probeAfterClipped:probe.filter(r=>r.after.pixelsLeftOfWall).length},probe,scenarios,failures,nonzeroFailures,rows};
  assert.equal(hash(path.join(root,'js/riley.js')),sources.riley,'Riley source changed during test');assert.equal(hash(path.join(root,'js/scenes.js')),sources.scenes,'Scenes source changed during test');
  fs.writeFileSync(path.join(out,'left-body-containment.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));
  assert.ok(report.summary.baselineClipped>0,'40-unit negative control must expose clipping');
  if(!baseline){assert.equal(failures.length,0,'painted body clips left wall');assert.equal(nonzeroFailures.length,0,'nonzero body alpha clips left wall');assert.equal(scenarioFailures.length,0,'update/render-order body clipping');}
})().catch(e=>{console.error(e);process.exitCode=1;});
