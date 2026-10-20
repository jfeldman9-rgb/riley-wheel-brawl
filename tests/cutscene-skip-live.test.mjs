import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {playStage8Video} from '../src/stage8-video.js';
import {playSceneVideo} from '../src/cutscene-scene.js';
import {createStory8,BEATS8} from '../src/stage8-story.js';
import {CutscenePlayer} from '../src/cutscene.js';
function fake(){const p={active:false,log:[],run:null,video:{currentTime:0,addEventListener(){},removeEventListener(){}},root:null,
 play(ids,o){p.active=true;p.ids=ids;p.o=o;return {skip:(why)=>{p.log.push(`${ids[0]}:skipped`,'finish:skip');p.active=false;o.done('skip');},next(){},abort(){p.active=false;}};}};return p;}
function scene(p){const root={document:{createElement:()=>({})},navigator:{},__rwbCutscenes:{player:p}};p.root=root;
 return {cutRoot:root,game:{isPaused:false,pause(){this.isPaused=true;},resume(){this.isPaused=false;}},events:{off(){},once(){}},setPauseReason(){},inp:{flushPresses(){},pollPad(){}}};}
const q=new URLSearchParams('');
test('Stage 8 video: Skip (attack/jump/start) ends the clip as a success, resumes the game, never replays the scene as panels',()=>{
 for(const a of ['attack','jump','start']){const p=fake(),s=scene(p);let res=null;
  assert.equal(playStage8Video(s,'intro',(how,failed)=>{res={how,failed};},q),true);
  s.cutscene.press(a);
  assert.deepEqual(res,{how:'skip',failed:false},a);assert.equal(s.cutscene,null);assert.equal(s.game.isPaused,false);}
});
test('Stage 8 story: a skipped clip marks all its lines heard and continues (no fallback deck)',()=>{
 for(const beat of ['C1','C3','C4','C6','C8','W']){const said=[],tasks=[];let doneCalls=0;
  const k={s:{caption:()=>{},textures:{exists:()=>true,remove(){}}},later:(t,f)=>tasks.push(f)};
  const story=createStory8(k,(s,key,done)=>{done('skip',false);return true;});
  story.play(beat,()=>doneCalls++);
  assert.equal(doneCalls,1,beat);assert.equal(tasks.length,0,beat+' no caption deck');
  for(const id of BEATS8[beat].ids)assert.ok(story.heard.has(id),beat+' '+id);}
});
test('event videos (twix, trex) also treat Skip as success',()=>{for(const key of ['twix','trex']){const p=fake(),s=scene(p);let res=null;
 assert.equal(playSceneVideo(s,key,(how,failed)=>{res={how,failed};},q),true);
 s.cutscene.press('attack');assert.deepEqual(res,{how:'skip',failed:false});assert.equal(s.cutscene,null);}
});
test('long clips (67 s intro) are not cut by the 30 s watchdog while playing',()=>{
 const p=new CutscenePlayer({setInterval(){},clearInterval(){},document:{}},{});const v={currentTime:40,duration:67,paused:false,ended:false};p.video=v;
 const r={ended:false,i:0,ids:['x'],lastTime:39.9,lastT:0,clipT0:0,started:true,padHeld:false,visibility(){},progress(){},ticks:0};
 let nexted=null;p.next=(rr,why)=>{nexted=why;};p.now=()=>35000;p.padDown=()=>false;r.lastT=34900;
 p.tick(r);assert.equal(nexted,null);
});
