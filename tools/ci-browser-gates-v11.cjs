'use strict';
// Additive, opt-in CI classification only. The original scripts and every emitted
// measurement/assertion remain unchanged. The separate matched three-run gate is
// mandatory for timing acceptance; this wrapper only classifies these old suites.
// Usage: CI=true node --expose-gc tools/ci-browser-gates-v11.cjs
//        release-browser|audio-check --ci-timing-policy
// Direct node tools/release-browser.cjs and tools/audio-check.cjs stay strict.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict');
const SOURCES={
  'release-browser':{file:'release-browser.cjs',sha256:'4f1a135f7d9d7207ba0fac581ed0085b95c5b954adc33c8f29ad8151f74989e8'},
  'audio-check':{file:'audio-check.cjs',sha256:'a63c17aaf7d4dbdb3e47d315f7979d5d69cb2a07f62aeba2bb6efe6a1e5faea7'}
};
const RELEASE_COLD='All five cold stage enters are under 400ms';
const RELEASE_FIGHT=stage=>'Stage '+stage+' mid-fight: 60fps and zero frames >33ms';
const CAMPAIGN='Scripted full campaign: title through all stages, Callandor, joint finish, escape and credits (continues counted)';
const RELEASE_NAMES=[RELEASE_COLD,...[1,3,5].map(RELEASE_FIGHT),CAMPAIGN,'Native Enter opens the story','Native story advancement reaches Stage 1','Native Escape pauses','A second Escape resumes','Native touch tap leaves the credits','No page errors or failed resource requests'];
const AUDIO_COLD='Every stage cold enter (wave 0, fresh page, music playing) is under 400 ms';
const AUDIO_NAMES=['Before any gesture the title is silent (autoplay rule)','First key press starts the music track on the title','Loop points sit inside the decoded track','M turns the music off and saves it','M turns it back on where it left off','Narrator intro plays over the music on the Caemlyn card','Taim entrance line plays when the boss arrives','Kid lines: silent placeholder is ignored (chirp + bubble); a dropped-in riley_fire_01.mp3 plays automatically',AUDIO_COLD];
const AUDIO_ERRORS='No script errors, no console errors, no failed requests (all pages)';
const AUDIO_FIGHT=/^Stage (1|5|4) wave (3|5): ~60 fps mid-fight with music on, no frame over 34 ms \(over33 = (\d+)\)$/;
const SHA=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function requireThat(ok,message){if(!ok)throw Error(message);}
function finite(v,name,positive=false){requireThat(typeof v==='number'&&Number.isFinite(v)&&(positive?v>0:v>=0),'Missing/invalid numeric cell: '+name);}
function integer(v,name,positive=false){finite(v,name,positive);requireThat(Number.isSafeInteger(v),'Invalid integer cell: '+name);}
function object(v,name){requireThat(v&&typeof v==='object'&&!Array.isArray(v),'Missing/invalid object: '+name);}
function array(v,name,count){requireThat(Array.isArray(v)&&(count===undefined||v.length===count),'Missing/incomplete array: '+name);}
function bool(v,name){requireThat(typeof v==='boolean','Missing/invalid boolean: '+name);}
function equal(a,b,name){try{assert.deepEqual(a,b);}catch(_){throw Error('Mismatched '+name);}}
function parseJSON(text,name){try{return JSON.parse(text);}catch(_){throw Error('Unparseable '+name);}}
function parseNamed(line,names){
  const m=/^(PASS|FAIL) (.*)$/.exec(line);requireThat(m,'Unrecognized assertion line: '+line.slice(0,180));
  const name=names.find(n=>m[2]===n||m[2].startsWith(n+' '));requireThat(name,'Unknown assertion: '+m[2].slice(0,180));
  const tail=m[2].slice(name.length);return {ok:m[1]==='PASS',name,...(tail?{details:parseJSON(tail.trim(),'assertion details for '+name)}:{})};
}
function checkStatus(status,failed){requireThat(status===0||status===1,'Unexpected child exit status: '+status);requireThat(status===(failed?1:0),'Child exit status disagrees with original assertions');}
function coldRows(rows){array(rows,'release cold',5);rows.forEach((r,i)=>{object(r,'cold row');requireThat(r.stage===i+1,'Missing/duplicate cold stage');for(const k of ['enterMs','initMs','assetReadyFromNavigationMs'])finite(r[k],'cold '+r.stage+' '+k);});}
function fightRow(row,stage){object(row,'fight row');requireThat(row.stage===stage&&row.wave===3,'Missing/duplicate fight stage/wave');integer(row.frames,'frames',true);finite(row.fps,'fps',true);integer(row.over33,'over33');finite(row.maxMs,'maxMs',true);requireThat(row.over33<=row.frames,'over33 exceeds frame count');}
function screenshotTransport(lines,required){
  const groups=new Map(),allowed=new Set(['fade-intro','belal-intro','escape','family-credits']);
  for(const line of lines){
    if(line.startsWith('RWB_SCREENSHOT_META ')){
      const meta=parseJSON(line.slice(20),'screenshot metadata');requireThat(allowed.has(meta.name)&&!groups.has(meta.name),'Unexpected/duplicate screenshot metadata');
      integer(meta.bytes,'screenshot bytes',true);integer(meta.chunks,'screenshot chunks',true);requireThat(/^[a-f0-9]{64}$/.test(meta.sha256)&&meta.file===meta.name+'.jpeg','Invalid screenshot metadata');groups.set(meta.name,{meta,chunks:[]});
    }else{
      const m=/^RWB_SCREENSHOT_CHUNK ([a-z0-9-]+) (\d+)\/(\d+) ([A-Za-z0-9+/=]+)$/.exec(line);requireThat(m,'Malformed screenshot transport');
      const g=groups.get(m[1]);requireThat(g&&+m[3]===g.meta.chunks&&+m[2]===g.chunks.length+1,'Missing/out-of-order screenshot chunk');g.chunks.push(m[4]);
    }
  }
  if(required||groups.size)requireThat(groups.size===4,'Missing screenshot transport');
  for(const {meta,chunks} of groups.values()){requireThat(chunks.length===meta.chunks,'Incomplete screenshot chunks');const bytes=Buffer.from(chunks.join(''),'base64');requireThat(bytes.length===meta.bytes&&SHA(bytes)===meta.sha256,'Screenshot transport integrity mismatch');}
}
function release(stdout,status,expectScreenshots){
  const lines=stdout.split(/\r?\n/).filter(x=>x.trim());
  const records=[],reports=[],controls=[],screenshots=[];
  for(const line of lines){
    if(/^(PASS|FAIL) /.test(line))records.push(parseNamed(line,RELEASE_NAMES));
    else if(line.startsWith('RWB_REPORT '))reports.push(parseJSON(line.slice(11),'RWB_REPORT'));
    else if(line.startsWith('RWB_CAMPAIGN_SYNC_CONTROL '))controls.push(parseJSON(line.slice(26),'synchronous campaign control'));
    else if(/^RWB_SCREENSHOT_(META|CHUNK) /.test(line))screenshots.push(line);
    else throw Error('Unexpected release output: '+line.slice(0,180));
  }
  requireThat(reports.length===1&&lines.at(-1).startsWith('RWB_REPORT '),'Missing/duplicate/nonterminal RWB_REPORT');
  requireThat(controls.length===1,'Missing/duplicate synchronous campaign diagnostic');object(controls[0],'synchronous campaign diagnostic');bool(controls[0].passed,'control passed');integer(controls[0].frames,'control frames',true);
  screenshotTransport(screenshots,expectScreenshots);
  const r=reports[0];object(r,'release report');requireThat(typeof r.browser==='string'&&r.browser.length>0&&typeof r.method==='string'&&r.method.length>0,'Missing browser/method report');
  array(r.checks,'release checks',RELEASE_NAMES.length);equal(r.checks.map(c=>c.name),RELEASE_NAMES,'release assertion inventory/order');equal(records,r.checks,'printed assertions vs final report');
  array(r.errors,'release errors');requireThat(r.errors.length===0,'Blocking page/resource errors: '+JSON.stringify(r.errors));
  coldRows(r.cold);array(r.fights,'release fights',3);[1,3,5].forEach((s,i)=>fightRow(r.fights[i],s));
  r.checks.forEach(c=>bool(c.ok,c.name+' result'));
  equal(r.checks[0].details,r.cold,'cold details');requireThat(r.checks[0].ok===r.cold.every(c=>c.enterMs<400),'Cold assertion disagrees with numbers');
  for(let i=0;i<3;i++){const row=r.fights[i],c=r.checks[i+1];equal(c.details,row,'fight details');requireThat(c.ok===(row.fps>=59.5&&row.over33===0),'FPS assertion disagrees with numbers');}
  const campaign=r.checks[4].details;object(campaign,'campaign details');
  for(const k of ['passed','finished','jointFinish','callandorCarried','saveCleared'])bool(campaign[k],'campaign '+k);
  for(const k of ['seed','frames','continues'])integer(campaign[k],'campaign '+k,k==='frames');
  for(const k of ['wallMs','seconds'])finite(campaign[k],'campaign '+k);
  array(campaign.stages,'campaign stages');array(campaign.reels,'campaign reels');object(campaign.terminal,'campaign terminal');
  const campaignPassed=campaign.finished&&campaign.jointFinish&&campaign.callandorCarried&&campaign.saveCleared&&[1,2,3,4,5].every(n=>campaign.stages.includes(n))&&['CALLANDOR ANSWERS','ESCAPE FROM THE BLACK TOWER','HOMECOMING'].every(n=>campaign.reels.includes(n));
  requireThat(campaign.passed===campaignPassed&&r.checks[4].ok===campaign.passed,'Campaign assertion disagrees with details');
  requireThat(r.checks[4].details.passed,'Blocking cooperative full-campaign failure');
  equal(r.checks.at(-1).details,r.errors,'page/resource error details');
  const failed=r.checks.filter(c=>!c.ok);checkStatus(status,failed.length);
  const blocking=r.checks.slice(4).filter(c=>!c.ok);requireThat(!blocking.length,'Blocking non-timing assertion: '+blocking.map(c=>c.name).join('; '));
  return {originalChecks:r.checks.length,originalFailed:failed.map(c=>c.name),advisoryChecks:r.checks.slice(0,4),measurements:{cold:r.cold,fights:r.fights},synchronousControl:controls[0],report:r};
}
function audio(stdout,status){
  const lines=stdout.split(/\r?\n/).filter(x=>x.trim()),records=[],summaries=[];
  for(const line of lines){
    if(/^(PASS|FAIL) /.test(line)){
      const m=/^(PASS|FAIL) (Stage (?:1|5|4) wave (?:3|5): ~60 fps mid-fight with music on, no frame over 34 ms \(over33 = \d+\)) (.*)$/.exec(line);
      if(m)records.push({ok:m[1]==='PASS',name:m[2],details:parseJSON(m[3],'audio fight details')});
      else records.push(parseNamed(line,[...AUDIO_NAMES,AUDIO_ERRORS]));
    }else if(/^\d+ audio checks (passed|failed)\.$/.test(line))summaries.push(line);
    else throw Error('Unexpected audio output: '+line.slice(0,180));
  }
  requireThat(summaries.length===1&&lines.at(-1)===summaries[0],'Missing/duplicate/nonterminal audio summary');
  requireThat(records.length===13,'Missing/incomplete audio assertion inventory');
  equal(records.slice(0,9).map(c=>c.name),AUDIO_NAMES,'audio assertion inventory/order');requireThat(records[12].name===AUDIO_ERRORS,'Missing final audio resource check');
  records.forEach(c=>{bool(c.ok,'audio result');object(c.details,c.name+' details');});
  // Required non-timing measurements remain mandatory, even if a forged/incomplete
  // PASS line accompanies the timing failures that this wrapper may classify.
  const d=records.map(c=>c.details);
  requireThat(d[0].scene==='Title'&&d[0].unlocked===false&&(!d[0].state||!d[0].state.playing),'Blocking autoplay state');
  requireThat(typeof d[1].url==='string'&&d[1].url.length>0,'Missing music URL');for(const k of ['duration','loopStart','loopEnd'])finite(d[1][k],'music '+k);finite(d[2].loopSeconds,'loopSeconds',true);
  // The original loop predicate uses unrounded values; do not impose a new
  // predicate on rounded printed durations. Its original assertion stays blocking.
  requireThat(d[3].level===0&&d[3].playing===false&&d[3].saved===0,'Blocking saved music toggle');finite(d[4].level,'music level',true);requireThat(d[4].playing===true,'Blocking resumed music');finite(d[4].pos,'music position');
  requireThat(d[5].voice==='st2_narrator_01'&&d[5].music===true,'Blocking narrator/music playback');array(d[5].trace,'narrator trace');
  requireThat(d[6].voice==='taim_phase_01','Blocking Taim voice');
  requireThat(d[7].placeholderIgnored===true&&d[7].droppedPlays===true&&d[7].bubble==='Fire!','Blocking dropped-in voice/placeholder regression');
  array(d[8].enterMs,'audio cold enters',5);d[8].enterMs.forEach((ms,i)=>finite(ms,'audio cold stage '+(i+1)));requireThat(records[8].ok===d[8].enterMs.every(ms=>ms<400),'Audio cold assertion disagrees with numbers');
  const fights=[];
  for(let i=9;i<12;i++){
    const c=records[i],m=AUDIO_FIGHT.exec(c.name),f=c.details,expected=[[1,3],[5,3],[4,5]][i-9];
    requireThat(m&&+m[1]===expected[0]&&+m[2]===expected[1],'Missing/duplicate audio stage/wave');
    for(const k of ['enterMs','fps','p99','max'])finite(f[k],'audio '+k,k!=='enterMs');
    for(const k of ['frames','over33','over34','voices'])integer(f[k],'audio '+k,k==='frames');
    array(f.longAtMs,'audio longAtMs');f.longAtMs.forEach(n=>finite(n,'longAtMs entry'));bool(f.music,'audio music');
    requireThat(f.over34<=f.over33&&f.over33<=f.frames&&f.longAtMs.length===f.over34&&+m[3]===f.over33,'Inconsistent audio frame-gap counts');
    requireThat(f.fps===+(f.frames/10).toFixed(1),'Audio fps disagrees with measured frame count');
    requireThat(c.ok===(f.fps>=59&&f.over34===0&&f.music),'Audio assertion disagrees with original FPS/music predicate');
    requireThat(f.music===true,'Blocking music=false in audio timing row for Stage '+m[1]);
    fights.push({stage:+m[1],wave:+m[2],...f});
  }
  for(const k of ['pageErrors','consoleErrors','missing']){array(d[12][k],k);requireThat(d[12][k].length===0,'Blocking audio '+k+': '+JSON.stringify(d[12][k]));}
  const failed=records.filter(c=>!c.ok),m=/^(\d+) audio checks (passed|failed)\.$/.exec(summaries[0]);
  requireThat(m[2]===(failed.length?'failed':'passed')&&+m[1]===(failed.length||13),'Audio terminal count disagrees with assertions');checkStatus(status,failed.length);
  const blocking=records.filter((c,i)=>!c.ok&&i!==8&&!(i>=9&&i<=11));requireThat(!blocking.length,'Blocking audio/voice/resource assertion: '+blocking.map(c=>c.name).join('; '));
  return {originalChecks:13,originalFailed:failed.map(c=>c.name),advisoryChecks:records.slice(8,12),measurements:{cold:d[8].enterMs.map((enterMs,i)=>({stage:i+1,music:true,enterMs})),fights},report:{checks:records,summary:summaries[0]}};
}
function evaluate({kind,stdout='',stderr='',status,signal=null,error=null,expectScreenshots=false}){
  const result={kind,policy:'Jason-approved CI timing classification v1',timingGateRequired:'Separate matched live/candidate three-run medians and frame-gap totals; cold medians remain strictly below 400ms',passed:false,blockingErrors:[]};
  try{
    requireThat(Object.hasOwn(SOURCES,kind),'Unknown suite');requireThat(!error,'Child execution error: '+String(error));requireThat(!signal,'Child terminated by signal: '+signal);
    requireThat(typeof stdout==='string'&&typeof stderr==='string','Invalid child output');requireThat(stderr.trim()==='','Unexpected child stderr: '+stderr.slice(0,1000));
    requireThat(status===0||status===1,'Unexpected child exit status: '+status);
    Object.assign(result,kind==='release-browser'?release(stdout,status,expectScreenshots):audio(stdout,status));result.passed=true;
  }catch(error){result.blockingErrors.push(String(error.message||error));}
  return result;
}
function verifySource(kind){const source=SOURCES[kind];requireThat(source,'Unknown suite');const file=path.join(__dirname,source.file);requireThat(SHA(fs.readFileSync(file))===source.sha256,'Original suite source SHA changed; re-audit the additive classifier instead of silently broadening it');return file;}
function parseCLI(args,env=process.env){requireThat(args.length===2&&args.includes('--ci-timing-policy'),'Usage: CI=true node tools/ci-browser-gates-v11.cjs release-browser|audio-check --ci-timing-policy');const kind=args.find(a=>a!=='--ci-timing-policy');requireThat(Object.hasOwn(SOURCES,kind),'Unknown suite');requireThat(env.CI==='true'||env.CI==='1','Timing classification requires explicit CI=true and --ci-timing-policy; direct original scripts remain strict');return kind;}
async function main(){
  const kind=parseCLI(process.argv.slice(2)),file=verifySource(kind),chunks={stdout:[],stderr:[]};let total=0,overflow=false,executionError=null;
  const child=cp.spawn(process.execPath,[...process.execArgv,file],{cwd:path.resolve(__dirname,'..'),env:process.env,stdio:['ignore','pipe','pipe']});
  for(const name of ['stdout','stderr'])child[name].on('data',bytes=>{process[name].write(bytes);total+=bytes.length;if(total<=64*1024*1024)chunks[name].push(bytes);else if(!overflow){overflow=true;child.kill('SIGTERM');}});
  child.on('error',error=>{executionError=error;});
  const {status,signal}=await new Promise(resolve=>child.on('close',(status,signal)=>resolve({status,signal})));
  const outcome=evaluate({kind,stdout:Buffer.concat(chunks.stdout).toString('utf8'),stderr:Buffer.concat(chunks.stderr).toString('utf8'),status,signal,error:overflow?'Output exceeded 64 MiB; results are incomplete':executionError,expectScreenshots:kind==='release-browser'&&process.env.RWB_SCREENSHOT_LOG==='1'});
  console.log('RWB_CI_BROWSER_GATES '+JSON.stringify(outcome));process.exitCode=outcome.passed?0:1;
}
if(require.main===module)main().catch(error=>{console.error('RWB_CI_BROWSER_GATES_BLOCKED '+String(error.stack||error));process.exitCode=1;});
module.exports={evaluate,parseCLI,verifySource,SOURCES,RELEASE_NAMES,AUDIO_NAMES,AUDIO_ERRORS,RELEASE_COLD,AUDIO_COLD};
