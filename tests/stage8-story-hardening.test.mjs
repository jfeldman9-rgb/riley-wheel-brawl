import '../tests/helpers/install-location.mjs';import test from 'node:test';import assert from 'node:assert/strict';
import {createStory8} from '../src/stage8-story.js';
import {LINES} from '../src/stage8-voice.js';
function fixture(){const tasks=[],spoken=[],clips=[];const s={caption:(who,text)=>spoken.push(text),textures:{exists:()=>false},startCutscene(){throw Error('in-engine beat must not create an empty panel deck');},music:{state:'cutscene',resumeFight(){this.state='boss';}}};const k={s,later:(t,fn)=>tasks.push(fn)};const story=createStory8(k,(s,id)=>{clips.push(id);return false;});const drain=()=>{while(tasks.length)tasks.shift()();};return {s,k,story,spoken,clips,drain};}
test('no-panel C5 remains in-engine and resumes the fight music',()=>{const f=fixture();let done=0;f.story.play('C5',()=>done++);f.drain();assert.equal(done,1);assert.equal(f.spoken.length,2);assert.equal(f.s.music.state,'boss');});
test('P4 scream is never repeated by a full finale video; quips wait for the walk',()=>{const f=fixture();f.s.bot=true;f.story.say('st8_lanfear_final_01');f.story.play('C8');f.drain();assert.deepEqual(f.clips,[]);assert.deepEqual(f.spoken,['st8_lanfear_final_01','st8_lanfear_final_02'].map(id=>LINES[id][1]));f.story.play('C8walk');f.drain();assert.deepEqual(f.spoken,['st8_lanfear_final_01','st8_lanfear_final_02','st8_tt_final_01','riley_st8_final_01'].map(id=>LINES[id][1]));});

import {safeFrame8} from '../src/stage8-frames.js';
test('plain-image fallbacks use the base frame instead of an absent numeric cell',()=>{const s={textures:{get:()=>({firstFrame:'__BASE',has:f=>f==='__BASE'})}};assert.equal(safeFrame8(s,'s8door',3),'__BASE');});
