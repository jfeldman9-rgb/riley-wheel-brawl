'use strict';
// End-to-end campaign logic driven by ordinary action inputs, never injected
// damage/HP. Continues are explicit GameOver inputs and counted in the report.
// This is a scripted playthrough, not a claim of human or unassisted completion.
const path=require('path'),{boot}=require('./soak.cjs');
function campaignRun(R, seedValue=1001, options={}) {
  const originalGame=R.game, originalRandom=Math.random, originalRand=R.util.rand;
  const started=Date.now();
  let seed=seedValue;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  Math.random=random; if(R.__setRandom)R.__setRandom(random); R.util.rand=(a,b)=>a+random()*(b-a);
  const state={seed:seedValue,frames:0,continues:0,stages:[],reels:[],jointFinish:false,callandorCarried:false,finished:false};
  const game={scene:null,setScene(scene){this.scene=scene;R.game.scene=scene;if(scene.enter)scene.enter();},setSceneNow(scene){this.setScene(scene);}};
  R.game=game;R.settings.clearRun();R.settings.set({difficulty:'normal'});
  game.setScene(new R.scenes.Title(game));
  let lastScene=null;
  const input={pressed:{},held:{},axis(){const s=game.scene;if(!s.player)return{x:0,y:0};const e=s.enemies.filter(e=>!e.dead).sort((a,b)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0];if(!e)return s.marching?{x:1,y:0}:{x:0,y:0};const dx=e.x-s.player.x,dy=e.y-s.player.y;return{x:Math.abs(dx)>39?Math.sign(dx):0,y:Math.abs(dy)>8?Math.sign(dy)*.75:0};}};
  function* steps(){try {
    while(state.frames<60*3600&&state.continues<=30&&Date.now()-started<(options.maxWallMs||180000)){
      const s=game.scene;state.frames++;input.pressed={};input.held={};
      if(s!==lastScene){
        if(s instanceof R.scenes.Play){state.stages.push(s.levelIndex+1);if(s.levelIndex===4&&s.player.callandor)state.callandorCarried=true;}
        if(s instanceof R.scenes.Reel)state.reels.push(s.label);
        lastScene=s;
      }
      if(s instanceof R.scenes.Victory){state.finished=true;break;}
      if(s instanceof R.scenes.GameOver){state.continues++;input.pressed.start=true;}
      else if(s instanceof R.scenes.Title||s instanceof R.scenes.Reel)input.pressed.start=true;
      else if(s instanceof R.scenes.Play){
        const n=state.frames;
        if(!s.marching&&n%10===0)input.pressed.attack=true;
        if(!s.marching&&n%173===0)input.pressed.jump=true;
        if(!s.marching&&n%173===1)input.pressed.attack=true;
        if(!s.marching&&n%211===0){input.pressed.attack=true;input.held.down=true;}
        if(!s.marching&&n%89===0)input.pressed.special=true;
        if(n%401===0)input.pressed.assist=true;
        if(s.player.power>=s.player.powerMax&&n%31===0)input.pressed.power=true;
        if(s.joint&&s.joint.hit)state.jointFinish=true;
      }
      s.update(1/60,input);
      // Browser audio/fetch callbacks cannot run inside a single long synchronous
      // evaluate. Keep the same action ticks, but release the real event loop.
      if(options.cooperative){
        const waiting=game.scene instanceof R.scenes.Play&&game.scene.phase==='clear'&&R.audio.voiceBusy;
        if(waiting||state.frames%120===0){state.eventLoopYields=(state.eventLoopYields||0)+1;yield waiting?20:0;}
      }
    }
    const end=game.scene;
    state.terminal={scene:end?.constructor?.name,phase:end?.phase,wave:end?.wave,paused:!!end?.paused,clearTimer:end?.clearTimer,
      aliveEnemies:end?.enemies?.filter(e=>!e.dead).length,player:end?.player?{hp:end.player.hp,lives:end.player.lives,x:end.player.x,y:end.player.y}:null,
      voiceBusy:!!R.audio.voiceBusy,voicePending:!!R.audio.voicePending,voicePlaying:R.audio.voicePlaying||null,bakeJobs:R.Bake?.q?.length||0};
    state.wallMs=Date.now()-started;
    state.seconds=+(state.frames/60).toFixed(1);state.saveCleared=R.settings.loadRun()===null;
    state.passed=state.finished&&state.jointFinish&&state.callandorCarried&&state.saveCleared&&[1,2,3,4,5].every(n=>state.stages.includes(n))&&state.reels.includes('CALLANDOR ANSWERS')&&state.reels.includes('ESCAPE FROM THE BLACK TOWER')&&state.reels.includes('HOMECOMING');
    return state;
  } finally {Math.random=originalRandom;if(R.__setRandom)R.__setRandom(originalRandom);R.util.rand=originalRand;R.game=originalGame;}}
  const iterator=steps();
  if(options.cooperative)return(async()=>{let next;while(!(next=iterator.next()).done)await new Promise(resolve=>setTimeout(resolve,next.value));return next.value;})();
  return iterator.next().value;
}
if(require.main===module){const R=boot(path.resolve(__dirname,'..')),r=campaignRun(R);console.log((r.passed?'PASS':'FAIL')+' scripted full campaign '+JSON.stringify(r));if(!r.passed)process.exitCode=1;}
module.exports={campaignRun};
