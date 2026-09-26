const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createCanvas, Image, GlobalFonts } = require('@napi-rs/canvas');
const root = process.argv[2] || require('node:path').resolve(__dirname, '..');
GlobalFonts.registerFromPath(root + '/assets/fonts/press-start-2p.ttf', 'Press Start 2P');
function scriptList(){return [...fs.readFileSync(root+'/index.html','utf8').matchAll(/<script src="js\/(\w+)\.js/g)].map(m=>m[1])}
function memStore(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
function boot(width,height,dpr,coarse,storage){
  const listeners = {}, clisteners = {}, dl = {}, canvas = createCanvas(640,360);
  canvas.style={};canvas.classList={toggle(){}};
  canvas.addEventListener=(k,fn)=>{if(!clisteners[k])clisteners[k]=fn};
  canvas.getBoundingClientRect=()=>({left:0,top:0,width:parseFloat(canvas.style.width),height:parseFloat(canvas.style.height)});
  const context={console,Math,Promise,performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},innerWidth:width,innerHeight:height,devicePixelRatio:dpr,
    matchMedia:q=>({matches:q.includes('coarse')?coarse:q.includes('fine')?!coarse:false,addEventListener(){},removeEventListener(){}}),
    addEventListener:(k,fn)=>(listeners[k]??=[]).push(fn),navigator:{maxTouchPoints:coarse?5:0,getGamepads:()=>[]},
    localStorage:storage||memStore(),location:{hash:''},requestAnimationFrame:fn=>context.frame=fn,
    document:{getElementById:()=>canvas,createElement:()=>createCanvas(1,1),addEventListener:(k,fn)=>(dl[k]??=[]).push(fn),fonts:{load:()=>Promise.resolve()}},
    Image:class{set src(src){try{const im=new Image();im.src=fs.readFileSync(root+'/'+src.split('?')[0]);this.width=im.width;this.height=im.height;this.onload?.()}catch{this.onerror?.()}}}
  };context.window=context;vm.createContext(context);
  for(const f of scriptList())vm.runInContext(fs.readFileSync(root+'/js/'+f+'.js','utf8'),context,{filename:f+'.js'});
  // Images above test loading/fallback, not cutscene raster composition.
  context.RWB.assets.get=()=>null;
  return {context,canvas,listeners,clisteners,dl,RWB:context.RWB};
}
const cases=[[844,390,3,true,2080,1170],[390,844,3,true,1184,666],[1280,720,2,false,2560,1440],[3840,2160,1,false,3840,2160],[5120,2880,2,false,3840,2160]];
for(const [w,h,dpr,touch,bw,bh] of cases){
 const b=boot(w,h,dpr,touch),{RWB,canvas}=b;
 assert.equal(canvas.width,bw);assert.equal(canvas.height,bh);assert.equal(canvas.style.imageRendering,'auto');
 assert.equal(RWB.input.touchEnabled,touch);
 const layout=RWB.display.pc;
 for(const mode of ['sharp','classic','auto']){RWB.display.setMode(mode);assert.equal(RWB.display.pc,layout);assert.equal(RWB.input.touchEnabled,touch);if(mode==='classic'){assert.equal(canvas.width,640);assert.equal(canvas.height,360);assert.equal(canvas.style.imageRendering,'pixelated')}}
 console.log(`PASS ${w}x${h} @${dpr}: ${bw}x${bh}; all display modes preserve input type`);
}
const b=boot(844,390,3,true),{RWB,canvas,listeners,clisteners,context}=b;
const key=(k,down)=>listeners[down?'keydown':'keyup'][0]({key:k,preventDefault(){}});
for(const [k,act] of Object.entries({e:'attack',j:'attack',z:'attack',' ':'jump',k:'jump',x:'jump',q:'special',l:'special',c:'special',r:'tool',i:'tool',v:'tool',f:'saidin',b:'saidin',Escape:'pause',p:'pause',Enter:'start',m:'mute','\\':'fullscreen'})){
 key(k,true);RWB.input.beginFrame();assert.equal(RWB.input.pressed[act],true,k);key(k,false);RWB.input.beginFrame();assert.equal(RWB.input.held[act],false,k);
}
key('d',true);assert.equal(RWB.input.axis().x,1);key('d',false);
for(const button of RWB.input.touch.buttons){const rect=canvas.getBoundingClientRect();const ev={pointerType:'touch',pointerId:1,clientX:button.x/640*rect.width,clientY:button.y/360*rect.height};clisteners.pointerdown(ev);RWB.input.beginFrame();assert.equal(RWB.input.pressed[button.id],true,button.id);clisteners.pointerup(ev);assert.equal(RWB.input.held[button.id],false)}
const pad={connected:true,index:0,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};context.navigator.getGamepads=()=>[pad];
for(const [idx,act] of Object.entries({0:'jump',1:'saidin',2:'attack',3:'special',4:'tool',5:'tool',8:'pause',9:'start'})){pad.buttons[idx].pressed=true;RWB.input.beginFrame();assert.equal(RWB.input.pressed[act],true);pad.buttons[idx].pressed=false;RWB.input.beginFrame();assert.equal(RWB.input.held[act],false)}
context.navigator.getGamepads=()=>[];RWB.input.beginFrame();
console.log('PASS keyboard aliases, all touch targets and standard gamepad bindings');
for(let i=0;i<5;i++){
 const scene=new RWB.scenes.Play(RWB.game,i,{});scene.enter?.();scene.phase='play';scene.bannerT=0;scene.player.x=270;scene.player.y=275;
 scene.spawnEnemy(i===0?'trolloc':i===1?'assassin':i===2?'stoneDefender':'turnedAshaman',360,280,{});
 if(i===3)scene.spawnBoss();
 const ctx=canvas.getContext('2d');ctx.setTransform(RWB.display.renderScale,0,0,RWB.display.renderScale,0,0);scene.draw(ctx);
 if(process.env.WL_CAPTURE_DIR) fs.writeFileSync(process.env.WL_CAPTURE_DIR+'/wl-stage-'+i+'.png',canvas.toBuffer('image/png'));
 for(let f=0;f<120;f++)scene.update(1/60,RWB.input);
 RWB.game.scene=scene;scene.paused=false;context.document.hidden=true;b.dl.visibilitychange.forEach(fn=>fn());assert.equal(scene.paused,true);
 console.log(`PASS stage ${i+1}: render, 120 update frames, background auto-pause`);
}
const ctx=canvas.getContext('2d');new RWB.scenes.Title(RWB.game).draw(ctx);if(process.env.WL_CAPTURE_DIR) fs.writeFileSync(process.env.WL_CAPTURE_DIR+'/wl-title.png',canvas.toBuffer('image/png'));
const titleWidth=RWB.text.width(ctx,'battle BRAWL',34);assert.ok(240-titleWidth/2-4>0);console.log('PASS title fits without clipping');

// Exercise actual BOX actions, not just whether an input event was queued.
for (const pointerType of ['mouse', 'pen', 'touch']) {
  const env = boot(844,390,3,pointerType === 'touch');
  const {RWB,canvas,clisteners} = env;
  const scene = new RWB.scenes.Play(RWB.game,0,{}); scene.enter();
  scene.phase='play'; scene.bannerT=0; scene.objects=[]; scene.enemies=[];
  scene.player.hasRelic = true; scene.player.loialReady = false;
  RWB.game.scene=scene;
  const rect=canvas.getBoundingClientRect();
  const event=(id,x,y)=>({pointerId:id,pointerType,clientX:x/640*rect.width,clientY:y/360*rect.height});
  const box=event(3,580,326);
  if(pointerType==='touch') {
    clisteners.pointerdown(event(1,60,290));
    clisteners.pointermove(event(1,90,290));
    assert.ok(RWB.input.axis().x>0,'joystick moves before BOX');
  }
  clisteners.pointerdown(box); RWB.input.beginFrame();
  assert.equal(RWB.input.pressed.tool,true);
  assert.equal(!!RWB.input.pressed.start,false,'BOX must not pause');
  scene.player.update(1/60,RWB.input);
  assert.equal(scene.player.state,'throw');
  clisteners.pointerup(box); RWB.input.beginFrame();
  if(pointerType==='touch') {
    assert.ok(RWB.input.axis().x>0,'releasing BOX leaves joystick active');
    clisteners.pointerup(event(1,90,290));
  }
  for(let i=0;i<24;i++) scene.player.update(1/60,RWB.input);
  assert.equal(scene.projectiles.length,1);
  assert.equal(scene.projectiles[0].kind,'relic');
  assert.equal(scene.player.hasRelic,false);
  const projectile=scene.projectiles[0];
  for(let i=0;i<120 && !projectile.remove;i++) projectile.update(1/60);
  const pickup=scene.pickups.find(p=>p.kind==='relic');
  assert.ok(pickup,'thrown relic returns as pickup');
  scene.player.collect(pickup);
  assert.equal(scene.player.hasRelic,true);
  clisteners.pointerdown(box); RWB.input.beginFrame(); scene.player.update(1/60,RWB.input);
  assert.equal(scene.player.state,'throw','recovered relic can be thrown again');
  clisteners.pointercancel(box); assert.equal(RWB.input.held.tool,false);
  console.log(`PASS ${pointerType}: BOX throw, recover, rethrow, cancel; no accidental pause`);
}
// Between BOX and ATK, the nearest padded target should win, not array order.
{
  const {RWB,canvas,clisteners}=boot(844,390,3,true);
  const rect=canvas.getBoundingClientRect();
  const ev={pointerType:'touch',pointerId:7,clientX:556/640*rect.width,clientY:314/360*rect.height};
  clisteners.pointerdown(ev); RWB.input.beginFrame();
  assert.equal(RWB.input.pressed.tool,true,'nearest BOX target beats ATK padding');
  assert.equal(!!RWB.input.pressed.attack,false);
  clisteners.pointerup(ev);
  // Releasing one finger does not release another finger's same action.
  clisteners.pointerdown({...ev,pointerId:8}); clisteners.pointerdown({...ev,pointerId:9});
  clisteners.pointerup({...ev,pointerId:8}); assert.equal(RWB.input.held.tool,true);
  clisteners.lostpointercapture({...ev,pointerId:9}); assert.equal(RWB.input.held.tool,false);
  console.log('PASS button-edge hit testing and multi-pointer release');
}

/* ---- Upgrade pass: settings, remaps, continue, fairness, combo, FX, boss ---- */
const freshPlay=(RWB,i,carry)=>{const s=new RWB.scenes.Play(RWB.game,i,carry||{});s.enter();s.phase='play';s.bannerT=0;RWB.game.scene=s;return s};
// 10. Settings persistence + 4. remaps survive reload and drive badges.
{
  const store=memStore();
  let env=boot(1280,720,2,false,store);
  let {RWB}=env;
  RWB.settings.set({overlay:0.85,bigHud:true,colorblind:true,fx:'lite',shake:'reduced'});
  RWB.display.setMode('classic'); RWB.audio.setVolume(0.35); RWB.audio.setMusicLevel(0.4); RWB.display.save();
  assert.equal(RWB.settings.setKey('attack','h').ok,true);
  assert.equal(RWB.settings.setKey('jump','e').ok,true,'old attack primary is free to reuse');
  assert.equal(RWB.settings.setPad('attack',1).ok,true);
  assert.equal(JSON.stringify(RWB.settings.data.pad.saidin),'[2]','stolen pad button swaps, nothing left unbound');
  assert.equal(RWB.settings.setKey('attack','Enter').ok,false,'Enter stays reserved');
  env=boot(1280,720,2,false,store); RWB=env.RWB;
  const s=RWB.settings.data;
  assert.equal(s.overlay,0.85); assert.equal(s.bigHud,true); assert.equal(s.colorblind,true); assert.equal(s.fx,'lite'); assert.equal(s.shake,'reduced');
  assert.equal(RWB.display.mode,'classic'); assert.equal(env.canvas.width,640,'classic survives reload');
  assert.equal(RWB.audio.volume,0.35); assert.equal(RWB.audio.musicLevel,0.4);
  const key=(k,down)=>env.listeners[down?'keydown':'keyup'][0]({key:k,preventDefault(){}});
  key('h',true);RWB.input.beginFrame();assert.equal(RWB.input.pressed.attack,true,'remapped key attacks');key('h',false);
  key('e',true);RWB.input.beginFrame();assert.equal(RWB.input.pressed.jump,true);assert.equal(!!RWB.input.pressed.attack,false);key('e',false);
  key('j',true);RWB.input.beginFrame();assert.equal(RWB.input.pressed.attack,true,'arcade alias kept');key('j',false);RWB.input.beginFrame();
  assert.equal(RWB.input.badgeFor('attack'),'H'); assert.equal(RWB.input.badgeFor('jump'),'E');
  assert.ok(RWB.input.fillKeys('{attack}: GO').startsWith('H/J'),'tutorial copy follows remaps');
  // Badges drawn in the sticky chrome match the remap, and the chrome still draws PICK UP.
  const drawn=[];const orig=RWB.text.draw;RWB.text.draw=(c,str,...r)=>{drawn.push(str);return orig(c,str,...r)};
  const ctx=env.canvas.getContext('2d');RWB.input.drawTouch(ctx,{always:true,surgeReady:false,hasRelic:false});RWB.text.draw=orig;
  assert.ok(drawn.includes('H')&&drawn.includes('PICK UP'),'chrome shows remapped badge and PICK UP');
  // Pad remap drives actions.
  const pad={connected:true,index:0,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};env.context.navigator.getGamepads=()=>[pad];
  pad.buttons[1].pressed=true;RWB.input.beginFrame();assert.equal(RWB.input.pressed.attack,true,'pad remap');pad.buttons[1].pressed=false;RWB.input.beginFrame();
  assert.equal(RWB.input.badgeFor('attack'),'B');
  // Capture flow: next key goes to the callback, not the game.
  let got=null;RWB.input.beginCapture('key',v=>got=v);key('g',true);RWB.input.beginFrame();assert.equal(got,'g');assert.equal(!!RWB.input.pressed.attack,false);key('g',false);
  RWB.settings.resetControls();assert.equal(RWB.input.badgeFor('jump'),'A');env.context.navigator.getGamepads=()=>[];RWB.input.beginFrame();assert.equal(RWB.input.badgeFor('jump'),'SPC');
  console.log('PASS settings persist (display, audio, overlay, HUD, colors, FX, shake, remaps); badges + capture honest');
}
// 3. Continue from stage/wave.
{
  const store=memStore();const env=boot(1280,720,2,false,store);const {RWB}=env;
  const scene=freshPlay(RWB,1,{score:5000,lives:3,saidin:0});
  let run=RWB.settings.loadRun();assert.equal(run.level,1);assert.equal(run.wave,0);
  scene.locked=true;scene.waveIdx=2;scene.groupIdx=scene.level.waves[2].groups.length-1;scene.enemies=[];scene.update(1/60,RWB.input);
  run=RWB.settings.loadRun();assert.equal(run.wave,3,'wave clear writes checkpoint');
  scene.player.setState('idle');scene.player.lives=1;scene.player.hp=1;scene.cheatInvuln=false;scene.player.invuln=0;scene.player.hurt(50,scene.player.x+5,true);
  for(let i=0;i<400&&!(RWB.game.nextScene instanceof RWB.scenes.GameOver);i++)scene.update(1/60,RWB.input);
  const go=RWB.game.nextScene;assert.ok(go instanceof RWB.scenes.GameOver);assert.equal(go.wave,3);
  RWB.game._swap();go.t=1;go.sel=0;go.choose();
  const resumed=RWB.game.nextScene;assert.ok(resumed instanceof RWB.scenes.Play);RWB.game._swap();
  assert.equal(resumed.waveIdx,3);assert.ok(resumed.player.x>resumed.level.waves[2].x,'player placed at the checkpoint');assert.equal(resumed.player.lives,3);
  const t2=new RWB.scenes.Title(RWB.game);assert.equal(t2.items[0].id,'continue','title offers Continue after reload');
  console.log('PASS continue: checkpoint on wave clear, game over resumes same stage + wave, title Continue');
}
// 1. Fair iframes / anti stun-lock, and 9. AI sandwich rule.
{
  const {RWB}=boot(1280,720,2,false);const E=RWB.entities;
  const scene=freshPlay(RWB,0);const p=scene.player;scene.enemies=[];
  assert.equal(p.hurt(5,p.x+10,false),true);assert.equal(p.hurt(5,p.x+10,false),false,'iframes after a light hit');
  assert.ok(p.invuln>=E.FAIR.lightStun,'iframes cover the whole stun');
  p.invuln=0;p.setState('idle');p.hurt(5,p.x+10,false);p.invuln=0;p.setState('idle');p.hurt(5,p.x+10,false);assert.equal(p.state,'down','third light hit in a streak knocks down (release)');
  p.setState('idle');p.invuln=0;p.hitStreak=0;p.wakeT=0;
  const a=scene.spawnEnemy('trolloc',p.x+30,p.y,{});const b=scene.spawnEnemy('trolloc',p.x-30,p.y,{});a.setState('windup');
  scene.t=10;scene.lastAttackT=0;
  assert.equal(scene.canStartAttack(b),false,'no attacks from both sides at once');
  const c=scene.spawnEnemy('trollocCaptain',p.x+50,p.y,{});assert.equal(scene.canStartAttack(c),true,'same-side partner may attack');
  p.setState('hurt');assert.equal(scene.canStartAttack(c),false,'enemies respect a reeling riley');
  // Enemy melee box matches the drawn tell and misses when riley side-steps.
  p.setState('idle');p.invuln=0;scene.enemies=[];const e=scene.spawnEnemy('trolloc',p.x+40,p.y+E.FAIR.hurtDepth+2,{});e.facing=-1;e.setState('attack');e.stateT=0.09;e.hitDone=false;const hp=p.hp;e.update(1/60);assert.equal(p.hp,hp,'lane side-step escapes');
  // Enemies get up with brief iframes; light-hit lock limit.
  const g=scene.spawnEnemy('stoneDefender',p.x+30,p.y,{});g.setState('getup');assert.equal(g.hittable,false);g.setState('approach');
  for(let i=0;i<E.FAIR.enemyStreakLimit;i++){if(g.state!=='down'){g.setState('approach');g.hurt(1,p.x,{})}}
  assert.equal(g.state,'down','fifth light hit tumbles the enemy');
  console.log('PASS fairness: light-hit iframes, streak knockdown, no sandwiches, openings respected, side-step escapes, getup iframes');
}
// 5. RISING KICK launcher + juggle; mash keeps the sweep.
{
  const env=boot(1280,720,2,false);const {RWB}=env;const E=RWB.entities;
  const scene=freshPlay(RWB,0);const p=scene.player;scene.enemies=[];scene.objects=[];
  const inp={pressed:{},axis:()=>({x:0,y:0})};
  p.nextCombo='sweep';p.comboTimer=0.42-0.02;p.setState('idle');
  inp.pressed={attack:true};p.update(1/60,inp);assert.equal(p.attack,E.ATTACKS.sweep,'quick press = sweep');
  p.setState('idle');p.nextCombo='sweep';p.comboTimer=0.42-0.15;
  const e=scene.spawnEnemy('trolloc',p.x+36,p.y,{});e.setState('approach');p.facing=1;
  inp.pressed={attack:true};p.update(1/60,inp);assert.equal(p.attack,E.ATTACKS.pop,'a beat later = RISING KICK');
  inp.pressed={};for(let i=0;i<10;i++)p.update(1/60,inp);
  assert.equal(e.state,'juggle','launcher pops the enemy');
  for(let i=0;i<8;i++)e.update(1/60);
  const before=e.juggleLeft;e.hurt(5,p.x,{});assert.equal(e.juggleLeft,before-1,'follow-up juggles');assert.equal(e.state,'juggle');
  e.juggleLeft=0;e.hurt(5,p.x,{});assert.equal(e.state,'down','juggle budget ends in a knockdown');
  console.log('PASS combo: mash = sweep, timed beat = RISING KICK launcher, juggle budget');
}
// 7. FX pool + caps.
{
  const {RWB}=boot(844,390,1,true);const scene=freshPlay(RWB,0);
  RWB.settings.set({fx:'auto'});RWB.perf.coarse=true;
  for(let i=0;i<200;i++)scene.fx.debris(300,250,'urn');
  assert.ok(scene.fx.list.length<=RWB.perf.fxCap,'coarse-pointer cap holds: '+scene.fx.list.length);
  for(let i=0;i<120;i++)scene.fx.update(1/60);
  const pooled=scene.fx.pool.length;assert.ok(pooled>0,'dead particles return to the pool');
  scene.fx.burst(300,250,'trolloc');assert.ok(scene.fx.pool.length<pooled,'new particles reuse pooled objects');
  scene.fx.turnedAshaman(1,1,true);scene.fx.text(1,1,'X');assert.ok(scene.fx.list.some(f=>f.kind==='text'),'callouts never dropped');
  assert.equal(RWB.perf.lite,true,'coarse + 1x DPR runs LITE in auto');
  console.log(`PASS FX pool: cap ${RWB.perf.fxCap}, ${pooled} pooled, lite on coarse low-DPR`);
}
// 2. Boss tells: timings, exact belly-flop landing, draw every tell without throwing.
{
  const env=boot(1280,720,2,false);const {RWB}=env;const E=RWB.entities;
  const scene=freshPlay(RWB,3);scene.camX=1400;scene.locked=true;scene.spawnBoss();const b=scene.boss;scene.player.x=1500;scene.player.y=300;
  b.state='approach';b.phase=2;b.hp=b.maxHp*0.5;b.x=1800;b.y=250;
  b.jumpTargetX=1520;b.jumpTargetY=300;b.startTell('jumpWind');assert.equal(b.tellDur,E.BOSS_TELLS.jumpWind[1]);
  const ctx=env.canvas.getContext('2d');
  scene.cheatInvuln=true;
  for(let i=0;i<200&&b.state!=='land';i++){b.update(1/60);if(i%10===0)scene.draw(ctx)}
  assert.equal(b.state,'land');assert.ok(Math.abs(b.x-1520)<6&&Math.abs(b.y-300)<6,`lands on the ring (${b.x.toFixed(1)},${b.y.toFixed(1)})`);
  for(const st of ['slamWind','rainWind']){b.setState('approach');b.startTell(st);for(let i=0;i<42;i++){b.update(1/60);}scene.draw(ctx);assert.ok(b.lastCalled||b.state!==st);}
  b.phase=3;b.hp=b.maxHp*0.2;b.setState('approach');b.startTell('slamWind');assert.ok(b.tellDur>=0.6,'phase 3 tell never below reaction floor');
  if(process.env.WL_CAPTURE_DIR){b.stateT=b.tellDur-0.1;scene.draw(ctx);fs.writeFileSync(process.env.WL_CAPTURE_DIR+'/wl-boss-tell.png',env.canvas.toBuffer('image/png'))}
  console.log('PASS boss tells: per-phase timings, last call, SKY STRIKE lands on its ring');
}
// 8. Large HUD / colorblind + pause menus render; options panel changes persist.
{
  const store=memStore();const env=boot(1280,720,2,false,store);const {RWB}=env;const ctx=env.canvas.getContext('2d');
  const scene=freshPlay(RWB,0);scene.player.hp=20;
  RWB.settings.set({bigHud:true,colorblind:true});scene.draw(ctx);assert.equal(scene.hudBottom,55);
  scene.paused=true;scene.pauseSel=5;scene.activatePause();assert.ok(scene.sub instanceof RWB.OptionsPanel);scene.draw(ctx);
  const opt=scene.sub;opt.sel=opt.rows.findIndex(r=>r.id==='overlay');opt.activate();assert.notEqual(RWB.settings.data.overlay,0.55);
  scene.sub=null;scene.pauseSel=6;scene.activatePause();assert.equal(scene.sub.kind,'controls');scene.draw(ctx);
  const t=new RWB.scenes.Title(RWB.game);t.sel=t.items.findIndex(i=>i.id==='settings');t.choose();t.draw(ctx);
  assert.ok(JSON.parse(store.getItem('wl-settings')).overlay!==0.55,'overlay change saved');
  console.log('PASS large HUD + colorblind render; pause Options/Controls panels; title Settings');
}
// 11. Story reels: painted urn on disk, every card readable inside ~3 s, every beat scored, press/skip flow.
{
  const env=boot(1920,1080,1,false);const {RWB}=env;const ctx=env.canvas.getContext('2d');const A=RWB.audio;
  const beats=[...RWB.OPENING,...RWB.LEVELS.flatMap(L=>[L.intro,L.outro]).filter(Boolean),...RWB.ENDING];
  assert.equal(beats.length,4+7+3,'4 opening, 7 stage intro/outro, 3 ending beats');
  for(const b of beats){
    assert.ok(fs.existsSync(root+'/assets/cutscenes/'+b.plate+'.webp'),'plate ships: '+b.plate);
    assert.ok(b.sting&&b.lines.length&&b.kicker,'beat has a stinger, lines and a location card: '+b.plate);
    const tl=RWB.cinema.timeline(b);
    const firstCue=Math.min(0.5,...(b.tags||[]).map(g=>g.at),b.slam&&!b.slam.end?b.slam.at:9);
    assert.ok(firstCue<=1.5&&tl.lines[0].start<=1,'who/where lands in under 1.5 s and dialogue by 1 s: '+b.plate);
    assert.ok(b.cam&&b.cam.length===6&&b.cam[2]>=1&&b.cam[5]>=1,'camera move never shows plate edges: '+b.plate);
    for(const l of tl.lines)assert.ok(['riley','chieftain','narrator'].includes(l.who));
  }
  assert.ok(fs.existsSync(root+'/assets/cutscenes/chieftain-portrait.webp'));
  assert.ok(RWB.assets.STORY.every(n=>fs.existsSync(root+'/assets/cutscenes/'+n+'.webp')),'every lazy story key has a file');
  const idle={pressed:{},axis:()=>({x:0,y:0})};
  const run=(scene,secs,drawEvery)=>{for(let f=0;f<secs*60&&!scene.done;f++){scene.update(1/60,idle);if(drawEvery&&f%drawEvery===0)scene.draw(ctx)}};
  // Opening runs itself (no input) through the village intro, then the fight.
  A.trace.length=0;
  RWB.game.startNewGame(true);RWB.game._swap();
  const cut=RWB.game.scene;assert.ok(cut instanceof RWB.scenes.Cutscene);assert.equal(cut.beats.length,5);
  assert.equal(A.song,'story','music bed starts with the opening');
  const perBeat=[];let last=-1;
  for(let f=0;f<60*120&&!cut.done;f++){
    if(cut.i!==last){last=cut.i;perBeat.push({i:cut.i,from:A.trace.length})}
    cut.update(1/60,idle);if(f%45===0)cut.draw(ctx);
    if(f===330&&process.env.WL_CAPTURE_DIR)fs.writeFileSync(process.env.WL_CAPTURE_DIR+'/wl-story-fallback.png',env.canvas.toBuffer('image/png'));
  }
  assert.ok(cut.done,'opening finishes on its own');
  assert.ok(RWB.game.nextScene instanceof RWB.scenes.Play&&RWB.game.nextScene.level===RWB.LEVELS[0],'opening hands over to stage 1');
  assert.equal(A.song,'village','stage 1 intro switches to the stage song');
  perBeat.forEach((p,k)=>{
    const cues=A.trace.slice(p.from,(perBeat[k+1]||{from:A.trace.length}).from).map(c=>c.name);
    assert.ok(cues.some(n=>n.startsWith('stinger:')),'beat '+(k+1)+' plays a stinger');
    assert.ok(cues.includes('voLine')&&cues.includes('babble'),'beat '+(k+1)+' has VO chirps: '+[...new Set(cues)].join(','));
  });
  // Presses: finish typing, next line, next beat; pause skips the reel.
  const press=o=>({pressed:o,axis:()=>({x:0,y:0})});
  let done=0;const reel=new RWB.scenes.Cutscene(RWB.game,RWB.OPENING,()=>done++,'story');reel.enter();reel.waiting=false;
  run(reel,1.0);const L0=reel.tl.lines[0];assert.ok(reel.t<L0.typed);
  reel.update(1/60,press({attack:true}));assert.ok(reel.t>=L0.typed,'first press finishes the line');
  reel.update(1/60,press({attack:true}));assert.equal(reel.currentLine(),1,'second press goes to the next line');
  reel.update(1/60,press({start:true}));reel.update(1/60,press({start:true}));assert.equal(reel.i,1,'then the next beat');
  assert.ok(reel.trans&&reel.trans.via,'beats change through a transition, not a hard cut');
  for(let k=0;k<3;k++)reel.draw(ctx),reel.update(0.2,idle);
  reel.update(1/60,press({pause:true}));assert.equal(done,1,'pause skips the reel');
  const skip=new RWB.scenes.Cutscene(RWB.game,RWB.OPENING,()=>done++);skip.enter();skip.waiting=false;run(skip,0.5);
  skip.update(1/60,{pressed:{click:true,start:true},pointer:{x:630,y:10},axis:()=>({x:0,y:0})});assert.equal(done,2,'SKIP mark click skips');
  // Stage clear: repair log then the next stage's intro in one reel, then the fight.
  RWB.game.levelComplete(0,{score:1000,lives:3,saidin:10});RWB.game._swap();
  const sb=RWB.game.scene;assert.ok(sb instanceof RWB.scenes.StoryBeat);assert.equal(sb.beats.map(b=>b.plate).join(),'st1-village-outro,st2-shrine-intro');
  assert.equal(A.song,'story');run(sb,60,30);assert.ok(sb.done&&RWB.game.nextScene instanceof RWB.scenes.Play);assert.equal(A.song,'shrine');
  // Ending: three beats to the victory screen, scored with the victory song.
  RWB.game.showEnding(5000);RWB.game._swap();const end=RWB.game.scene;assert.equal(end.beats.length,3);assert.equal(A.song,'victory');
  run(end,90,30);assert.ok(end.done&&RWB.game.nextScene instanceof RWB.scenes.Victory);
  // Classic 640x360 draws the reel too.
  RWB.display.setMode('classic');const cl=new RWB.scenes.StoryBeat(RWB.game,{beats:[RWB.STORY.st3Intro]});cl.enter();cl.waiting=false;run(cl,2);cl.draw(ctx);RWB.display.setMode('auto');
  console.log(`PASS story: ${beats.length} painted beats on disk, who/where under 1.5 s, stinger + VO per beat, music bed, press/skip, stage + ending flow`);
}
