'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {APPROVED,LOCK_REFERENCE,validate}=require('./approved-callandor-pivot-v11.cjs');
const root=path.resolve(__dirname,'..'),base=JSON.parse(fs.readFileSync(path.join(root,'docs/review/v11/inherited-tests.lock.json'),'utf8'));
const current=fs.readFileSync(path.join(root,APPROVED.file)),original=fs.readFileSync(path.join(root,APPROVED.originalCopy));
const reference=fs.readFileSync(path.join(root,LOCK_REFERENCE.file));
let checks=0;
assert.deepEqual(validate(root,base),[]);checks++;
for(const mutate of [
  lock=>delete lock.approvedExceptions,
  lock=>lock.approvedExceptions={},
  lock=>lock.approvedExceptions['tools/hard-check.cjs']={},
  lock=>delete lock.approvedExceptions[APPROVED.file],
  lock=>lock.approvedExceptions[APPROVED.file].kind='unreviewed',
  lock=>lock.approvedExceptions[APPROVED.file].from='anything',
  lock=>lock.approvedExceptions[APPROVED.file].to=APPROVED.to.replace('-83','-82'),
  lock=>lock.approvedExceptions[APPROVED.file].expectedOccurrences=0,
  lock=>lock.approvedExceptions[APPROVED.file].expectedOccurrences=2,
  lock=>lock.approvedExceptions[APPROVED.file].originalSha256='0'.repeat(64),
  lock=>lock.approvedExceptions[APPROVED.file].approvedSha256='0'.repeat(64),
  lock=>lock.approvedExceptions[APPROVED.file].originalCopy='../unrelated-file',
  lock=>lock.approvedExceptions[APPROVED.file].unapproved=true,
  lock=>delete lock.approvedExceptions[APPROVED.file].reason,
  lock=>lock.approvedExceptions[APPROVED.file].reason='different rationale',
  lock=>lock.approvedExceptions[APPROVED.file].approvedDate='2099-01-01',
  lock=>lock.sha256[APPROVED.file]='0'.repeat(64)
]){
  const lock=JSON.parse(JSON.stringify(base));mutate(lock);
  assert.ok(validate(root,lock,()=>{throw Error('invalid metadata must reject before any source read');}).length);checks++;
}
for(const [now,old] of [
  [Buffer.from(current.toString().replace('-83','-82')),original],
  [Buffer.from(current.toString().replace('opaque >= 8','opaque >= 1')),original],
  [Buffer.from(current.toString().replace("assert.strictEqual(changed, 0", "assert.strictEqual(changed, changed")),original],
  [Buffer.concat([current,Buffer.from('\n// unapproved edit\n')]),original],
  [current,Buffer.concat([original,Buffer.from('\n')])],
  [original,original]
]){
  assert.ok(validate(root,base,file=>file===path.join(root,APPROVED.file)?now:file===path.join(root,APPROVED.originalCopy)?old:reference).length);checks++;
}
for(const mutate of [lock=>delete lock.sha256['tools/hard-check.cjs'],lock=>lock.sha256['tools/hard-check.cjs']='0'.repeat(64),lock=>lock.sha256['tools/extra.cjs']='0'.repeat(64),lock=>lock.v11Gates.coldStageEnterMsExclusive=401,lock=>lock.walkTearLimits={allOtherWalkFrames:99},lock=>delete lock.metadataExceptions,lock=>lock.baseCommit='0'.repeat(40)]){
  const lock=JSON.parse(JSON.stringify(base));mutate(lock);assert.ok(validate(root,lock).some(message=>message.includes('manifest changed')));checks++;
}
assert.ok(validate(root,base,file=>file===path.join(root,LOCK_REFERENCE.file)?Buffer.from('{}'):fs.readFileSync(file)).some(message=>message.includes('test-lock evidence changed')));checks++;
assert.ok(validate(root,base,()=>{throw Error('missing archive');}).length);checks++;
console.log('PASS '+checks+' approved-pivot lock checks, including rejected extra exceptions, altered thresholds, source/archive drift and missing evidence');
