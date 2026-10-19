import test from 'node:test';import assert from 'node:assert/strict';
import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';
import {beginClash8,stepClash8} from '../src/stage8-clash.js';
import {call8Context,call8,stepCall8} from '../src/stage8-lifecycle.js';
import {eligible8,callEffect8} from '../src/mat-call.js';
import {bindStage8Hud} from '../src/stage8-hud.js';
import {audio,settle} from './helpers/stage8-audio-harness.mjs';
import {DUR8} from '../src/stage8-voice-durations.js';
function quiet(h){h.setController(null);const s=h.s;s.updateZones=()=>{};s.pending=[];s.zone=s.zones[0];for(const e of s.enemies)e.destroy();s.enemies=[];s.bot={update(){}};return s;}
test('N3: pip captions survive following story and queued voice captions for 2.8 s without delaying story',()=>withSeed(1,()=>{
 for(const beat of ['z0','volley']){const h=stage8Simulation();try{const s=quiet(h),k=s.kit,tasks=[];let visible='';
 const hud={capT:0,caption(w,t){visible=w+': '+t;this.capT=2.2;},update(time,delta){this.capT-=delta/1000;}};
 hud.sys={sceneUpdate:hud.update};s.caption=(w,t)=>hud.caption(w,t);bindStage8Hud(hud,k);k.later=(delay,fn)=>tasks.push({delay,fn});
 k.story.say=id=>s.caption('NEXT',id);k.story.play=()=>k.later(0,()=>k.story.say('perrin'));
 if(beat==='z0')k.onZoneClear(0);else k.onVolleyEnd(1);
 const pip=visible;assert.ok(hud.capT>=2.8);assert.match(pip,beat==='z0'?/^LEWS THERIN: One knot/:/^RAND: That's Taim/);
 for(const task of tasks){assert.equal(task.delay,0,'story schedule stays unchanged');task.fn();}
 s.caption('QUEUED','A line finishing its audio wait');s.caption.hold8(6.3);
 hud.sys.sceneUpdate.call(hud,2790,2790);assert.equal(visible,pip);assert.ok(hud.capT>0);
 hud.sys.sceneUpdate.call(hud,2810,20);assert.match(visible,/^QUEUED:/);assert.equal(hud.capT,6.3,'deferred voiced caption retains its recording hold');
 }finally{h.destroy();}}
}));
test('N5: Twinkle Toes replies once while the clash is active even with the world task clock frozen',()=>withSeed(2,()=>{
 const h=stage8Simulation();try{const s=quiet(h),k=s.kit,said=[];k.story.say=(id,options)=>said.push({id,options});
 assert.equal(beginClash8(k),true);const clock=k.clock;stepClash8(k,.49);assert.equal(said.length,1);stepClash8(k,.02);stepClash8(k,.2);
 assert.ok(k.clash);assert.equal(k.clock,clock);assert.deepEqual(said.map(x=>x.id),['riley_st8_clash_01','st8_tt_clash_01']);assert.equal(said[1].options.wait,2.5);
 }finally{h.destroy();}
}));
test('N7: ring sisters cannot make the call ready or receive its effect; the lit anchor can',()=>withSeed(3,()=>{
 const h=stage8Simulation();try{const s=quiet(h),k=s.kit;k.circle.start();k.matJoined=true;
 s.camX=3000;s.riley.x=3400;s.riley.y=590;const ring=k.circle.sisters[1];ring.y=590;const anchor=k.circle.sisters[0];anchor.entering=false;
 s.enemies=[ring];ring.entering=false;assert.equal(eligible8(s.enemies,s.camX).length,0);assert.equal(call8Context(k).hittable,false);
 const hp=ring.hp;assert.equal(callEffect8(ring,'mat','dice'),null);assert.equal(ring.hp,hp);assert.equal(ring.bubble,true);
 assert.equal(call8(k),false);assert.equal(k.call.charges,1);
 s.enemies=[anchor,ring];assert.equal(call8Context(k).hittable,true);assert.equal(call8(k),true);stepCall8(k,.5);
 assert.equal(anchor.bubble,false);assert.ok(anchor.hp<anchor.maxHp);assert.equal(ring.hp,hp);assert.equal(ring.bubble,true);
 }finally{h.destroy();}
}));
test('N9: Stage 8 captions hold through each recording plus .3 s, starting when queued speech starts',async()=>{
 const a=audio(),h={capT:0,caption(){this.capT=2.2;}},s={caption:(w,t)=>h.caption(w,t)},k={s,cleanups:[]};bindStage8Hud(h,k);a.api.setVoicePolicy(a.api.policy8);
 a.api.stage8Say('st8_story_01',s.caption);await settle();a.api.stage8Say('st8_rand_free_01',s.caption);
 assert.equal(h.capT,DUR8.st8_story_01+.3);a.end('st8_story_01');await settle();assert.equal(h.capT,DUR8.st8_rand_free_01+.3);
 for(const id of ['st8_mat_join_01','st8_rand_clear_01','st8_mat_handover_01']){a.api.stopSceneAudio();a.api.stage8Say(id,s.caption);await settle();assert.ok(h.capT>=DUR8[id]+.3);}
 for(const clean of k.cleanups.reverse())clean();s.caption('RILEY','shared');assert.equal(h.capT,2.2,'Stage 8 teardown restores the original caption path');
});
