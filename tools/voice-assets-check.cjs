'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),R=require('./soak.cjs').boot(root),manifest=require('../assets/audio/voice-manifest.json');
let bytes=0;
for(const line of manifest.lines){
 const gameLine=R.VOICE_LINES[line.id];assert.ok(gameLine,line.id+' is catalogued');assert.equal(gameLine.text,line.text);assert.equal(R.voiceFile(line.id),line.file);
 const data=fs.readFileSync(path.join(root,line.asset_path));assert.equal(crypto.createHash('sha256').update(data).digest('hex'),line.sha256,line.id+' unchanged from decoded/audio-level-verified master');
 assert.ok(line.duration_s>.25,line.id+' exceeds the placeholder cutoff');assert.ok(line.rms_dbfs>-40&&line.true_peak_dbtp<=-1,line.id+' has audible level and headroom');bytes+=data.length;
}
for(const line of Object.values(R.VOICE_LINES))if(R.VOICE_LOCAL_CAST[line.who])assert.ok(manifest.lines.some(l=>l.id===line.id),'Approved cast has '+line.id);
assert.equal(manifest.lines.length,54);
const oldVoice=R.voice,said=[];R.voice=id=>said.push(id);
const scene={camera:{x:0},player:{y:250},enemies:[]};const ally=new R.Loial(scene);for(let i=0;i<200;i++)ally.update(1/60);
assert.deepEqual(said,['loial_charge_01','loial_done_01']);R.voice=oldVoice;
console.log('PASS 54 approved voice assets: exact text, filename, verified-master hash, duration, loudness and headroom; '+bytes+' bytes');
console.log('PASS Loial charge/exit lines each trigger once without duplicate barks');
