'use strict';
// Semantic cache/cap checks. All inherited visual, contact and timing thresholds remain unchanged.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{createCanvas,Image}=require('@napi-rs/canvas'),{boot}=require('./soak.cjs');
const root=path.resolve(__dirname,'..');
(async()=>{const R=boot(root);await new Promise(r=>setImmediate(r));const images=new Map();for(const [key,file] of Object.entries(R.ART_FILES)){const f=path.join(root,file);if(!/^(stage|floor|cg-draghkar|riley16-portrait)/.test(key)||!fs.existsSync(f)||!/\.(png|jpe?g|webp)$/i.test(file))continue;const im=new Image();im.src=fs.readFileSync(f);await im.decode();images.set(key,im);}R.assets.get=k=>images.get(k)||null;R.assets.has=k=>images.has(k);R.display.renderScale=1;R.perf.allowSync=true;
 const canvas=createCanvas(640,360),ctx=canvas.getContext('2d'),checks=[];
 const check=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
 check('Cold entry paints a complete visible window without offscreen B/C or roof work',()=>{
   const old=R.perf.noteBake,names=[];R.perf.noteBake=name=>names.push(name);
   try{const s={levelIndex:1,camera:{x:0},time:0,wave:0,level:R.LEVELS[1]},entry=R.StageWorld.preload(s),mid=entry.layers.find(l=>l.id==='mid');
     assert.equal(mid.viewW,640);assert.equal(mid.canvas.width,640);assert.equal(mid.origin,0);
     assert.ok(names.includes('bakedPlate:stage2-mid'));assert.ok(!names.some(n=>/stage2-mid-[bc]/.test(n)));
     const before=R.StageWorld.backgroundStats.builds;R.StageWorld.preload({levelIndex:4,camera:{x:0},time:0,wave:0,level:R.LEVELS[4]});assert.equal(R.StageWorld.backgroundStats.builds,before+1);
   }finally{R.perf.noteBake=old;}
 });
 check('Every first-frame enemy and boss kind remains synchronously prepared',()=>{
   for(let level=0;level<5;level++)for(const wave of [0,3,5]){
     const scene=new R.scenes.Play(R.game,level,{wave});R.Puppet.prepareScene(level,scene);const ready=new Set(R.perf.stageVisibleKinds);
     for(const actor of scene.enemies){const kind=R.Puppet.defs[actor.kind]?actor.kind:actor instanceof R.Trolloc?(actor.boss?'chieftain':'trolloc'):null;if(kind)assert.ok(ready.has(kind),'stage '+(level+1)+' wave '+wave+' '+kind);}
     assert.ok(ready.has('loial'));if(scene.twinkle)assert.ok(ready.has('twinkle'));
   }
 });
 const scene={levelIndex:2,camera:{x:1000},time:0,wave:3,level:R.LEVELS[2]};
 check('Finished stage paintings retain independent parallax and are reused across camera travel',()=>{const e=R.StageWorld.preload(scene);assert.deepEqual(Array.from(e.layers,l=>l.k),[0,.08,.4,1,0]);const built=R.StageWorld.backgroundStats.builds;R.StageWorld.draw(ctx,scene);const composites=R.StageWorld.backgroundStats.composites;R.StageWorld.draw(ctx,scene);assert.equal(R.StageWorld.backgroundStats.composites,composites);scene.camera.x=1500.375;R.StageWorld.draw(ctx,scene);assert.equal(R.StageWorld.backgroundStats.builds,built);assert.equal(R.StageWorld.preload(scene),e);assert.equal(scene.camera.x,1500.375);});
 check('A queued neighboring window is reused on the first moving frame',()=>{
   scene.camera.x=0;R.StageWorld.draw(ctx,scene);const entry=R.StageWorld.preload(scene),mid=entry.layers.find(l=>l.id==='mid');
   for(let i=0;i<8&&mid.pending;i++)R.Bake.pump(4);
   assert.ok(mid.next);const next=mid.next.canvas;scene.camera.x=80;R.StageWorld.draw(ctx,scene);assert.equal(mid.canvas,next);assert.ok(mid.viewW>=672);
   scene.camera.x=1500.375;
 });
 check('Stage 4/5 continuous panoramas and stage 5 roof keep original geometry',()=>{for(const level of [3,4]){const s={...scene,levelIndex:level,level:R.LEVELS[level]},e=R.StageWorld.preload(s),layout=R.StageWorld.midLayout(level+1,R.StageWorld.travelOf(s));assert.equal(layout.mode,'continuous');assert.equal(e.layers.find(l=>l.id==='mid').w,Math.max(640,layout.available));}const e=R.StageWorld.preload({...scene,levelIndex:4,level:R.LEVELS[4],wave:5});assert.equal(e.layers.find(l=>l.id==='mid').k,0);assert.equal(e.layers.find(l=>l.id==='back').k,0);});
 check('Stage preload finishes before a transition starts its fade',()=>{const preload=R.StageWorld.preload,oldScene=R.game.scene;let before=false;R.game.fadeDir=0;R.StageWorld.preload=s=>{before=R.game.fadeDir===0;return preload.call(R.StageWorld,s);};R.game.setScene({...scene,isGameplay:true});assert.equal(before,true);assert.equal(R.game.fadeDir,1);R.StageWorld.preload=preload;R.game.scene=oldScene;R.game.nextScene=null;R.game.fadeDir=0;});
 check('Original rounded-camera renderer remains a working low-memory fallback',()=>{const preload=R.StageWorld.preload;try{R.StageWorld.preload=()=>null;R.StageWorld.draw(ctx,scene);assert.ok(R.StageWorld._views.mid.canvas.width>1);assert.equal(scene.camera.x,1500.375);}finally{R.StageWorld.preload=preload;}});
 check('Large enemy bitmap resizes once and replaces stale display-size entries',()=>{const a=R.art.bitmap('cg-draghkar',128,95),builds=R.art.bitmapStats.builds;assert.equal(a.width,128);assert.equal(R.art.bitmap('cg-draghkar',128,95),a);assert.equal(R.art.bitmapStats.builds,builds);R.display.renderScale=2;const b=R.art.bitmap('cg-draghkar',128,95);assert.equal(b.width,256);assert.notEqual(a,b);assert.equal(a.width,1);R.display.renderScale=1;});
 check('Spark and sword-streak bursts are capped and particle objects are reused',()=>{const f=new R.FX();for(let i=0;i<300;i++)f.spawn('spark',0,0,.1);for(let i=0;i<100;i++)f.spawn('slash',0,0,.1);assert.equal(f.counts.spark,96);assert.equal(f.counts.slash,12);const particles=new Set(f.list),buckets=[f._drawSparks,f._drawGlows,f._drawRest];f.draw(ctx,0);f.draw(ctx,0);assert.equal(f._drawSparks,buckets[0]);assert.equal(f._drawGlows,buckets[1]);assert.equal(f._drawRest,buckets[2]);f.update(.2);assert.equal(f.counts.spark,0);assert.equal(f.counts.slash,0);assert.equal(f.list.length,0);assert.ok(particles.has(f.spawn('spark',0,0,1)));f.clear();assert.equal(f.counts.spark,0);for(let i=0;i<400;i++)f.text(0,0,'TEXT');assert.equal(f.list.length,400);f.clear();assert.ok(f.pool.length<=384);});
 check('HUD redraws only displayed values, including denominator and GO visibility changes',()=>{const s=new R.scenes.Play(R.game,0,{});s.goTimer=0;s.marching=true;s.time=0;s.warningTimer=0;s.tutorial='';s.player.power=50;s.player.hp=50.2;R.drawHUD(ctx,s);const p=R.HUDStats.paints;s.time=.13;s.player.hp=50.21;R.drawHUD(ctx,s);assert.equal(R.HUDStats.paints,p);s.player.hpMax*=2;R.drawHUD(ctx,s);assert.equal(R.HUDStats.paints,p+1);s.goTimer=1;s.time=.25;R.drawHUD(ctx,s);assert.equal(R.HUDStats.paints,p+2);s.time=.38;R.drawHUD(ctx,s);assert.equal(R.HUDStats.paints,p+3);});
 fs.mkdirSync(path.join(root,'docs/review/v11'),{recursive:true});fs.writeFileSync(path.join(root,'docs/review/v11/performance-check.json'),JSON.stringify({checks,passed:checks.length,backgrounds:R.StageWorld.backgroundStats,bitmaps:R.art.bitmapStats},null,2)+'\n');console.log(checks.length+' performance checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
