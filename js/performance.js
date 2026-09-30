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
  R.effects={stamp(key,paint,width=96,height=width){if(stamps.has(key))return stamps.get(key);const c=document.createElement('canvas');c.width=width;c.height=height;paint(c.getContext('2d'),width,height);stamps.set(key,c);return c;},
    glow(color){return this.stamp('glow:'+color,(g,s)=>{const r=s/2,v=g.createRadialGradient(r,r,0,r,r,r);v.addColorStop(0,color);v.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=v;g.fillRect(0,0,s,s);});}
  };
  R.perf.work=[];
  R.perf.hitches=[];
  R.perf.poseFallbacks=0;
  // The 2px source-rect face draw is off. A pixel diff of every pose of every
  // rig against the full-texture clip measured a max channel difference of 255
  // (worst: twinkle hurt). The canvas path keeps drawing the whole texture.
  R.perf.fullFace=true;
  R.perf.frameJobs=null;
  R.perf.slowSteps=[];
  R.perf.markStep=function(name,ms){
    if(!(ms>4))return;
    const row=[name,+ms.toFixed(2)];
    (this.frameJobs||(this.frameJobs=[])).push(row);
    if(this.slowSteps.length<80)this.slowSteps.push(row);
  };
  R.perf.noteBake=function(name,ms){
    if(this.inBake||this.allowSync)return;
    const sc=R.game&&R.game.scene;
    if(!sc||!sc.isGameplay||R.game.fadeDir)return;
    this.markStep(name,ms==null?0:ms);
    const out=this.outside||(this.outside=[]);
    out.push({name,ms:+(ms||0).toFixed(2),t:performance.now()});
    if(out.length>100)out.shift();
  };
  // One priority queue for every canvas bake. A job's run(job, end) returns
  // false when the frame budget is spent and the job must resume next frame.
  R.Bake={
    q:[],seq:0,touches:[],names:new Set(),
    enqueue(pri,name,run,data){
      if(name&&this.names.has(name)){
        const hit=this.q.find(j=>j.name===name);
        if(hit&&pri<hit.pri)hit.pri=pri;
        return hit;
      }
      const job=Object.assign({pri,seq:this.seq++,name,run},data||{});
      this.q.push(job);
      if(name)this.names.add(name);
      return job;
    },
    drop(pred){
      this.q=this.q.filter(j=>{
        if(!pred(j))return true;
        if(j.name)this.names.delete(j.name);
        return false;
      });
    },
    pump(ms){
      const end=performance.now()+Math.max(0,ms);
      const started=performance.now();
      R.perf.inBake=true;
      let guard=0;
      while(this.q.length&&performance.now()<end&&guard++<64){
        let best=0;
        for(let i=1;i<this.q.length;i++){
          const a=this.q[i],b=this.q[best];
          if(a.pri<b.pri||(a.pri===b.pri&&a.seq<b.seq))best=i;
        }
        const job=this.q[best];
        const t0=performance.now();
        let done=false;
        try{done=job.run(job,end)!==false;}catch(e){done=true;}
        const dt=performance.now()-t0;
        if(dt>4)R.perf.markStep(job.name||'bake',dt);
        if(done){
          this.q.splice(best,1);
          if(job.name)this.names.delete(job.name);
        }else if(performance.now()>=end||dt<0.05)break;
      }
      R.perf.inBake=false;
      R.perf.lastPumpMs=performance.now()-started;
      return R.perf.lastPumpMs;
    },
    queueTouch(entry){
      if(!entry||entry.touched||entry._touchQueued)return;
      entry._touchQueued=true;
      this.touches.push(entry);
    },
    flushTouches(limitMs){
      if(!this.touches.length||!R.Puppet||!R.Puppet.touchEntry)return 0;
      const end=performance.now()+(limitMs==null?2:limitMs);
      const prev=R.perf.inBake;R.perf.inBake=true;
      let n=0;
      while(this.touches.length&&performance.now()<end){
        const entry=this.touches.shift();
        entry._touchQueued=false;
        if(R.Puppet.touchEntry(entry))n++;
      }
      R.perf.inBake=prev;
      return n;
    }
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
