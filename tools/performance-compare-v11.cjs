'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os'),zlib=require('node:zlib'),crypto=require('node:crypto');
const args=process.argv.slice(2),immediate=args.includes('--immediate'),ciRelative=args.includes('--ci-relative');
const root=path.resolve(__dirname,'..'),baseline=path.resolve(args.find(a=>!a.startsWith('--'))||''),out=path.resolve(args.find(a=>a.startsWith('--out='))?.slice(6)||path.join(root,'docs/review/v11/ci-performance'));
if(ciRelative&&!immediate)throw Error('The approved CI comparison requires the immediate sampling boundary');
const git=(dir,a)=>cp.execFileSync('git',a,{cwd:dir,encoding:'utf8'}).trim(),commit=dir=>git(dir,['rev-parse','HEAD']);
const expectedLive='816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc';
if(commit(baseline)!==expectedLive)throw Error('Performance baseline must be verified live 1.0');
const sourceScope=['index.html','css','js','assets','tools','.github'];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function sourceIdentity(dir){
 if(git(dir,['status','--porcelain','--',...sourceScope]))throw Error('Measurement source scope must be clean: '+dir);
 return {commit:commit(dir),tree:git(dir,['rev-parse','HEAD^{tree}']),js:Object.fromEntries(fs.readdirSync(path.join(dir,'js')).filter(f=>f.endsWith('.js')).sort().map(f=>[f,hash(fs.readFileSync(path.join(dir,'js',f)))]))};
}
const frozen={baseline:sourceIdentity(baseline),candidate:sourceIdentity(root)};
if(fs.existsSync(out))throw Error('Use a fresh comparison output directory; previous evidence must not be overwritten');
fs.mkdirSync(out,{recursive:true});
const report={settleMs:immediate?0:2000,pacingWindow:immediate?'immediate gameplay':'warmed gameplay; startup pacing is not covered',ciRelative,
 method:ciRelative?'Approved CI policy: three alternating serial live/candidate runs on one runner. Per stage/music cell: candidate median FPS >= live median -0.3; sum of candidate >33ms frames <= live total. Every candidate stage/music cold median <400ms. Absolute outcomes remain printed diagnostics. Audio Stage4 wave5/music-on is retained as an extra matched cell.':'Three alternating serial live/candidate runs; original absolute candidate thresholds remain blocking outside explicit CI-relative mode.',
 candidate:frozen.candidate.commit,baseline:frozen.baseline.commit,sourceIdentity:frozen,machine:{platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,cpuCount:os.cpus().length},runs:[]};
function retainRaw(name,data){
 const bytes=Buffer.from(JSON.stringify(data)),encoded=zlib.gzipSync(bytes).toString('base64');
 if(bytes.length>16*1024*1024)throw Error('Raw performance report exceeds16MiB');
 console.log('RWB_PERF_BEGIN '+JSON.stringify({name,bytes:bytes.length,sha256:hash(bytes),encoding:'gzip+base64'}));
 for(let i=0;i<encoded.length;i+=12000)console.log('RWB_PERF_DATA '+encoded.slice(i,i+12000));
 console.log('RWB_PERF_END '+name);
}
const equalJs=(a,b)=>JSON.stringify(Object.entries(a||{}).sort())===JSON.stringify(Object.entries(b||{}).sort());
let failed=false;
for(let run=1;run<=3;run++)for(const kind of(run%2?['baseline','candidate']:['candidate','baseline'])){
 const dir=kind==='baseline'?baseline:root,file=path.join(out,kind+'-'+run+'.json');console.log('::group::'+kind+' run '+run);
 if(JSON.stringify(sourceIdentity(dir))!==JSON.stringify(frozen[kind]))throw Error('Frozen measurement source changed');
 const profileArgs=['tools/performance-v11.cjs',dir,file,...(ciRelative?['--report-only','--audio-matched']:(kind==='baseline'?['--baseline']:[])),...(immediate?['--immediate']:[])];
 const r=cp.spawnSync(process.execPath,profileArgs,{cwd:root,env:process.env,encoding:'utf8',maxBuffer:16*1024*1024,timeout:10*60*1000});
 process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
 let data=null,parseError=null;try{data=JSON.parse(fs.readFileSync(file,'utf8'));}catch(error){parseError=error.message;}
 if(data)retainRaw(kind+'-'+run+'.json',data);
 const sourceUnchanged=JSON.stringify(sourceIdentity(dir))===JSON.stringify(frozen[kind]);
 const complete=!!data&&data.cold?.length===10&&data.fights?.length===6&&data.gates?.errors===true&&(!ciRelative||data.audioFights?.length===1);
 const valid=complete&&sourceUnchanged&&!data.workingTreeDirty&&data.commit===frozen[kind].commit&&equalJs(data.sourceHashes,frozen[kind].js)&&!data.errors?.length;
 if(!valid||r.error||r.signal||(ciRelative?r.status!==0:kind==='candidate'&&r.status!==0))failed=true;
 const row={run,kind,commit:data?.commit,settleMs:data?.settleMs,pacingWindow:data?.pacingWindow,exitCode:r.status,signal:r.signal||null,error:r.error?.message||parseError||null,complete:!!valid,browser:data?.browser,gates:data?.gates,reportedErrors:data?.errors,cold:data?.cold,fights:data?.fights?.map(({raw,...x})=>x),audioFights:data?.audioFights?.map(({raw,...x})=>x)};
 report.runs.push(row);console.log('RWB_PAIRED_RUN '+JSON.stringify(row));console.log('::endgroup::');
 fs.writeFileSync(path.join(out,'comparison-in-progress.json'),JSON.stringify(report,null,2)+'\n');
}
if(new Set(report.runs.map(r=>r.browser)).size!==1||report.runs.length!==6)failed=true;
if(ciRelative){
 report.ciPolicy=require('./ci-relative-policy-v11.cjs').evaluate(report);
 if(!report.ciPolicy.passed)failed=true;
 console.log('RWB_CI_RELATIVE_POLICY '+JSON.stringify(report.ciPolicy));
}
report.passed=!failed;fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify(report,null,2)+'\n');
console.log('RWB_PAIRED_REPORT '+JSON.stringify(report));if(failed)process.exitCode=1;
