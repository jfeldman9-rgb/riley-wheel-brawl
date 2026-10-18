import {STREAMS,residentKeys,plateRect} from './zone-stream.js';
import {STAGE8} from './stage8-def.js';
import {demand8} from './stage8-load.js';
export function createStage8View(s){const nodes=new Map();return {
 build(){this.layout();},
 layout(){const keep=residentKeys(s,STREAMS[8]);
 for(const [key,n]of nodes)if(!keep.has(key)){n?.destroy?.();nodes.delete(key);}
 for(const key of keep){if(!s.textures?.exists?.(key)){demand8(s.kit,[key],()=>this.layout());continue;}if(nodes.has(key))continue;
 const n=s.add?.image?.(0,0,key);if(!n)continue;nodes.set(key,n);n.setOrigin?.(0,0);
 if(key==='bg8far'){n.setScrollFactor?.(.15);n.setDisplaySize?.(1800,580);n.setDepth?.(-30);}
 else{const i=STREAMS[8].zones.findIndex(z=>z.plate===key||z.floor===key),r=plateRect(i,STAGE8.zones,STREAMS[8].bleed);const floor=key.includes('floor');let w=r.w;
 if(key==='bg8floor2')w=STAGE8.zones[3].l-r.x+48;
 n.setPosition?.(r.x,floor?540:220);n.setDisplaySize?.(w,floor?360:360);n.setDepth?.(floor?-10:-20);}
 }
 },sync(){this.layout();},destroy(){for(const n of nodes.values())n?.destroy?.();nodes.clear();},
};}
