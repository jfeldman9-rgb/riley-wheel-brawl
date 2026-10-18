import {Fighter8} from './stage8-fighter.js';
import {clamp} from './config.js';
import {strikeRiley} from './stage6-hurt.js';
export const LANFEAR=Object.freeze({hp:760,speed:96,reach:160,score:15000,gates:Object.freeze([.66,.33]),bolt:{speed:420,dmg:8,tell:.55},great:{tell:1.6,speed:260,dmg:14},mirror:{every:12,copies:2,last:6},step:{shimmer:.6},grab:{tell:.6,speed:520,dmg:12,tantrum:1.05},stars:{tell:.9,r:70,dmg:10,max:3},damageCap:14});
export function floor8(b){return b.phase===1?Math.floor(b.maxHp*.66):b.phase===2?Math.floor(b.maxHp*.33):1;}
export class Mirror8 extends Fighter8 {
 constructor(s,x,y){super(s,'s8lanfear',1,x,y,0,'PAPER CROWN',0);this.type='lanfearcopy';this.isCopy=true;this.life=6;this.damage=0;}
 step(dt){this.st+=dt;this.life-=dt;if(this.life<=0||!this.alive){this.alive=false;this.gone=true;}}
 takeHit(){if(!this.alive)return false;this.alive=false;this.gone=true;return true;}
 sync(){super.sync();this.shadow?.setAlpha?.(0);this.sprite?.setAlpha?.(.42);this.sprite?.setTint?.(0xeac260);}
}
export class Lanfear extends Fighter8 {
 constructor(s,x,y){super(s,'s8lanfear',760,x,y,15000,'LANFEAR',96,true);this.type='lanfear';this.phase=1;this.cool=2;this.nextMirror=12;this.nextGrab=7;this.nextStar=5;this.nextGreat=8;this.nextStep=10;this.time=0;this.beat=0;this.anchorX=4660;}
 get canBeHit(){return super.canBeHit&&!this.beat&&!this.volleyHold&&!this.scene.kit?.scripted&&this.scene.kit?.story.active!=='C7'&&this.phase!==4;}
 takeHit(h={}){if(!this.canBeHit)return false;this.hp=Math.max(floor8(this),this.hp-Math.max(0,h.dmg||0));if(!['attack','grab_tell','lunge','great'].includes(this.state)){this.setState('hurt');this.cool=Math.max(this.cool,.9);}return true;}
 die(){this.hp=Math.max(1,this.hp);}
 gate(){if(this.phase<3&&this.hp<=floor8(this)){this.phase++;this.beat=1.4;this.setState('shield');this.scene.kit?.arena.clear();this.scene.onBossPhase?.(this,this.phase);return true;}return false;}
 step(dt){if(!this.alive)return;const s=this.scene,k=s.kit,r=s.riley;
  if(this.volleyHold||k?.story.active==='C7'||k?.scripted){this.setState('shield');return;}
  if(this.beat>0){this.beat=Math.max(0,this.beat-dt);return;}
  if(this.gate())return;if(this.phase===3&&this.hp<=1){k.beginClash(true);return;}
  this.time+=dt;
  if(this.resting(dt))return;
  this.face(Math.sign(r.x-this.x));
  if(this.state==='tantrum'){if(this.st>=1.05){this.setState('idle');this.cool=1;}return;}
  if(this.state==='grab_tell'){if(this.st>=.6){this.setState('lunge');this.counterUsed=false;this.face(this.grabDir);}return;}
  if(this.state==='lunge'){this.x+=this.grabDir*520*dt;if(!this.counterUsed&&Math.abs(r.x-this.x)<85&&Math.abs(r.y-this.grabY)<28&&r.z<70){this.counterUsed=true;strikeRiley(s,12,{source:'lanfear.grab',fromX:this.x,down:true});}if(this.st>=.75||this.x<=s.bounds.l+70||this.x>=s.bounds.r-70){this.setState(this.counterUsed?'idle':'tantrum');this.cool=1;}return;}
  if(this.state==='gateway'){if(this.st>=.6){this.x=this.destination;this.setState('idle');this.cool=.6;}return;}
  if(this.state==='attack'||this.state==='great'){if(this.st>=(this.state==='great'?1.6:1.1)){this.setState('idle');this.cool=2.4;}return;}
  if(s.attackTokens()>=2)return;
  if(this.phase===1&&this.time>=this.nextMirror){this.nextMirror=this.time+12;for(const off of [-180,180])s.enemies.push(new Mirror8(s,clamp(this.x+off,s.bounds.l+100,s.bounds.r-100),this.y));k.story.say('st8_tt_mirror_01');}
  if(this.phase===3&&this.time>=this.nextGreat){this.nextGreat=this.time+8;k.arena.great(this);this.setState('great');k.story.say('st8_lanfear_clash_01');return;}
  if(this.phase===2&&this.time>=this.nextGrab){this.nextGrab=this.time+7;this.grabY=r.y;this.grabDir=Math.sign(r.x-this.x)||-1;this.y=this.grabY;this.setState('grab_tell');k.hazardUntil=k.clock+2;return;}
  if(this.phase===2&&this.time>=this.nextStar){this.nextStar=this.time+5;k.arena.star(this);}
  if(this.time>=this.nextStep&&!k.arena.tells.length){this.nextStep=this.time+10;this.destination=this.x>4600?4300:4750;this.setState('gateway');return;}
  if(!this.cool){k.arena.fan(this);this.setState('attack');this.cool=this.phase===2?7:3.5;}
 }
}
