// Main-campaign autopilot; uses the same actions as the player.
export function stage8Bot(bot){
 const s=bot.s,r=s.riley;if(s.stageNo!==8||!s.kit)return false;
 const go=(x,y,run=false)=>{s.inp.demo={x,y,run};return true;};
 if(r.state==='grabbed'){s.inp.press('attack');s.inp.press('jump');return go(0,0);}
 const live=s.enemies.filter(e=>e.alive&&!e.entering&&e.canBeHit!==false);
 if(!live.length)return go(1,0,true);
 live.sort((a,b)=>Math.abs(a.x-r.x)-Math.abs(b.x-r.x));const e=live[0],dx=e.x-r.x,dy=e.y-r.y;
 if(Math.abs(dx)>135)return go(Math.sign(dx),Math.abs(dy)>18?Math.sign(dy):0,true);
 if(Math.abs(dy)>26)return go(0,Math.sign(dy));
 if(r.facing!==Math.sign(dx))return go(Math.sign(dx),0);
 if(bot.t>=(bot.next||0)){s.inp.press('attack');bot.next=bot.t+.14;}
 return go(0,0);
}
