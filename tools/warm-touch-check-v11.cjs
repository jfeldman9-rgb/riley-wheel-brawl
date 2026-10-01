'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('crypto'),{createRequire}=require('module');
// Usage: node tools/warm-touch-check-v11.cjs [ROOT] [--out=REPORT.json]
// Default assertions require the bounded warm-touch implementation. Diagnostic
// source overrides and --expect-control are only for reproducing the old defect.
const args=process.argv.slice(2),option=name=>args.find(arg=>arg.startsWith(name+'='))?.slice(name.length+1);
const root=path.resolve(args.find(arg=>!arg.startsWith('--'))||path.join(__dirname,'..'));
const req=createRequire(path.join(root,'tools/soak.cjs')),{boot}=req(path.join(root,'tools/soak.cjs')),{createCanvas,Image}=req('@napi-rs/canvas');
const performanceFile=path.resolve(option('--performance-source')||path.join(root,'js/performance.js'));
const puppetsFile=path.resolve(option('--puppets-source')||path.join(root,'js/puppets.js'));
const expectControl=args.includes('--expect-control'),out=option('--out');
const performanceSource=fs.readFileSync(performanceFile,'utf8'),puppetsSource=fs.readFileSync(puppetsFile,'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
async function imagesFor(){const R=boot(root);await new Promise(r=>setImmediate(r));const kinds=['ashaman','trolloc','chieftain','loial'],images=new Map();for(const kind of kinds){const key=R.Puppet.defs[kind].key;if(images.has(key))continue;const image=new Image();image.src=fs.readFileSync(path.join(root,R.ART_FILES[key]));await image.decode();images.set(key,image);}return{images,kinds};}
async function engine(variant,images,scale=1){
 const R=boot(root);await new Promise(r=>setImmediate(r));R.assets.get=k=>images.get(k)||null;R.assets.has=k=>images.has(k);R.display.renderScale=scale;R.perf.fullFace=true;
 let time=0,increment=.01,canvases=0,hasScreen=true;const made=[];const screen=createCanvas(640*scale,360*scale),context={window:{RWB:R},document:{createElement:()=>{canvases++;const canvas=createCanvas(1,1);made.push(canvas);return canvas;},getElementById:()=>hasScreen?screen:null},performance:{now:()=>time+=increment},console};
 vm.createContext(context);vm.runInContext(performanceSource,context);
 const source=puppetsSource,instrumented=source.replace('R.Puppet={defs,','R.Puppet={test:{getRig,peekRig,stepPose,bakePose,actorFor,targets,dropRig,finishPose,blitPose,rigs},defs,');assert.notEqual(instrumented,source);vm.runInContext(instrumented,context);
 const calls=[],touch=R.Puppet.touchEntry;R.Puppet.touchEntry=function(entry){const was=!!entry?.touched,result=touch.apply(this,arguments);calls.push({entry,was,result});return result;};
 const drain=()=>{let slices=0;while(R.Bake.q.length&&slices++<10000)R.Bake.pump(3);assert.equal(R.Bake.q.length,0,'real queue drains');return slices;};
 const owners=()=>{const map=new Map();for(const rig of R.Puppet.test.rigs.values())for(const [key,entry] of rig.library||[])map.set(entry,{kind:rig.kind,key});return map;};
 return{R,screen,calls,drain,owners,setIncrement(value){increment=value;},setScreen(value){hasScreen=value;},stats:()=>({canvases}),dispose(){for(const canvas of made)canvas.width=canvas.height=1;for(const kind of Object.keys(R.Puppet.defs))R.Puppet.test.dropRig(kind);R.Bake.q.length=0;R.Bake.touches.length=0;screen.width=screen.height=1;}};
}
function rgba(c){return Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);}

(async()=>{
 const{images}=await imagesFor(),rows=[],batchKeys=['idle','hurt','cast','attack','air','channel','w0','k0'];
 const prepareKeys=(R,kind,list)=>{const t=R.Puppet.test,d=R.Puppet.defs[kind],rig=t.getRig(d);for(const key of list){const a=t.actorFor(d,key),pose=R.Puppet.pose(a,d.height),entry=t.bakePose(rig,t.targets(a,d,rig,pose),pose);(rig.library||(rig.library=new Map())).set(key,entry);}return rig;};
 for(const variant of [expectControl?'control':'bounded']){
  // Actual decoded synchronous bakes + cached wantPose reproduce the ordinary
  // prefetch path when all poses are already built but never onscreen.
  console.log('CHECK '+variant+' batch');const e=await engine(variant,images),{R}=e,rig=prepareKeys(R,'ashaman',batchKeys);
  assert.equal(rig.library.size,8);assert.equal(R.Bake.touches.length,0);
  for(const key of batchKeys){R.Puppet.wantPose('ashaman',key,4);R.Puppet.wantPose('ashaman',key,0);}
  assert.equal(R.Bake.touches.length,8,'queueTouch deduplicates per entry');
  assert.equal(R.Bake.q.length,0,'cached wantPose schedules no raster job');
  e.setIncrement(0);e.calls.length=0;R.perf.inBake=false;const returned=R.Bake.flushTouches(2);
  assert.equal(returned,variant==='control'?8:1);assert.equal(e.calls.filter(x=>x.result).length,returned);assert.equal(R.perf.inBake,false);
  rows.push({test:'cached-prefetch-batch',variant,queued:8,successfulWarmBlits:returned,remaining:R.Bake.touches.length,clock:'fixed; operation-count proof only'});
  e.dispose();global.gc?.();

  // Prepare a scene with only the always-available Loial. Both Trolloc kinds
  // are absent, yet their completed idle/walk entries join the warm queue.
  console.log('CHECK '+variant+' stage');const stage=await engine(variant,images),S=stage.R;S.Puppet.prepareScene(0,{enemies:[],allies:[]});S.Bake.drop(job=>job.kind&&!['idle','w0','w1'].includes(job.key));stage.drain();
  const owners=stage.owners(),visible=new Set(S.perf.stageVisibleKinds),pending=S.Bake.touches.map(entry=>({...owners.get(entry),entry}));
  assert.equal(pending.length,8);assert.equal(pending.filter(x=>!visible.has(x.kind)).length,6);
  assert.equal(pending.filter(x=>x.key!=='idle'&&!/^w\d+$/.test(x.key)).length,0,'fixture completed idle/walk entries queue correctly');
  const stale=new Set(pending.filter(x=>x.kind!=='loial').map(x=>x.entry)),surviving=new Set(pending.filter(x=>x.kind==='loial').map(x=>x.entry));
  S.Puppet.prepareScene(4,{enemies:[],allies:[]});const afterOwners=stage.owners();assert.ok([...stale].every(x=>!afterOwners.has(x)),'old entries no longer belong to a live rig');
  const retained=S.Bake.touches.filter(x=>stale.has(x)).length,staleSurfacePixels=[...stale].reduce((n,x)=>n+x.surface.width*x.surface.height,0);assert.equal(retained,variant==='control'?6:0);
  assert.ok([...surviving].every(x=>S.Bake.touches.includes(x)),'live Loial queue is retained');
  if(variant==='bounded')assert.ok([...stale].every(x=>x._touchQueued===false),'removed entry queue flags reset');
  stage.setIncrement(0);stage.calls.length=0;const counts=[];while(S.Bake.touches.length){const n=S.Bake.flushTouches(2);counts.push(n);assert.ok(counts.length<100);}
  const staleBlits=stage.calls.filter(x=>x.result&&stale.has(x.entry)).length;assert.equal(staleBlits,variant==='control'?6:0);
  rows.push({test:'absent-kinds-and-stage-drop',variant,queuedAfterStage1:8,completedKeys:['idle','w0','w1'],otherPoseJobsCanceledForMemory:true,absentKindEntries:6,staleRetainedAfterStage5:retained,staleSurfacePixels,staleSurfaceLogicalRgbaBytes:staleSurfacePixels*4,staleWarmBlits:staleBlits,liveRetained:2,successfulWarmBlitsByFlush:counts});
  stage.dispose();global.gc?.();

  // A demanded pose bypasses warm-queue backlog. Its completed surface is used
  // in this call even when no speculative budget exists, then skipped later.
  console.log('CHECK '+variant+' demand');const demand=await engine(variant,images),D=demand.R,dr=prepareKeys(D,'ashaman',['idle','hurt','k5']);for(const key of ['idle','hurt','k5'])D.Puppet.wantPose('ashaman',key,4);
  demand.setIncrement(0);assert.equal(D.Bake.flushTouches(0),0);assert.equal(D.Bake.touches.length,3);
  const requested=dr.library.get('k5'),actor=D.Puppet.test.actorFor(D.Puppet.defs.ashaman,'k5');actor.x=300;actor.y=300;actor.facing=-1;
  assert.ok(!requested.touched);const surface=createCanvas(640,360);const queuedBefore=D.Bake.q.length,fallbackBefore=D.perf.poseFallbacks;assert.equal(D.Puppet.draw(surface.getContext('2d'),actor,0,'ashaman'),true);
  assert.equal(requested.touched,true);assert.equal(D.Bake.q.length,queuedBefore);assert.equal(D.perf.poseFallbacks,fallbackBefore);
  const reference=createCanvas(640,360);for(const entry of D.Bake.touches)entry._touchQueued=false;D.Bake.touches.length=0;D.Puppet.draw(reference.getContext('2d'),actor,0,'ashaman');assert.ok(rgba(surface).equals(rgba(reference)),'same pixels with or without backlog');
  requested._touchQueued=false;D.Bake.queueTouch(requested);assert.equal(D.Bake.touches.length,0,'directly drawn pose is not requeued');
  const idle=dr.library.get('idle'),hurt=dr.library.get('hurt');D.Bake.queueTouch(idle);D.Bake.queueTouch(hurt);idle.touched=true;
  D.perf.inBake=true;const n=D.Bake.flushTouches();assert.equal(n,1,'already touched entry is skipped, next entry can warm');assert.equal(D.perf.inBake,true);assert.equal(idle._touchQueued,false);assert.equal(hurt._touchQueued,false);
  rows.push({test:'demand-bypasses-backlog',variant,backlog:3,immediateRequestedPose:true,additionalRasterJobs:0,additionalFallbacks:0,exactPixels:true,demandPixelHash:hash(rgba(surface)),skipsAlreadyDrawn:true,restoresInBake:true});
  demand.dispose();global.gc?.();surface.width=surface.height=reference.width=reference.height=1;
 }
 const report={method:'Decoded PNG/WebP images, actual Node Skia Canvas2D renderer and Bake queue. Deterministic clock is only a yielding/operation-count device, never elapsed performance evidence.',expectations:expectControl?'explicit old-control reproduction':'bounded warm-touch regression',root,sourceFiles:{performance:performanceFile,puppets:puppetsFile},sourceHashes:{performance:hash(performanceSource),puppets:hash(puppetsSource)},cases:rows.length,rows};if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(path.resolve(out),JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
