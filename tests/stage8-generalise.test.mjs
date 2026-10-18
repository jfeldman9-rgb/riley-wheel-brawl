import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {stageEnabled,stageFromQuery,maxStage} from '../src/stages.js';
import {STAGE7} from '../src/stage7-def.js';
import {callInFor} from '../src/rand-call.js';
const Q=s=>new URLSearchParams(s);
test('Stage 8 is opt-in and Stage 7 requires both flags to continue',()=>{
 assert.equal(stageEnabled(8,Q('')),false);
 assert.equal(stageFromQuery(Q('stage=8')),1);
 assert.equal(stageFromQuery(Q('stage=8&s8=1')),8);
 assert.equal(maxStage(Q('s7=1')),7);
 assert.equal(maxStage(Q('s7=1&s8=1')),8);
 assert.deepEqual(STAGE7.next(Q('s7=1')), {stage:1,stage7Return:true});
 assert.deepEqual(STAGE7.next(Q('s7=1&s8=1')), {stage:8,fromStage7:true,autostart:true});
 assert.equal(STAGE7.next(Q('s8=1')).stage,1);
 assert.deepEqual([5,6,7,8].map(callInFor),['loial','rand','moilan','matrand']);
});
