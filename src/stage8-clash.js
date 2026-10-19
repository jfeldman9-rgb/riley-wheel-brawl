import {freezeStrike,thawStrike} from './stage7-freeze.js';
import {releaseHolds8} from './stage8-hooks.js';
import {strikeRiley} from './stage6-hurt.js';
export const CLASH8=Object.freeze({window:4,need:2,press:.25,auto:6,win:.06,stun:2,push:120,failDmg:14});
export function createClash8(final=false){return {final,t:0,push:0,done:false,won:false,presses:0};}
export function advanceClash8(c,dt,pressed=false,held=false){if(c.done)return c;c.t+=dt;if(pressed)c.presses++;c.push=Math.min(2,c.push+(held?dt:pressed?.25:0));if(c.push+1e-9>=2||c.final&&c.t+1e-9>=6){c.done=c.won=true;}else if(!c.final&&c.t+1e-9>=4)c.done=true;return c;}
export function beginClash8(k,final=false){if(k.clash||k.outro)return false;releaseHolds8(k.s);k.clearHazards();k.clash=createClash8(final);freezeStrike(k);
 if(final){k.s.boss.phase=4;k.story.say('st8_lanfear_final_01');}else{k.story.say('riley_st8_clash_01');}
 k.hint('TOGETHER — HOLD OR TAP SPECIAL');return true;
}
export function stepClash8(k,dt){const c=k.clash;if(!c)return;const s=k.s;
 s.inp?.pollPad?.();s.bot?.update?.(dt);
 const pressed=!!s.inp?.take?.('special'),held=!!(s.inp?.held?.special||s.inp?.touchHeld?.special||s.inp?.touchHeld?.pad1);
 advanceClash8(c,dt,pressed,held);
 // The world task clock is frozen during a clash. Give Riley's 1.78 s call time to finish.
 if(!c.final&&!c.ttSaid&&c.t>=.5&&!c.done){c.ttSaid=true;k.story.say('st8_tt_clash_01',{wait:2.5});}
 k.view?.sync(k);if(!c.done)return;
 k.stats.clashes=(k.stats.clashes||0)+1;k.stats.clashWins=(k.stats.clashWins||0)+(c.won?1:0);k.clashLog ||= [];k.clashLog.push({...c});k.clash=null;thawStrike(k);
 const b=s.boss;if(c.final){b.hp=0;b.alive=false;b.setState('pushed');s.bossDown(b);return;}
 if(c.won){b.takeHit({dmg:b.maxHp*.06,kind:'clash'});b.setState('stagger');b.assistDown=2;b.anchorX=Math.min(4800,b.anchorX+120);b.x=b.anchorX;k.story.say('st8_lanfear_hurt_01');}
 else strikeRiley(s,14,{source:'lanfear.clash',fromX:b.x,down:true});
}
