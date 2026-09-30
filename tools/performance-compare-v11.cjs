'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os');
const root=path.resolve(__dirname,'..'),baseline=path.resolve(process.argv[2]||''),out=path.join(root,'docs/review/v11/ci-performance');fs.mkdirSync(out,{recursive:true});
const commit=dir=>cp.execFileSync('git',['rev-parse','HEAD'],{cwd:dir,encoding:'utf8'}).trim();
if(commit(baseline)!=='816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc')throw new Error('Performance baseline must be the verified live 1.0 commit');
const report={method:'Three paired serial baseline/candidate runs on this same GitHub runner, same profiler/browser/viewport/settings. Baseline failures are measurements; candidate failures fail this job. Cloud evidence only, never substituted for the separate same-Mac gate.',candidate:commit(root),baseline:commit(baseline),machine:{platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,cpuCount:os.cpus().length},runs:[]};
let failed=false;
for(let run=1;run<=3;run++)for(const kind of (run%2?['baseline','candidate']:['candidate','baseline'])){
 const dir=kind==='baseline'?baseline:root,file=path.join(out,kind+'-'+run+'.json');console.log('::group::'+kind+' run '+run);
 const r=cp.spawnSync(process.execPath,['tools/performance-v11.cjs',dir,file,...(kind==='baseline'?['--baseline']:[])],{cwd:root,env:process.env,encoding:'utf8',maxBuffer:16*1024*1024,timeout:10*60*1000});
 process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
 let data=null;try{data=JSON.parse(fs.readFileSync(file,'utf8'));}catch(_){}
 const complete=!!data&&data.cold?.length===10&&data.fights?.length===6&&data.gates?.errors===true;
 const valid=complete&&data.commit===commit(dir);
 if(!valid||r.error||r.signal||(kind==='candidate'&&r.status!==0))failed=true;
 const row={run,kind,exitCode:r.status,error:r.error?.message,complete:valid,browser:data?.browser,gates:data?.gates,cold:data?.cold,fights:data?.fights.map(({raw,...x})=>x)};
 report.runs.push(row);console.log('RWB_PAIRED_RUN '+JSON.stringify(row));console.log('::endgroup::');
}
const browsers=new Set(report.runs.map(r=>r.browser));if(browsers.size!==1||report.runs.length!==6)failed=true;
report.passed=!failed;fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify(report,null,2)+'\n');console.log('RWB_PAIRED_REPORT '+JSON.stringify(report));if(failed)process.exitCode=1;
