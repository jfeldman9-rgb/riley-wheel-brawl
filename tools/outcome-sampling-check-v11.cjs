'use strict';
// Actual helper and presentation code with no-op recording Canvas. No pixel or timing claim.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'js/presentation-v11.js'),'utf8');
const helperStart=source.indexOf('  function outcomeMipSize('),helperEnd=source.indexOf('  function drawOutcomeBitmap(',helperStart);
assert.ok(helperStart>=0&&helperEnd>helperStart,'actual private helper must exist exactly once');
const mip=vm.runInNewContext('('+source.slice(helperStart,helperEnd).trim()+')');
const plain=x=>JSON.parse(JSON.stringify(x)),checks=[];
function check(name,fn){fn();checks.push(name);console.log('PASS '+name);}
check('Jason-approved original pixel check and zero tolerance remain byte-identical',()=>{
 const hash=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'tools/outcome-bitmap-browser-v11.cjs'))).digest('hex');
 assert.equal(hash,'716623e1768a2b165bfa1a56864ec9a32bf51f5e461695ad88453e3160020d38');
});
function boot(options={}){
 const surfaces=[],calls=[],masters=new Map();
 class ImageBitmap{constructor(width=1070,height=1470){this.width=width;this.height=height;}}
 function actor(){}actor.prototype.draw=function(){};actor.prototype.drawSprite=function(){};
 const classes=()=>{function A(){}A.prototype=Object.create(actor.prototype);return A;};
 function Play(){}for(const k of ['spawnWave','update','draw','drawWorld'])Play.prototype[k]=function(){};
 const R={Riley:classes(),Trolloc:classes(),Chieftain:classes(),ShadowBoss:classes(),scenes:{Play},display:{renderScale:1},assets:{get:key=>masters.get(key)||null,has:key=>masters.has(key),releaseDemand(){},ready:()=>Promise.resolve()},OUTCOME_ART:{}};
 const document={createElement(tag){assert.equal(tag,'canvas');const c={id:surfaces.length+1,width:0,height:0};const g={canvas:c,imageSmoothingEnabled:true,imageSmoothingQuality:'low',globalCompositeOperation:'source-over',drawImage(...args){calls.push({canvas:c,args,smooth:this.imageSmoothingEnabled,quality:this.imageSmoothingQuality,composite:this.globalCompositeOperation});}};c.getContext=type=>{assert.equal(type,'2d');return g;};surfaces.push(c);return c;}};
 const context={window:{RWB:R},document,console,Promise};if(!options.noBitmapConstructor)context.ImageBitmap=ImageBitmap;
 vm.runInNewContext(source,context,{filename:'actual-js/presentation-v11.js'});
 return{R,ImageBitmap,surfaces,calls,masters,set(key,box,height,image){R.OUTCOME_ART[key]={bounds:box,height};masters.set(key,image||new ImageBitmap());}};
}
check('source-derived odd-dimension ceil mips match all three failing pose scales',()=>{
 assert.deepEqual(plain(mip(903,1385,66,100)),{level:3,width:113,height:174});
 assert.deepEqual(plain(mip(903,1385,131,200)),{level:2,width:226,height:347});
 assert.deepEqual(plain(mip(903,1385,196,300)),{level:2,width:226,height:347});
});
check('mip boundary, upscaling, one-pixel axes and anisotropic limits stay bounded',()=>{
 for(const [args,expected]of[
  [[8,8,4,4],{level:1,width:4,height:4}],[[3,3,2,2],{level:1,width:2,height:2}],
  [[8,8,9,9],{level:0,width:8,height:8}],[[8,32,4,24],{level:0,width:8,height:32}],
  [[1,17,1,2],{level:4,width:1,height:2}],[[1,1,1,1],{level:0,width:1,height:1}],
  [[8,8,8,8],{level:0,width:8,height:8}],[[17,17,9,9],{level:1,width:9,height:9}]])assert.deepEqual(plain(mip(...args)),expected);
});
check('actual bitmap pose performs integer crop then Medium mip then Low final',()=>{
 const e=boot(),key='riley-victory-chieftain',box=[106,38,903,1385];e.set(key,box,100);const master=e.masters.get(key),entry=e.R.presentationV11.pose(key,100);
 assert.equal(entry.canvas.width,66);assert.equal(entry.canvas.height,100);assert.equal(entry.width,100*903/1385);assert.equal(entry.height,100);assert.equal(e.surfaces.length,3);assert.equal(e.calls.length,3);
 const [crop,mipDraw,final]=e.calls;
 assert.equal(crop.args[0],master);assert.deepEqual(crop.args.slice(1),[106,38,903,1385,0,0,903,1385]);assert.equal(crop.smooth,false);assert.equal(crop.composite,'copy');
 assert.equal(mipDraw.args[0],crop.canvas);assert.deepEqual(mipDraw.args.slice(1),[0,0,903,1385,0,0,113,174]);assert.equal(mipDraw.quality,'medium');assert.equal(mipDraw.smooth,true);assert.equal(mipDraw.composite,'copy');
 assert.equal(final.args[0],mipDraw.canvas);assert.deepEqual(final.args.slice(1),[0,0,113,174,0,0,66,100]);assert.equal(final.quality,'low');assert.equal(final.composite,'source-over');assert.equal(final.canvas,entry.canvas);
});
check('original full-resolution source is used directly with Low when mip level is zero',()=>{
 const e=boot(),key='boss-defeat-taim';e.set(key,[11,13,20,30],24,new e.ImageBitmap(100,100));const entry=e.R.presentationV11.pose(key,24);
 assert.equal(e.surfaces.length,1);assert.equal(e.calls.length,1);assert.equal(e.calls[0].quality,'low');assert.deepEqual(e.calls[0].args.slice(1),[11,13,20,30,0,0,16,24]);assert.equal(entry.canvas.height,24);
});
check('HTML fallback retains original High one-pass draw and exact geometry',()=>{
 const e=boot(),key='riley-victory-chieftain',html={width:1070,height:1470,naturalWidth:1070,naturalHeight:1470};e.set(key,[106,38,903,1385],100,html);const entry=e.R.presentationV11.pose(key,100);
 assert.equal(e.surfaces.length,1);assert.equal(e.calls.length,1);assert.equal(e.calls[0].quality,'high');assert.equal(e.calls[0].args[0],html);assert.deepEqual(e.calls[0].args.slice(1),[106,38,903,1385,0,0,66,100]);assert.equal(entry.canvas.width,66);
});
check('non-outcome bitmaps and missing bitmap API retain existing path',()=>{
 for(const noBitmapConstructor of [false,true]){
  const e=boot({noBitmapConstructor}),key=noBitmapConstructor?'riley-victory-chieftain':'cg-trolloc';e.set(key,[1,2,100,120],20);e.R.presentationV11.pose(key,20);assert.equal(e.surfaces.length,1);assert.equal(e.calls[0].quality,'high');
 }
});
check('fractional unauthored crops are not silently rounded into a different image',()=>{
 const e=boot(),key='riley-victory-chieftain';e.set(key,[1.5,2,903,1385],100);e.R.presentationV11.pose(key,100);assert.equal(e.surfaces.length,1);assert.equal(e.calls[0].quality,'high');assert.equal(e.calls[0].args[1],1.5);
});
check('repeat pose calls reuse the cached final surface without crop/mip reallocation',()=>{
 const e=boot(),key='riley-victory-chieftain';e.set(key,[106,38,903,1385],100);const one=e.R.presentationV11.pose(key,100);for(let i=0;i<20;i++)assert.equal(e.R.presentationV11.pose(key,100),one);assert.equal(e.surfaces.length,3);assert.equal(e.calls.length,3);
 e.R.display.renderScale=2;const two=e.R.presentationV11.pose(key,100);assert.notEqual(two,one);assert.equal(two.canvas.width,131);assert.equal(two.canvas.height,200);assert.equal(e.calls.at(-2).canvas.width,226);assert.equal(e.calls.at(-2).canvas.height,347);const after=e.surfaces.length;assert.equal(e.R.presentationV11.pose(key,100),two);assert.equal(e.surfaces.length,after);
});
check('pose cache remains four entries and stage changes invalidate cached presentation',()=>{
 const e=boot();for(let i=0;i<6;i++){const key='riley-victory-test'+i;e.set(key,[0,0,903,1385],100);e.R.presentationV11.pose(key,100);}assert.equal(e.R.presentationV11.cache.size,4);
 const scene=new e.R.scenes.Play();scene.levelIndex=1;scene.level={mix:[[]]};scene.spawnWave(0);assert.equal(e.R.presentationV11.cache.size,0);
});
check('all ten authored integer crops and 30 runtime poses follow source mip bounds',()=>{
 const authored={};vm.runInNewContext(fs.readFileSync(path.join(root,'js/artmanifest.js'),'utf8'),{RWB:authored});assert.equal(Object.keys(authored.OUTCOME_ART).length,10);
 const e=boot();let count=0;
 for(const [key,meta] of Object.entries(authored.OUTCOME_ART)){
  const box=Array.from(meta.bounds),height=meta.height||(key.startsWith('riley-')?100:key.endsWith('draghkar')?78:74);assert.ok(box.every(Number.isInteger));e.set(key,box,height);
  for(const scale of [1,2,3]){e.R.display.renderScale=scale;e.R.presentationV11.cache.clear();const first=e.calls.length,entry=e.R.presentationV11.pose(key,height),target=[Math.ceil(height*box[2]/box[3]*scale),Math.ceil(height*scale)],selected=mip(box[2],box[3],...target);assert.equal(entry.canvas.width,target[0]);assert.equal(entry.canvas.height,target[1]);
   const row=e.calls.slice(first);assert.equal(row.length,selected.level?3:1);if(selected.level){assert.equal(row[1].canvas.width,selected.width);assert.equal(row[1].canvas.height,selected.height);assert.ok(selected.width>=target[0]&&selected.height>=target[1]);const d=2**(selected.level+1);assert.ok(Math.ceil(box[2]/d)<target[0]||Math.ceil(box[3]/d)<target[1]);}count++;
  }
 }assert.equal(count,30);
});
console.log(JSON.stringify({allPassed:true,checks:checks.length,names:checks,scope:'Source-derived mip sizing, exact draw-command geometry/quality, fallback and cache lifecycle only. Canvas Medium versus SkPixmap.scalePixels zero-RGBA equivalence remains an unchanged real-browser gate.'}));
