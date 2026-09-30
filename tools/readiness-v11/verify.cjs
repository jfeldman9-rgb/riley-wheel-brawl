'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
function verify(out,config,results){
 const load=f=>JSON.parse(fs.readFileSync(path.join(out,f),'utf8'));
 const q=load('queue/queue-report.json');assert.equal(q.checks,33);assert.ok(q.allPassed);assert.ok(q.rows.every(r=>r.pass));
 const b=load('queue/lifecycle-report.json');assert.equal(b.rows.length,4);assert.ok(b.rows.every(r=>r.oldBitmapCloseCount===1&&r.pass));
 const p=load('pool/pixel-report.json');assert.deepEqual([p.comparisons,p.identity,p.transformed,p.contacts,p.negativeControls],[1440,60,1380,120,2]);assert.equal(p.controlHash,config.control.sourceSha256['puppets.js']);assert.equal(p.candidateHash,config.candidateFiles['js/puppets.js']);assert.ok(p.noAdditionalCanvases);
 const s=load('queue/pixel-report.json');assert.equal(s.comparisons,1440);assert.ok(s.allExact);assert.equal(s.rows.length,1440);assert.equal(new Set(s.rows.map(r=>[r.kind,r.scale,r.key,r.facing].join('/'))).size,1440);assert.ok(s.rows.every(r=>r.exact&&r.controlHash===r.candidateHash));
 const l=load('pool/lifecycle-report.json');assert.deepEqual([l.nestedCases,l.cancellationCases,l.throwCases,l.dropCases,l.twoLayerCases],[24,24,24,12,36]);assert.equal(l.maxActiveVertices,2125);assert.equal(l.maxFreeSnapshots,3);assert.equal(l.aliasing,false);
 const x=load('reports/preemption.json');assert.equal(x.cases,216);assert.ok(x.rows.every(r=>r.exact));assert.ok(x.completedSnapshotsReleased);assert.equal(x.sourceHash,config.candidateFiles['js/puppets.js']);
 const c=load('background/reports/control-flow.json');assert.equal(c.checks,15);assert.ok(c.allPassed);
 const d=load('background/reports/decoded-pixels.json');assert.equal(d.comparisons,252);assert.ok(d.allExact);assert.equal(d.lifecycleCases,18);assert.ok(d.rows.every(r=>r.exact&&r.beforeHash===r.afterHash));
 assert.equal(results.length,8);assert.ok(results.every(r=>r.exitCode===0));
 return {allPassed:true,candidateRoot:config.candidateRoot,candidateHead:config.candidateHead,control:config.control,candidateSourceSha256:Object.fromEntries(Object.keys(config.control.sourceSha256).map(name=>[name,config.candidateFiles['js/'+name]])),checks:{queue:33,bitmapCloseOnce:4,poolPixelComparisons:1440,schedulerPixelComparisons:1440,identityFacing:60,transformedFacing:1380,soleContacts:120,tinyDeformationNegativeControls:2,preemption:216,poolLifecycle:{nested:24,cancellation:24,throw:24,dropRebuild:12,twoLayer:36,maxActiveVertices:2125,maxFreeSnapshots:3,aliasing:false},backgroundLifecycle:15,backgroundPixels:252,backgroundCancellationReturn:18},suites:results,limits:['Offline deterministic and decoded Skia correctness only; no browser, timing, frame-pacing, native-memory, GC-cause or latency claim.','Expected control reference and actual local reference are separately reported.','Inherited native gates and 400-play balance are separate checks; this runner does not replace them.']};
}
module.exports={verify};
