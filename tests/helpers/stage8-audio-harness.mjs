import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {DUR8} from '../../src/stage8-voice-durations.js';
import {VOICE_FILES} from '../../src/stage8-voice-files.js';
export const settle=()=>new Promise(r=>setImmediate(r));
export function audio(state='running',hung=[]){
 const timers=new Map();let timerId=0;
 const src=readFileSync(new URL('../../src/audio.js',import.meta.url),'utf8'),sources=[];let ctx;
 const node=()=>({connect(){},disconnect(){},gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},frequency:{},Q:{}});
 class AudioContext{constructor(){ctx=this;this.currentTime=0;this.state=state;this.destination={};}
  createGain(){return node();}createDynamicsCompressor(){return {...node(),threshold:{},knee:{},ratio:{},attack:{},release:{}};}
  createBufferSource(){const s={...node(),started:0,stopped:0,start(){this.started++;},stop(){this.stopped++;},end(){this.onended?.();}};sources.push(s);return s;}
  decodeAudioData(b,res){res({id:b.id,duration:2});}resume(){return Promise.resolve();}}
 const stage=readFileSync(new URL('../../src/stage8-voice.js',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export \{.*$/gm,'').replace(/^export /gm,'');
 const api=vm.runInNewContext(`${src.replace(/^export /gm,'')}\n${stage}\n({stage8Say,stage8CallPair,policy8,say,registerLines,setVoicePolicy,voiceBusy,stopSceneAudio,toggleMute,unlock})`,{
  DUR8,VOICE_FILES,window:{AudioContext},Audio:class{},document:{hidden:false},setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);},
  fetch:url=>{const id=url.match(/([^/]+)\.mp3$/)[1];if(hung.includes(id))return new Promise(()=>{});return Promise.resolve({ok:!id.startsWith('bad'),arrayBuffer:()=>Promise.resolve({id})});}});
 api.registerLines({story_a:['A','a'],story_b:['B','b'],story_c:['C','c'],bark_a:['R','r'],bad_a:['X','x']});
 api.unlock();
 const playing=()=>sources.filter(s=>s.buffer&&s.started&&!s.stopped&&!s.ended).map(s=>s.clipId);
 const end=id=>{const s=sources.find(s=>s.clipId===id&&s.started&&!s.ended);s.ended=true;s.end();};
 return {api,sources,playing,end,tick(t){ctx.currentTime=t;const due=[...timers.values()];timers.clear();for(const fn of due)fn();},get ctx(){return ctx;}};
}
