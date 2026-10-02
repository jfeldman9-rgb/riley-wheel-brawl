'use strict';
// Diagnostic only (not an acceptance gate): queued puppet poses must keep exact
// pixels when their raster is paced into bake slices.
//   node pose-raster-pixels.cjs <controlRoot> <candidateRoot> [out.json]
// For Stages 1-5 wave 3, each build enters through the normal Play constructor,
// detaches the scene so the RAF loop neither draws nor pumps, drains every
// queued pose job with ordinary 4 ms R.Bake.pump calls, then hashes the RGBA
// bytes of every baked pose surface. Both builds must bake the same pose set
// with identical geometry and bytes. Exit code 1 on any difference.
const fs=require('fs'),path=require('path'),http=require('http');
const [controlRoot,candidateRoot,out]=process.argv.slice(2);
if(!controlRoot||!candidateRoot)throw Error('usage: pose-raster-pixels.cjs <controlRoot> <candidateRoot> [out.json]');
const types={'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
function serve(root){
  const s=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(root,u==='/'?'index.html':u);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.statusCode=404;return res.end();}res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
  return new Promise(r=>s.listen(0,'127.0.0.1',()=>r(s)));
}
async function capture(browser,root,level){
  const server=await serve(path.resolve(root));
  const c=await browser.newContext({viewport:{width:1280,height:720}}),p=await c.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('rwb-settings',JSON.stringify({music:0,volume:1,fx:'full',mode:'auto'}));});
  await p.goto('http://127.0.0.1:'+server.address().port+'/');
  await p.waitForFunction(()=>window.RWB?.assets.done&&RWB.game?.scene,null,{timeout:120000});
  await p.evaluate(()=>{RWB.perf.runtimeLite=false;RWB.perf.quality=1;RWB.display.resize();RWB.perf.observe=()=>{};});
  const result=await p.evaluate(async level=>{
    const R=RWB;let seed=1900+level;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
    const s=new R.scenes.Play(R.game,level,{wave:3,lives:99,difficulty:'normal',callandor:level===4});
    R.game.setSceneNow(s);R.game.scene=null;
    const poseJobs=()=>R.Bake.q.filter(j=>j.name&&j.name.startsWith('pose:'));
    const kinds=new Set([...(R.perf.stageVisibleKinds||[]),...poseJobs().map(j=>j.kind)]);
    const queued=poseJobs().length,paced=poseJobs().filter(j=>j.rasterPaced).length;
    // Jobs whose ready() dependency is unmet stay queued in both builds.
    const runnable=()=>poseJobs().some(j=>!j.ready||j.ready());
    let pumps=0;while(runnable()&&pumps<20000){R.Bake.pump(4);pumps++;}
    const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
    const rows=[];
    for(const kind of [...kinds].sort()){
      // prepare() returns the rig untouched when its whole library is baked.
      const r=R.Puppet.prepare(kind);if(!r||!r.library)continue;
      for(const [key,e] of [...r.library].sort((a,b)=>a[0]<b[0]?-1:1)){
        const d=e.surface.getContext('2d').getImageData(0,0,e.surface.width,e.surface.height).data;
        rows.push({kind,key,w:e.surface.width,h:e.surface.height,bounds:e.bounds,scale:e.scale,identity:!!e.identity,sha256:hex(await crypto.subtle.digest('SHA-256',d))});
      }
    }
    return {queued,paced,pumps,left:poseJobs().map(j=>j.name).sort(),rows};
  },level);
  await c.close();server.close();
  return {...result,errors};
}
(async()=>{
  const {chromium}=require('playwright');
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-accelerated-2d-canvas']});
  const report={controlRoot:path.resolve(controlRoot),candidateRoot:path.resolve(candidateRoot),browser:browser.version(),stages:[]};let failed=false;
  try{
    for(let level=0;level<5;level++){
      const control=await capture(browser,controlRoot,level),candidate=await capture(browser,candidateRoot,level);
      const key=r=>r.kind+':'+r.key,cmap=new Map(control.rows.map(r=>[key(r),r]));
      const diffs=[];
      if(control.rows.length!==candidate.rows.length)diffs.push({count:[control.rows.length,candidate.rows.length]});
      for(const r of candidate.rows){const o=cmap.get(key(r));if(!o||JSON.stringify(o)!==JSON.stringify(r))diffs.push({pose:key(r),control:o||null,candidate:r});}
      const row={stage:level+1,poses:candidate.rows.length,controlQueued:control.queued,candidateQueued:candidate.queued,candidatePaced:candidate.paced,left:candidate.left.length,leftKinds:[...new Set(candidate.left.map(n=>n.split(':')[1]))],leftMatches:JSON.stringify(control.left)===JSON.stringify(candidate.left),errors:[...control.errors,...candidate.errors],diffs};
      if(diffs.length||row.errors.length||!row.poses||!row.leftMatches||candidate.paced!==candidate.queued)failed=true;
      report.stages.push(row);console.log(JSON.stringify({...row,diffs:diffs.length}));
    }
  }finally{await browser.close();}
  report.passed=!failed;
  if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log((failed?'FAIL':'PASS')+' queued pose pixels: '+report.stages.map(s=>'S'+s.stage+' '+s.poses+' poses').join(', '));
  if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
