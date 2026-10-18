import {Fighter8} from './stage8-fighter.js';
export const LANFEAR=Object.freeze({hp:760,speed:96,score:15000});
export class Lanfear extends Fighter8 {
 constructor(s,x,y){super(s,'s8lanfear',760,x,y,15000,'LANFEAR',96,true);this.type='lanfear';this.phase=1;}
 step(dt){if(this.resting(dt))return;const r=this.scene.riley;if(!r)return;this.face(Math.sign(r.x-this.x));this.y+=Math.sign(r.y-this.y)*Math.min(Math.abs(r.y-this.y),35*dt);}
}
