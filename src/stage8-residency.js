// Residency is independent of story/video availability. Release the circle before
// loading the duo, and load the boss only after C6 completes.
import {demand8,releaseKeys8} from './stage8-load.js';
const reuse=['s7dancer','s7veiled','s7crate','s7planks','s7ribbon','s7arrow'];
const ui=['lanfearPortrait','matPortrait','perrinPortrait','taimPortrait','twinkPortrait','s8banner'];
const field=['s8stonedog','s8allies','s8perrin'];
export const VOLLEY_KEYS8=Object.freeze(['s8ashaman','s8taim','s8earth','s8fire','s8tell']);
const circle=['s8sister','s8weave','s8twink','s8dome','s8callfx','s8chest','s6rand','s6call','randPortrait'];
const link=['s8twink','s8duo','s8link','s8linkaura','s6rand','randPortrait'];
export const ZONE_ART8=Object.freeze({
 Z0:[...reuse,...ui,...field],
 Z1:[...reuse,...ui,...field,...VOLLEY_KEYS8,'s8loial','s8mat','s8wise','s8bolt'],
 Z2:[...reuse,...ui,...field,...VOLLEY_KEYS8,'s8loial','s8mat','s8wise','s8bolt',...circle],
 C6:[...reuse,...ui,...VOLLEY_KEYS8,'s8stonedog','s8allies',...link],
 Z3:[...reuse,...ui,...VOLLEY_KEYS8,'s8stonedog','s8allies',...link,'s8lanfear','s8door','s8fireball','s8clash','s8star'],
});
export function phase8(k){return k.linked||k.s.zoneI===3?'Z3':k.circle?.phase==='link'?'C6':'Z'+Math.max(0,k.s.zoneI);}
export function desiredArt8(k){const phase=phase8(k),keys=new Set(ZONE_ART8[phase]);
 if(phase==='Z0'&&k.taimArrived)for(const key of VOLLEY_KEYS8)keys.add(key);
 if(k.matJoined&&!k.randFree)keys.add('s8mat');
 if(k.allies?.wolf)for(const key of ['s8wolfpack','s8wolflead'])keys.add(key);
 if(k.quality<3)keys.add(k.s.zoneI<2?'bg8fg':'bg8fg2');
 if(k.quality<2)keys.add('bg8smoke');return keys;
}
export function syncArt8(k){const next=desiredArt8(k),old=k.residentArt||new Set();
 releaseKeys8(k,[...old].filter(key=>!next.has(key)));
 k.residentArt=next;demand8(k,[...next]);
}
