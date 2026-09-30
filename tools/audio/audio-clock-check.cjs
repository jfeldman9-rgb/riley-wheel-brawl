'use strict';
// Deterministic scheduling/gain regression, NOT real browser decoding/listening.
// Delivered bytes are decoded separately by audit-voices.py. These tests model
// AudioParam ramps and source endings so short impacts cannot mask duck bugs.
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'../..'),audit=require('../../docs/review/audio-v11/voice-audit.json');
let now=0,nextId=1,fetches=[],sources=[],timers=new Map(),passed=0;
const check=(value,name)=>{assert.ok(value,name);passed++;console.log('PASS '+name);};
class Param {
 constructor(){this.initial=1;this.events=[];}
 get value(){let prior={t:0,value:this.initial};for(const e of this.events){if(e.t>now){if(e.kind==='linear')return prior.value+(e.value-prior.value)*(now-prior.t)/(e.t-prior.t);return prior.value;}prior=e;}return prior.value;}
 set value(value){this.initial=value;this.events=[];}
 add(kind,value,t){this.events.push({kind,value,t});this.events.sort((a,b)=>a.t-b.t);}
 setValueAtTime(v,t){this.add('set',v,t);}
 linearRampToValueAtTime(v,t){this.add('linear',v,t);}
 exponentialRampToValueAtTime(v,t){this.add('exponential',v,t);}
 cancelScheduledValues(t){this.events=this.events.filter(e=>e.t<t);}
}
class Node { connect(target){this.output=target;}disconnect(){this.output=null;} }
class Source extends Node {
 constructor(){super();this.frequency=new Param();this.detune=new Param();sources.push(this);}
 start(t=now){this.started=t;this.ends=this.loop?Infinity:t+(this.buffer?.duration||1000);this.active=true;}
 stop(t=now){this.ends=t;if(t<=now){this.active=false;this.onended?.();}}
}
class Context {
 constructor(){this.state='running';this.destination=new Node();this.sampleRate=24000;}
 get currentTime(){return now;}resume(){this.state='running';return Promise.resolve();}
 createGain(){return Object.assign(new Node(),{gain:new Param()});}
 createDynamicsCompressor(){return Object.assign(new Node(),Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,new Param()])));}
 createBufferSource(){return new Source();}createOscillator(){return new Source();}
 createBiquadFilter(){return Object.assign(new Node(),{frequency:new Param(),Q:new Param()});}
 createBuffer(ch,len,sr){return {duration:len/sr,getChannelData:()=>new Float32Array(len)};}
 decodeAudioData(data,success){success(data);return Promise.resolve(data);}
}
const env={RWB:{},console,Math,Number,Promise,AudioContext:Context,setInterval:()=>nextId++,clearInterval(){},
 setTimeout(fn,ms){const id=nextId++;timers.set(id,{at:now+ms/1000,fn});return id;},clearTimeout(id){timers.delete(id);},
 fetch:async url=>{fetches.push(url);const line=audit.lines.find(l=>url.includes(l.file));return {ok:true,arrayBuffer:async()=>({duration:line?.duration_s||160})};}};
env.window=env;vm.createContext(env);vm.runInContext(fs.readFileSync(path.join(root,'js/audio.js'),'utf8'),env);
const A=env.RWB.audio;
async function flush(){for(let i=0;i<12;i++)await Promise.resolve();}
function advance(seconds){const target=now+seconds;while(true){let event=null;for(const s of sources)if(s.active&&s.ends<=target&&(!event||s.ends<event.at))event={at:s.ends,fn:()=>{s.active=false;s.onended?.();}};for(const [id,t]of timers)if(t.at<=target&&(!event||t.at<event.at))event={at:t.at,fn:()=>{timers.delete(id);t.fn();}};if(!event)break;now=event.at;event.fn();}now=target;}
(async()=>{
 A.defineTrack('main',{urls:['music.ogg'],loopStart:31.103,loopEnd:159.103});A.aliasTrack(['title','stage1','stage2'],'main');A.playMusic('title');A.unlock();advance(2);await flush();
 check(fetches.length===0&&!A.playing,'No music fetch or playback before the visible-frame gate');
 check(!A.markFirstVisibleFrame('old-scene'),'Stale scene marker is ignored');
 A.markFirstVisibleFrame('title');await flush();check(A.track.playing&&fetches.length===1,'Visible frame enables music work once');
 const firstTrack=sources.find(s=>s.loop&&s.active);A.playMusic('stage1');check(A.track.playing&&firstTrack.active&&!A.mix.musicFrameReady,'Shared music remains continuous across scenes');
 A.markFirstVisibleFrame('stage1');check(sources.filter(s=>s.loop&&s.active).length===1,'Visible next scene never duplicates the playing music source');
 A.stopMusic();A.playMusic('stage2');check(!A.playing,'Stopped music cannot restart until the new scene paints');A.markFirstVisibleFrame('stage2');await flush();check(A.playing&&fetches.length===1,'Next visible scene reuses decoded music');
 for(const id of ['st1_narrator_01','riley_super_01','riley_fire_01'])await A.loadClip(id,'assets/audio/voice/'+id+'.mp3');
 A.playClip('st1_narrator_01',{voice:true});advance(.15);check(Math.abs(A.mix.speechDuck-.42)<1e-8,'Speech ramps to 42% music gain');
 A.sfx.impact();advance(.9);check(A.voicePlaying==='st1_narrator_01'&&Math.abs(A.mix.speechDuck-.42)<1e-8&&A.mix.effectsDuck===1,'Impact release cannot cancel a longer spoken sentence duck');
 A.playClip('riley_super_01',{voice:true});const entries=A.trace.filter(t=>/^clip/.test(t.name));check(entries.findIndex(t=>t.name==='clip-stop:st1_narrator_01')<entries.findIndex(t=>t.name==='clip:riley_super_01'),'Old voice is stopped before its replacement starts');
 advance(3);check(!A.voicePlaying&&A.mix.speechDuck===1,'Decoded voice ending plus release restores music');
 A.trace.length=0;A.queueVoice('riley_super_01','assets/audio/voice/riley_super_01.mp3');A.queueVoice('riley_fire_01','assets/audio/voice/riley_fire_01.mp3');advance(5);const starts=A.trace.filter(t=>t.name.startsWith('clip:'));
 check(starts.length===2&&starts[1].t>=starts[0].t+starts[0].duration-1e-8&&!A.trace.some(t=>t.name.startsWith('clip-stop:')),'Protected queue plays full source durations without overlap');
 A.playClip('st1_narrator_01',{voice:true});advance(.1);A.clearVoices();advance(.2);check(!A.voicePending&&A.mix.speechDuck===1,'Explicit scene skip releases the speech envelope');
 A.defineClipGain('riley_fire_01',Math.pow(10,.3/20));A.playClip('riley_fire_01',{voice:true,vol:0});const last=sources.at(-1);check(last.output.gain.value===0,'Explicit zero clip volume stays zero after loudness calibration');
 check(Math.abs(20*Math.log10(A.clipGain('riley_fire_01'))-.3)<1e-8,'Per-clip measured loudness trim is preserved');
 console.log(passed+' modeled audio scheduling/mix checks passed. Real Chromium decode/playback remains a separate gate.');
})().catch(error=>{console.error(error);process.exitCode=1;});
