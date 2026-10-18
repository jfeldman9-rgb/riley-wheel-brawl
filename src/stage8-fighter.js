import {Stage7Fighter} from './stage7-fighter.js';
import {Shaido} from './shaido.js';
import {frame8} from './stage8-frames.js';
import {isPainted} from './stage6-paint.js';
import {substeps} from './stage5-clock.js';
export class Fighter8 extends Stage7Fighter {
 constructor(s,key,hp,x,y,score,name,speed,boss=false){super(s,key,hp,x,y,score,name,speed,boss);this.cool=.8;this.counterUsed=false;}
 update(dt){if(this.scene.paused||this.scene.cutscene||this.scene.kit?.freezesWorld()||this.entering||this.silhouette>0)return;substeps(this,dt,d=>this.step(d));}
 resting(dt){this.st+=dt;this.cool=Math.max(0,this.cool-dt);
  if(!this.alive){if(this.st>=.8)this.gone=true;return true;}
  if(this.state==='held')return true;
  if(this.state==='thrown'){Shaido.prototype.step.call(this,0);return true;}
  if(this.assistDown>0){this.assistDown=Math.max(0,this.assistDown-dt);this.setState('down');return true;}
  if(['down','hurt','stagger'].includes(this.state)){if(this.st>=.85)this.setState('idle');return true;}return false;
 }
 sync(){super.sync();if(isPainted(this.scene,this.def.key)){this.sprite.setFrame?.(frame8(this.scene,this.def.key,this.state,this.st));this.sprite.setScale?.(1);}}
 get grabbable(){return !this.T.boss&&this.canBeHit&&this.z<=0&&['idle','walk','hurt','stagger'].includes(this.state);}
 grabbed(by){return Shaido.prototype.grabbed.call(this,by);}
 release(){return Shaido.prototype.release.call(this);}
 releaseHold(){return Shaido.prototype.releaseHold.call(this);}
 throwFrom(by,dir){return Shaido.prototype.throwFrom.call(this,by,dir);}
 onLand(){return Shaido.prototype.onLand.call(this);}
 takeHit(h,from){return Shaido.prototype.takeHit.call(this,h,from);}
 yield(){return Shaido.prototype.yield.call(this);}
 die(){this.yield();}
}
