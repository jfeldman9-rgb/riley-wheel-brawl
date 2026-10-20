import {pick,clamp} from './config.js';
import {band8,bandY8} from './stage8-allies.js';
import {strikeRiley} from './stage6-hurt.js';
export const FAN8=Object.freeze([[0,0,1],[1,1,2],[0,2,2]].map(Object.freeze));
export function createArena8(k){const s=k.s;return {tells:[],balls:[],stars:[],
 fan(b){if(k.outro)return;const bands=pick(FAN8);for(let i=0;i<3;i++)this.tells.push({kind:'small',band:bands[i],t:0,tell:.55+i*.15,x:b.x,dir:Math.sign(s.riley.x-b.x)||-1});k.hazardUntil=k.clock+2;},
 star(b){if(k.outro)return;this.stars=[0,1,2].map((_,i)=>({x:i===0?s.riley.x:clamp(s.riley.x+(i===1?-130:130),s.bounds.l+80,s.bounds.r-80),y:bandY8((band8(s.riley.y)+i)%3),t:0,counterUsed:false}));k.hazardUntil=k.clock+2;},
 great(b){if(k.outro)return;if(!this.greatHint){this.greatHint=true;k.hint('LINKED FIREBALL — MEET IT HEAD-ON');}this.tells.push({kind:'great',band:band8(s.riley.y),t:0,tell:1.6,x:b.x,dir:Math.sign(s.riley.x-b.x)||-1});k.hazardUntil=k.clock+3;},
 // Run before Stage1's projectile collision as well as the arena tick. Sweep
 // the next projectile step so a fast cast cannot skip the tell's catch window.
 interceptGreat(dt=0){if(k.clash||k.outro||!s.boss?.alive||s.boss.volleyHold||s.boss.beat)return false;
  for(const f of s.fireballs||[]){if(!f.linked)continue;const next=f.x+f.dir*680*dt;
   const meets=(x,y,r)=>Math.abs(f.gy-y)<40&&Math.min(f.x,next)<=x+r&&Math.max(f.x,next)>=x-r;
   if(this.tells.some(t=>t.kind==='great'&&!t.fired&&meets(t.x,bandY8(t.band),120))||this.balls.some(b=>b.kind==='great'&&!b.counterUsed&&meets(b.x,b.y,80))){
    f.x=(s.camX||0)-500;k.beginClash(false);return true;
   }
  }return false;
 },
 step(dt){if(k.outro||this.interceptGreat())return;if(s.boss?.volleyHold||s.boss?.beat||k.story.active==='C7')return;
  for(const tell of this.tells){tell.t+=dt;if(tell.t>=tell.tell&&!tell.fired){tell.fired=true;this.balls.push({kind:tell.kind,x:tell.x,y:bandY8(tell.band),dir:tell.dir,t:0,counterUsed:false});}}
  this.tells=this.tells.filter(t=>!t.fired);
  for(const b of this.balls){b.t+=dt;b.x+=b.dir*(b.kind==='great'?260:420)*dt;
   const f=(s.fireballs||[]).find(f=>f.linked&&Math.abs(f.x-b.x)<80&&Math.abs(f.gy-b.y)<40);
   if(f&&!b.counterUsed){b.counterUsed=true;f.x=(s.camX||0)-500;if(b.kind==='great')k.beginClash?.(false);else s.fx?.boom?.(b.x,b.y-100);}
   const r=s.riley;if(!b.counterUsed&&r.z<100&&Math.abs(r.x-b.x)<50&&Math.abs(r.y-b.y)<26){b.counterUsed=true;strikeRiley(s,b.kind==='great'?14:8,{source:'lanfear.'+b.kind,fromX:b.x,down:b.kind==='great'});}
  }
  this.balls=this.balls.filter(b=>!b.counterUsed&&b.t<6);
  for(const star of this.stars){star.t+=dt;if(star.t>=.9&&!star.counterUsed){star.counterUsed=true;const r=s.riley;if(r.z<80&&Math.abs(r.x-star.x)<70&&Math.abs(r.y-star.y)<30)strikeRiley(s,10,{source:'lanfear.star',fromX:star.x});for(const e of s.enemies||[])if(e.alive&&!e.T?.boss&&Math.abs(e.x-star.x)<70&&Math.abs(e.y-star.y)<30){e.assistKill=true;e.takeHit?.({dmg:10,kind:'hazard',down:true});}}}
  this.stars=this.stars.filter(t=>t.t<1.4);
 },
 clear(){this.tells.length=0;this.balls.length=0;this.stars.length=0;}
};}
