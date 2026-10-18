import {q,LANE_TOP,LANE_BOT} from './config.js';
import {band8,bandY8} from './stage8-allies.js';
import {canCall8} from './mat-call.js';
import {call8Context} from './stage8-lifecycle.js';
export function stage8Bot(bot){
 const s=bot.s,r=s.riley,k=s.kit;if(s.stageNo!==8||!k)return false;
 const go=(x,y,run=false)=>{s.inp.demo={x,y,run};return true;};
 const press=(key,gap=.25)=>{const name='s8_'+key;if(bot.t>=(bot[name]||0)){s.inp.press(key);bot[name]=bot.t+gap;return true;}return false;};
 if(k.clash){press('special',.25);return go(0,0);}
 if(k.outro)return go(k.walk?1:0,0,false);
 if(r.state==='grabbed'){s.inp.press('attack');s.inp.press('jump');return go(0,0);}
 if(!r.alive||['down','getup'].includes(r.state))return go(0,0);
 if(bot.lag&&bot.t<(bot.s8Perceive||0))return true;bot.s8Perceive=bot.t+(bot.lag||0)/1000;
 const dyTo=y=>Math.abs(y-r.y)>5?Math.sign(y-r.y):0;
 const escape=y=>{const lane=band8(y),safe=lane===0?1:lane===2?1:r.y<y?0:2;return go(0,dyTo(bandY8(safe)),true);};
 const v=k.volley.active;if(v){const y=bandY8(v.safe);if(band8(r.y)!==v.safe||Math.abs(y-r.y)>8)return go(0,dyTo(y),true);if(v.phase!=='tell')return go(0,0);}
 const b=s.boss;
 if(b?.alive&&['grab_tell','lunge'].includes(b.state)&&Math.abs(r.y-b.grabY)<42)return escape(b.grabY);
 const whip=k.circle.whip;if(whip&&band8(r.y)===whip.band)return escape(bandY8(whip.band));
 const burst=k.bursts.find(b=>Math.abs(r.x-b.x)<95&&Math.abs(r.y-b.y)<36);if(burst)return escape(burst.y);
 const star=k.arena.stars.find(b=>Math.abs(r.x-b.x)<100&&Math.abs(r.y-b.y)<40);if(star)return go(r.x<=star.x?-1:1,dyTo(bandY8((band8(star.y)+1)%3)),true);
 const great=k.arena.tells.find(t=>t.kind==='great');if(great&&k.linked&&r.saidin>=28&&!r.busy){const side=great.dir===1?-1:1;if(r.facing!==side)return go(side,0);if(band8(r.y)===great.band){press('special',.7);return go(0,0);}}
 const incoming=k.arena.balls.find(a=>Math.abs(a.x-r.x)<260&&Math.abs(a.y-r.y)<32);if(incoming)return escape(incoming.y);
 const bands=k.arena.tells.map(t=>t.band);if(bands.includes(band8(r.y))){const safe=[0,1,2].find(i=>!bands.includes(i));if(safe!==undefined)return go(0,dyTo(bandY8(safe)),true);}
 const arrow=k.arrows.find(a=>(r.x-a.x)*a.dir>=0&&Math.abs(r.x-a.x)<190&&Math.abs(r.y-a.y)<30);if(arrow)return escape(arrow.y);
 const danger=s.enemies.find(e=>e.alive&&!e.entering&&!e.T?.boss&&['attack','lunge'].includes(e.state)&&Math.abs(e.y-r.y)<36&&Math.abs(e.x-r.x)<(e.type==='dancer'?360:500));if(danger)return escape(danger.aimY||danger.y);
 if(q.get('call8')==='1'&&!r.busy&&canCall8(k.call,call8Context(k))){press('assist',1);return go(0,0);}
 const gifts=s.pickups.filter(p=>p.x>s.bounds.l+45&&p.x<s.bounds.r-45&&Math.abs(p.x-r.x)<450&&(p.kind==='heal'&&r.hp<80||p.kind==='saidin'&&r.saidin<70||p.kind==='ribbon'||p.power));
 if(gifts.length&&!r.busy){const p=gifts[0];return go(Math.abs(p.x-r.x)>12?Math.sign(p.x-r.x):0,dyTo(p.y),true);}
 const live=s.enemies.filter(e=>e.alive&&!e.entering&&e.canBeHit!==false&&!e.isCopy);
 if(!live.length)return go(k.circle.active?Math.sign(3360-r.x):1,0,!s.locked);
 live.sort((a,b)=>(a.anchor?-1:0)-(b.anchor?-1:0)||Math.abs(a.x-r.x)-Math.abs(b.x-r.x));const e=live[0],dx=e.x-r.x,dy=e.y-r.y,side=Math.sign(dx)||1;
 if(e.T?.boss&&r.saidin>=100&&!r.busy&&Math.abs(dx)<700){if(r.facing!==side)return go(side,0);press('power',4);return go(0,0);}
 if(e.buckler&&r.saidin>=s.powers.castCost()&&!r.busy&&Math.abs(dx)>160&&Math.abs(dx)<450&&Math.abs(dy)<30){if(r.facing!==side)return go(side,0);press('special',.8);return go(0,0);}
 if(Math.abs(dx)>135)return go(side,Math.abs(dy)>22?Math.sign(dy):0,true);
 if(Math.abs(dy)>30)return go(0,Math.sign(dy));
 if(r.facing!==side)return go(side,0);
 // Stay at the outer edge of melee depth, inside Riley's reach but clear of bolts.
 const goal=e.y+(e.y>631?-30:30),offset=Math.abs(r.y-goal)>5?Math.sign(goal-r.y):0;
 press('attack',.14);return go(0,offset);
}
