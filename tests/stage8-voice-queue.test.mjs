import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import './helpers/install-location.mjs';
import {policy8,holdCutscene8,lineHold8,DUR8,LINES,WAIT8,LOAD_GRACE8,PAD8} from '../src/stage8-voice.js';
import {Cutscene,holdFor} from '../src/twix.js';
import {cutsceneWatchdog,watchdogFor} from '../src/guard.js';
import {createStory8,BEATS8} from '../src/stage8-story.js';
import {setVoicePolicy,voiceBusy} from '../src/audio.js';
const settle=()=>new Promise(r=>setImmediate(r));
// Production audio.js with a stub WebAudio graph: fetch+decode resolve on the next turn, sources end on finish().
function audio(state='running'){
 const src=readFileSync(new URL('../src/audio.js',import.meta.url),'utf8'),sources=[];let ctx;
 const node=()=>({connect(){},disconnect(){},gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},frequency:{},Q:{}});
 class AudioContext{constructor(){ctx=this;this.currentTime=0;this.state=state;this.destination={};}
  createGain(){return node();}createDynamicsCompressor(){return {...node(),threshold:{},knee:{},ratio:{},attack:{},release:{}};}
  createBufferSource(){const s={...node(),started:0,stopped:0,start(){this.started++;},stop(){this.stopped++;},end(){this.onended?.();}};sources.push(s);return s;}
  decodeAudioData(b,res){res({id:b.id,duration:2});}resume(){return Promise.resolve();}}
 const api=vm.runInNewContext(`${src.replace(/^export /gm,'')}\n({say,registerLines,setVoicePolicy,voiceBusy,stopSceneAudio,toggleMute,unlock})`,{
  window:{AudioContext},Audio:class{},document:{hidden:false},setTimeout(){},clearTimeout(){},
  fetch:url=>{const id=url.match(/([^/]+)\.mp3$/)[1];return Promise.resolve({ok:!id.startsWith('bad'),arrayBuffer:()=>Promise.resolve({id})});}});
 api.registerLines({story_a:['A','a'],story_b:['B','b'],story_c:['C','c'],bark_a:['R','r'],bad_a:['X','x']});
 api.unlock();
 const playing=()=>sources.filter(s=>s.buffer&&s.started&&!s.stopped&&!s.ended).map(s=>s.clipId);
 const end=id=>{const s=sources.find(s=>s.clipId===id&&s.started&&!s.ended);s.ended=true;s.end();};
 return {api,sources,playing,end,get ctx(){return ctx;}};
}
const story=id=>id.startsWith('story')||id.startsWith('bad')?10:id.startsWith('bark')?2:0;
test('Stage 8 policy: story lines wait long, shared barks briefly, supers expire quickly',()=>{
 assert.equal(policy8('st8_lews_01','st8_rand_box_01'),WAIT8.line);assert.equal(policy8('riley_st8_link_01','riley_combo_01'),WAIT8.line);
 assert.equal(policy8('riley_super_01','st8_story_01'),WAIT8.super);assert.equal(policy8('rand_call_01','riley_st8_call_02'),WAIT8.bark);
 assert.equal(policy8('st8_mat_call_01','riley_st8_call_01'),WAIT8.bark);
 for(const id of Object.keys(LINES))assert.ok(policy8(id,'st8_story_01')>0,id);
 setVoicePolicy(null);assert.equal(voiceBusy(),false);
});
test('audio queue: a queued line plays (and captions) only after the sounding one ends; nothing is cut',async()=>{
 const a=audio(),caps=[];a.api.setVoicePolicy(story);const cap=(w,t)=>caps.push(w);
 a.api.say('story_a',cap);await settle();assert.deepEqual(a.playing(),['story_a']);
 a.api.say('story_b',cap);a.api.say('bark_a',cap);a.api.say('story_a',cap);a.api.say('story_b',cap);await settle();
 assert.deepEqual(a.playing(),['story_a']);assert.deepEqual(caps,['A']);assert.equal(a.api.voiceBusy('story_b'),true);
 a.end('story_a');await settle();assert.deepEqual(a.playing(),['story_b']);assert.deepEqual(caps,['A','B']);
 a.end('story_b');await settle();assert.deepEqual(a.playing(),['bark_a']);a.end('bark_a');await settle();
 assert.equal(a.api.voiceBusy(),false);assert.ok(a.sources.every(s=>!s.stopped),'no line was stopped');
});
test('audio queue: stale lines are dropped, failed loads drain, stopSceneAudio and mute clear the queue',async()=>{
 const a=audio();a.api.setVoicePolicy(story);
 a.api.say('story_a');await settle();a.api.say('bark_a');a.api.say('story_b');a.ctx.currentTime=5;
 a.end('story_a');await settle();assert.deepEqual(a.playing(),['story_b'],'the bark waited past its 2 s and was dropped');
 a.ctx.currentTime=20;a.api.say('bad_a');a.api.say('story_c');a.end('story_b');await settle();await settle();
 assert.deepEqual(a.playing(),['story_c'],'a line whose file fails still lets the next one play');
 a.api.say('story_a');assert.equal(a.api.voiceBusy('story_a'),true);a.api.stopSceneAudio();assert.equal(a.api.voiceBusy(),false);
 a.end('story_c');await settle();assert.deepEqual(a.playing(),[]);
 a.api.say('story_a');await settle();a.api.say('story_b');a.api.toggleMute();a.api.toggleMute();assert.equal(a.api.voiceBusy(),false);
});
test('audio queue: without a policy (Stages 1-7) a new line still interrupts; a stopped clock is never busy',async()=>{
 const a=audio();a.api.say('story_a');await settle();a.api.say('story_b');await settle();
 assert.deepEqual(a.playing(),['story_b']);assert.ok(a.sources.find(s=>s.clipId==='story_a').stopped);
 const b=audio('suspended');b.api.setVoicePolicy(story);b.api.say('story_a');await settle();assert.equal(b.api.voiceBusy('story_a'),false);
});
test('every recording has a duration and the hold covers it plus a pad',()=>{
 const r=JSON.parse(readFileSync('tools/stage8/voice-render.json','utf8'));
 for(const l of r.lines){assert.ok(Math.abs(DUR8[l.id]-l.duration_s)<.01,l.id);assert.ok(lineHold8(l.id)>=l.duration_s+.3,l.id);}
 assert.equal(Object.keys(DUR8).length,Object.keys(LINES).length);
});
const opening=ids=>ids.map(id=>({id,who:LINES[id][0],text:LINES[id][1],panel:1,voice:lineHold8(id)}));
test('an opening panel holds while its line loads and sounds, even if pressed, then advances a pad after it ends',()=>{
 const lines=opening(['st8_story_01','st8_rand_box_01','st8_lews_01']),load=1.2;
 const said=[];let sounding=null,left=0;
 const cs=holdCutscene8(new Cutscene(lines,{onLine:l=>{said.push(l.id);sounding=l.id;left=DUR8[l.id]+load;}}),id=>id===sounding&&left>0);
 cs.begin();let t=0;const starts={};
 while(!cs.done&&t<60){const dt=1/60;t+=dt;left-=dt;if(!starts[cs.line?.id])starts[cs.line.id]=t;cs.press('attack');cs.update(dt);}
 assert.deepEqual(said,lines.map(l=>l.id));
 assert.ok(starts.st8_rand_box_01>=DUR8.st8_story_01+load+PAD8,`story_01 cut at ${starts.st8_rand_box_01}`);
 assert.ok(starts.st8_lews_01-starts.st8_rand_box_01>=DUR8.st8_rand_box_01+load+PAD8);
 const m=holdCutscene8(new Cutscene(lines,{}),()=>false).begin();let u=0;while(m.i===0){m.update(.01);u+=.01;}
 assert.ok(Math.abs(u-holdFor(lines[0]))<.05,'muted or silent play keeps the reading hold');
});
test('a panel whose line never ends moves on after its cap, and the watchdog waits out the same cap',()=>{
 const lines=opening(['st8_lews_02','st8_lews_03']);
 const cs=holdCutscene8(new Cutscene(lines,{}),()=>true).begin();let t=0;
 while(cs.i===0&&t<60){cs.update(.05);t+=.05;}
 assert.ok(t>=lines[0].voice+LOAD_GRACE8-.06&&t<=lines[0].voice+LOAD_GRACE8+PAD8+.2,`moved on at ${t}`);
 const w={},stage={cutscene:holdCutscene8(new Cutscene(lines,{}),()=>true).begin(),pauseReasons:new Set(['cutscene'])};
 cutsceneWatchdog(stage,0,w);assert.equal(cutsceneWatchdog(stage,(watchdogFor(lines[0])+.1)*1000,w),false,'holding: not yet');
 assert.equal(cutsceneWatchdog(stage,(watchdogFor(lines[0])+LOAD_GRACE8+PAD8+.1)*1000,w),true,'wall-clock cap still fires');
});
test('caption decks space each line by its own recording length',()=>{
 const tasks=[];const k={s:{caption(){},bot:{},music:null},later:(at,fn)=>tasks.push({at,fn})};
 const s8=createStory8(k,()=>false);s8.play('C7',()=>{},true);
 const ids=BEATS8.C7.ids;assert.equal(tasks.length,ids.length+1);
 for(let i=1;i<ids.length;i++)assert.ok(tasks[i].at-tasks[i-1].at>=DUR8[ids[i-1]]+.4,ids[i-1]);
});
