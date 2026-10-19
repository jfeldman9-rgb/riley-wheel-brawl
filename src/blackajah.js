import {Fighter8} from './stage8-fighter.js';
import {clamp,LANE_TOP,LANE_BOT} from './config.js';
export class Sister extends Fighter8 {
 constructor(s,x,y){super(s,'s8sister',70,x,y,600,'BLACK AJAH',90);this.type='sister';this.bubble=true;this.bubbleHits=0;this.openUntil=0;this.bindAt=0;this.mashes=0;}
 // The shield anchors are rooted to the ring; hit reactions must not move them
 // behind the dome boundary where melee cannot reach them.
 physics(dt){super.physics(dt);if(this.circleMember&&this.alive){this.x=this.ringX;this.y=this.ringY;this.vx=0;this.vy=0;}}
 sync(){super.sync();if(this.circleMember){
  if(this.anchor)this.sprite.setTint?.(0xa8d8ff);else this.sprite.clearTint?.();
  if(!this.anchor&&this.state!=='yield'&&!(this.silhouette>0))this.sprite.setAlpha?.(.7);
 }}
 get canBeHit(){return super.canBeHit&&(!this.circleMember||this.anchor);}
 popGuard(){this.bubble=false;this.bubbleHits=0;this.openUntil=(this.scene.kit?.clock||0)+3;}
 takeHit(h={},from){if(!this.canBeHit)return false;if(this.bubble){if(h.power||['fire','fireball','lightning','power'].includes(h.kind)||(from&&from.team===undefined&&h.launch&&h.down))return true;if(++this.bubbleHits>=3)this.popGuard();return true;}
  const ok=super.takeHit(h,from);if(ok)this.releaseHold('break');return ok;
 }
 yield(){this.releaseHold('break');const was=this.alive;super.yield();if(was&&this.anchor)this.scene.kit?.circle.broken(this);}
 mash(){if(++this.mashes>=3)this.releaseHold('escape');}
 releaseHold(how='break'){const r=this.scene.riley;if(r?.grabbedBy===this){r.grabbedBy=null;r.leaveGrabbed?.(how);}if(this.state==='holding'){this.setState('idle');this.cool=2;}super.releaseHold();}
 bind(){const r=this.scene.riley;if(r.grabbedBy||r.z>40||Math.abs(r.y-this.aimY)>28)return;this.setState('holding');this.mashes=0;r.grabbedBy=this;r.enterGrabbed?.(this);}
 step(dt){if(this.state==='holding'){this.st+=dt;if(this.st>=1.2)this.releaseHold('break');return;}if(this.resting(dt))return;
  const s=this.scene,r=s.riley,t=s.kit?.clock||0;if(!r?.alive)return;
  if(!this.bubble&&t>=this.openUntil){this.setState('reweave');this.bubble=true;this.bubbleHits=0;this.cool=1;}
  if(this.state==='reweave'){if(this.st>=1)this.setState('idle');return;}
  if(this.circleMember&&!this.anchor)return;
  if(this.state==='attack'){if(this.st>=.8){this.bind();if(this.state==='attack'){this.setState('idle');this.cool=2;}}return;}
  const dx=r.x-this.x,dy=r.y-this.y;this.face(Math.sign(dx));
  if(!this.circleMember){this.x=clamp(this.x+Math.sign(dx)*(Math.abs(dx)>500?90:Math.abs(dx)<300?-90:0)*dt,s.bounds.l+140,s.bounds.r-140);this.y=clamp(this.y+Math.sign(dy)*Math.min(Math.abs(dy),60*dt),LANE_TOP,LANE_BOT);}
  if(!this.cool&&t>=this.bindAt&&!s.kit?.volley.active&&s.attackTokens()<2&&!(s.enemies||[]).some(e=>e!==this&&e.alive&&e.type==='sister'&&['attack','holding'].includes(e.state))){this.aimY=r.y;this.setState('attack');this.bindAt=t+9;}
 }
 destroy(){this.releaseHold('break');super.destroy();}
}
