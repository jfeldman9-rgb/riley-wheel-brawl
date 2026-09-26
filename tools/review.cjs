'use strict';
// Headless Chromium evidence from the runtime renderer. No image compositing.
// CHROMIUM_PATH=/path/to/chrome node tools/review.cjs
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/review');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(req.url.split('?')[0]);const file=path.join(root,pathname==='/'?'index.html':pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':file.endsWith('.jpeg')?'image/jpeg':'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],requests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});p.on('request',r=>requests.push(r.url()));
 await p.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await p.goto('http://127.0.0.1:'+server.address().port+'/');
 await p.waitForFunction(()=>window.RWB?.assets.done);
 await p.evaluate(async()=>{await RWB.assets.ready(Object.keys(RWB.ART_FILES).filter(k=>k.startsWith('cut-')));await document.fonts.ready;});
 await p.evaluate(()=>{
   window.renderScene=(scene)=>{const c=document.getElementById('game');c.width=1280;c.height=720;const ctx=c.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';scene.draw(ctx);};
   window.reviewFight=(level,wave)=>{
     let seed=123+level;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
     const s=new RWB.scenes.Play(RWB.game,level,{wave,callandor:level===4});RWB.game.setSceneNow(s);
     const input={pressed:{},held:{},axis(){const a=s.enemies.filter(e=>!e.dead).sort((a,b)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0];if(!a)return{x:0,y:0};return{x:Math.abs(a.x-s.player.x)>60?Math.sign(a.x-s.player.x):0,y:Math.abs(a.y-s.player.y)>8?Math.sign(a.y-s.player.y)*.75:0};}};
     for(let frame=0;frame<300;frame++){input.pressed={};if(frame%30===0)input.pressed.attack=true;if(frame%89===0)input.pressed.special=true;if(frame%173===0)input.pressed.jump=true;s.update(1/60,input);}
     // Leave the real active pose/projectile in-frame; only remove expired intro captions.
     s.bossCard=0;s.subtitle=null;s.warningTimer=0;s.tutorial=null;
     for(let frame=0;frame<90;frame++){input.pressed=frame===0?{special:true}:frame%20===0?{attack:true}:{};s.update(1/60,input);if(s.projectiles.length && s.projectiles[0].x-s.player.x>20)break;}
     window.review=s;renderScene(s);
   };
 });
 for(let i=0;i<5;i++){
   await p.evaluate(i=>reviewFight(i,3),i);await p.screenshot({type:'jpeg',quality:92,path:path.join(out,'stage'+(i+1)+'-midfight.jpeg')});
   await p.evaluate(i=>reviewFight(i,5),i);await p.screenshot({type:'jpeg',quality:92,path:path.join(out,'stage'+(i+1)+'-boss.jpeg')});
 }
 await p.evaluate(()=>renderScene(new RWB.scenes.Title(RWB.game)));await p.screenshot({type:'jpeg',quality:92,path:path.join(out,'title.jpeg')});
 await p.evaluate(()=>{const r=new RWB.scenes.Reel(RWB.game,RWB.CAPTIONS.callandor,()=>new RWB.scenes.Title(RWB.game),'CALLANDOR ANSWERS');r.timer=4;renderScene(r);});await p.screenshot({type:'jpeg',quality:92,path:path.join(out,'cutscene-callandor.jpeg')});
 // Freeze automatic display resizing for diagnostic canvases with custom ratios.
 await p.evaluate(()=>window.removeEventListener('resize',RWB.display.resize));
 await p.setViewportSize({width:1600,height:1200});
 await p.evaluate(()=>{
   const c=document.getElementById('game');c.width=1600;c.height=1200;c.style.width='1600px';c.style.height='1200px';const ctx=c.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle='#1c293d';ctx.fillRect(0,0,800,600);
   const kinds=Object.keys(RWB.Puppet.defs);
   kinds.forEach((kind,i)=>{const x=100+(i%4)*200,y=168+Math.floor(i/4)*198;ctx.save();ctx.translate(x,y);ctx.scale(1.20,1.20);RWB.Puppet.draw(ctx,{x:0,y:0,z:0,facing:1,state:'idle',stateT:0},0,kind);ctx.restore();RWB.drawText(ctx,kind.toUpperCase(),x,y+13,5,'#e7d499','center');});
 });await p.screenshot({type:'jpeg',quality:92,path:path.join(out,'character-closeups.jpeg')});
 await p.setViewportSize({width:1280,height:720});
 for(const kind of ['riley','trolloc','darkfriend']){
   const metric=await p.evaluate(kind=>{
     const c=document.getElementById('game');c.width=1920;c.height=420;c.style.width='1280px';c.style.height='280px';
     const ctx=c.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle='#1c293d';ctx.fillRect(0,0,960,210);
     const d=RWB.Puppet.defs[kind],a={x:0,y:0,z:0,facing:1,state:'walk',stateT:0,visualHeight:d.height};RWB.Puppet.updateGait(a,1/60);
     const distance=64*d.height/80;let maxDrift=0,stanceSamples=0;
     for(let f=0;f<8;f++){
       for(let j=0;j<12;j++){const before=a.gait.feet.map(p=>({...p}));a.x+=distance/96;RWB.Puppet.updateGait(a,1/60);a.gait.feet.forEach((p,i)=>{if(p.stance&&before[i]?.stance){maxDrift=Math.max(maxDrift,Math.hypot(p.x-before[i].x,p.y-before[i].y));stanceSamples++;}});}
       ctx.save();ctx.translate(60+f*120,167);ctx.scale(1.35,1.35);RWB.Puppet.draw(ctx,a,a.x,kind);ctx.restore();
       ctx.fillStyle='#91bad555';ctx.fillRect(f*120+12,169,96,1);RWB.drawText(ctx,String(f+1).padStart(2,'0'),60+f*120,190,7,'#e7d499','center');
     }
     RWB.drawText(ctx,kind.toUpperCase()+' / 8 WALK PHASES / FIXED WORLD CONTACTS',480,14,8,'#ffffff','center');return{kind,frames:8,maxDrift,stanceSamples};
   },kind);
   await p.locator('#game').screenshot({type:'jpeg',quality:92,path:path.join(out,'walk-'+kind+'.jpeg')});fs.writeFileSync(path.join(out,'walk-'+kind+'.json'),JSON.stringify(metric,null,2)+'\n');
 }
 await p.setViewportSize({width:1600,height:1000});
 await p.evaluate(()=>{
   const c=document.getElementById('game');c.width=1600;c.height=1000;c.style.width='1600px';c.style.height='1000px';const ctx=c.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle='#1c293d';ctx.fillRect(0,0,800,500);
   const poses=['walk','attack','channel','hurt','knockdown'];
   poses.forEach((pose,i)=>RWB.drawText(ctx,pose.toUpperCase(),80+i*160,16,7,'#e7d499','center'));
   ['riley','trolloc','darkfriend'].forEach((kind,row)=>poses.forEach((pose,col)=>{
     const d=RWB.Puppet.defs[kind],a={x:0,y:0,z:0,facing:1,state:pose,stateT:.15,visualHeight:d.height};
     if(pose==='walk'){RWB.Puppet.updateGait(a,1/60);for(let i=0;i<20;i++){a.x+=1;RWB.Puppet.updateGait(a,1/60);}}
     if(pose==='attack'){if(kind==='riley'){a.attackMove=RWB.MOVES.front;a.attackName='front';}else a.ai='attack';}
     const x=80+col*160,y=150+row*160,down=pose==='knockdown',scale=down?.95:1.15;ctx.save();ctx.translate(x+(down?20:0),y-(down?20:0));ctx.scale(scale,scale);RWB.Puppet.draw(ctx,a,a.x,kind);ctx.restore();
     RWB.drawText(ctx,kind.toUpperCase(),x,y+16,5,'#e7d499','center');
   }));
 });await p.screenshot({type:'jpeg',quality:92,path:path.join(out,'rig-poses.jpeg')});
 await p.setViewportSize({width:1280,height:720});
 const contacts=await p.evaluate(()=>{
   return Object.entries(RWB.Puppet.defs).map(([kind,d])=>{
     let maxDrift=0,maxContactError=0,samples=0;
     for(const direction of [-1,1]){
       const a={x:0,y:0,z:0,facing:direction,state:'walk',stateT:0,visualHeight:d.height};RWB.Puppet.updateGait(a,1/60);
       for(let f=0;f<180;f++){
         const previous=RWB.Puppet.contacts(a,kind),old=a.gait.feet.map(p=>({...p})),dt=[1/30,1/60,1/120][f%3],speed=35+(f%60)*2;
         a.x+=direction*speed*dt;a.y+=Math.sin(f*.04)*speed*.25*dt;RWB.Puppet.updateGait(a,dt);
         RWB.Puppet.contacts(a,kind).forEach((p,i)=>{const foot=a.gait.feet[i];if(!foot?.stance)return;maxContactError=Math.max(maxContactError,Math.hypot(p.x-foot.x,p.y-foot.y));if(old[i]?.stance){maxDrift=Math.max(maxDrift,Math.hypot(p.x-previous[i].x,p.y-previous[i].y));samples++;}});
       }
     }
     return {kind,samples,maxDrift:+maxDrift.toFixed(6),maxContactError:+maxContactError.toFixed(6)};
   });
 });
 fs.writeFileSync(path.join(out,'rendered-foot-contacts.json'),JSON.stringify(contacts,null,2)+'\n');
 if(contacts.some(r=>r.maxDrift>.15||r.maxContactError>.15||r.samples<200))errors.push('Rendered sole contact drift exceeds 0.15 world pixels');
 const timings=await p.evaluate(()=>{
   const results=[];for(let level=0;level<5;level++){reviewFight(level,3);const start=performance.now();for(let f=0;f<30;f++)renderScene(review);results.push({stage:level+1,drawMs:+((performance.now()-start)/30).toFixed(2)});}return results;
 });
 const audit=await p.evaluate(()=>({failed:RWB.assets.failed(),loaded:RWB.ART_MANIFEST.length,missing:Object.entries(RWB.ART_FILES).filter(([k,path])=>RWB.ART_MANIFEST.includes(path)&&!RWB.assets.has(k)).map(([k])=>k)}));
 const unstamped=requests.filter(url=>/\.(js|css|ttf|png|jpeg)(\?|$)/.test(url)&&!url.includes('v=20260926-w2'));
 let blocked=0;await p.route('**/assets/art/stage3-mid.png*',route=>{blocked++;return route.abort();});
 await p.reload();await p.waitForFunction(()=>RWB.assets.done);
 const fallback=await p.evaluate(()=>{const s=new RWB.scenes.Play(RWB.game,2,{}),c=document.getElementById('game'),ctx=c.getContext('2d');ctx.setTransform(2,0,0,2,0,0);s.draw(ctx);return{failed:RWB.assets.failed(),playable:s.phase==='play'};});
 fallback.requests=blocked;
 if(blocked!==2||!fallback.playable||!fallback.failed.includes('stage3-mid'))errors.push('Missing-image retry/fallback regression');
 fs.writeFileSync(path.join(out,'browser-audit.json'),JSON.stringify({errors,unstamped,...audit,timings,fallback},null,2)+'\n');
 console.log(JSON.stringify({errors,unstamped,...audit}));await browser.close();server.close();if(errors.length||unstamped.length||audit.failed.length||audit.missing.length)process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
