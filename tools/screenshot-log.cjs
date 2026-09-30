'use strict';
// Bounded, checksummed text transport for CI screenshots; no artifact uploads.
const crypto = require('node:crypto');
function screenshotLog(name, bytes) {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Unsafe screenshot name');
  const data = Buffer.from(bytes), encoded = data.toString('base64');
  const chunkSize = 32 * 1024, chunks = Math.ceil(encoded.length / chunkSize);
  const lines = ['RWB_SCREENSHOT_META ' + JSON.stringify({ name, file: name + '.jpeg', bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex'), chunks })];
  for (let i = 0; i < chunks; i++) lines.push('RWB_SCREENSHOT_CHUNK ' + name + ' ' + (i + 1) + '/' + chunks + ' ' + encoded.slice(i * chunkSize, (i + 1) * chunkSize));
  return lines;
}
module.exports = { screenshotLog };
