'use strict';
// Source selection and output-only redirection; product sources are never rewritten.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
if(!process.env.RWB_READINESS_CONFIG)throw Error('Run tools/readiness-v11/run.cjs; a validated source configuration is required.');
const config=JSON.parse(fs.readFileSync(process.env.RWB_READINESS_CONFIG,'utf8'));
const root=config.candidateRoot,harnessRoot=__dirname,outputRoot=config.outputRoot;
const control=name=>path.join(config.controlRuntimeDir,name),candidate=name=>path.join(root,'js',name);
const originalRead=fs.readFileSync,originalWrite=fs.writeFileSync,reads=new Map(),writes=[];
const inside=(file,dir)=>file===dir||file.startsWith(dir+path.sep);
function record(file,data){
 const p=path.resolve(file);let expected;
 if(inside(p,path.join(root,'js')))expected=config.candidateFiles[path.relative(root,p)];
 else if(inside(p,config.controlRuntimeDir))expected=config.control.sourceSha256[path.basename(p)];
 else return;
 const sha256=crypto.createHash('sha256').update(data).digest('hex');
 if(!expected||expected!==sha256)throw Error('Runtime differs from validated snapshot: '+p);
 const prev=reads.get(p);if(prev&&prev.sha256!==sha256)throw Error('Runtime changed during harness: '+p);
 reads.set(p,{path:p,sha256,reads:(prev?.reads||0)+1});
}
fs.readFileSync=function(file,...args){const data=originalRead.call(this,file,...args);if(typeof file==='string')record(file,data);return data;};
fs.writeFileSync=function(file,...args){
 if(typeof file==='string'){
  const requested=path.resolve(file);
  if(inside(requested,harnessRoot)){
   if(/\.(?:cjs|js|md)$/.test(requested))throw Error('Refusing to overwrite harness source: '+requested);
   const actual=path.join(outputRoot,path.relative(harnessRoot,requested));
   fs.mkdirSync(path.dirname(actual),{recursive:true});writes.push({requested,actual});return originalWrite.call(this,actual,...args);
  }
  if(inside(requested,root)&&!inside(requested,outputRoot))throw Error('Refusing to write outside readiness output: '+requested);
 }
 return originalWrite.call(this,file,...args);
};
function runtime(variant,name){return fs.readFileSync(variant==='control'?control(name):candidate(name),'utf8');}
process.on('exit',()=>{
 if(process.env.RUNTIME_TRACE){
  const trace={candidateRoot:root,control:config.control,method:'Observed direct candidate source reads and exact-hash validated control snapshots. Only generated harness outputs are redirected.',reads:[...reads.values()],outputWrites:writes};
  originalWrite.call(fs,process.env.RUNTIME_TRACE,JSON.stringify(trace,null,2)+'\n');
 }
});
module.exports={root,runtime,control,candidate};
