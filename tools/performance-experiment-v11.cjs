'use strict';
// Separate diagnostic A/B experiment. Never changes the delivered runtime.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os'),crypto=require('node:crypto'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),control=path.resolve(process.argv[2]||''),variant=path.resolve(process.argv[3]||''),out=path.join(root,'docs/review/v11/ci-flush-experiment');
fs.mkdirSync(out,{recursive:true});
const git=(dir,args)=>cp.execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim(),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const controlHash='74937ae3c686e66c91be5bfde7110fb172c819facd0617281e2348baf05f9989',variantHash='81cc713902468d6f6137be05a3356159406e7170557b5ab890106de895c8e160';
if(hash(path.join(control,'js/puppets.js'))!==controlHash||hash(path.join(variant,'js/puppets.js'))!==variantHash)throw Error('Experiment requires the frozen reviewed control and eight-face variant');
if(git(control,['rev-parse','HEAD'])!==git(variant,['rev-parse','HEAD']))throw Error('Both worktrees must start at the same candidate commit');
if(git(control,['diff','--name-only','HEAD','--','index.html','js']))throw Error('Control runtime must be unchanged');
if(git(variant,['diff','--name-only','HEAD','--','index.html','js'])!=='js/puppets.js')throw Error('Only the reviewed variant renderer may differ');
for(const f of ['index.html',...fs.readdirSync(path.join(control,'js')).filter(f=>f.endsWith('.js')&&f!=='puppets.js').map(f=>'js/'+f)])if(hash(path.join(control,f))!==hash(path.join(variant,f)))throw Error('Unrelated runtime mismatch: '+f);
const report={diagnostic:true,releaseAcceptance:false,method:'Three alternating serial pairs on one cloud runner, same Chromium/profiler/settings and immediate two-RAF sampling boundary. Only the reviewed eight-face raster-flush patch differs. Both measured thresholds remain unchanged. Experimental success does not approve or publish this variant.',baseCommit:git(control,['rev-parse','HEAD']),controlHash,variantHash,machine:{platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,cpuCount:os.cpus().length},runs:[]};
function retain(name,data){const bytes=Buffer.from(JSON.stringify(data)),encoded=zlib.gzipSync(bytes).toString('base64');if(bytes.length>16*1024*1024)throw Error('Raw report exceeds16MiB');console.log('RWB_PERF_BEGIN '+JSON.stringify({name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),encoding:'gzip+base64'}));for(let i=0;i<encoded.length;i+=12000)console.log('RWB_PERF_DATA '+encoded.slice(i,i+12000));console.log('RWB_PERF_END '+name);}
let failed=false;
for(let run=1;run<=3;run++)for(const kind of(run%2?['control','flush8']:['flush8','control'])){
 const dir=kind==='control'?control:variant,file=path.join(out,kind+'-'+run+'.json');console.log('::group::'+kind+' run '+run);
 const r=cp.spawnSync(process.execPath,['tools/performance-v11.cjs',dir,file,'--immediate','--report-only'],{cwd:root,env:process.env,encoding:'utf8',maxBuffer:16*1024*1024,timeout:10*60*1000});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
 let data=null;try{data=JSON.parse(fs.readFileSync(file,'utf8'));}catch(_){}
 if(data)retain('experiment-'+kind+'-'+run+'.json',data);
 const complete=!!data&&data.cold?.length===10&&data.fights?.length===6&&data.gates?.errors===true&&data.settleMs===0&&data.sourceHashes?.['puppets.js']===(kind==='control'?controlHash:variantHash);
 if(!complete||r.error||r.signal||r.status!==0||(kind==='flush8'&&Object.values(data.gates).some(v=>v!==true)))failed=true;
 const row={run,kind,exitCode:r.status,complete,error:r.error?.message,browser:data?.browser,gates:data?.gates,cold:data?.cold,fights:data?.fights?.map(({raw,...x})=>x)};report.runs.push(row);console.log('RWB_FLUSH_RUN '+JSON.stringify(row));console.log('::endgroup::');
}
if(new Set(report.runs.map(r=>r.browser)).size!==1)failed=true;
report.experimentalThresholdsPassed=!failed;fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify(report,null,2)+'\n');console.log('RWB_FLUSH_REPORT '+JSON.stringify(report));if(failed)process.exitCode=1;
