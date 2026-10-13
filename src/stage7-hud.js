import { canCall, pickHelper } from './moilan-call.js';
import { call7Context } from './stage7-lifecycle.js';
export function bindStage7Hud(hud,k) {
  if(!hud||hud._s7bind)return ()=>{};
  const prev=hud.updateLoialLabel,own=Object.prototype.hasOwnProperty.call(hud,'updateLoialLabel'),pic=hud.loialPic,texture=pic?.texture?.key||'loialPortrait';
  let at=-1,last='';
  hud.updateLoialLabel=function(s,R){
    if(s.stageNo!==7)return prev?.call(this,s,R);
    const ready=canCall(k.call,call7Context(k));R.loialReady=ready;
    if(k.clock<at)return;at=k.clock+.25;
    const helper=pickHelper(call7Context(k)),label=helper==='duo'?'CALL':helper.toUpperCase(),st=k.call;
    const text=st.on?label+'!':st.calls>=3?'CALL SPENT':ready?label+' READY':label+' '+Math.min(10,st.kos)+'/10';
    if(text===last)return;last=text;
    this.loialT?.setText?.(text)?.setColor?.(ready?'#8fe3ff':'#87909a');
    this.loialPic?.setTexture?.(helper==='lan'?'lanPortrait':'moiPortrait')?.setDisplaySize?.(44,44);this.loialPic?.setAlpha?.(ready?1:.4);
  };
  hud._s7bind=true;
  return ()=>{if(own)hud.updateLoialLabel=prev;else delete hud.updateLoialLabel;hud._s7bind=false;pic?.setTexture?.(texture)?.setDisplaySize?.(30,30);};
}
function help(hud,on){for(const n of hud.card?.list||[]){if(typeof n.text!=='string'||!n.setText)continue;if(on&&n.text.includes('Loial')){n._s7base=n.text;n.setText(n.text.replace(/Loial/g,'Moiraine / Lan'));}if(!on&&n._s7base){n.setText(n._s7base);delete n._s7base;}}}
function paint(hud,s){if(!s)return;const n=s.titleSel||s.stageNo;if(n===7)hud.titleStageT?.setText?.('RHUIDEAN — THE AIEL WASTE');help(hud,n===7);if(s.stageNo===7&&hud.bossName){hud.bossName.setText?.('ASMODEAN');hud.bossPic?.setTexture?.('asmoPortrait')?.setDisplaySize?.(68,68);}}
export function installStage7Hud(){return import('./hud.js').then(({HUD})=>{
  const p=HUD?.prototype;if(!p||p._s7hud)return;
  for(const key of ['update','titleCard','titleSelect']){const old=p[key];p[key]=function(){const out=old.apply(this,arguments);paint(this,this.stage);return out;};}
  const cap=p.caption;p.caption=function(who,text){const out=cap.apply(this,arguments);if(this.stage?.stageNo===7&&/^(ASMODEAN|SHAIDO)/.test(who||''))this.capWho?.setColor?.('#ef997e');return out;};p._s7hud=true;
});}
