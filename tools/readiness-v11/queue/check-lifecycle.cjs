'use strict';
// Combined candidate bitmap lifecycle with actual combined scheduler and renderer.
const fs=require('fs'),assert=require('node:assert/strict'),{engine,req}=require('./check-queue.cjs'),{createCanvas}=req('@napi-rs/canvas');
const {runtime}=require('../runtime.cjs');
const rows=[];
(async()=>{const images=new Map([['cg-loial',createCanvas(8,8)]]),source={perf:runtime('candidate','performance.js'),puppets:runtime('candidate','puppets.js')};
  for(const order of ['drop-before-resolve','resolve-before-drop','replace-before-resolve','synchronous-completion-before-resolve']){
    const e=await engine(source,images),{R}=e;const job=e.queue('loial','w0',0);e.pump();const old=e.pending[0];
    if(order==='resolve-before-drop')await e.settle(old);
    if(order==='synchronous-completion-before-resolve'){R.Puppet.test.getRig(R.Puppet.defs.loial);R.Bake.drop(j=>j===job);}
    else{R.Puppet.test.dropRig('loial');R.Bake.drop(j=>j===job);}
    if(order==='replace-before-resolve'){e.queue('loial','w0',0);e.pump();assert.equal(e.pending.length,2);}
    if(order!=='resolve-before-drop')await e.settle(old);
    assert.equal(old.closeCount,1,'abandoned bitmap explicitly closed exactly once');
    if(order==='replace-before-resolve'){const current=e.pending[1];assert.equal(current.closeCount,0);await e.settle(current);e.drain();assert.equal(current.closeCount,1);assert.ok(R.Puppet.test.peekRig(R.Puppet.defs.loial).library.has('w0'));}
    else assert.equal(R.Bake.q.length,0);
    rows.push({case:order,oldBitmapCloseCount:old.closeCount,pass:true});console.log('PASS '+order);
  }
  fs.writeFileSync(__dirname+'/lifecycle-report.json',JSON.stringify({combinedCandidate:true,combinedWithScheduler:true,method:'Controlled Promise lifecycle, tiny source canvas, no memory measurement or leak claim.',rows},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
