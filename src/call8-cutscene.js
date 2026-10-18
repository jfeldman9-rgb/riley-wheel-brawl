import {CutscenePlayer,cutscenesEnabled} from './cutscene.js';
import {q,rand} from './config.js';
export const CALL_CLIPS8=Object.freeze({mat:Object.freeze([]),rand:Object.freeze(['R1','R2','R3'])});
export const CALL_PENDING8=Object.freeze(['M1','M2','M3']);
export function bag8(storage,key,ids,rng=()=>rand(0,1)){
 let rest=[],last='';try{const v=JSON.parse(storage?.getItem?.(key)||'{}');rest=(v.rest||[]).filter(x=>ids.includes(x));last=v.last||'';}catch{}
 function fill(){if(rest.length||!ids.length)return;rest=ids.slice();for(let i=rest.length-1;i>0;i--){const j=Math.floor(rng()*(i+1)),v=rest[i];rest[i]=rest[j];rest[j]=v;}if(rest.length>1&&rest[0]===last){const v=rest[0];rest[0]=rest[1];rest[1]=v;}}
 return {peek(){fill();return rest[0];},next(){fill();last=rest.shift();try{storage?.setItem?.(key,JSON.stringify({rest,last}));}catch{}return last;}};
}
export function createCall8Video(s){const root=s.cutRoot||globalThis;let storage;try{storage=root.sessionStorage;}catch{}
 const bags={mat:bag8(storage,'rwb-call8-bag-mat',CALL_CLIPS8.mat),rand:bag8(storage,'rwb-rand-bag',CALL_CLIPS8.rand)};
 let blob=null,id=null,provider=null,version=0,handle=null,player=null,dead=false;
 const base=p=>'assets/cutscenes/'+(p==='mat'?'call8':'rand')+'/';
 const api={get active(){return !!handle;},get blobCount(){return blob?1:0;},
 drop(){version++;if(blob)root.URL?.revokeObjectURL?.(blob);blob=null;id=null;},
 warm(p){if(dead||s.bot||!cutscenesEnabled(q,root.navigator)||!root.document?.createElement||s.kit.quality>=4)return Promise.resolve(false);const next=bags[p].peek();if(p===provider&&id===next)return Promise.resolve(!!blob);api.drop();provider=p;id=next;const v=version;if(!next)return Promise.resolve(false);
  return Promise.resolve().then(()=>root.fetch(base(p)+next+'.mp4')).then(r=>r.ok?r.blob():null).then(b=>{if(!b||dead||v!==version)return false;blob=root.URL?.createObjectURL?.(b);return !!blob;}).catch(()=>false);
 },
 play(p){if(dead||s.bot||!CALL_CLIPS8[p].length||!cutscenesEnabled(q,root.navigator)||!root.document?.createElement)return false;const next=bags[p].next();
  try{if(!player)player=new CutscenePlayer(root,{base:base(p),startMs:1500,stallMs:1500,maxMs:11000,guardMs:900});player.srcOf=key=>({src:blob&&id===key?blob:base(p)+key+'.mp4',poster:base(p)+key+'.jpg'});handle=player.play([next],{touch:!!s.inp?.isTouch,done(){handle=null;api.drop();}});return true;}catch{api.abort();return false;}
 },
 abort(){handle?.abort?.();handle=null;api.drop();},
 destroy(){dead=true;api.abort();root.document?.removeEventListener?.('pointerdown',bless,true);root.document?.removeEventListener?.('touchend',bless,true);}
 };
 function bless(){try{if(!player)player=new CutscenePlayer(root,{base:'assets/cutscenes/',startMs:1500,stallMs:1500,maxMs:11000,guardMs:900});player.bless();}catch{}}
 root.document?.addEventListener?.('pointerdown',bless,true);root.document?.addEventListener?.('touchend',bless,true);return api;
}
