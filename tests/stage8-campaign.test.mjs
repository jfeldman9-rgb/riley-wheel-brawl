import test from 'node:test';
import assert from 'node:assert/strict';
import {stage8Simulation,withSeed,FULL_STAGE_SEEDS} from './helpers/stage8-harness.mjs';
function run(seed,calls=false,lag=0){return withSeed(seed,()=>{
 const h=stage8Simulation({calls,lag}),s=h.s,k=s.kit;let frames=0,mat=0,boss=0,deaths=0,volleyDeaths=0,lives=s.riley.lives;
 try{
  for(;frames<60*900&&!s.ended&&!s.gameOver;frames++){
   if(k.matJoined&&!k.randFree&&!k.scripted)mat+=1/60;
   if(s.boss?.alive&&!s.boss.entering&&k.story.active!=='C7')boss+=1/60;
   const volley=!!k.volley.active;h.step();
   if(s.riley.lives<lives){deaths+=lives-s.riley.lives;if(volley)volleyDeaths+=lives-s.riley.lives;}lives=s.riley.lives;
   if(frames%10===0){assert.ok([s.riley.x,s.riley.y,s.riley.hp].every(Number.isFinite));assert.ok(s.attackTokens()<=2);assert.ok(h.resources().lights<=10);if(k.volley.active&&s.boss?.alive)assert.ok(s.boss.volleyHold);}
  }
  const clashes=k.clashLog||[];for(const c of clashes){assert.ok(c.won);assert.equal(c.presses,8);assert.ok(c.t<4,'presses, not the final auto-complete');}
  return {seed,calls,lag,clear:s.ended&&!s.gameOver,seconds:frames/60,mat,boss,deaths,volleyDeaths,clashes,callsUsed:k.stats.calls};
 }finally{h.destroy();}
});}
test('nine-seed production campaign, provider-era cohort fairness, and 250 ms delayed observations',()=>{
 const base=FULL_STAGE_SEEDS.map(seed=>run(seed));
 const assisted=FULL_STAGE_SEEDS.map(seed=>run(seed,true));
 const lag=FULL_STAGE_SEEDS.map(seed=>run(seed,false,250));
 const sum=(rows,key)=>rows.reduce((n,r)=>n+r[key],0);
 const fairness={mat:sum(assisted,'mat')/sum(base,'mat'),rand:sum(assisted,'boss')/sum(base,'boss')};
 const individual=assisted.map((r,i)=>({seed:r.seed,mat:r.mat/base[i].mat,rand:r.boss/base[i].boss}));
 console.log(JSON.stringify({base,assisted,lag,fairness,individual}));
 assert.equal(base.filter(r=>r.clear).length,9);assert.equal(assisted.filter(r=>r.clear).length,9);
 assert.ok(lag.filter(r=>r.clear).length>=8);
 for(const ratio of Object.values(fairness))assert.ok(ratio>=.70&&ratio<=1.02,JSON.stringify(fairness));
 assert.ok(!sum(base,'deaths')||sum(base,'volleyDeaths')/sum(base,'deaths')<=.25);
});
