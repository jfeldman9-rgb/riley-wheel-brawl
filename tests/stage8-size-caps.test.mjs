import test from 'node:test';
import assert from 'node:assert/strict';
import {audit} from '../tools/audit-stage1.mjs';
import {readFileSync} from 'node:fs';
test('Stage 8 pins its own pre-fight source delta and stays within the approved ceiling',()=>{
 const a=audit(),pin=JSON.parse(readFileSync('tests/fixtures/stage8-bytes.json'));
 assert.equal(a.preFight.inventoryUpperBoundBytes-20_675_453,pin.delta);
 assert.ok(a.preFight.inventoryUpperBoundBytes<=21_000_000);
 if(a.stage8)for(const row of Object.values(a.stage8))assert.equal(row.status,'PASS');
});
