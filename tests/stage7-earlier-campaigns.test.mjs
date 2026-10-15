import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {goldenCampaign} from '../tools/stage7/golden.mjs';
test('Stage 1–6 golden campaign observations are unchanged on all FULL_STAGE_SEEDS',()=>{
  const expected=JSON.parse(readFileSync(new URL('./fixtures/stage7-earlier-campaigns.json',import.meta.url)));
  assert.deepEqual(goldenCampaign(),expected);
});
