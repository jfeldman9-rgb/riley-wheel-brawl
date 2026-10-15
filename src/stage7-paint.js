// Small deterministic code-drawn stand-ins; no extra fighter atlas or normals.
import { tex, sheet, canPaint } from './stage4-art.js';
import { q } from './config.js';
import { queryFlag } from './debug-flag.js';
export const STAGE7_CANVASES = Object.freeze([
  ...['bg7far','bg7mid','bg7mid2','bg7mid3','bg7mid4'].map(k => [k,640,280]),
  ...['bg7floor','bg7floor2','bg7floor3'].map(k => [k,256,96]),
  ...['s7dancer','s7veiled','s7asmo','s7moir','s7lan'].map(k => [k,512,64]), ['s6fade',216,56],
  ...['moiPortrait','lanPortrait','asmoPortrait'].map(k => [k,64,64]),
  ['s7note',48,48],['s7column',64,224],['s7shard',64,64],['s7earth',256,64],['s7shield',128,128],['s7dust',256,128],
  ['s7ring',144,36],['s7portal',96,128],['s7crate',128,128],['s7planks',32,8],['s7ribbon',24,24],['s7arrow',64,8],['s7veil',128,256],['s7streak',128,24],
  ...['story7p1','story7p2','story7p3'].map(k => [k,640,360]),
].map(Object.freeze));
function path(g, pts, fill) { g.fillStyle = fill; g.beginPath(); pts.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y)); g.closePath(); g.fill(); }
function sky(g,w,h,night=false) { const a=g.createLinearGradient(0,0,0,h); a.addColorStop(0,night?'#102039':'#342340'); a.addColorStop(0.7,night?'#6f8fb0':'#d9822b'); a.addColorStop(1,'#c8a26b'); g.fillStyle=a; g.fillRect(0,0,w,h); }
function city(g,w,h,zone) {
  sky(g,w,h,zone>=2);
  if (zone < 2) {
    path(g,[[0,h*.6],[w*.12,h*.36],[w*.22,h*.4],[w*.28,h*.68],[w*.48,h*.5],[w*.7,h*.66],[w,h*.42],[w,h],[0,h]],'#76534d');
    path(g,[[0,h*.8],[w*.25,h*.65],[w*.45,h*.86],[w*.7,h*.72],[w,h*.78],[w,h],[0,h]],'#a16c43');
    if(zone===0) { g.fillStyle='#302c3c';g.fillRect(w*.2,h*.37,30,h*.48);g.strokeStyle='#8fe3ff'; for(let i=0;i<5;i++)g.strokeRect(w*.2+8,h*.42+i*18,12,9); }
    if(zone===1) for(let i=0;i<7;i++){g.fillStyle=i%2?'#4b4141':'#685449';g.fillRect(35+i*87,h*.52+(i%3)*15,60,h*.48);g.clearRect(48+i*87,h*.65,14,30);}
  } else {
    for(let i=0;i<9;i++){let x=i*79-20,y=60+(i%3)*26;g.fillStyle=i%2?'#4f637d':'#657e96';g.fillRect(x,y,62,h-y);g.fillStyle='#a6b8c5';g.fillRect(x-3,y-5,68,6);for(let j=0;j<3;j++){g.fillStyle='#30455f';g.fillRect(x+10+j*15,y+30,7,44);}}
    if(zone===2){g.fillStyle='#b7c4c8';g.beginPath();g.ellipse(w*.54,h*.9,65,14,0,0,7);g.fill();g.fillStyle='#4d657e';g.fillRect(w*.54-10,h*.64,20,h*.23);}
    if(zone===3){g.fillStyle='#574c49';g.fillRect(w*.52,h*.28,18,h*.7);for(let i=0;i<9;i++){g.fillStyle=i%2?'#548775':'#3c706d';g.beginPath();g.ellipse(w*.52+(i%3-1)*47,h*.3+Math.floor(i/3)*26,65,38,0,0,7);g.fill();}}
  }
}
function person(g,w,h,key,frame=0,back=false) {
  const kneel=frame===7, top=kneel?20:4, foot=62;
  const coat=back?'#111722':key==='s7moir'||key==='moiPortrait'?'#286394':key==='s7asmo'||key==='asmoPortrait'?'#682f4f':key==='s7lan'||key==='lanPortrait'?'#455d59':'#8a7a5e';
  path(g,[[24,top+16],[41,top+16],[47,foot-5],[18,foot-5]],coat);
  g.fillStyle=back?'#18202b':'#b99070';g.beginPath();g.arc(32,top+10,7,0,7);g.fill();
  g.fillStyle='#26252b';g.fillRect(25,top+2,14,5);g.fillRect(23,foot-6,7,6);g.fillRect(36,foot-6,7,6);
  if(!back && ['s7dancer','s7veiled'].includes(key)){g.fillStyle='#a33a2a';g.fillRect(25,top+11,14,5);}
  g.strokeStyle='#dac3a1';g.lineWidth=2;
  if(key==='s7dancer'){g.beginPath();g.moveTo(48,59);g.lineTo(frame===3?62:52,8);g.stroke();}
  if(key==='s7veiled'){g.beginPath();g.arc(48,32,18,-1.3,1.3);g.stroke();}
  if(key==='s7asmo'){g.strokeStyle='#dfb461';g.strokeRect(43,25,17,28);for(let i=0;i<4;i++)g.fillRect(46+i*3,28,1,22);}
  if(key==='s7lan'){g.strokeStyle='#e0eff5';g.beginPath();g.moveTo(43,40);g.lineTo(frame===3?63:52,frame===3?32:8);g.stroke();g.fillStyle='#262c2b';g.fillRect(25,top+7,14,2);}
  if(key==='s7moir'&&frame>=3){g.fillStyle='#8fe3ff';g.beginPath();g.arc(49,20,5,0,7);g.fill();}
}
function draw(g,w,h,key) {
  if(key.startsWith('bg7floor')){g.fillStyle=key==='bg7floor'?'#b18b60':'#566d82';g.fillRect(0,0,w,h);g.strokeStyle='#79919c';for(let y=0;y<h;y+=24){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();for(let x=(y%48?20:0);x<w;x+=48){g.beginPath();g.moveTo(x,y);g.lineTo(x+8,y+24);g.stroke();}}return;}
  if(key.startsWith('bg7')){city(g,w,h,key==='bg7far'?0:key==='bg7mid'?0:Number(key.slice(-1))-1);return;}
  if(key.startsWith('story7')){city(g,w,h,Number(key.slice(-1))-1);g.save();g.translate(w*.28,h-150);g.scale(2.5,2.5);person(g,64,64,'riley',0,true);g.restore();return;}
  if(key.endsWith('Portrait')){g.fillStyle='#1f2d40';g.fillRect(0,0,w,h);person(g,w,h,key);return;}
  g.fillStyle='#8fe3ff';g.strokeStyle='#bcefff';g.lineWidth=3;
  if(key==='s7column'){const a=g.createLinearGradient(0,0,w,0);a.addColorStop(0,'#426c87');a.addColorStop(.5,'#a8efff');a.addColorStop(1,'#31546f');g.fillStyle=a;g.fillRect(14,8,w-28,h-12);g.strokeRect(14,8,w-28,h-12);return;}
  if(['s7shield','s7ring','s7portal'].includes(key)){g.beginPath();g.ellipse(w/2,h/2,w*.43,h*.43,0,0,7);g.stroke();g.globalAlpha=.18;g.fill();g.globalAlpha=1;return;}
  if(key==='s7dust'||key==='s7veil'){const a=g.createLinearGradient(0,0,w,0);a.addColorStop(0,'transparent');a.addColorStop(.5,key==='s7dust'?'#c8a26b':'#b4d5e8');a.addColorStop(1,'transparent');g.fillStyle=a;g.fillRect(0,0,w,h);return;}
  if(key==='s7crate'){g.fillStyle='#92704b';g.fillRect(10,20,w-20,h-25);g.strokeStyle='#cfac74';for(let i=15;i<w;i+=12){g.beginPath();g.moveTo(i,20);g.lineTo(i,h-5);g.stroke();g.beginPath();g.moveTo(10,i);g.lineTo(w-10,i);g.stroke();}return;}
  if(key==='s7ribbon'){g.fillStyle='#ef81a2';path(g,[[2,4],[21,4],[16,11],[21,22],[12,17],[3,22],[8,11]],'#ef81a2');return;}
  if(key==='s7note'){g.fillStyle='#ffe095';g.beginPath();g.ellipse(16,33,10,7,-.4,0,7);g.fill();g.fillRect(23,6,4,27);g.fillRect(25,6,15,5);return;}
  if(key==='s7earth'){for(let i=0;i<8;i++)path(g,[[i*32,h],[i*32+15,8+(i%3)*12],[i*32+32,h]],i%2?'#d9822b':'#9b7552');return;}
  if(key==='s7shard'){path(g,[[10,h],[32,1],[45,h-5]],'#8fe3ff');return;}
  if(key==='s7arrow'||key==='s7streak'||key==='s7planks'){g.fillStyle=key==='s7planks'?'#b58c55':'#e4f2ff';path(g,[[0,h/2],[w*.8,1],[w,h/2],[w*.8,h-1]],g.fillStyle);}
}
export function paintStage7Art(scene, keys = STAGE7_CANVASES.map(r=>r[0])) {
  if(!canPaint(scene)) return;
  for(const key of keys){const row=STAGE7_CANVASES.find(r=>r[0]===key);if(!row||scene.textures.exists(key))continue;const [,w,h]=row;
    if(['s7dancer','s7veiled','s7asmo','s7moir','s7lan','s6fade'].includes(key)) sheet(scene,key,key==='s6fade'?6:8,key==='s6fade'?36:64,h,(g,i,W,H)=>person(g,W,H,key,i));
    else tex(scene,key,w,h,(g,W,H)=>{draw(g,W,H,key);if(queryFlag(q,'debug')){g.strokeStyle='#ffb74d';g.beginPath();g.moveTo(2,14);g.lineTo(14,2);g.stroke();}});
  }
}
export function freeStory7(scene){for(const n of [1,2,3]){const key='story7p'+n;if(scene.textures?.exists?.(key))scene.textures.remove?.(key);}}
