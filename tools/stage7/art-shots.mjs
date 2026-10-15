// Canvas-only inspection of fallback artwork; this does not verify Phaser/WebGL.
// npm install --no-save @napi-rs/canvas, then node tools/stage7/art-shots.mjs
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {createCanvas}=require(process.env.RWB_CANVAS_MODULE||'@napi-rs/canvas');
globalThis.location={search:'?s7=1'};
globalThis.window={devicePixelRatio:1};
globalThis.document={createElement:()=>createCanvas(1,1)};
const {paintStage7Art}=await import('../../src/stage7-paint.js');
const images=new Map();
const scene={textures:{exists:k=>images.has(k),addCanvas(k,c){images.set(k,c);return {add(){}};}}};
paintStage7Art(scene);
const sheet=createCanvas(1280,1120),g=sheet.getContext('2d');
for(let z=0;z<4;z++){
  const x=z%2*640,y=Math.floor(z/2)*360,key=z?'bg7mid'+(z+1):'bg7mid';
  g.drawImage(images.get(key),x,y,640,280);
  g.drawImage(images.get(z<2?'bg7floor':z===2?'bg7floor2':'bg7floor3'),x,y+280,640,80);
  g.drawImage(images.get(z===3?'s7asmo':'s7dancer'),0,0,64,64,x+460,y+165,160,160);
  if(z===3)for(let i=0;i<5;i++)g.drawImage(images.get('s7column'),x+70+i*110,y+80,30,190);
}
for(let n=1;n<=3;n++)g.drawImage(images.get('story7p'+n),(n-1)*426,740,426,240);
g.fillStyle='#101a29';g.fillRect(0,980,1280,140);
for(const [i,k]of ['s7dancer','s7veiled','s7asmo','s7moir','s7lan'].entries())g.drawImage(images.get(k),0,0,64,64,80+i*240,990,120,120);
mkdirSync('docs/stage7/evidence',{recursive:true});
writeFileSync('docs/stage7/evidence/fallback-art.png',sheet.toBuffer('image/png'));
console.log('Wrote fallback-art.png (code art inspection, not a browser capture).');
