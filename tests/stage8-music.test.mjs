import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,readdirSync} from 'node:fs';
import {MUSIC} from '../src/audio.js';
import {registerMusic8,guardLoop8,LOOP8} from '../src/stage8.js';
import {MUSIC8_PRESENT,musicTrack8} from '../src/stage8-audio.js';

const man=JSON.parse(readFileSync('tools/stage8/music-manifest.json','utf8'));

test('Stage 8 Suno loops are shipped, under 1.2 MB, and selected over the fallbacks',()=>{
  assert.deepEqual({...MUSIC8_PRESENT},{stage8:true,boss8:true});
  assert.equal(musicTrack8('stage'),'stage8');assert.equal(musicTrack8('boss'),'boss8');
  for(const id of ['stage8','boss8']){const f=`assets/audio/music-${id}.mp3`;const n=statSync(f).size;
    assert.ok(n<=1_200_000,f);assert.equal(n,man[id].bytes,f);}
});

test('MUSIC.stage8/boss8 loop points match the render manifest and whole bars of the measured grid',()=>{
  registerMusic8();
  for(const id of ['stage8','boss8']){const m=MUSIC[id],r=man[id];
    assert.equal(m.url,`assets/audio/${r.file}`);assert.equal(m.loopStart,r.loopStart);assert.equal(m.loopEnd,r.loopEnd);assert.equal(m.loopEnd,LOOP8[id]);
    assert.equal(m.gain,r.gain);assert.equal(typeof m.validateLoop,'function');
    const bars=r.loopSeconds/(r.beatsPerBar*60/r.bpm);assert.ok(Math.abs(bars-r.bars)<0.05,`${id} ${bars} bars`);}
  // Measured on the takes: stage 32 bars of 4/4 at ~124.9 bpm, boss 68 bars of 3/4 at 184 bpm (+/- 8 ms).
  assert.ok(Math.abs(man.stage8.loopSeconds-61.492)<0.008);assert.ok(Math.abs(man.boss8.loopSeconds-66.517)<0.008);
  assert.ok(man.stage8.lufs<=-15.5&&man.stage8.lufs>=-16.5&&man.stage8.peakDbfs<=-2);
  assert.ok(man.boss8.lufs<=-14.7&&man.boss8.lufs>=-15.7&&man.boss8.peakDbfs<=-2);
});

test('guardLoop8 repairs bad Stage 8 loop metadata only',()=>{
  const m={loopStart:NaN,loopEnd:-1};guardLoop8('stage8',m);assert.deepEqual(m,{loopStart:.25,loopEnd:LOOP8.stage8});
  const b={loopStart:.25,loopEnd:LOOP8.boss8};guardLoop8('boss8',b,60);assert.equal(b.loopEnd,60);
  const o={loopStart:NaN,loopEnd:NaN};guardLoop8('stage6',o);assert.ok(Number.isNaN(o.loopStart));
});

test('Stage 8 music provenance: only the two picked Suno songs, credited in AUDIO_PROVENANCE.md',()=>{
  const ids={stage8:'e99b6b16-7d6d-4847-9fe5-ad50535eeaea',boss8:'46be44f1-186c-40a6-aad2-1c98c5f51292'};
  const prov=readFileSync('assets/audio/AUDIO_PROVENANCE.md','utf8');
  for(const [id,song] of Object.entries(ids)){assert.equal(man[id].source.song_id,song);assert.ok(prov.includes(`https://suno.com/song/${song}`),id);}
  assert.match(prov,/Suno Pro account \(jfeldman9497\)/);assert.match(prov,/v6 Pro/);
  // No other Suno id appears in the Stage 8 tooling, and no raw Suno download is in the repo.
  for(const f of readdirSync('tools/stage8').filter(f=>/\.(md|json|py|mjs)$/.test(f))){const t=readFileSync('tools/stage8/'+f,'utf8');
    for(const m of t.matchAll(/suno\.com\/song\/([0-9a-f-]{36})/g))assert.ok(Object.values(ids).includes(m[1]),f);}
  for(const f of readdirSync('assets/audio'))assert.ok(!/_raw\.mp3$/i.test(f)&&!/suno/i.test(f),f);
});
