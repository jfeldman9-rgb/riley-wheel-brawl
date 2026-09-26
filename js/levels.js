/* Five-stage campaign data and procedural fantasy landscapes. */
'use strict';
(function(){
 const D=WL.draw,T=WL.text,W=WL.W,H=WL.H,FT=WL.FLOOR_TOP;
 const themes=[
  ['#07152e','#244d70','#b7d8e8','EMOND\'S FIELD','WINTERNIGHT'],
  ['#33204d','#bd704d','#f2c66d','CAEMLYN','THE INNER CITY'],
  ['#090b24','#403460','#adb4d5','SHADAR LOGOTH','THE SILVER MIST'],
  ['#271b38','#a06a31','#f5d68a','STONE OF TEAR','CALLANDOR WAITS'],
  ['#050817','#182b4c','#79bfff','BLACK TOWER','THE STORM ROOF']
 ];
 function backdrop(i){return function(ctx,cam,t){
  const q=themes[i],g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,q[0]);g.addColorStop(.55,q[1]);g.addColorStop(1,'#111522');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=.22; for(let n=0;n<24;n++){let x=((n*109-cam*.12)%(W+100)+W+100)%(W+100)-50,h=35+(n*37)%95;ctx.fillStyle=n%2?q[2]:q[1];ctx.fillRect(x,FT-h,38+(n%4)*16,h);}ctx.restore();
  ctx.fillStyle='rgba(4,7,14,.52)';ctx.fillRect(0,FT,W,H-FT);ctx.strokeStyle=q[2]+'55';ctx.lineWidth=1;for(let y=FT;y<H;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  for(let x=-(cam%64);x<W;x+=64){ctx.beginPath();ctx.moveTo(x,FT);ctx.lineTo(x-35,H);ctx.stroke();}
  ctx.save();ctx.globalAlpha=.25;T.draw(ctx,q[3],W/2,75,{size:18,align:'center',color:q[2],stroke:q[0]});T.draw(ctx,q[4],W/2,96,{size:6,align:'center',color:'#fff'});ctx.restore();
  if(i===2){ctx.fillStyle='rgba(210,215,255,.12)';for(let n=0;n<5;n++)D.ellipse(ctx,((n*170+t*18)%800)-80,220+n*13,120,13,'rgba(220,225,255,.14)');}
  if(i===4){ctx.strokeStyle='#9ddcff';for(let n=0;n<3;n++){let x=(n*251+t*41)%W;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-12,42);ctx.lineTo(x+3,68);ctx.stroke();}}
 };}
 const line=(speaker,text)=>[speaker,text];
 const beat=(plate,kicker,lines,fx)=>({plate,kicker,lines,fx:fx||'sparkle',via:'wipe',cam:[.5,.45,1.04,.5,.45,1.08]});
 const STORY={
  opening:beat('opening-01-winters-night','A STORM GATHERS',[line('moiraine','Riley, the Shadow has taken Kenzie.'),line('riley','Then we bring her home.'),line('kenzie','You picked the wrong dancer!'),line('taim','Bring the child to the Black Tower.')]),
  st1:beat('stage1-emonds-field','STAGE 1 · EMOND\'S FIELD',[line('moiraine','Winternight has begun. Stay sharp.'),line('riley',"I'll guard our home.")]),
  st2:beat('stage2-caemlyn','STAGE 2 · CAEMLYN',[line('moiraine','The Fade fled toward Caemlyn.'),line('riley',"It won't lose me.")]),
  st3:beat('stage3-shadar-logoth','STAGE 3 · SHADAR LOGOTH',[line('moiraine','Mashadar hunts anything that moves.'),line('riley',"Then I'll move fast.")],'fog'),
  st4:beat('stage4-callandor-reveal','STAGE 4 · STONE OF TEAR',[line('forsaken','Callandor belongs to me.'),line('riley','Not today.'),line('kenzie','Riley! I can see the lightning!'),line('moiraine','Twinkle Toes, guide the spark.'),line('kenzie','Like a dance step. Got it!')],'sparkle'),
  st5:beat('stage5-black-tower-finale','STAGE 5 · BLACK TOWER',[line('taim','The Black Tower is mine.'),line('riley','Kenzie is not.'),line('kenzie','Ready when you are, big brother!')],'storm'),
  ending:beat('stage5-homecoming','HOME AGAIN',[line('moiraine','The Wheel turned in our favor.'),line('riley',"Let's go home."),line('kenzie','After one victory dance!')],'confetti')
 };
 const types=['trolloc','darkfriend','cultist','stoneGuard','ashaman'];
 function wave(x,type,count,extra){return Object.assign({x,groups:[[[type,count,{side:1}]]]},extra||{});}
 function make(i,name,bossName){const base=types[i],boss=i>0;return {id:i+1,name,short:name,music:i===4?'boss':'stage',bg:backdrop(i),length:1500,palette:themes[i][2],banner:['STAGE '+(i+1),name],intro:STORY['st'+(i+1)],outro:i<4?beat('stage'+(i+1)+'-'+name.toLowerCase().replace(/[^a-z]+/g,'-'),name+' CLEAR',[line('riley',i===0?'The way is clear.':"Kenzie, I'm coming.")]):STORY.ending,
 objects:[{kind:'urn',x:360,y:250,contents:['saidinSpark']},{kind:'chest',x:820,y:310,contents:[i%2?'angreal':'heal']}],pickups:[{kind:'saidinSurge',x:600,y:320}],hazards:i===2?[{kind:'steam',x:760,y:260,period:3,offset:0}]:[],
 waves:[wave(260,base,2,{tutorial:i===0?'MOVE, THEN {attack} FOR THREE TAE KWON DO KICKS.':''}),wave(640,base,3,{tutorial:i===0?'{special}: FIRE. {tool}: CALL LOIAL. FILL SAIDIN, THEN {saidin}.':''}),wave(1040,base,4),wave(1360,base,0,{boss})],boss,bossName};}
 const LEVELS=[make(0,"EMOND'S FIELD",null),make(1,'CAEMLYN','FADE'),make(2,'SHADAR LOGOTH','DRAGHKAR'),make(3,'STONE OF TEAR','FORSAKEN'),make(4,'BLACK TOWER','MAZRIM TAIM')];
 WL.LEVELS=LEVELS;WL.OPENING=[STORY.opening];WL.ENDING=[STORY.ending];WL.STORY=STORY;WL.WALL_BASE=FT-22;
})();
