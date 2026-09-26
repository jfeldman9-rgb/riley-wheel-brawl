// Deterministic content and accessibility checks for the no-build game.
'use strict';
const fs=require('fs'),path=require('path');
const {boot}=require('./soak.cjs');
const root=path.resolve(__dirname,'..'),RWB=boot(root);
let failures=[];const ok=(v,msg)=>{console.log((v?'PASS ':'FAIL ')+msg);if(!v)failures.push(msg);};
const game=RWB.game;
let title=new RWB.scenes.Title(game);game.scene=title;
title.update(0,{pressed:{start:true}});ok(game.nextScene instanceof RWB.scenes.Reel,'Title starts opening reel');
let reel=game.nextScene, count=0;
while(reel instanceof RWB.scenes.Reel&&count++<20){const before=reel.i;reel.update(.01,{pressed:{attack:true}});ok(reel.i!==before||game.nextScene!==reel,'Cutscene skip advances');if(game.nextScene&&game.nextScene!==reel){reel=game.nextScene;game.nextScene=null;}else break;}
const old=RWB.settings.data.shake;RWB.settings.data.shake='full';let c1=new RWB.Camera();c1.impact(1,'super');RWB.settings.data.shake='reduced';let c2=new RWB.Camera();c2.impact(1,'super');ok(c2.shakeAmt<c1.shakeAmt&&c2.flashT<c1.flashT,'Reduced Shake lowers finale shake and flash');RWB.settings.data.shake=old;
let p3=new RWB.scenes.Play(game,2,{});p3.wave=5;p3.spawnBoss();ok(p3.boss.kind==='DRAGHKAR'&&p3.boss.z>0,'Draghkar begins truly airborne');p3.boss.attackClock=.66;p3.boss.update(.01);if(p3.boss.telegraph==='SWOOPING DIVE')ok(p3.boss.z<=8,'Draghkar descends only for dive');
let p5=new RWB.scenes.Play(game,4,{});p5.wave=5;p5.spawnBoss();p5.boss.usedAttacks=new Set(p5.level.attacks);p5.boss.hp=0;p5.boss.dead=true;p5.update(.01,{pressed:{},axis:()=>({x:0,y:0})});ok(p5.phase==='finale'&&!p5.boss.dead,'Taim remains alive before converging beams');p5.updateFinale(2.3,{pressed:{}});ok(p5.boss.dead&&p5.finaleConnected,'Taim falls after beams connect');
ok(RWB.ART_MANIFEST.length===0&&RWB.__assetRequests()===0,'Empty art manifest makes zero image requests');
const md=fs.readFileSync(path.join(root,'docs/VOICE_LINES.md'),'utf8');const catalog=new Map([...md.matchAll(/`([^`]+)`[^\n]*?\| [^|]+ \| “([^”]+)”/g)].map(m=>[m[1],m[2]]));
let lines=[];const walk=v=>{if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object'){if(v.id)lines.push(v);else Object.values(v).forEach(walk);}};walk(RWB.CAPTIONS);
const mismatch=lines.filter(l=>catalog.get(l.id)!==l.text);ok(!mismatch.length,'Every caption id exists and text matches voice catalog');if(mismatch.length)console.log(mismatch);
if(failures.length){console.error(`${failures.length} check(s) failed`);process.exit(1);}console.log('All checks passed.');
