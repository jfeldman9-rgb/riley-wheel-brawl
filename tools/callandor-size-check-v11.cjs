'use strict';
// Additive, real-decoded NodeSkia evidence. No browser/device claim; no source
// image painting, patched blit arguments, renderer replacement, or test rebaseline.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { boot } = require('./soak.cjs');
const arg = name => process.argv.find(a => a.startsWith('--' + name + '='))?.slice(name.length + 3);
const root = path.resolve(arg('root') || path.join(__dirname, '..'));
const baseline = arg('baseline-root') && path.resolve(arg('baseline-root'));
const out = path.resolve(arg('out') || path.join(root, '../riley-v11-evidence/callandor-size-review'));
assert.ok(baseline, 'Pass --baseline-root=/path/to/approved-unscaled-renderer for authentic before/after evidence');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fileHash = name => sha(fs.readFileSync(name));
const pixelHash = canvas => sha(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data);
const W = 320, H = 280, SX = .76, SY = .82, EPS = 1e-4; // NodeSkia exposes float32-backed transform coefficients.
const scales = [1, 2, 3], phases = [.00001, .2, .5, .8, .99999];
const report = { method: 'Actual unmodified baseline and candidate draw/drawCallandor functions, decoded original PNGs, NodeSkia Canvas2D. Native 1x, true 2x/3x render, and explicitly labeled nearest-neighbor magnified crops. No browser, GPU, physical-device, or closed-hand anatomy claim.', dimensions: { scaleWidth:SX, scaleLength:SY, stamp:[24,92], grip:[12,83], paintedApex:[12,1], bladeApexFromPalm:(83-1)*SY, guardWidth:20*SX, bodyHeight:96 }, sources:{}, art:[], views:[], checks:{}, walkTear:{} };
let geometryChecks = 0, bodyPixelChecks = 0, maxGripError = 0, maxTrailError = 0;
function near(a, b, label) { assert.ok(Math.abs(a-b) < EPS, label + ': ' + a + ' vs ' + b); }
function text(g, str, x, y, size=17) { g.fillStyle='#172638'; g.font=size+'px sans-serif'; g.fillText(str,x,y); }
function board(w,h,title,subtitle) { const c=createCanvas(w,h),g=c.getContext('2d');g.fillStyle='#d1d7de';g.fillRect(0,0,w,h);text(g,title,20,30,24);text(g,subtitle,20,55,16);return {c,g}; }
function save(c,name) { fs.writeFileSync(path.join(out,name),c.toBuffer('image/png')); }
function gitHead(dir) { try{return execFileSync('git',['rev-parse','HEAD'],{cwd:dir,encoding:'utf8'}).trim();}catch{return null;} }
async function load(dir) {
  const R=boot(dir),images={},art={};
  for(const frame of Object.keys(R.RILEY16.frames)) { const key='riley16-'+frame,file=path.join(dir,R.ART_FILES[key]);images[key]=await loadImage(file);art[frame]={file:R.ART_FILES[key],sha256:fileHash(file)}; }
  R.assets.get=k=>images[k]||null;R.assets.has=k=>!!images[k];
  return {R,images,art,dir};
}
function distance(R,frame,phase) { let d=0;for(let n=1;n<Number(frame.slice(4));n++)d+=R.RILEY16.feet['walk'+n][3];return d+R.RILEY16.feet[frame][3]*phase; }
function makePlayer(set,frame,facing,options={}) {
  const p=new set.R.Riley({levelIndex:4},{callandor:options.armed!==false});
  Object.assign(p,{x:160.125,y:220.125,z:frame==='jump'?30:0,facing,ghost:true,state:frame==='lying'?'lying':frame==='getup'?'getup':frame.startsWith('walk')?'walk':'idle'});
  if(options.airborne) { p.z=38.375; }
  if(frame.startsWith('walk')) { p.walkDistance=distance(set.R,frame,options.phase??.8);assert.equal(p.spriteFrame(),frame,'actual walk exposure'); }
  else p.spriteFrame=()=>frame;
  p.drawShadow=()=>{};
  if(options.progress!==undefined) { p.attackMove=set.R.MOVES.front;p.attackName='front';p.stateT=options.progress*p.attackMove.duration;p.spriteFrame=()=>frame; }
  return p;
}
function render(set,frame,facing,options={}) {
  const rs=options.scale||1, p=makePlayer(set,frame,facing,options), c=createCanvas(W*rs,(options.canvasHeight||H)*rs),g=c.getContext('2d');g.scale(rs,rs);
  const order=[],swords=[],body=[],drawImage=g.drawImage.bind(g),cameraX=options.cameraX||0;
  g.drawImage=(source,...args)=>{const tr=g.getTransform();if(source.width===24&&source.height===92){swords.push({source,args,tr});order.push('sword');}else {body.push({source,args,tr});order.push('body');}return drawImage(source,...args);};
  const state=JSON.stringify({x:p.x,y:p.y,z:p.z,hp:p.hp,power:p.power,state:p.state,stateT:p.stateT,walkDistance:p.walkDistance,attack:p.attackMove});
  p.draw(g,cameraX);
  assert.equal(JSON.stringify({x:p.x,y:p.y,z:p.z,hp:p.hp,power:p.power,state:p.state,stateT:p.stateT,walkDistance:p.walkDistance,attack:p.attackMove}),state,'draw leaves combat/movement state unchanged');
  const h=set.R.RILEY16.hands[frame],t=body[0].tr;
  const hand={x:t.e/rs+facing*h[0],y:t.f/rs+h[1]};
  let grip,apex;
  if(swords.length) {const s=swords[0];const point=(x,y)=>({x:(s.tr.e+s.tr.a*(s.args[0]+x)+s.tr.c*(s.args[1]+y))/rs,y:(s.tr.f+s.tr.b*(s.args[0]+x)+s.tr.d*(s.args[1]+y))/rs});grip=point(12,83);apex=point(12,1);}
  return {c,p,rs,hand,grip,apex,swords,body,order};
}
function inspect(rendered,frame,facing,options) {
  const {p,rs,swords,order,hand,grip,apex}=rendered;
  assert.equal(swords.length,1,frame+' exactly one cached sword blit');
  assert.deepEqual(swords[0].args,[-12,-83],frame+' approved stamp offset');
  const tr=swords[0].tr;
  near(Math.hypot(tr.a,tr.b)/rs,SX,frame+' transverse sword scale');near(Math.hypot(tr.c,tr.d)/rs,SY,frame+' longitudinal sword scale');
  const error=Math.hypot(grip.x-hand.x,grip.y-hand.y);assert.ok(error<EPS,frame+' same wrapped grip at palm');maxGripError=Math.max(maxGripError,error);
  near(Math.hypot(apex.x-grip.x,apex.y-grip.y),(83-1)*SY,frame+' shorter painted blade apex');
  if(frame==='idle') assert.equal(order[0],'sword','idle sword behind original painted glove'); else assert.equal(order.at(-1),'sword',frame+' action sword remains foreground');
  if(options.progress!==undefined) {const tip=p.callandorTips.at(-1),error=Math.hypot(tip.x-(apex.x+(options.cameraX||0)),tip.y-apex.y);maxTrailError=Math.max(maxTrailError,error);assert.ok(error<EPS,frame+' trail reaches resized painted apex '+JSON.stringify({error,tip,apex,options}));}
  geometryChecks++;
}
function free(...renders) { for(const r of renders)r.c.width=1; }
function walkTear(set) {
  // Same decoded-pixel metric/limits as the inherited check.cjs; it is an
  // additional native check, never a replacement for the browser gate.
  const R=set.R,rs=2,scale=R.RILEY16.height/R.RILEY16.frames.idle[1];
  const skin=createCanvas(1280,720),plain=createCanvas(1280,720),sg=skin.getContext('2d'),pg=plain.getContext('2d');
  const p=makePlayer(set,'walk1',1,{armed:false,phase:.00001});p.x=180;p.y=250;p.walkDistance=0;const result={};
  function edges(g,y0,y1) {const data=g.getImageData(0,0,1280,720).data,rows=[];for(let y=y0;y<=y1;y++){let lo=1280,hi=-1;for(let x=0;x<1280;x++)if(data[(y*1280+x)*4+3]>48){lo=x;break;}if(lo<1280)for(let x=1279;x>=lo;x--)if(data[(y*1280+x)*4+3]>48){hi=x;break;}rows.push(hi<0?null:[lo,hi]);}return rows;}
  for(let i=0;i<120;i++) {p.walkDistance+=128/60;p.x+=128/60;const frame=p.spriteFrame(),fd=R.RILEY16.frames[frame],foot=R.RILEY16.feet[frame],img=set.images['riley16-'+frame];sg.resetTransform();sg.clearRect(0,0,1280,720);sg.scale(rs,rs);p.drawSprite(sg,0);pg.resetTransform();pg.clearRect(0,0,1280,720);pg.imageSmoothingEnabled=false;const sole=(p.y-foot[1])*rs,x=360-fd[2]*scale*rs,y=sole-fd[3]*scale*rs;pg.drawImage(img,x,y,fd[0]*scale*rs,fd[1]*scale*rs);const a=edges(sg,Math.ceil(sole-88*scale*rs),Math.floor(sole)),b=edges(pg,Math.ceil(sole-88*scale*rs),Math.floor(sole));let excess=result[frame]||0;for(let r=1;r<a.length;r++)if(a[r]&&a[r-1]&&b[r]&&b[r-1])for(let side=0;side<2;side++)excess=Math.max(excess,Math.abs(a[r][side]-a[r-1][side])-Math.abs(b[r][side]-b[r-1][side]));result[frame]=excess;}
  assert.equal(Object.keys(result).length,8);skin.width=plain.width=1;return result;
}
function fullComparisons(before,after,frames) {
  for(let page=0;page<2;page++) {const slice=frames.slice(page*10,page*10+10),rows=Math.ceil(slice.length*2/4),b=board(1840,80+rows*270,'Callandor: all 38 views, native 1x • '+(page+1)+'/2','Each labeled pair uses the real renderer: BEFORE on left, AFTER on right. No sprite pixels edited.');
    for(const [i,frame]of slice.entries())for(const [j,facing]of[-1,1].entries()) {const cell=i*2+j,x=cell%4*460,y=80+Math.floor(cell/4)*270;text(b.g,frame+' '+(facing<0?'LEFT':'RIGHT'),x+12,y+20);for(const [v,set]of[before,after].entries()){const r=render(set,frame,facing);b.g.drawImage(r.c,50,40,220,240,x+v*230,y+25,220,240);text(b.g,v?'AFTER':'BEFORE',x+v*230+10,y+44,12);free(r);}}
    save(b.c,'all-38-before-after-native-'+(page+1)+'.png');b.c.width=1;
  }
}
function walkBoard(before,after) {
  const b=board(1440,1120,'Walk1 • approved grip, smaller crystal sword','Actual 1x and 2x renders; bottom row is a 6x nearest-neighbor grip detail. Same actor, art, pose, anchor and angle.');
  for(const [side,facing]of[-1,1].entries())for(const [v,set]of[before,after].entries()){const x=(side*2+v)*360,r1=render(set,'walk1',facing),r2=render(set,'walk1',facing,{scale:2});text(b.g,(facing<0?'LEFT':'RIGHT')+' • '+(v?'AFTER 0.76w / 0.82h':'BEFORE 1.00w / 1.00h'),x+12,92,16);text(b.g,'Native 1x',x+12,117,14);b.g.drawImage(r1.c,x+20,125);text(b.g,'Actual 2x render',x+12,430,14);b.g.drawImage(r2.c,70*2,100*2,180*2,160*2,x,442,360,320);text(b.g,'Grip detail • 6x magnification of 2x pixels',x+12,795,14);b.g.imageSmoothingEnabled=false;b.g.drawImage(r2.c,(r2.hand.x-25)*2,(r2.hand.y-25)*2,100,100,x+30,809,300,300);free(r1,r2);}
  save(b.c,'walk1-before-after-native-and-closeup.png');b.c.width=1;
}
function actionBoards(before,after) {
  const samples=[{frame:'punch',progress:0},{frame:'punch',progress:.25},{frame:'punch',progress:.6},{frame:'punch',progress:1},{frame:'jump',progress:.6,airborne:true},{frame:'lying',progress:.25,canvasHeight:340}];
  for(let page=0;page<2;page++) {
    const b=board(1920,85+3*495,'Action swing, airborne and lying • true 2x • '+(page+1)+'/2','BEFORE/AFTER in both facings. Fixed front-kick swing progress for pose comparison; the renderer is unchanged by this harness.');
    for(const [i,sample]of samples.slice(page*3,page*3+3).entries())for(const [side,facing]of[-1,1].entries())for(const [v,set]of[before,after].entries()) {
      const x=(side*2+v)*480,y=85+i*495,r=render(set,sample.frame,facing,{...sample,scale:2});
      text(b.g,sample.frame+' '+sample.progress+' '+(facing<0?'L':'R')+' '+(v?'AFTER':'BEFORE'),x+10,y+18,16);
      b.g.drawImage(r.c,40*2,(sample.frame==='lying'?95:40)*2,240*2,230*2,x,y+30,480,460);free(r);
    }
    save(b.c,'action-swing-before-after-2x-'+(page+1)+'.png');b.c.width=1;
  }
  const b=board(1440,85+samples.length*345,'Action grips • actual source-art limitations remain','6x magnification of true 2x pixels. Some action hands are open; foreground blade may obscure fingers.');
  for(const [i,sample]of samples.entries())for(const [side,facing]of[-1,1].entries())for(const [v,set]of[before,after].entries()) {
    const x=(side*2+v)*360,y=85+i*345,r=render(set,sample.frame,facing,{...sample,scale:2});
    text(b.g,sample.frame+' '+sample.progress+' '+(facing<0?'L':'R')+' '+(v?'AFTER':'BEFORE'),x+10,y+18,16);
    b.g.imageSmoothingEnabled=false;b.g.drawImage(r.c,(r.hand.x-25)*2,(r.hand.y-25)*2,100,100,x+30,y+30,300,300);free(r);
  }
  save(b.c,'action-grip-closeups.png');b.c.width=1;
}

(async()=>{
  fs.mkdirSync(out,{recursive:true});const before=await load(baseline),after=await load(root),frames=Object.keys(after.R.RILEY16.frames);
  report.sources={baseline:{root:baseline,commit:gitHead(baseline),rileySha256:fileHash(path.join(baseline,'js/riley.js'))},candidate:{root,commit:gitHead(root),rileySha256:fileHash(path.join(root,'js/riley.js'))},helperSha256:fileHash(__filename)};
  for(const frame of frames) {assert.equal(after.art[frame].sha256,before.art[frame].sha256,frame+' source painting unchanged');report.art.push({frame,...after.art[frame],baselineSha256:before.art[frame].sha256});}
  assert.equal(JSON.stringify(after.R.RILEY16),JSON.stringify(before.R.RILEY16),'frame data, authored hand anchors, and feet are unchanged');
  assert.equal(JSON.stringify(after.R.MOVES),JSON.stringify(before.R.MOVES),'all move reach/damage/timing definitions unchanged');
  for(const name of Object.getOwnPropertyNames(after.R.Riley.prototype)) {if(['constructor','drawCallandor'].includes(name))continue;const a=Object.getOwnPropertyDescriptor(after.R.Riley.prototype,name),b=Object.getOwnPropertyDescriptor(before.R.Riley.prototype,name);for(const key of ['value','get','set'])if(typeof a[key]==='function')assert.equal(a[key].toString(),b[key].toString(),name+' method is byte-identical');}
  // Independently compare all source except the explicit cosmetic constants and
  // drawCallandor method. This also protects constructor/combat/closure code.
  const sourceA=fs.readFileSync(path.join(baseline,'js/riley.js'),'utf8'),sourceB=fs.readFileSync(path.join(root,'js/riley.js'),'utf8');
  const strip=s=>s.replace('  // Cosmetic dimensions only; keep the cached crystal stamp and its grip intact.\n  const SWORD_SCALE_X=.76,SWORD_SCALE_Y=.82;\n','').replace(/    drawCallandor\(ctx,cameraX\)\{[\s\S]*?(?=\n  \}\n  R\.Fireball)/,'');
  assert.equal(strip(sourceB),strip(sourceA),'only cosmetic constants and sword draw method changed');
  let cachedStamp,baselineStamp;
  for(const frame of frames)for(const facing of[-1,1])for(const phase of frame.startsWith('walk')?phases:[.8])for(const scale of scales) {
    const options={phase,scale,cameraX:17.375},b=render(before,frame,facing,{...options,armed:false}),a=render(after,frame,facing,{...options,armed:false});assert.equal(pixelHash(a.c),pixelHash(b.c),frame+' unarmed body pixels unchanged');bodyPixelChecks++;free(a,b);
    for(const progress of[undefined,0,.25,.6,1]) {const opts={...options,...(progress===undefined?{}:{progress})},r=render(after,frame,facing,opts);inspect(r,frame,facing,opts);if(cachedStamp)assert.equal(r.swords[0].source,cachedStamp,'one reused sword canvas');else cachedStamp=r.swords[0].source;free(r);}
  }
  // Each ordinary pose also has a standalone, uncropped before/after render.
  for(const frame of frames)for(const facing of[-1,1]) {const b=render(before,frame,facing),a=render(after,frame,facing);baselineStamp=b.swords[0].source;near(Math.hypot(b.swords[0].tr.a,b.swords[0].tr.b),1,'baseline width');near(Math.hypot(b.swords[0].tr.c,b.swords[0].tr.d),1,'baseline length');report.views.push({frame,facing,bodyHand:a.hand,wrappedGrip:a.grip,centerError:Math.hypot(a.hand.x-a.grip.x,a.hand.y-a.grip.y),beforeApex:b.apex,afterApex:a.apex,bodyShiftX:a.body[0].tr.e-a.p.x,bodyShiftY:a.body[0].tr.f-(a.p.y-a.p.z),airborne:!a.p.grounded});save(b.c,frame+'-'+(facing<0?'left':'right')+'-before-native.png');save(a.c,frame+'-'+(facing<0?'left':'right')+'-after-native.png');free(a,b);}
  assert.equal(pixelHash(cachedStamp),pixelHash(baselineStamp),'cached crystal stamp pixels unchanged');report.sources.swordStampPixelSha256=pixelHash(cachedStamp);save(cachedStamp,'sword-stamp-unchanged.png');
  const glove=[];for(const scale of scales)for(const facing of[-1,1]) {const bare=render(after,'idle',facing,{scale,armed:false}),armed=render(after,'idle',facing,{scale}),A=bare.c.getContext('2d').getImageData(0,0,bare.c.width,bare.c.height).data,B=armed.c.getContext('2d').getImageData(0,0,armed.c.width,armed.c.height).data;let opaque=0,changed=0;for(let y=Math.ceil((bare.hand.y-2)*scale);y<=Math.floor((bare.hand.y+2)*scale);y++)for(let x=Math.ceil((bare.hand.x-2)*scale);x<=Math.floor((bare.hand.x+2)*scale);x++){const i=(y*bare.c.width+x)*4;if(A[i+3]!==255)continue;opaque++;if([0,1,2,3].some(k=>A[i+k]!==B[i+k]))changed++;}assert.ok(opaque>=8*scale*scale);assert.equal(changed,0,'idle opaque fist remains untouched');glove.push({scale,facing,opaque,changed});free(bare,armed);}
  // Exercise additional airborne action frames and actual multi-frame trail history.
  for(const frame of['kick','roundhouse','fireball'])for(const facing of[-1,1]) {const r=render(after,frame,facing,{airborne:true,scale:2,progress:.6});inspect(r,frame,facing,{progress:.6});free(r);}
  for(const facing of[-1,1]) {const p=makePlayer(after,'punch',facing,{progress:0}),c=createCanvas(W,H),g=c.getContext('2d');for(let i=0;i<14;i++){p.stateT=p.attackMove.duration*i/13;p.drawCallandor(g,0);assert.equal(p.callandorTips.length,Math.min(9,i+1),'bounded visual trail history');}p.attackMove=null;p.drawCallandor(g,0);assert.equal(p.callandorTips.length,0,'trail clears at rest');c.width=1;}
  report.walkTear={baseline:walkTear(before),candidate:walkTear(after),limits:{walk3:8,walk4:4,walk8:9,other:2}};assert.deepEqual(report.walkTear.candidate,report.walkTear.baseline,'walk tear measurements unchanged');report.walkTear.nativeViolations=Object.entries(report.walkTear.candidate).filter(([frame,n])=>n>(report.walkTear.limits[frame]||2)).map(([frame,value])=>({frame,value,browserLimit:report.walkTear.limits[frame]||2}));report.walkTear.note='Native Skia differs from the inherited browser backend: listed violations already occur on the unmodified baseline. This is an unchanged-body diagnostic, not a browser-gate pass. Original test thresholds were not edited.';
  fullComparisons(before,after,frames);walkBoard(before,after);actionBoards(before,after);
  report.checks={poseViews:report.views.length,sourcePaintingsUnchanged:report.art.length,geometryChecks,bodyPixelChecks,maxGripError,maxTrailError,idleGlove:glove,sourceScope:true,combatMethodsUnchanged:true,cachedStampUnchanged:true,singleCachedBlit:true,layerOrderPreserved:true,walkTearLimitsUnchanged:true};
  assert.equal(fileHash(path.join(root,'js/riley.js')),report.sources.candidate.rileySha256,'source stable during run');assert.equal(fileHash(path.join(baseline,'js/riley.js')),report.sources.baseline.rileySha256,'baseline stable during run');
  fs.writeFileSync(path.join(out,'callandor-size-report.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(out,'source-hashes.txt'),JSON.stringify(report.sources,null,2)+'\n'+report.art.map(a=>a.sha256+'  '+a.file).join('\n')+'\n');
  console.log('PASS '+JSON.stringify(report.checks));console.log('UNCHANGED native walk-tear diagnostic (not a browser-threshold pass) '+JSON.stringify(report.walkTear));
})().catch(error=>{console.error(error);process.exitCode=1;});
