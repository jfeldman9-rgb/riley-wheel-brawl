'use strict';
// Synthetic, browser-free tests of the seam-continuity-v11 metric functions.
const assert=require('node:assert/strict');
const M=require('./seam-continuity-v11.cjs');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
const w=200,rows=60;
function frame(fn){const F=new Uint8ClampedArray(w*rows*4);for(let y=0;y<rows;y++)for(let x=0;x<w;x++){const [r,g,b,a=255]=fn(x,y),i=(y*w+x)*4;F[i]=r;F[i+1]=g;F[i+2]=b;F[i+3]=a;}return F;}
// A painting: smooth large structure plus mild texture. 'other' is a different painting.
const paint=(x,y)=>{const v=120+50*Math.sin(x/30)+40*Math.cos(y/7)+6*((x*7+y*13)%5);return [v,v*0.8,v*0.6];};
const other=(x,y)=>{const v=120+50*Math.cos(x/25+2)+50*Math.sin(y/11+1);return [v*0.5,v,v*0.9];};
const far=()=>[230,230,240];
const sstep=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
const b0=80,b1=120,s=x=>sstep((x-b0)/(b1-b0));           // top plate's ramp across the band
const mix=(A,B,t)=>A.map((v,c)=>v*(1-t)+B[c]*t);
function ratio(X,Xp,Xn){
  const blur=F=>M.boxBlur(F,w,rows,M.BLUR_PX);
  const col=M.ghostColumns(blur(X),blur(Xp),blur(Xn),w,rows,b0,b1),g=M.windowMax(col,b0,b1,M.WIN_U*M.RS);
  const interior=[];for(let x=8;x<w-8-M.DELTA_U*M.RS;x++)if(x<b0-16||x>=b1+16)interior.push(x);
  const tex=M.selfTexture(blur(Xp),w,rows,interior,M.DELTA_U*M.RS,null);
  return M.judge({ghost:g.value,ghostRef:0.5*tex,cuts:[]});
}
test('windowMax finds the worst window and its start',()=>{const c=new Float64Array(20);c[10]=4;c[11]=4;const r=M.windowMax(c,0,20,2);assert.equal(r.value,4);assert.equal(r.at,10);});
test('boxBlur keeps a flat frame flat and keeps alpha',()=>{const F=frame(()=>[50,60,70,128]),B=M.boxBlur(F,w,rows,4);assert.equal(B[(30*w+100)*4],50);assert.equal(B[(30*w+100)*4+3],128);});
test('continuous painting dissolved into itself has no ghost',()=>{const A=frame(paint);const r=ratio(A,A,A);assert.ok(r.ghostRatio<0.05,String(r.ghostRatio));assert.ok(r.pass);});
test('continuous painting misregistered by 1 unit stays under the limit',()=>{const A=frame(paint),B=frame((x,y)=>paint(x+M.RS,y)),X=frame((x,y)=>mix(paint(x,y),paint(x+M.RS,y),s(x)));const r=ratio(X,A,B);assert.ok(r.pass,String(r.ghostRatio));});
test('two different paintings dissolved are a ghost (fail)',()=>{const A=frame(paint),B=frame(other),X=frame((x,y)=>mix(paint(x,y),other(x,y),s(x)));const r=ratio(X,A,B);assert.ok(r.ghostRatio>M.GHOST_MAX,String(r.ghostRatio));assert.equal(r.pass,false);});
test('coincident source-over fade-out/fade-in lets the far layer through (fail)',()=>{
  // shown = s*A + (1-s)*[(1-s)*A + s*far]: alpha sums to 1-s+s^2 (0.75 mid-band)
  const A=frame(paint),X=frame((x,y)=>{const t=s(x),a=paint(x,y);return a.map((v,c)=>t*v+(1-t)*((1-t)*v+t*far()[c]));});
  const r=ratio(X,A,A);assert.ok(r.ghostRatio>M.GHOST_MAX,String(r.ghostRatio));
});
test('a plate cut through different content is a hard cut (fail); same content is not',()=>{
  const xc=100,A=frame(paint),B=frame(other),alpha=new Float32Array(w*rows).fill(1);
  const interior=[];for(let x=10;x<xc-10;x++)interior.push(x);
  const X=frame((x,y)=>x<xc?paint(x,y):other(x,y));
  const bad=M.cutStep(X,A,B,alpha,w,rows,xc,-1,interior);
  assert.equal(bad.rows,rows);assert.ok(bad.step/bad.ref>M.CUT_MAX,JSON.stringify(bad));
  const good=M.cutStep(A,A,B,alpha,w,rows,xc,-1,interior);
  assert.ok(good.step/good.ref<M.CUT_MAX,JSON.stringify(good));
  assert.equal(M.judge({ghost:0,ghostRef:1,cuts:[bad]}).pass,false);
  assert.equal(M.judge({ghost:0,ghostRef:1,cuts:[good]}).pass,true);
});
test('cut rows only count where the ending plate is actually seen',()=>{
  const xc=100,A=frame(paint),B=frame(other),alpha=new Float32Array(w*rows);for(let y=0;y<10;y++)for(let x=0;x<w;x++)alpha[y*w+x]=1;
  const X=frame((x,y)=>x<xc&&y<10?paint(x,y):other(x,y)),interior=[];for(let x=10;x<xc-10;x++)interior.push(x);
  const r=M.cutStep(X,A,B,alpha,w,rows,xc,-1,interior);assert.equal(r.rows,10);
});
console.log(count+' seam-continuity metric tests passed');
