'use strict';
// Freshness/coverage gate for the independently decoded audit. Re-run the Python
// audit after any audio edit; approving a manifest without decoding is not enough.
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..'),R=require('../soak.cjs').boot(root);
const report=require('../../docs/review/audio-v11/voice-audit.json');
const lines=Object.values(R.VOICE_LINES);
assert.equal(report.count,80);assert.equal(report.lines.length,lines.length);
assert.match(report.auditory_review,/NOT PERFORMED/,'Measurements must not be mislabeled listening');
const files=new Set();let total=0;
for(const l of report.lines){
 const original=R.VOICE_LINES[l.id];assert.ok(original,l.id);assert.equal(l.text,original.text);assert.equal(l.file,R.voiceFile(l.id));
 assert.ok(!files.has(l.file),'No duplicate voice files');files.add(l.file);
 const bytes=fs.readFileSync(path.join(root,l.asset_path));total+=bytes.length;
 assert.equal(l.sha256,crypto.createHash('sha256').update(bytes).digest('hex'),l.id+' audit measures current bytes');
 assert.equal(l.codec,'mp3');assert.equal(l.channels,1);assert.equal(l.sample_rate_hz,24000);
 assert.ok(l.duration_s>.25,l.id+' exceeds placeholder cutoff');
 assert.equal(l.clipped_sample_count,0,l.id+' has no digital clipped samples');
 assert.ok(l.true_peak_dbtp<=-1,l.id+' has true-peak headroom');
 assert.equal(l.effective_integrated_lufs,-17,l.id+' normalized to -17 LUFS');
 assert.ok(l.effective_true_peak_dbtp<=-1,l.id+' retains true-peak headroom after normalization');
 assert.equal(l.playback_gain_db,R.VOICE_GAIN_DB[l.id],l.id+' runtime gain matches measurement');
 assert.ok(Math.abs(20*Math.log10(R.audio.clipGain(l.id))-l.playback_gain_db)<.0001,l.id+' engine applies calibrated gain');
 assert.ok(l.rms_dbfs>-40,l.id+' contains audible-level signal');
 assert.equal(l.auditory_review,'not-performed-audio-input-unavailable');
}
assert.deepEqual([...files].sort(),fs.readdirSync(path.join(root,'assets/audio/voice')).filter(f=>f.endsWith('.mp3')).sort());
assert.equal(total,report.total_bytes);
console.log('PASS every shipped voice: all 80 catalogue IDs, filenames, hashes, decoding metadata, levels and clipping; '+total+' bytes');
console.log('Auditory performance/pronunciation review remains pending. Open docs/review/audio-v11/auditions.html.');
