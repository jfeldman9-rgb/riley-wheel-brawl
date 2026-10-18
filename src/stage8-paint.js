import {tex,sheet,canPaint} from './stage4-art.js';
import {paintStage7Art} from './stage7-paint.js';
// Rear-view silhouettes for every story fallback; no new face composition.
export function paintStage8Art(s,keys){
 if(!canPaint(s))return;
 paintStage7Art(s,keys.filter(k=>k.startsWith('s7')));
 for(const key of keys){
  if(s.textures.exists(key))continue;
  const person=/^s8(lanfear|twink|duo|stonedog|wise|sister|perrin|loial|mat|wolf|ashaman|taim|allies)/.test(key);
  if(person){sheet(s,key,24,64,96,(g,i)=>{
   const child=key==='s8twink',h=child?55:86;
   g.fillStyle=child?'#ef81a2':key==='s8lanfear'?'#dfe3ea':'#4b4742';
   g.beginPath();g.moveTo(25,94-h+18);g.lineTo(40,94-h+18);g.lineTo(48,90);g.lineTo(17,90);g.fill();
   g.fillStyle='#201c23';g.fillRect(24,94-h,18,25);g.fillRect(20,89,10,5);g.fillRect(36,89,10,5);
   if(child||key==='s8lanfear'){g.fillStyle=child?'#edce62':'#cdd6e5';g.fillRect(23,94-h,20,4);}
   g.strokeStyle='#d9c598';g.beginPath();g.moveTo(47,85);g.lineTo(i%4===2?62:52,20);g.stroke();
  });continue;}
  const panel=key.startsWith('story8')||key==='s8credits',bg=key.startsWith('bg8');
  tex(s,key,panel?640:bg?640:128,panel?360:bg?180:128,(g,w,h)=>{
   if(bg||panel){g.fillStyle='#b5b0a1';g.fillRect(0,0,w,h);g.fillStyle='#80775d';g.beginPath();g.moveTo(0,h*.65);for(let i=0;i<9;i++)g.lineTo(i*w/8,h*(.4+(i%3)*.12));g.lineTo(w,h);g.lineTo(0,h);g.fill();
    if(panel){g.fillStyle='#15161b';g.fillRect(240,210,48,130);g.fillRect(246,186,35,40);g.fillStyle='#ef81a2';g.fillRect(302,265,32,75);g.fillStyle='#231c21';g.fillRect(299,235,38,58);g.fillStyle='#e9cb5b';g.fillRect(299,234,38,6);}
   }else{g.strokeStyle=key==='s8door'?'#8e3326':'#e9b45a';g.lineWidth=8;if(key==='s8door')g.strokeRect(25,6,78,116);else{g.beginPath();g.ellipse(w/2,h/2,w*.43,h*.43,0,0,7);g.stroke();}}
  });
 }
}
