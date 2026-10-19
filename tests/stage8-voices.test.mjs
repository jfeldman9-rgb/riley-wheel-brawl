import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,statSync} from 'node:fs';import {createHash} from 'node:crypto';
import {VOICE_FILES} from '../src/stage8-voice-files.js';
const render=JSON.parse(readFileSync('tools/stage8/voice-render.json','utf8'));
test('every approved Stage 8 line is on disk, within caps and matches its render record',()=>{
 const src=readFileSync('src/stage8-voice.js','utf8'),lines=JSON.parse(src.match(/LINES=Object\.freeze\((\{[\s\S]*?\n\})\);/)[1]);
 assert.deepEqual([...VOICE_FILES].sort(),Object.keys(lines).sort());
 const byId=Object.fromEntries(render.lines.map(l=>[l.id,l]));let total=0;
 for(const id of VOICE_FILES){const r=byId[id],path=`assets/audio/voice/${id}.mp3`,buf=readFileSync(path);
  assert.ok(r,id);assert.equal(r.file,path);assert.equal(r.text,lines[id][1],id);assert.match(r.approval,/^approved/,id);
  assert.equal(buf.length,r.bytes,id);assert.equal(createHash('sha256').update(buf).digest('hex'),r.sha256,id);
  assert.ok(statSync(path).size<=200*1024,id);total+=buf.length;}
 assert.ok(total<=13_312_000);assert.equal(total,render.total_bytes);
});
