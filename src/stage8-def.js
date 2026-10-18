import { STREAMS } from './zone-stream.js';
export const STAGE8_CHARS = Object.freeze(['riley']);
export const STAGE8_TEXTURES = Object.freeze([
 'bg8far','bg8mid','bg8mid2','bg8mid3','bg8mid4','bg8floor','bg8floor2','bg8floor3','bg8fg','bg8fg2','bg8smoke',
 's7dancer','s7veiled','s7crate','s7planks','s7ribbon','s7arrow','s6rand','s6call','randPortrait',
 's8lanfear','s8twink','s8duo','s8stonedog','s8wise','s8sister','s8perrin','s8loial','s8mat','s8wolfpack','s8wolflead','s8ashaman','s8taim','s8allies','s8lews',
 's8earth','s8fire','s8tell','s8bolt','s8weave','s8dome','s8callfx','s8chest','s8fireball','s8clash','s8star','s8link','s8linkaura','s8door','s8banner',
 'lanfearPortrait','matPortrait','perrinPortrait','taimPortrait','twinkPortrait',
 'story8p1','story8p2','story8p3','story8p4','story8m1','story8c1','story8c2','story8f1','story8f2','story8f3','story8f4','s8credits',
]);
STREAMS[8] = {far:'bg8far',bleed:[128,48,48,48,128],zones:[
 {plate:'bg8mid',floor:'bg8floor'},{plate:'bg8mid2',floor:'bg8floor2'},
 {plate:'bg8mid3',floor:'bg8floor2'},{plate:'bg8mid4',floor:'bg8floor3'},
]};
export const STAGE8 = {
 no:8,key:'wells',title:"DUMAI'S WELLS — THE FINAL BATTLE",loading:"Loading Dumai's Wells…",
 zones:Object.freeze([
 {at:260,l:0,r:1280,waves:[[['dancer','R',0],['dancer','L',1.4]],[['stonedog','R',0],['veiled','L',1.2],['dancer','R',2.4]]]},
 {at:1500,l:1240,r:2520,waves:[[['wiseone','R',0],['dancer','L',.8],['stonedog','R',1.6]],[['veiled','R',0],['dancer','L',.6],['wiseone','R',1.6],['stonedog','L',2.4]]]},
 {at:2800,l:2560,r:3840,waves:[[['veiled','R',0],['dancer','L',.8],['veiled','R',1.6]],[['dancer','L',0],['veiled','R',.6],['wiseone','R',1.6],['stonedog','L',2.4]]]},
 {at:4140,l:3920,r:5200,boss:true},].map(Object.freeze)),
 drops:Object.freeze(['lightning','fireshield','airwhip','angreal','ter?','lightning'].map((kind,i)=>Object.freeze({zone:i>>1,wave:i%2,kind,delay:1.2}))),
 bossDrop:Object.freeze({phase:2,kind:'saangreal'}),ribbon:Object.freeze({zone:1,wave:0,delay:1.4}),
 crates:Object.freeze([[880,600],[2140,650],[3330,610],[4600,596]]),crateProp:'s7crate',cratePlanks:'s7planks',
 skipBoss:Object.freeze({zoneI:2,x:3990,camX:3500}),
 boss:Object.freeze({type:'lanfear',name:'LANFEAR',portrait:'lanfearPortrait'}),
 music:Object.freeze({stage:'stage8',boss:'boss8'}),chars:STAGE8_CHARS,textures:STAGE8_TEXTURES,kit:null,
 next:()=>({stage:1,campaignComplete:true}),
 onBossPhase(s,b,p){s.kit?.onBossPhase?.(b,p);if(p===2)s.powerDrops?.push({kind:'saangreal',t:.6});},
 bossDown(s){s.kit?.finish();},
};
