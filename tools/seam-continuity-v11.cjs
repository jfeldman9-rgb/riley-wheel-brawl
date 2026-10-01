'use strict';
// Read-only mid-layer join continuity check (1.2). It renders the real decoded
// background at each mid-layer join (StageWorld, @napi-rs/canvas, 1280x720,
// renderScale 2, the same offline path seams-visual-v11 uses) and measures what
// a player sees at the join, against the plate's own interior statistics:
//
//  ghost  Double exposure / half-faded structure. For every pixel of the band
//         where both plates exist: min(|shown - plate P alone|, |shown - plate N
//         alone|), P and N rendered unramped by the same bake/draw path, all three
//         box-blurred to structure scale (4 units). A pixel that matches neither
//         painting is a ghost (two paintings, or a painting and the far layer,
//         superimposed). Worst 8-unit column window.
//  cut    Hard truncation: the visible 1-px step where a plate ends (or starts)
//         without a ramp, over the rows where that plate is actually seen.
//
// Both are divided by the same frame's self-misregistration texture: what a
// continuous painting shows if its two halves are misaligned by 2 world units
// (ghostRef = 0.5 * mean |I(x) - I(x+2u)| over opaque mid pixels, same blur;
// cutRef = the same 2-px step operator over the cut plate's interior columns).
// A join FAILS when ghostRatio > GHOST_MAX or cutRatio > CUT_MAX.
// Synthetic continuous joins built from one real plate are run as controls; the
// opaque-bottom/ramped-top controls misregistered by <=2 units must pass or the
// metric itself is broken (exit 2).
// Nothing is written into js/ or assets/. Output: docs/review/v11/seam-continuity/.
const fs=require('fs'),path=require('path');
const W=1280,ROWS=440,RS=2;           // 1280x720 frame; rows above the floor plate (floor at y=222 units)
const DELTA_U=2,WIN_U=8;               // reference misregistration and ghost window, world units
const GHOST_MAX=3.0,CUT_MAX=2.0;       // see docs/review/v11/SEAMS_1_2.md for calibration
const BLUR_PX=8;                       // ghost compares structure (4-unit box), not resampling grain

function diff3(A,B,i,j){i*=4;j*=4;return (Math.abs(A[i]-B[j])+Math.abs(A[i+1]-B[j+1])+Math.abs(A[i+2]-B[j+2]))/3;}
// Per-column mean over rows of min(|X-Xp|,|X-Xn|) for x in [x0,x1).
function ghostColumns(X,Xp,Xn,w,rows,x0,x1){
  const col=new Float64Array(w);
  for(let x=Math.max(0,x0);x<Math.min(w,x1);x++){let s=0;for(let y=0;y<rows;y++){const i=y*w+x;s+=Math.min(diff3(X,Xp,i,i),diff3(X,Xn,i,i));}col[x]=s/rows;}
  return col;
}
// Separable box blur (radius r px) of an RGBA frame region, alpha kept.
function boxBlur(F,w,rows,r){
  if(!r)return F;
  const tmp=new Float32Array(w*rows*3),out=new Uint8ClampedArray(F.length);
  for(let y=0;y<rows;y++)for(let c=0;c<3;c++){let s=0,n=0;for(let x=-r;x<w;x++){if(x+r<w){s+=F[(y*w+x+r)*4+c];n++;}if(x-r-1>=0){s-=F[(y*w+x-r-1)*4+c];n--;}if(x>=0)tmp[(y*w+x)*3+c]=s/n;}}
  for(let x=0;x<w;x++)for(let c=0;c<3;c++){let s=0,n=0;for(let y=-r;y<rows;y++){if(y+r<rows){s+=tmp[((y+r)*w+x)*3+c];n++;}if(y-r-1>=0){s-=tmp[((y-r-1)*w+x)*3+c];n--;}if(y>=0)out[(y*w+x)*4+c]=s/n;}}
  for(let i=3;i<F.length;i+=4)out[i]=F[i];
  return out;
}
function windowMax(col,x0,x1,win){
  x0=Math.max(0,x0);x1=Math.min(col.length,x1);
  if(x1<=x0)return {value:0,at:-1};
  if(x1-x0<=win){let s=0;for(let x=x0;x<x1;x++)s+=col[x];return {value:s/(x1-x0),at:x0};}
  let s=0;for(let x=x0;x<x0+win;x++)s+=col[x];let best=s,at=x0;
  for(let x=x0+win;x<x1;x++){s+=col[x]-col[x-win];if(s>best){best=s;at=x-win+1;}}
  return {value:best/win,at};
}
// Mean over the given columns of (1/rows)*sum_y mask*|F(x)-F(x+d)|: the frame's
// own texture at d px, counted only where a mid plate is opaque (far-layer
// texture does not ghost when a continuous plate is misregistered).
function selfTexture(F,w,rows,cols,d,mask){
  let s=0,n=0;
  for(const x of cols){if(x+d>=w)continue;let t=0;for(let y=0;y<rows;y++){const i=y*w+x;if(mask&&mask[i]<=0.5)continue;t+=diff3(F,F,i,i+d);}s+=t/rows;n++;}
  return n?s/n:0;
}
// 2-px-averaged horizontal step between columns x-2..x-1 and x..x+1.
function step2(F,w,y,x){const i=y*w+x;let s=0;for(let c=0;c<3;c++)s+=Math.abs((F[(i-2)*4+c]+F[(i-1)*4+c])-(F[i*4+c]+F[(i+1)*4+c]))/2;return s/3;}
// Hard edge of a plate at screen column xc. side=-1: the plate lies left of xc
// (it ends there); side=+1: it starts at xc. Rows where the plate is seen just
// inside the edge are the cut rows. step = (1/rows)*sum over cut rows of the
// 2-px step across xc; ref = the same operator over the plate's interior columns
// on the same rows (its own vertical-edge statistics).
function cutStep(X,Xcut,Xother,aCut,w,rows,xc,side,interior){
  const xi=side<0?xc-1:xc;
  if(xc<3||xc>w-3)return null;
  const rowsSeen=[];
  for(let y=0;y<rows;y++){const i=y*w+xi;if(aCut[i]>0.5&&diff3(X,Xcut,i,i)<diff3(X,Xother,i,i))rowsSeen.push(y);}
  let step=0;for(const y of rowsSeen)step+=step2(X,w,y,xc);
  let ref=0;
  for(const y of rowsSeen){let t=0,n=0;for(const x of interior){if(x<2||x>w-2||aCut[y*w+x]<=0.5||aCut[y*w+x-2]<=0.5||aCut[y*w+x+1]<=0.5)continue;t+=step2(Xcut,w,y,x);n++;}ref+=n?t/n:0;}
  return {xc,side,rows:rowsSeen.length,step:step/rows,ref:ref/rows,stepPerRow:rowsSeen.length?step/rowsSeen.length:0};
}
function judge(m){
  const ghostRatio=m.ghostRef>0?m.ghost/m.ghostRef:(m.ghost>0?Infinity:0);
  const cut=(m.cuts||[]).filter(Boolean).reduce((a,c)=>{const r=c.ref>0?c.step/c.ref:(c.step>0?Infinity:0);return r>a.ratio?{ratio:r,c}:a;},{ratio:0,c:null});
  const reasons=[];
  if(ghostRatio>GHOST_MAX)reasons.push('ghost '+ghostRatio.toFixed(2)+' > '+GHOST_MAX);
  if(cut.ratio>CUT_MAX)reasons.push('cut '+cut.ratio.toFixed(2)+' > '+CUT_MAX);
  return {ghostRatio,cutRatio:cut.ratio,worstCut:cut.c,pass:reasons.length===0,reasons};
}
module.exports={W,ROWS,RS,DELTA_U,WIN_U,GHOST_MAX,CUT_MAX,BLUR_PX,boxBlur,diff3,ghostColumns,windowMax,selfTexture,step2,cutStep,judge};

async function main(){
  const {createCanvas,loadImage}=require('@napi-rs/canvas');
  const {boot}=require('./soak.cjs');
  const argv=process.argv.slice(2);
  const root=path.resolve(argv.find(a=>!a.startsWith('--'))||path.join(__dirname,'..'));
  const outArg=argv.find(a=>a.startsWith('--out='));
  const out=outArg?path.resolve(outArg.slice(6)):path.join(root,'docs/review/v11/seam-continuity');
  const stageArg=argv.find(a=>a.startsWith('--stage=')),stages=stageArg?[Number(stageArg.slice(8))]:[1,2,3,4,5];
  fs.mkdirSync(out,{recursive:true});
  const R=boot(root);await new Promise(r=>setImmediate(r));
  const images=new Map();
  for(const [key,file] of Object.entries(R.ART_FILES)){
    if(!/^(stage\d|floor)/.test(key)||!/\.(png|jpe?g|webp)$/i.test(file))continue;
    const im=await loadImage(fs.readFileSync(path.join(root,file)));if(!im.width)throw new Error('decode '+key);images.set(key,im);
  }
  R.assets.get=k=>images.get(k)||null;R.assets.has=k=>images.has(k);R.display.renderScale=RS;R.perf.allowSync=true;
  const SW=R.StageWorld,d=DELTA_U*RS,win=WIN_U*RS;
  const sceneOf=(n,cam)=>({levelIndex:n-1,camera:{x:cam},time:0,wave:Math.min(4,Math.floor(cam/720)),roofOn:false,level:R.LEVELS[n-1]});
  const travelOf=n=>SW.travelOf(sceneOf(n,0));
  // What the player sees: the real cached-composite game path (draw + near).
  function gameFrame(n,cam){const c=createCanvas(W,720),g=c.getContext('2d');g.scale(RS,RS);const s=sceneOf(n,cam);SW.draw(g,s);SW.near(g,s);for(let i=0;i<12;i++)if(R.Bake)R.Bake.pump(4);return c;}
  // Same draw code, painting mode, with the mid pieces optionally swapped for
  // a decomposition. Like StageWorld.preload, each layer is painted on its own
  // transparent canvas and the layers are then stacked source-over (the mid
  // layer is never painted onto the far layer). Restores the cached layout.
  function paint(n,cam,pieces,only){
    const L=SW.midLayout(n,travelOf(n)),keep=L.pieces;if(pieces)L.pieces=pieces;
    const c=createCanvas(W,720),g=c.getContext('2d');
    const b={p:SW._painting,l:SW._layer,w:SW._paintWidth};
    try{
      for(const id of only?[only]:['base','back','mid','floor','screen']){
        const lc=createCanvas(W,720),lg=lc.getContext('2d');lg.scale(RS,RS);lg.imageSmoothingEnabled=true;lg.imageSmoothingQuality='high';
        SW._painting=true;SW._layer=id;SW._paintWidth=640;SW.draw(lg,sceneOf(n,cam));
        g.drawImage(lc,0,0);lc.width=1;
      }
    }finally{SW._painting=b.p;SW._layer=b.l;SW._paintWidth=b.w;L.pieces=keep;}
    const data=g.getImageData(0,0,W,ROWS).data;c.width=1;return data;
  }
  const alphaOf=data=>{const a=new Float32Array(W*ROWS);for(let i=0;i<a.length;i++)a[i]=data[i*4+3]/255;return a;};
  const raw=p=>Object.assign({},p,{ramp:0,rampOut:0,fade:0,under:null,seam:null,dissolve:false});
  function midX(n,cam){const L=SW.midLayout(n,travelOf(n));return L.clamp?Math.min(cam*L.k,Math.max(0,L.available-640)):cam*L.k;}
  function analyse(n,P,N,cam,opts={}){
    const mx=midX(n,cam),sx=u=>Math.round((u-mx)*RS);
    const X=paint(n,cam),Xp=paint(n,cam,[raw(P)]),Xn=paint(n,cam,[raw(N)]);
    const aP=alphaOf(paint(n,cam,[raw(P)],'mid')),aN=alphaOf(paint(n,cam,[raw(N)],'mid'));
    const pEnd=P.x+P.w,b0=Math.max(0,sx(N.x)),b1=Math.min(W,sx(pEnd));
    const Xb=boxBlur(X,W,ROWS,BLUR_PX),Xpb=boxBlur(Xp,W,ROWS,BLUR_PX),Xnb=boxBlur(Xn,W,ROWS,BLUR_PX);
    const col=ghostColumns(Xb,Xpb,Xnb,W,ROWS,b0,b1),gw=windowMax(col,b0,b1,win);
    const interior=[],interiorP=[],interiorN=[];
    for(let x=8;x<W-8-d;x++){if(x>=b0-16&&x<b1+16)continue;const u=mx+x/RS;const inP=u>=P.x&&u<pEnd,inN=u>=N.x&&u<N.x+N.w;if(inP||inN)interior.push(x);if(inP)interiorP.push(x);if(inN)interiorN.push(x);}
    const mask=new Float32Array(W*ROWS);for(let i=0;i<mask.length;i++)mask[i]=Math.max(aP[i],aN[i]);
    const tex=selfTexture(Xb,W,ROWS,interior,d,mask);
    const cuts=[];
    if(!(P.rampOut>0))cuts.push(cutStep(X,Xp,Xn,aP,W,ROWS,sx(pEnd),-1,interiorP));
    if(!(N.fade>0||N.ramp>0))cuts.push(cutStep(X,Xn,Xp,aN,W,ROWS,sx(N.x),+1,interiorN));
    const m={cam:+cam.toFixed(3),band:[b0,b1],bandUnits:+((b1-b0)/RS).toFixed(2),ghost:gw.value,ghostAt:gw.at,texture:tex,ghostRef:0.5*tex,cuts:cuts.filter(Boolean)};
    Object.assign(m,judge(m));
    if(opts.crop)m.col=col;
    return m;
  }
  function cropSheet(name,n,cam,m,title){
    const F=gameFrame(n,cam),cx=Math.round((m.band[0]+Math.min(m.band[1],m.band[0]+80*RS))/2),x0=Math.max(0,Math.min(W-640,cx-320));
    const c=createCanvas(640,ROWS*2+70),g=c.getContext('2d');g.fillStyle='#0d1017';g.fillRect(0,0,c.width,c.height);
    g.fillStyle='#fff';g.font='14px "DejaVu Sans", sans-serif';g.fillText(title,6,18);
    g.fillText(`ghost ${m.ghost.toFixed(2)} / ref ${m.ghostRef.toFixed(2)} = ${m.ghostRatio.toFixed(2)}x   cut ${m.cutRatio.toFixed(2)}x   ${m.pass?'PASS':'FAIL'}`,6,38);
    g.fillText('top: in-game frame (offline native); bottom: ghost map x4, band in red',6,58);
    g.drawImage(F,x0,0,640,ROWS,0,70,640,ROWS);F.width=1;
    // ghost heat map
    const X=paint(n,cam),L=SW.midLayout(n,travelOf(n)),hm=g.createImageData(640,ROWS);
    const pieces=L.pieces.slice().sort((a,b)=>a.x-b.x),P=pieces[m.join-1],N=pieces[m.join];
    const Xp=paint(n,cam,[raw(P)]),Xn=paint(n,cam,[raw(N)]);
    for(let y=0;y<ROWS;y++)for(let x=0;x<640;x++){const i=y*W+x+x0,v=Math.min(255,4*Math.min(diff3(X,Xp,i,i),diff3(X,Xn,i,i))),o=(y*640+x)*4;hm.data[o]=v;hm.data[o+1]=v;hm.data[o+2]=v;hm.data[o+3]=255;}
    g.putImageData(hm,0,70+ROWS);
    g.strokeStyle='#ff3030';g.lineWidth=1;for(const bx of m.band){const x=bx-x0+0.5;if(x>=0&&x<=640){g.beginPath();g.moveTo(x,70);g.lineTo(x,70+2*ROWS);g.stroke();}}
    for(const cut of m.cuts){const x=cut.xc-x0+0.5;if(x>=0&&x<=640){g.strokeStyle='#ffd030';g.setLineDash([4,4]);g.beginPath();g.moveTo(x,70+ROWS);g.lineTo(x,70+2*ROWS);g.stroke();g.setLineDash([]);}}
    fs.writeFileSync(path.join(out,name),c.toBuffer('image/png'));c.width=1;
  }
  const round=o=>JSON.parse(JSON.stringify(o,(k,v)=>typeof v==='number'?+v.toFixed(3):v));
  const report={method:'Offline @napi-rs/canvas native Skia, real decoded art, RWB.StageWorld draw (game path for crops, painting path for the per-plate decomposition), 1280x720, renderScale 2, rows 0..'+ROWS+' (background above the floor). ghost = worst '+WIN_U+'-unit window of mean min(|shown-P|,|shown-N|) after a '+BLUR_PX+'-px box blur; cut = 2-px-averaged step at an unramped plate edge over the rows where that plate is seen. Both divided by the frame\'s own '+DELTA_U+'-unit self-misregistration texture.',thresholds:{GHOST_MAX,CUT_MAX,DELTA_U,WIN_U,BLUR_PX},stages:[],controls:[],failures:[]};
  for(const n of stages){
    const L=SW.midLayout(n,travelOf(n)),pieces=L.pieces.slice().sort((a,b)=>a.x-b.x),k=L.k;
    const st={stage:n,mode:L.mode,pieces:pieces.map(p=>({key:p.key,x:p.x,w:p.w,ramp:p.ramp||0,rampOut:p.rampOut||0,fade:p.fade||0,sx0:p.sx0||0,sx1:p.sx1||null})),joins:[]};
    for(let j=1;j<pieces.length;j++){
      const P=pieces[j-1],N=pieces[j],pEnd=P.x+P.w,centre=N.x+Math.max(N.fade||0,8)/2;
      const cams=[(centre-320)/k];if(pEnd-centre>160)cams.push((pEnd-320)/k);
      const events=[];for(const cam of cams){const m=analyse(n,P,N,cam);m.join=j;events.push(m);}
      const worst=events.reduce((a,b)=>(b.pass?0:1)*10+b.ghostRatio+b.cutRatio>(a.pass?0:1)*10+a.ghostRatio+a.cutRatio?b:a);
      const join={join:j,from:P.key,to:N.key,zone:[N.x,pEnd],fadeIn:N.fade||0,fadeOut:P.rampOut||0,pass:events.every(e=>e.pass),events};
      for(let e=0;e<events.length;e++)cropSheet(`stage${n}-join${j}${e?'-end':''}.png`,n,events[e].cam,events[e],`S${n} join ${j}: ${P.key} -> ${N.key}; camera ${events[e].cam.toFixed(1)}${e?' (plate end)':''}`);
      st.joins.push(join);
      console.log(`${join.pass?'PASS':'FAIL'} S${n} join ${j} ${P.key}->${N.key} zone ${N.x.toFixed(1)}..${pEnd.toFixed(1)} `+events.map(e=>`[cam ${e.cam.toFixed(1)} ghost ${e.ghost.toFixed(2)}/${e.ghostRef.toFixed(2)}=${e.ghostRatio.toFixed(2)}x cut ${e.cutRatio.toFixed(2)}x${e.worstCut?' ('+e.worstCut.rows+' rows, '+e.worstCut.step.toFixed(2)+'/'+e.worstCut.ref.toFixed(2)+')':''}]`).join(' '));
      if(!join.pass)report.failures.push(`S${n} join ${j}: `+events.filter(e=>!e.pass).map(e=>e.reasons.join(', ')).join('; '));
      void worst;
    }
    if(!st.joins.length)console.log(`PASS S${n} continuous mid layer (${pieces.length} piece, 0 joins)`);
    report.stages.push(st);
    // Controls: one real plate split into two overlapping pieces, drawn by the
    // same bake/draw path. 'opaque-bottom' (bottom plate unramped, top ramps in)
    // must pass; 'dual-ramp' is the coincident fade-out/fade-in that S2/S3 join 1
    // ship; 'dual-ramp-dissolve' marks both pieces piece.dissolve (only honoured
    // by a draw loop that composites the incoming plate 'lighter'); 'shift'
    // misregisters the top half by N units.
    // The draw loop sizes a piece from its whole image, so each half is a
    // cropped copy of the source plate registered as its own asset key.
    const base=pieces.find(p=>/-mid-b$|-mid-cont$/.test(p.key))||pieces[0],img=images.get(base.key),ppu=((base.sx1||img.width)-(base.sx0||0))/base.w;
    const crop=(key,sx0,sx1)=>{const c=createCanvas(sx1-sx0,img.height);c.getContext('2d').drawImage(img,sx0,0,sx1-sx0,img.height,0,0,sx1-sx0,img.height);images.set(key,c);return c;};
    for(const [style,shift] of [['opaque-bottom',0],['opaque-bottom',1],['opaque-bottom',2],['opaque-bottom',4],['dual-ramp',0],['dual-ramp-dissolve',0]]){
      const fade=40,cutPx=Math.round(img.width*0.5),fadePx=Math.round(fade*ppu),kP='ctl'+n+'-P',kN='ctl'+n+'-N';
      const cP=crop(kP,0,cutPx),cN=crop(kN,cutPx-fadePx,img.width);
      const P={id:kP,key:kP,x:0,w:cP.width/ppu,ramp:0,rampOut:style.startsWith('dual-ramp')?fade:0,fade:0,pool:0,dissolve:style==='dual-ramp-dissolve'};
      const N={id:kN,key:kN,x:(cutPx-fadePx)/ppu+shift,w:cN.width/ppu,ramp:fade,fade,rampOut:0,pool:1,dissolve:style==='dual-ramp-dissolve'};
      const keep=L.pieces,clamp=L.clamp;L.pieces=[P,N];L.clamp=false;let m;
      try{m=analyse(n,P,N,(N.x+fade/2-320)/k);}finally{L.pieces=keep;L.clamp=clamp;}
      const ctl={stage:n,plate:base.key,style,shiftUnits:shift,ghost:m.ghost,ghostRef:m.ghostRef,ghostRatio:m.ghostRatio,cutRatio:m.cutRatio,pass:m.pass};
      report.controls.push(ctl);
      console.log(`  control S${n} ${base.key} ${style} shift ${shift}u: ghost ${m.ghostRatio.toFixed(2)}x cut ${m.cutRatio.toFixed(2)}x ${m.pass?'pass':'fail'}`);
    }
  }
  // Metric self-test: one continuous painting, misregistered by at most 2 units,
  // must pass. Dual-ramp controls are reported, not asserted (they expose the
  // coincident fade-out/fade-in compositing dip on continuous art).
  const sanity=report.controls.filter(c=>c.style==='opaque-bottom'&&c.shiftUnits<=2&&!c.pass);
  fs.writeFileSync(path.join(out,stageArg?`seam-continuity-stage${stages[0]}.json`:'seam-continuity.json'),JSON.stringify(round(report),null,1)+'\n');
  if(sanity.length){console.error('METRIC BROKEN: continuous controls failed',JSON.stringify(sanity));process.exitCode=2;return;}
  const joins=report.stages.flatMap(s=>s.joins),bad=joins.filter(j=>!j.pass);
  console.log(`${joins.length-bad.length}/${joins.length} mid-layer joins continuous. `+(bad.length?'FAIL: '+report.failures.join(' | '):'PASS'));
  if(bad.length)process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=2;});
