import test from 'node:test';import assert from 'node:assert/strict';
import {audio,settle} from './helpers/stage8-audio-harness.mjs';
const policy=()=>10;
test('N1: a pending load becomes non-busy after 3 audio seconds and a new line recovers',async()=>{
 const a=audio('running',['story_a']),caps=[];a.api.setVoicePolicy(policy);
 a.api.say('story_a');await settle();a.ctx.currentTime=3.01;
 assert.equal(a.api.voiceBusy('story_a'),false);assert.equal(a.api.voiceBusy(),false);
 a.api.say('story_b',w=>caps.push(w));await settle();assert.deepEqual(a.playing(),['story_b']);assert.deepEqual(caps,['B']);
});
test('N1: a hung load times out at 4 audio seconds and drains queued speech without another say',async()=>{
 const a=audio('running',['story_a']),caps=[];a.api.setVoicePolicy(policy);a.api.say('story_a');a.api.say('story_b',w=>caps.push(w));
 a.tick(0);await settle();assert.deepEqual(a.playing(),[],'wall timers alone cannot expire a frozen audio clock');
 a.tick(4.01);await settle();await settle();assert.deepEqual(a.playing(),['story_b']);assert.deepEqual(caps,['B']);
});
test('N1: with no policy a pending load has no timeout or stale-busy change',async()=>{
 const a=audio('running',['story_a']);a.api.say('story_a');a.tick(5);await settle();assert.equal(a.api.voiceBusy('story_a'),true);
 a.api.say('story_b');await settle();assert.deepEqual(a.playing(),['story_b']);
});

test('N2/N4: reactions expire at 1 s, supers at .35 s, stories at 10 s, barks at 2 s',async()=>{
 const a=audio();a.api.setVoicePolicy(a.api.policy8);
 for(const id of ['st8_taim_kill_01','st8_taim_kill_02','st8_taim_kill_03','st8_tt_mirror_01','st8_lanfear_clash_01','st8_lanfear_hurt_01','riley_st8_clash_01','st8_tt_clash_01','riley_st8_linkfire_01','st8_perrin_wolves_01'])assert.equal(a.api.policy8(id,'st8_story_01'),1,id);
 assert.equal(a.api.policy8('riley_super_01','st8_story_01'),.35);assert.equal(a.api.policy8('st8_mat_join_01','x'),10);assert.equal(a.api.policy8('riley_st8_wait_01','x'),2);
 a.api.say('st8_story_01');await settle();a.api.say('st8_tt_mirror_01');a.api.say('riley_super_01');a.ctx.currentTime=1.01;a.end('st8_story_01');await settle();assert.deepEqual(a.playing(),[]);
});
test('N2: a Taim volley interrupts shared and call barks but waits behind story',async()=>{
 for(const id of ['riley_super_01','riley_st8_wait_01','st8_mat_call_01']){
 const a=audio();a.api.setVoicePolicy(a.api.policy8);a.api.say(id);await settle();a.api.say('st8_taim_kill_02');await settle();assert.deepEqual(a.playing(),['st8_taim_kill_02']);}
 assert.equal(audio().api.policy8('st8_taim_kill_03','st8_mat_join_01'),1);
});
test('N4: reply is queued at press time and follows a delayed call within its 3 s window',async()=>{
 const a=audio(),caps=[];a.api.setVoicePolicy(a.api.policy8);a.api.say('st8_story_01');await settle();
 a.api.stage8CallPair('riley_st8_call_01','st8_mat_call_01',w=>caps.push(w));assert.equal(a.api.voiceBusy('st8_mat_call_01'),true);
 a.ctx.currentTime=.7;a.end('st8_story_01');await settle();assert.deepEqual(a.playing(),['riley_st8_call_01']);
 a.ctx.currentTime=2.76;a.end('riley_st8_call_01');await settle();assert.deepEqual(a.playing(),['st8_mat_call_01']);assert.deepEqual(caps,['RILEY','MAT']);
});
test('N4: an expired or failed call drops its dependent reply',async()=>{
 for(const failed of [false,true]){const a=audio();a.api.setVoicePolicy(a.api.policy8);
 a.api.say('st8_story_01');await settle();a.api.stage8CallPair(failed?'bad_a':'riley_st8_call_01','st8_mat_call_01');
 a.ctx.currentTime=failed?.1:2.1;a.end('st8_story_01');await settle();await settle();
 assert.deepEqual(a.playing(),[]);assert.equal(a.api.voiceBusy('st8_mat_call_01'),false);}
});
test('N5: the clash reply starts during a held clash after Riley finishes, without cutting him',async()=>{
 const a=audio();a.api.setVoicePolicy(a.api.policy8);a.api.stage8Say('riley_st8_clash_01');await settle();
 a.ctx.currentTime=.5;a.api.stage8Say('st8_tt_clash_01',null,true,{wait:2.5});
 a.ctx.currentTime=1.78;a.end('riley_st8_clash_01');await settle();assert.deepEqual(a.playing(),['st8_tt_clash_01']);assert.ok(a.sources.every(s=>!s.stopped));
});
