'use strict';
// Native decoded Canvas2D evidence, independently labeled from stub lifecycle checks.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('crypto');
const {root,runtime}=require('../runtime.cjs');
const {boot}=require(root+'/tools/soak.cjs'),{createCanvas,Image}=require('@napi-rs/canvas');
const tick=()=>new Promise(r=>setImmediate(r)),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),rows=[],lifecycle=[],assetHashes={};
async function engine(variant,images,scale){
 const R=boot(root);await tick();let time=0;const canvases=[];
 R.assets.get=k=>images.get(k)||null;R.assets.has=k=>images.has(k);R.display.renderScale=scale;R.perf.allowSync=true;R.Puppet.prepareScene=()=>{};
 const box={window:{RWB:R},document:{createElement:()=>{const c=createCanvas(1,1);canvases.push(c);return c;},getElementById:()=>null},performance:{now:()=>time+=.000001},console,setTimeout:()=>0};vm.createContext(box);
 for(const name of ['performance','stages','scenes']){let source=runtime(variant==='before'?'control':'candidate',name+'.js');if(name==='stages')source=source.replace('R.StageWorld = {','R.StageWorld = {test:{backgrounds,sliceCache},').replace('}catch(error){','}catch(error){throw error;');if(name==='performance')source=source.replace('catch(e){done=true;}','catch(e){throw e;}');vm.runInContext(source,box,{filename:name+'.js'});}
 const W=R.StageWorld;
 function scene(n,cam=0,roof=false){return {levelIndex:n-1,camera:{x:cam},time:0,wave:roof?5:3,roofOn:roof,level:R.LEVELS[n-1],music:'stage'+n,saveCheckpoint(){},isGameplay:true};}
 function enter(s){R.scenes.Play.prototype.enter.call(s);}
 function render(s){const c=createCanvas(640*scale,360*scale),g=c.getContext('2d');g.scale(scale,scale);W.draw(g,s);W.near(g,s);return c;}
 function pump(){let steps=0;while(R.Bake.q.length&&steps++<3000)R.Bake.pump(4);assert.equal(R.Bake.q.length,0,'all native background work finishes');return steps;}
 return {R,W,scene,enter,render,pump,now:()=>time,dispose(){for(const c of canvases){c.width=1;c.height=1;}},variant,scale};
}
function compare(a,b,s,kind,extra={}){
 const A=a.render(s),B=b.render(s),dataA=Buffer.from(A.getContext('2d').getImageData(0,0,A.width,A.height).data),dataB=Buffer.from(B.getContext('2d').getImageData(0,0,B.width,B.height).data);
 const row={kind,stage:s.levelIndex+1,roof:!!s.roofOn,camera:s.camera.x,scale:a.scale,beforeHash:hash(dataA),afterHash:hash(dataB),exact:dataA.equals(dataB),...extra};rows.push(row);assert.ok(row.exact,JSON.stringify(row));
 const ea=a.W.preload(s),eb=b.W.preload(s);assert.deepEqual(JSON.parse(JSON.stringify(ea.layers.map(l=>[l.id,l.k,l.w,l.y,l.h]))),JSON.parse(JSON.stringify(eb.layers.map(l=>[l.id,l.k,l.w,l.y,l.h]))));
 if(a.scale===2&&((kind==='return-same-camera'&&extra.phase==='window'&&extra.destination===3)||(s.roofOn&&s.camera.x===3600))){const stem=kind==='return-same-camera'?'retained-stage1-same-camera':'stage5-roof';fs.writeFileSync(path.join(__dirname,'reports',stem+'-before.png'),A.toBuffer('image/png'));fs.writeFileSync(path.join(__dirname,'reports',stem+'-after.png'),B.toBuffer('image/png'));}
 A.width=B.width=1;A.height=B.height=1;return row;
}
(async()=>{
 const seed=boot(root);await tick();const images=new Map();for(const [key,file]of Object.entries(seed.ART_FILES)){if(!/^(stage|floor)/.test(key)||!/\.(png|jpe?g|webp)$/i.test(file))continue;const data=fs.readFileSync(path.join(root,file)),im=new Image();im.src=data;await im.decode();images.set(key,im);assetHashes[file]=hash(data);}
 for(const scale of [1,2,3]){
  const a=await engine('before',images,scale),b=await engine('after',images,scale);
  for(const stage of [1,2,3,4,5])for(const roof of(stage===5?[false,true]:[false]))for(const cam of [0,.125,79.875,80,319.875,1000,1524.125,2800,3600]){const s=a.scene(stage,cam,roof);a.enter(s);b.enter(s);compare(a,b,s,'parallax-sweep');a.pump();b.pump();}
  a.dispose();b.dispose();console.log('PASS exact decoded five-stage/roof parallax sweep at '+scale+'x');
 }
 for(const scale of [1,2,3])for(const destination of [3,5])for(const phase of ['copy','ramp','window']){
  const a=await engine('before',images,scale),b=await engine('after',images,scale),s=a.scene(1);compare(a,b,s,'before-cancellation',{phase,destination});
  const state=E=>{const e=E.W.preload(s),layer=e.layers.find(l=>l.id==='mid'),job=E.R.Bake.q.find(j=>j.background===e.key);assert.ok(job);let steps=0;while(steps++<2000){job.run(job,E.now()+.000014);if(phase==='window'?!!job.window:job.plate?.phase===phase)break;}assert.ok(steps<2000,phase+' reached');if(phase==='window')assert.equal(job.plate,null,'published source is detached');return {e,layer,job,partial:phase==='window'?job.window.canvas:job.plate.c,steps};};
  const oldA=state(a),oldB=state(b),published=[...b.W.test.sliceCache.values()],surfaces=[oldB.e.composite,...oldB.e.layers.map(l=>l.canvas)].map(c=>[c,c.width,c.height]),dest=a.scene(destination);
  b.W.activateStage(dest);assert.equal(oldB.partial.width,1);assert.equal(oldB.partial.height,1);assert.equal(oldB.job.plate,null);assert.equal(oldB.job.window,null);assert.equal(oldB.layer.pending,false);assert.ok(!oldB.layer.next);for(const c of published)assert.ok(c.width>1,'published source survives cancellation');for(const[c,w,h]of surfaces){assert.equal(c.width,w);assert.equal(c.height,h);}
  a.enter(dest);b.enter(dest);assert.equal(a.W.test.backgrounds.size,2);assert.equal(b.W.test.backgrounds.size,2);assert.ok(a.R.Bake.q.includes(oldA.job));assert.ok(!b.R.Bake.q.includes(oldB.job));compare(a,b,dest,'destination-view',{phase,destination});a.pump();b.pump();
  a.enter(s);b.enter(s);const composites=b.W.backgroundStats.composites;compare(a,b,s,'return-same-camera',{phase,destination});assert.equal(b.W.backgroundStats.composites,composites,'same-camera visible composite is reused');const retry=b.R.Bake.q.find(j=>j.background===oldB.e.key);assert.ok(retry);assert.notEqual(retry,oldB.job);a.pump();b.pump();assert.ok(oldB.layer.next);assert.equal(retry.window,null);assert.ok(oldB.layer.next.canvas.width>1);
  for(const cam of [80,1524.125]){const moved=a.scene(1,cam);compare(a,b,moved,'return-moving',{phase,destination});a.pump();b.pump();}
  lifecycle.push({scale,destination,phase,sourcePlateDetached:phase==='window'?oldB.job.plate===null:null,publishedSourcesPreserved:published.length,partialReleased:true,completedCacheRetained:true,sameCameraCompositeReused:true,neighborRequeuedAndCompleted:true});a.dispose();b.dispose();console.log('PASS exact decoded cancellation/return '+scale+'x Stage '+destination+' '+phase);
 }
 const report={method:'Offline real decoded @napi-rs/canvas native Skia. Actual combined candidate background painting, slicing, cache, queue, cancellation and Play.enter code; Puppet preparation and checkpoint/audio side effects are out of scope. Synthetic yield clock is used only to reach slice phases, not to measure performance. All RGBA hashes and layer geometry match the unpatched before copy. No browser, sockets, Chromium, remote actions, art edits, or timing claims.',comparisons:rows.length,allExact:rows.every(r=>r.exact),lifecycleCases:lifecycle.length,lifecycle,assetHashes,rows};fs.writeFileSync(path.join(__dirname,'reports/decoded-pixels.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({comparisons:rows.length,allExact:report.allExact,lifecycleCases:lifecycle.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
