import {stepClash8} from './stage8-clash.js';
import {hook8,releaseHolds8} from './stage8-hooks.js';
import {stage4Delta} from './stage4-time.js';
import {freezeStrike,thawStrike} from './stage7-freeze.js';
import {eligible8,allocate8,takeCall8,callEffect8,noteRileyKo8,provider8} from './mat-call.js';
import {rand} from './config.js';
import {stage8Say} from './stage8-voice.js';
export function call8Context(k){const s=k.s,b=s.boss;return {joined:!!(k.matJoined||k.randFree),randFree:k.randFree,paused:!!s.paused,cutscene:!!(s.cutscene||k.scripted),victory:!!(s.victoryPending||s.ended||s.gameOver),dead:s.riley?.alive===false,strike:!!k.strike,balefire:!!s.beam,clash:!!k.clash,bossBeat:!!(b?.beat||b?.volleyHold),bossInvuln:!!b?.invuln,bossPhase:b?.alive?b.phase:0,hittable:allocate8(eligible8(s.enemies,s.camX||0),provider8(k.randFree),s.riley?.y||0).length>0};}
export function call8(k){const s=k.s;if(!s.started)return false;const result=takeCall8(k.call,call8Context(k));if(!result.ok){if(k.clock>=(k.refuseAt||0)){stage8Say('riley_st8_wait_01',s.caption);k.refuseAt=k.clock+2.5;}return false;}
 releaseHolds8(s);s.riley.inv=Math.max(s.riley.inv||0,2);const p=result.provider;
 k.strike={provider:p,t:0,duration:1.1,resolved:false,presentation:rand(0,1)<.5?'dice':'sweep'};freezeStrike(k);k.video?.play(p);k.stats.calls++;
 stage8Say(p==='mat'?'riley_st8_call_01':'riley_st8_call_02',s.caption);return true;
}
export function endCall8(k){k.video?.abort();k.strike=null;k.call.on=false;thawStrike(k);}
export function stepCall8(k,dt){const st=k.strike;if(!st)return;st.t+=dt;
 if(!st.resolved&&st.t>=.45){st.resolved=true;for(const e of allocate8(eligible8(k.s.enemies,k.s.camX||0),st.provider,k.s.riley.y))callEffect8(e,st.provider,st.presentation);stage8Say(st.provider==='mat'?'st8_mat_call_0'+(1+k.call.calls%2):'rand_call_01',k.s.caption);}
 k.view?.sync(k);if(st.t>=st.duration&&(!k.video?.active||st.t>=11)){k.s.riley.inv=Math.max(k.s.riley.inv||0,2);endCall8(k);}
}
export function installLifecycle8(k){const s=k.s;
 hook8(k,s,'onPress',old=>function(action){if(k.credits.press(action)){this.inp?.flushPresses?.();return;}if(k.clash&&action==='special')return;return old.call(this,action);});
 hook8(k,s,'callLoial',()=>()=>call8(k));
 hook8(k,s,'onEnemyDie',old=>function(e){if(e&&!e.assistKill&&!e.T?.boss)noteRileyKo8(k.call);return old.call(this,e);});
 for(const method of ['rileyDied','continueGame'])hook8(k,s,method,old=>function(){releaseHolds8(s);k.clash=null;endCall8(k);return old.apply(this,arguments);});
 hook8(k,s,'update',old=>function(time,ms){if(k.destroyed||this.paused||this.cutscene)return;
  if(k.clash){stepClash8(k,stage4Delta(ms/1000));return;}
  if(k.strike){stepCall8(k,stage4Delta(ms/1000));return;}
  const elapsed=stage4Delta(ms/1000)*1000,n=Math.max(1,Math.ceil(elapsed/50));for(let i=0;i<n;i++){if(this.paused||this.cutscene||k.destroyed)break;old.call(this,time-elapsed+(i+1)*elapsed/n,elapsed/n);}
 });
}
