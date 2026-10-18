import {isPainted} from './stage6-paint.js';
export const FRAMES8=Object.freeze({
 s8stonedog:{idle:[0],walk:[1,2,3,4],attack:[5],lunge:[6,7],stagger:[8],hurt:[9],yield:[10],down:[11],held:[8],thrown:[11]},
 s8wise:{idle:[0],walk:[1,2,3,4],attack:[5,6],cast:[7],earth:[8],hurt:[9],stagger:[9],yield:[10],down:[10]},
 s8sister:{idle:[0],walk:[1,2],attack:[3,4],holding:[4],reweave:[5],hurt:[6],yield:[7],down:[7]},
 s8lanfear:{idle:[0],walk:[2,3],attack:[5,6,8],mirror:[7],gateway:[15],shield:[20],great:[16],lunge:[10],grab_tell:[14],tantrum:[18],hurt:[11],stagger:[12],pushed:[21],fall:[13],yield:[22],down:[22]},
 s8taim:{idle:[0],watch:[0],alias:[5],arrival:[3],attack:[1],channel:[2],point:[4]},
});
export function frame8(s,key,state,t=0,fallback=0){if(!isPainted(s,key))return fallback;const a=FRAMES8[key]?.[state]||[0];return a[['walk','channel'].includes(state)?Math.floor(t*8)%a.length:Math.min(a.length-1,Math.floor(t*8))];}
export function safeFrame8(s,key,frame){const texture=s.textures?.get?.(key);return texture?.has&&!texture.has(frame)?(texture.firstFrame||'__BASE'):frame;}
