import {hook8} from './stage8-hooks.js';
import {demand8} from './stage8-load.js';
import {stage8Say} from './stage8-voice.js';
export const LINK8=Object.freeze({cost:28,damage:1.3,meter:1.5,passive:2,spark:6,reach:260});
export function companionPose8(state){if(state==='walk')return 'skip';if(state==='run')return 'run';if(['air','squat'].includes(state))return 'hop';if(state==='combo3')return 'spark';if(['combo1','combo2','back','runkick'].includes(state))return 'cheer';if(state==='cast')return 'channel';if(state==='hurt')return 'brace';if(['down','getup'].includes(state))return 'kneel';if(state==='grabbed')return 'pull';return 'idle';}
export function createLink8(k){const s=k.s;return {enabled:false,sparked:false,companion:{targetable:false,team:null},
 enable(){if(this.enabled)return false;this.enabled=true;k.linked=true;demand8(k,['s8twink','s8duo','s8link','s8linkaura','twinkPortrait']);
  hook8(k,s.powers,'castCost',old=>function(){return k.linked?28:old.apply(this,arguments);});
  hook8(k,s,'spawnFireball',old=>function(r){const count=this.fireballs.length;const out=old.call(this,r);for(const f of this.fireballs.slice(count)){f.linked=true;f.dmg*=1.3;f.big=(f.big||1)*1.3;f.glow?.setTint?.(0xcfe6ff);}k.story.say('riley_st8_linkfire_01');return out;});
  hook8(k,s.riley,'landedHit',old=>function(dmg,noMeter){const before=this.saidin,out=old.call(this,dmg,noMeter);if(!noMeter)this.saidin=Math.min(100,before+(this.saidin-before)*1.5);return out;});
  hook8(k,s,'resolveAttack',old=>function(att,attack){const out=old.call(this,att,attack);if(att===this.riley&&att.state==='combo3'&&!k.link.sparked&&att.hitIds.size){k.link.sparked=true;const e=this.enemies.find(e=>e.canBeHit&&!att.hitIds.has(e.id)&&Math.abs(e.x-att.x)<260);if(e){e.takeHit({dmg:6,kind:'lightning'},att);k.link.spark={x:e.x,y:e.y,until:k.clock+.25};}}return out;});
  return true;
 },
 step(dt){if(!this.enabled)return;const r=s.riley;if(r.alive&&!s.ended&&!k.scripted){r.saidin=Math.min(100,r.saidin+2*dt);}if(r.state!=='combo3')this.sparked=false;Object.assign(this.companion,{x:r.x-r.facing*52,y:r.y-6,z:r.z,pose:companionPose8(r.state),facing:r.facing});}
};}
