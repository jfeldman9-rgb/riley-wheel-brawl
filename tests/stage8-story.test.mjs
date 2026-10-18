import './helpers/install-location.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {createStory8,BEATS8} from '../src/stage8-story.js';
import {LINES} from '../src/stage8-voice.js';
import {CLIPS8,FLOW_PRIORITY8} from '../src/stage8-video.js';
test('all 65 voice ids and exact finale lines are registered without recordings',()=>{
 assert.equal(Object.keys(LINES).length,65);
 assert.deepEqual(BEATS8.C8.ids.map(id=>LINES[id][1]),['I am the queen of love and beauty!','Not again! Not the snake people! Ahhhhhhh!','Bubby you saved me! But what took you so long?','Too many snack breaks.']);
 assert.ok(Object.values(CLIPS8).every(c=>!c.present));assert.equal(FLOW_PRIORITY8[0],'V5.3');
});
for(const path of ['missing','played','stalled','skipped'])test('all story beats finish once, release panels and preserve lines: '+path,()=>{
 const tasks=[],removed=[],said=[];const k={s:{bot:true,caption:(w,t)=>said.push(t),textures:{exists:()=>true,remove:k=>removed.push(k)}},later:(t,f)=>tasks.push(f)};
 const player=(s,key,done)=>{if(path==='missing')return false;tasks.push(()=>done(path,path!=='played'));return true;};
 const story=createStory8(k,player);let done=0;
 for(const name of Object.keys(BEATS8))story.play(name,()=>done++);
 for(let guard=0;tasks.length&&guard<500;guard++)tasks.shift()();
 assert.equal(done,Object.keys(BEATS8).length);assert.equal(story.active,null);
 for(const b of Object.values(BEATS8))for(const id of b.ids)assert.ok(story.heard.has(id),id);
 assert.ok(removed.includes('story8p1'));assert.equal(story.play('C8'),false);story.destroy();
});
