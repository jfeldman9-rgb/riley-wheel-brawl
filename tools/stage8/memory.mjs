// Static source RGBA estimate from delivered files, not a measured GPU/device result.
import '../../tests/helpers/install-location.mjs';
import {readFileSync} from 'node:fs';
import {dimensions} from '../audit-stage1.mjs';
import {PAINTED8} from '../../src/stage8-painted.js';
import {ZONE_ART8,VOLLEY_KEYS8} from '../../src/stage8-residency.js';
import {STREAMS,residentKeys} from '../../src/zone-stream.js';
import '../../src/stage8-def.js';
export function memory8(){
 const art=PAINTED8.map(r=>{const [w,h]=dimensions(readFileSync(r.url));return {...r,w,h,bytes:w*h*4};});
 const byKey=new Map(art.map(r=>[r.key,r]));const sum=keys=>[...new Set(keys)].reduce((n,k)=>{if(!byKey.has(k))throw Error('Missing art row: '+k);return n+byKey.get(k).bytes;},0);
 const pages=[];for(const page of JSON.parse(readFileSync('assets/chars/riley.anims.json')).pages)for(const path of [`assets/chars/${page}.webp`,`assets/stage5/normals/${page}_n.webp`,`assets/stage5/normals/${page}_nl.webp`]){const [w,h]=dimensions(readFileSync(path));pages.push({path,bytes:w*h*4});}
 const atlasBytes=pages.reduce((n,r)=>n+r.bytes,0),sharedAllowance=8*1024*1024;
 const zones=Object.entries(ZONE_ART8).map(([phase,keys])=>{const zoneI=phase==='C6'?2:Number(phase.slice(1));const plateKeys=[...residentKeys({zoneI},STREAMS[8]),zoneI<2?'bg8fg':'bg8fg2','bg8smoke'];const spriteKeys=[...keys,...(phase==='Z0'?[...VOLLEY_KEYS8,'s8mat']:[]),...(['Z1','Z3'].includes(phase)?['s8wolfpack','s8wolflead']:[])];
 const sprites=sum(spriteKeys),plates=sum(plateKeys);return {phase,spriteKeys:[...new Set(spriteKeys)],plateKeys,spriteBytes:sprites,plateBytes:plates,totalBytes:atlasBytes+sharedAllowance+sprites+plates};});
 const storyBytes=sum(['story8p1','story8p2','story8p3','story8p4']);
 // Camera easing can retain the previous plate while current+next are resident.
 const streamOverlap=Math.max(...zones.filter(z=>z.phase!=='C6').map(z=>{const i=Number(z.phase.slice(1));return i?sum([STREAMS[8].zones[i-1].plate,...(!z.plateKeys.includes(STREAMS[8].zones[i-1].floor)?[STREAMS[8].zones[i-1].floor]:[])]):0;}));
 const gameplayPeak=Math.max(...zones.map(z=>z.totalBytes))+streamOverlap;
 // Conservative: four transient panels on top of the largest residency, even
 // though C6 releases the circle before its two panels and C1 is at Z0.
 const projectedPeak=gameplayPeak+storyBytes;
 return {kind:'static source RGBA; final art unchanged; cast drawScale 1',atlasBytes,sharedAllowance,zones,streamOverlap,storyBytes,gameplayPeak,projectedPeak,paintedGate:26*1024*1024,sourceGate:105*1024*1024,handoffSpritesMiB:{Z0:6.84,Z1:16.27,Z2:24.92,C6:13.48,Z3:21.56},handoffMiB:{Z0:61.5,Z1:69.3,Z2:79.6,C6:68.2,Z3:72.6},physicalDevice:'UNMEASURED',art,pages};
}
if(process.argv[1]?.endsWith('/memory.mjs'))console.log(JSON.stringify(memory8(),null,2));
