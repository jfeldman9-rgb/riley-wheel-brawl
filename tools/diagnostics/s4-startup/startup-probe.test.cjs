'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {installStartupProbe} = require('./startup-probe.cjs');
const checks = [];
function check(name, fn) { return Promise.resolve().then(fn).then(() => { checks.push(name); console.log('PASS ' + name); }); }
function deferred() { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b;}); return {promise,resolve,reject}; }
async function tick() { await Promise.resolve(); await Promise.resolve(); }
function fixture() {
  let time = 0;
  const app = [], bitmap = deferred(), fetchResult = deferred(), arrayResult = deferred(), decode = deferred();
  const failures = {}, receivers = {};
  class Response {
    constructor() { this.url = 'https://example.test/private/location/music-main.ogg?token=hidden'; this.ok = true; this.status=200; }
    arrayBuffer(...args) { receivers.bytes={self:this,args};time+=.2;if(failures.bytes)throw failures.bytes;return arrayResult.promise; }
  }
  class BaseAudioContext {
    constructor() { this.currentTime=1.25; }
    decodeAudioData(...args) { receivers.decode={self:this,args};time+=2;if(failures.decode)throw failures.decode;this.callbacks=args.slice(1);return decode.promise; }
  }
  class AudioBufferSourceNode {
    constructor(context, buffer) {this.context=context;this.buffer=buffer;this.loop=true;}
    start(...args) {receivers.start={self:this,args};time+=3;if(failures.start)throw failures.start;return 'native-start-return';}
  }
  class CanvasRenderingContext2D {
    constructor(canvas) {this.canvas=canvas;this.globalCompositeOperation='source-over';}
    drawImage(...args) {receivers.draw={self:this,args};time+=2;app.push('draw');if(failures.draw)throw failures.draw;return 'draw-result';}
    getImageData(...args) {time+=3;app.push('read');return {data:new Uint8Array(4)};}
    fillRect(...args) {time+=.2;app.push('fill');return undefined;}
    putImageData(...args) {time+=.2;app.push('put');return 'put-result';}
  }
  class HTMLCanvasElement {
    constructor() {this.width=288;this.height=384;this.ctx=new CanvasRenderingContext2D(this);}
    getContext(...args) {receivers.context={self:this,args};time+=.1;return this.ctx;}
  }
  const world={performance:{now:()=>time},Promise,Response,BaseAudioContext,AudioBufferSourceNode,CanvasRenderingContext2D,HTMLCanvasElement,
    createImageBitmap(...args){receivers.bitmap={self:this,args};time+=14;if(failures.bitmap)throw failures.bitmap;return bitmap.promise;},
    fetch(...args){receivers.fetch={self:this,args};time+=.1;if(failures.fetch)throw failures.fetch;return fetchResult.promise;}};
  const R={Bake:{q:[],enqueue(pri,name,run,data){let job=this.q.find(x=>x.name===name);if(!job){job=Object.assign({pri,name,run},data);this.q.push(job);}return job;}},audio:{trace:[],song:'stage4',musicLevel:1,playing:false,
    playMusic(){return 'music'},markFirstVisibleFrame(){return true},loadTrack(){return fetchResult.promise},loadClip(){return decode.promise}}};
  return {world,R,app,bitmap,fetchResult,arrayResult,decode,failures,receivers,advance:n=>time+=n};
}
(async()=>{
await check('serializable function has no external closure dependencies',()=>{
  const f=fixture();const install=vm.runInNewContext('('+installStartupProbe.toString()+')');const p=install(f.world);p.attachR(f.R);p.mark('scene-enter');assert.equal(p.snapshot().complete,true);p.restore();
});
await check('bitmap preserves promise, receiver, args, app callback order and source privacy',async()=>{
  const f=fixture(), original=f.world.createImageBitmap, p=installStartupProbe(f.world);
  const source={src:'https://example.test/a/private/cg-stone-guard.png?v=secret',width:768,height:1024},opts={resizeWidth:288,resizeHeight:384,resizeQuality:'high'};
  const returned=f.world.createImageBitmap(source,opts);assert.equal(returned,f.bitmap.promise);assert.equal(f.receivers.bitmap.self,f.world);assert.equal(f.receivers.bitmap.args[0],source);assert.equal(f.receivers.bitmap.args[1],opts);
  const seen=[];returned.then(()=>seen.push(1));returned.then(()=>seen.push(2));f.bitmap.resolve({width:288,height:384});await tick();assert.deepEqual(seen,[1,2]);
  const snap=p.snapshot();assert.equal(snap.events.find(e=>e.type==='bitmap-return').syncMs,14);assert.equal(snap.events.find(e=>e.type==='bitmap-call').source.source,'cg-stone-guard.png');assert.equal(JSON.stringify(snap).includes('secret'),false);assert.equal(JSON.stringify(snap).includes('/private/'),false);
  p.restore();assert.equal(f.world.createImageBitmap,original);
});
await check('fetch to bytes to decode keeps original Promises and asset correlation',async()=>{
  const f=fixture(),p=installStartupProbe(f.world);const response=new f.world.Response();
  assert.equal(f.world.fetch('/assets/audio/music-main.ogg?v=private'),f.fetchResult.promise);f.fetchResult.resolve(response);await tick();
  assert.equal(response.arrayBuffer(),f.arrayResult.promise);const data=new ArrayBuffer(80);f.arrayResult.resolve(data);await tick();
  const ctx=new f.world.BaseAudioContext(),callbackThis={},buffer={duration:159,length:7000000,sampleRate:44100,numberOfChannels:2},order=[];
  function onSuccess(value){assert.equal(this,callbackThis);assert.equal(value,buffer);order.push('callback');return 'callback-return';}
  function onError(){throw Error('unexpected error callback');}
  assert.equal(ctx.decodeAudioData(data,onSuccess,onError),f.decode.promise);assert.equal(f.receivers.decode.self,ctx);assert.equal(f.receivers.decode.args[0],data);
  f.decode.promise.then(()=>order.push('promise'));assert.equal(ctx.callbacks[0].call(callbackThis,buffer),'callback-return');f.decode.resolve(buffer);await tick();assert.deepEqual(order,['callback','promise']);
  const source=new f.world.AudioBufferSourceNode(ctx,buffer);assert.equal(source.start(1.25,0),'native-start-return');assert.deepEqual(f.receivers.start.args,[1.25,0]);
  const rows=p.snapshot().events,decodeRow=rows.find(e=>e.type==='audio-decode-call');assert.equal(decodeRow.source,'music-main.ogg');assert.equal(decodeRow.byteLength,80);assert.equal(rows.find(e=>e.type==='audio-source-start').decodeId,decodeRow.id);assert.ok(Math.abs(rows.find(e=>e.type==='audio-decode-return').syncMs-2)<1e-10);p.restore();
});
await check('callback exceptions and rejected Promises are not replaced',async()=>{
  const f=fixture(),p=installStartupProbe(f.world),ctx=new f.world.BaseAudioContext(),error={sentinel:'callback'};
  const promise=ctx.decodeAudioData(new ArrayBuffer(4),null,function(value){assert.equal(value,error);throw error;});assert.equal(promise,f.decode.promise);
  assert.throws(()=>ctx.callbacks[1](error),e=>e===error);const handled=promise.catch(e=>{assert.equal(e,error);return 'application-handled';});f.decode.reject(error);assert.equal(await handled,'application-handled');await tick();assert.equal(p.snapshot().events.find(e=>e.type==='audio-decode-settled').ok,false);p.restore();
});
await check('native synchronous throws are exactly preserved',()=>{
  for(const [key,call] of [
    ['bitmap',f=>f.world.createImageBitmap({width:1,height:1},{})],
    ['fetch',f=>f.world.fetch('/x')],['bytes',f=>new f.world.Response().arrayBuffer()],
    ['decode',f=>new f.world.BaseAudioContext().decodeAudioData(new ArrayBuffer(1))],
    ['start',f=>new f.world.AudioBufferSourceNode(new f.world.BaseAudioContext(),{}).start()]]){
    const f=fixture(),p=installStartupProbe(f.world),error={key};f.failures[key]=error;assert.throws(()=>call(f),e=>e===error);p.restore();
  }
});
await check('current and future jobs retain returns and readiness while atoms attribute copy and shade',()=>{
  const f=fixture(),nativeRun=function(job,end){assert.equal(this,job);assert.equal(end,100);job.state.phase='rig';const canvas=new f.world.HTMLCanvasElement(),g=canvas.getContext('2d',{willReadFrequently:true});
    assert.equal(g.drawImage({width:288,height:384},0,0,288,16,0,0,288,16),'draw-result');g.getImageData(0,0,1,16);g.globalCompositeOperation='source-atop';g.fillRect(0,0,288,16);g.globalCompositeOperation='source-over';g.getImageData(0,0,1,16);job.state.phase='flat';g.drawImage(canvas,0,0);g.getImageData(0,0,1,16);return false;};
  const ready=()=>{throw Error('Probe must not invoke readiness');};const job=f.R.Bake.enqueue(1,'pose:guard:idle',nativeRun,{state:{phase:'rig'},ready});
  const originalDescriptor=Object.getOwnPropertyDescriptor(job,'run'),p=installStartupProbe(f.world);p.attachR(f.R);assert.equal(job.run(job,100),false);assert.equal(job.ready,ready);
  const second=f.R.Bake.enqueue(2,'pose:loial:idle',function(){return undefined},{state:{phase:'rast'}});assert.equal(second.run(second,200),undefined);assert.equal(f.R.Bake.enqueue(0,'pose:guard:idle',()=>true),job);
  const rows=p.snapshot().events.filter(e=>e.type==='job-step');assert.equal(rows.length,2);assert.equal(rows[0].done,false);assert.equal(rows[0].phaseBefore,'rig');assert.equal(rows[0].phaseAfter,'flat');assert.equal(rows[0].canvas['rig-copy:strip-readback'].calls,1);assert.equal(rows[0].canvas['rig-shade:strip-readback'].calls,1);assert.equal(rows[0].canvas['pose-flat:getImageData'].calls,1);assert.equal(rows[0].firstSlowOps[0].operation,'drawImage');assert.equal(rows[1].done,true);
  assert.deepEqual(f.app,['draw','read','fill','read','draw','read']);p.restore();assert.deepEqual(Object.getOwnPropertyDescriptor(job,'run'),originalDescriptor);
});
await check('job throws retain thrown identity and parent scope is restored',()=>{
  const f=fixture(),p=installStartupProbe(f.world);p.attachR(f.R);const error={native:'draw'};f.failures.draw=error;
  const job=f.R.Bake.enqueue(1,'pose:guard:idle',()=>new f.world.HTMLCanvasElement().ctx.drawImage({},0,0),{state:{phase:'flat'}});assert.throws(()=>job.run(job,100),e=>e===error);
  assert.equal(p.snapshot().events.filter(e=>e.type==='job-step')[0].threw,true);const count=p.snapshot().events.length;assert.throws(()=>new f.world.HTMLCanvasElement().ctx.drawImage({},0,0),e=>e===error);assert.equal(p.snapshot().events.length,count);p.restore();
});
await check('native descriptors, runtime descriptors and inherited push restore exactly',()=>{
  const f=fixture(),objects=[[f.world,'fetch'],[f.world,'createImageBitmap'],[f.world.BaseAudioContext.prototype,'decodeAudioData'],[f.world.CanvasRenderingContext2D.prototype,'drawImage'],[f.R.Bake,'enqueue'],[f.R.audio,'playMusic'],[f.R.audio.trace,'push']];
  const before=objects.map(([o,k])=>Object.getOwnPropertyDescriptor(o,k)),p=installStartupProbe(f.world);p.attachR(f.R);p.attachR(f.R);
  assert.equal(f.R.audio.trace.push({name:'track:main',t:4.25}),1);assert.equal(p.snapshot().events.find(e=>e.type==='audio-trace').audioTime,4.25);p.restore();p.restore();objects.forEach(([o,k],i)=>assert.deepEqual(Object.getOwnPropertyDescriptor(o,k),before[i]));
});
await check('restore does not overwrite application replacements or emit late Promise events',async()=>{
  const f=fixture(),p=installStartupProbe(f.world);f.world.createImageBitmap({width:1,height:1},{});const replacement=()=>42;f.world.fetch=replacement;const before=p.snapshot().events.length;p.restore();f.bitmap.resolve({width:1,height:1});await tick();assert.equal(p.snapshot().events.length,before);assert.equal(f.world.fetch,replacement);
});
await check('bounded event overflow invalidates completeness without changing app behavior',()=>{
  const f=fixture(),p=installStartupProbe(f.world,{maxEvents:2});p.mark('one');p.mark('two');p.mark('three');assert.equal(f.world.fetch('/test'),f.fetchResult.promise);const s=p.snapshot();assert.equal(s.events.length,2);assert.equal(s.complete,false);assert.equal(s.overflow,true);assert.equal(s.droppedEvents,1);p.restore();
});
await check('snapshot returns an independent serializable copy and refuses a second runtime',()=>{
  const f=fixture(),p=installStartupProbe(f.world);p.attachR(f.R);p.mark('entry',{stage:4,nested:{unsafe:'not copied'}});const s=p.snapshot();assert.equal(s.events.at(-1).detail.stage,4);assert.equal(s.events.at(-1).detail.nested,undefined);s.events.length=0;assert.ok(p.snapshot().events.length>0);assert.throws(()=>p.attachR(fixture().R),/another runtime/);p.restore();
});
await check('performance marks align the trace, stay bounded and fail closed safely',()=>{
  const f=fixture(),marks=[];f.world.performance.mark=name=>marks.push(name);const p=installStartupProbe(f.world,{maxEvents:2});
  p.mark('scene-enter',{stage:4});p.mark('acceptance-first-raf');p.mark('would-overflow');assert.deepEqual(marks,['rwb-s4:scene-enter','rwb-s4:acceptance-first-raf']);assert.equal(p.snapshot().overflow,true);p.restore();
  const g=fixture();g.world.performance.mark=()=>{throw Error('mark failed');};const q=installStartupProbe(g.world);assert.doesNotThrow(()=>q.mark('scene-enter'));assert.equal(q.snapshot().observerFaults,1);assert.equal(q.snapshot().complete,false);assert.equal(g.world.fetch('/test'),g.fetchResult.promise);q.restore();
});
await check('unwrappable native method is reported and left unchanged',()=>{
  const f=fixture(),native=f.world.createImageBitmap;Object.defineProperty(f.world,'createImageBitmap',{value:native,writable:false,configurable:false});const p=installStartupProbe(f.world);assert.equal(f.world.createImageBitmap,native);assert.equal(p.snapshot().complete,false);assert.equal(p.snapshot().features.createImageBitmap,false);assert.deepEqual(p.snapshot().failures,['Cannot wrap createImageBitmap']);p.restore();
});
console.log(JSON.stringify({allPassed:true,checks:checks.length,names:checks}));
})().catch(error=>{console.error(error);process.exitCode=1;});
