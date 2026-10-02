'use strict';
// Read-only diagnostic for the Stage 1-3 mid-layer joins (1.2): can ANY placement
// of the existing plates make plate P's right part and plate N's left part show
// the same painting? Searches N's horizontal position over the whole right 60% of
// P, a vertical offset of +-64 source px and a scale of 0.8-1.2 (coarse at 1/8,
// refined at 1/4 source resolution). Error per placement = mean over the overlap
// of |dRGB| where both plates are opaque plus 128 where only one is (skyline /
// silhouette mismatch). It is reported against two baselines from the same
// plate P: 'self2u' = P against itself misregistered by 2 world units (what a
// continuous painting scores), and 'random' = median over all placements tried.
// A synthetic split of one real plate is searched as a control and must recover
// its true offset. Writes docs/review/v11/seam-continuity/placement-search.json.
const fs=require('fs'),path=require('path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||path.join(__dirname,'..'));
const out=path.join(root,'docs/review/v11/seam-continuity');fs.mkdirSync(out,{recursive:true});
function grab(img,f,scale=1,sx0=0,sx1=img.width){const w=Math.max(1,Math.round((sx1-sx0)*scale/f)),h=Math.max(1,Math.round(img.height*scale/f));const c=createCanvas(w,h),g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(img,sx0,0,sx1-sx0,img.height,0,0,w,h);const d=g.getImageData(0,0,w,h).data;c.width=1;return {w,h,d};}
// error of N placed with its left edge at P column ox and top at row dy (both in this resolution)
function err(P,N,ox,dy,minCover){
  const x0=Math.max(0,ox),x1=Math.min(P.w,ox+N.w);if(x1-x0<4)return null;
  let s=0,n=0,both=0;
  for(let y=0;y<P.h;y++){const ny=y-dy;if(ny<0||ny>=N.h){continue;}
    for(let x=x0;x<x1;x++){const i=(y*P.w+x)*4,j=(ny*N.w+(x-ox))*4,ap=P.d[i+3]>230,an=N.d[j+3]>230;
      if(ap&&an){s+=(Math.abs(P.d[i]-N.d[j])+Math.abs(P.d[i+1]-N.d[j+1])+Math.abs(P.d[i+2]-N.d[j+2]))/3;n++;both++;}
      else if(ap||an){s+=128;n++;}}}
  if(!n||both<minCover*(x1-x0)*P.h)return null;return s/n;
}
function search(Pimg,Nimg,ppu,label,{nSx0=0,nSx1=Nimg.width,shippedOverlapU=null}={}){
  const scales=[0.8,0.85,0.9,0.95,1,1.05,1.1,1.15,1.2],minOvU=40;
  const coarse=[];const f=8;const P=grab(Pimg,f);
  for(const sc of scales){const N=grab(Nimg,f,sc,nSx0,nSx1);
    for(let ox=Math.round(P.w*0.4);ox<=P.w-Math.round(minOvU*ppu/f);ox++)for(let dy=-8;dy<=8;dy++){const e=err(P,N,ox,dy,0.25);if(e!=null)coarse.push({sc,ox,dy,e});}}
  coarse.sort((a,b)=>a.e-b.e);const random=coarse[Math.floor(coarse.length/2)].e;
  // refine the 12 best coarse candidates at 1/4
  const g=4,P4=grab(Pimg,g);let best=null;
  for(const c of coarse.slice(0,12)){for(const sc of [c.sc-0.025,c.sc,c.sc+0.025]){const N4=grab(Nimg,g,sc,nSx0,nSx1);
    for(let ox=c.ox*2-3;ox<=c.ox*2+3;ox++)for(let dy=c.dy*2-3;dy<=c.dy*2+3;dy++){const e=err(P4,N4,ox,dy,0.25);if(e!=null&&(!best||e<best.e))best={sc,ox,dy,e};}}}
  // baselines from P itself at 1/4: P's right 50% against P shifted 2 units
  const half=Math.round(P4.w*0.5),Pr={w:P4.w-half,h:P4.h,d:null};
  const c=createCanvas(Pr.w,P4.h);const gg=c.getContext('2d');gg.imageSmoothingQuality='high';gg.drawImage(Pimg,half*g,0,Pimg.width-half*g,Pimg.height,0,0,Pr.w,P4.h);Pr.d=gg.getImageData(0,0,Pr.w,P4.h).data;
  const self2u=err(P4,Pr,half+Math.round(2*ppu/g),0,0.05);
  let shipped=null;if(shippedOverlapU!=null){const N4=grab(Nimg,g,1,nSx0,nSx1);const e=err(P4,N4,Math.round(P4.w-shippedOverlapU*ppu/g),0,0);shipped={overlapUnits:+shippedOverlapU.toFixed(2),error:e==null?null:+e.toFixed(2),overSelf:e==null?null:+(e/self2u).toFixed(2)};}
  const r={label,shipped,best:{scale:+best.sc.toFixed(3),overlapUnits:+((P4.w-best.ox)*g/ppu).toFixed(1),nLeftAtPsrcPx:best.ox*g,dySrcPx:best.dy*g,error:+best.e.toFixed(2)},self2u:+self2u.toFixed(2),random:+random.toFixed(2),bestOverSelf:+(best.e/self2u).toFixed(2),bestOverRandom:+(best.e/random).toFixed(2),candidates:coarse.length};
  console.log(`${label}: shipped ${shipped?shipped.error+' ('+shipped.overSelf+'x self)':'-'} | best err ${r.best.error} (scale ${r.best.scale}, overlap ${r.best.overlapUnits}u, dy ${r.best.dySrcPx}px) | self-2u ${r.self2u} | random ${r.random} | best/self ${r.bestOverSelf} best/random ${r.bestOverRandom}`);
  return r;
}
(async()=>{
  const load=async k=>loadImage(fs.readFileSync(path.join(root,'assets/art',k)));
  const ppu={1:1672/720,2:1774/700,3:1774/700};
  // Overlaps the shipped midLayout(n,3600) uses: [a->b, b->c] in world units.
  const shipped={1:[40,265.646],2:[40,96.798],3:[40,96.798]};
  const report={method:'see header of tools/seam-placement-search-v11.cjs',joins:[],controls:[]};
  for(const n of [1,2,3]){
    const a=await load(`stage${n}-mid.png`),b=await load(`stage${n}-mid-b.webp`),c=await load(`stage${n}-mid-c.webp`);
    report.joins.push(search(a,b,ppu[n],`S${n} join 1 stage${n}-mid -> stage${n}-mid-b`,{shippedOverlapU:shipped[n][0]}));
    report.joins.push(search(b,c,ppu[n],`S${n} join 2 stage${n}-mid-b -> stage${n}-mid-c`,{shippedOverlapU:shipped[n][1]}));
    // control: plate b split at 55%, N = b from 40% (true overlap 15% of b)
    const cutA=Math.round(b.width*0.55),startN=Math.round(b.width*0.40);
    const Pc=createCanvas(cutA,b.height);Pc.getContext('2d').drawImage(b,0,0,cutA,b.height,0,0,cutA,b.height);
    const r=search(Pc,b,ppu[n],`CONTROL S${n} stage${n}-mid-b split (true N left at P px ${startN}, overlap ${((cutA-startN)/ppu[n]).toFixed(1)}u)`,{nSx0:startN});
    r.truth={nLeftAtPsrcPx:startN,dySrcPx:0,scale:1};r.recovered=Math.abs(r.best.nLeftAtPsrcPx-startN)<=8&&Math.abs(r.best.dySrcPx)<=8&&Math.abs(r.best.scale-1)<0.03;
    report.controls.push(r);console.log('  control recovered true placement:',r.recovered);
  }
  fs.writeFileSync(path.join(out,'placement-search.json'),JSON.stringify(report,null,1)+'\n');
  if(report.controls.some(c=>!c.recovered)){console.error('search failed to recover a known split');process.exitCode=2;}
})().catch(e=>{console.error(e);process.exitCode=2;});
