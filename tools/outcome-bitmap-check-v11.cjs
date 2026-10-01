'use strict';
// Offline lifecycle checks against the actual loader; no browser or timing claim.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'js/assets.js'),'utf8');
const tick=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const checks=[];
function env(options={}){
 const fetches=[],html=[],decodes=[],bitmapCalls=[],made=[];
 const R={ARTDATA:{},ART_MANIFEST:options.manifest};
 class Image {
  constructor(){this.width=this.naturalWidth=options.width||1070;this.height=this.naturalHeight=options.height||1470;}
  set src(url){this.url=url;html.push(this);}
  decode(){decodes.push(this.url);if(options.decodeWait)return options.decodeWait.promise;return Promise.resolve();}
 }
 const sandbox={RWB:R,Image,Promise,Date,document:{currentScript:null},console:{info(){}},fetch(url){const d=deferred();fetches.push({url,...d});return d.promise;}};
 if(!options.unsupported)sandbox.createImageBitmap=function(...args){const d=deferred();bitmapCalls.push({args,...d});return d.promise;};
 vm.runInNewContext(source,sandbox,{filename:'actual-js/assets.js'});
 const register=(key,opts={demand:true,bitmap:true})=>R.assets.register(key,key+'.webp',opts);
 const response=async(index,opts={})=>{const blob={bytes:[1,3,5,7],url:fetches[index].url};fetches[index].resolve({ok:opts.ok!==false,blob:()=>opts.blobReject?Promise.reject(Error('blob failure')):Promise.resolve(blob)});await tick();return blob;};
 const bitmap=async(index,opts={})=>{
  const image={closed:0,w:opts.width||1070,h:opts.height||1470,get width(){return this.closed?0:this.w;},get height(){return this.closed?0:this.h;},close(){this.closed++;}};
  made.push(image);if(opts.sealed)Object.preventExtensions(image);bitmapCalls[index].resolve(image);await tick();return image;
 };
 const htmlDone=async(index,fail=false)=>{const image=html[index];if(fail)image.onerror();else image.onload();await tick();return image;};
 return{R,register,fetches,html,decodes,bitmapCalls,made,response,bitmap,htmlDone};
}
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
(async()=>{
 await check('explicit outcome-only registrations leave every other resource path unchanged',()=>{
  const rows=[],R={CAPTIONS:{},LEVELS:[{}],SCROLL:{length:4240,left:i=>i*720,names:[]},Stage1:{waveTable:[]},assets:{register:(key,src,opts)=>rows.push({key,src,opts})}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'js/artmanifest.js'),'utf8'),{RWB:R});
  vm.runInNewContext(fs.readFileSync(path.join(root,'js/campaign.js'),'utf8'),{window:{RWB:R}});
  const outcomes=rows.filter(r=>r.key.startsWith('riley-victory-')||r.key.startsWith('boss-defeat-'));
  assert.equal(outcomes.length,10);assert.ok(outcomes.every(r=>r.opts.bitmap===true&&r.opts.demand===true));assert.ok(rows.filter(r=>!outcomes.includes(r)).every(r=>r.opts.bitmap===false));
 });
 await check('no outcome boot preload; two concurrent jobs; pending calls deduplicate',async()=>{
  const e=env();['one','two','three'].forEach(k=>e.register(k));await e.R.assets.load();await tick();assert.equal(e.fetches.length,0);assert.equal(e.html.length,0);
  const p=e.R.assets.ready(['one','two','three']),again=e.R.assets.ready(['one']);await tick();assert.equal(e.fetches.length,2);
  const blob=await e.response(0);assert.equal(e.bitmapCalls.length,1);assert.equal(e.bitmapCalls[0].args.length,1);assert.equal(e.bitmapCalls[0].args[0],blob,'the exact fetched Blob is passed without resize/crop options');assert.equal(e.fetches.length,2,'decode remains within the same two-job limit');
  const one=await e.bitmap(0);assert.equal(e.fetches.length,3);await e.response(1);const two=await e.bitmap(1);await e.response(2);const three=await e.bitmap(2);
  const result=await p;assert.equal(result[0],one);assert.equal(result[1],two);assert.equal(result[2],three);assert.equal((await again)[0],one);assert.equal(e.fetches.length,3);assert.equal(e.html.length,0);assert.equal(e.decodes.length,0);assert.equal(e.R.assets.get('one'),one);
 });
 await check('compatibility dimensions are real getters and release closes each owned master once',async()=>{
  const e=env();e.register('one');const p=e.R.assets.ready(['one']);await e.response(0);const img=await e.bitmap(0,{width:1536,height:1024});assert.equal((await p)[0],img);
  assert.equal(img.naturalWidth,1536);assert.equal(img.naturalHeight,1024);assert.equal(typeof Object.getOwnPropertyDescriptor(img,'naturalWidth').get,'function');
  e.R.assets.releaseDemand(['one']);e.R.assets.releaseDemand(['one']);assert.equal(img.closed,1);assert.equal(img.naturalWidth,0);assert.equal(img.naturalHeight,0);assert.equal(e.R.assets.get('one'),null);assert.equal(e.R.assets.settled('one'),false);
 });
 await check('release during bitmap decode closes late result and reload uses a new generation',async()=>{
  const e=env();e.register('one');const old=e.R.assets.ready(['one']);await e.response(0);e.R.assets.releaseDemand(['one']);const current=e.R.assets.ready(['one']);await tick();assert.equal(e.fetches.length,2);
  await e.response(1);const fresh=await e.bitmap(1);assert.equal((await current)[0],fresh);const stale=await e.bitmap(0);assert.equal((await old)[0],null);assert.equal(stale.closed,1);assert.equal(fresh.closed,0);assert.equal(e.R.assets.get('one'),fresh);
  e.R.assets.releaseDemand(['one']);assert.equal(fresh.closed,1);assert.equal(stale.closed,1);
 });
 await check('queued cancellation never downloads, settles null and frees its pending identity',async()=>{
  const e=env();['one','two','three'].forEach(k=>e.register(k));const p=e.R.assets.ready(['one','two','three']);e.R.assets.releaseDemand(['three']);await tick();assert.equal(e.fetches.length,2);
  await e.response(0);await e.bitmap(0);await e.response(1);await e.bitmap(1);assert.equal((await p)[2],null);assert.equal(e.fetches.length,2);
  const retry=e.R.assets.ready(['three']);await tick();assert.equal(e.fetches.length,3);await e.response(2);const third=await e.bitmap(2);assert.equal((await retry)[0],third);
 });
 await check('unsupported createImageBitmap retains ordinary HTML image/decode fallback',async()=>{
  const e=env({unsupported:true});e.register('one');const p=e.R.assets.ready(['one']);assert.equal(e.fetches.length,0);assert.equal(e.html.length,1);const img=await e.htmlDone(0);assert.equal((await p)[0],img);assert.equal(e.decodes.length,1);assert.equal(e.R.assets.get('one'),img);e.R.assets.releaseDemand(['one']);assert.equal(e.R.assets.has('one'),false);
 });
 await check('rejected bitmap decode falls back to HTML and retains normal successful semantics',async()=>{
  const e=env();e.register('one');const p=e.R.assets.ready(['one']);await e.response(0);e.bitmapCalls[0].reject(Error('unsupported bitmap decode'));await tick();assert.equal(e.html.length,1);const img=await e.htmlDone(0);assert.equal((await p)[0],img);assert.equal(e.fetches.length,1);assert.deepEqual(Array.from(e.R.assets.failed()),[]);
 });
 await check('compatibility getter failure closes decoded bitmap before HTML fallback',async()=>{
  const e=env();e.register('one');const p=e.R.assets.ready(['one']);await e.response(0);const img=await e.bitmap(0,{sealed:true});assert.equal(img.closed,1);assert.equal(e.html.length,1);const fallback=await e.htmlDone(0);assert.equal((await p)[0],fallback);e.R.assets.releaseDemand(['one']);assert.equal(img.closed,1);
 });
 await check('network and Blob failures retry once then report failed/settled without leaks',async()=>{
  for(const first of ['network','blob','status']){
   const e=env();e.register('one');const p=e.R.assets.ready(['one']);
   if(first==='network'){e.fetches[0].reject(Error('network'));await tick();}else await e.response(0,first==='blob'?{blobReject:true}:{ok:false});
   assert.equal(e.fetches.length,2);assert.ok(e.fetches[1].url.includes('&r='));await e.response(1,{ok:false});assert.equal((await p)[0],null);assert.equal(e.R.assets.settled('one'),true);assert.equal(e.R.assets.has('one'),false);assert.deepEqual(Array.from(e.R.assets.failed()),['one']);assert.equal(e.bitmapCalls.length,0);assert.equal(e.html.length,0);
  }
 });
 await check('failed HTML fallback retries the original request once and settles failure',async()=>{
  const e=env();e.register('one');const p=e.R.assets.ready(['one']);await e.response(0);e.bitmapCalls[0].reject(Error('decode'));await tick();await e.htmlDone(0,true);assert.equal(e.fetches.length,2);
  await e.response(1);e.bitmapCalls[1].reject(Error('decode again'));await tick();await e.htmlDone(1,true);assert.equal((await p)[0],null);assert.deepEqual(Array.from(e.R.assets.failed()),['one']);assert.equal(e.fetches.length,2);
 });
 await check('canceled failed request does not retry or republish',async()=>{
  const e=env();e.register('one');const p=e.R.assets.ready(['one']);e.R.assets.releaseDemand(['one']);await e.response(0,{ok:false});assert.equal((await p)[0],null);assert.equal(e.fetches.length,1);assert.equal(e.R.assets.settled('one'),false);assert.deepEqual(Array.from(e.R.assets.failed()),[]);
 });
 await check('release after publication invalidates an unresolved ready snapshot',async()=>{
  const e=env();e.register('one');const first=e.R.assets.ready(['one']);await e.response(0);const img=await e.bitmap(0);await first;
  const cached=e.R.assets.ready(['one']);e.R.assets.releaseDemand(['one']);assert.equal((await cached)[0],null);assert.equal(img.closed,1);assert.equal(e.R.assets.get('one'),null);
 });
 await check('canceled fallback decode cannot return an obsolete image',async()=>{
  const wait=deferred(),e=env({unsupported:true,decodeWait:wait});e.register('one');const p=e.R.assets.ready(['one']);await e.htmlDone(0);assert.equal(e.decodes.length,1);e.R.assets.releaseDemand(['one']);wait.resolve();await tick();assert.equal((await p)[0],null);assert.equal(e.R.assets.has('one'),false);
 });
 await check('manifest skip never fetches and ordinary lazy images stay on Image path',async()=>{
  const e=env({manifest:['ordinary.webp']});e.register('blocked');const blocked=await e.R.assets.ready(['blocked']);assert.equal(blocked[0],null);assert.equal(e.fetches.length,0);assert.equal(e.R.assets.settled('blocked'),true);assert.deepEqual(Array.from(e.R.assets.skipped()),['blocked']);
  e.register('ordinary',{lazy:true});const p=e.R.assets.ready(['ordinary']);assert.equal(e.html.length,1);const img=await e.htmlDone(0);assert.equal((await p)[0],img);assert.equal(e.fetches.length,0);assert.equal(e.bitmapCalls.length,0);e.R.assets.releaseDemand(['ordinary']);assert.equal(e.R.assets.get('ordinary'),img);
 });
 await check('requested bitmap keeps priority ahead of queued ambient assets without preemption',async()=>{
  const e=env();for(const k of ['ambient1','ambient2','ambient3'])e.register(k,{lazy:true});e.register('outcome');await e.R.assets.load();assert.equal(e.html.length,2);const p=e.R.assets.ready(['outcome']);assert.equal(e.fetches.length,0);await e.htmlDone(0);assert.equal(e.fetches.length,1);assert.equal(e.html.length,2);
  await e.response(0);const img=await e.bitmap(0);assert.equal((await p)[0],img);assert.equal(e.html.length,3);await e.htmlDone(1);await e.htmlDone(2);
 });
 console.log(JSON.stringify({allPassed:true,checks:checks.length,names:checks,method:'Actual source in VM with controlled fetch/Blob/ImageBitmap/Image lifecycle. No browser, raster, performance or pixel-equivalence claim.'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
