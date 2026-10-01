'use strict';
// Prepared orchestration only. A browser can run ONLY with explicit --run-browser.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),os=require('node:os'),zlib=require('node:zlib');
const CONTROL_COMMIT='fbcf1fe2b76dd63f26c4b7a00b4ff7ccbf676814';
const CONTROL_TREE='2a99d4bf6d621ef3bdaae0cc83334d90635ce199';
const SCOPE=['index.html','css','js','assets','tools','.github/workflows'];
const DIAGNOSTICS=['compare-readiness.cjs','performance-readiness-v11.cjs','readiness-probe.cjs'];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const git=(root,...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function fail(message){throw Error(message);}
function filesOnDisk(root){
  const files={};
  function visit(relative){
    const p=path.join(root,relative);if(!fs.existsSync(p))return;
    const s=fs.lstatSync(p);if(s.isSymbolicLink())fail('Symlinks are not supported in frozen source: '+relative);
    if(s.isDirectory())for(const name of fs.readdirSync(p).sort())visit(relative+'/'+name);
    else if(s.isFile())files[relative]=sha(fs.readFileSync(p));
  }
  for(const item of SCOPE)visit(item);
  return Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)));
}
function snapshot(root){
  root=fs.realpathSync(root);
  const dirty=git(root,'status','--porcelain','--',...SCOPE);
  if(dirty)fail('Source scope must be clean, including untracked files: '+root+'\n'+dirty);
  const files=filesOnDisk(root);
  const tracked=git(root,'ls-files','--',...SCOPE).split('\n').filter(Boolean).sort();
  if(!same(Object.keys(files).sort(),tracked))fail('On-disk source inventory differs from tracked scope: '+root);
  return {root,commit:git(root,'rev-parse','HEAD'),tree:git(root,'rev-parse','HEAD^{tree}'),files};
}
function diagnosticHashes(){return Object.fromEntries(DIAGNOSTICS.map(name=>[name,sha(fs.readFileSync(path.join(__dirname,name)))]));}
function validateShape(m){
  if(m.version!==1)fail('Expected manifest version 1');
  if(m.control?.commit!==CONTROL_COMMIT||m.control?.tree!==CONTROL_TREE)fail('Control must be the full reviewed fbcf commit and tree');
  for(const kind of ['control','candidate']){
    const row=m[kind];
    if(!row||!path.isAbsolute(row.root)||!/^[a-f0-9]{40}$/.test(row.commit)||!/^[a-f0-9]{40}$/.test(row.tree))fail('Full commit/tree and absolute root required for '+kind);
    if(!row.files||!Object.keys(row.files).length)fail('Empty source manifest: '+kind);
    for(const [file,hash] of Object.entries(row.files))if(!SCOPE.some(p=>file===p||file.startsWith(p+'/'))||file.includes('..')||!/^([a-f0-9]{64})$/.test(hash))fail('Invalid source entry: '+file);
  }
  if(m.control.root===m.candidate.root)fail('Separate frozen checkouts required');
  if(m.control.commit===m.candidate.commit)fail('Candidate must be a later distinct commit');
  const runtime=p=>p==='index.html'||/^(js|css|assets)\//.test(p);
  const names=new Set([...Object.keys(m.control.files),...Object.keys(m.candidate.files)]);
  if(![...names].some(p=>runtime(p)&&m.control.files[p]!==m.candidate.files[p]))fail('No runtime/asset difference; do not trigger a noisy browser rerun');
  if(!same(m.scope,SCOPE))fail('Measurement source scope changed');
  if(m.readiness!==true||m.immediate!==true||m.pairs!==3)fail('Driver requires instrumented immediate three-pair comparison');
  if(!m.diagnostics||DIAGNOSTICS.some(name=>!/^[a-f0-9]{64}$/.test(m.diagnostics[name])))fail('Diagnostic hashes required');
  return true;
}
function validateManifest(m){
  validateShape(m);
  if(!same(m.diagnostics,diagnosticHashes()))fail('Diagnostic files differ from frozen manifest');
  for(const kind of ['control','candidate'])if(!same(m[kind],snapshot(m[kind].root)))fail('Frozen '+kind+' source identity or files changed');
  return true;
}
function readManifest(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function prepare(controlRoot,candidateRoot,out){
  const m={version:1,createdAt:new Date().toISOString(),scope:SCOPE,readiness:true,immediate:true,pairs:3,
    control:snapshot(controlRoot),candidate:snapshot(candidateRoot),diagnostics:diagnosticHashes()};
  validateManifest(m);fs.writeFileSync(out,JSON.stringify(m,null,2)+'\n',{flag:'wx'});
  console.log('Prepared frozen manifest; no browser run: '+out);
}
function retainRaw(name,bytes,emit=console.log){
  if(!Buffer.isBuffer(bytes))bytes=Buffer.from(bytes);
  if(bytes.length>16*1024*1024)fail('Raw report exceeds 16 MiB: '+name);
  const meta={name,bytes:bytes.length,sha256:sha(bytes),encoding:'gzip+base64'};
  const encoded=zlib.gzipSync(bytes).toString('base64');
  emit('RWB_PERF_BEGIN '+JSON.stringify(meta));
  for(let i=0;i<encoded.length;i+=12000)emit('RWB_PERF_DATA '+encoded.slice(i,i+12000));
  emit('RWB_PERF_END '+name);
  return meta;
}
// Validate the unchanged profiler's requested-condition schema before any
// timing-only advisory decision. No playback wait or new music assertion is added.
function validateReport(data,expectedCommit){
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const requireThat=(ok,message)=>{if(!ok)fail('Invalid readiness report: '+message);};
  const finite=(value,label,positive=false)=>requireThat(typeof value==='number'&&Number.isFinite(value)&&(positive?value>0:value>=0),label+' must be finite and '+(positive?'positive':'nonnegative'));
  const integer=(value,label)=>requireThat(Number.isSafeInteger(value)&&value>=0,label+' must be a nonnegative safe integer');
  requireThat(object(data),'object required');
  function finiteTree(value,ancestors=new Set(),depth=0){
    requireThat(depth<=128,'report nesting exceeds supported depth');
    if(typeof value==='number'){requireThat(Number.isFinite(value),'nonfinite numeric report value');return;}
    if(value===null||typeof value==='string'||typeof value==='boolean')return;
    requireThat((Array.isArray(value)||object(value))&&!ancestors.has(value),'non-JSON or cyclic report value');
    ancestors.add(value);for(const child of Object.values(value))finiteTree(child,ancestors,depth+1);ancestors.delete(value);
  }
  finiteTree(data);
  requireThat(typeof expectedCommit==='string'&&/^[a-f0-9]{40}$/.test(expectedCommit)&&data.commit===expectedCommit&&data.baseCommit===expectedCommit,'full frozen commit mismatch');
  requireThat(data.workingTreeDirty===false&&data.settleMs===0,'clean source and immediate sampling required');
  requireThat(data.reportOnly===true&&data.profileOnly===false&&data.coldOnly===false&&data.pacingStatus==='measured','complete report-only matrix required');
  requireThat(typeof data.browser==='string'&&data.browser.trim().length>0,'browser version required');
  requireThat(data.readinessInstrumentation?.enabled===true&&data.readinessInstrumentation?.nativeVerification?.cloudChromium==='completed','completed instrumented measurement required');
  requireThat(Array.isArray(data.errors)&&data.errors.length===0,'error array must be present and empty');
  requireThat(object(data.gates)&&same(Object.keys(data.gates).sort(),['cold','errors','fights']),'only cold, fights and errors gates are supported');
  for(const name of ['cold','fights','errors'])requireThat(typeof data.gates[name]==='boolean','gate '+name+' must be boolean');
  requireThat(data.gates.errors===true,'errors gate must pass');
  function readiness(value,label){
    requireThat(object(value)&&Array.isArray(value.demands)&&Array.isArray(value.samples)&&value.samples.length>0,label+' readiness demands/samples required');
    for(const name of ['drawCalls','renderedDrawCalls','fallbackDrawCalls','fallbackMissDrawCalls','unavailableRigDrawCalls','uniqueDemandedKeys','demandAttempts','touchEntryCalls','successfulTouchCalls','acceptedTouchEnqueues'])integer(value[name],label+' readiness '+name);
    requireThat(object(value.queue)&&object(value.observerTiming),label+' readiness queue/timing required');
    for(const sample of value.samples){
      requireThat(object(sample)&&typeof sample.phase==='string'&&object(sample.counts),label+' malformed readiness sample');
      for(const name of ['atMs','sinceInstallMs','observerCostMs'])finite(sample[name],label+' readiness sample '+name);
      if(sample.rafTime!==null)finite(sample.rafTime,label+' readiness RAF time');
    }
    requireThat(value.demandAttempts===value.demands.length,label+' demand count mismatch');
    for(const demand of value.demands){requireThat(object(demand),label+' malformed demand');for(const name of ['readyMs','latencyMs'])if(demand[name]!==null)finite(demand[name],label+' demand '+name);}
    requireThat(value.fallbackDrawCalls<=value.renderedDrawCalls&&value.renderedDrawCalls<=value.drawCalls,label+' invalid fallback counts');
    requireThat(value.fallbackDrawFraction===(value.renderedDrawCalls?value.fallbackDrawCalls/value.renderedDrawCalls:null),label+' fallback fraction mismatch');
  }
  function cells(rows,stages,label){
    requireThat(Array.isArray(rows)&&rows.length===stages.length*2,label+' matrix length mismatch');
    const seen=new Set();
    for(const row of rows){
      requireThat(object(row)&&Number.isInteger(row.stage)&&stages.includes(row.stage)&&typeof row.music==='boolean',label+' invalid requested stage/music cell');
      const key=row.stage+':'+row.music;requireThat(!seen.has(key),label+' duplicate stage/music cell '+key);seen.add(key);
    }
    for(const stage of stages)for(const music of [false,true])requireThat(seen.has(stage+':'+music),label+' missing stage/music cell');
  }
  cells(data.cold,[1,2,3,4,5],'cold');cells(data.fights,[1,3,5],'fights');
  for(const row of data.cold){finite(row.enterMs,'cold enterMs');finite(row.initMs,'cold initMs');readiness(row.readiness,'cold');}
  for(const row of data.fights){
    integer(row.frames,'fight frames');requireThat(row.frames>0,'fight frames must be positive');finite(row.fps,'fight FPS',true);integer(row.over33,'fight over33');
    const raw=row.raw;requireThat(object(raw),'fight raw data required');
    requireThat(Array.isArray(raw.gaps)&&raw.gaps.length>0&&Array.isArray(raw.rafTimes)&&Array.isArray(raw.frameWork),'nonempty raw gap/RAF/work arrays required');
    requireThat(raw.gaps.length===row.frames&&raw.rafTimes.length===raw.gaps.length+1&&raw.frameWork.length===raw.rafTimes.length,'raw frame/gap/RAF/work count mismatch');
    raw.gaps.forEach(g=>finite(g,'raw gap',true));raw.rafTimes.forEach(t=>finite(t,'RAF timestamp'));
    raw.frameWork.forEach((work,i)=>{
      requireThat(object(work)&&work.t===raw.rafTimes[i],'frame-work timestamp mismatch');
      for(const name of ['frameMs','updateMs','drawMs','pumpMs'])finite(work[name],'frame work '+name);
    });
    raw.gaps.forEach((gap,i)=>requireThat(Math.abs((raw.rafTimes[i+1]-raw.rafTimes[i])-gap)<1e-6,'raw gap/RAF interval mismatch'));
    const elapsed=raw.gaps.reduce((total,gap)=>total+gap,0),fps=raw.gaps.length*1000/elapsed,over33=raw.gaps.filter(gap=>gap>33).length;
    requireThat(Number.isFinite(elapsed)&&raw.rafTimes.at(-1)-raw.rafTimes[0]>=10000,'full ten-second sampling window required');
    // Same operations as the profiler: no epsilon is applied to FPS or gates.
    requireThat(row.fps===fps&&row.over33===over33,'FPS/over33 disagree with raw gaps');
    const sorted=[...raw.gaps].sort((a,b)=>a-b);
    requireThat(object(row.gapsMs),'gap statistics required');
    for(const [name,expected] of [['p50',sorted[Math.floor(sorted.length*.5)]],['p95',sorted[Math.floor(sorted.length*.95)]],['max',sorted.at(-1)]])requireThat(row.gapsMs[name]===expected,'gap '+name+' statistic mismatch');
    readiness(raw.readiness,'fight');
  }
  const cold=data.cold.every(row=>row.enterMs<400),fights=data.fights.every(row=>row.fps>=59.5&&row.over33===0);
  requireThat(data.gates.cold===cold&&data.gates.fights===fights,'timing gates disagree with validated measurements');
  return true;
}
function run(m,out,advisoryTiming=false){
  if(advisoryTiming&&process.env.CI!=='true')fail('Advisory timing is limited to explicit CI=true policy');
  validateManifest(m);
  if(fs.existsSync(out))fail('Use a new output directory; never overwrite measured evidence');
  fs.mkdirSync(out,{recursive:true});
  const report={status:'running',advisoryTiming,method:'Three alternating serial pairs on the same host and browser with instrumented two-RAF immediate sampling. Strict values are retained with observer overhead; this is diagnostic evidence, not native-device acceptance.',
    nativeVerification:{cloudChromium:'unrun',sameMac:'unrun',physicalDevice:'unrun'},manifest:m,machine:{platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,cpuCount:os.cpus().length},runs:[]};
  let failure=null;
  try{
    for(let pair=1;pair<=3;pair++)for(const kind of (pair%2?['control','candidate']:['candidate','control'])){
      validateManifest(m);
      const file=path.join(out,kind+'-'+pair+'.json');
      const args=[path.join(__dirname,'performance-readiness-v11.cjs'),m[kind].root,file,'--immediate','--readiness','--report-only'];
      console.log('READINESS_RUN '+JSON.stringify({pair,kind,commit:m[kind].commit}));
      const row={pair,kind,file:path.basename(file),status:'running',rawRetained:false};
      report.runs.push(row);report.nativeVerification.cloudChromium='running';
      const child=cp.spawnSync(process.execPath,args,{cwd:__dirname,env:process.env,stdio:'inherit',timeout:10*60*1000});
      Object.assign(row,{exitCode:child.status,signal:child.signal,error:child.error?.message});
      // Preserve exact complete/partial bytes BEFORE any execution, parse, identity or gate failure.
      let data=null,parseError=null;
      if(fs.existsSync(file)){
        const bytes=fs.readFileSync(file),retained=retainRaw(path.basename(file),bytes);
        Object.assign(row,{rawRetained:true,sha256:retained.sha256,bytes:retained.bytes});
        try{data=JSON.parse(bytes.toString('utf8'));}catch(error){parseError=error;}
      }
      row.status='invalid-or-incomplete';
      if(data)Object.assign(row,{browser:data.browser,gates:data.gates,reportedErrors:data.errors,nativeVerification:data.readinessInstrumentation?.nativeVerification});
      validateManifest(m);
      if(child.error||child.signal||child.status!==0)fail('Profiler execution failed: '+kind+' '+pair+' '+(child.error?.message||child.signal||child.status));
      if(parseError)throw parseError;
      validateReport(data,m[kind].commit);
      const expectedJs=Object.fromEntries(Object.entries(m[kind].files).filter(([p])=>/^js\/[^/]+\.js$/.test(p)).map(([p,hash])=>[p.slice(3),hash]));
      if(!same(Object.entries(data.sourceHashes).sort(),Object.entries(expectedJs).sort()))fail('Profiler JavaScript hashes differ from manifest');
      Object.assign(row,{status:'measured',
        cold:data.cold.map(({readiness,...r})=>({...r,readinessSummary:summary(readiness)})),
        fights:data.fights.map(({raw,...r})=>({...r,readinessSummary:summary(raw.readiness)}))});
      fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify(report,null,2)+'\n');
    }
    if(new Set(report.runs.map(r=>r.browser)).size!==1)fail('Browser versions differ');
    report.status='measured';report.nativeVerification.cloudChromium='completed';report.candidateStrictGatesPassed=report.runs.filter(r=>r.kind==='candidate').every(r=>Object.values(r.gates).every(v=>v===true));
    if(!report.candidateStrictGatesPassed&&!advisoryTiming)process.exitCode=1;
  }catch(error){failure=error;report.status='invalid-or-incomplete';report.nativeVerification.cloudChromium=report.runs.some(r=>['running','completed','partial'].includes(r.nativeVerification?.cloudChromium))?'partial':report.runs.length?'attempted-no-confirmed-browser':'unrun';report.error=String(error.stack||error);process.exitCode=1;}
  finally{
    const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n');
    fs.writeFileSync(path.join(out,'comparison.json'),bytes);
    retainRaw('comparison.json',bytes);
    console.log('RWB_READINESS_REPORT '+JSON.stringify({status:report.status,advisoryTiming:report.advisoryTiming,nativeVerification:report.nativeVerification,
      control:{commit:m.control.commit,tree:m.control.tree},candidate:{commit:m.candidate.commit,tree:m.candidate.tree},
      candidateStrictGatesPassed:report.candidateStrictGatesPassed,error:report.error,
      runs:report.runs.map(({cold,fights,...row})=>row)}));
  }
  if(failure)throw failure;
}
function summary(r){return {drawCalls:r.drawCalls,renderedDrawCalls:r.renderedDrawCalls,fallbackDrawCalls:r.fallbackDrawCalls,fallbackMissDrawCalls:r.fallbackMissDrawCalls,
  fallbackDrawFraction:r.fallbackDrawFraction,unavailableRigDrawCalls:r.unavailableRigDrawCalls,uniqueDemandedKeys:r.uniqueDemandedKeys,demandAttempts:r.demandAttempts,
  unresolvedDemands:r.demands.filter(d=>d.readyMs===null).length,latencyMs:r.demands.map(d=>d.latencyMs),touchEntryCalls:r.touchEntryCalls,successfulTouchCalls:r.successfulTouchCalls,
  acceptedTouchEnqueues:r.acceptedTouchEnqueues,queue:r.queue,observerTiming:r.observerTiming};}
if(require.main===module){
  const [mode,...args]=process.argv.slice(2);
  if(mode==='--prepare'&&args.length===3)prepare(...args);
  else if(mode==='--validate-only'&&args.length===1){validateManifest(readManifest(args[0]));console.log('PASS frozen source manifest; no browser run');}
  else if(mode==='--run-browser'&&(args.length===2||(args.length===3&&args[2]==='--advisory-timing')))run(readManifest(args[0]),path.resolve(args[1]),args[2]==='--advisory-timing');
  else fail('Usage: --prepare CONTROL_ROOT CANDIDATE_ROOT MANIFEST.json | --validate-only MANIFEST.json | --run-browser MANIFEST.json NEW_OUTPUT_DIR [--advisory-timing]');
}
module.exports={validateShape,validateReport,summary,retainRaw,CONTROL_COMMIT,CONTROL_TREE,SCOPE,DIAGNOSTICS};
