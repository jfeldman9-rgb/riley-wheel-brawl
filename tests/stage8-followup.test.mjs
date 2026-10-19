import test from 'node:test';
import assert from 'node:assert/strict';
import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';
import {q} from '../src/config.js';
import {paintStage8Hud,paintStory8Line} from '../src/stage8-hud.js';
import {createStage8View} from '../src/stage8-view.js';
import {VOLLEY8,createVolley8} from '../src/stage8-volley.js';

for(const skip of [false,true])test('Lanfear HUD identity on '+(skip?'skip=boss':'campaign')+' entry and recreation',()=>withSeed(1,()=>{
 const old=q.get('skip');if(skip)q.set('skip','boss');else q.delete('skip');
 const h=stage8Simulation();try{
  const s=h.s;for(let i=0;i<60*360&&!s.boss&&!s.gameOver;i++)h.step();
  assert.equal(s.boss.type,'lanfear');
  const hud={};paintStage8Hud(hud,s); // No bar until the HUD first observes the boss.
  for(let i=0;i<2;i++){
   hud.bossName={active:true,scene:s,text:'TROLLOC CHIEFTAIN',setText(t){this.text=t;return this;}};
   hud.bossPic={active:true,scene:s,key:'chiefPortrait',setTexture(k){this.key=k;return this;},setDisplaySize(w,h){this.size=[w,h];return this;}};
   paintStage8Hud(hud,{stageNo:1});assert.equal(hud.bossName.text,'TROLLOC CHIEFTAIN');
   paintStage8Hud(hud,s);assert.equal(hud.bossName.text,'LANFEAR');assert.equal(hud.bossPic.key,'lanfearPortrait');assert.deepEqual(hud.bossPic.size,[68,68]);
  }
 }finally{h.destroy();old===null?q.delete('skip'):q.set('skip',old);}
}));

test('Z2 canopy top stays offscreen and its foot overlaps the floor',()=>{
 const nodes=new Map(),s={zoneI:2,textures:{exists:()=>true},add:{image(x,y,key){const n={x,y,setOrigin(){},setPosition(x,y){this.x=x;this.y=y;},setDisplaySize(w,h){this.w=w;this.h=h;},setDepth(){},setScrollFactor(){},destroy(){}};nodes.set(key,n);return n;}}};
 const view=createStage8View(s);view.build();const plate=nodes.get('bg8mid3'),floor=nodes.get('bg8floor2');
 assert.ok(plate.y<0);assert.ok(plate.y+plate.h>=floor.y);assert.equal(floor.y,540);view.destroy();
});

test('demo C1 waits for art, holds gameplay, and shows Rand/Lews on the delivered box panel',async()=>{
 const h=stage8Simulation();try{
  const s=h.s,k=s.kit;let loaded;const pending=new Promise(resolve=>{loaded=resolve;});k.pendingArt=new Map([['story8p2',pending]]);
  const before={clock:k.clock,x:s.riley.x,hp:s.riley.hp,wave:s.wave};
  assert.ok(s.bot);assert.ok(k.story.play('C1'));assert.ok(s.paused);assert.equal(s.cutscene,null);
  for(let i=0;i<120;i++)h.step();assert.deepEqual({clock:k.clock,x:s.riley.x,hp:s.riley.hp,wave:s.wave},before);
  loaded();await pending;await Promise.resolve();await Promise.resolve();
  const cs=s.cutscene;assert.ok(cs);assert.equal(cs.line.panel,1);
  const deck=h.observations.hud.filter(r=>r.method==='showCutscene').at(-1).args[1];assert.equal(deck[1].key,'story8p2');
  for(const line of cs.lines.filter(l=>l.who==='RAND'||l.who==='LEWS THERIN'))assert.equal(deck[line.panel].key,'story8p2');
  assert.equal(cs.lines.filter(l=>l.who==='RAND'||l.who==='LEWS THERIN').length,6);
  for(let i=0;i<120;i++)h.step();assert.deepEqual({clock:k.clock,x:s.riley.x,hp:s.riley.hp,wave:s.wave},before);
  while(!cs.done)cs.next();assert.equal(s.paused,false);assert.equal(k.story.active,null);assert.ok(k.story.heard.has('st8_lews_03'));
 }finally{h.destroy();}
});

test('missing story art is captions only; delivered art and Lews speaker color return',()=>{
 let present=false;const h={cut:{panels:[{key:'story8p2'}],panel:{setVisible(v){this.visible=v;}},who:{setColor(c){this.color=c;}}}};
 const s={stageNo:8,textures:{exists:()=>true,get:()=>({source:[{isCanvas:!present}]})}};
 paintStory8Line(h,s,{who:'LEWS THERIN',panel:0});assert.equal(h.cut.panel.visible,false);assert.equal(h.cut.who.color,'#d8b25a');
 present=true;paintStory8Line(h,s,{who:'RAND',panel:0});assert.equal(h.cut.panel.visible,true);
});

test('skip=boss arms Taim and fires during the actual Lanfear fight',()=>withSeed(1,()=>{
 const old=q.get('skip');q.set('skip','boss');const h=stage8Simulation();try{
  const s=h.s,k=s.kit;assert.ok(VOLLEY8.inBoss);assert.ok(k.volley.armed);assert.equal(k.volley.next,60);
  let observed=false;
  for(let i=0;i<60*95&&!s.gameOver&&!s.ended;i++){
   h.step();if(k.volley.active&&s.boss?.alive){observed=true;assert.ok(s.boss.volleyHold);assert.equal(k.arena.balls.length,0);assert.equal(k.arena.tells.length,0);}
  }
  assert.ok(observed,'Taim must fire within the first 95 seconds of boss gameplay');
 }finally{h.destroy();old===null?q.delete('skip'):q.set('skip',old);}
}));

test('normal volley cadence carries into Z3 and repeated arm calls cannot reset it',()=>withSeed(2,()=>{
 const h=stage8Simulation();try{
  const s=h.s,k=s.kit,v=k.volley,at=v.clock;v.arm();assert.equal(v.next-at,6);
  // Exercise the scheduler independently of combat: an airborne actor in an
  // empty arena cannot delay it. Production boss shielding is checked above.
  s.enemies=[];s.riley.z=100;s.riley.state='idle';s.riley.grabbedBy=null;s.riley.held=false;k.arrows=[];k.bursts=[];
  const times=[];for(let i=0;i<13200;i++){
   if(i===1000){s.zoneI=3;const next=v.next;v.arm();assert.equal(v.next,next);}
   const count=v.count;v.step(.01);if(v.count>count)times.push(v.clock);
  }
  assert.equal(times.length,3);assert.ok(Math.abs(times[0]-at-6)<.02);
  for(let i=1;i<times.length;i++)assert.ok(Math.abs(times[i]-times[i-1]-60)<.02);
 }finally{h.destroy();}
}));

test('boss volley toggle clears an inherited volley without leaving Lanfear shielded',()=>withSeed(3,()=>{
 const h=stage8Simulation();try{
  const s=h.s,k=s.kit,v=createVolley8(k,false);v.arm();v.start();assert.ok(v.active);
  s.zoneI=3;s.boss={volleyHold:true};const before=v.clock;v.step(60);
  assert.equal(v.active,null);assert.equal(k.allies.volley,null);assert.equal(s.boss.volleyHold,false);
  assert.equal(v.clock,before);assert.equal(v.preparing,false);
 }finally{h.destroy();}
}));
