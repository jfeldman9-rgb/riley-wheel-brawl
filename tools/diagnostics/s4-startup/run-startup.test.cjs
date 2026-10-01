'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {fixture,source,readStream,validateReport,FIXTURE_SHA,SOURCE}=require('./run-startup.cjs');
const root=path.resolve(__dirname,'../../..');
const f=fixture(root);assert.equal(f.sha256,FIXTURE_SHA);assert.ok(f.body.includes('callandor:level===4'));assert.ok(f.body.includes('wave,lives:99'));
const runtimeDiff=cp.execFileSync('git',['diff','--name-only',SOURCE,'HEAD','--','js','assets','index.html','css'],{cwd:root,encoding:'utf8'}).trim();
const runtimeDirty=cp.execFileSync('git',['status','--porcelain','--','js','assets','index.html','css'],{cwd:root,encoding:'utf8'}).trim();
if(runtimeDirty)assert.throws(()=>source(root),/must be clean/);else if(runtimeDiff){assert.throws(()=>source(root),/specified outcome-loader change/);if(runtimeDiff.split('\n').every(f=>['js/assets.js','js/campaign.js','js/presentation-v11.js'].includes(f)))assert.equal(source(root,true).runtimeMode,'outcome-bitmap-candidate');}else assert.equal(source(root).reviewedRuntime,SOURCE);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rwb-s4-fixture-'));
try{
 fs.mkdirSync(path.join(temp,'tools'));
 const original=fs.readFileSync(path.join(root,'tools/performance-v11.cjs'),'utf8');
 for(const text of [original.replace(f.body,f.body.replace('seed=1900+level','seed=2000+level')),original.replace(f.body,f.body.replace('wave,lives:99','wave,lives:98')),original+'\nawait p.evaluate(({level,wave})=>{}','']){
  fs.writeFileSync(path.join(temp,'tools/performance-v11.cjs'),String(text));assert.throws(()=>fixture(temp),/fixture|controller/);
 }
}finally{fs.rmSync(temp,{recursive:true,force:true});}
const env={...process.env};delete env.CI;delete env.GITHUB_ACTIONS;
const blocked=cp.spawnSync(process.execPath,[path.join(__dirname,'run-startup.cjs'),root,'--run-browser'],{env,encoding:'utf8'});
assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/authorized GitHub Actions diagnostic job/);
function report(){
 const labels=['scene-entry-start','scene-entry-return','two-raf-boundary','sample-start','sample-end'];
 const events=labels.map((label,i)=>({seq:i+1,type:'marker',label,atMs:[1,2,3,4,1601][i]}));events.splice(4,0,{seq:5,type:'job-step',job:'pose:guard:idle',atMs:100});events[5].seq=6;
 return {diagnosticOnly:true,reviewedRuntime:SOURCE,fixtureSha256:FIXTURE_SHA,errors:[],music:true,sample:{musicEnabled:true,stage:4,wave:5,callandor:false,rafTimes:[100,1600],callbackTimes:[101,1601],frames:[100,1600].map(t=>({t,frameMs:2,updateMs:.2,drawMs:.8,pumpMs:1})),probe:{complete:true,overflow:false,observerFaults:0,droppedEvents:0,failures:[],features:Object.fromEntries(['performanceMark','createImageBitmap','fetch','Response.arrayBuffer','decodeAudioData','AudioBufferSourceNode.start','canvas.getContext','canvas.drawImage','canvas.getImageData','canvas.fillRect','canvas.putImageData','Bake.enqueue','audio.trace.push'].map(k=>[k,true])),events}}};
}
assert.equal(validateReport(report()),true);
const scheduledBeforeMarker=report();scheduledBeforeMarker.sample.probe.events[3].atMs=100.5;scheduledBeforeMarker.sample.probe.events[4].atMs=100.6;assert.equal(validateReport(scheduledBeforeMarker),true,'RAF scheduled timestamp may precede sample marker while actual callback follows it');
for(const change of [
 r=>r.reviewedRuntime='other',r=>r.fixtureSha256='other',r=>r.errors.push('failed request'),r=>r.music=false,r=>r.sample.callandor=true,
 r=>r.sample.probe.complete=false,r=>r.sample.probe.overflow=true,r=>r.sample.probe.observerFaults=1,r=>r.sample.probe.droppedEvents=1,
 r=>r.sample.probe.failures.push('wrapper failed'),r=>delete r.sample.probe.features.fetch,r=>r.sample.probe.events[0].seq=9,
 r=>r.sample.probe.events[0].atMs=NaN,r=>r.sample.probe.events.shift(),r=>r.sample.rafTimes[1]=200,r=>r.sample.frames[1].t++,r=>r.sample.probe.events.splice(4,1),r=>delete r.sample.frames[0].t,r=>r.sample.frames[0].t=NaN,r=>r.sample.frames[0].pumpMs=NaN,r=>r.sample.probe.events[0].label='sample-end',r=>r.sample.probe.events[3].atMs=102,r=>delete r.sample.probe.observerFaults,r=>delete r.sample.probe.droppedEvents,r=>r.sample.probe.complete='yes',r=>r.sample.probe.events[4].atMs=1700,r=>delete r.sample.callbackTimes,r=>r.sample.callbackTimes[0]=NaN,r=>r.sample.callbackTimes[0]=99
]){const r=report();change(r);assert.throws(()=>validateReport(r),/Invalid S4 diagnostic/);}
console.log('PASS S4 diagnostic validity and29 negative controls; incomplete observer/conditions never pass');
(async()=>{
 let calls=[];const result=await readStream({send:async(method,args)=>{calls.push([method,args]);return method==='IO.read'?{data:Buffer.from('trace').toString('base64'),base64Encoded:true,eof:true}:{};}},'stream');
 assert.equal(result.toString(),'trace');assert.deepEqual(calls.map(x=>x[0]),['IO.read','IO.close']);
 calls=[];await assert.rejects(()=>readStream({send:async(method)=>{calls.push(method);if(method==='IO.read')throw Error('read failed');}},'stream'),/read failed/);assert.deepEqual(calls,['IO.read','IO.close']);
 console.log('PASS S4 diagnostic: exact reviewed runtime/controller, mutation rejection, no local browser launch, lossless trace read/cleanup; browserRuns=0');
})().catch(e=>{console.error(e);process.exitCode=1;});
