// Optional reviewed clips. Strike resolution never depends on video readiness/playback.
import { CutscenePlayer, cutscenesEnabled } from './cutscene.js';
import { q, rand } from './config.js';
export const CALL7_BASE = 'assets/cutscenes/call7/';
export const CALL7_IDS = Object.freeze({ moiraine: Object.freeze(['M1','M2']), lan: Object.freeze(['L1','L2']), duo: Object.freeze(['D1','D2']) });
export const CALL7_PRESENT = Object.freeze({ moiraine: [], lan: [], duo: [] });
export function createBag7(helper, storage, rng = () => rand(0,1), pool = CALL7_IDS[helper]) {
  const key = 'rwb-call7-bag-' + helper; let saved;
  try { saved = JSON.parse(storage?.getItem?.(key) || '{}'); } catch { saved = {}; }
  let last = pool.includes(saved?.last) ? saved.last : '', rest = Array.isArray(saved?.rest) ? [...new Set(saved.rest.filter(id=>pool.includes(id)))] : [];
  const save=()=>{try{storage?.setItem?.(key,JSON.stringify({last,rest}));}catch{/* private mode */}};
  const refill=()=>{if(rest.length||!pool.length)return;rest=pool.slice();for(let i=rest.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]];}if(rest.length>1&&rest[0]===last)[rest[0],rest[1]]=[rest[1],rest[0]];save();};
  return { peek(){refill();return rest[0];}, next(){refill();last=rest.shift();save();return last;} };
}
export function createCall7Video(scene, root = scene.cutRoot || globalThis, present = CALL7_PRESENT) {
  let url=null,id=null,prediction=null,version=0,controller=null,handle=null,player=null,disposed=false,oldGain=null;
  let storage;try{storage=root.sessionStorage;}catch{/* storage blocked */}
  const bags=Object.fromEntries(Object.keys(CALL7_IDS).map(k=>[k,createBag7(k,storage,undefined,present[k])]));
  const drop=()=>{version++;controller?.abort?.();controller=null;if(url)root.URL?.revokeObjectURL?.(url);url=null;id=null;};
  const unduck=()=>{if(oldGain!==null&&scene.music)scene.music.gainMul=oldGain;oldGain=null;};
  const api={
    get blobCount(){return url?1:0;}, get active(){return !!handle?.active;},
    async warm(helper){
      if(disposed||!cutscenesEnabled(q,root.navigator)||(scene.kit?.quality||0)>=4){drop();prediction=null;return false;}
      if(prediction===helper)return !!url;prediction=helper;drop();const next=bags[helper]?.peek();if(!next)return false;
      const v=version;controller=root.AbortController?new root.AbortController():null;
      try{const res=await root.fetch(CALL7_BASE+next+'.mp4',{signal:controller?.signal});if(!res.ok)return false;const blob=await res.blob();if(disposed||v!==version)return false;url=root.URL.createObjectURL(blob);id=next;return true;}catch{return false;}
    },
    play(helper){
      if(disposed||!present[helper]?.length||!cutscenesEnabled(q,root.navigator)||handle?.active)return false;
      const next=bags[helper].next();
      try{
        player ||= new CutscenePlayer(root,{base:CALL7_BASE,startMs:1500,stallMs:1500,maxMs:11000,guardMs:900});
        player.srcOf=key=>key===id&&url?{src:url,poster:CALL7_BASE+key+'.jpg'}:null;
        if(scene.music){oldGain=scene.music.gainMul??1;scene.music.gainMul=.35;}
        let finished=false;
        const h=player.play([next],{touch:!!scene.inp?.isTouch,done(){finished=true;handle=null;unduck();drop();prediction=null;scene.inp?.flushPresses?.();}});
        if(!finished)handle=h;return true;
      }catch{api.abort();return false;}
    },
    bless(){try{player ||= new CutscenePlayer(root,{base:CALL7_BASE,startMs:1500,stallMs:1500,maxMs:11000,guardMs:900});player.bless();}catch{/* no DOM */}},
    drop(){drop();prediction=null;},
    abort(){const h=handle;handle=null;h?.abort?.();try{player?.video?.pause();}catch{/* detached */}unduck();drop();prediction=null;},
    destroy(){disposed=true;api.abort();root.document?.removeEventListener?.('pointerdown',bless,true);root.document?.removeEventListener?.('touchend',bless,true);player=null;},
  };
  const bless=()=>{if(Object.values(present).some(a=>a.length))api.bless();};
  root.document?.addEventListener?.('pointerdown',bless,true);root.document?.addEventListener?.('touchend',bless,true);
  return api;
}
