import test from 'node:test';
import assert from 'node:assert/strict';
import {stage7Simulation,withSeed,FULL_STAGE_SEEDS} from './helpers/stage7-harness.mjs';
function run(seed,calls=false,lag=0){
  const h=stage7Simulation({calls,lag}),s=h.s;let stormDeaths=0,z1Deaths=0,lives=s.riley.lives;
  try{for(let frame=0;frame<60*420&&!s.ended&&!s.gameOver;frame++){
    h.step();if(s.riley.lives<lives&&s.zoneI===1){z1Deaths++;if(s.kit.storm.phase==='gust')stormDeaths++;}lives=s.riley.lives;
    if(frame%10===0){assert.ok([s.riley.x,s.riley.y,s.riley.hp].every(Number.isFinite));assert.ok(s.enemies.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)));assert.ok(s.attackTokens()<=2);assert.ok(h.resources().lights<=10);}
  }
  assert.equal(s.gameOver,false,JSON.stringify({seed,calls,lag,...h.summary()}));assert.equal(s.ended,true,JSON.stringify({seed,calls,lag,...h.summary()}));
  return {seed,calls:s.kit.call.calls,boss:s.kit.bossTime,seconds:s.kit.clock,stormDeaths,z1Deaths};
  }finally{h.destroy();}
}
test('Rhuidean clears all nine seeds, assist fairness, and 250 ms actor/hazard lag',()=>{
  const base=FULL_STAGE_SEEDS.map(seed=>withSeed(seed,()=>run(seed)));
  const assisted=FULL_STAGE_SEEDS.map((seed,i)=>withSeed(seed,()=>{const row=run(seed,true),ratio=row.boss/base[i].boss;assert.equal(row.calls,1);assert.ok(ratio>=.7&&ratio<=1.02,JSON.stringify({seed,ratio}));return {...row,ratio};}));
  const lag=[],fail=[];for(const seed of FULL_STAGE_SEEDS)withSeed(seed,()=>{try{lag.push(run(seed,false,.25));}catch(e){fail.push({seed,error:e.message});}});assert.ok(lag.length>=8,JSON.stringify(fail));
  const deaths=base.reduce((n,r)=>n+r.z1Deaths,0),storm=base.reduce((n,r)=>n+r.stormDeaths,0);assert.ok(!deaths||storm/deaths<=.3,JSON.stringify({deaths,storm,base}));
  console.log(JSON.stringify({base,assisted,lag,fail}));
});
