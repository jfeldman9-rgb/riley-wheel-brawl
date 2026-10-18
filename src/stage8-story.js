import {LINES,stage8Say} from './stage8-voice.js';
import {playStage8Video,CLIPS8} from './stage8-video.js';
import {demand8} from './stage8-load.js';
export const BEATS8=Object.freeze({
 C1:{clip:'intro',ids:['st8_story_01','st8_story_02','st8_story_03','st8_rand_box_01','st8_lews_01','st8_rand_box_02','st8_lews_02','st8_rand_box_03','st8_lews_03','riley_st8_story_01','riley_st8_story_02']},
 C2:{ids:['st8_perrin_01']},C2b:{ids:['st8_perrin_02','st8_mat_join_01','riley_st8_mat_01','st8_mat_join_02']},
 C3:{clip:'taim',ids:['st8_taim_intro_01','st8_taim_kill_01']},
 C4:{clip:'circle',ids:['riley_st8_callandor_01','riley_st8_circle_02']},
 C5:{ids:['st8_rand_free_01','st8_mat_handover_01']},
 C6:{clip:'link',ids:['st8_tt_link_01','riley_st8_link_01','st8_tt_link_02','riley_st8_link_02']},
 C7:{panels:['story8m1'],ids:['st8_lanfear_intro_01','st8_tt_lanfear_01','st8_lanfear_motive_01','st8_lanfear_motive_02','st8_tt_lanfear_02','riley_st8_lanfear_01','st8_lanfear_intro_02']},
 C8:{clip:'finale',ids:['st8_lanfear_final_01','st8_lanfear_final_02','st8_tt_final_01','riley_st8_final_01']},
 C9:{ids:['st8_rand_clear_01','st8_perrin_clear_01','st8_story_end_01']},
});
export function createStory8(k,player=playStage8Video){
 const s=k.s,seen=new Set(),heard=new Set(),queue=[];let active=null,dead=false;
 function release(keys){for(const key of keys)if(s.textures?.exists?.(key))s.textures.remove?.(key);}
 const api={seen,heard,get active(){return active;},
  mark(id){heard.add(id);},
  say(id){if(heard.has(id))return false;heard.add(id);stage8Say(id,s.caption);return true;},
  play(name,done,live=false){if(dead||seen.has(name))return false;if(active||s.cutscene){queue.push([name,done,live]);return true;}
   const b=BEATS8[name];if(!b)return false;seen.add(name);active=name;
   const keys=b.panels||CLIPS8[b.clip]?.panels||[];
   const finish=()=>{if(dead)return;release(keys);active=null;done?.();const next=queue.shift();if(next)api.play(...next);};
   const fallback=()=>{const ids=b.ids.filter(id=>!heard.has(id));
    if(!ids.length)return finish();
    if(live||s.bot||typeof s.startCutscene!=='function'){
     ids.forEach((id,i)=>k.later(i*3.8,()=>api.say(id)));k.later(ids.length*3.8,finish);return;
    }
    demand8(k,keys,()=>{if(dead)return;
     const script=ids.map((id,i)=>({id,who:LINES[id][0],text:LINES[id][1],panel:Math.min(keys.length-1,Math.floor(i*keys.length/ids.length))}));
     const ended=()=>{for(const id of ids)heard.add(id);finish();};
     if(s.startCutscene(script,keys.map(key=>({key})),ended)===false) {ids.forEach(id=>api.say(id));finish();}
    });
   };
   if(!b.clip||!player(s,b.clip,(how,failed)=>{if(failed)fallback();else{for(const id of b.ids)heard.add(id);finish();}}))fallback();
   return true;
  },
  destroy(){dead=true;queue.length=0;for(const b of Object.values(BEATS8))release(b.panels||CLIPS8[b.clip]?.panels||[]);active=null;}
 };return api;
}
