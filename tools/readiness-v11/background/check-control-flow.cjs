'use strict';
// Deterministic lifecycle coverage. Raster calls are NO-OP stubs, not pixel evidence.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const {root,runtime}=require('../runtime.cjs');
const rows=[];
function engine(variant='after'){
 let time=0,sequence=0;const canvases=[],gradient={addColorStop(){}};
 const context=()=>new Proxy({globalAlpha:1,createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,getImageData:()=>({data:new Uint8ClampedArray(4)})},{get:(t,k)=>k in t?t[k]:(()=>{})});
 function canvas(w=1,h=1){let width=w,height=h;const c={id:++sequence,releases:0,heightReleases:0,getContext:()=>g};const g=context();Object.defineProperties(c,{width:{get:()=>width,set:v=>{if(v===1&&width>1)c.releases++;width=v;}},height:{get:()=>height,set:v=>{if(v===1&&height>1)c.heightReleases++;height=v;}}});canvases.push(c);return c;}
 const images=new Map([['stage1-mid',{width:1672,height:600}],['stage1-mid-b',{width:2196,height:600}],['stage1-mid-c',{width:1672,height:600}]]);
 const R={perf:{},display:{renderScale:2},SCROLL:{length:4240},assets:{get:k=>images.get(k)||null,has:()=>true},settings:{},audio:{playMusic(){}},Puppet:{prepareScene(){}}};
 const box={window:{RWB:R},document:{createElement:()=>canvas(),getElementById:()=>canvas(1280,720)},performance:{now:()=>time+=.000001},console,setTimeout:()=>0};vm.createContext(box);
 for(const name of ['performance','stages','scenes']){let source=runtime(variant==='before'?'control':'candidate',name+'.js');if(name==='stages')source=source.replace('R.StageWorld = {','R.StageWorld = {test:{backgrounds,sliceCache,plateId,pieceDrawH},').replace('}catch(error){','}catch(error){throw error;');vm.runInContext(source,box,{filename:name+'.js'});}
 const W=R.StageWorld,draw=W.draw;W.draw=function(...args){if(this._painting)return;return draw.apply(this,args);};
 W.paintMidWindow=(entry,layer,origin,width)=>({canvas:canvas(Math.ceil(width*entry.rs),Math.ceil(layer.h*entry.rs)),origin,viewW:width});
 function scene(n,cam=0,roof=false){return {levelIndex:n-1,camera:{x:cam},time:0,wave:roof?5:3,roofOn:roof,level:{length:4240},music:'stage'+n,saveCheckpoint(){},isGameplay:true};}
 function drawScene(s){W.draw(context(),s);return W.preload(s);}
 function enter(s){R.scenes.Play.prototype.enter.call(s);}
 function queue(s){const e=drawScene(s);return {e,layer:e.layers.find(l=>l.id==='mid'),job:R.Bake.q.find(j=>j.background===e.key)};}
 return {R,W,scene,drawScene,enter,queue,canvas,canvases,images,now:()=>time,context};
}
function test(name,fn){const details=fn()||{};rows.push({name,pass:true,...details});console.log('PASS '+name);}
const sizes=e=>[e.composite,...e.layers.map(l=>l.canvas),...e.layers.filter(l=>l.next).map(l=>l.next.canvas)].filter(Boolean).map(c=>[c,c.width,c.height]);
function unchanged(s){for(const [c,w,h]of s){assert.equal(c.width,w);assert.equal(c.height,h);}}
function heldJob(E,s){E.W.stepMidPrime=()=>false;return E.queue(s);}
for(const stage of [3,5])for(const variant of ['before','after'])test(variant+' warmed Stage 1 to direct Stage '+stage,()=>{
 const E=engine(variant),{R,W}=E,s1=E.scene(1),old=heldJob(E,s1),saved=sizes(old.e),name=old.job.name;
 assert.equal(name,'background-mid:1:2:3600:0:0');assert.equal(old.job.pri,1.5);
 const pose=R.Bake.enqueue(2,'active-pose',()=>false,{pose:true});E.enter(E.scene(stage));
 assert.equal(W.test.backgrounds.size,2);assert.equal(W.test.backgrounds.get(old.e.key),old.e);unchanged(saved);
 assert.equal(R.Bake.q.includes(old.job),variant==='before');assert.equal(R.Bake.names.has(name),variant==='before');assert.equal(old.layer.pending,variant==='before');assert.ok(R.Bake.q.includes(pose));assert.equal(pose.pri,2);
 const active=E.queue(E.scene(stage));assert.equal(active.job.pri,1.5);assert.ok(R.Bake.q.includes(active.job));
 return {expectedStaleRemains:variant==='before',cacheEntries:2};
});
for(const variant of ['before','after'])test(variant+' cancellation/requeue invariant at same camera',()=>{
 const E=engine(variant),{R,W}=E,s=E.scene(1),{e,layer,job}=heldJob(E,s),saved=sizes(e),composites=W.backgroundStats.composites;
 if(variant==='before'){R.Bake.drop(j=>j===job);layer.pending=false;}else{E.enter(E.scene(3));E.enter(s);}
 E.drawScene(s);assert.equal(e.camera,0);assert.equal(W.backgroundStats.composites,composites);unchanged(saved);
 const retry=R.Bake.q.find(j=>j.background===e.key);assert.equal(!!retry,variant==='after');
 if(retry){W.stepMidPrime=()=>true;for(let i=0;i<1000&&layer.pending;i++)R.Bake.pump(4);assert.equal(layer.pending,false);assert.ok(layer.next);assert.equal(R.Bake.names.has(retry.name),false);assert.equal(retry.window,null);const published=layer.next.canvas;W.activateStage(E.scene(3));assert.ok(published.width>1);}
 return {beforeRequiresManualEquivalentCancellation:variant==='before',repainted:false,neighborRequeued:!!retry};
});
for(const phase of ['copy','ramp','window'])test('cancel real sliced state during '+phase,()=>{
 const E=engine(),{W,R}=E,s=E.scene(1),{e,layer,job}=E.queue(s),saved=sizes(e),layout=W.midLayout(1,3600),shared=E.canvas(1440,518);
 W.test.sliceCache.set(W.test.plateId(layout.pieces[0],W.test.pieceDrawH(layout.pieces[0])),shared);
 let steps=0;while(steps++<1000){job.run(job,E.now()+.000014);if(phase==='window'?!!job.window:job.plate?.phase===phase)break;}
 assert.ok(steps<1000,'reachable phase '+phase);if(phase==='window')assert.equal(job.plate,null,'completed source ownership was published');const partial=phase==='window'?job.window.canvas:job.plate.c;assert.ok(partial.width>1);assert.equal(layer.next,undefined);
 const publishedSources=[...W.test.sliceCache.values()];W.activateStage(E.scene(3));W.activateStage(E.scene(3));
 assert.equal(partial.width,1);assert.equal(partial.height,1);assert.equal(partial.releases,1);assert.equal(partial.heightReleases,1);assert.equal(job.plate,null);assert.equal(job.window,null);assert.equal(job.backgroundLayer,null);assert.equal(layer.pending,false);assert.ok(!layer.next);assert.ok(!R.Bake.q.includes(job));assert.ok(!R.Bake.names.has(job.name));unchanged(saved);for(const c of publishedSources)assert.ok(c.width>1);
 return {phase,steps,partialReleasedExactlyOnce:true,publishedSourcesPreserved:publishedSources.length};
});
test('ordinary preload-before-fade and prepare do not activate or cancel visible stage',()=>{
 const E=engine(),{W,R}=E,s=E.scene(1),{e,job,layer}=heldJob(E,s),saved=sizes(e);let calls=0;const activate=W.activateStage;W.activateStage=function(...a){calls++;return activate.apply(this,a);};
 W.preload(E.scene(3));assert.ok(R.Bake.q.includes(job));assert.equal(layer.pending,true);assert.equal(calls,0);unchanged(saved);
 W.prepare(2);assert.ok(R.Bake.q.includes(job));assert.equal(calls,0);E.enter(E.scene(3));assert.equal(calls,1);assert.ok(!R.Bake.q.includes(job));
});
test('same-stage street/roof preparation and separate roof jobs survive activation',()=>{
 const E=engine(),{R,W}=E,s=E.scene(5),{job,layer}=heldJob(E,s);W.queueRoof();const roof=R.Bake.q.filter(j=>/^roof-/.test(j.name));assert.equal(roof.length,3);W.prepare(4);W.activateStage(E.scene(5,0,true));assert.ok(R.Bake.q.includes(job));assert.equal(layer.pending,true);for(const j of roof)assert.ok(R.Bake.q.includes(j));assert.equal(W.test.backgrounds.size,2);
 W.activateStage(E.scene(3));assert.ok(!R.Bake.q.includes(job));for(const j of roof)assert.ok(R.Bake.q.includes(j));return {separateRoofJobs:roof.map(j=>j.name)};
});
for(const reason of ['resize','third-cache eviction','synchronous window fallback','callback entry mismatch'])test(reason+' cleans only job-owned partials',()=>{
 const E=engine(),{R,W}=E,s=E.scene(1),{e,job,layer}=heldJob(E,s),plate=E.canvas(80,80),window=E.canvas(90,90);job.plate={c:plate};job.window={canvas:window};
 if(reason==='resize'){R.display.renderScale=1;W.preload(s);assert.ok(!W.test.backgrounds.has(e.key));}
 else if(reason==='third-cache eviction'){W.preload(E.scene(3));W.preload(E.scene(5));assert.equal(W.test.backgrounds.size,2);assert.ok(!W.test.backgrounds.has(e.key));}
 else if(reason==='synchronous window fallback'){s.camera.x=1200;E.drawScene(s);}
 else{W.test.backgrounds.delete(e.key);R.Bake.pump(4);}
 assert.equal(plate.releases,1);assert.equal(window.releases,1);assert.equal(job.plate,null);assert.equal(job.window,null);assert.ok(!R.Bake.q.includes(job));
 if(reason!=='synchronous window fallback'){assert.equal(layer.pending,false);assert.ok(!R.Bake.names.has(job.name));}else{const retry=R.Bake.q.find(j=>j.background===e.key);assert.ok(retry);assert.notEqual(retry,job);assert.equal(layer.pending,true);assert.notEqual(retry.name,job.name);assert.ok(!R.Bake.names.has(job.name));}
 return {inheritedInvalidationPolicy:reason==='resize'||reason==='third-cache eviction'};
});
const report={method:'Actual combined candidate stages/scenes/Bake versus original baseline evaluated in a VM, NO-OP raster contexts with counted canvas resets. Actual stepMidPrime copy/ramp and stepMidWindow states are exercised; this is lifecycle/control-flow evidence, not decoded pixels or performance.',checks:rows.length,allPassed:true,rows};fs.writeFileSync(path.join(__dirname,'reports/control-flow.json'),JSON.stringify(report,null,2)+'\n');console.log(rows.length+' control-flow checks passed');
