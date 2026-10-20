import {audit} from '../audit-stage1.mjs';
import {writeFileSync} from 'node:fs';
const bytes=audit().preFight.inventoryUpperBoundBytes;
writeFileSync(new URL('../../tests/fixtures/stage8-bytes.json',import.meta.url),JSON.stringify({baseline:20675453,delta:bytes-20675453,bytes},null,2)+'\n');
console.log(bytes);
