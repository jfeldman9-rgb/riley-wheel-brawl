import {SKIP_ACTIONS} from './cutscene.js';
import {demand8,releaseKeys8} from './stage8-load.js';
export const CREDITS8=Object.freeze(['RILEY WHEEL BRAWL','RILEY & TWINKLE TOES','A Wheel of Time adventure','Created for Riley by Jason','Thank you for playing']);
export function createCredits8(k){const s=k.s;let nodes=[];return {active:false,t:0,done:false,
 start(){if(this.active||this.done)return;this.active=true;this.t=0;demand8(k,['s8credits'],()=>{if(!this.active||k.destroyed)return;
  const bg=s.add?.image?.(640,360,'s8credits');bg?.setScrollFactor?.(0);bg?.setDisplaySize?.(1280,720);bg?.setDepth?.(8000);if(bg)nodes.push(bg);});s.music?.backend?.('stage1',{fade:2,restart:false});
  for(let i=0;i<CREDITS8.length;i++){const n=s.add?.text?.(640,760+i*100,CREDITS8[i],{fontFamily:'serif',fontSize:i?'28px':'44px',color:'#fff2cc',align:'center'});n?.setOrigin?.(.5);n?.setScrollFactor?.(0);n?.setDepth?.(8001);if(n){n._creditRow=i;nodes.push(n);}}
 },
 press(a){if(!this.active||!SKIP_ACTIONS.has(a))return false;this.finish();return true;},
 step(dt){if(!this.active)return;this.t+=dt;for(const n of nodes)if(n._creditRow!==undefined)n.setPosition?.(640,760+n._creditRow*100-this.t*50);if(this.t>=28)this.finish();},
 finish(){if(this.done)return;this.done=true;this.active=false;for(const n of nodes)n.destroy?.();nodes=[];releaseKeys8(k,['s8credits']);s.ended=true;s.hud?.stageClear?.(s.stats());k.hint('CAMPAIGN COMPLETE');s.clearShown=true;k.later(3,()=>s.scene?.restart?.({stage:1,campaignComplete:true}));},
 destroy(){this.active=false;for(const n of nodes)n.destroy?.();nodes=[];}
};}
export function outroWalkDone8(x,t){return x>=4900||t>=20;}
