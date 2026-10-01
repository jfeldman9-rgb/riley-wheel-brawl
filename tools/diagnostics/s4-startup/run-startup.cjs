'use strict';
// Additive diagnostic only. The ordinary acceptance driver and timings are unchanged.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),http=require('node:http'),zlib=require('node:zlib');
const SOURCE='1a930986076c20cdf6d1a8df0bfaadee7181e680';
const FIXTURE_SHA='74cfbb85a98fae8fe9c3d97c68638836a4a7c76f6ef43dfbba21f032c05e876d';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const git=(root,...a)=>cp.execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
function fixture(root){
  const text=fs.readFileSync(path.join(root,'tools/performance-v11.cjs'),'utf8'),marker='await p.evaluate(({level,wave})=>{';
  if(text.split(marker).length!==2)throw Error('S4 fixture marker changed');
  const start=text.indexOf(marker)+'await p.evaluate('.length,end=text.indexOf('},{level,wave});',start)+1;
  if(end<=start)throw Error('S4 fixture end missing');
  const body=text.slice(start,end);if(sha(body)!==FIXTURE_SHA)throw Error('S4 controller/fixture changed');
  return {body,sha256:sha(body)};
}
function source(root){
  if(git(root,'status','--porcelain','--','js','assets','index.html','css'))throw Error('Runtime source must be clean');
  if(git(root,'diff','--name-only',SOURCE,'HEAD','--','js','assets','index.html','css'))throw Error('Diagnostic requires unchanged reviewed runtime');
  const hashes=Object.fromEntries(fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js')).sort().map(f=>[f,sha(fs.readFileSync(path.join(root,'js',f)))]));
  return {reviewedRuntime:SOURCE,commit:git(root,'rev-parse','HEAD'),tree:git(root,'rev-parse','HEAD^{tree}'),sourceHashes:hashes};
}
function diagnostics(){
  const root=path.resolve(__dirname,'../../..');
  const files=['tools/diagnostics/s4-startup/run-startup.cjs','tools/diagnostics/s4-startup/startup-probe.cjs','.github/workflows/v11-acceptance.yml'];
  if(git(root,'status','--porcelain','--',...files))throw Error('Diagnostic source must be committed and clean');
  return {commit:git(root,'rev-parse','HEAD'),files:Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(path.join(root,f)))]))};
}
function retain(name,value,out){
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value));
  if(bytes.length>48*1024*1024)throw Error('Diagnostic payload exceeds 48 MiB: '+name);
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,name),bytes);
  console.log('RWB_PERF_BEGIN '+JSON.stringify({name,bytes:bytes.length,sha256:sha(bytes),encoding:'gzip+base64'}));
  const packed=zlib.gzipSync(bytes).toString('base64');for(let i=0;i<packed.length;i+=12000)console.log('RWB_PERF_DATA '+packed.slice(i,i+12000));
  console.log('RWB_PERF_END '+name);
}
async function readStream(client,handle){
  const chunks=[];let size=0;
  try{for(;;){const r=await client.send('IO.read',{handle,size:65536});const b=Buffer.from(r.data,r.base64Encoded?'base64':'utf8');size+=b.length;if(size>48*1024*1024)throw Error('Chrome trace exceeds bounded size');chunks.push(b);if(r.eof)break;}}
  finally{await client.send('IO.close',{handle});}
  return Buffer.concat(chunks);
}
function validateReport(report){
  const fail=message=>{throw Error('Invalid S4 diagnostic: '+message);},s=report?.sample,p=s?.probe;
  if(!report?.diagnosticOnly||report.reviewedRuntime!==SOURCE||report.fixtureSha256!==FIXTURE_SHA)fail('source/fixture identity');
  if(!Array.isArray(report.errors)||report.errors.length)fail('browser errors');
  if(typeof report.music!=='boolean'||s?.musicEnabled!==report.music||s.stage!==4||s.wave!==5||s.callandor!==false)fail('fixture conditions');
  if(p?.complete!==true||p.overflow!==false||p.observerFaults!==0||p.droppedEvents!==0||!Array.isArray(p.failures)||p.failures.length)fail('incomplete observer');
  for(const key of ['performanceMark','createImageBitmap','fetch','Response.arrayBuffer','decodeAudioData','AudioBufferSourceNode.start','canvas.getContext','canvas.drawImage','canvas.getImageData','canvas.fillRect','canvas.putImageData','Bake.enqueue','audio.trace.push'])if(p.features?.[key]!==true)fail('missing observation '+key);
  if(!Array.isArray(p.events)||!p.events.length||p.events.some((e,i)=>!Number.isFinite(e.atMs)||e.atMs<0||e.seq!==i+1||(i&&e.atMs<p.events[i-1].atMs)))fail('event sequence/time');
  let prior=-1;const marks={};for(const label of ['scene-entry-start','scene-entry-return','two-raf-boundary','sample-start','sample-end']){const hits=p.events.filter(e=>e.type==='marker'&&e.label===label);if(hits.length!==1||hits[0].seq<=prior)fail('marker '+label);prior=hits[0].seq;marks[label]=hits[0];}
  if(!Array.isArray(s.rafTimes)||s.rafTimes.length<2||s.rafTimes.some((t,i)=>!Number.isFinite(t)||(i&&t<=s.rafTimes[i-1]))||s.rafTimes.at(-1)-s.rafTimes[0]<1500)fail('RAF window');
  if(!Array.isArray(s.frames)||s.frames.length!==s.rafTimes.length||s.frames.some((f,i)=>!f||!Number.isFinite(f.t)||Math.abs(f.t-s.rafTimes[i])>.001||['frameMs','updateMs','drawMs','pumpMs'].some(k=>!Number.isFinite(f[k])||f[k]<0)))fail('frame alignment');
  if(marks['sample-start'].atMs>s.rafTimes[0]||marks['sample-end'].atMs<s.rafTimes.at(-1))fail('marker/RAF interval');
  if(!p.events.some(e=>e.type==='job-step'&&e.job==='pose:guard:idle'&&e.atMs>=marks['scene-entry-start'].atMs&&e.atMs<=marks['sample-end'].atMs))fail('expected speculative guard observation missing');
  return true;
}
async function run(root,out){
  // Prevent accidental local browser/socket execution. This task's cloud browser
  // launch is blocked; only the authorized public GitHub runner executes this.
  if(process.env.CI!=='true'||!process.env.GITHUB_ACTIONS)throw Error('Run only in the authorized GitHub Actions diagnostic job');
  const identity=source(root),diagnosticProvenance=diagnostics(),f=fixture(root),{installStartupProbe}=require('./startup-probe.cjs'),{chromium}=require('playwright');
  const mime={'.js':'application/javascript','.css':'text/css','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
  const server=http.createServer((req,res)=>{let file;try{const u=decodeURIComponent(req.url.split('?')[0]);file=path.resolve(root,'.'+(u==='/'?'/index.html':u));}catch{res.statusCode=400;return res.end();}if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end();}res.setHeader('Content-Type',mime[path.extname(file)]||'text/html');fs.createReadStream(file).pipe(res);});
  let browser;const rows=[];
  try{
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-accelerated-2d-canvas']});
    // Alternating conditions; every context starts fresh. No timing is substituted
    // for the separate uninstrumented acceptance run.
    const order=[false,true,true,false,false,true];
    for(let i=0;i<order.length;i++){
      const music=order[i],c=await browser.newContext({viewport:{width:1280,height:720}}),p=await c.newPage(),errors=[];
      try{
        p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push('HTTP '+r.status()+' '+new URL(r.url()).pathname);});p.on('requestfailed',r=>errors.push('requestfailed '+new URL(r.url()).pathname));
        await p.addInitScript(on=>localStorage.setItem('rwb-settings',JSON.stringify({music:on?1:0,volume:1,fx:'full',mode:'auto'})),music);
        await p.addInitScript({content:'window.__s4StartupProbe=('+installStartupProbe.toString()+')(globalThis);'});
        await p.goto('http://127.0.0.1:'+server.address().port+'/');
        await p.waitForFunction(()=>window.RWB?.assets.done,null,{timeout:120000});
        const assetReadyMs=await p.evaluate(()=>performance.now());
        await p.waitForFunction(()=>RWB.game?.scene,null,{timeout:120000});
        const bootReadyMs=await p.evaluate(()=>performance.now());
        const client=await c.newCDPSession(p);let complete;
        const traceDone=new Promise(resolve=>complete=resolve);client.once('Tracing.tracingComplete',complete);
        await client.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing,v8,cc,gpu',transferMode:'ReturnAsStream',streamFormat:'json',streamCompression:'none'});
        await client.send('Profiler.enable');await client.send('Profiler.setSamplingInterval',{interval:1000});await client.send('Profiler.start');
        await p.keyboard.press('Shift');
        await p.evaluate(()=>{RWB.perf.runtimeLite=false;RWB.perf.quality=1;RWB.display.resize();RWB.perf.observe=()=>{};__s4StartupProbe.attachR(RWB);__s4StartupProbe.mark('scene-entry-start');});
        await p.evaluate(({setup,level,wave})=>{(0,eval)('('+setup+')')({level,wave});__s4StartupProbe.mark('scene-entry-return');},{setup:f.body,level:3,wave:5});
        // Same two-RAF readiness boundary as the accepted fixture. No added settle.
        await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(t=>{__s4StartupProbe.mark('two-raf-boundary',{rafTime:t});r();}))));
        const sample=await p.evaluate(async()=>{
          const R=RWB,rafTimes=[],frames=[];__s4StartupProbe.mark('sample-start');
          await new Promise(resolve=>{let start;function tick(t){if(start===undefined)start=t;rafTimes.push(t);const w=R.perf.work?.at(-1);if(w)frames.push({...w,pendingCount:R.Bake.q.length,pending:R.Bake.q.slice(0,12).map(j=>j.name)});if(t-start>=1500)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);});
          __s4StartupProbe.mark('sample-end');
          return {rafTimes,frames,stage:4,wave:5,callandor:!!sampleScene.player.callandor,musicEnabled:R.audio.musicLevel>0,musicPlaying:!!(R.audio.track&&R.audio.track.playing),musicTrace:R.audio.trace.slice(),entryTiming:R.perf.entryTiming,stageVisibleKinds:R.perf.stageVisibleKinds,stageRigTimings:R.perf.stageRigTimings,probe:__s4StartupProbe.snapshot()};
        });
        const profile=await client.send('Profiler.stop');await client.send('Tracing.end');
        let traceTimer;const traceEvent=await Promise.race([traceDone,new Promise((_,reject)=>{traceTimer=setTimeout(()=>reject(Error('Chrome trace completion timed out')),30000);})]).finally(()=>clearTimeout(traceTimer));
        if(!traceEvent.stream)throw Error('Chrome trace stream missing');
        const trace=await readStream(client,traceEvent.stream),timeline=JSON.parse(trace);
        const report={version:1,...identity,diagnosticProvenance,sequence:i+1,music,fixtureSha256:f.sha256,browser:await browser.version(),assetReadyMs,bootReadyMs,errors,sample,traceDataLoss:traceEvent.dataLossOccurred,diagnosticOnly:true,method:'Instrumented 1.5-second S4 wave5 startup, unchanged controller/two-RAF boundary. Canvas/bitmap/audio wrappers plus 1ms CPU sampling and Chrome timeline add overhead. These timings are not acceptance results, causal proof, or a physical-machine pass.'};
        const stem='s4-'+(music?'on':'off')+'-'+(Math.floor(i/2)+1);
        retain(stem+'.json',report,out);retain(stem+'-trace.json',trace,out);retain(stem+'.cpuprofile',profile.profile,out);
        validateReport(report); // Retain even a failed diagnostic before rejecting it.
        if(traceEvent.dataLossOccurred!==false||!Array.isArray(timeline.traceEvents)||!timeline.traceEvents.some(e=>e.name==='rwb-s4:sample-end'))throw Error('Chrome timeline is incomplete or missing alignment marks');
        if(!Array.isArray(profile.profile.samples)||!profile.profile.samples.length||profile.profile.samples.length!==profile.profile.timeDeltas?.length)throw Error('CPU profile samples incomplete');
        rows.push({sequence:i+1,music,file:stem+'.json',trace:stem+'-trace.json',profile:stem+'.cpuprofile',frames:sample.rafTimes.length});
        console.log('RWB_S4_STARTUP_RUN '+JSON.stringify(rows.at(-1)));
        await p.evaluate(()=>__s4StartupProbe.restore());
      }finally{await c.close();}
    }
    const after=source(root);if(JSON.stringify(identity)!==JSON.stringify(after))throw Error('Runtime source changed during diagnostic');
    if(JSON.stringify(diagnosticProvenance)!==JSON.stringify(diagnostics()))throw Error('Diagnostic source changed during recording');
    retain('s4-startup-manifest.json',{...identity,diagnosticProvenance,fixtureSha256:f.sha256,diagnosticOnly:true,complete:rows.length===6,rows},out);
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module){
  const root=path.resolve(process.argv[2]||path.join(__dirname,'../../..')),out=path.resolve(process.argv[3]||path.join(root,'docs/review/v11/s4-startup'));
  if(process.argv.includes('--validate-only'))console.log(JSON.stringify({identity:source(root),fixture:fixture(root).sha256}));
  else if(process.argv.includes('--run-browser'))run(root,out).catch(e=>{console.error(e);process.exitCode=1;});
  else throw Error('Choose --validate-only or explicit --run-browser');
}
module.exports={fixture,source,readStream,validateReport,SOURCE,FIXTURE_SHA};
