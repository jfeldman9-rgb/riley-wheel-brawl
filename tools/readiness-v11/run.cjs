#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('node:assert/strict');
const {failureText}=require('./report.cjs');
const harnessRoot=__dirname,frozen=JSON.parse(fs.readFileSync(path.join(harnessRoot,'control.json'),'utf8'));
const options={};for(const arg of process.argv.slice(2)){if(arg==='--help'||arg==='--validate-only')options[arg.slice(2)]=true;else{const m=/^--(candidate-root|control-root|control-ref|out)=(.+)$/.exec(arg);if(!m)throw Error('Unknown argument: '+arg);if(options[m[1]])throw Error('Duplicate argument: '+arg);options[m[1]]=m[2];}}
if(options.help){console.log('Usage: node tools/readiness-v11/run.cjs [--candidate-root=.] (--control-root=../control | --control-ref=<full SHA>) [--out=docs/review/v11/readiness] [--validate-only]\nThe exact frozen four-file control hashes are mandatory. --control-ref reads local Git objects in candidate-root; no fetch or remote action. --validate-only prints source validation without writing outputs or running suites. Relative paths resolve from the current working directory. Default output: <candidate-root>/docs/review/v11/readiness. Suites run serially.');process.exit(0);}
const root=path.resolve(options['candidate-root']||path.join(harnessRoot,'../..'));
const outputRoot=path.resolve(options.out||process.env.RWB_READINESS_OUT||path.join(root,'docs/review/v11/readiness'));
if(Boolean(options['control-root'])===Boolean(options['control-ref']))throw Error('Specify exactly one of --control-root or --control-ref.');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const git=(cwd,args)=>cp.execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
const candidateHead=git(root,['rev-parse','HEAD']),candidateStatus=git(root,['status','--porcelain']);
const controlRoot=options['control-root']?path.resolve(options['control-root']):root;
const requestedRef=options['control-ref']||null;
if(requestedRef&&!/^[0-9a-f]{40}$/.test(requestedRef))throw Error('--control-ref must be a full 40-character commit SHA.');
const actualReference=requestedRef?git(root,['rev-parse',requestedRef+'^{commit}']):git(controlRoot,['rev-parse','HEAD']);
if(requestedRef&&requestedRef!==actualReference)throw Error('Control reference did not resolve to its exact requested commit.');
const bytes={},sourceSha256={};
for(const [name,expected]of Object.entries(frozen.sourceSha256)){
 const data=requestedRef?cp.execFileSync('git',['show',actualReference+':js/'+name],{cwd:root,maxBuffer:16*1024*1024}):fs.readFileSync(path.join(controlRoot,'js',name));
 bytes[name]=data;sourceSha256[name]=hash(data);assert.equal(sourceSha256[name],expected,'Frozen control mismatch: '+name);
}
const control={expectedReference:frozen.expectedReference,selection:requestedRef?'git-reference':'working-tree-root',sourceRoot:controlRoot,requestedReference:requestedRef,actualReference,actualHeadMatchesExpectedReference:actualReference===frozen.expectedReference,workingTreeStatus:requestedRef?null:git(controlRoot,['status','--porcelain']),sourceSha256,exactFrozenSourceHashes:true,identityNote:frozen.identityNote};
const validation={candidateRoot:root,candidateHead,candidateStatus,outputRoot,control};
if(options['validate-only']){console.log(JSON.stringify(validation,null,2));process.exit(0);}
const inside=(file,dir)=>file===dir||file.startsWith(dir+path.sep);
if(inside(outputRoot,harnessRoot)||inside(outputRoot,path.join(root,'js'))||outputRoot===root||inside(root,outputRoot))throw Error('Readiness output must not overlap source roots.');
if(fs.existsSync(outputRoot))throw Error('Readiness output already exists; choose a fresh --out directory to preserve prior evidence: '+outputRoot);
function treeHashes(dir,base=dir,result={}){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,entry.name);if(entry.isDirectory())treeHashes(f,base,result);else if(entry.isFile())result[path.relative(base,f)]=hash(fs.readFileSync(f));}return result;}
function candidateHashes(){const result={};for(const folder of ['js','assets']){const dir=path.join(root,folder);for(const [file,digest]of Object.entries(treeHashes(dir)))result[path.join(folder,file)]=digest;}for(const file of ['tools/soak.cjs','tools/pose-preemption-v11.cjs'])result[file]=hash(fs.readFileSync(path.join(root,file)));return result;}
const candidateFiles=candidateHashes(),harnessFiles=treeHashes(harnessRoot);
fs.mkdirSync(path.dirname(outputRoot),{recursive:true});fs.mkdirSync(outputRoot);const controlRuntimeDir=path.join(outputRoot,'control-runtime');fs.mkdirSync(controlRuntimeDir,{recursive:true});for(const [name,data]of Object.entries(bytes))fs.writeFileSync(path.join(controlRuntimeDir,name),data);
for(const dir of ['reports','pool','queue','background/reports'])fs.mkdirSync(path.join(outputRoot,dir),{recursive:true});
const config={...validation,controlRuntimeDir,candidateFiles,harnessFiles};const configPath=path.join(outputRoot,'config.json');fs.writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
const runStartedUtc=new Date().toISOString();
fs.writeFileSync(path.join(outputRoot,'SUMMARY.json'),JSON.stringify({allPassed:false,state:'running',runStartedUtc,candidateHead,control},null,2)+'\n');
console.log('READINESS_SOURCES '+JSON.stringify({candidateHead,candidateSourceSha256:Object.fromEntries(Object.keys(frozen.sourceSha256).map(name=>[name,candidateFiles['js/'+name]])),control}));
const tests=[
 ['queue','queue/check-queue.cjs','queue/queue-test.log',['performance.js','puppets.js']],
 ['bitmap','queue/check-lifecycle.cjs','queue/lifecycle-test.log',['performance.js','puppets.js']],
 ['pool-pixel','pool/check-pixels.cjs','pool/pixel-test.log',['performance.js','puppets.js']],
 ['pool-lifecycle','pool/check-lifecycle.cjs','pool/lifecycle-test.log',['performance.js','puppets.js']],
 ['preemption',null,'reports/preemption.log',['performance.js','puppets.js']],
 ['background-control','background/check-control-flow.cjs','background/reports/control-flow.log',['performance.js','stages.js','scenes.js']],
 ['background-pixel','background/check-decoded-pixels.cjs','background/reports/decoded-pixels.log',['performance.js','stages.js','scenes.js']],
 ['queue-pixel','queue/check-pixels.cjs','queue/pixel-test.log',['performance.js','puppets.js']]
];
const results=[];let failed=false;
for(const [name,script,log,requiredSources]of tests){
 const trace=path.join(outputRoot,'reports',name+'-source-reads.json'),logFile=path.join(outputRoot,log);
 const command=script?[path.join(harnessRoot,script)]:['--require='+path.join(harnessRoot,'runtime.cjs'),path.join(root,'tools/pose-preemption-v11.cjs'),'--out='+path.join(outputRoot,'reports/preemption.json')];
 const env={...process.env,RWB_READINESS_CONFIG:configPath,RUNTIME_TRACE:trace};for(const k of Object.keys(env))if(k.startsWith('RWB_')&&!['RWB_READINESS_CONFIG','RWB_READINESS_OUT'].includes(k))delete env[k];
 const fd=fs.openSync(logFile,'w');const startedUtc=new Date().toISOString();const child=cp.spawnSync(process.execPath,command,{cwd:root,env,stdio:['ignore',fd,fd]});fs.closeSync(fd);
 const row={name,command:[process.execPath,...command],startedUtc,finishedUtc:new Date().toISOString(),exitCode:child.status,signal:child.signal,error:child.error?.message||null,log:logFile,sourceTrace:trace,requiredSources};results.push(row);console.log(JSON.stringify(row));
 fs.writeFileSync(path.join(outputRoot,'execution.json'),JSON.stringify({candidateHead,control,serial:true,results},null,2)+'\n');
 if(child.status!==0){failed=true;console.error(failureText(row,fs.readFileSync(logFile,'utf8')));fs.writeFileSync(path.join(outputRoot,'SUMMARY.json'),JSON.stringify({allPassed:false,state:'failed',runStartedUtc,candidateHead,control,results},null,2)+'\n');break;}
 const observed=JSON.parse(fs.readFileSync(trace,'utf8'));
 for(const file of requiredSources)assert.ok(observed.reads.some(r=>r.path===path.join(root,'js',file)&&r.sha256===candidateFiles[path.join('js',file)]),'Missing exact candidate source read: '+name+'/'+file);
}
const afterFiles=candidateHashes();assert.deepEqual(afterFiles,candidateFiles,'Tested candidate runtime/assets or unchanged soak/preemption tools changed during suite');assert.deepEqual(treeHashes(harnessRoot),harnessFiles,'Readiness harness changed during suite');
fs.writeFileSync(path.join(outputRoot,'source-integrity.json'),JSON.stringify({candidateRoot:root,candidateHeadBefore:candidateHead,candidateHeadAfter:git(root,['rev-parse','HEAD']),candidateStatusBefore:candidateStatus,candidateStatusAfter:git(root,['status','--porcelain']),allTestedSourceHashesUnchanged:true,scope:['js/**','assets/**','tools/soak.cjs','tools/pose-preemption-v11.cjs','tools/readiness-v11/**'],candidateFiles,harnessFiles,control},null,2)+'\n');
if(failed){process.exitCode=1;console.error('Readiness suite stopped at a failed or interrupted check; retained its log and execution result.');}else{
 const {verify}=require('./verify.cjs');const summary=verify(outputRoot,config,results);fs.writeFileSync(path.join(outputRoot,'SUMMARY.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
}
