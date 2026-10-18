import {LANE_TOP,pick,clamp} from './config.js';
import {VOLLEY_BANDS} from './stages.js';
import {demand8} from './stage8-load.js';
export const band8=y=>clamp(Math.floor((y-LANE_TOP)/(118/3)),0,2);
export const bandY8=i=>(VOLLEY_BANDS[i][0]+VOLLEY_BANDS[i][1])/2;
export function allyVisible8(r,x,quality){return quality<2&&Math.abs(r.x-x)>=220;}
export function wolfHit8(e,centre){if(!e?.alive||e.T?.boss)return false;e.assistKill=true;e.hp=Math.max(1,e.hp-15);e.assistDown=1.6;e.x+=Math.sign(centre-e.x)*120;e.setState?.('down');if(e.hp===1)e.yield?.();return true;}
export function createAllies8(k){const s=k.s;return {
 wolf:null,charges:new Set(),vignettes:[],volley:null,
 enter(zone){if(zone<0)return;demand8(k,['s8allies','s8ashaman','s8taim','s8perrin',...(zone>=1?['s8loial']:[])]);
  this.vignettes=zone<3?[{key:'s8perrin',x:s.zones[zone].l+150,y:LANE_TOP+6},{key:zone?'s8loial':'s8allies',x:s.zones[zone].r-100,y:LANE_TOP+6}]:[];
  if(zone===0)k.story.play('C2',null,true);if(zone===1)k.story.say('st8_loial_01');
 },
 charge(id){if(this.charges.has(id))return false;this.charges.add(id);const lane=pick([0,1,2].filter(i=>i!==band8(s.riley.y)));this.wolf={lane,t:0,x:(s.camX||0)-140,hits:new Set()};demand8(k,['s8wolfpack','s8wolflead']);k.story.say('st8_perrin_wolves_01');return true;},
 step(dt){const w=this.wolf;if(w){w.t+=dt;if(w.t>=1.2){w.x+=700*dt;
  for(const e of s.enemies||[])if(!w.hits.has(e)&&band8(e.y)===w.lane&&Math.abs(e.x-w.x)<100){w.hits.add(e);wolfHit8(e,(s.bounds.l+s.bounds.r)/2);}
  if(band8(s.riley.y)===w.lane&&Math.abs(s.riley.x-w.x)<55)s.riley.x=clamp(s.riley.x+40*dt,s.bounds.l+40,s.bounds.r-40);
  if(w.x>(s.camX||0)+1500){this.wolf=null;for(const key of ['s8wolfpack','s8wolflead'])s.textures?.remove?.(key);}
 }}
  for(const a of this.vignettes){const desired=s.riley.x<(s.bounds.l+s.bounds.r)/2?s.bounds.r+80:s.bounds.l-80;a.alpha=allyVisible8(s.riley,a.x,k.quality)?Math.min(1,Math.max(0,(Math.abs(a.x-s.riley.x)-220)/160)):0;if(Math.abs(a.x-s.riley.x)<380)a.x+=Math.sign(desired-a.x)*100*dt;
   a.y=this.volley?.phase==='tell'?bandY8(this.volley.safe):LANE_TOP+6;a.down=!!this.volley&&this.volley.phase!=='tell'&&band8(a.y)!==this.volley.safe;
  }
 },
 destroy(){this.wolf=null;this.vignettes.length=0;}
};}
