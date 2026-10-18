export const SPEAKER8=Object.freeze({'LEWS THERIN':'#d8b25a',TAIM:'#e07a5f',LANFEAR:'#ef997e','BLACK AJAH':'#ef997e',SHAIDO:'#ef997e'});
export function paintStage8Hud(h,s){if((s?.titleSel||s?.stageNo)===8)h.titleStageT?.setText?.("DUMAI'S WELLS — THE FINAL BATTLE");}
export function installStage8Hud(){if(typeof globalThis.Phaser==='undefined')return;
 return import('./hud.js').then(({HUD})=>{const p=HUD?.prototype;if(!p||p._s8hud)return;
 for(const key of ['update','titleCard','titleSelect']){const old=p[key];p[key]=function(){const out=old.apply(this,arguments);paintStage8Hud(this,this.stage);return out;};}
 const cap=p.caption;p.caption=function(who,text){const out=cap.apply(this,arguments);if(this.stage?.stageNo===8&&SPEAKER8[who])this.capWho?.setColor?.(SPEAKER8[who]);return out;};p._s8hud=true;
 });
}
