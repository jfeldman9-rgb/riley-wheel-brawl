import {syncPhone8} from './stage8-phone.js';
import {hook8} from './stage8-hooks.js';
import {provider8,canCall8} from './mat-call.js';
import {call8Context} from './stage8-lifecycle.js';
import {isPainted} from './stage6-paint.js';
export const SPEAKER8=Object.freeze({'LEWS THERIN':'#d8b25a',TAIM:'#e07a5f',LANFEAR:'#ef997e','BLACK AJAH':'#ef997e',SHAIDO:'#ef997e'});
export function paintStage8Hud(h,s){if(s?.stageNo===8){syncPhone8(s);
 if(h.bossName&&h._s8boss!==h.bossName){h._s8boss=h.bossName;h.bossName.setText?.('LANFEAR');h.bossPic?.setTexture?.('lanfearPortrait')?.setDisplaySize?.(68,68);}
 }if((s?.titleSel||s?.stageNo)===8)h.titleStageT?.setText?.("DUMAI'S WELLS — THE FINAL BATTLE");}
// A missing delivered panel keeps the paused caption deck, without presenting
// the generic procedural stand-in as the Rand-in-the-box scene.
export function paintStory8Line(h,s,line){if(s?.stageNo!==8||!h.cut)return;
 const panels=h.cut.panels||[],i=Math.max(0,Math.min(panels.length-1,line?.panel|0));
 h.cut.panel?.setVisible?.(isPainted(s,panels[i]?.key));
 if(SPEAKER8[line?.who])h.cut.who?.setColor?.(SPEAKER8[line.who]);
}
export function installStage8Hud(){if(typeof globalThis.Phaser==='undefined')return;
 return import('./hud.js').then(({HUD})=>{const p=HUD?.prototype;if(!p||p._s8hud)return;
 for(const key of ['update','titleCard','titleSelect']){const old=p[key];p[key]=function(){const out=old.apply(this,arguments);paintStage8Hud(this,this.stage);return out;};}
 const line=p.cutsceneLine;p.cutsceneLine=function(l){const out=line.apply(this,arguments);paintStory8Line(this,this.stage,l);return out;};
 const clear=p.stageClear;p.stageClear=function(stats){const out=clear.call(this,stats);if(stats.stage===8)for(const n of this.card?.list||[]){if(typeof n.text!=='string')continue;if(n.text.includes('CLEAR'))n.setText?.('CAMPAIGN COMPLETE');if(/^(PRESS ATTACK|TAP KICK)/.test(n.text))n.setText?.('RETURNING TO THE TITLE');}return out;};
 const cap=p.caption;p.caption=function(who,text){const out=cap.apply(this,arguments);if(this.stage?.stageNo===8&&SPEAKER8[who])this.capWho?.setColor?.(SPEAKER8[who]);return out;};p._s8hud=true;
 });
}

export function bindStage8Hud(h,k){let at=-1;hook8(k,h,'updateLoialLabel',()=>function(s,r){const ready=canCall8(k.call,call8Context(k));r.loialReady=ready;if(k.clock<at)return;at=k.clock+.25;const p=provider8(k.randFree),name=p.toUpperCase();this.loialT?.setText?.(k.call.on?name+'!':ready?name+' READY':k.call.calls>=4?'CALL SPENT':name+' '+Math.min(10,k.call.kos)+'/10');this.loialPic?.setTexture?.(p==='mat'?'matPortrait':'randPortrait')?.setDisplaySize?.(44,44);this.loialPic?.setAlpha?.(ready?1:.4);});
 hook8(k,h,'caption',old=>function(w,t){const out=old.call(this,w,t);if(SPEAKER8[w])this.capWho?.setColor?.(SPEAKER8[w]);return out;});
 const oldPic=h.loialPic?.texture?.key;k.cleanups.push(()=>h.loialPic?.setTexture?.(oldPic||'loialPortrait'));
 const linked=h.add?.text?.(230,127,'',{fontSize:'12px',color:'#ffe3a0'});k.cleanups.push(()=>linked?.destroy?.());
 const pips=h.add?.text?.(105,127,'',{fontSize:'14px',color:'#d8b25a'});pips?.setDepth?.(100);k.cleanups.push(()=>pips?.destroy?.());
 hook8(k,h,'update',old=>function(){const out=old.apply(this,arguments);linked?.setText?.(k.linked?'LINKED':'');pips?.setText?.(k.randFree?'':Array.from({length:6},(_,i)=>k.pips.has(i)?'◇':'◆').join(' '));for(const n of this.card?.list||[])if(typeof n.text==='string'&&n.text.includes('Loial'))n.setText?.(n.text.replace(/Loial/g,provider8(k.randFree)==='mat'?'Mat':'Rand'));return out;});
}
