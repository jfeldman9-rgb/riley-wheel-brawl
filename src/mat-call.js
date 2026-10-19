import {randEffect,allocateStrikes as allocateRand,bossFloor,onScreen} from './rand-call.js';
export const CALL8=Object.freeze({charges:1,maxCharges:1,kos:10,recharge:45,maxCalls:4,perPhase:1,bossFrac:.06,humanFrac:.6,humanDown:1.6,humanYield:.4,eliteFrac:.75,eliteDown:2,inv:2,stagger:1,gates:Object.freeze([.66,.33]),mat:Object.freeze({time:1.1,kos:5})});
export const provider8=randFree=>randFree?'rand':'mat';
export function createCall8(){return {charges:1,calls:0,kos:0,since:45,phaseCalls:Object.create(null),on:false,switched:false};}
export function switchCall8(st,beat){if(beat!=='C5'||st.switched)return false;st.switched=true;st.charges=st.calls<4?1:0;st.since=45;st.kos=0;return true;}
export function noteRileyKo8(st){if(st.charges<1&&st.calls<4)st.kos++;return st.kos;}
export function tickCall8(st,dt){st.since+=Math.max(0,dt);if(st.charges<1&&st.calls<4&&st.kos>=10&&st.since>=45){st.charges=1;st.kos=0;}}
export function refuse8(st,c){if(!st)return 'nostate';if(c.paused||c.cutscene)return 'paused';if(c.victory||c.dead)return 'victory';if(st.on||c.strike)return 'busy';if(c.balefire)return 'balefire';if(!c.joined)return 'locked';if(st.calls>=4)return 'spent';if(st.charges<1)return 'empty';if(!c.hittable)return 'no-target';if(c.bossBeat||c.bossInvuln||c.clash)return 'boss';if(c.bossPhase&&st.phaseCalls[c.bossPhase])return 'phase';return '';}
export const canCall8=(st,c)=>!refuse8(st,c);
export function takeCall8(st,c){const why=refuse8(st,c);if(why)return {ok:false,why};st.charges=0;st.calls++;st.kos=0;st.since=0;st.on=true;if(c.bossPhase)st.phaseCalls[c.bossPhase]=1;return {ok:true,provider:provider8(c.randFree)};}
export function eligible8(enemies,cam){return (enemies||[]).filter(e=>onScreen(e,cam)&&['dancer','veiled','stonedog','wiseone','sister','lanfear'].includes(e.type));}
export function allocate8(targets,provider,y){return provider==='mat'?targets.filter(e=>Math.abs(e.y-y)<40).slice(0,5):allocateRand(targets).bolts;}
export function callEffect8(e,provider,presentation){
 if(!e?.alive)return null;
 if(e.type==='lanfear'){
  // Reuse Rand's exact 6% clamp, with the Stage 8 boss identity adapter.
  const proxy={...e,type:'belal'},out=randEffect(proxy);if(!out)return null;
  e.hp=Math.max(bossFloor(e),proxy.hp);e.randStagger=1;e.setState?.('stagger');e.counterUsed=true;return out;
 }
 const elite=!!(e.buckler||e.bubble);e.popGuard?.();e.assistKill=true;
 const before=e.hp;e.hp=Math.max(1,e.hp*(1-(elite?.75:.6)));e.assistDown=elite?2:1.6;e.setState?.('down');
 if(before<=e.maxHp*.4)e.yield?.();return {dmg:before-e.hp,killed:false,down:e.assistDown};
}
