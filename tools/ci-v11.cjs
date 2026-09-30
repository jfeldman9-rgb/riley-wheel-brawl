'use strict';
// Run all named gates even when another fails. This never turns a failed test
// into a pass; unresolved legacy-contract conflicts keep the job red.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),mode=process.argv[2]||'unit',baseline=process.argv[3],liveBaseline=process.argv[4];
const out=path.join(root,'docs/review/v11/ci');fs.mkdirSync(out,{recursive:true});
const tests={
 unit:[
  ['test-lock','tools/locked-tests-v11.cjs'],['lazy-assets','tools/assets-check-v11.cjs'],
  ['smoothness','tools/smoothness-check.cjs'],['release-contracts','tools/release-check.cjs'],
  ['campaign','tools/campaign-check.cjs'],['cooperative-campaign','tools/campaign-cooperative-check.cjs'],['offline-feet','tools/offline-foot-check.cjs'],['hard-coverage','tools/hard-check.cjs','--soak'],
  ['callandor-inherited','tools/callandor-check.cjs'],['balefire','tools/balefire-check.cjs'],
  ['voice-assets','tools/voice-assets-check.cjs'],['utility-voices','tools/utility-voice-check.cjs'],
  ['normal-inherited','tools/normal-balance.cjs'],['assisted-soak','tools/soak.cjs'],
  ['combat-v11','tools/v11-combat-check.cjs'],['balance-evidence-v11','tools/v11-evidence-check.cjs'],['combat-render-v11','tools/v11-combat-render-check.cjs'],
  ['menus-v11','tools/v11-menu-check.cjs'],['performance-contracts-v11','tools/performance-check-v11.cjs'],
  ['background-visual-v11','tools/performance-visual-v11.cjs',liveBaseline],
  ['presentation-v11','tools/presentation-check-v11.cjs'],['voice-audit-v11','tools/audio/voice-audit-check.cjs'],
  ['audio-clock-v11','tools/audio/audio-clock-check.cjs'],
  ['hard-normal-exact-parity','tools/hard-check.cjs','--baseline='+baseline],
  ['normal-v11','tools/v11-balance.cjs'],['hard-v11','tools/v11-balance.cjs']
 ],
 browser:[
  ['inherited-regression-browser','tools/check.cjs'],['inherited-release-browser','tools/release-browser.cjs'],
  ['protected-voice-browser','tools/voice-sequence-check.cjs'],['inherited-audio-browser','tools/audio-check.cjs'],
  ['inherited-seams','tools/joinscan.cjs'],['audio-mix-v11','tools/audio/audio-mix-check.cjs'],
  ['device-emulation-v11','tools/v11-device-browser.cjs'],['painted-outcomes-v11','tools/presentation-browser-v11.cjs']
 ]
};
if(!tests[mode])throw new Error('Expected unit or browser');
if(mode==='unit'&&(!baseline||!liveBaseline))throw new Error('Unit mode requires the unchanged historical parity reference checkout');
const results=[];
for(const [name,script,...args] of tests[mode]){
 console.log('\n::group::'+name);const start=Date.now();
 const extra=name==='hard-v11'?{RWB_BALANCE_MODE:'hard'}:name==='normal-v11'?{RWB_BALANCE_MODE:'normal'}:{};
 const result=cp.spawnSync(process.execPath,['--expose-gc',script,...args],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,timeout:8*60*1000,env:{...process.env,...extra,RWB_SCREENSHOT_LOG:'1'}});
 const log=(result.stdout||'')+(result.stderr||'');fs.writeFileSync(path.join(out,name+'.log'),log);
 process.stdout.write(log);if(result.error)console.error(result.error.message);
 const row={name,command:['node','--expose-gc',script,...args].join(' '),status:result.status===0&&!result.error?'pass':'fail',exitCode:result.status,signal:result.signal,seconds:(Date.now()-start)/1000,error:result.error?.message};results.push(row);
 console.log('::endgroup::');console.log('RWB_GATE '+JSON.stringify(row));
}
const report={commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),mode,environment:process.env.GITHUB_ACTIONS?'GitHub Actions Linux (not Jason Mac or a physical device)':'Current executor',results};
fs.writeFileSync(path.join(out,mode+'.json'),JSON.stringify(report,null,2)+'\n');console.log('RWB_GATE_REPORT '+JSON.stringify(report));
if(results.some(r=>r.status!=='pass'))process.exitCode=1;
