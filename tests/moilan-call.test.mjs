import test from 'node:test';
import assert from 'node:assert/strict';
import { CALL7,createCall7,pickHelper,noteRileyKo,tickCall7,canCall,takeCall,callEffect,allocateStrikes } from '../src/moilan-call.js';
test('helper priority, shared charge, both recharge gates, max calls and phase lock',()=>{
  for(const [ctx,want]of [[{boss:true,spawnOnScreen:8},'duo'],[{spawnOnScreen:3,humansOnScreen:2},'moiraine'],[{eliteOnScreen:true},'lan'],[{humansOnScreen:1},'lan'],[{},'moiraine']])assert.equal(pickHelper(ctx),want);
  const st=createCall7(),ctx={hittable:true,boss:true,bossPhase:1};assert.equal(takeCall(st,ctx).ok,true);st.on=false;
  for(let i=0;i<10;i++)noteRileyKo(st);tickCall7(st,44);assert.equal(st.charges,0);tickCall7(st,1);assert.equal(st.charges,1);assert.equal(canCall(st,ctx),false);
  for(const phase of [2,3]){ctx.bossPhase=phase;assert.equal(takeCall(st,ctx).ok,true);st.on=false;for(let i=0;i<10;i++)noteRileyKo(st);tickCall7(st,45);}
  assert.equal(st.calls,3);assert.equal(canCall(st,{hittable:true}),false);
  for(const reason of ['paused','cutscene','victory','dead','strike','balefire','bossInvuln','bossBeat']){const x=createCall7();assert.equal(takeCall(x,{hittable:true,[reason]:true}).ok,false);assert.equal(x.charges,1);}
});
test('humans are nonlethal, Lan yields only weakened humans, bounded Shadowspawn selection',()=>{
  for(const helper of ['moiraine','lan'])for(let hp=1;hp<=60;hp++){
    const e={type:'dancer',alive:true,hp,maxHp:60,canBeHit:true,yield(){this.yielded=true;this.alive=false;}};callEffect(e,helper);assert.ok(e.hp>0);assert.equal(!!e.yielded,helper==='lan'&&hp<12);
  }
  const crowd=Array.from({length:12},()=>({type:'grunt',y:630}));assert.equal(allocateStrikes(crowd,'moiraine',630).length,6);assert.equal(allocateStrikes(crowd,'lan',630).length,3);assert.equal(allocateStrikes(crowd,'lan',572).length,0);
  assert.equal(CALL7.bossFrac,.06);
});
