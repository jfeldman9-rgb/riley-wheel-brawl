import {createStory8} from './stage8-story.js';
import {q} from './config.js';
import {STAGE8,STAGE8_TEXTURES} from './stage8-def.js';
import {STAGE_TEXTURES} from './stages.js';
import {queuePowerArt} from './powers.js';
import {MUSIC,releaseClips} from './audio.js';
import {stage4Delta} from './stage4-time.js';
import {substeps} from './stage5-clock.js';
import {strikeRiley,damageAllowed} from './stage6-hurt.js';
import {recordDamage7} from './stage7-hurt.js';
import {STREAMS,residentKeys,createPlateStream} from './zone-stream.js';
import {paintStage8Art} from './stage8-paint.js';
import {queueStage8Painted,demand8,silenceLoader} from './stage8-load.js';
import {createStage8View} from './stage8-view.js';
import {hook8,releaseHolds8} from './stage8-hooks.js';
import {installStage8Hud} from './stage8-hud.js';
import {STAGE8_VOICES} from './stage8-voice.js';
// Missing commissioned music is handled by the shared backend's silent failure path.
MUSIC.stage8={url:'assets/audio/music-stage8.mp3',loopStart:.25,loopEnd:60.25,gain:.90};
MUSIC.boss8={url:'assets/audio/music-boss8.mp3',loopStart:.25,loopEnd:68.821429,gain:.94};
export function earlyKeys8(){return [...residentKeys({zoneI:0},STREAMS[8]),'s7dancer','s7veiled','s7crate','s7planks','s7ribbon','s7arrow','s8stonedog'];}
export function queueStage8(s){queuePowerArt(s,{twix:false});queueStage8Painted(s,earlyKeys8());}
export class Stage8Kit {
 constructor(s){this.s=s;this.clock=0;this.combatClock=0;this.quality=0;this.accum=0;this.tasks=[];this.cleanups=[];this.cleared=new Set();this.arrows=[];this.bursts=[];this.arrowAt=0;this.ribbons=0;this.stats={calls:0,ribbon:0};this.destroyed=false;this.story=createStory8(this);}
 get ambient(){return 0xb4a386;}get ambientUnlit(){return 0x9b9489;}
 freezesWorld(){return !!(this.strike||this.s.cutscene);}
 freezesRiley(){return this.freezesWorld();}
 setQuality(n){this.quality=n|0;if(this.view)this.view.quality=n;}
 build(){const s=this.s;s.fires=[];installStage8Hud();paintStage8Art(s,earlyKeys8());
  hook8(this,s.music,'trackFor',old=>function(state){if(state==='stage')return 'stage8';if(state==='boss')return 'boss8';return old.call(this,state);});
  hook8(this,s,'spawn',old=>function(type,side){const e=old.call(this,type,side);if(this.zoneI===0&&e){e.silhouette=.6;}return e;});
  hook8(this,s,'callLoial',()=>()=>false);
  hook8(this,s,'startBoss',old=>function(){demand8(s.kit,['s8lanfear','lanfearPortrait'],()=>{if(!s.kit.destroyed)old.call(this);});});
  for(const key of ['rileyDied','continueGame'])hook8(this,s,key,old=>function(){releaseHolds8(s);s.kit.clearHazards();return old.apply(this,arguments);});
  this.view=createStage8View(s);this.view.build();
  this.backdrops=createPlateStream(s,8,{layoutPlates:()=>this.view.layout()},()=>false);
 }
 start(){const s=this.s;hook8(this,s.riley,'takeHit',old=>function(h,from){if(!damageAllowed(s)||s.kit.clock<(s.kit.graceUntil||0))return false;const ok=old.call(this,h,from);if(ok)recordDamage7(s);return ok;});s.music?.set('stage');}
 later(delay,fn){this.tasks.push({at:this.clock+delay,fn});}
 update(dt){if(this.destroyed||this.s.paused||this.s.cutscene||!this.s.started||this.s.gameOver)return;substeps(this,stage4Delta(dt),d=>this.step(d));this.backdrops?.sync();this.view?.sync(this);}
 step(dt){this.clock+=dt;this.combatClock+=dt;if(this.zone!==this.s.zoneI){this.zone=this.s.zoneI;if(this.zone>=1)demand8(this,['s8wise','s8bolt']);}for(const t of this.tasks.slice())if(t.at<=this.clock){this.tasks.splice(this.tasks.indexOf(t),1);t.fn();}
  for(const e of this.s.enemies||[])if(e.silhouette>0)e.silhouette=Math.max(0,e.silhouette-dt);
  const r=this.s.riley;for(const a of this.arrows){a.x+=a.dir*460*dt;a.t+=dt;if(!a.hit&&r.z<95&&Math.abs(r.x-a.x)<30&&Math.abs(r.y-a.y)<22){a.hit=true;strikeRiley(this.s,a.dmg||7,{source:'veiled.arrow',fromX:a.x});}}
  for(const b of this.bursts){b.t+=dt;if(b.t>=1&&!b.counterUsed){b.counterUsed=true;if(r.z<70&&Math.abs(r.x-b.x)<72&&Math.abs(r.y-b.y)<30)strikeRiley(this.s,10,{source:'wiseone.earth',fromX:b.x,down:true});}}this.bursts=this.bursts.filter(b=>b.t<1.4);
  for(const a of this.arrows)if(a.bolt)for(const f of this.s.fireballs||[])if(Math.abs(a.x-f.x)<60&&Math.abs(a.y-f.gy)<30)a.hit=true;
  this.arrows=this.arrows.filter(a=>!a.hit&&a.t<4);
 }
 fireBolt(e){if(this.arrows.length<2)this.arrows.push({x:e.x,y:e.y,dir:e.facing,t:0,hit:false,bolt:true,dmg:8});}
 earthBurst(p){if(!this.bursts.length)this.bursts.push({...p,t:0,counterUsed:false});}
 fireArrow(e){if(this.arrows.length<2)this.arrows.push({x:e.x,y:e.y,dir:e.facing,t:0,hit:false});}
 onZoneClear(i){this.cleared.add(i);this.arrows.length=0;}
 clearHazards(){this.arrows.length=0;this.bursts.length=0;}
 threats(){return {arrows:this.arrows,bursts:this.bursts};}
 finish(){this.clearHazards();this.later(2,()=>{this.s.ended=true;this.s.hud?.stageClear(this.s.stats());this.s.clearShown=true;});}
 dropRibbon(){if(this.ribbonDropped)return;this.ribbonDropped=true;const s=this.s,x=s.riley.x+30,y=s.riley.y;const c=s.add.image(x,y-30,'s7ribbon'),g=s.add.image(x,y-30,'glow');const L=s.lights.addLight(x,y,100,0xef81a2,.5);s.pickups.push({x,y,kind:'ribbon',c,g,L,t:0});}
 collectRibbon(){this.ribbons++;this.stats.ribbon++;this.s.riley.score+=1000;this.hint("TWINKLE TOES' RIBBON — SHE'S CLOSE!");}
 hint(t){this.s.hud?.flashText?.(t);}koStars(){}telegraph(){}glint(){}onPause(){}
 destroy(){if(this.destroyed)return;this.destroyed=true;releaseHolds8(this.s);this.tasks.length=0;this.clearHazards();this.story.destroy();this.backdrops?.destroy();this.view?.destroy();for(const f of this.cleanups.splice(0).reverse())f();releaseStage8(this.s,0);}
}
STAGE8.kit=Stage8Kit;STAGE8.queue=queueStage8;STAGE8.start=s=>{s.kit.start();if(q.get('story')!=='0'&&s.stageData?.story!==false)s.kit.story.play('C1');};
export function releaseStage8(s,to){const keep=new Set(STAGE_TEXTURES[to]||[]);for(const key of STAGE8_TEXTURES){if(keep.has(key))continue;silenceLoader(s.load,key);if(s.textures?.exists?.(key))s.textures.remove?.(key);}releaseClips(STAGE8_VOICES);}
queueMicrotask(()=>{if(typeof globalThis.Phaser==='undefined')return;import('./stage1.js').then(({Stage1})=>{const p=Stage1?.prototype;if(!p||p._s8rel)return;const old=p.releaseStage;p.releaseStage=function(to){const out=old.apply(this,arguments);if(to!==8)releaseStage8(this,to);return out;};p._s8rel=true;});});
