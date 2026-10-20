import {STAGE7_PHONE_CSS} from './stage7-phone.js';
export const STAGE8_PHONE_CSS=STAGE7_PHONE_CSS.replace(/stage-7/g,'stage-8').replace(/s7-story/g,'s8-story').replace(/s7-call/g,'s8-call');
export function syncPhone8(s){const d=globalThis.document;if(!d?.body?.classList)return;
 if(!d.getElementById('rwb-stage8-phone')){const style=d.createElement('style');style.id='rwb-stage8-phone';style.textContent=STAGE8_PHONE_CSS;(d.head||d.body).appendChild(style);}
 d.body.classList.toggle('stage-8',s.stageNo===8);d.body.classList.toggle('s8-story',!!s.cutscene);d.body.classList.toggle('s8-call',!!s.kit?.strike);
}
export function releasePhone8(){globalThis.document?.body?.classList?.remove('stage-8','s8-story','s8-call');}
