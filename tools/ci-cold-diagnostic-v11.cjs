'use strict';
// Individual samples remain visible. Only the approved three-run median is a
// blocking timing decision; execution, completeness and audio state still fail.
const assert=require('node:assert/strict');
function evaluateCold(report,expectedCommit){
 assert.match(expectedCommit,/^[a-f0-9]{40}$/);assert.equal(report.commit,expectedCommit);assert.equal(report.workingTreeDirty,false);
 assert.equal(report.coldOnly,true);assert.equal(report.profileOnly,false);assert.equal(report.reportOnly,true);
 assert.ok(Array.isArray(report.errors)&&report.errors.length===0);assert.equal(report.gates?.errors,true);assert.deepEqual(Object.keys(report.gates||{}).sort(),['cold','errors','fights','musicConfigured']);assert.equal(report.gates.musicConfigured,true);
 assert.equal(typeof report.gates.cold,'boolean');assert.equal(report.gates.fights,null);
 assert.ok(Array.isArray(report.cold)&&report.cold.length===10);assert.ok(Array.isArray(report.fights)&&report.fights.length===0);
 assert.ok(Array.isArray(report.audioFights)&&report.audioFights.length===0);
 const seen=new Set(),samples=[];
 for(const row of report.cold){
  assert.ok(Number.isInteger(row.stage)&&row.stage>=1&&row.stage<=5);assert.equal(typeof row.music,'boolean');
  assert.equal(row.musicEnabled,row.music);assert.equal(typeof row.musicPlaying,'boolean');assert.ok(Number.isFinite(row.enterMs)&&row.enterMs>=0);
  const key=row.stage+':'+row.music;assert.ok(!seen.has(key),'Duplicate cold cell '+key);seen.add(key);
  const absolutePass=row.enterMs<400;assert.equal(row.absolutePass,absolutePass);
  samples.push({stage:row.stage,music:row.music,enterMs:row.enterMs,absolutePass});
 }
 assert.equal(report.gates.cold,samples.every(x=>x.absolutePass));
 return {valid:true,blockingTimingDecision:'deferred to matched three-run per-stage/music medians <400ms',singleSampleTiming:'advisory only by explicit CI policy',absolutePass:report.gates.cold,samples};
}
module.exports={evaluateCold};
if(require.main===module){
 if(process.env.CI!=='true')throw Error('Explicit CI=true is required for the approved advisory policy');
 const fs=require('node:fs'),cp=require('node:child_process'),file=process.argv[2];if(!file)throw Error('Expected the cold-only report path');
 const expected=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 console.log('RWB_CI_COLD_DIAGNOSTIC '+JSON.stringify(evaluateCold(JSON.parse(fs.readFileSync(file,'utf8')),expected)));
}
