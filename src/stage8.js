import {ZONE_ART8,VOLLEY_KEYS8,syncArt8} from './stage8-residency.js';
import {musicTrack8} from './stage8-audio.js';
import {releasePhone8} from './stage8-phone.js';
import {createStory8} from './stage8-story.js';
import {createAllies8} from './stage8-allies.js';
import {createVolley8,VOLLEY8} from './stage8-volley.js';
import {stage8Say} from './stage8-voice.js';
import {createCircle8,crackPip8} from './stage8-circle.js';
import {createCall8,tickCall8,switchCall8,provider8,canCall8} from './mat-call.js';
import {createCall8Video} from './call8-cutscene.js';
import {installLifecycle8,call8Context,endCall8} from './stage8-lifecycle.js';
import {bindStage8Hud} from './stage8-hud.js';
import {createLink8} from './stage8-link.js';
import {createArena8} from './stage8-arena.js';
import {beginClash8} from './stage8-clash.js';
import {createCredits8,outroWalkDone8} from './stage8-credits.js';
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
import {queueStage8Painted,demand8,silenceLoader,releaseKeys8} from './stage8-load.js';
import {createStage8View} from './stage8-view.js';
import {hook8,releaseHolds8} from './stage8-hooks.js';
import {installStage8Hud} from './stage8-hud.js';
import {STAGE8_VOICES} from './stage8-voice.js';
// Reserved commissioned paths; presence flags select shipped fallback loops without a failed request.
export function registerMusic8(){
MUSIC.stage8={url:'assets/audio/music-stage8.mp3',loopStart:.25,loopEnd:60.25,gain:.90};
MUSIC.boss8={url:'assets/audio/music-boss8.mp3',loopStart:.25,loopEnd:68.821429,gain:.94};
}
export function earlyKeys8(){return [...residentKeys({zoneI:0},STREAMS[8]),...ZONE_ART8.Z0,'bg8fg','bg8smoke'];}
export function queueStage8(s){registerMusic8();queuePowerArt(s,{twix:false});queueStage8Painted(s,earlyKeys8());}
export class Stage8Kit {
 constructor(s){this.s=s;this.clock=0;this.combatClock=0;this.quality=0;this.accum=0;this.tasks=[];this.cleanups=[];this.cleared=new Set();this.arrows=[];this.bursts=[];this.arrowAt=0;this.ribbons=0;this.stats={calls:0,ribbon:0};this.destroyed=false;this.story=createStory8(this);this.allies=createAllies8(this);this.volley=createVolley8(this);this.pips=new Set();this.circle=createCircle8(this);this.call=createCall8();this.link=createLink8(this);this.arena=createArena8(this);this.credits=createCredits8(this);}
 get ambient(){return 0xb4a386;}get ambientUnlit(){return 0x9b9489;}
 freezesWorld(){return !!(this.strike||this.clash||this.s.cutscene);}
 freezesRiley(){return this.freezesWorld()||!!this.scripted||this.credits.active;}
 setQuality(n){this.quality=n|0;if(this.view)this.view.quality=n;}
 build(){registerMusic8();const s=this.s;s.fires=[];installStage8Hud();paintStage8Art(s,earlyKeys8());
  hook8(this,s.music,'trackFor',old=>function(state){const track=musicTrack8(state);if(track)return track;return old.call(this,state);});
  hook8(this,s,'spawn',old=>function(type,side){const e=old.call(this,type,side);if(this.zoneI===0&&e){e.silhouette=.6;}
   if(e&&!e.T?.boss)hook8(s.kit,e,'update',update=>function(dt){if(s.kit.volley.active||s.kit.volley.preparing)this.cool=Math.max(1,this.cool||0);return update.call(this,dt);});return e;});
  hook8(this,s,'updateZones',old=>function(dt){if(this.zoneI===2&&!s.kit.circle.done&&this.wave>=1&&!this.pending.length&&!this.enemies.some(e=>e.alive)){s.kit.circle.start();}if(s.kit.circle.active)return;return old.call(this,dt);});
  hook8(this,s,'attackTokens',old=>function(){return old.call(this)+this.enemies.filter(e=>e.alive&&['grab_tell','great'].includes(e.state)).length;});
  installLifecycle8(this);this.video=createCall8Video(s);
  hook8(this,s,'startBoss',old=>function(){demand8(s.kit,['s8lanfear','lanfearPortrait'],()=>{if(!s.kit.destroyed)old.call(this);});});
  for(const key of ['rileyDied','continueGame'])hook8(this,s,key,old=>function(){releaseHolds8(s);s.kit.clearHazards();return old.apply(this,arguments);});
  this.residentArt=new Set(earlyKeys8().filter(k=>!residentKeys({zoneI:0},STREAMS[8]).has(k)));
  this.view=createStage8View(s);this.view.build();
  this.backdrops=createPlateStream(s,8,{layoutPlates:()=>this.view.layout()},()=>false);
 }
 start(){const s=this.s;if(q.get('skip')==='boss'){this.randFree=true;this.linked=true;this.circle.done=true;this.link.enable();this.switchProvider();this.taimArrived=true;this.volley.arm(VOLLEY8.every);for(let i=0;i<6;i++)this.pips.add(i);}hook8(this,s.riley,'takeHit',old=>function(h,from){if(!damageAllowed(s)||s.kit.clock<(s.kit.graceUntil||0))return false;const ok=old.call(this,h,from);if(ok)recordDamage7(s);return ok;});s.music?.set('stage');}
 later(delay,fn){this.tasks.push({at:this.clock+delay,fn});}
 update(dt){if(this.destroyed||this.s.paused||this.s.cutscene||!this.s.started||this.s.gameOver)return;substeps(this,stage4Delta(dt),d=>this.step(d));syncArt8(this);this.backdrops?.sync();this.view?.sync(this);}
 step(dt){this.clock+=dt;this.combatClock+=dt;tickCall8(this.call,dt);if(this.s.hud&&!this.hudBound){this.hudBound=true;bindStage8Hud(this.s.hud,this);}if(this.s.riley)this.s.riley.loialReady=canCall8(this.call,call8Context(this));if(this.call.charges)this.video?.warm(provider8(this.randFree));if(this.zone!==this.s.zoneI){this.zone=this.s.zoneI;this.allies.enter(this.zone);if(this.zone>=1)demand8(this,['s8wise','s8bolt']);if(this.zone===2){demand8(this,['s8sister','s8weave','s8twink','s8chest','s8dome']);this.story.say('st8_sister_02');this.later(4,()=>this.story.say('riley_st8_lady_01'));}}for(const t of this.tasks.slice())if(t.at<=this.clock){this.tasks.splice(this.tasks.indexOf(t),1);t.fn();}
  this.credits.step(dt);if(this.outro){this.outroT=(this.outroT||0)+dt;if(this.walk){this.walkT+=dt;if(!this.story.active&&outroWalkDone8(this.s.riley.x,this.walkT)){this.walk=false;this.scripted=true;this.story.play('C9',()=>{this.scripted=false;this.credits.start();});}}return;}
  for(const e of this.s.enemies||[])if(e.silhouette>0)e.silhouette=Math.max(0,e.silhouette-dt);
  const r=this.s.riley;for(const a of this.arrows){a.x+=a.dir*(a.bolt?380:460)*dt;a.t+=dt;if(!a.hit&&r.z<95&&Math.abs(r.x-a.x)<30&&Math.abs(r.y-a.y)<22){a.hit=true;strikeRiley(this.s,a.dmg||7,{source:'veiled.arrow',fromX:a.x});}}
  for(const b of this.bursts){b.t+=dt;if(b.t>=1&&!b.counterUsed){b.counterUsed=true;if(r.z<70&&Math.abs(r.x-b.x)<72&&Math.abs(r.y-b.y)<30)strikeRiley(this.s,10,{source:'wiseone.earth',fromX:b.x,down:true});}}this.bursts=this.bursts.filter(b=>b.t<1.4);
  for(const a of this.arrows)if(a.bolt)for(const f of this.s.fireballs||[])if(Math.abs(a.x-f.x)<60&&Math.abs(a.y-f.gy)<30)a.hit=true;
  if(this.s.zoneI===1&&this.s.wave>=1)this.allies.charge('slope');if(this.s.boss?.alive&&!this.s.boss.entering&&!this.bossIntro){this.bossIntro=true;this.story.play('C7');}if(this.s.boss?.alive&&!this.s.boss.entering&&!this.volley.active)this.arena.step(dt);
  this.allies.step(dt);this.link.step(dt);this.circle.step(dt);if(this.s.zoneI===0&&this.s.wave>=1&&!this.taimArrived){this.taimArrived=true;demand8(this,VOLLEY_KEYS8);this.story.play('C3',()=>this.volley.arm(),true);}if(!this.outro&&!this.scripted)this.volley.step(dt);
  this.arrows=this.arrows.filter(a=>!a.hit&&a.t<4);
 }
 onBossPhase(b,phase){this.arena.clear();this.story.say('st8_lanfear_p'+phase+'_01');if(phase===2){this.s.spawn('dancer','L');this.s.spawn('veiled','R');this.allies.charge('boss');this.later(6,()=>{if(b.alive&&b.phase===2&&!this.outro){this.s.spawn('stonedog','L');this.s.spawn('dancer','R');}});}}
 switchProvider(){switchCall8(this.call,'C5');this.video?.drop();}
 sayVolley(n){stage8Say('st8_taim_kill_0'+(1+(n-1)%3),this.s.caption);}
 onVolleyEnd(n){if(n===1)crackPip8(this,'volley');if(n===1)this.story.say('riley_st8_taim_01');if(n===2)this.story.say('riley_st8_volley_01');}
 fireBolt(e){if(this.arrows.length<2)this.arrows.push({x:e.x,y:e.y,dir:e.facing,t:0,hit:false,bolt:true,dmg:8});}
 earthBurst(p){if(!this.bursts.length)this.bursts.push({...p,t:0,counterUsed:false});}
 fireArrow(e){if(this.arrows.length<2)this.arrows.push({x:e.x,y:e.y,dir:e.facing,t:0,hit:false});}
 onZoneClear(i){this.cleared.add(i);if(i===0)crackPip8(this,'z0');if(i===1)crackPip8(this,'z1');this.arrows.length=0;if(i===0){this.matJoined=true;demand8(this,['s8mat','matPortrait']);this.story.play('C2b',null,true);}}
 clearHazards(){this.arrows.length=0;this.bursts.length=0;this.volley.clear();this.arena.clear();}
 threats(){return {arrows:this.arrows,bursts:this.bursts,volley:this.volley.active,tells:this.arena.tells,balls:this.arena.balls,stars:this.arena.stars};}
 beginClash(final){return beginClash8(this,final);}
 finish(){if(this.outro)return;this.outro=true;this.clearHazards();this.scripted=true;this.graceUntil=Infinity;this.story.play('C8',()=>{this.scripted=false;this.walk=true;this.walkT=0;this.story.play('C8walk',null,true);this.s.locked=false;this.s.music?.set('clear');this.s.bounds={l:3920,r:5200};});}
 dropRibbon(){if(this.ribbonDropped)return;this.ribbonDropped=true;const s=this.s,x=s.riley.x+30,y=s.riley.y;const c=s.add.image(x,y-30,'s7ribbon'),g=s.add.image(x,y-30,'glow');const L=s.lights.addLight(x,y,100,0xef81a2,.5);s.pickups.push({x,y,kind:'ribbon',c,g,L,t:0});}
 collectRibbon(){this.ribbons++;this.stats.ribbon++;this.s.riley.score+=1000;this.hint("TWINKLE TOES' RIBBON — SHE'S CLOSE!");}
 hint(t){this.s.hud?.flashText?.(t);}koStars(){}telegraph(){}glint(){}onPause(){}
 destroy(){if(this.destroyed)return;this.destroyed=true;releasePhone8();this.video?.destroy();endCall8(this);releaseHolds8(this.s);this.tasks.length=0;releaseKeys8(this,STAGE8_TEXTURES);this.clearHazards();this.clash=null;this.credits.destroy();this.circle.destroy();this.allies.destroy();this.story.destroy();this.backdrops?.destroy();this.view?.destroy();for(const f of this.cleanups.splice(0).reverse())f();releaseStage8(this.s,0);}
}
STAGE8.kit=Stage8Kit;STAGE8.queue=queueStage8;STAGE8.start=s=>{s.kit.start();if(q.get('story')!=='0'&&s.stageData?.story!==false)s.kit.story.play('C1');};
export function releaseStage8(s,to){const keep=new Set(STAGE_TEXTURES[to]||[]);for(const key of STAGE8_TEXTURES){if(keep.has(key))continue;silenceLoader(s.load,key);if(s.textures?.exists?.(key))s.textures.remove?.(key);}releaseClips(STAGE8_VOICES);}
queueMicrotask(()=>{if(typeof globalThis.Phaser==='undefined')return;import('./stage1.js').then(({Stage1})=>{const p=Stage1?.prototype;if(!p||p._s8rel)return;const old=p.releaseStage;p.releaseStage=function(to){const out=old.apply(this,arguments);if(to!==8)releaseStage8(this,to);return out;};p._s8rel=true;});});
