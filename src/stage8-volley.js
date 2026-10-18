import {pick} from './config.js';
import {band8,bandY8} from './stage8-allies.js';
import {strikeRiley} from './stage6-hurt.js';
import {demand8} from './stage8-load.js';
export const VOLLEY8=Object.freeze({every:60,first:6,tell:3,earthSpeed:1100,earthWidth:140,earthClear:70,earthDmg:10,fireLag:.4,fireBurn:1.6,fireFade:.4,fireTick:.4,fireDmg:4,fireTicksMax:3,capPerVolley:14,enemyEarth:25,enemyFire:10,postponeMax:4,bands:2,inBoss:true});
export function safeLane8(lane,history=[],blocked=[]){const choices=[0,1,2].filter(i=>Math.abs(i-lane)<=1&&!blocked.includes(i)&&!(history.length>=2&&history[history.length-1]===i&&history[history.length-2]===i));return choices.length?pick(choices):null;}
export function volleyBlocked8(k){const s=k.s,r=s.riley,b=s.boss;return !!(!r?.alive||r.grabbedBy||r.held||['grabbed','down','getup','held'].includes(r.state)||s.paused||s.cutscene||k.strike||k.call?.on||k.clash||k.story.active||b?.beat||k.clock<(k.hazardUntil||0));}
export function volleyDamage8(kind,z,shield,used=0){if(kind==='earth'&&z>=70||kind==='fire'&&(z>0||shield))return 0;return Math.max(0,Math.min(kind==='earth'?10:4,14-used));}
export function hazardHuman8(e,damage){if(!e?.alive)return false;if(e.bubble){e.popGuard?.();return true;}if(e.T?.boss){e.takeHit?.({dmg:damage,kind:'hazard'});return true;}e.assistKill=true;e.T={...e.T,score:e.hazardScore?e.T.score:Math.floor((e.T?.score||0)/2)};e.hazardScore=true;e.hp=Math.max(1,e.hp-damage);e.assistDown=.8;e.setState?.('down');if(e.hp===1)e.yield?.();return true;}
export function createVolley8(k){const s=k.s;return {
 active:null,clock:0,next:Infinity,history:[],count:0,skips:0,wait:0,armed:false,
 arm(){if(this.armed)return;this.armed=true;this.next=this.clock+VOLLEY8.first;demand8(k,['s8earth','s8fire','s8tell','s8banner']);},
 start(){const occupied=(k.arena?.tells||[]).map(t=>t.band);const safe=safeLane8(band8(s.riley.y),this.history,occupied);if(safe===null)return false;
  this.history.push(safe);this.count++;this.wait=0;this.active={safe,t:0,phase:'tell',damage:0,earthUsed:false,fireTicks:0,lastFire:-1,hits:new Map(),dir:s.zoneI%2?-1:1,origin:(s.camX||0)+(s.zoneI%2?1400:-120)};
  if(s.boss?.alive){s.boss.volleyHold=true;s.boss.setState?.('shield');k.arena?.clear();}
  k.arrows.length=0;k.bursts.length=0;k.allies.volley=this.active;
  k.sayVolley?.(this.count);k.hint("ASHA'MAN, KILL! — FIND THE CLEAR LANE");return true;
 },
 step(dt){if(!VOLLEY8.inBoss&&s.zoneI===3)return;this.clock+=dt;
  if(!this.active){if(this.clock<this.next)return;if(volleyBlocked8(k)||!this.start()){this.wait+=dt;if(this.wait>=4){this.skips++;this.wait=0;this.next=this.clock+60;}return;}this.next=this.clock+60;}
  const a=this.active;a.t+=dt;const earth=a.t-3;a.phase=a.t<3?'tell':a.t<5?'strike':'fade';a.x=a.origin+a.dir*Math.max(0,earth)*1100;
  const r=s.riley,doomed=band8(r.y)!==a.safe;
  if(earth>=0&&doomed&&!a.earthUsed&&Math.abs(r.x-a.x)<140){a.earthUsed=true;const dmg=volleyDamage8('earth',r.z,false,a.damage);if(dmg&&strikeRiley(s,dmg,{source:'volley.earth',fromX:a.x,down:true})){a.damage+=dmg;}}
  const since=earth-Math.abs(r.x-a.origin)/1100-.4;
  if(doomed&&since>=0&&since<1.6&&a.fireTicks<3&&a.t-a.lastFire>=.4){a.fireTicks++;a.lastFire=a.t;const dmg=volleyDamage8('fire',r.z,s.powers?.active?.('fireshield'),a.damage);if(dmg&&strikeRiley(s,dmg,{source:'volley.fire',fromX:a.x})){a.damage+=dmg;}}
  for(const e of s.enemies||[]){if(!e.alive||band8(e.y)===a.safe||e.T?.boss&&e.volleyHold)continue;let h=a.hits.get(e);if(!h){h={earth:false,fire:0,last:-1};a.hits.set(e,h);}
   if(earth>=0&&!h.earth&&Math.abs(e.x-a.x)<140){h.earth=true;hazardHuman8(e,25);}
   const es=earth-Math.abs(e.x-a.origin)/1100-.4;if(es>=0&&es<1.6&&h.fire<3&&a.t-h.last>=.4){h.fire++;h.last=a.t;hazardHuman8(e,10);}
  }
  // The far edge's fire also finishes before the boss resumes.
  if(a.t>=6.7){if(!a.damage){r.score+=200;k.hint('CLEAN DODGE +200');}this.active=null;k.allies.volley=null;if(s.boss){s.boss.volleyHold=false;s.boss.cool=Math.max(1,s.boss.cool||0);s.boss.setState?.('idle');}k.onVolleyEnd?.(this.count,a);}
 },
 clear(){this.active=null;k.allies.volley=null;if(s.boss)s.boss.volleyHold=false;}
};}
