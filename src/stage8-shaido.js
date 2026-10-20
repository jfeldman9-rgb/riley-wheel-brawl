import {Fighter8} from './stage8-fighter.js';
import {clamp,LANE_TOP,LANE_BOT} from './config.js';
import {strikeRiley} from './stage6-hurt.js';
export const SHAIDO8=Object.freeze({stonedog:{hp:90,speed:95,blocks:3,open:1.8,tell:.5,rush:420,dmg:10},wiseone:{hp:55,speed:90,chant:1.2,burstTell:1,dmg:10}});
export function breaksBuckler(h,from,e){return ['throw','heavy','fireball','runkick'].includes(h.kind)||h.down||h.fireball||from?.type==='fireball'||(from&&Math.sign(from.x-e.x)!==e.facing);}
export class StoneDog extends Fighter8 {
 constructor(s,x,y){super(s,'s8stonedog',90,x,y,500,'SHAIDO STONE DOG',95);this.type='stonedog';this.buckler=true;this.blocks=0;this.openUntil=0;this.planted=x;}
 popGuard(){this.buckler=false;this.openUntil=(this.scene.kit?.clock||0)+1.8;this.setState('stagger');}
 takeHit(h={},from){if(!this.canBeHit)return false;
  if(this.buckler){if(breaksBuckler(h,from,this))this.popGuard();else{this.blocks++;if(this.blocks>=3)this.popGuard();return true;}}
  return super.takeHit({...h,dmg:(h.dmg||0)*1.3},from);
 }
 throwFrom(by,dir){this.popGuard();super.throwFrom(by,dir);}
 step(dt){if(this.resting(dt))return;const s=this.scene,r=s.riley;if(!r?.alive)return;
  if(!this.buckler&&(s.kit?.clock||0)>=this.openUntil){this.buckler=true;this.blocks=0;}
  if(this.state==='attack'){if(this.st>=.5){this.setState('lunge');this.counterUsed=false;}return;}
  if(this.state==='lunge'){this.x+=this.facing*420*dt;if(!this.counterUsed&&Math.abs(r.x-this.x)<85&&Math.abs(r.y-this.y)<30){this.counterUsed=true;if(r.z<70)strikeRiley(s,10,{source:'stonedog.rush',fromX:this.x,down:true});}if(this.st>=.9){this.setState('idle');this.cool=2.2;}return;}
  const dx=r.x-this.x,dy=r.y-this.y;this.face(Math.sign(dx));this.y=clamp(this.y+Math.sign(dy)*Math.min(Math.abs(dy),70*dt),LANE_TOP,LANE_BOT);
  if(Math.abs(dx)>180){this.x+=Math.sign(dx)*95*dt;this.state='walk';}
  if(!this.cool&&Math.abs(dx)<420&&Math.abs(dy)<28&&s.attackTokens()<2){this.setState('attack');this.counterUsed=false;}
 }
}
export class WiseOne extends Fighter8 {
 constructor(s,x,y){super(s,'s8wise',55,x,y,550,'SHAIDO WISE ONE',90);this.type='wiseone';this.castCount=0;}
 takeHit(h,from){const chanting=this.state==='attack';const ok=super.takeHit(h,from);if(ok&&chanting){this.cool=1;this.setState('stagger');this.cancelled=true;}return ok;}
 step(dt){if(this.resting(dt))return;const s=this.scene,r=s.riley;if(!r?.alive)return;
  if(this.state==='attack'){if(this.st<1.2)return;
   if(this.castCount++%2===0)s.kit?.fireBolt?.(this);else s.kit?.earthBurst?.(this.aim);
   this.setState('idle');this.cool=3.2;return;
  }
  const dx=r.x-this.x,dy=r.y-this.y;this.face(Math.sign(dx));
  const move=Math.abs(dx)>600?1:Math.abs(dx)<400?-1:0;
  this.x=clamp(this.x+Math.sign(dx)*move*90*dt,s.bounds.l+140,s.bounds.r-140);
  this.y=clamp(this.y+Math.sign(dy)*Math.min(Math.abs(dy),60*dt),LANE_TOP,LANE_BOT);
  if(!this.cool&&s.attackTokens()<2&&!(s.enemies||[]).some(e=>e!==this&&e.alive&&e.type==='wiseone'&&e.state==='attack')){this.aim={x:r.x,y:r.y};this.setState('attack');this.counterUsed=false;}
 }
}
