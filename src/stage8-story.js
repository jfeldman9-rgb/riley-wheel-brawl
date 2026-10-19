import {LINES,stage8Say,lineHold8,holdCutscene8} from './stage8-voice.js';
import {playStage8Video,CLIPS8} from './stage8-video.js';
import {demand8,releaseKeys8} from './stage8-load.js';
export const BEATS8=Object.freeze({
 C1:{clip:'intro',ids:['st8_story_01','st8_story_02','st8_story_03','st8_rand_box_01','st8_lews_01','st8_rand_box_02','st8_lews_02','st8_rand_box_03','st8_lews_03','riley_st8_story_01','riley_st8_story_02']},
 C2:{ids:['st8_perrin_01']},C2b:{ids:['st8_perrin_02','st8_mat_join_01','riley_st8_mat_01','st8_mat_join_02']},
 C3:{clip:'taim',ids:['st8_taim_intro_01','st8_taim_kill_01']},
 C4:{clip:'circle',ids:['riley_st8_callandor_01','riley_st8_circle_02']},
 C5:{ids:['st8_rand_free_01','st8_mat_handover_01']},
 C6:{clip:'link',ids:['st8_tt_link_01','riley_st8_link_01','st8_tt_link_02','riley_st8_link_02']},
 C7:{panels:['story8m1'],ids:['st8_lanfear_intro_01','st8_tt_lanfear_01','st8_lanfear_motive_01','st8_lanfear_motive_02','st8_tt_lanfear_02','riley_st8_lanfear_01','st8_lanfear_intro_02']},
 C8:{clip:'finale',ids:['st8_lanfear_final_01','st8_lanfear_final_02','st8_tt_final_01','riley_st8_final_01']},
 C8walk:{ids:['st8_tt_final_01','riley_st8_final_01']},
 C9:{ids:['st8_rand_clear_01','st8_perrin_clear_01','st8_story_end_01']},
});
export function createStory8(k,player=playStage8Video){
 const s=k.s,seen=new Set(),heard=new Set(),queue=[];let active=null,dead=false,loading=false;
 function release(keys){releaseKeys8(k,keys);}
 const api={seen,heard,get active(){return active;},
  mark(id){heard.add(id);},
  say(id){if(heard.has(id))return false;heard.add(id);stage8Say(id,s.caption);return true;},
  play(name,done,live=false){if(dead||seen.has(name))return false;if(active||s.cutscene){queue.push([name,done,live]);return true;}
   const b=BEATS8[name];if(!b)return false;seen.add(name);active=name;
   const keys=b.panels||CLIPS8[b.clip]?.panels||[];
   const finish=()=>{if(dead)return;release(keys);active=null;if(s.music?.state==='cutscene')s.music.resumeFight?.();done?.();const next=queue.shift();if(next)api.play(...next);};
   const fallback=()=>{const ids=b.ids.filter(id=>!heard.has(id)&&!(name==='C8'&&['st8_tt_final_01','riley_st8_final_01'].includes(id)));
    if(!ids.length)return finish();
    // Caption deck: each line gets its own recording length, so none is cut by the next.
    const deck=()=>{let at=0;for(const id of ids){k.later(at,()=>api.say(id));at+=Math.max(3.8,lineHold8(id,.6));}k.later(at,finish);};
    if(!keys.length||live||s.bot&&name!=='C1'||typeof s.startCutscene!=='function')return deck();
    // C1 is a held opening even in demo mode. Hold during its asynchronous art
    // demand too; startCutscene takes ownership of the same pause reason.
    if(name==='C1'){loading=true;s.setPauseReason?.('cutscene',true);}
    demand8(k,keys,()=>{if(dead)return;
     const script=ids.map((id,i)=>({id,who:LINES[id][0],text:LINES[id][1],panel:name==='C1'?(id.startsWith('riley_')?3:1):Math.min(keys.length-1,Math.floor(i*keys.length/ids.length)),voice:lineHold8(id)}));
     const ended=()=>{for(const id of ids)heard.add(id);finish();};
     const started=s.startCutscene(script,keys.map(key=>({key})),ended);if(started!==false)holdCutscene8(s.cutscene);
     if(loading){loading=false;if(started===false&&!s.cutscene)s.setPauseReason?.('cutscene',false);}
     if(started===false)deck();
    });
   };
   // A full finale clip repeats the P4 scream. Until a reviewed continuation
   // cut is supplied, use panels when the scream has already played.
   if(!b.clip||name==='C8'&&heard.has('st8_lanfear_final_01')||!player(s,b.clip,(how,failed)=>{if(failed)fallback();else{for(const id of b.ids)heard.add(id);finish();}}))fallback();
   return true;
  },
  destroy(){dead=true;if(loading){loading=false;s.setPauseReason?.('cutscene',false);}queue.length=0;for(const b of Object.values(BEATS8))release(b.panels||CLIPS8[b.clip]?.panels||[]);active=null;}
 };return api;
}
