import {safeFrame8} from './stage8-frames.js';
import {bandY8} from './stage8-allies.js';
import {STREAMS,residentKeys,plateRect} from './zone-stream.js';
import {STAGE8} from './stage8-def.js';
import {demand8} from './stage8-load.js';
export function createStage8View(s){const nodes=new Map(),fx=new Map();let crown=null,wrapper=null;
 function effect(id,key,x,y,frame=0,alpha=1,scale=1,depth=980){let n=fx.get(id);if(n&&n._s8key!==key){n.destroy?.();fx.delete(id);n=null;}if(!n){if(!s.textures?.exists?.(key))return;n=s.add?.image?.(x,y,key);if(!n)return;fx.set(id,n);n._s8key=key;}n.setPosition?.(x,y);n.setFrame?.(safeFrame8(s,key,frame));n.setOrigin?.(.5,.96);n.setScale?.(scale);n.setAlpha?.(alpha);n.setDepth?.(depth);return n;}
 return {effect,fx,
 dropKey(key){for(const [id,n]of fx)if(n._s8key===key){n.destroy?.();fx.delete(id);}const n=nodes.get(key);n?.destroy?.();nodes.delete(key);},
 build(){this.layout();},
 layout(){const keep=residentKeys(s,STREAMS[8]);
 for(const [key,n]of nodes)if(!keep.has(key)){n?.destroy?.();nodes.delete(key);}
 for(const key of keep){if(!s.textures?.exists?.(key)){demand8(s.kit,[key],()=>this.layout());continue;}if(nodes.has(key))continue;
 const n=s.add?.image?.(0,0,key);if(!n)continue;nodes.set(key,n);n.setOrigin?.(0,0);
 if(key==='bg8far'){n.setScrollFactor?.(.15);n.setDisplaySize?.(1920,580);n.setDepth?.(-30);}
 else{const i=STREAMS[8].zones.findIndex(z=>z.plate===key||z.floor===key),r=plateRect(i,STAGE8.zones,STREAMS[8].bleed);const floor=key.includes('floor');let w=r.w;
 if(key==='bg8floor2')w=STAGE8.zones[3].l-r.x+48;
 // The Z2 canopy is cropped by the plate's top edge. Keep that edge above
 // the viewport, with the foot of the plate still tucked behind the floor.
 const canopy=key==='bg8mid3';
 n.setPosition?.(r.x,floor?540:canopy?-24:220);n.setDisplaySize?.(w,canopy?604:360);n.setDepth?.(floor?-10:-20);}
 }
 },sync(k){this.layout();for(const n of fx.values())n.setAlpha?.(0);
 const z=Math.max(0,s.zoneI),cam=s.camX||0,t=k.clock;
 if(k.outro&&k.outroT>1.5){
  if(!crown){crown=s.add?.graphics?.();crown?.lineStyle?.(3,0xdfe3ea,1);crown?.strokePoints?.([{x:-12,y:0},{x:-14,y:-10},{x:-7,y:-5},{x:0,y:-15},{x:7,y:-5},{x:14,y:-10},{x:12,y:0}],true);}
  const roll=Math.min(1,(k.outroT-1.5)/2),x=4880+(s.riley.x-52-4880)*roll;
  crown?.setPosition?.(x,s.riley.y);crown?.setRotation?.((1-roll)*12);crown?.setDepth?.(1001+s.riley.y);
 }
 if(k.walk&&k.story.heard.has('riley_st8_final_01')){
  if(!wrapper){wrapper=s.add?.graphics?.();wrapper?.fillStyle?.(0xf1d9ac,1);wrapper?.fillRect?.(-4,-2,8,4);}
  const age=Math.min(2,k.walkT);wrapper?.setPosition?.(s.riley.x-60-age*70,s.riley.y-80+age*35);wrapper?.setRotation?.(age*4);wrapper?.setDepth?.(1002+s.riley.y);
 }
 for(let i=0;i<6;i++)effect('ridge'+i,i<3?'s8allies':'s8ashaman',cam+110+i*210,480,Math.floor(t*3)%3,.75,.8,970);
 effect('taim','s8taim',cam+1050,490,k.story.active==='C3'?3:k.volley?.active?1:0,.9,1,975);
 if(k.quality<2)for(let i=0;i<k.allies.vignettes.length;i++){const a=k.allies.vignettes[i];effect('ally'+i,a.key,a.x,a.y,a.down?7:Math.floor(t*4)%3,a.alpha,.8,990);}
 if(s.zoneI===2&&!k.circle.done){effect('chest','s8chest',3350,610,k.randFree?2:Math.min(1,Math.floor(k.pips.size/3)),1,1,1500);effect('captive','s8twink',3730,625,13,1,1,1624);const dome=effect('dome','s8dome',3730,650,Math.min(3,k.circle.count),.7,1,1670);dome?.setDisplaySize?.(360,260);if(k.circle.phase==='break')effect('callandor','s8callfx',s.riley.x,610,Math.floor(t*6)%3,1,1.2,1800);}
 for(const e of s.enemies||[])if(e.type==='sister'&&e.alive){if(e.bubble){const n=effect('bubble'+e.id,'s8weave',e.x,e.y,0,.5,1,1000+e.y+1);n?.setDisplaySize?.(140,190);}if(e.state==='attack'){const n=effect('bind'+e.id,'s8weave',cam+640,e.aimY,2,.65,1,1001);n?.setDisplaySize?.(1280,20);}}
 if(k.circle.whip){const n=effect('circlewhip','s8weave',cam+640,bandY8(k.circle.whip.band),2,.8,1,1002);n?.setDisplaySize?.(1280,25);}
 if(k.clash){const r=s.riley;r.sprite?.setAlpha?.(0);effect('duo','s8duo',r.x,r.y,3,1,1,1000+r.y+2);const beam=effect('clash','s8clash',cam+700,590,0,1,1,1700);beam?.setDisplaySize?.(850,128);}else if(k.link.enabled)s.riley.sprite?.setAlpha?.(1);
 if(k.link.enabled){const c=k.link.companion;const pose={idle:0,skip:1,run:3,hop:5,cheer:6,spark:7,channel:8,brace:10,kneel:11,pull:12};const n=effect('twinkle','s8twink',c.x,c.y-c.z,k.walk?14+Math.floor(t*5)%4:pose[c.pose]||0,1,1,1000+c.y);if(n)n.flipX=c.facing<0;const tether=effect('link','s8link',(c.x+s.riley.x)/2,c.y-65,0,.85,1,1000+c.y+1);tether?.setDisplaySize?.(80,12);const aura=effect('aura','s8linkaura',s.riley.x,s.riley.y+8,0,.3,1,999+s.riley.y);aura?.setDisplaySize?.(160,50);}
 if(s.zoneI===3){effect('door','s8door',4880,650,k.outro?(k.outroT<2?2:3):1,1,1,985);for(let i=0;i<k.arena.tells.length;i++){const b=k.arena.tells[i],n=effect('bossTell'+i,'s8tell',cam+640,bandY8(b.band),0,.8,1,1002);n?.setDisplaySize?.(1280,26);}for(let i=0;i<k.arena.balls.length;i++){const b=k.arena.balls[i];effect('bossBall'+i,'s8fireball',b.x,b.y-100,b.kind==='great'?2:0,1,b.kind==='great'?1.5:1,1600);}for(let i=0;i<k.arena.stars.length;i++){const b=k.arena.stars[i],n=effect('star'+i,'s8star',b.x,b.y,1,.85,1,1002);n?.setDisplaySize?.(140,42);}if(s.boss?.state==='grab_tell'){const n=effect('grabTell','s8tell',cam+640,s.boss.grabY,0,.85,1,1002);n?.setDisplaySize?.(1280,32);}}
 const a=k.volley.active;if(a){for(let lane=0;lane<3;lane++){if(lane===a.safe){const n=effect('safe'+lane,'s8tell',cam+640,bandY8(lane),0,.65,1,1000);n?.setDisplaySize?.(1200,5);n?.setTint?.(0xe6f5ff);continue;}const tell=effect('tell'+lane,'s8tell',cam+640,bandY8(lane),0,a.t<3?.55+.25*Math.sin(t*12):.25,1,1001);tell?.setDisplaySize?.(1280,32);if(a.t>=3){effect('earth'+lane,'s8earth',a.x,bandY8(lane),Math.floor(t*10)%6,1,1,1000+bandY8(lane));const fire=effect('fire'+lane,'s8fire',cam+640,bandY8(lane),Math.floor(t*10)%4,a.t>3.4&&a.t<6.3?.8:.2,1,1000+bandY8(lane));fire?.setDisplaySize?.(1280,80);}}}
 for(let i=0;i<k.arrows.length;i++){const a=k.arrows[i];effect('arrow'+i,a.bolt?'s8bolt':'s7arrow',a.x,a.y-40,0,1,1,1500);}
 for(let i=0;i<k.bursts.length;i++){const b=k.bursts[i];const n=effect('burst'+i,'s8bolt',b.x,b.y,1,1,1,1001);n?.setDisplaySize?.(144,40);}
 const w=k.allies.wolf;if(w){for(let i=0;i<6;i++)effect('wolf'+i,i?'s8wolfpack':'s8wolflead',w.x-i*75,bandY8(w.lane),Math.floor(t*10)%(i?6:8),w.t<1.2?.35:1,i?1:1.6,1000+bandY8(w.lane));}
 if(k.strike){effect('call',k.strike.provider==='mat'?'s8mat':'s6rand',cam+120+k.strike.t*1000,s.riley.y,k.strike.provider==='mat'?4+Math.floor(k.strike.t*3)%2:1,1,1,1000+s.riley.y+2);}
 if(k.matJoined&&!k.randFree)effect('mat','s8mat',cam+100,590,Math.floor(t*4)%3,.8,1,980);
 if(k.quality<2){const smoke=effect('smoke','bg8smoke',cam+640+Math.sin(t*.08)*80,520,0,.16,1,976);smoke?.setDisplaySize?.(1440,200);}
 if(k.quality<3){const fg=effect('fg',z<2?'bg8fg':'bg8fg2',cam+640,860,0,.85,1,1900);fg?.setDisplaySize?.(1280,160);fg?.setAlpha?.(0,0,.85,.85);}
 },destroy(){crown?.destroy?.();wrapper?.destroy?.();for(const n of fx.values())n?.destroy?.();fx.clear();for(const n of nodes.values())n?.destroy?.();nodes.clear();},
};}
