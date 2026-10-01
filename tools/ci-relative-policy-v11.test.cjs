'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluate,BASELINE_COMMIT,EXPECTED_ORDER}=require('./ci-relative-policy-v11.cjs');
const CANDIDATE='1234567890abcdef1234567890abcdef12345678';
const clone=value=>JSON.parse(JSON.stringify(value));
function fixture(){
 const cold=Array.from({length:5},(_,i)=>i+1).flatMap(stage=>[false,true].map(music=>({stage,music,enterMs:399,musicEnabled:music,musicPlaying:music})));
 const fights=[1,3,5].flatMap(stage=>[false,true].map(music=>({stage,music,wave:3,fps:60,frames:600,over33:3,musicEnabled:music,musicPlayingStart:music,musicPlayingEnd:music})));
 return {baseline:BASELINE_COMMIT,candidate:CANDIDATE,settleMs:0,machine:{platform:'linux',arch:'x64',cpu:'Shared CI CPU',cpuCount:4},runs:EXPECTED_ORDER.map(([run,kind])=>({run,kind,commit:kind==='baseline'?BASELINE_COMMIT:CANDIDATE,complete:true,exitCode:0,signal:null,error:null,browser:'Chromium/123.0.4567.8',gates:{errors:true,musicConfigured:true,cold:true,fights:true,audioFights:true},reportedErrors:[],settleMs:0,cold:clone(cold),fights:clone(fights),audioFights:[{stage:4,wave:5,music:true,fps:60,frames:600,over33:3,musicEnabled:true,musicPlayingStart:true,musicPlayingEnd:true}]}))};
}
const runs=(report,kind)=>report.runs.filter(r=>r.kind===kind);
const cell=(run,field,stage,music)=>run[field].find(r=>r.stage===stage&&r.music===music);
function invalid(name,change,code){test(name,()=>{const report=fixture();change(report);const actual=evaluate(report);assert.equal(actual.valid,false,JSON.stringify(actual.failures));assert.equal(actual.passed,false);if(code)assert.ok(actual.failures.some(f=>f.code===code),JSON.stringify(actual.failures));});}
function policyFailure(name,change,code){test(name,()=>{const report=fixture();change(report);const actual=evaluate(report);assert.equal(actual.valid,true,JSON.stringify(actual.failures));assert.equal(actual.passed,false);assert.ok(actual.failures.some(f=>f.code===code),JSON.stringify(actual.failures));});}
test('full valid set preserves all 6 runs, 10 cold cells, 6 fight cells and 3 audio coverage cells',()=>{const report=fixture(),before=clone(report),out=evaluate(report);assert.equal(out.valid,true);assert.equal(out.passed,true);assert.deepEqual(out.failures,[]);assert.equal(out.grids.cold.length,10);assert.equal(out.grids.fights.length,6);assert.deepEqual(out.grids.audio.map(r=>[r.stage,r.music,r.wave]),[[1,true,3],[4,true,5],[5,true,3]]);assert.deepEqual(out.grids.fights[0].median,{baselineFps:60,candidateFps:60});assert.deepEqual(out.grids.fights[0].totals,{baseline:{frames:1800,over33:9},candidate:{frames:1800,over33:9}});assert.deepEqual(out.diagnostics.runs,report.runs);assert.deepEqual(report,before,'evaluate does not mutate its input');out.diagnostics.runs[0].cold[0].enterMs=0;assert.equal(report.runs[0].cold[0].enterMs,399,'diagnostics do not alias input');});
test('absolute timing failures remain fully preserved and advisory on both kinds',()=>{const r=fixture();for(const run of r.runs){run.gates.cold=false;run.gates.fights=false;run.gates.audioFights=false;for(const f of [...run.fights,...run.audioFights])f.fps=51;for(const c of run.cold)c.enterMs=run.kind==='baseline'?550:399;}const out=evaluate(r);assert.equal(out.passed,true);assert.ok(out.diagnostics.runs.every(run=>run.gates.cold===false&&run.gates.fights===false&&run.gates.audioFights===false));assert.ok(out.grids.cold.every(c=>c.median.baseline===550));assert.equal(out.diagnostics.runs[0].fights[0].fps,51);});
test('FPS exact 0.3 boundary and equal over33 totals pass',()=>{const r=fixture();for(const run of runs(r,'candidate'))for(const f of [...run.fights,...run.audioFights])f.fps=59.7;assert.equal(evaluate(r).passed,true);});
test('decimal boundary 60.1 to 59.8 passes without a floating epsilon',()=>{const r=fixture();for(const run of r.runs)for(const f of [...run.fights,...run.audioFights])f.fps=run.kind==='baseline'?60.1:59.8;const out=evaluate(r);assert.equal(out.passed,true);assert.equal(out.grids.fights[0].fpsRule.minimumCandidateFpsExact,'59.8');});
policyFailure('FPS infinitesimally below boundary fails',r=>{for(const run of runs(r,'candidate'))cell(run,'fights',1,false).fps=59.699999999999996;},'fps-median');
policyFailure('audio S4 exact-rule regression fails independently',r=>{for(const run of runs(r,'candidate'))run.audioFights[0].fps=59.69;},'fps-median');
policyFailure('audio S1 existing ON cell is blocking',r=>{for(const run of runs(r,'candidate'))cell(run,'fights',1,true).fps=59;},'fps-median');
policyFailure('audio S5 existing ON cell is blocking',r=>{for(const run of runs(r,'candidate'))cell(run,'fights',5,true).over33=4;},'over33-total');
policyFailure('cold median exactly 400 fails strict boundary',r=>{for(const run of runs(r,'candidate'))cell(run,'cold',5,true).enterMs=400;},'cold-median');
test('one 401 cold outlier passes when the median is 399',()=>{const r=fixture(),a=runs(r,'candidate');[399,399,401].forEach((n,i)=>cell(a[i],'cold',5,true).enterMs=n);const out=evaluate(r);assert.equal(out.passed,true);const row=out.grids.cold.find(c=>c.stage===5&&c.music);assert.deepEqual(row.candidateSamples.map(x=>x.enterMs),[399,399,401]);assert.equal(row.median.candidate,399);});
policyFailure('two 401 cold samples fail median regardless of one fast sample',r=>{const a=runs(r,'candidate');[1,401,401].forEach((n,i)=>cell(a[i],'cold',5,true).enterMs=n);},'cold-median');
test('fight FPS uses median of all three, not minimum or last sample',()=>{const r=fixture(),a=runs(r,'candidate');[1,59.7,59.7].forEach((n,i)=>cell(a[i],'fights',3,false).fps=n);const out=evaluate(r);assert.equal(out.passed,true);assert.equal(out.grids.fights.find(c=>c.stage===3&&!c.music).median.candidateFps,59.7);});
policyFailure('one favorable FPS sample cannot hide a median regression',r=>{const a=runs(r,'candidate');[100,59,59].forEach((n,i)=>cell(a[i],'fights',3,false).fps=n);},'fps-median');
test('over33 is total across three runs, not individual worst run',()=>{const r=fixture(),a=runs(r,'candidate');[9,0,0].forEach((n,i)=>cell(a[i],'fights',3,true).over33=n);const out=evaluate(r);assert.equal(out.passed,true);assert.equal(out.grids.fights.find(c=>c.stage===3&&c.music).totals.candidate.over33,9);});
policyFailure('aggregate over33 regression is not hidden by lower median counts',r=>{const a=runs(r,'candidate');[10,0,0].forEach((n,i)=>cell(a[i],'fights',3,true).over33=n);},'over33-total');
policyFailure('audio S4 over33 totals are independently blocking',r=>{runs(r,'candidate')[0].audioFights[0].over33=4;},'over33-total');
policyFailure('improvement in another cell cannot offset a cell regression',r=>{for(const run of runs(r,'candidate')){cell(run,'fights',1,false).fps=100;cell(run,'fights',5,false).fps=59;}},'fps-median');
invalid('missing run fails',r=>r.runs.pop(),'run-count');
invalid('seventh run fails',r=>r.runs.push(clone(r.runs[0])),'run-count');
invalid('duplicate run replacing missing run fails',r=>r.runs[5]=clone(r.runs[1]),'duplicate-run');
invalid('correct runs in non-serial order fail',r=>{[r.runs[2],r.runs[3]]=[r.runs[3],r.runs[2]];},'run-order');
invalid('run number string fails',r=>r.runs[0].run='1','run-order');
invalid('wrong kind fails',r=>r.runs[0].kind='live','run-order');
for(const field of ['cold','fights','audioFights']){
 invalid(field+' missing array fails',r=>delete r.runs[0][field],'cells-shape');
 invalid(field+' missing cell fails',r=>r.runs[0][field].pop(),'cell-count');
 invalid(field+' duplicate cell fails',r=>{const a=r.runs[0][field];if(a.length===1)a.push(clone(a[0]));else a[a.length-1]=clone(a[0]);},'duplicate-cell');
 invalid(field+' shifted music fails',r=>r.runs[0][field][0].music=!r.runs[0][field][0].music);
 invalid(field+' non-boolean music fails',r=>r.runs[0][field][0].music='true','cell-identity');
 invalid(field+' wrong stage fails',r=>r.runs[0][field][0].stage=9,'unexpected-cell');
}
invalid('main fights wrong wave fails',r=>r.runs[0].fights[0].wave=5,'wave');
invalid('audio S4 wrong wave fails',r=>r.runs[0].audioFights[0].wave=3,'wave');
invalid('wrong baseline identity fails',r=>r.baseline='b'.repeat(40),'baseline-identity');
invalid('short candidate SHA fails',r=>r.candidate='1234567','candidate-identity');
invalid('candidate equal to live fails',r=>r.candidate=BASELINE_COMMIT,'candidate-identity');
invalid('run identity mismatch fails',r=>r.runs[1].commit=BASELINE_COMMIT,'run-identity');
invalid('wrong browser fails',r=>r.runs[4].browser='Chromium/other','browser-consistency');
invalid('missing browser fails',r=>delete r.runs[0].browser,'browser');
invalid('empty browser fails',r=>r.runs[0].browser=' ','browser');
invalid('report browser mismatch fails',r=>r.browser='Chromium/other','browser-mismatch');
invalid('missing machine fails',r=>delete r.machine,'machine');
invalid('bad machine count fails',r=>r.machine.cpuCount=0,'machine');
invalid('per-run machine mismatch fails',r=>r.runs[1].machine={...r.machine,cpu:'Different CPU'},'machine-mismatch');
test('matching per-run machines with reordered keys are accepted',()=>{const r=fixture();r.runs[2].machine={cpuCount:4,cpu:'Shared CI CPU',arch:'x64',platform:'linux'};assert.equal(evaluate(r).passed,true);});
invalid('nonzero global settle fails',r=>r.settleMs=2000,'settle');
invalid('missing run settle fails',r=>delete r.runs[0].settleMs,'settle');
invalid('incomplete run fails',r=>r.runs[0].complete=false,'incomplete-run');
invalid('nonzero exit fails despite complete flag',r=>r.runs[0].exitCode=1,'process-exit');
invalid('crash signal fails',r=>r.runs[0].signal='SIGKILL','process-signal');
invalid('process error fails',r=>r.runs[0].error='timeout','process-error');
invalid('missing null signal is not defaulted',r=>delete r.runs[0].signal,'process-signal');
invalid('missing null process error is not defaulted',r=>delete r.runs[0].error,'process-error');
invalid('page errors remain blocking',r=>r.runs[0].reportedErrors.push('pageerror: broken'),'reported-errors');
invalid('missing reportedErrors is not defaulted',r=>delete r.runs[0].reportedErrors,'reported-errors');
invalid('false error gate remains blocking',r=>r.runs[0].gates.errors=false,'reported-errors-gate');
invalid('missing diagnostic gate fails',r=>delete r.runs[0].gates.cold,'gate-type');
invalid('diagnostic gates must be booleans',r=>r.runs[0].gates.audioFights=null,'gate-type');
invalid('false configured-music gate remains blocking',r=>r.runs[0].gates.musicConfigured=false,'music-configured-gate');
for(const [field,playback]of [['cold','musicPlaying'],['fights','musicPlayingStart'],['fights','musicPlayingEnd'],['audioFights','musicPlayingStart'],['audioFights','musicPlayingEnd']]){
 test(field+' '+playback+' remains an observation when playback differs',()=>{const r=fixture(),c=r.runs[0][field][0];c[playback]=!c.music;const out=evaluate(r);assert.equal(out.valid,true);assert.equal(out.passed,true);assert.equal(out.diagnostics.runs[0][field][0][playback],!c.music);assert.equal(out.policy.settleMs,0);});
 invalid(field+' '+playback+' malformed observation fails',r=>r.runs[0][field][0][playback]='true','music-playback');
 invalid(field+' '+playback+' missing fails',r=>delete r.runs[0][field][0][playback],'music-playback');
}
for(const value of [NaN,Infinity,-Infinity,-1,'60',null,0])invalid('invalid FPS '+String(value),r=>r.runs[0].fights[0].fps=value);
for(const value of [NaN,Infinity,-1,'399',null])invalid('invalid cold time '+String(value),r=>r.runs[0].cold[0].enterMs=value);
for(const value of [NaN,Infinity,-1,0,1.5,'600',null,Number.MAX_SAFE_INTEGER+1])invalid('invalid frames '+String(value),r=>r.runs[0].fights[0].frames=value);
for(const value of [NaN,Infinity,-1,1.5,'3',null,601])invalid('invalid over33 '+String(value),r=>r.runs[0].fights[0].over33=value);
invalid('missing FPS never becomes zero',r=>delete r.runs[0].fights[0].fps,'fps-number');
invalid('missing cold time never becomes zero',r=>delete r.runs[0].cold[0].enterMs,'cold-number');
invalid('three-run totals overflow safe integers',r=>{for(const run of r.runs)run.fights[0].frames=Number.MAX_SAFE_INTEGER;},'aggregate-overflow');
invalid('nonfinite auxiliary numeric diagnostics fail rather than disappearing',r=>r.runs[0].fights[0].maxGap=NaN,'non-finite-number');
invalid('circular data fails closed',r=>r.machine.self=r.machine,'data-cycle');
for(const malformed of [null,undefined,[],42,'report'])test('malformed report '+String(malformed),()=>{const out=evaluate(malformed);assert.equal(out.valid,false);assert.equal(out.passed,false);});
test('row order is irrelevant but no cell is discarded',()=>{const r=fixture();for(const run of r.runs){run.cold.reverse();run.fights.reverse();}assert.equal(evaluate(r).passed,true);});
test('input can be deeply frozen',()=>{const r=fixture();function freeze(v){if(v&&typeof v==='object'){Object.freeze(v);for(const x of Object.values(v))freeze(x);}}freeze(r);assert.equal(evaluate(r).passed,true);});

test('very deep malformed diagnostics fail closed without stack overflow',()=>{const r=fixture();let v=r.machine;for(let i=0;i<10000;i++){v.deep={};v=v.deep;}const out=evaluate(r);assert.equal(out.valid,false);assert.equal(out.passed,false);assert.ok(out.failures.some(f=>f.code==='data-depth'));});
test('grid diagnostic rows do not alias nested input measurements',()=>{const r=fixture();r.runs[0].fights[0].costs={draw:{max:3}};const out=evaluate(r);assert.equal(out.passed,true);out.grids.fights[0].baselineSamples[0].costs.draw.max=99;assert.equal(r.runs[0].fights[0].costs.draw.max,3);});

test('baseline identity and serial order match the explicit approved contract',()=>{assert.equal(BASELINE_COMMIT,'816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc');assert.deepEqual(EXPECTED_ORDER,[[1,'baseline'],[1,'candidate'],[2,'candidate'],[2,'baseline'],[3,'baseline'],[3,'candidate']]);});
test('measurement extras cannot override source run attribution',()=>{const r=fixture();r.runs[0].fights[0].run=99;const out=evaluate(r);assert.equal(out.passed,true);assert.equal(out.grids.fights[0].baselineSamples[0].run,1);assert.equal(out.diagnostics.runs[0].fights[0].run,99);});

// Regression for the independent review: only the named timing booleans may
// be advisory; a future functional gate cannot enter through a wildcard.
for(const value of [false,true])for(let index=0;index<6;index++)invalid('unknown saves gate '+value+' fails on serial run '+index,r=>r.runs[index].gates.saves=value,'unknown-gate');
for(const value of [false,true,0,null,'pass'])invalid('unknown additionalFunctionalCheck '+String(value)+' fails',r=>r.runs[0].gates.additionalFunctionalCheck=value,'unknown-gate');
invalid('old music gate is not an accepted alias',r=>r.runs[0].gates.music=true,'unknown-gate');
invalid('unknown non-enumerable gate is rejected',r=>Object.defineProperty(r.runs[0].gates,'saves',{value:false,enumerable:false}),'unknown-gate');
invalid('unknown symbol gate is rejected',r=>r.runs[0].gates[Symbol('saves')]=true,'unknown-gate');
for(const name of ['cold','fights','audioFights','errors','musicConfigured']){
 invalid('missing known gate '+name+' fails',r=>delete r.runs[0].gates[name],'gate-type');
 for(const value of [null,0,'true'])invalid('malformed known gate '+name+' '+String(value)+' fails',r=>r.runs[0].gates[name]=value,'gate-type');
}
for(const field of ['cold','fights','audioFights']){
 invalid(field+' configured music mismatch fails',r=>{const c=r.runs[0][field][0];c.musicEnabled=!c.music;},'music-configuration');
 invalid(field+' missing configured music fails',r=>delete r.runs[0][field][0].musicEnabled,'music-configuration');
 invalid(field+' malformed configured music fails',r=>r.runs[0][field][0].musicEnabled='true','music-configuration');
}
test('asynchronous music startup is observed without warming or moving the cold clock',()=>{const r=fixture();for(const run of r.runs){for(const row of run.cold)row.musicPlaying=false;for(const row of [...run.fights,...run.audioFights]){row.musicPlayingStart=false;row.musicPlayingEnd=false;}}const before=clone(r),out=evaluate(r);assert.equal(out.valid,true);assert.equal(out.passed,true);assert.deepEqual(r,before);assert.ok(out.grids.cold.every(row=>row.median.candidate===399));assert.ok(out.diagnostics.runs.every(run=>run.settleMs===0&&run.gates.musicConfigured===true&&run.cold.every(row=>row.musicPlaying===false)));assert.deepEqual(out.diagnostics.functionalGateNames,['errors','musicConfigured']);assert.deepEqual(out.diagnostics.timingGateNames,['cold','fights','audioFights']);});
test('configured mismatch cannot hide behind a true summary gate and advisory timing failures',()=>{const r=fixture();for(const run of r.runs){run.gates.cold=false;run.gates.fights=false;run.gates.audioFights=false;}cell(r.runs[0],'cold',1,true).musicEnabled=false;const out=evaluate(r);assert.equal(out.valid,false);assert.equal(out.passed,false);assert.ok(out.failures.some(f=>f.code==='music-configuration'));});
