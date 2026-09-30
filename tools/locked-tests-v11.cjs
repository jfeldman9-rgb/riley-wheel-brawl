'use strict';
// Additive contract: never rebaseline this file to turn a changed assertion green.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'docs/review/v11/inherited-tests.lock.json')));
const failures = [];
for (const [file, expected] of Object.entries(lock.sha256)) {
  const full = path.join(root, file);
  const actual = fs.existsSync(full) ? crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex') : 'missing';
  if (actual !== expected) failures.push(file);
}
if (failures.length) { console.error('FAIL inherited acceptance tools changed: ' + failures.join(', ')); process.exitCode = 1; }
else console.log('PASS ' + Object.keys(lock.sha256).length + ' inherited acceptance tools remain byte-identical to verified live 1.0 (' + lock.baseCommit + ')');
