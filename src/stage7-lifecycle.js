import { stage4Delta } from './stage4-time.js';
import { freezeStrike, thawStrike } from './stage7-freeze.js';
import { eligibleTargets, helperContext, takeCall, callEffect, allocateStrikes, noteRileyKo, CALL7 } from './moilan-call.js';
import { stage7Say, sfx7 } from './stage7-voice.js';
import { demand7, HELPERS7 } from './stage7-load.js';
import { linkTrollocs } from './fadelt.js';
export function hook7(kit, object, key, wrap) {
  const original=object?.[key];if(typeof original!=='function')return;
  const own=Object.prototype.hasOwnProperty.call(object,key), replacement=wrap(original);object[key]=replacement;
  kit.cleanups.push(()=>{if(object[key]!==replacement)return;if(own)object[key]=original;else delete object[key];});
}
export function call7Context(k) {
  const s=k.s,b=s.boss,list=eligibleTargets(s.enemies,s.camX||0);
  return {...helperContext(list,s.zoneI===3),paused:!!s.paused,cutscene:!!s.cutscene,victory:!!(s.victoryPending||s.ended||s.gameOver),dead:s.riley?.alive===false,
    strike:!!k.strike,balefire:!!s.beam,hittable:s.zoneI===3?list.some(e=>e===b):list.length>0,bossInvuln:!!(b?.alive&&b.invuln),bossBeat:!!(b?.alive&&b.beat),bossPhase:b?.alive?b.phase:0};
}
export function releaseHolds7(s){s.riley?.grabbedBy?.releaseHold?.('break');for(const e of s.enemies||[])e.releaseHold?.('break');}
export function callMoilan(k) {
  const s=k.s;if(!s.started)return false;
  const spent=takeCall(k.call,call7Context(k));if(!spent.ok)return false;
  releaseHolds7(s); demand7(k,HELPERS7);
  const helper=spent.helper;
  stage7Say('riley_st7_call_0'+(helper==='moiraine'?1:helper==='lan'?2:3),s.caption);
  const list=eligibleTargets(s.enemies,s.camX||0);
  k.strike={helper,t:0,duration:helper==='moiraine'?1.6:helper==='lan'?.9:1.8,targets:allocateStrikes(list,helper,s.riley.y),resolved:false};
  freezeStrike(k);k.video?.play(helper);k.stats.calls++;
  return true;
}
export function endStrike7(k,grant=true) {
  if(!k.strike)return;
  if(grant&&k.s.riley)k.s.riley.inv=Math.max(k.s.riley.inv||0,CALL7.inv);
  k.call.on=false;k.strike=null;thawStrike(k);k.view?.sync(k);
}
export function stepStrike7(k,dt) {
  const st=k.strike;if(!st)return;st.t+=dt;
  if(!st.resolved&&st.t>=(st.helper==='lan'?.45:.65)){
    st.resolved=true;
    if(st.helper==='duo'){k.notes.clear();k.arena.clear();k.arrows.length=0;}
    for(const e of st.targets)callEffect(e,st.helper);
    sfx7(st.helper==='moiraine'?'earth':st.helper==='lan'?'slash':'shield');
    stage7Say(st.helper==='duo'?'st7_duo_call_01':st.helper==='lan'?'st7_lan_call_0'+(1+k.call.calls%2):'st7_moi_call_0'+(1+k.call.calls%2),k.s.caption);
  }
  k.view?.sync(k);
  if(st.t>=st.duration&&!k.video?.active)endStrike7(k);
}
function silhouette(e) {
  e.silhouette=.6;
  let p=e,desc;while(p&&!desc){desc=Object.getOwnPropertyDescriptor(p,'canBeHit');p=Object.getPrototypeOf(p);}
  const getter=desc?.get, value=desc?.value;
  Object.defineProperty(e,'canBeHit',{configurable:true,get(){return !(this.silhouette>0)&&(getter?getter.call(this):value!==false);}});
  const update=e.update;e.update=function(dt){if(this.silhouette>0)return;return update.call(this,dt);};
}
export function installStage7Hooks(k) {
  const s=k.s;
  hook7(k,s,'spawn',original=>function(type,side){
    const e=original.call(this,type,side);
    if(e?.type==='fadelt')linkTrollocs(e,this.enemies);
    if(e&&side==='T'){e.x=Math.min(this.bounds.r-90,Math.max(this.bounds.l+90,this.riley.x+200));e.z=200;e.vz=0;e.entering=false;}
    if(e&&k.storm.phase==='gust')silhouette(e);
    return e;
  });
  hook7(k,s,'callLoial',()=>()=>callMoilan(k));
  hook7(k,s,'onEnemyDie',original=>function(e){if(e&&!e.assistKill&&!e.T?.boss)noteRileyKo(k.call);return original.call(this,e);});
  hook7(k,s,'update',original=>function(time,delta){
    if(k.flushInp){k.flushInp=0;this.inp?.flushPresses?.();}
    if(!k.strike)return original.call(this,time,delta);
    if(this.paused||this.cutscene||!Number.isFinite(delta)||delta<=0)return;
    stepStrike7(k,stage4Delta(Math.min(delta,50)/1000));this.riley?.sync?.();for(const e of this.enemies||[])e.sync?.();
  });
  hook7(k,s,'rileyDied',original=>function(){k.video?.abort();endStrike7(k,false);k.call.on=false;releaseHolds7(this);k.notes.clear();k.arena.clear();k.street.clear();k.arrows.length=0;return original.call(this);});
  hook7(k,s,'continueGame',original=>function(){k.video?.abort();endStrike7(k,false);releaseHolds7(this);return original.call(this);});
  // Any player attack (including a projectile/throw) can return a nearby gold note.
  hook7(k,s,'resolveAttack',original=>function(att,a){
    if(att===this.riley)for(const n of k.notes.notes)if(n.gold&&!n.counterUsed&&Math.abs(n.x-att.x)<90&&Math.abs(n.y-att.y)<34){n.counterUsed=true;this.boss?.takeHit({dmg:24,reflected:true});this.boss?.stagger(.8);k.stats.reflects++;}
    return original.call(this,att,a);
  });
}
export function restoreStage7Hooks(k) { releaseHolds7(k.s);k.video?.destroy();endStrike7(k,false);k.call.on=false;for(const f of k.cleanups.splice(0).reverse())f(); }
