import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createBag7,createCall7Video,CALL7_PRESENT} from '../src/call7-cutscene.js';
import {q} from '../src/config.js';
test('bags persist independently and do not repeat across a refill',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  for(const helper of ['moiraine','lan','duo']){const a=createBag7(helper,storage,()=>.2);const first=a.next(),next=a.peek();const reloaded=createBag7(helper,storage,()=>.2);assert.equal(reloaded.next(),next);assert.notEqual(first,next);assert.notEqual(reloaded.next(),next);}
  assert.equal(data.size,3);
});
test('one predicted blob; helper changes and destroy discard in-flight responses',async()=>{
  q.set('cutscenes','1');const pending=[],alive=new Set();let n=0;
  const root={navigator:{webdriver:false},fetch:()=>new Promise(resolve=>pending.push(resolve)),URL:{createObjectURL:()=>{const u='blob:'+ ++n;alive.add(u);return u;},revokeObjectURL:u=>alive.delete(u)}};
  const video=createCall7Video({kit:{quality:0}},root,{moiraine:['M1'],lan:['L1'],duo:['D1']});
  try{const a=video.warm('moiraine'),b=video.warm('lan');pending[0]({ok:true,blob:async()=>({})});await a;assert.equal(alive.size,0);pending[1]({ok:true,blob:async()=>({})});await b;assert.equal(alive.size,1);await video.warm('lan');assert.equal(alive.size,1);
    const c=video.warm('duo');assert.equal(alive.size,0);video.destroy();pending[2]({ok:true,blob:async()=>({})});await c;assert.equal(alive.size,0);assert.equal(video.blobCount,0);
  }finally{video.destroy();q.delete('cutscenes');}
});
test('unreviewed clips do not fetch or delay a call',async()=>{
  let fetches=0;const video=createCall7Video({kit:{quality:0}},{fetch:()=>fetches++,navigator:{},URL:{}});
  await video.warm('moiraine');assert.equal(video.play('moiraine'),false);assert.equal(fetches,0);assert.ok(Object.values(CALL7_PRESENT).every(ids=>!ids.length));video.destroy();
});
