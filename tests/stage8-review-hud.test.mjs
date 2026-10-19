import test from 'node:test';
import assert from 'node:assert/strict';
import {stage8Simulation,withSeed} from './helpers/stage8-harness.mjs';
import {bindStage8Hud,paintStage8Hud} from '../src/stage8-hud.js';
import {call8Context} from '../src/stage8-lifecycle.js';
import {refuse8} from '../src/mat-call.js';
function node(scene){return {active:true,scene,canvas:{},context:{},frame:{},writes:0,setText(t){assert.ok(this.active&&this.scene&&this.canvas&&this.context);this.text=t;this.writes++;return this;},setTexture(t){assert.ok(this.active&&this.scene&&this.frame);this.texture=t;this.writes++;return this;},setDisplaySize(){return this;},setAlpha(){return this;}};}
test('call label follows joining, lane alignment, readiness, recharge, provider switch and spent state',()=>withSeed(3,()=>{
 const h=stage8Simulation();try{const s=h.s,k=s.kit;h.setController(null);s.zone=s.zones[0];const e=s.spawn('dancer','R');e.entering=false;e.silhouette=0;e.x=s.riley.x+100;e.y=s.riley.y+80;
 const hud={updateLoialLabel(){},loialT:node(s),loialPic:node(s)};bindStage8Hud(hud,k);const label=()=>{k.clock+=.3;hud.updateLoialLabel(s,s.riley);return hud.loialT.text;};
 assert.equal(label(),'MAT LOCKED');assert.equal(refuse8(k.call,call8Context(k)),'locked');k.matJoined=true;assert.equal(label(),'MAT — ALIGN');assert.equal(refuse8(k.call,call8Context(k)),'no-target');e.y=s.riley.y;assert.equal(label(),'MAT READY');assert.equal(s.riley.loialReady,true);
 k.call.charges=0;k.call.kos=4;assert.equal(label(),'MAT 4/10');assert.equal(refuse8(k.call,call8Context(k)),'empty');k.randFree=true;k.switchProvider();e.y=s.riley.y+80;assert.equal(label(),'RAND READY');k.call.calls=4;assert.equal(label(),'CALL SPENT');assert.equal(refuse8(k.call,call8Context(k)),'spent');
 }finally{h.destroy();}
}));
test('boss HUD ignores dead canvas/frame objects and retries a missing or recreated portrait independently',()=>{
 let present=false,texture={};const s={stageNo:8,textures:{exists:()=>present,get:()=>texture}},hud={bossName:node(s),bossPic:node(s)};
 hud.bossName.active=false;hud.bossName.scene=null;hud.bossName.canvas=null;hud.bossName.context=null;hud.bossPic.active=false;hud.bossPic.scene=null;hud.bossPic.frame=null;paintStage8Hud(hud,s);assert.equal(hud.bossName.writes+hud.bossPic.writes,0);
 hud.bossName=node(s);hud.bossPic=node(s);paintStage8Hud(hud,s);assert.equal(hud.bossName.text,'LANFEAR');assert.equal(hud.bossPic.writes,0);present=true;paintStage8Hud(hud,s);assert.equal(hud.bossPic.texture,'lanfearPortrait');paintStage8Hud(hud,s);assert.equal(hud.bossPic.writes,1);
 hud.bossPic=node(s);paintStage8Hud(hud,s);assert.equal(hud.bossPic.texture,'lanfearPortrait');assert.equal(hud.bossName.writes,1);texture={};paintStage8Hud(hud,s);assert.equal(hud.bossPic.writes,2);
 hud.bossName=node(s);hud.bossName.context=null;paintStage8Hud(hud,s);assert.equal(hud.bossName.writes,0);hud.bossName.context={};paintStage8Hud(hud,s);assert.equal(hud.bossName.text,'LANFEAR');
});
test('the real HUD hideTitle destroys its retained titleStageT; Stage 8 paint must not touch its dead canvas',async()=>{
 const {HUD}=await import('../src/hud.js');const s={stageNo:8},title=node(s);const hud={titleStageT:title,tweens:{add({onComplete}){onComplete();}},card:{removeAll(destroy){assert.equal(destroy,true);title.active=false;title.scene=null;title.canvas=null;title.context=null;},setAlpha(){}}};
 paintStage8Hud(hud,s);assert.equal(title.writes,1);HUD.prototype.hideTitle.call(hud);assert.equal(hud.titleStageT,title);for(let i=0;i<120;i++)paintStage8Hud(hud,s);assert.equal(title.writes,1);
 hud.titleStageT=node(s);paintStage8Hud(hud,s);assert.equal(hud.titleStageT.text,"DUMAI'S WELLS — THE FINAL BATTLE");
});
