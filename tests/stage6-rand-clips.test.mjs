import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createBag, RAND_CLIPS as RAND_IDS, RAND_BASE } from '../src/rand-call-cutscene.js';

function boxes(buf, from = 0, to = buf.length) {
  const out = [];
  for (let off = from; off + 8 <= to;) {
    let size = buf.readUInt32BE(off), head = 8;
    if (size === 1) { size = Number(buf.readBigUInt64BE(off + 8)); head = 16; } else if (size === 0) size = to - off;
    out.push({ type: buf.toString('ascii', off + 4, off + 8), start: off + head, end: off + size });
    if (size <= 0) break;
    off += size;
  }
  return out;
}
function mvhdSeconds(buf) {
  const moov = boxes(buf).find(b => b.type === 'moov');
  const mvhd = moov && boxes(buf, moov.start, moov.end).find(b => b.type === 'mvhd');
  if (!mvhd) return null;
  const s = mvhd.start, v = buf[s];
  const scale = buf.readUInt32BE(s + (v === 1 ? 20 : 12));
  const dur = v === 1 ? Number(buf.readBigUInt64BE(s + 24)) : buf.readUInt32BE(s + 16);
  return dur / scale;
}
function jpegSize(buf) {
  assert.equal(buf.readUInt16BE(0), 0xffd8);
  for (let o = 2; o < buf.length;) {
    const m = buf.readUInt16BE(o), len = buf.readUInt16BE(o + 2);
    if (m >= 0xffc0 && m <= 0xffcf && m !== 0xffc4 && m !== 0xffc8 && m !== 0xffcc) return { h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7) };
    o += 2 + len;
  }
  return null;
}

test('every Rand id has a fast-start clip under the 11 s cap and a small poster', () => {
  assert.deepEqual([...RAND_IDS], ['R1', 'R2', 'R3']);
  for (const id of RAND_IDS) {
    const mp4 = RAND_BASE + id + '.mp4', jpg = RAND_BASE + id + '.jpg';
    assert.ok(existsSync(mp4) && existsSync(jpg), id);
    const buf = readFileSync(mp4), top = boxes(buf).map(b => b.type);
    assert.ok(top.indexOf('moov') >= 0 && top.indexOf('moov') < top.indexOf('mdat'), `${id} faststart ${top}`);
    const dur = mvhdSeconds(buf);
    assert.ok(dur >= 5 && dur < 11, `${id} ${dur}`);
    const p = readFileSync(jpg), size = jpegSize(p);
    assert.ok(statSync(jpg).size <= 64 * 1024, `${id} poster ${statSync(jpg).size}`);
    assert.ok(size && size.w <= 960 && size.h <= 540, `${id} poster ${JSON.stringify(size)}`);
  }
});

test('the shuffle bag draws all three clips before repeating, and never back-to-back across refills', () => {
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const store = new Map(), storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const bag = createBag(storage, rng, RAND_IDS);
  const seq = Array.from({ length: 30 }, () => bag.next());
  for (let i = 0; i < 30; i += 3) assert.deepEqual(seq.slice(i, i + 3).sort(), ['R1', 'R2', 'R3'], seq.join());
  for (let i = 1; i < seq.length; i++) assert.notEqual(seq[i], seq[i - 1], seq.join());
  const stale = createBag({ getItem: () => JSON.stringify({ last: 'R5', rest: ['R4', 'R5'] }), setItem() {} }, rng, RAND_IDS);
  assert.ok(RAND_IDS.includes(stale.next()));
});

test('the randCalls audit line counts the clips and posters and stays inside 7.5 MB', () => {
  const out = execFileSync(process.execPath, ['tools/audit-stage1.mjs'], { encoding: 'utf8' });
  const r = JSON.parse(out.slice(out.indexOf('{'))).cutscenes.randCalls;
  for (const id of RAND_IDS) for (const ext of ['mp4', 'jpg']) assert.ok(r.files.includes(`${RAND_BASE}${id}.${ext}`), id + ext);
  assert.equal(r.status, 'PASS');
  assert.ok(r.bytes <= r.budgetBytes && r.budgetBytes === 7_500_000, String(r.bytes));
});
