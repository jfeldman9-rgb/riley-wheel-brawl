// Stage 5 Riley lines: ElevenLabs DYLO takes, re-recorded 2026-10-09, approved by Jason F via Grok Bot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const json = p => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const NOTE = 're-recorded 2026-10-09, approved by Jason F via Grok Bot';

test('the 10 Stage 5 Riley lines are ElevenLabs DYLO takes whose hashes match the files', () => {
  const man = json('assets/audio/riley-voice-manifest-stage5.json');
  const plan = json('tools/stage5/audio-manifest.json');
  const render = json('tools/stage5/voice-render.json');
  const riley = plan.lines.filter(r => r.speaker === 'RILEY').map(r => r.id).sort();
  assert.equal(riley.length, 10);
  assert.deepEqual(man.lines.map(l => l.id).sort(), riley);
  for (const l of man.lines) {
    assert.equal(l.voice_id, 'JjsQrIrIBD6TZ656NQfi', l.id);
    assert.equal(l.model, 'eleven_v4', l.id);
    assert.equal(l.note, NOTE, l.id);
    assert.equal(plan.lines.find(r => r.id === l.id).engine, 'elevenlabs', l.id);
    const bytes = readFileSync(resolve(root, l.asset_path));
    assert.ok(bytes.length > 2048 && bytes.length < 200 * 1024, l.id);
    const sha = createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha, l.sha256, l.id);
    assert.equal(render.elevenlabs_takes[l.id].sha256, sha, l.id);
    assert.equal(render.elevenlabs_takes[l.id].generation_id, l.generation_id, l.id);
  }
});

test('the Stage 5 Riley renderer exits without writing voice files when the ElevenLabs key is missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 's5-riley-'));
  try {
    const r = spawnSync('python3', ['tools/stage5/render_riley_stage5.py', dir], { cwd: root, encoding: 'utf8', env: { ...process.env, ELEVENLABS_API_KEY: '' } });
    assert.notEqual(r.status, 0);
    assert.match(`${r.stdout}\n${r.stderr}`, /No voice files were written/);
    assert.equal(readdirSync(dir).filter(n => n.endsWith('.mp3')).length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
