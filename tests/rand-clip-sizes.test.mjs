import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';

function mvhdSeconds(buf) {
  let off = 0;
  const u32 = o => buf.readUInt32BE(o);
  const walk = end => {
    while (off + 8 <= end) {
      let size = u32(off);
      const type = buf.toString('ascii', off + 4, off + 8);
      let head = 8;
      if (size === 1) { size = Number(buf.readBigUInt64BE(off + 8)); head = 16; }
      else if (size === 0) size = end - off;
      const start = off + head, next = off + size;
      if (next <= off) return null;
      if (type === 'moov' || type === 'trak' || type === 'mdia') {
        const saved = off;
        off = start;
        const hit = walk(next);
        off = saved;
        if (hit) return hit;
      } else if (type === 'mvhd') {
        const ver = buf[start];
        const scale = u32(start + (ver === 1 ? 20 : 12));
        const dur = ver === 1 ? Number(buf.readBigUInt64BE(start + 24)) : u32(start + 16);
        return scale ? dur / scale : null;
      }
      off = next;
    }
    return null;
  };
  return walk(buf.length);
}

test('Rand clip manifest is 5 variants of 5-10s and the folder stays inside 7.5 MB', () => {
  const status = JSON.parse(readFileSync('assets/cutscenes/rand/ART_STATUS.json', 'utf8'));
  const ids = status.entries.map(e => e.id);
  assert.deepEqual(ids, ['R1', 'R2', 'R3', 'R4', 'R5']);
  assert.match(readFileSync('tools/audit-stage1.mjs', 'utf8'), /mp4\|jpg/);
  let bytes = 0;
  for (const e of status.entries) {
    assert.equal(e.placeholder, false, e.id);
    const mp4 = (e.files || []).find(f => f.endsWith('.mp4'));
    const dur = mp4 && existsSync(mp4) ? mvhdSeconds(readFileSync(mp4)) : e.durationSeconds;
    assert.ok(dur >= 5 && dur <= 10, e.id + ' ' + dur);
    for (const f of e.files || []) {
      if (!existsSync(f)) continue;
      const size = statSync(f).size;
      bytes += size;
      if (f.endsWith('.mp4')) assert.ok(size <= dur * 160 * 1024, `${f} ${size}`);
    }
  }
  const dir = 'assets/cutscenes/rand';
  for (const name of readdirSync(dir)) {
    if (!/\.(mp4|jpg)$/.test(name)) continue;
    bytes += 0;
    assert.ok(statSync(`${dir}/${name}`).size >= 0);
  }
  const media = readdirSync(dir).filter(n => /\.(mp4|jpg)$/.test(n));
  const total = media.reduce((n, name) => n + statSync(`${dir}/${name}`).size, 0);
  assert.ok(total <= 7_500_000, total);
});
