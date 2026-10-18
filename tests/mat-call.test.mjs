import './helpers/install-location.mjs';import test from 'node:test';import assert from 'node:assert/strict';
import {createCall8,tickCall8,noteRileyKo8,takeCall8,switchCall8,provider8,callEffect8} from '../src/mat-call.js';
const ctx={joined:true,hittable:true};
test('shared charge requires ten Riley KOs AND 45 seconds; C5 switches only once',()=>{
 const c=createCall8();assert.equal(provider8(false),'mat');assert.equal(provider8(true),'rand');assert.ok(takeCall8(c,ctx).ok);c.on=false;for(let i=0;i<10;i++)noteRileyKo8(c);tickCall8(c,44);assert.equal(c.charges,0);tickCall8(c,1);assert.equal(c.charges,1);assert.equal(switchCall8(c,'C4'),false);assert.equal(switchCall8(c,'C5'),true);assert.equal(switchCall8(c,'C5'),false);
});
test('refusals spend nothing; per-phase and total caps survive provider switch',()=>{
 for(const extra of [{paused:true},{cutscene:true},{victory:true},{dead:true},{strike:true},{balefire:true},{bossBeat:true},{clash:true},{hittable:false}]){const c=createCall8();assert.equal(takeCall8(c,{...ctx,...extra}).ok,false);assert.equal(c.charges,1);}
 const c=createCall8();takeCall8(c,{...ctx,bossPhase:1});c.on=false;switchCall8(c,'C5');assert.equal(takeCall8(c,{...ctx,bossPhase:1}).ok,false);
});
test('sweep and dice are identical, calls preserve humans and clamp every boss gate',()=>{
 for(let hp=1;hp<=100;hp++){const make=()=>({type:'sister',alive:true,hp,maxHp:100,bubble:true,popGuard(){this.bubble=false;},yield(){this.alive=false;}});const a=make(),b=make();callEffect8(a,'mat','dice');callEffect8(b,'mat','sweep');assert.equal(a.hp,b.hp);assert.ok(a.hp>=1);assert.equal(a.alive,hp>40);}
 for(const phase of [1,2,3]){const e={type:'lanfear',alive:true,hp:phase===1?503:phase===2?251:2,maxHp:760,phase};callEffect8(e,'rand');assert.ok(e.hp>=([501,250,1][phase-1]));}
});
