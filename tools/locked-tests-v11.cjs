'use strict';
// Additive contract: unapproved changes remain failures. The one reviewed grip
// assertion exception is independently checked against its full original file.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'docs/review/v11/inherited-tests.lock.json')));
const failures = [];
for (const [file, expected] of Object.entries(lock.sha256)) {
  const full = path.join(root, file);
  let bytes = fs.existsSync(full) ? fs.readFileSync(full) : null;
  const exception = lock.metadataExceptions && lock.metadataExceptions[file];
  if (bytes && exception) {
    const text = bytes.toString('utf8');
    const occurrences = text.split(exception.to).length - 1;
    if (exception.kind !== 'version-metadata-only' || occurrences !== exception.expectedOccurrences) {
      failures.push(file + ' (invalid metadata exception)'); continue;
    }
    bytes = Buffer.from(text.replace(exception.to, exception.from));
    const archived = fs.readFileSync(path.join(root, exception.originalCopy));
    if (crypto.createHash('sha256').update(archived).digest('hex') !== expected) {
      failures.push(file + ' (original evidence changed)'); continue;
    }
  }
  const actual = bytes ? crypto.createHash('sha256').update(bytes).digest('hex') : 'missing';
  if (actual !== expected) failures.push(file);
}
failures.push(...require('./approved-callandor-pivot-v11.cjs').validate(root, lock));
if (failures.length) { console.error('FAIL inherited acceptance tools changed: ' + failures.join(', ')); process.exitCode = 1; }
else console.log('PASS ' + Object.keys(lock.sha256).length + ' inherited acceptance tools retain locked assertions with only the recorded version-stamp and approved Callandor-pivot exceptions; live reference ' + lock.baseCommit);
