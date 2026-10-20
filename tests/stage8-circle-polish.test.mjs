import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';
import {CIRCLE8} from '../src/stage8-circle.js';
function quiet(h){h.setController(null);const s=h.s;s.updateZones=()=>{};s.pending=[];s.zone=s.zones[0];for(const e of s.enemies)e.destroy();s.enemies=[];s.riley.inv=0;s.bot={update(){}};return s;}
test('N2: if every sister is gone before three anchors fall, the Callandor prompt is forced (no dead air)',()=>withSeed(4,()=>{
 const h=stage8Simulation();try{const s=quiet(h),k=s.kit;k.circle.start();
  for(const e of k.circle.sisters)if(!e.anchor)e.alive=false;
  const anchor=k.circle.sisters.find(e=>e.anchor);anchor.yield();
  assert.equal(k.circle.count,3);assert.equal(k.circle.phase,'prompt');
 }finally{h.destroy?.();}}));
test('N3: CIRCLE8 no longer carries the unused callandorWait',()=>{assert.ok(!('callandorWait' in CIRCLE8));assert.ok(!/callandorWait:\s*2/.test(readFileSync('docs/STAGE8-PLAN.md','utf8')));});
test('N6: post-sync anchor tint and ring dimming survive sync, preserving yield and silhouette fades',()=>withSeed(4,()=>{
 const h=stage8Simulation();try{const s=quiet(h),k=s.kit;k.circle.start();
  const anchor=k.circle.sisters[0],ring=k.circle.sisters[1];
  for(const e of [anchor,ring]){e.sprite.setAlpha=v=>{e.sprite.alpha=v;return e.sprite;};e.sprite.setTint=v=>{e.sprite.tint=v;return e.sprite;};e.sprite.clearTint=()=>{e.sprite.tint=null;return e.sprite;};}
  anchor.sync();ring.sync();assert.equal(anchor.sprite.alpha,1);assert.equal(anchor.sprite.tint,0xa8d8ff);assert.equal(ring.sprite.alpha,.7);assert.equal(ring.sprite.tint,null);
  ring.anchor=true;ring.sync();assert.equal(ring.sprite.alpha,1);assert.equal(ring.sprite.tint,0xa8d8ff);
  ring.anchor=false;ring.state='yield';ring.st=.6;ring.sync();assert.ok(Math.abs(ring.sprite.alpha-.25)<.001);
  ring.state='idle';ring.silhouette=.5;ring.sync();assert.equal(ring.sprite.alpha,.4);
 }finally{h.destroy();}}));
test('Stage 8 preloads its recorded lines when the kit is built, like the other stages',()=>{assert.match(readFileSync('src/stage8.js','utf8'),/constructor\(s\)\{installVoicePolicy8\(true\);preloadClips\(VOICE_FILES\);/);});
test('live decks space lines by max(3.8 s, recording + 0.6 s)',()=>{assert.match(readFileSync('src/stage8-story.js','utf8'),/at\+=Math\.max\(3\.8,lineHold8\(id,\.6\)\)/);});
