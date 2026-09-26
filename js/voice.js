/* Subtitle-first voice catalog; recorded clips are deliberately deferred. */
'use strict';
RWB.voice=(function(){
 const intros={trolloc:{name:'TROLLOC',line:'The Shadow is hungry!'},trollocCaptain:{name:'TROLLOC CHIEFTAIN',line:'Break the village!'},Darkfriend:{name:'DARKFRIEND',line:'You cannot hide!'},assassin:{name:'CAEMLYN ASSASSIN',line:'No road is safe.'},mashadarCultist:{name:'MASHADAR CULTIST',line:'The mist follows.'},stoneDefender:{name:'STONE GUARD',line:'None may pass!'},turnedAshaman:{name:"TURNED ASHA'MAN",line:"Obey the M'Hael."}};
 const barks={fire:['Fire!'],low:['I need a moment.'],grab:['Not so fast!'],throw:['Over there!'],respawn:['Back on my feet.'],box:['Loial, now!'],sweep:['Spin!']};
 return {bark:id=>(barks[id]||[])[0]||'',comboRank:n=>n>=16?'LEGEND':n>=8?'DRAGON':n>=3?'SPARK':'',comboCross:(a,b)=>a<3&&b>=3?'SPARK':'',enemyIntro:t=>intros[t]||null,toolName:p=>({jab:'FRONT KICK',smash:'ROUNDHOUSE',sweep:'SPINNING BACK KICK'}[p]||''),surgeLine:()=> 'Balefire!',surgeTitle:'BALEFIRE'};
})();
