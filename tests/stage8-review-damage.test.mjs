import test from 'node:test';
import assert from 'node:assert/strict';
import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';
import {strikeRiley} from '../src/stage6-hurt.js';
import {strikeRiley as directStrike} from '../src/stage5-hurt.js';
import {q} from '../src/config.js';
import {stage1Simulation} from './helpers/stage1-simulation.mjs';

function quiet(h){h.setController(null);const s=h.s;s.updateZones=()=>{};s.pending=[];s.zone=s.zones[0];for(const e of s.enemies)e.destroy();s.enemies=[];s.riley.inv=0;return s;}
function dancer(s){const e=s.spawn('dancer','R');e.entering=false;e.silhouette=0;e.x=s.riley.x+15;e.y=s.riley.y;e.setState('lunge');e.counterUsed=false;return e;}
test('C4–C6 caption chain yields a touching dancer and protects frozen Riley through grace',()=>withSeed(4,()=>{
 const h=stage8Simulation();try{const s=quiet(h),k=s.kit;s.bot={update(){}};s.riley.hp=3;s.riley.lives=0;const e=dancer(s);k.circle.start();k.circle.prompt();k.circle.breakCircle();assert.equal(e.alive,false);assert.ok(!s.enemies.some(e=>e.alive));
 const seen=new Set();for(let i=0;i<60*40&&!k.circle.done;i++){seen.add(k.story.active);assert.equal(strikeRiley(s,50,{source:'dancer.melee'}),false);assert.equal(directStrike(s,50),false);h.step();assert.equal(s.riley.hp,3);assert.equal(s.gameOver,false);}
 assert.ok(k.circle.done);for(const beat of ['C4','C5','C6'])assert.ok(seen.has(beat),beat);assert.ok(k.graceUntil>k.clock);
 }finally{h.destroy();}
}));
test('grace also blocks real dancer lunges and expires normally',()=>withSeed(4,()=>{
 const h=stage8Simulation();try{const s=quiet(h),k=s.kit,e=dancer(s);k.graceUntil=k.clock+1;const hp=s.riley.hp;e.update(.1);assert.equal(s.riley.hp,hp);k.clock+=2;k.combatClock+=2;s.riley.inv=0;e.x=s.riley.x+15;e.setState('lunge');e.counterUsed=false;e.update(.1);assert.equal(s.riley.hp,hp-6);}finally{h.destroy();}
}));
test('finale and C8walk clear adds and hazards, reject late spawns, and cannot game over',()=>withSeed(7,()=>{
 const h=stage8Simulation();try{const s=quiet(h),k=s.kit;s.bot={update(){}};s.riley.hp=1;s.riley.lives=0;const e=dancer(s);k.arrows.push({x:s.riley.x,y:s.riley.y,dir:1,t:0});k.earthBurst(s.riley);k.volley.start();k.finish();assert.equal(e.alive,false);assert.equal(k.arrows.length,0);assert.equal(k.bursts.length,0);assert.equal(k.volley.active,null);
 assert.equal(s.spawn('dancer','L'),null);k.fireArrow(e);k.fireBolt(e);k.earthBurst(s.riley);assert.equal(k.volley.start(),false);
 const seen=new Set();for(let i=0;i<60*20;i++){seen.add(k.story.active);s.riley.inv=0;assert.equal(strikeRiley(s,99,{source:'lanfear.star'}),false);h.step();assert.equal(s.riley.hp,1);assert.equal(s.gameOver,false);}
 assert.ok(seen.has('C8'));assert.ok(seen.has('C8walk'));assert.ok(k.walk);assert.ok(!s.enemies.some(e=>e.alive));assert.equal(k.arrows.length+k.bursts.length,0);
 }finally{h.destroy();}
}));
test('Stage 7 strikes still damage even with Stage 8-like grace fields',()=>withSeed(1,()=>{
 const old=q.get('s7'),story=q.get('story');q.set('s7','1');q.set('story','0');const h=stage1Simulation({stage:7,mode:null});try{for(let i=0;i<180&&!h.s.started;i++)h.step();const s=h.s;s.riley.inv=0;s.kit.graceUntil=Infinity;s.kit.blocksDamage=()=>true;s.kit.strikeDamage=()=>0;const hp=s.riley.hp;assert.equal(strikeRiley(s,9,{source:'dancer.melee'}),true);assert.equal(s.riley.hp,hp-9);}finally{h.destroy();old===null?q.delete('s7'):q.set('s7',old);story===null?q.delete('story'):q.set('story',story);}
}));
test('Stage 8 caps Lanfear and volley direct strikes at 14 without capping other sources',()=>withSeed(1,()=>{
 const h=stage8Simulation();try{const s=quiet(h),k=s.kit;for(const [source,damage]of [['lanfear.great',14],['volley.earth',14],['dancer.melee',20]]){s.riley.inv=0;k.combatClock+=1;const hp=s.riley.hp;assert.ok(strikeRiley(s,20,{source}));assert.equal(s.riley.hp,hp-damage);}}finally{h.destroy();}
}));
test('a real Taim wave pops the lit circle bubble without HP loss over earth and all fire ticks',()=>withSeed(1,()=>{
 const h=stage8Simulation();try{const s=quiet(h),k=s.kit;s.camX=2560;s.zoneI=2;k.circle.start();const anchor=k.circle.sisters[0];s.riley.x=3400;s.riley.y=630;assert.ok(k.volley.start());const a=k.volley.active;a.safe=2;
 for(let i=0;i<65;i++)k.volley.step(.1);
 assert.equal(anchor.bubble,false);assert.ok(a.hits.get(anchor).popped);assert.equal(a.hits.get(anchor).fire,3);assert.ok(a.hits.get(anchor).earth);
 for(const e of k.circle.sisters){assert.equal(e.hp,40);assert.equal(e.alive,true);if(!e.anchor)assert.equal(e.bubble,true);}assert.equal(k.circle.count,0);
 }finally{h.destroy();}
}));
test('balefire is absorbed by a sister bubble without counting as a melee hit',()=>withSeed(2,()=>{
 const h=stage8Simulation();try{const s=quiet(h),k=s.kit;k.circle.start();const e=k.circle.sisters[0];for(let i=0;i<3;i++)e.takeHit({kind:'finisher',power:true,dmg:999});assert.equal(e.hp,40);assert.equal(e.bubble,true);assert.equal(e.bubbleHits,0);for(let i=0;i<3;i++)e.takeHit({kind:'light',dmg:5});assert.equal(e.bubble,false);}finally{h.destroy();}
}));
test('circle grace protects Riley while the C6 panel demand is unresolved and after the panel appears',async()=>{
 const h=stage8Simulation();let loaded;try{const s=quiet(h),k=s.kit;const {CLIPS8}=await import('../src/stage8-video.js');const pending=new Promise(resolve=>{loaded=resolve;});k.pendingArt=new Map([[CLIPS8.link.panels[0],pending]]);k.circle.start();k.circle.prompt();k.circle.breakCircle();for(let i=0;i<60*20&&k.story.active!=='C6';i++)h.step();assert.equal(k.story.active,'C6');assert.equal(s.cutscene,null);const hp=s.riley.hp;
 for(let i=0;i<120;i++){assert.equal(strikeRiley(s,50,{source:'veiled.arrow'}),false);h.step();assert.equal(s.riley.hp,hp);}assert.equal(k.circle.phase,'link');loaded();await pending;await Promise.resolve();await Promise.resolve();assert.ok(s.cutscene);assert.equal(directStrike(s,50),false);h.step();assert.equal(s.riley.hp,hp);
 }finally{loaded?.();h.destroy();}
});
