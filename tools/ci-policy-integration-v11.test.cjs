'use strict';
// Source/contract integration checks only. No browser or timing measurements.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const main=read('.github/workflows/v11-acceptance.yml'),legacy=read('.github/workflows/release-quality.yml');
const hooks=fs.readdirSync(path.join(root,'.github/workflows')).filter(f=>/\.ya?ml$/.test(f)).filter(f=>/^  pull_request:/m.test(read('.github/workflows/'+f)));
assert.deepEqual(hooks,['v11-acceptance.yml']);assert.ok(/^  workflow_call:/m.test(main));assert.ok(/^  workflow_call:/m.test(legacy));assert.ok(legacy.includes('uses: ./.github/workflows/v11-acceptance.yml'));
for(const y of [main,legacy]){assert.ok(y.includes('permissions:\n  contents: read'));assert.ok(!/contents:\s*write|secrets:\s*inherit/.test(y));}
for(const required of ['ci-browser-gates-v11.cjs release-browser --ci-timing-policy','ci-browser-gates-v11.cjs audio-check --ci-timing-policy','--cold-only --report-only','ci-cold-diagnostic-v11.cjs','--immediate --ci-relative','--advisory-timing','ci-relative-policy-v11.test.cjs','ci-browser-gates-v11.test.cjs','ci-cold-diagnostic-v11.test.cjs'])assert.ok(main.includes(required),required);
assert.ok(!main.includes('continue-on-error: true'),'Never blanket-ignore job/assertion failures');
const native=read('tools/ci-v11.cjs');for(const f of ['check.cjs','smoothness-check.cjs','release-check.cjs','campaign-check.cjs','hard-check.cjs','callandor-check.cjs','balefire-check.cjs','voice-assets-check.cjs','utility-voice-check.cjs','normal-balance.cjs','soak.cjs','release-browser.cjs','voice-sequence-check.cjs','audio-check.cjs','joinscan.cjs'])assert.ok(native.includes("tools/"+f)||main.includes('tools/'+f),f+' retained');
assert.ok(native.includes("['hard-coverage','tools/hard-check.cjs','--soak']"));assert.ok(native.includes("['hard-normal-exact-parity','tools/hard-check.cjs','--baseline='+baseline]"));
const profile=read('tools/performance-v11.cjs');const start=profile.indexOf(' const fightCases='),end=profile.indexOf(' if(!coldOnly)for(',start);assert.ok(start>0&&end>start);
const make=(quick,audioMatched)=>JSON.parse(vm.runInNewContext(profile.slice(start,end)+';JSON.stringify(fightCases)',{quick,audioMatched}));
const six=[false,true].flatMap(music=>[0,2,4].map(level=>({music,level,wave:3,audioCase:false})));
assert.deepEqual(make(false,false),six);assert.deepEqual(make(false,true),[...six,{music:true,level:3,wave:5,audioCase:true}]);assert.equal(make(true,false).length,1);
for(const token of ['r.enterMs<400','r.fps>=59.5&&r.over33===0','t-start>=10000','requestAnimationFrame(()=>requestAnimationFrame(r))','RWB_ABSOLUTE_DIAGNOSTIC','musicPlayingStart','musicPlayingEnd'])assert.ok(profile.includes(token),token);
const driver=read('tools/performance-compare-v11.cjs');for(const token of ["const expectedLive='816eb1e9dc209b00a6da4f8eeb58ea2ead69bdbc'",'run<=3',"['baseline','candidate']:['candidate','baseline']","['--report-only','--audio-matched']","require('./ci-relative-policy-v11.cjs').evaluate(report)",'if(!report.ciPolicy.passed)failed=true'])assert.ok(driver.includes(token),token);
const diagnostic=read('tools/diagnostics/readiness/compare-readiness.cjs');assert.ok(diagnostic.includes("if(advisoryTiming&&process.env.CI!=='true')"));assert.ok(diagnostic.includes('if(!report.candidateStrictGatesPassed&&!advisoryTiming)process.exitCode=1;'));assert.ok(diagnostic.includes("report.status='invalid-or-incomplete'"));assert.ok(diagnostic.includes('if(failure)throw failure;'));
const lock=JSON.parse(read('docs/review/v11/inherited-tests.lock.json'));for(const file of ['tools/release-browser.cjs','tools/audio-check.cjs','tools/callandor-check.cjs','tools/hard-check.cjs'])assert.equal(crypto.createHash('sha256').update(read(file)).digest('hex'),lock.sha256[file],file+' remains byte-locked');
console.log('PASS CI integration: one PR workflow, unchanged script/functional coverage, all music/stage cells, explicit timing-only policy, and exact locked hashes; browser runs=0');
