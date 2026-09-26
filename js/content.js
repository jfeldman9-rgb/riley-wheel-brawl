/* Riley Wheel Brawl original game content: actors, five arenas, story reels and UI. */
'use strict';
(function () {
  const W = RWB.W, H = RWB.H, FT = RWB.FLOOR_TOP, FB = RWB.FLOOR_BOTTOM;
  const C = {
    opening: [
      { id:'op_moiraine_01', who:'moiraine', name:'MOIRAINE', text:'Riley, the Shadow has taken Twinkle Toes.' },
      { id:'op_riley_01', who:'riley', name:'RILEY', text:'Then we bring her home.' },
      { id:'op_kenzie_01', who:'kenzie', name:'TWINKLE TOES', text:'You picked the wrong dancer!' },
      { id:'op_taim_01', who:'taim', name:'MAZRIM TAIM', text:'Bring the child to the Black Tower.' }
    ],
    intro: [
      [{id:'st1_moiraine_01',who:'moiraine',name:'MOIRAINE',text:'Winternight has begun. Stay sharp.'},{id:'st1_riley_01',who:'riley',name:'RILEY',text:"I'll guard our home."}],
      [{id:'st2_moiraine_01',who:'moiraine',name:'MOIRAINE',text:'The Fade fled toward Caemlyn.'},{id:'st2_riley_01',who:'riley',name:'RILEY',text:"It won't lose me."}],
      [{id:'st3_moiraine_01',who:'moiraine',name:'MOIRAINE',text:'Mashadar hunts anything that moves.'},{id:'st3_riley_01',who:'riley',name:'RILEY',text:"Then I'll move fast."}],
      [{id:'st4_forsaken_01',who:'forsaken',name:"BE'lal",text:'Callandor belongs to me.'},{id:'st4_riley_01',who:'riley',name:'RILEY',text:'Not today.'}],
      [{id:'st5_taim_01',who:'taim',name:'MAZRIM TAIM',text:'The Black Tower is mine.'},{id:'st5_riley_01',who:'riley',name:'RILEY',text:'Twinkle Toes is not.'}]
    ],
    clear: [
      [{id:'riley_victory_01',who:'riley',name:'RILEY',text:'The way is clear.'}],
      [{id:'riley_victory_02',who:'riley',name:'RILEY',text:"Twinkle Toes, I'm coming."}],
      [{id:'riley_victory_01',who:'riley',name:'RILEY',text:'The way is clear.'}],
      [{id:'st4_kenzie_01',who:'kenzie',name:'TWINKLE TOES',text:'Riley! I can see the lightning!'},{id:'st4_moiraine_01',who:'moiraine',name:'MOIRAINE',text:'Twinkle Toes, guide the spark.'},{id:'st4_kenzie_02',who:'kenzie',name:'TWINKLE TOES',text:'Like a dance step. Got it!'}]
    ],
    finale:[{id:'st5_kenzie_01',who:'kenzie',name:'TWINKLE TOES',text:'Ready when you are, big brother!'},{id:'st5_riley_02',who:'riley',name:'RILEY',text:'Together!'},{id:'st5_kenzie_02',who:'kenzie',name:'TWINKLE TOES',text:'Twinkle Toes thunder!'}],
    ending:[{id:'end_moiraine_01',who:'moiraine',name:'MOIRAINE',text:'The Wheel turned in our favor.'},{id:'end_riley_01',who:'riley',name:'RILEY',text:"Let's go home."},{id:'end_kenzie_01',who:'kenzie',name:'TWINKLE TOES',text:'After one victory dance!'}]
  };
  RWB.CAPTIONS = C;
  RWB.LEVELS = [
    {name:"EMOND'S FIELD",sub:'WINTERNIGHT',sky:'#142341',floor:'#423d43',enemy:'TROLLOC',boss:'TROLLOC CHIEFTAIN',attacks:['AXE CRASH','HORN CHARGE','GROUND STOMP']},
    {name:'CAEMLYN',sub:'CITY STREETS',sky:'#704d59',floor:'#806f66',enemy:'DARKFRIEND',boss:'MYRDDRAAL',attacks:['BLACK SWORD','SHADOW STEP','CLOAK LUNGE']},
    {name:'SHADAR LOGOTH',sub:'SILVER RUINS',sky:'#29223e',floor:'#514d63',enemy:'MASHADAR CULTIST',boss:'DRAGHKAR',attacks:['SWOOPING DIVE','KISS DRAIN','WING GUST']},
    {name:'STONE OF TEAR',sub:'GREAT HALL',sky:'#785738',floor:'#554c48',enemy:'STONE GUARD',boss:"BE'LAL",attacks:['ARC WEAVE','PRISM SPEARS','RING OF LIGHT']},
    {name:'BLACK TOWER',sub:'STORM ROOF',sky:'#111827',floor:'#303744',enemy:"TURNED ASHA'MAN",boss:'MAZRIM TAIM',attacks:['STORM BOLT','DARK SHIELD','FIRE RIFT']}
  ].map((x,i)=>Object.assign(x,{index:i,waves:[0,1,2,3,4]}));

  function text(ctx,s,x,y,size,color,align){ctx.save();ctx.font=(size||10)+'px "Press Start 2P",monospace';ctx.textAlign=align||'left';ctx.textBaseline='middle';ctx.fillStyle=color||'#fff';ctx.fillText(s,x,y);ctx.restore();}
  function panel(ctx,x,y,w,h,fill){ctx.fillStyle=fill||'rgba(4,7,18,.88)';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#e7c968';ctx.lineWidth=2;ctx.strokeRect(x+.5,y+.5,w-1,h-1);}
  function portrait(ctx,who,x,y,r){
    const colors={riley:'#82c9ff',moiraine:'#c5d9ff',kenzie:'#68a8ff',taim:'#c44',forsaken:'#a77cff'};
    ctx.save();ctx.translate(x,y);ctx.fillStyle='#111827';ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();ctx.strokeStyle=colors[who]||'#ddd';ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle=who==='kenzie'?'#f1c9a7':'#d3a982';ctx.beginPath();ctx.arc(0,-2,r*.48,0,7);ctx.fill();ctx.fillStyle=who==='riley'?'#15131b':'#3b251d';ctx.beginPath();ctx.arc(0,-r*.25,r*.47,3.2,6.2);ctx.fill();
    if(who==='riley'){ctx.strokeStyle='#55baff';ctx.strokeRect(-r*.36,-5,r*.28,r*.18);ctx.strokeRect(r*.08,-5,r*.28,r*.18);}
    if(who==='kenzie'){ctx.fillStyle='#34251f';ctx.beginPath();ctx.arc(0,-r*.55,r*.22,0,7);ctx.fill();}
    ctx.restore();
  }
  function key(input,k){return !!((input.pressed&&input.pressed[k])||(k==='start'&&input.pressed&&input.pressed.click));}
  function voice(id){if(RWB.audio&&!RWB.audio.playClip(id)&&RWB.audio.sfx.babble)RWB.audio.sfx.babble();}

  class Reel {
    constructor(game,lines,next,label){this.game=game;this.lines=lines;this.next=next;this.label=label||'STORY';this.i=0;this.t=0;this.spoken=false;this.music='story';}
    enter(){this.t=0;}
    advance(){if(++this.i>=this.lines.length){this.game.setScene(this.next());}else{this.t=0;this.spoken=false;}}
    update(dt,input){this.t+=dt;if(!this.spoken){voice(this.lines[this.i].id);this.spoken=true;}if(key(input,'start')||key(input,'attack')||key(input,'jump'))this.advance();}
    draw(ctx){const l=this.lines[this.i];ctx.fillStyle='#080d20';ctx.fillRect(0,0,W,H);ctx.fillStyle='#172b4c';ctx.fillRect(0,42,W,248);for(let i=0;i<12;i++){ctx.strokeStyle='rgba(124,200,255,.12)';ctx.beginPath();ctx.arc(W/2,166,25+i*13,0,7);ctx.stroke();}ctx.fillStyle='#000';ctx.fillRect(0,0,W,34);ctx.fillRect(0,300,W,60);text(ctx,this.label,20,20,10,'#e7c968');portrait(ctx,l.who,82,238,38);panel(ctx,132,210,480,76);text(ctx,l.name,150,226,9,'#7cc8ff');const shown=l.text.slice(0,Math.floor(this.t*35));text(ctx,shown,150,255,9,'#fff');text(ctx,'START / KICK / JUMP: NEXT',620,322,7,'#8ca0b8','right');}
  }

  class Title {
    constructor(game){this.game=game;this.sel=0;this.music='title';}
    items(){return RWB.settings.loadRun()?['START','CONTINUE','OPTIONS','CONTROLS']:['START','OPTIONS','CONTROLS'];}
    update(dt,input){let a=this.items();if(key(input,'down'))this.sel=(this.sel+1)%a.length;if(key(input,'up'))this.sel=(this.sel+a.length-1)%a.length;if(key(input,'start')||key(input,'attack')){let v=a[this.sel];if(v==='START')this.game.setScene(new Reel(this.game,C.opening,()=>new Reel(this.game,C.intro[0],()=>new Play(this.game,0,{}),RWB.LEVELS[0].name),'THE WHEEL TURNS'));else if(v==='CONTINUE'){let r=RWB.settings.loadRun();this.game.setScene(new Play(this.game,r.level,r.extra));}else this.game.setScene(new OptionsScene(this.game,v.toLowerCase()));}}
    draw(ctx){ctx.fillStyle='#071323';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#dcbf59';ctx.lineWidth=7;ctx.beginPath();ctx.arc(320,108,72,0,7);ctx.stroke();for(let i=0;i<8;i++){let a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(320+Math.cos(a)*28,108+Math.sin(a)*28);ctx.lineTo(320+Math.cos(a)*68,108+Math.sin(a)*68);ctx.stroke();}ctx.strokeStyle='#70c8ff';ctx.beginPath();ctx.moveTo(342,34);ctx.lineTo(300,105);ctx.lineTo(330,105);ctx.lineTo(294,181);ctx.stroke();text(ctx,'RILEY',320,72,22,'#fff','center');text(ctx,'WHEEL BRAWL',320,145,18,'#e7c968','center');this.items().forEach((s,i)=>text(ctx,(i===this.sel?'◆ ':'  ')+s,320,220+i*29,10,i===this.sel?'#7cc8ff':'#fff','center'));}
  }
  class OptionsScene{constructor(game,mode){this.game=game;this.panel=new RWB.OptionsPanel(mode,{full:true});}update(dt,input){this.panel.update(input,dt);if(key(input,'pause'))this.game.setScene(new Title(this.game));}draw(ctx){ctx.fillStyle='#071323';ctx.fillRect(0,0,W,H);this.panel.draw(ctx);text(ctx,'ESC: TITLE',620,344,7,'#aaa','right');}}

  class Fighter extends RWB.Entity {
    constructor(g,x,y,kind,hp,boss){super(g,x,y,{hp:hp,bw:boss?48:30,bh:boss?82:60,flying:kind==='DRAGHKAR'});this.kind=kind;this.boss=!!boss;this.usedAttacks=new Set();this.attackClock=0;this.anim=0;if(this.flying)this.z=70;}
    update(dt){this.anim+=dt;this.attackClock+=dt;if(this.boss&&this.attackClock>.65){this.attackClock=0;const a=this.g.level.attacks[this.usedAttacks.size%3];this.usedAttacks.add(a);this.telegraph=a;this.telegraphT=.3;if(this.kind==='DRAGHKAR'&&a==='SWOOPING DIVE')this.z=8;}if(this.telegraphT>0){this.telegraphT-=dt;if(this.telegraphT<=0&&this.kind==='DRAGHKAR')this.z=70;}super.update(dt);}
    draw(ctx,cam){let x=this.x-cam,y=this.y-this.z,b=this.boss;this.drawShadow(ctx,cam,b?35:23);ctx.save();ctx.translate(x,y);let walk=Math.sin(this.anim*9), col=this.kind==='DRAGHKAR'?'#6d416d':this.kind.includes('TROLLOC')?'#6c5946':this.kind==='MYRDDRAAL'?'#111':this.kind.includes('GUARD')?'#a5a9af':this.kind.includes('ASHA')?'#20232d':'#4c394f';ctx.strokeStyle='#171923';ctx.lineWidth=b?10:7;ctx.beginPath();ctx.moveTo(-8,-8);ctx.lineTo(-11+walk*5,20);ctx.moveTo(8,-8);ctx.lineTo(12-walk*5,20);ctx.stroke();ctx.fillStyle=col;ctx.fillRect(b?-22:-15,b?-65:-50,b?44:30,b?58:44);ctx.fillStyle='#c59b77';ctx.beginPath();ctx.arc(0,b?-72:-56,b?15:11,0,7);ctx.fill();if(this.kind==='MYRDDRAAL'){ctx.fillStyle='#eee';ctx.fillRect(-10,-76,20,6);}if(this.kind==='DRAGHKAR'){ctx.fillStyle='#3d294c';ctx.beginPath();ctx.moveTo(-15,-50);ctx.lineTo(-58,-80);ctx.lineTo(-28,-25);ctx.moveTo(15,-50);ctx.lineTo(58,-80);ctx.lineTo(28,-25);ctx.fill();}if(this.telegraphT>0){ctx.strokeStyle='#ffdb55';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-35,35+10*Math.sin(this.anim*20),0,7);ctx.stroke();}ctx.restore();}
  }
  class Riley extends RWB.Entity {
    constructor(g,carry){super(g,100,250,{hp:100,bw:28,bh:58});this.hpMax=100;this.powerMax=100;this.power=carry.saidin||0;this.callandor=!!carry.callandor;this.loial=carry.loial!==false;this.score=carry.score||0;this.combo=0;this.attackT=0;this.fireCd=0;this.angreal=0;this.taint=0;this.walkT=0;}
    update(dt,input){let a=input.axis?input.axis():{x:0,y:0};this.vx=a.x*115;this.vy=a.y*72;if(a.x)this.facing=Math.sign(a.x);this.walkT+=Math.abs(a.x)*dt;this.attackT=Math.max(0,this.attackT-dt);this.fireCd=Math.max(0,this.fireCd-dt);this.angreal=Math.max(0,this.angreal-dt);
      if(key(input,'jump')&&this.g.phase==='play'){this.vz=300;this.setState('jump');}
      if(key(input,'attack')&&this.attackT<=0){this.combo=(this.combo%3)+1;this.attackT=.16;this.setState(this.z>0?'jumpkick':'kick'+this.combo);this.g.hitNearest(this.combo===3?18:11,this.combo===3);}
      if(key(input,'special')&&this.fireCd<=0){this.fireCd=this.angreal>0?.25:.55;this.setState('channel');this.g.fire(this.angreal>0?3:1);}
      if(key(input,'assist'))this.g.callLoial();if(key(input,'power')&&this.power>=this.powerMax)this.g.superMove();
      if(this.power>=this.powerMax){this.taint+=dt;if(this.taint>5&&Math.floor(this.taint)%2===0&&this.g.taintTick!==Math.floor(this.taint)){this.g.taintTick=Math.floor(this.taint);if(this.hp>8)this.g.damagePlayer(2,'TAINT WARNING');}}else this.taint=0;
      super.update(dt);this.x=RWB.util.clamp(this.x,20,1260);if(this.g.phase==='play'&&this.stateT>.24&&!['down','hurt'].includes(this.state))this.setState(Math.abs(a.x)+Math.abs(a.y)>.1?'walk':'idle');}
    draw(ctx,cam){let x=this.x-cam,y=this.y-this.z,bob=this.state==='idle'?Math.sin(this.stateT*3)*1.2:0,step=Math.sin(this.walkT*10);this.drawShadow(ctx,cam,23);ctx.save();ctx.translate(x,y+bob);ctx.strokeStyle='#10151f';ctx.lineWidth=7;ctx.lineCap='round';let kick=this.state.startsWith('kick')||this.state==='jumpkick';ctx.beginPath();ctx.moveTo(-7,-8);ctx.lineTo(kick?-8:-9+step*5,20);ctx.moveTo(7,-8);ctx.lineTo(kick?this.facing*30:9-step*5,kick?-2:20);ctx.stroke();ctx.fillStyle='#111722';ctx.fillRect(-14,-49,28,43);ctx.fillStyle='#d7a47d';ctx.beginPath();ctx.arc(0,-58,10,0,7);ctx.fill();ctx.fillStyle='#17131a';ctx.beginPath();ctx.arc(0,-62,10,3.1,6.3);ctx.fill();ctx.strokeStyle='#54bdff';ctx.lineWidth=2;ctx.strokeRect(-9,-60,8,5);ctx.strokeRect(2,-60,8,5);ctx.fillStyle='#ddd';ctx.beginPath();ctx.arc(-5,-43,2,0,7);ctx.fill();ctx.fillStyle='#d44331';ctx.beginPath();ctx.arc(5,-43,2,0,7);ctx.fill();if(this.state==='channel'){ctx.strokeStyle='#ff9b3f';ctx.beginPath();ctx.arc(this.facing*20,-30,9,0,7);ctx.stroke();}ctx.restore();}
  }

  class Play {
    constructor(game,levelIndex,carry){this.game=game;this.levelIndex=levelIndex;this.level=RWB.LEVELS[levelIndex];this.carry=carry||{};this.player=new Riley(this,this.carry);this.enemies=[];this.projectiles=[];this.wave=0;this.phase='play';this.kills=0;this.isGameplay=true;this.camera=new RWB.Camera({length:1280});this.fx=new RWB.FX();this.music='stage'+(levelIndex+1);this.spawnWave();this.damageClock=0;this.taintTick=0;this.loialT=0;this.superT=0;this.boss=null;this.paused=false;this.pauseMenu=new RWB.PauseMenu({onQuit:()=>game.setScene(new Title(game)),extra:[{label:'RESTART STAGE',act:()=>game.setScene(new Play(game,levelIndex,carry))}]});}
    enter(){RWB.settings.saveRun({level:this.levelIndex,wave:this.wave,score:this.player.score,extra:{saidin:this.player.power,callandor:this.player.callandor,loial:this.player.loial}});}
    spawnWave(){this.enemies=[];for(let i=0;i<3+(this.wave%2);i++)this.enemies.push(new Fighter(this,390+i*62,210+(i%3)*30,this.level.enemy,28,false));}
    spawnBoss(){this.boss=new Fighter(this,760,235,this.level.boss,180,true);this.enemies=[this.boss];this.bossCard=2;}
    hitNearest(dmg,knock){let live=this.enemies.filter(e=>!e.dead&&Math.abs(e.y-this.player.y)<36).sort((a,b)=>Math.abs(a.x-this.player.x)-Math.abs(b.x-this.player.x));let e=live[0];if(e&&Math.abs(e.x-this.player.x)<100){e.takeHit(dmg,this.player.x,{kb:knock?180:50});this.player.power=Math.min(100,this.player.power+9);this.player.score+=100;if(e.dead){this.kills++;this.fx.sparks(e.x,e.y-e.z,'#ffd35a',8);}}}
    fire(n){for(let i=0;i<n;i++)this.projectiles.push({x:this.player.x+this.player.facing*20,y:this.player.y+(i-1)*18,v:this.player.facing*280,t:2});}
    callLoial(){if(!this.player.loial)return;this.player.loial=false;this.loialT=1.5;this.enemies.forEach(e=>{if(!e.dead)e.takeHit(e.boss?25:99,this.player.x,{kb:220});});}
    superMove(){this.player.power=0;this.player.taint=0;this.superT=1.1;this.player.invuln=1.3;this.camera.impact(this.player.facing,'super');voice('riley_super_01');this.enemies.forEach(e=>{if(!e.dead)e.takeHit(e.boss?(this.player.callandor?85:65):999,this.player.x,{kb:250});});}
    damagePlayer(n,label){this.player.hp=Math.max(1,this.player.hp-n);this.player.setState('hurt');this.player.invuln=.12;this.lastWarning=label;this.warningT=1;}
    finishStage(){if(this.levelIndex===4){this.phase='finale';this.finaleT=0;this.boss.dead=false;this.boss.hp=1;return;}this.phase='clear';let extra={saidin:this.player.power,callandor:this.player.callandor||this.levelIndex===3,loial:true,score:this.player.score};this.game.setScene(new Reel(this.game,C.clear[this.levelIndex],()=>new Reel(this.game,C.intro[this.levelIndex+1],()=>new Play(this.game,this.levelIndex+1,extra),RWB.LEVELS[this.levelIndex+1].name),'STAGE CLEAR'));}
    updateFinale(dt,input){this.finaleT+=dt;if(!this.finaleVoice){voice(C.finale[0].id);this.finaleVoice=1;}if(this.finaleT>.55&&this.finaleVoice===1){voice(C.finale[1].id);this.finaleVoice=2;}if(this.finaleT>.9&&this.finaleVoice===2){voice(C.finale[2].id);this.finaleVoice=3;}if(key(input,'start')||key(input,'attack')||key(input,'jump'))this.finaleT=4;if(this.finaleT>=2.2)this.finaleConnected=true;if(this.finaleConnected){this.boss.dead=true;this.phase='bossdead';if(!this.endingQueued){this.endingQueued=true;this.game.setScene(new Reel(this.game,C.ending,()=>new Victory(this.game),'HOME AGAIN'));}}}
    update(dt,input){if(this.phase==='finale'){this.updateFinale(dt,input);return;}if(key(input,'pause')){this.paused=!this.paused;this.paused?this.pauseMenu.open():0;}if(this.paused){let r=this.pauseMenu.update(input,dt);if(r==='resume')this.paused=false;return;}this.camera.update(dt);this.camera.follow(this.player.x,dt);this.player.update(dt,input);this.warningT=Math.max(0,(this.warningT||0)-dt);this.bossCard=Math.max(0,(this.bossCard||0)-dt);this.loialT=Math.max(0,this.loialT-dt);this.superT=Math.max(0,this.superT-dt);
      this.projectiles.forEach(p=>{p.x+=p.v*dt;p.t-=dt;this.enemies.forEach(e=>{if(!e.dead&&Math.abs(e.x-p.x)<28&&Math.abs(e.y-p.y)<30){e.takeHit(16,this.player.x);p.t=0;}});});this.projectiles=this.projectiles.filter(p=>p.t>0);
      this.enemies.forEach(e=>{if(!e.dead)e.update(dt);});
      this.damageClock+=dt;if(this.damageClock>Math.max(.65,2.15-this.levelIndex*.28)){this.damageClock=0;this.damagePlayer(2+this.levelIndex,'ENEMY HIT');}
      if(this.enemies.length&&this.enemies.every(e=>e.dead)){if(this.boss){if(this.boss.usedAttacks.size<3){this.boss.dead=false;this.boss.hp=1;}else this.finishStage();}else if(++this.wave<5)this.spawnWave();else this.spawnBoss();}
    }
    drawStage(ctx){let L=this.level;ctx.fillStyle=L.sky;ctx.fillRect(0,0,W,H);let off=this.camera.x*.15;ctx.fillStyle='rgba(8,12,25,.5)';for(let i=-1;i<8;i++){let x=i*115-off%115;ctx.fillRect(x,80+(i%2)*12,75,110);ctx.beginPath();ctx.moveTo(x-8,82+(i%2)*12);ctx.lineTo(x+37,45+(i%2)*12);ctx.lineTo(x+83,82+(i%2)*12);ctx.fill();}ctx.fillStyle=L.floor;ctx.fillRect(0,FT,W,FB-FT+40);ctx.strokeStyle='rgba(255,255,255,.1)';for(let y=FT;y<360;y+=25){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}if(this.levelIndex===2){ctx.fillStyle='rgba(220,220,255,.16)';for(let i=0;i<5;i++)ctx.fillRect((i*151+this.wave*31)%640,FT+i*22,95,5);}if(this.levelIndex===3){ctx.fillStyle='#c6a255';for(let x=80;x<640;x+=150)ctx.fillRect(x,82,22,150);}if(this.levelIndex===4){ctx.strokeStyle='#aacfff';ctx.beginPath();ctx.moveTo(510,10);ctx.lineTo(480,80);ctx.lineTo(505,73);ctx.lineTo(470,145);ctx.stroke();}}
    drawHud(ctx){let p=this.player,big=RWB.settings.data.bigHud?1.18:1;ctx.save();ctx.scale(big,big);panel(ctx,8,8,236,52);portrait(ctx,'riley',30,34,19);text(ctx,'RILEY',55,19,8,'#fff');ctx.fillStyle='#252a37';ctx.fillRect(55,29,120,9);ctx.fillStyle=RWB.settings.data.colorblind?'#28a9ff':'#e64b4b';ctx.fillRect(55,29,120*p.hp/p.hpMax,9);text(ctx,'HP',181,34,7,'#fff');ctx.fillStyle='#252a37';ctx.fillRect(55,43,120,7);ctx.fillStyle=p.taint>5?'#9b5cff':'#62cfff';ctx.fillRect(55,43,120*p.power/p.powerMax,7);text(ctx,'SAIDIN',181,47,6,'#fff');ctx.restore();panel(ctx,465,8,167,52);text(ctx,'LOIAL '+(p.loial?'READY':'SPENT'),475,22,7,p.loial?'#8ff0bc':'#888');text(ctx,'SCORE '+String(p.score).padStart(6,'0'),475,38,7,'#fff');if(p.callandor)text(ctx,'✦ CALLANDOR',475,52,7,'#fff2a1');if(this.boss){panel(ctx,155,67,330,28);text(ctx,this.level.boss,320,77,7,'#fff','center');ctx.fillStyle='#3a2632';ctx.fillRect(170,84,300,5);ctx.fillStyle='#db4464';ctx.fillRect(170,84,300*Math.max(0,this.boss.hp)/this.boss.hpMax,5);}if(p.angreal>0)text(ctx,'ANGREAL '+p.angreal.toFixed(1),320,105,8,'#ffe379','center');if(p.taint>5)text(ctx,'TAINT RISING — SPEND SAIDIN!',320,120,8,'#dfadff','center');if(this.warningT>0)text(ctx,this.lastWarning,320,143,8,'#fff19c','center');}
    drawFinale(ctx){let t=this.finaleT;this.boss.draw(ctx,this.camera.x);portrait(ctx,'kenzie',120,240,22);let bx=this.boss.x-this.camera.x,progress=Math.min(1,Math.max(0,(t-.6)/1.6));ctx.strokeStyle='#f7f0c0';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(this.player.x-this.camera.x+15,205);ctx.lineTo((this.player.x-this.camera.x+15)+(bx-(this.player.x-this.camera.x+15))*progress,190);ctx.stroke();ctx.strokeStyle='#6ec9ff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(120,210);ctx.lineTo(120+(bx-120)*progress,190);ctx.stroke();text(ctx,t<.8?'TOGETHER!':t<2.2?'TWINKLE TOES THUNDER!':'THE BEAMS CONNECT!',320,120,10,'#fff','center');text(ctx,'START / KICK / JUMP: SKIP',620,340,7,'#bbb','right');}
    draw(ctx){this.drawStage(ctx);ctx.save();this.camera.apply(ctx);let list=[...this.enemies,this.player];RWB.Entity.sortByDepth(list);list.forEach(e=>!e.dead&&e.draw(ctx,this.camera.x));this.projectiles.forEach(p=>{ctx.fillStyle='#ff9b38';ctx.beginPath();ctx.arc(p.x-this.camera.x,p.y,8,0,7);ctx.fill();});if(this.loialT>0){let x=(1.5-this.loialT)*500-40;ctx.fillStyle='#5b4937';ctx.fillRect(x,180,55,95);text(ctx,'LOIAL',x+27,168,7,'#fff','center');}if(this.superT>0){ctx.fillStyle='rgba(240,245,210,.65)';ctx.fillRect(0,174,W,25);}ctx.restore();if(this.phase==='finale')this.drawFinale(ctx);this.drawHud(ctx);if(this.bossCard>0){panel(ctx,165,130,310,70);text(ctx,'BOSS',320,149,8,'#e7c968','center');text(ctx,this.level.boss,320,177,13,'#fff','center');}if(this.paused)this.pauseMenu.draw(ctx);if(this.player.taint>5){ctx.strokeStyle='rgba(48,0,66,.5)';ctx.lineWidth=18;ctx.strokeRect(4,4,W-8,H-8);}this.camera.drawFlash(ctx);}
  }
  class Victory{constructor(game){this.game=game;this.music='victory';}enter(){RWB.settings.clearRun();}update(dt,input){if(key(input,'start')||key(input,'attack'))this.game.setScene(new Title(this.game));}draw(ctx){ctx.fillStyle='#071323';ctx.fillRect(0,0,W,H);text(ctx,'VICTORY!',320,115,25,'#ffe273','center');portrait(ctx,'riley',260,200,35);portrait(ctx,'kenzie',380,200,31);text(ctx,'RILEY & TWINKLE TOES',320,265,10,'#7cc8ff','center');text(ctx,'THE WHEEL TURNS ON',320,295,8,'#fff','center');}}

  RWB.scenes=RWB.scenes||{};Object.assign(RWB.scenes,{Title,Reel,Play,Victory});
  RWB.settings.validateRun=r=>{r.level=RWB.util.clamp(r.level|0,0,4);r.extra.callandor=!!r.extra.callandor;r.extra.loial=r.extra.loial!==false;r.extra.saidin=RWB.util.clamp(+r.extra.saidin||0,0,100);return r;};
  RWB.attachContentDebug=game=>{
    game.debug.play=n=>game.setSceneNow(new Play(game,RWB.util.clamp((n|0)-1,0,4),{}));
    game.debug.boss=()=>{let s=game.scene;if(s instanceof Play){s.wave=5;s.spawnBoss();return s.boss;}};
  };
  ['title','story','boss','victory','stage1','stage2','stage3','stage4','stage5'].forEach((name,i)=>RWB.audio.defineSong(name,{bpm:92+i*5,bass:[0,null,3,null,5,null,3,null,0,null,7,null,5,null,3,null],lead:[7,null,9,null,10,null,9,null,7,null,5,null,3,null,5,null],kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],snare:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0]}));
  const art=['title-riley-hero','logo-riley-hero','portrait-riley','portrait-riley-hud','portrait-moiraine','portrait-twinkle-toes','portrait-loial','portrait-taim','atlas-riley','atlas-trolloc','atlas-trolloc-chieftain','atlas-darkfriend','atlas-fade','atlas-mashadar-cultist','atlas-draghkar','atlas-stone-guard','atlas-forsaken','atlas-turned-ashaman','atlas-taim','atlas-loial','atlas-twinkle-toes','atlas-props-pickups'];
  for(let s=1;s<=5;s++)for(const layer of ['far','mid','near','floor'])art.push('stage'+s+'-'+(['emonds-field','caemlyn','shadar-logoth','stone-of-tear','black-tower'][s-1])+'-'+layer);
  ['stage5-taim-roof-far','stage5-taim-roof-mid','stage5-taim-roof-floor'].forEach(x=>art.push(x));
  const stills=['opening-01-winters-night','opening-02-capture','opening-03-taim-order','opening-04-riley-vow','stage1-emonds-field','stage2-caemlyn','stage3-shadar-logoth','stage4-callandor-reveal','stage5-black-tower-finale','stage5-homecoming'];
  art.forEach(x=>RWB.assets.register(x,'assets/art/'+x+'.webp'));stills.forEach(x=>RWB.assets.register('still:'+x,'assets/cutscenes/'+x+'.webp',{lazy:true}));
})();
