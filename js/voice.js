/* Subtitle-first voice catalog; recorded clips are deliberately deferred. */
'use strict';
WL.voice=(function(){
 const intros={trolloc:{name:'TROLLOC',line:'The Shadow is hungry!'},trollocHeavy:{name:'TROLLOC CHIEFTAIN',line:'Break the village!'},darkfriend:{name:'DARKFRIEND',line:'You cannot hide!'},fade:{name:'FADE',line:'No road is safe.'},cultist:{name:'MASHADAR CULTIST',line:'The mist follows.'},stoneGuard:{name:'STONE GUARD',line:'None may pass!'},ashaman:{name:"TURNED ASHA'MAN",line:"Obey the M'Hael."}};
 const barks={fire:['Fire!'],low:['I need a moment.'],grab:['Not so fast!'],throw:['Over there!'],respawn:['Back on my feet.'],box:['Loial, now!'],sweep:['Spin!']};
 return {bark:id=>(barks[id]||[])[0]||'',comboRank:n=>n>=16?'LEGEND':n>=8?'DRAGON':n>=3?'SPARK':'',comboCross:(a,b)=>a<3&&b>=3?'SPARK':'',enemyIntro:t=>intros[t]||null,toolName:p=>({jab:'FRONT KICK',smash:'ROUNDHOUSE',sweep:'SPINNING BACK KICK'}[p]||''),surgeLine:()=> 'Balefire!',surgeTitle:'BALEFIRE'};
})();
