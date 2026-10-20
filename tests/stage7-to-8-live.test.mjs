import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {stageEnabled,maxStage,resolveStage,STAGES} from '../src/stages.js';
const Q=s=>new URLSearchParams(s);
test('live play (no flags): beating Stage 7 restarts into Stage 8, and Stage 8 leads to campaign complete',()=>{
 const q=Q('');
 assert.ok(stageEnabled(7,q)&&stageEnabled(8,q));assert.equal(maxStage(q),8);
 const s6=STAGES[6].next(q);assert.equal(s6.stage,7);assert.equal(resolveStage(s6,q),7);
 const s7=STAGES[7].next(q);assert.deepEqual(s7,{stage:8,fromStage7:true,autostart:true});
 assert.equal(resolveStage(s7,q),8,'scene.restart(next) lands on Stage 8, not Stage 1');
 assert.deepEqual(STAGES[8].next(q),{stage:1,campaignComplete:true});
});
test('?s8=0 / ?s7=0 still hide stages for testing',()=>{
 assert.equal(STAGES[7].next(Q('s8=0')).stage,1);assert.equal(resolveStage({stage:8},Q('s8=0')),1);
 assert.equal(STAGES[6].next(Q('s7=0')).stage,1);assert.equal(maxStage(Q('s7=0')),6);
});
