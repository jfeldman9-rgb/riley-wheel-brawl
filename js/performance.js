/* Smoothness infrastructure. Rendering never changes the authoritative simulation. */
'use strict';
(function () {
  const R=window.RWB,STEP=1/60;
  R.FrameClock=class FrameClock {
    constructor(){this.reset();this.dropped=0;}
    reset(){this.accumulator=0;this.pending={};this.alpha=1;}
    advance(dt,input,step){
      for(const key in input.pressed)if(input.pressed[key])this.pending[key]=true;
      this.accumulator+=Math.max(0,Math.min(.1,dt));let count=0;
      while(this.accumulator+1e-10>=STEP&&count<5){
        const pressed=this.pending;this.pending={};
        step(STEP,{pressed,held:input.held,pointer:input.pointer,gamepad:input.gamepad,axis:()=>input.axis(),consumeAny:()=>input.consumeAny?input.consumeAny():Object.keys(pressed).length>0});
        this.accumulator-=STEP;count++;
      }
      if(this.accumulator>=STEP){const excess=Math.floor(this.accumulator/STEP)*STEP;this.dropped+=excess;this.accumulator-=excess;}
      this.alpha=Math.max(0,Math.min(1,this.accumulator/STEP));return count;
    }
  };
  const fields=['x','y','z','walkDistance','phase','lift','shakeX','shakeY','punchX','punchY'];
  function each(scene,visit){const actor=a=>{if(!a)return;visit(a);if(a.gait){visit(a.gait);for(const foot of a.gait.feet||[])visit(foot);}};visit(scene.camera);actor(scene.player);for(const group of ['enemies','allies','projectiles','pickups'])for(const item of scene[group]||[])actor(item);}
  R.Motion={alpha:1,
    capture(scene){each(scene,a=>{if(!a)return;const p=a._previous||(a._previous={});for(const k of fields)p[k]=a[k];});},
    apply(scene){if(this.alpha>=1||scene.paused)return;const alpha=this.alpha;each(scene,a=>{
      if(!a||!a._previous)return;const p=a._previous;
      if(Math.abs(a.x-p.x)>140||Math.abs((a.y||0)-(p.y||0))>80)return;
      const saved=a._renderSaved||(a._renderSaved={});saved.active=true;
      for(const k of fields){saved[k]=a[k];if(Number.isFinite(a[k])&&Number.isFinite(p[k]))a[k]=p[k]+(a[k]-p[k])*alpha;}
    });},
    restore(scene){each(scene,a=>{const p=a&&a._renderSaved;if(!p||!p.active)return;for(const k of fields)a[k]=p[k];p.active=false;});}
  };
  Object.assign(R.perf,{quality:1,slow:0,fast:0,metrics:{frames:0,costMs:0,overBudget:0,scaleChanges:0},
    observe(cost,dt,fighting){
      const m=this.metrics;m.frames++;m.costMs=cost;if(cost>16.7)m.overBudget++;
      if(!fighting||R.display.mode!=='auto'){this.slow=this.fast=0;return;}
      const slow=cost>18||dt>.024;this.slow=slow?this.slow+Math.min(dt,.05):Math.max(0,this.slow-dt*.5);this.fast=!slow&&cost<10?this.fast+dt:0;
      let quality=this.quality;
      if(this.slow>1.2){quality=Math.max(.6,quality-.15);this.slow=0;this.fast=0;this.runtimeLite=true;}
      else if(this.fast>8){quality=Math.min(1,quality+.1);this.fast=0;if(quality===1)this.runtimeLite=false;}
      if(quality!==this.quality){this.quality=quality;m.scaleChanges++;R.display.resize();}
    }
  });
  // Reused soft textures replace radial-gradient allocation in particle hot paths.
  const stamps=new Map();
  R.effects={stamp(key,paint,size=96){if(stamps.has(key))return stamps.get(key);const c=document.createElement('canvas');c.width=c.height=size;paint(c.getContext('2d'),size);stamps.set(key,c);return c;},
    glow(color){return this.stamp('glow:'+color,(g,s)=>{const r=s/2,v=g.createRadialGradient(r,r,0,r,r,r);v.addColorStop(0,color);v.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=v;g.fillRect(0,0,s,s);});}
  };
  let preparation=null;
  R.prepareRendering=function(){
    if(preparation)return preparation;
    const jobs=[];
    if(R.StageWorld)for(let n=0;n<5;n++)jobs.push(()=>R.StageWorld.prepare(n));
    if(R.Riley.prepare)jobs.push(()=>R.Riley.prepare());
    preparation=new Promise(resolve=>{const next=()=>{const until=performance.now()+4;do{const job=jobs.shift();if(job)job();}while(jobs.length&&performance.now()<until);if(jobs.length)setTimeout(next,0);else warmDisplay().then(resolve);};next();});return preparation;
  };
  function warmDisplay(){
    // First draws of stage art onto the onscreen canvas upload textures.
    // On SwiftShader that present can stall for hundreds of milliseconds, so
    // do it before gameplay samples frames. Pose atlases wait for stage enter
    // so the title screen does not hold every enemy. Snapshot the Continue
    // slot anyway: a fight constructor autosaves, and this must not replace it.
    const canvas=document.getElementById('game'),ctx=canvas&&canvas.getContext('2d');
    if(!ctx||!R.StageWorld||!R.game)return Promise.resolve();
    const rs=R.display.renderScale||1,runKey='rwb-run';
    let saved=null,had=false;
    try{saved=localStorage.getItem(runKey);had=saved!==null;}catch(e){}
    const scene=R.game.scene,next=R.game.nextScene,fade=R.game.fade,fadeDir=R.game.fadeDir;
    try{
      ctx.setTransform(rs,0,0,rs,0,0);
      for(const [level,wave] of [[0,3],[2,3],[4,3],[3,5]]){
        const view={levelIndex:level,camera:{x:0},time:0,wave};
        R.StageWorld.draw(ctx,view);
        R.StageWorld.near(ctx,view);
      }
      // Stage 1's plates are the slow bake. Leave them resident so the first
      // stage enter, still under the black load fade, does not build them again.
      R.StageWorld.draw(ctx,{levelIndex:0,camera:{x:0},time:0,wave:3,level:{length:(R.SCROLL&&R.SCROLL.length)||4240}});
      ctx.getImageData(0,0,1,1);
    }catch(e){}
    finally{
      try{if(had)localStorage.setItem(runKey,saved);else localStorage.removeItem(runKey);}catch(e){}
      R.game.scene=scene;R.game.nextScene=next;R.game.fade=fade;R.game.fadeDir=fadeDir;
    }
    // Do not call requestAnimationFrame here. review.cjs and smoothness-browser.cjs
    // stub it and keep the last registered callback as the manual game pump.
    return Promise.resolve();
  }
  R.warmDisplay=warmDisplay;
})();
