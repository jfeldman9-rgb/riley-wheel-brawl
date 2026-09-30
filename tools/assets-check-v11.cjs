'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const waiting=[],requests=[],decodes=[],decodeWait=[];let active=0,maxActive=0;
const R={ART_MANIFEST:['first.png','second.png','third.png','fourth.png','late.png','outcome1.png','outcome2.png'],ARTDATA:{}};
class Image {
 constructor(){this.width=this.naturalWidth=64;}
 set src(url){this.url=url;requests.push(url.split('?')[0]);active++;maxActive=Math.max(maxActive,active);waiting.push(()=>{active--;this.onload();});}
 decode(){decodes.push(this.url.split('?')[0]);if(this.url.startsWith('fourth.png'))return new Promise(resolve=>decodeWait.push(resolve));return Promise.resolve();}
}
const context=vm.createContext({RWB:R,Image,document:{currentScript:null},console,Promise,Date,fetch:()=>Promise.resolve({ok:false})});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/assets.js'),'utf8'),context);
const tick=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
(async()=>{
 R.assets.register('outcome1','outcome1.png',{demand:true});R.assets.register('outcome2','outcome2.png',{demand:true});
 for(const key of ['first','second','third','fourth'])R.assets.register(key,key+'.png',{lazy:true});
 await R.assets.load();await tick();assert.equal(requests.length,2);
 let ready=false;const pending=R.assets.ready(['fourth']).then(images=>{assert(images[0]);ready=true;});await tick();
 assert.equal(ready,false,'queued fourth image must not prematurely settle null');
 assert.equal(requests.length,2,'ready must not start duplicate downloads');
 R.assets.register('late','late.png',{lazy:true});const late=R.assets.ready(['late']);await tick();
 assert.equal(requests.length,2,'late registration respects shared two-fetch limit');
 while(waiting.length){waiting.shift()();await tick();}
 assert.equal(ready,false,'requested image must wait for its decode, not merely download');
 assert.deepEqual(decodes.sort(),['fourth.png','late.png'],'only requested lazy images decode');
 decodeWait.shift()();await pending;await late;
 assert.equal(ready,true);assert.equal(maxActive,2);assert.equal(new Set(requests).size,5);assert.equal(requests.length,5);
 assert(!requests.some(key=>key.startsWith('outcome')),'future outcome masters are not fetched at boot');
 assert(requests.indexOf('fourth.png')<requests.indexOf('third.png'),'requested image is prioritized ahead of ambient queued art');
 const canceled=R.assets.ready(['outcome1']);await tick();R.assets.releaseDemand(['outcome1']);
 while(waiting.length){waiting.shift()();await tick();}
 assert.equal((await canceled)[0],null);assert.equal(R.assets.has('outcome1'),false,'released in-flight master cannot reappear');
 const reloaded=R.assets.ready(['outcome1']);await tick();while(waiting.length){waiting.shift()();await tick();}
 assert((await reloaded)[0]);assert.equal(R.assets.has('outcome1'),true);R.assets.releaseDemand(['outcome1']);
 assert.equal(R.assets.has('outcome1'),false,'previous stage master is released');assert(!requests.includes('outcome2.png'),'unvisited stage still has no download');
 const missing=await R.assets.ready(['not-registered']);assert.equal(missing[0],null);
 const game=require('./soak.cjs').boot(path.resolve(__dirname,'..'));assert.equal(game.ASSET_VER,'20260930-v11-review');assert.equal(game.assets.VER,game.ASSET_VER,'content and loader resource stamps must match after all scripts load');
 console.log('PASS lazy assets wait for queued fetch/decode, never duplicate, and preserve two-fetch concurrency');
 console.log('PASS content cannot override the loader cache stamp with a stale release');
})().catch(error=>{console.error(error);process.exitCode=1;});
