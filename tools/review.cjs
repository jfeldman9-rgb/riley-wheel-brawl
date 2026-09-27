'use strict';
// Headless Chromium evidence from the runtime renderer. No image compositing.
// CHROMIUM_PATH=/path/to/chrome node tools/review.cjs
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/review');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(req.url.split('?')[0]);const file=path.join(root,pathname==='/'?'index.html':pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':file.endsWith('.jpeg')?'image/jpeg':file.endsWith('.webp')?'image/webp':'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],requests=[];
 const saveCanvas=async name=>{const url=await p.locator('#game').evaluate((c)=>c.toDataURL('image/jpeg',.85));fs.writeFileSync(path.join(out,name),Buffer.from(url.split(',')[1],'base64'));};
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});p.on('request',r=>requests.push(r.url()));
 await p.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await p.goto('http://127.0.0.1:'+server.address().port+'/');
 await p.waitForFunction(()=>window.RWB?.assets.done,{},{polling:100,timeout:30000});
 await p.evaluate(async()=>{await RWB.assets.ready(Object.keys(RWB.ART_FILES).filter(k=>k.startsWith('cut-')));await document.fonts.ready;await RWB.prepareRendering();});
 await p.evaluate(()=>{
   window.renderScene=(scene)=>{const c=document.getElementById('game');c.width=1280;c.height=720;const ctx=c.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';scene.draw(ctx);};
   window.reviewFight=(level,wave)=>{
     let seed=123+level;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
     const s=new RWB.scenes.Play(RWB.game,level,{wave,callandor:level===4});RWB.game.setSceneNow(s);
     const input={pressed:{},held:{},axis(){const a=s.enemies.filter(e=>!e.dead).sort((a,b)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0];if(!a)return{x:0,y:0};return{x:Math.abs(a.x-s.player.x)>60?Math.sign(a.x-s.player.x):0,y:Math.abs(a.y-s.player.y)>8?Math.sign(a.y-s.player.y)*.75:0};}};
     for(let frame=0;frame<300;frame++){input.pressed={};if(frame%30===0)input.pressed.attack=true;if(frame%89===0)input.pressed.special=true;if(frame%173===0)input.pressed.jump=true;s.update(1/60,input);}
     // Leave the real active pose/projectile in-frame; only remove expired intro captions.
     s.bossCard=0;s.subtitle=null;s.warningTimer=0;s.tutorial=null;
     const clear=()=>{const q=s.player,sx=q.x-s.camera.x;return sx>60&&sx<560&&!s.enemies.some(e=>!e.dead&&!e.remove&&e.y>q.y-2&&Math.abs(e.x-q.x)<60)&&!(q.invuln>0)&&!['hurt','knockback','knockdown','lying','rise','getup'].includes(q.state);};
     // Capture on the first natural frame where Riley is on screen and not covered by the pack.
     for(let frame=0;frame<900;frame++){input.pressed=frame%45===0?{special:true}:frame%20===0?{attack:true}:{};s.update(1/60,input);if(frame>20&&clear())break;}
     window.review=s;renderScene(s);
   };
 });
 for(let i=0;i<5;i++){
   await p.evaluate(i=>reviewFight(i,3),i);await p.screenshot({type:'jpeg',quality:85,path:path.join(out,'stage'+(i+1)+'-midfight.jpeg')});
   // Runtime fight at left; the committed Lido quality bar at right, equal
   // height and explicitly labelled. Canvas does the composition in-browser.
   await p.evaluate(async i=>{const c=document.getElementById('game'),shot=document.createElement('canvas');shot.width=c.width;shot.height=c.height;shot.getContext('2d').drawImage(c,0,0);const ref=new Image();ref.src='docs/review/lido-reference.png';await ref.decode();c.width=2560;c.height=720;const g=c.getContext('2d');g.fillStyle='#101827';g.fillRect(0,0,c.width,c.height);g.drawImage(shot,0,0,1280,720);g.drawImage(ref,1280,0,1280,720);g.setTransform(2,0,0,2,0,0);RWB.drawText(g,'STAGE '+(i+1)+' MID-FIGHT',320,14,8,'#fff','center');RWB.drawText(g,'LIDO REFERENCE',960,14,8,'#fff','center');},i);
   await saveCanvas('stage'+(i+1)+'-vs-lido.jpeg');
   await p.evaluate(i=>reviewFight(i,5),i);await p.screenshot({type:'jpeg',quality:85,path:path.join(out,'stage'+(i+1)+'-boss.jpeg')});
   await p.evaluate(i=>{const display=document.getElementById('game'),c=document.createElement('canvas');c.width=2560;c.height=1440;const g=c.getContext('2d');g.setTransform(2,0,0,2,0,0),cams=[0,700,1400,2000];cams.forEach((cam,j)=>{const s=new RWB.scenes.Play(RWB.game,i,{wave:i===4&&j>=2?5:3});RWB.game.setSceneNow(s);s.camera.x=cam;const px=(j%2)*640,py=Math.floor(j/2)*360;g.save();g.beginPath();g.rect(px,py,640,360);g.clip();g.translate(px,py);RWB.StageWorld.draw(g,s);RWB.StageWorld.near(g,s);RWB.drawText(g,'STAGE '+(i+1)+' WAVE '+s.wave+' / CAM '+cam+' / FULL 640 VIEW',320,18,7,'#fff','center');g.restore();});display.width=c.width;display.height=c.height;display.getContext('2d').drawImage(c,0,0);},i);
   await saveCanvas('seams-stage'+(i+1)+'.jpeg');
 }
 await p.evaluate(()=>renderScene(new RWB.scenes.Title(RWB.game)));await p.screenshot({type:'jpeg',quality:85,path:path.join(out,'title.jpeg')});
 await p.evaluate(()=>{const r=new RWB.scenes.Reel(RWB.game,RWB.CAPTIONS.callandor,()=>new RWB.scenes.Title(RWB.game),'CALLANDOR ANSWERS');r.timer=4;renderScene(r);});await p.screenshot({type:'jpeg',quality:85,path:path.join(out,'cutscene-callandor.jpeg')});
 // Freeze automatic display resizing for diagnostic canvases with custom ratios.
 await p.evaluate(()=>window.removeEventListener('resize',RWB.display.resizeHandler||RWB.display.resize));
 await p.setViewportSize({width:1600,height:1200});
 await p.evaluate(()=>{
   const c=document.getElementById('game');c.width=1600;c.height=1200;c.style.width='1600px';c.style.height='1200px';const ctx=c.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle='#1c293d';ctx.fillRect(0,0,800,600);
   const kinds=Object.keys(RWB.Puppet.defs);
   kinds.forEach((kind,i)=>{if(!(kind==='forsaken'&&RWB.assets.has('belal-idle')))RWB.Puppet.prepare(kind);const x=100+(i%4)*200,y=168+Math.floor(i/4)*198;ctx.save();ctx.translate(x,y);ctx.scale(1.20,1.20);RWB.Puppet.draw(ctx,{x:0,y:0,z:0,facing:1,state:'idle',stateT:0},0,kind);ctx.restore();RWB.drawText(ctx,kind.toUpperCase(),x,y+13,5,'#e7d499','center');});const scene=new RWB.scenes.Play(RWB.game,0,{}),r=scene.player;r.x=700;r.y=564;r.drawSprite(ctx,0,'idle');RWB.drawText(ctx,'RILEY 16',700,577,5,'#e7d499','center');
 });await p.screenshot({type:'jpeg',quality:85,path:path.join(out,'character-closeups.jpeg')});
 await p.setViewportSize({width:1280,height:720});
 await p.evaluate(()=>{const c=document.getElementById('game');c.width=1920;c.height=420;c.style.width='1280px';c.style.height='280px';const g=c.getContext('2d');g.setTransform(2,0,0,2,0,0);g.fillStyle='#1c293d';g.fillRect(0,0,960,210);const scene=new RWB.scenes.Play(RWB.game,0,{}),r=scene.player;for(let f=0;f<8;f++){r.x=60+f*120;r.y=167;r.walkDistance=f*20;r.drawSprite(g,0,'walk'+(f%4+1));g.fillStyle='#91bad555';g.fillRect(f*120+12,169,96,1);RWB.drawText(g,String(f+1).padStart(2,'0'),60+f*120,190,7,'#e7d499','center');}RWB.drawText(g,'RILEY / 8 STEPS / 4-FRAME DISTANCE CYCLE',480,14,8,'#fff','center');});
 await saveCanvas('walk-riley.jpeg');fs.writeFileSync(path.join(out,'walk-riley.json'),JSON.stringify({kind:'riley',frames:8,cycleFrames:4,distanceDriven:true},null,2)+'\n');
 for(const kind of ['trolloc','darkfriend','cultist']){
   const metric=await p.evaluate(kind=>{
     const c=document.getElementById('game');c.width=1920;c.height=420;c.style.width='1280px';c.style.height='280px';
     const ctx=c.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle='#1c293d';ctx.fillRect(0,0,960,210);
     RWB.Puppet.prepare(kind);const d=RWB.Puppet.defs[kind],a={x:0,y:0,z:0,facing:1,state:'walk',stateT:0,visualHeight:d.height};RWB.Puppet.updateGait(a,1/60);
     const distance=64*d.height/80;let maxDrift=0,stanceSamples=0;
     for(let f=0;f<8;f++){
       for(let j=0;j<12;j++){const before=a.gait.feet.map(p=>({...p}));a.x+=distance/96;RWB.Puppet.updateGait(a,1/60);a.gait.feet.forEach((p,i)=>{if(p.stance&&before[i]?.stance){maxDrift=Math.max(maxDrift,Math.hypot(p.x-before[i].x,p.y-before[i].y));stanceSamples++;}});}
       ctx.save();ctx.translate(60+f*120,167);ctx.scale(1.35,1.35);RWB.Puppet.draw(ctx,a,a.x,kind);ctx.restore();
       ctx.fillStyle='#91bad555';ctx.fillRect(f*120+12,169,96,1);RWB.drawText(ctx,String(f+1).padStart(2,'0'),60+f*120,190,7,'#e7d499','center');
     }
     RWB.drawText(ctx,kind.toUpperCase()+' / 8 WALK PHASES / FIXED WORLD CONTACTS',480,14,8,'#ffffff','center');return{kind,frames:8,maxDrift,stanceSamples};
   },kind);
   await saveCanvas('walk-'+kind+'.jpeg');fs.writeFileSync(path.join(out,'walk-'+kind+'.json'),JSON.stringify(metric,null,2)+'\n');
 }
 // True 3x action crops, plus age/scale and Be'lal sword proof boards. All use
 // RWB.Puppet.draw, never pasted source art.
 await p.setViewportSize({width:1600,height:900});
 await p.evaluate(()=>{const c=document.getElementById('game');c.width=1600;c.height=900;c.style.width='1600px';c.style.height='900px';const g=c.getContext('2d');g.setTransform(2,0,0,2,0,0);g.fillStyle='#17243a';g.fillRect(0,0,800,450);['trolloc','darkfriend','cultist'].forEach(kind=>RWB.Puppet.prepare(kind));const specs=[['trolloc','walk','WAIST'],['darkfriend','walk','CLOAK'],['cultist','attack','SHOULDER / HIP'],['forsaken','attack','SWORD HAND']];specs.forEach(([kind,state,label],i)=>{const a={x:0,y:0,z:0,facing:1,state,stateT:.22,ai:state==='attack'?'attack':'',attackMove:state==='attack'?{duration:.55}:null,attackName:'front'};if(state==='walk'){RWB.Puppet.updateGait(a,1/60);for(let n=0;n<20;n++){a.x++;RWB.Puppet.updateGait(a,1/60);}}g.save();g.beginPath();g.rect(i*200,0,200,450);g.clip();g.translate(i*200+100,335);g.scale(3,3);RWB.Puppet.draw(g,a,a.x,kind);g.restore();RWB.drawText(g,label,i*200+100,420,6,'#fff','center');});});
 await saveCanvas('joints-closeup.jpeg');
 await p.setViewportSize({width:1800,height:700});
 await p.evaluate(()=>{const c=document.getElementById('game');c.width=2700;c.height=1000;c.style.width='2700px';c.style.height='1000px';const g=c.getContext('2d');g.setTransform(2,0,0,2,0,0);g.fillStyle='#17243a';g.fillRect(0,0,1350,500);const frames=['idle','walk1','walk2','walk3','walk4','punch','kick','fireball','hurt','jump'],scene=new RWB.scenes.Play(RWB.game,0,{}),r=scene.player;frames.forEach((frame,i)=>{r.x=75+(i%5)*205;r.y=190+Math.floor(i/5)*220;r.facing=1;r.drawSprite(g,0,frame);RWB.drawText(g,frame.toUpperCase(),r.x,r.y+20,6,'#fff','center');});const tx=1250,ty=410,a={x:tx,y:ty,z:0,facing:-1,state:'idle',stateT:0};RWB.Puppet.draw(g,a,0,'trolloc');RWB.drawText(g,'TROLLOC',tx,ty+20,6,'#fff','center');r.x=1115;r.y=410;r.facing=1;r.drawSprite(g,0,'idle');RWB.drawText(g,'RILEY / SAME WORLD SCALE',1115,430,6,'#fff','center');});
 await saveCanvas('riley-closeup.jpeg');
 await p.evaluate(()=>{const c=document.getElementById('game');c.width=2800;c.height=1000;c.style.width='2800px';c.style.height='1000px';const g=c.getContext('2d');g.setTransform(2,0,0,2,0,0);g.fillStyle='#17243a';g.fillRect(0,0,1400,500);const H=RWB.Puppet.defs.forsaken.height;
   const cells=[['IDLE',{}],['WALK 1',{state:'walk',walkDistance:0}],['WALK 2',{state:'walk',walkDistance:15}],['WALK 3',{state:'walk',walkDistance:30}],['WALK 4',{state:'walk',walkDistance:45}],['FLURRY TELL',{ai:'telegraph',attack:{mode:'combo',active:.6,recover:.4}}],['FLURRY t=.2',{ai:'attack',aiTimer:.48,attack:{mode:'combo',active:.6,recover:.4}}],['FLURRY t=.5',{ai:'attack',aiTimer:.3,attack:{mode:'combo',active:.6,recover:.4}}],['FLURRY t=.8',{ai:'attack',aiTimer:.12,attack:{mode:'combo',active:.6,recover:.4}}],['BALEFIRE',{ai:'attack',aiTimer:.3,attack:{mode:'beam',active:.6,recover:.4}}],['HURT',{state:'hurt'}],['FACING RIGHT',{facing:1}]];
   cells.forEach(([label,o],i)=>{const x=110+(i%6)*225,y=200+Math.floor(i/6)*230,a=Object.assign({x,y,z:0,facing:-1,state:'idle',stateT:0,ai:'approach',aiTimer:0,vx:0,vy:0},o);g.fillStyle='#91bad555';g.fillRect(x-80,y,160,1);RWB.drawBelal(g,a,0,H);RWB.drawText(g,label,x,y+18,6,'#e7d499','center');});
   RWB.drawText(g,"BE'LAL / PAINTED FRAMES VIA RWB.drawBelal (RUNTIME) / SWORD PAINTED IN HAND",700,16,7,'#fff','center');});
 await saveCanvas('belal-closeup.jpeg');
 await p.setViewportSize({width:1600,height:1000});
 await p.evaluate(()=>{
   const c=document.getElementById('game');c.width=1600;c.height=1000;c.style.width='1600px';c.style.height='1000px';const ctx=c.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle='#1c293d';ctx.fillRect(0,0,800,500);
   const poses=['walk','attack','channel','hurt','knockdown'];
   poses.forEach((pose,i)=>RWB.drawText(ctx,pose.toUpperCase(),80+i*160,16,7,'#e7d499','center'));
   ['cultist','trolloc','darkfriend'].forEach(kind=>RWB.Puppet.prepare(kind));['cultist','trolloc','darkfriend'].forEach((kind,row)=>poses.forEach((pose,col)=>{
     const d=RWB.Puppet.defs[kind],a={x:0,y:0,z:0,facing:1,state:pose,stateT:.15,visualHeight:d.height};
     if(pose==='walk'){RWB.Puppet.updateGait(a,1/60);for(let i=0;i<20;i++){a.x+=1;RWB.Puppet.updateGait(a,1/60);}}
     if(pose==='attack'){if(kind==='cultist')a.ai='attack';else a.ai='attack';}
     const x=80+col*160,y=150+row*160,down=pose==='knockdown',scale=down?.95:1.15;ctx.save();ctx.translate(x+(down?20:0),y-(down?20:0));ctx.scale(scale,scale);RWB.Puppet.draw(ctx,a,a.x,kind);ctx.restore();
     RWB.drawText(ctx,kind.toUpperCase(),x,y+16,5,'#e7d499','center');
   }));
 });await p.screenshot({type:'jpeg',quality:85,path:path.join(out,'rig-poses.jpeg')});
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
 const unstamped=requests.filter(url=>/\.(js|css|ttf|png|jpeg|webp)(\?|$)/.test(url)&&!url.includes('/docs/review/lido-reference.png')&&!url.includes('v=20260927-scroll5'));
 let blocked=0;await p.route('**/assets/art/stage3-mid.png*',route=>{blocked++;return route.abort();});
 await p.reload();await p.waitForFunction(()=>RWB.assets.done,{},{polling:100,timeout:30000});
 const fallback=await p.evaluate(()=>{const s=new RWB.scenes.Play(RWB.game,2,{}),c=document.getElementById('game'),ctx=c.getContext('2d');ctx.setTransform(2,0,0,2,0,0);s.draw(ctx);return{failed:RWB.assets.failed(),playable:s.phase==='play'};});
 fallback.requests=blocked;
 if(blocked!==2||!fallback.playable||!fallback.failed.includes('stage3-mid'))errors.push('Missing-image retry/fallback regression');
 fs.writeFileSync(path.join(out,'browser-audit.json'),JSON.stringify({errors,unstamped,...audit,timings,fallback},null,2)+'\n');
 console.log(JSON.stringify({errors,unstamped,...audit}));await browser.close();server.close();if(errors.length||unstamped.length||audit.failed.length||audit.missing.length)process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
