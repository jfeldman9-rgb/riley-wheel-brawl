'use strict';
// The reviewed exception is one exact assertion replacement, not a general
// permission to rebaseline inherited tests. Restore it and recover the full
// original file byte-for-byte, including every other assertion and comment.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const APPROVED=Object.freeze({
  file:'tools/callandor-check.cjs',
  kind:'approved-grip-pivot-only',
  from:"assert.strictEqual(calls[0][2], frame === 'idle' ? -83 : -76, frame + ' sword grip pivot');",
  to:"assert.strictEqual(calls[0][2], -83, frame + ' sword grip pivot');",
  expectedOccurrences:1,
  originalSha256:'ac7bf6f217d6648f447a6e848b79333d8ec575559f841cabcac8cf75eaafae55',
  approvedSha256:'56b6dc6161e452d859cb1dedf2110771e696110dd3e9a8c71aa025f176507102',
  originalCopy:'docs/review/v11/inherited/callandor-live1.0.cjs',
  reason:'Reviewed wrapped-grip center at stamp y=83 is approved for all poses; the old non-idle y=76 collar expectation is replaced. Every other assertion, loop, source pixel check and layer order is unchanged.',
  approvedDate:'2026-10-01'
});
const LOCK_REFERENCE=Object.freeze({file:'docs/review/v11/inherited/test-lock-before-grip-approval.json',sha256:'1e89ee9d4a927d462d82aa35b3bbb4d09e2e47b02d17719a426ec2456642639f'});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const stable=value=>Array.isArray(value)?'['+value.map(stable).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}':JSON.stringify(value);
function validate(root,lock,read=fs.readFileSync){
  const failures=[],all=lock.approvedExceptions;
  if(!all||typeof all!=='object'||Array.isArray(all)||Object.keys(all).length!==1||!Object.hasOwn(all,APPROVED.file))return ['Callandor approval metadata missing or contains an unapproved exception'];
  const entry=all[APPROVED.file],keys=Object.keys(APPROVED).filter(key=>key!=='file');
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).length!==keys.length||Object.keys(entry).some(key=>!keys.includes(key)))failures.push('Callandor approval entry has missing or extra fields');
  for(const key of keys)if(entry?.[key]!==APPROVED[key])failures.push('Callandor approval metadata changed: '+key);
  if(lock.sha256?.[APPROVED.file]!==APPROVED.approvedSha256)failures.push('Callandor approved digest changed');
  if(failures.length)return failures;
  let current,original,reference;
  try{current=read(path.join(root,APPROVED.file));original=read(path.join(root,APPROVED.originalCopy));reference=read(path.join(root,LOCK_REFERENCE.file));}catch(error){return ['Callandor approval source/archive missing: '+error.message];}
  if(hash(reference)!==LOCK_REFERENCE.sha256)return ['Pre-approval test-lock evidence changed'];
  const expected=JSON.parse(reference.toString('utf8'));
  expected.sha256[APPROVED.file]=APPROVED.approvedSha256;
  expected.approvedExceptions={[APPROVED.file]:Object.fromEntries(keys.map(key=>[key,APPROVED[key]]))};
  if(stable(lock)!==stable(expected))failures.push('Test-lock manifest changed beyond the approved Callandor digest and exception');
  if(hash(current)!==APPROVED.approvedSha256)failures.push('Callandor current source is not the specifically approved test');
  if(hash(original)!==APPROVED.originalSha256)failures.push('Callandor original evidence changed');
  const text=current.toString('utf8'),before=original.toString('utf8');
  if(text.split(APPROVED.to).length-1!==1||before.split(APPROVED.from).length-1!==1||text.replace(APPROVED.to,APPROVED.from)!==before)failures.push('Callandor changed beyond the one approved pivot assertion');
  return failures;
}
module.exports={APPROVED,LOCK_REFERENCE,validate};
if(require.main===module){
  const root=path.resolve(__dirname,'..'),lock=JSON.parse(fs.readFileSync(path.join(root,'docs/review/v11/inherited-tests.lock.json'),'utf8')),failures=validate(root,lock);
  if(failures.length){console.error('FAIL '+failures.join('; '));process.exitCode=1;}
  else console.log('PASS approved Callandor -76 to -83 exception; exact original archive and every other test byte preserved');
}
