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
