'use strict';
// Pure CI-only matched comparison policy. No browser, files, clocks or mutations.
const BASELINE_COMMIT='816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc';
const TIMING_GATES=Object.freeze(['cold','fights','audioFights']);
const FUNCTIONAL_GATES=Object.freeze(['errors','musicConfigured']);
const KNOWN_GATES=Object.freeze([...TIMING_GATES,...FUNCTIONAL_GATES]);
const EXPECTED_ORDER=Object.freeze([[1,'baseline'],[1,'candidate'],[2,'candidate'],[2,'baseline'],[3,'baseline'],[3,'candidate']].map(Object.freeze));
const fullSha=value=>typeof value==='string'&&/^[0-9a-f]{40}$/.test(value);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const integer=value=>Number.isSafeInteger(value);
const text=value=>typeof value==='string'&&value.trim().length>0;
const key=(stage,music)=>stage+':'+(music?'on':'off');
const cells=stages=>stages.flatMap(stage=>[false,true].map(music=>({stage,music,key:key(stage,music)})));
const COLD_CELLS=cells([1,2,3,4,5]),FIGHT_CELLS=cells([1,3,5]);
const median3=values=>[...values].sort((a,b)=>a-b)[1];
// Compare the exact decimal values present in the report. An epsilon would
// silently relax the 0.3 rule; raw subtraction rejects e.g. 60.1 -> 59.8.
function decimal(value){const [mantissa,exponent='0']=String(value).toLowerCase().split('e'),parts=mantissa.split('.');return {n:BigInt(parts.join('')),scale:(parts[1]?.length||0)-Number(exponent)};}
function fpsWithinLimit(candidate,baseline){const c=decimal(candidate),b=decimal(baseline),scale=Math.max(c.scale,b.scale,1),at=x=>x.n*10n**BigInt(scale-x.scale);return at(c)+3n*10n**BigInt(scale-1)>=at(b);}
function fpsLimitString(baseline){const b=decimal(baseline),scale=Math.max(b.scale,1),n=b.n*10n**BigInt(scale-b.scale)-3n*10n**BigInt(scale-1),sign=n<0n?'-':'',digits=String(n<0n?-n:n).padStart(scale+1,'0'),fraction=digits.slice(-scale).replace(/0+$/,'');return sign+digits.slice(0,-scale)+(fraction?'.'+fraction:'');}
function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(record(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value);}
function copy(value,seen=new Set(),depth=0){
 if(depth>100)return '[diagnostic nesting truncated]';
 if(value===null||typeof value!=='object')return value;
 if(seen.has(value))return '[circular diagnostic value]';seen.add(value);
 const out=Array.isArray(value)?value.map(v=>copy(v,seen,depth+1)):Object.fromEntries(Object.keys(value).map(k=>[k,copy(value[k],seen,depth+1)]));seen.delete(value);return out;
}
function evaluate(report){
 const failures=[],grids={cold:[],fights:[],audio:[]};
 const fail=(scope,code,path,message,actual)=>failures.push({scope,code,path,message,...(actual===undefined?{}:{actual:typeof actual==='number'&&!Number.isFinite(actual)?String(actual):copy(actual)})});
 const bad=(code,path,message,actual)=>fail('validation',code,path,message,actual);
 const diagnostics={absoluteTimingOutcomesBlocking:false,functionalGateNames:[...FUNCTIONAL_GATES],timingGateNames:[...TIMING_GATES],baseline:copy(report?.baseline),candidate:copy(report?.candidate),machine:copy(report?.machine),runs:Array.isArray(report?.runs)?report.runs.map(r=>copy(r)):[]};
 const result=(valid,passed,gates)=>({valid,passed,failures,grids,gates,policy:{baselineCommit:BASELINE_COMMIT,runOrder:EXPECTED_ORDER.map(([run,kind])=>({run,kind})),runsPerKind:3,settleMs:0,fpsTolerance:0.3,over33:'candidate sum across three runs <= baseline sum for every cell',cold:'candidate median across three runs strictly < 400 ms for every cell',absoluteOutcomes:'Only cold, fights and audioFights timing gates are diagnostic; errors and musicConfigured must be true. Every unknown, missing or malformed gate is invalid.',music:'Every musicEnabled configuration must match the requested row.music. Actual playback fields are required boolean observations, not readiness conditions; inherited functional audio checks remain separate.'},diagnostics});
 if(!record(report)){bad('report-shape','$','Report must be a plain object');return result(false,false,{validity:false,cold:null,fights:null,audio:null});}
 const visiting=new Set();
 function dataTree(value,path,depth=0){if(depth>100){bad('data-depth',path,'Report nesting exceeds the supported JSON data depth');return;}if(value===null||typeof value==='string'||typeof value==='boolean')return;if(typeof value==='number'){if(!Number.isFinite(value))bad('non-finite-number',path,'Every numeric report value must be finite',value);return;}if(!Array.isArray(value)&&!record(value)){bad('data-type',path,'Report values must be JSON-compatible data',typeof value);return;}if(visiting.has(value)){bad('data-cycle',path,'Report must not contain circular references');return;}visiting.add(value);if(Array.isArray(value)){for(let i=0;i<value.length;i++)dataTree(value[i],path+'['+i+']',depth+1);}else for(const name of Object.keys(value))dataTree(value[name],path+'.'+name,depth+1);visiting.delete(value);}
 dataTree(report,'$');if(failures.length)return result(false,false,{validity:false,cold:null,fights:null,audio:null});
 if(report.baseline!==BASELINE_COMMIT)bad('baseline-identity','baseline','Baseline must equal the full verified live commit',report.baseline);
 if(!fullSha(report.candidate)||report.candidate===BASELINE_COMMIT)bad('candidate-identity','candidate','Candidate must be a distinct full lowercase 40-character commit SHA',report.candidate);
 if(report.settleMs!==0)bad('settle','settleMs','Immediate sampling requires settleMs exactly zero',report.settleMs);
 function checkMachine(machine,path){if(!record(machine)){bad('machine',path,'Machine metadata must be an object');return false;}let okay=true;for(const name of ['platform','arch','cpu'])if(!text(machine[name])){bad('machine',path+'.'+name,'Machine field must be a nonempty string',machine[name]);okay=false;}if(!integer(machine.cpuCount)||machine.cpuCount<1){bad('machine',path+'.cpuCount','CPU count must be a positive safe integer',machine.cpuCount);okay=false;}return okay;}
 checkMachine(report.machine,'machine');
 if(Object.hasOwn(report,'browser')&&!text(report.browser))bad('browser','browser','Optional report browser must be a nonempty string',report.browser);
 if(!Array.isArray(report.runs)){bad('runs-shape','runs','Runs must be an array');return result(false,false,{validity:false,cold:null,fights:null,audio:null});}
 if(report.runs.length!==6)bad('run-count','runs','Exactly six serial runs are required',report.runs.length);
 const seenRuns=new Set(),browsers=new Set();
 function checkRows(rows,path,expected,phase){
  if(!Array.isArray(rows)){bad('cells-shape',path,'Required measurement rows must be an array');return;}
  if(rows.length!==expected.length)bad('cell-count',path,'Exactly '+expected.length+' measurement cells are required',rows.length);
  const allowed=new Set(expected.map(c=>c.key)),seen=new Set();
  rows.forEach((row,index)=>{const p=path+'['+index+']';if(!record(row)){bad('cell-shape',p,'Measurement cell must be a plain object');return;}
   if(!integer(row.stage)||typeof row.music!=='boolean'){bad('cell-identity',p,'Stage must be an integer and music must be an explicit boolean',{stage:row.stage,music:row.music});}
   else{const id=key(row.stage,row.music);if(!allowed.has(id))bad('unexpected-cell',p,'Unexpected stage/music cell',id);if(seen.has(id))bad('duplicate-cell',p,'Duplicate stage/music cell',id);seen.add(id);}
   if(typeof row.musicEnabled!=='boolean'||row.musicEnabled!==row.music)bad('music-configuration',p+'.musicEnabled','Configured musicEnabled must match the requested music boolean',row.musicEnabled);
   // Audio startup is asynchronous; these observations must not move the cold
   // sampling clock or introduce a playback warmup into the timing fixture.
   for(const field of phase==='cold'?['musicPlaying']:['musicPlayingStart','musicPlayingEnd'])if(typeof row[field]!=='boolean')bad('music-playback',p+'.'+field,'Actual playback observation must be an explicit boolean',row[field]);
   if(phase==='cold'){if(!finite(row.enterMs)||row.enterMs<0)bad('cold-number',p+'.enterMs','Cold entry time must be finite and nonnegative',row.enterMs);}
   else{const wave=phase==='audio'?5:3;if(row.wave!==wave)bad('wave',p+'.wave','Fight wave must be exactly '+wave,row.wave);if(!finite(row.fps)||row.fps<=0)bad('fps-number',p+'.fps','FPS must be finite and positive',row.fps);if(!integer(row.frames)||row.frames<1)bad('frame-number',p+'.frames','Frames must be a positive safe integer',row.frames);if(!integer(row.over33)||row.over33<0||row.over33>row.frames)bad('over33-number',p+'.over33','over33 must be a nonnegative safe integer no larger than frames',row.over33);}
  });
  for(const id of allowed)if(!seen.has(id))bad('missing-cell',path,'Missing required stage/music cell',id);
 }
 report.runs.forEach((run,index)=>{
  const p='runs['+index+']';if(!record(run)){bad('run-shape',p,'Run must be a plain object');return;}
  const id=run.kind+':'+run.run;if(seenRuns.has(id))bad('duplicate-run',p,'Duplicate kind/run identity',id);seenRuns.add(id);
  const expected=EXPECTED_ORDER[index];if(!expected||run.run!==expected[0]||run.kind!==expected[1])bad('run-order',p,'Runs must use the exact alternating serial order', {run:run.run,kind:run.kind});
  const expectedCommit=run.kind==='baseline'?report.baseline:run.kind==='candidate'?report.candidate:null;
  if(!fullSha(run.commit)||run.commit!==expectedCommit)bad('run-identity',p+'.commit','Run commit must equal its declared full baseline/candidate identity',run.commit);
  if(run.complete!==true)bad('incomplete-run',p+'.complete','Run must explicitly be complete',run.complete);
  if(run.exitCode!==0)bad('process-exit',p+'.exitCode','Run must exit with code zero',run.exitCode);
  if(run.signal!==null)bad('process-signal',p+'.signal','Run signal must explicitly be null',run.signal);
  if(run.error!==null)bad('process-error',p+'.error','Run error must explicitly be null',run.error);
  if(run.settleMs!==0)bad('settle',p+'.settleMs','Every run must sample immediately with settleMs zero',run.settleMs);
  if(!text(run.browser))bad('browser',p+'.browser','Run browser must be a nonempty version string',run.browser);else{browsers.add(run.browser);if(Object.hasOwn(report,'browser')&&run.browser!==report.browser)bad('browser-mismatch',p+'.browser','Run browser differs from report browser',run.browser);}
  if(Object.hasOwn(run,'machine')){checkMachine(run.machine,p+'.machine');if(stable(run.machine)!==stable(report.machine))bad('machine-mismatch',p+'.machine','Run machine differs from the common machine metadata');}
  if(!record(run.gates))bad('gates-shape',p+'.gates','Gates must be an object with the exact known schema');else{
   // Explicit allowlisting prevents a newly added functional failure from
   // silently becoming an advisory timing result, regardless of its value.
   for(const name of Reflect.ownKeys(run.gates))if(!KNOWN_GATES.includes(name))bad('unknown-gate',p+'.gates.'+String(name),'Unknown gates cannot be treated as timing diagnostics',String(name));
   for(const name of KNOWN_GATES)if(!Object.hasOwn(run.gates,name)||typeof run.gates[name]!=='boolean')bad('gate-type',p+'.gates.'+name,'Every known gate must be present as an own boolean property',run.gates[name]);
   if(run.gates.musicConfigured!==true)bad('music-configured-gate',p+'.gates.musicConfigured','The functional configured-music gate must pass',run.gates.musicConfigured);
   if(run.gates.errors!==true)bad('reported-errors-gate',p+'.gates.errors','The error gate must pass',run.gates.errors);
  }
  if(!Array.isArray(run.reportedErrors)||run.reportedErrors.length!==0)bad('reported-errors',p+'.reportedErrors','reportedErrors must explicitly be an empty array',run.reportedErrors);
  checkRows(run.cold,p+'.cold',COLD_CELLS,'cold');checkRows(run.fights,p+'.fights',FIGHT_CELLS,'fight');checkRows(run.audioFights,p+'.audioFights',[{stage:4,music:true,key:key(4,true)}],'audio');
 });
 for(const [run,kind]of EXPECTED_ORDER)if(!seenRuns.has(kind+':'+run))bad('missing-run','runs','Missing required run',kind+':'+run);
 if(browsers.size!==1)bad('browser-consistency','runs','All six runs must use exactly the same nonempty browser version',[...browsers]);
 if(failures.length)return result(false,false,{validity:false,cold:null,fights:null,audio:null});
 const sampleRows=(kind,field,cell)=>report.runs.filter(r=>r.kind===kind).map(r=>({...copy(r[field].find(row=>row.stage===cell.stage&&row.music===cell.music)),run:r.run}));
 for(const cell of COLD_CELLS){const baselineSamples=sampleRows('baseline','cold',cell),candidateSamples=sampleRows('candidate','cold',cell),baselineMedian=median3(baselineSamples.map(r=>r.enterMs)),candidateMedian=median3(candidateSamples.map(r=>r.enterMs)),passed=candidateMedian<400;const row={...cell,baselineSamples,candidateSamples,median:{baseline:baselineMedian,candidate:candidateMedian},limitExclusive:400,passed};grids.cold.push(row);if(!passed)fail('policy','cold-median','cold.'+cell.key,'Candidate median cold entry must be strictly below 400 ms',candidateMedian);}
 function fightCell(cell,field){
  const baselineSamples=sampleRows('baseline',field,cell),candidateSamples=sampleRows('candidate',field,cell),baselineMedian=median3(baselineSamples.map(r=>r.fps)),candidateMedian=median3(candidateSamples.map(r=>r.fps));
  const totals=rows=>({frames:rows.reduce((n,r)=>n+r.frames,0),over33:rows.reduce((n,r)=>n+r.over33,0)}),baselineTotals=totals(baselineSamples),candidateTotals=totals(candidateSamples);
  // Per-cell sums must remain exactly representable. Do not accept overflow.
  if(!integer(baselineTotals.frames)||!integer(candidateTotals.frames)||!integer(baselineTotals.over33)||!integer(candidateTotals.over33)){bad('aggregate-overflow',field+'.'+cell.key,'Three-run frame totals exceed safe integer range');return null;}
  const fpsPassed=fpsWithinLimit(candidateMedian,baselineMedian),over33Passed=candidateTotals.over33<=baselineTotals.over33;
  const row={...cell,source:field,wave:field==='audioFights'?5:3,baselineSamples,candidateSamples,median:{baselineFps:baselineMedian,candidateFps:candidateMedian},fpsRule:{tolerance:0.3,minimumCandidateFpsExact:fpsLimitString(baselineMedian),comparison:'exact decimal candidate + 0.3 >= baseline',passed:fpsPassed},totals:{baseline:baselineTotals,candidate:candidateTotals},over33Passed,passed:fpsPassed&&over33Passed};
  if(!fpsPassed)fail('policy','fps-median',field+'.'+cell.key,'Candidate median FPS is more than 0.3 below live',{baseline:baselineMedian,candidate:candidateMedian});
  if(!over33Passed)fail('policy','over33-total',field+'.'+cell.key,'Candidate total frames over 33 ms exceeds live',{baseline:baselineTotals.over33,candidate:candidateTotals.over33});
  return row;
 }
 for(const cell of FIGHT_CELLS){const row=fightCell(cell,'fights');if(row)grids.fights.push(row);}
 const extra=fightCell({stage:4,music:true,key:key(4,true)},'audioFights');
 grids.audio=[grids.fights.find(r=>r.stage===1&&r.music===true),extra,grids.fights.find(r=>r.stage===5&&r.music===true)].filter(Boolean).map(r=>copy(r));
 const valid=!failures.some(f=>f.scope==='validation'),gates={validity:valid,cold:grids.cold.every(r=>r.passed),fights:grids.fights.length===6&&grids.fights.every(r=>r.passed),audio:grids.audio.length===3&&grids.audio.every(r=>r.passed)};
 return result(valid,valid&&gates.cold&&gates.fights&&gates.audio,gates);
}
module.exports={evaluate,BASELINE_COMMIT,EXPECTED_ORDER};
