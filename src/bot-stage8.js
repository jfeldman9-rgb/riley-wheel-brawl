import {q,LANE_TOP,LANE_BOT} from './config.js';
import {band8,bandY8} from './stage8-allies.js';
import {canCall8} from './mat-call.js';
import {call8Context} from './stage8-lifecycle.js';
export function perceive8(bot){
 const s=bot.s,k=s.kit,copy=x=>x?{...x}:null;
 const row={t:bot.t,enemies:s.enemies.map(e=>({...e,canBeHit:e.canBeHit})),boss:s.boss?{...s.boss,canBeHit:s.boss.canBeHit}:null,volley:copy(k.volley.active),whip:copy(k.circle.whip),bursts:k.bursts.map(copy),arrows:k.arrows.map(copy),tells:k.arena.tells.map(copy),balls:k.arena.balls.map(copy),stars:k.arena.stars.map(copy)};
 if(!bot.lag)return row;
 const history=bot.s8History||(bot.s8History=[]);history.push(row);const cutoff=bot.t-bot.lag/1000;
 while(history.length>1&&history[1].t<=cutoff)history.shift();
 return history[0].t<=cutoff?history[0]:{enemies:[],bursts:[],arrows:[],tells:[],balls:[],stars:[]};
}
export function stage8Bot(bot){
 const s=bot.s,r=s.riley,k=s.kit;if(s.stageNo!==8||!k)return false;
 const go=(x,y,run=false)=>{s.inp.demo={x,y,run};return true;};
 const press=(key,gap=.25)=>{const name='s8_'+key;if(bot.t>=(bot[name]||0)){s.inp.press(key);bot[name]=bot.t+gap;return true;}return false;};
 if(k.clash){press('special',.25);return go(0,0);}
 if(k.outro)return go(k.walk?1:0,0,false);
 if(r.state==='grabbed'){s.inp.press('attack');s.inp.press('jump');return go(0,0);}
 if(!r.alive||['down','getup'].includes(r.state))return go(0,0);
 const obs=perceive8(bot);
 if(r.state==='air'&&r.z>80)press('attack',.2);
 const dyTo=y=>Math.abs(y-r.y)>5?Math.sign(y-r.y):0;
 const escape=(y,until=.9)=>{const lane=band8(y),safe=lane===0?2:lane===2?0:r.y<y?0:2;bot.s8Dodge={y:bandY8(safe),until:bot.t+until};return go(0,dyTo(bot.s8Dodge.y),true);};
 const v=obs.volley;if(v){const y=bandY8(v.safe);if(band8(r.y)!==v.safe||Math.abs(y-r.y)>8)return go(0,dyTo(y),true);if(v.phase!=='tell')return go(0,0);}
 if(bot.s8Dodge&&bot.t<bot.s8Dodge.until)return go(0,dyTo(bot.s8Dodge.y),true);
 const b=obs.boss;
 if(b?.alive&&['grab_tell','lunge'].includes(b.state)&&Math.abs(r.y-b.grabY)<42)return escape(b.grabY,1.4);
 const whip=obs.whip;if(whip&&band8(r.y)===whip.band)return escape(bandY8(whip.band));
 const burst=obs.bursts.find(b=>Math.abs(r.x-b.x)<95&&Math.abs(r.y-b.y)<36);if(burst)return escape(burst.y);
 const star=obs.stars.find(b=>Math.abs(r.x-b.x)<100&&Math.abs(r.y-b.y)<40);if(star)return go(r.x<=star.x?-1:1,dyTo(bandY8((band8(star.y)+1)%3)),true);
 const great=obs.tells.find(t=>t.kind==='great');if(great&&k.linked&&r.saidin>=28&&!r.busy){const side=great.dir===1?-1:1;if(r.facing!==side)return go(side,0);if(band8(r.y)===great.band){press('special',.7);return go(0,0);}}
 const incoming=obs.balls.find(a=>Math.abs(a.x-r.x)<260&&Math.abs(a.y-r.y)<32);if(incoming)return escape(incoming.y);
 const bands=obs.tells.map(t=>t.band);if(bands.includes(band8(r.y))){const safe=[0,1,2].find(i=>!bands.includes(i));if(safe!==undefined)return go(0,dyTo(bandY8(safe)),true);}
 const arrow=obs.arrows.find(a=>(r.x-a.x)*a.dir>=0&&Math.abs(r.x-a.x)<190&&Math.abs(r.y-a.y)<30);if(arrow)return escape(arrow.y);
 const danger=obs.enemies.find(e=>e.alive&&!e.entering&&!e.T?.boss&&['attack','lunge'].includes(e.state)&&Math.abs(e.y-r.y)<36&&Math.abs(e.x-r.x)<(e.type==='dancer'?360:500));if(danger){if(!r.busy)press('jump',.6);return escape(danger.aimY||danger.y,1.0);}
 if(q.get('call8')==='1'&&!r.busy&&canCall8(k.call,call8Context(k))){press('assist',1);return go(0,0);}
 const gifts=s.pickups.filter(p=>p.x>s.bounds.l+45&&p.x<s.bounds.r-45&&Math.abs(p.x-r.x)<450&&(p.kind==='heal'&&r.hp<80||p.kind==='saidin'&&r.saidin<70||p.kind==='ribbon'||p.power));
 if(gifts.length&&!r.busy){const p=gifts[0];return go(Math.abs(p.x-r.x)>12?Math.sign(p.x-r.x):0,dyTo(p.y),true);}
 if(!r.busy&&r.hp<75){const crate=(s.barrels||[]).find(p=>!p.broken&&p.x>s.bounds.l+40&&p.x<s.bounds.r-40&&Math.abs(p.x-r.x)<900);if(crate){const dx=crate.x-r.x,dy=crate.y-r.y,side=Math.sign(dx)||1;if(Math.abs(dx)>65||Math.abs(dy)>20)return go(Math.abs(dx)>65?side:0,dyTo(crate.y),true);if(r.facing!==side)return go(side,0);press('attack',.2);return go(0,0);}}
 if(b?.canBeHit&&r.saidin>=100&&!r.busy&&Math.abs(b.x-r.x)<740){const side=Math.sign(b.x-r.x)||1;if(r.facing!==side)return go(side,0);press('power',4);return go(0,0);}
 const live=obs.enemies.filter(e=>e.alive&&!e.entering&&e.canBeHit!==false&&!e.isCopy);
 if(!live.length)return go(k.circle.active?Math.sign(3360-r.x):1,0,!s.locked);
 live.sort((a,b)=>(a.anchor?-1:0)-(b.anchor?-1:0)||a.hp-b.hp||Math.abs(a.x-r.x)-Math.abs(b.x-r.x));const e=live[0],dx=e.x-r.x,dy=e.y-r.y,side=Math.sign(dx)||1;
 if(r.saidin>=100&&!r.busy&&Math.abs(dx)<700){if(r.facing!==side)return go(side,0);press('power',4);return go(0,0);}
 if(e.buckler&&r.saidin>=s.powers.castCost()&&!r.busy&&Math.abs(dx)>160&&Math.abs(dx)<450&&Math.abs(dy)<30){if(r.facing!==side)return go(side,0);press('special',.8);return go(0,0);}
 if(Math.abs(dx)>150)return go(side,Math.abs(dy)>22?Math.sign(dy):0,true);
 if(Math.abs(dy)>20)return go(0,Math.sign(dy));
 if(r.facing!==side)return go(side,0);
 // Stay at the outer edge of melee depth, inside Riley's reach but clear of bolts.
 if(e.T?.boss){if(!r.busy){press('jump',.2);return go(0,0);}if(r.state==='air'&&r.z>80)press('attack',.2);return go(0,0);}
 const goal=e.y+(e.y>631?-20:20),offset=Math.abs(r.y-goal)>5?Math.sign(goal-r.y):0;
 if(r.state==='run')return go(0,offset);press('attack',.14);return go(0,offset);
}
