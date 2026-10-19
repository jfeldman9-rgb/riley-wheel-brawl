import {strikeRiley} from './stage6-hurt.js';
import {band8,bandY8} from './stage8-allies.js';
import {Sister} from './blackajah.js';
import {releaseHolds8} from './stage8-hooks.js';
import {syncArt8} from './stage8-residency.js';
import {demand8} from './stage8-load.js';
export const CIRCLE8=Object.freeze({sisters:6,anchors:3,anchorHits:3,anchorOpen:3,anchorHp:40,timeout:75,callandorWait:2,whipEvery:4.5,whipTell:1,whipDmg:8,addEvery:12});
export const PIPS8=Object.freeze(['z0','volley','z1','anchor1','anchor2','anchor3']);
export function crackPip8(k,beat){const i=PIPS8.indexOf(beat);if(i<0||k.pips.has(i))return false;k.pips.add(i);
 const text={z0:['LEWS THERIN','One knot. Feel how she tires? Again.'],volley:['RAND',"That's Taim. Hold on. Just… hold on."],z1:['LEWS THERIN','Three left, and they are not ours to untie. The boy must cut them.']}[beat];if(text)k.s.caption?.(...text);return true;}
export function createCircle8(k){const s=k.s;return {active:false,done:false,count:0,t:0,nextWhip:4.5,nextAdd:12,whip:null,phase:'idle',sisters:[],
 start(){if(this.active||this.done)return;this.active=true;this.phase='anchors';this.t=0;
  demand8(k,['s8sister','s8twink','s8dome','s8callfx','s8chest','s8weave','s6call','s6rand']);
  for(let i=0;i<6;i++){const e=new Sister(s,3480+Math.floor(i/3)*240,590+(i%3)*40);e.circleMember=true;e.ringX=e.x;e.ringY=e.y;e.anchor=i===0;e.hp=e.maxHp=40;this.sisters.push(e);s.enemies.push(e);}
  k.story.say('st8_sister_01');k.later(3,()=>k.story.say('st8_tt_circle_01'));k.later(6,()=>k.story.say('riley_st8_circle_01'));
 },
 broken(e){if(this.phase!=='anchors'||!e.anchor)return;e.anchor=false;this.count++;crackPip8(k,'anchor'+this.count);
  if(this.count>=3)this.prompt();else{const next=this.sisters.find(o=>o.alive&&!o.anchor);if(next){next.anchor=true;next.hp=40;next.bubble=true;next.bubbleHits=0;}}
 },
 prompt(){if(this.phase!=='anchors')return;this.phase='prompt';this.wait=0;k.story.say('st8_rand_callandor_01');k.hint('CALLANDOR — TAKE IT!');},
 step(dt){if(!this.active)return;this.t+=dt;
  if(this.phase==='anchors'){
   if(!k.volley.active&&this.t>=this.nextWhip){this.nextWhip=this.t+4.5;this.whip={band:band8(s.riley.y),t:0,counterUsed:false};k.hazardUntil=k.clock+2;}
   if(this.whip){this.whip.t+=dt;if(this.whip.t>=1&&!this.whip.counterUsed){this.whip.counterUsed=true;if(band8(s.riley.y)===this.whip.band&&s.riley.z<70)strikeRiley(s,8,{source:'circle.whip',fromX:3620});}if(this.whip.t>=1.4)this.whip=null;}
   if(this.t>=this.nextAdd){this.nextAdd=this.t+12;if(s.zone&&!s.enemies.some(e=>e.alive&&!e.circleMember))s.spawn('dancer','L');}
   s.riley.x=Math.min(s.riley.x,3570);if(this.t>=75){while(this.count<3){this.count++;crackPip8(k,'anchor'+this.count);}this.prompt();}}
  if(this.phase==='prompt'){this.wait+=dt;if(this.wait>=2||Math.abs(s.riley.x-3360)<70)this.breakCircle();}
 },
 breakCircle(){if(this.phase!=='prompt')return;this.phase='break';releaseHolds8(s);k.yieldAdds();k.clearHazards();k.scripted=true;k.graceUntil=Infinity;
  for(const e of this.sisters){e.anchor=false;if(e.alive){e.assistKill=true;e.yield();}}
  k.story.play('C4',()=>{this.phase='free';k.story.play('C5',()=>{
   if(!k.randFree){k.randFree=true;k.switchProvider?.();}
   this.phase='link';syncArt8(k);demand8(k,['s8duo','s8link','s8linkaura']);k.story.play('C6',()=>{k.link?.enable();k.linked=true;this.done=true;this.active=false;this.phase='done';syncArt8(k);k.scripted=false;k.graceUntil=k.clock+2;});
  });});
 },
 destroy(){releaseHolds8(s);this.active=false;this.sisters.length=0;}
};}
