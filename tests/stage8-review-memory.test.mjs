import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {memory8} from '../tools/stage8/memory.mjs';
test('N8: memory report counts the full decoded mono voice cache at 48 kHz alongside textures',()=>{
 const m=memory8(),render=JSON.parse(readFileSync('tools/stage8/voice-render.json','utf8'));
 const seconds=render.lines.reduce((n,line)=>n+line.duration_s,0);
 assert.ok(Math.abs(m.decodedVoice.seconds-seconds)<.1);assert.equal(m.decodedVoice.sampleRate,48000);
 assert.ok(Math.abs(m.decodedVoice.bytes-seconds*48000*4)<20000);assert.ok(m.decodedVoice.bytes>43000000);
 assert.equal(m.projectedWithVoice,m.projectedPeak+m.decodedVoice.bytes);
});
