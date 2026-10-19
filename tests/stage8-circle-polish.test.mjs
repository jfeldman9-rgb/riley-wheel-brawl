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
test('N1: the lit anchor sister is tinted white-blue at full alpha; the others stay plain and dimmer, without fighting fades',()=>{
 const v=readFileSync('src/stage8-view.js','utf8');
 assert.match(v,/if\(e\.anchor\)\{e\.sprite\?\.setTint\?\.\(0xd6ecff\);if\(!fading\)e\.sprite\?\.setAlpha\?\.\(1\)/);
 assert.match(v,/e\.sprite\?\.clearTint\?\.\(\);if\(!fading\)e\.sprite\?\.setAlpha\?\.\(\.82\)/);
});
test('Stage 8 preloads its recorded lines when the kit is built, like the other stages',()=>{assert.match(readFileSync('src/stage8.js','utf8'),/constructor\(s\)\{installVoicePolicy8\(true\);preloadClips\(VOICE_FILES\);/);});
test('live decks space lines by max(3.8 s, recording + 0.6 s)',()=>{assert.match(readFileSync('src/stage8-story.js','utf8'),/at\+=Math\.max\(3\.8,lineHold8\(id,\.6\)\)/);});
