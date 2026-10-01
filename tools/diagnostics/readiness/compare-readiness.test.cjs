'use strict';
const assert=require('node:assert/strict');
const {validateShape,retainRaw,CONTROL_COMMIT,CONTROL_TREE,SCOPE,DIAGNOSTICS}=require('./compare-readiness.cjs');
const hash='0'.repeat(64);
const valid=()=>({version:1,scope:SCOPE,readiness:true,immediate:true,pairs:3,
  control:{root:'/frozen/control',commit:CONTROL_COMMIT,tree:CONTROL_TREE,files:{'js/main.js':hash}},
  candidate:{root:'/frozen/candidate',commit:'1'.repeat(40),tree:'2'.repeat(40),files:{'js/main.js':'1'.repeat(64)}},
  diagnostics:Object.fromEntries(DIAGNOSTICS.map(f=>[f,hash]))});
assert.equal(validateShape(valid()),true);
for(const change of [
 m=>m.control.commit='fbcf',m=>m.control.commit='fbcf2a3fddb300a8b2759c09aa59c406f6d4e6b1',
 m=>m.candidate.commit='future',m=>m.candidate.root=m.control.root,
 m=>m.candidate.files={...m.control.files},m=>m.readiness=false,m=>m.immediate=false,
 m=>m.pairs=2,m=>m.control.files['../secret']=hash,m=>m.diagnostics={}
]){const m=valid();change(m);assert.throws(()=>validateShape(m));}
console.log('PASS manifest shape, exact reviewed hash, complete identities, meaningful runtime diff, fixed comparison configuration and path rejection; browserRuns=0');

const crypto=require('node:crypto'),zlib=require('node:zlib');
const raw=Buffer.from(JSON.stringify({raw:{gaps:[16.7,34],rafTimes:[1,17.7,51.7],frameWork:[{t:1,drawMs:3.2}],readiness:{samples:[{rafTime:1}],demands:[{readyMs:null}]}},errors:['partial failure']})+'\n');
const lines=[],meta=retainRaw('partial.json',raw,line=>lines.push(line));
assert.equal(lines[0].startsWith('RWB_PERF_BEGIN '),true);assert.equal(lines.at(-1),'RWB_PERF_END partial.json');
const decoded=zlib.gunzipSync(Buffer.from(lines.filter(x=>x.startsWith('RWB_PERF_DATA ')).map(x=>x.slice(14)).join(''),'base64'));
assert.deepEqual(decoded,raw);assert.equal(meta.bytes,raw.length);assert.equal(meta.sha256,crypto.createHash('sha256').update(decoded).digest('hex'));
assert.throws(()=>retainRaw('oversize.json',Buffer.alloc(16*1024*1024+1),()=>{throw Error('must not emit');}),/exceeds 16 MiB/);
console.log('PASS exact complete arrays and failing-report gzip log roundtrip, byte count, SHA-256 integrity and 16 MiB limit; browserRuns=0');

const driver=require('node:fs').readFileSync(require('node:path').join(__dirname,'compare-readiness.cjs'),'utf8');
assert.ok(driver.indexOf('retained=retainRaw(path.basename(file),bytes)')<driver.indexOf("if(child.error||child.signal||child.status!==0)"));
assert.ok(driver.includes("RWB_READINESS_REPORT "));
console.log('PASS partial raw retention precedes execution-failure throw and final summary framing is present');

const {validateReport}=require('./compare-readiness.cjs');
const reportCommit='a'.repeat(40),clone=value=>JSON.parse(JSON.stringify(value));
const observer=()=>({drawCalls:0,renderedDrawCalls:0,fallbackDrawCalls:0,fallbackMissDrawCalls:0,unavailableRigDrawCalls:0,uniqueDemandedKeys:0,demandAttempts:0,touchEntryCalls:0,successfulTouchCalls:0,acceptedTouchEnqueues:0,fallbackDrawFraction:null,demands:[],queue:{},observerTiming:{},samples:[{phase:'installed',atMs:0,sinceInstallMs:0,observerCostMs:0,rafTime:null,counts:{}}]});
function setGaps(row,gaps){
  const rafTimes=[100];for(const gap of gaps)rafTimes.push(rafTimes.at(-1)+gap);
  const sorted=[...gaps].sort((a,b)=>a-b);
  Object.assign(row,{frames:gaps.length,fps:gaps.length*1000/gaps.reduce((a,b)=>a+b,0),over33:gaps.filter(g=>g>33).length,gapsMs:{p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)},raw:{gaps,rafTimes,frameWork:rafTimes.map(t=>({t,frameMs:1,updateMs:0,drawMs:1,pumpMs:0})),readiness:observer()}});
}
function measured(){
  const report={commit:reportCommit,baseCommit:reportCommit,workingTreeDirty:false,settleMs:0,reportOnly:true,profileOnly:false,coldOnly:false,pacingStatus:'measured',browser:'Chromium fixture',readinessInstrumentation:{enabled:true,nativeVerification:{cloudChromium:'completed'}},errors:[],gates:{cold:true,fights:true,errors:true},cold:[1,2,3,4,5].flatMap(stage=>[false,true].map(music=>({stage,music,enterMs:100,initMs:80,readiness:observer()}))),fights:[1,3,5].flatMap(stage=>[false,true].map(music=>({stage,music})))};
  for(const row of report.fights)setGaps(row,Array(625).fill(16));
  return report;
}
let validationChecks=0;
function accepts(name,change=()=>{}){const r=measured();change(r);assert.equal(validateReport(r,reportCommit),true,name);validationChecks++;}
function rejects(name,change){const r=measured();change(r);assert.throws(()=>validateReport(r,reportCommit),/Invalid readiness report/,name);validationChecks++;}
accepts('complete unchanged requested-music schema');
accepts('timing-only false gates remain valid advisory measurements',r=>{r.cold[0].enterMs=400;r.gates.cold=false;setGaps(r.fights[0],[34,...Array(624).fill(16)]);r.gates.fights=false;});
accepts('cell order is not an acceptance condition',r=>{r.cold.reverse();r.fights.reverse();});
accepts('exact 33 ms is not over33; sub-59.5 remains a strict failure',r=>{setGaps(r.fights[0],Array(304).fill(33));r.gates.fights=false;});
for(const gate of ['cold','fights','errors']){
  rejects('missing '+gate,r=>delete r.gates[gate]);
  for(const value of [null,0,'false'])rejects('nonboolean '+gate,r=>r.gates[gate]=value);
}
for(const value of [true,false,null])rejects('unknown functional gate is never advisory',r=>r.gates.music=value);
rejects('errors false cannot be advisory',r=>r.gates.errors=false);
rejects('nonempty errors cannot be advisory',r=>r.errors.push('resource failure'));
rejects('missing errors array',r=>delete r.errors);
rejects('cold gate disagrees with numbers',r=>r.cold[0].enterMs=400);
rejects('fight gate disagrees with raw measurements',r=>{setGaps(r.fights[0],[34,...Array(624).fill(16)]);});
rejects('false cold gate cannot disagree with passing numbers',r=>r.gates.cold=false);
rejects('false fight gate cannot disagree with passing numbers',r=>r.gates.fights=false);
for(const phase of ['cold','fights']){
  rejects(phase+' missing cell',r=>r[phase].pop());
  rejects(phase+' duplicate instead of missing cell',r=>r[phase][1]=clone(r[phase][0]));
  rejects(phase+' extra cell',r=>r[phase].push(clone(r[phase][0])));
  rejects(phase+' unexpected stage',r=>r[phase][0].stage=6);
  rejects(phase+' nonboolean music',r=>r[phase][0].music=0);
  rejects(phase+' malformed cell',r=>r[phase][0]=null);
}
for(const field of ['enterMs','initMs'])for(const value of [null,NaN,Infinity,-1,'100'])rejects('invalid cold '+field,r=>r.cold[0][field]=value);
for(const field of ['frames','fps','over33'])for(const value of [null,NaN,-1,'1'])rejects('invalid fight '+field,r=>r.fights[0][field]=value);
for(const field of ['gaps','rafTimes','frameWork']){
  rejects('missing raw '+field,r=>delete r.fights[0].raw[field]);
  rejects('empty raw '+field,r=>r.fights[0].raw[field]=[]);
  rejects('mismatched raw '+field,r=>r.fights[0].raw[field].pop());
}
rejects('invalid gap type',r=>r.fights[0].raw.gaps[0]='16');
rejects('nonpositive gap',r=>r.fights[0].raw.gaps[0]=0);
rejects('nonfinite deep timing',r=>r.fights[0].raw.costs={draw:[NaN]});
rejects('gap/RAF interval mismatch',r=>r.fights[0].raw.gaps[0]=16.1);
rejects('frame-work timestamp mismatch',r=>r.fights[0].raw.frameWork[0].t++);
rejects('missing frame-work duration',r=>delete r.fights[0].raw.frameWork[0].pumpMs);
rejects('negative frame-work duration',r=>r.fights[0].raw.frameWork[0].drawMs=-1);
rejects('FPS mismatch',r=>r.fights[0].fps-=0.001);
rejects('over33 mismatch',r=>r.fights[0].over33++);
rejects('frames mismatch',r=>r.fights[0].frames++);
rejects('short sampling window',r=>{setGaps(r.fights[0],Array(624).fill(16));});
for(const field of ['p50','p95','max'])rejects('gap summary mismatch '+field,r=>r.fights[0].gapsMs[field]++);
rejects('missing readiness samples',r=>r.fights[0].raw.readiness.samples=[]);
rejects('malformed readiness sample',r=>r.cold[0].readiness.samples=[{}]);
rejects('missing readiness demand list',r=>delete r.cold[0].readiness.demands);
rejects('demand count mismatch',r=>r.cold[0].readiness.demandAttempts=1);
rejects('fallback fraction mismatch',r=>r.cold[0].readiness.fallbackDrawFraction=0);
rejects('wrong source commit',r=>r.commit='b'.repeat(40));
rejects('wrong base commit',r=>r.baseCommit='b'.repeat(40));
rejects('missing clean flag',r=>delete r.workingTreeDirty);
rejects('warmup not immediate',r=>r.settleMs=2000);
rejects('incomplete native verification',r=>r.readinessInstrumentation.nativeVerification.cloudChromium='running');
rejects('absent browser version',r=>r.browser=' ');
rejects('partial profile',r=>r.profileOnly=true);
assert.ok(driver.indexOf('validateReport(data,m[kind].commit);')<driver.indexOf("Object.assign(row,{status:'measured'"));
assert.ok(driver.includes('if(!report.candidateStrictGatesPassed&&!advisoryTiming)process.exitCode=1;'));
console.log('PASS '+validationChecks+' fail-closed readiness report validations; only validated cold/fights failures can be advisory; requested music labels unchanged; browserRuns=0');
