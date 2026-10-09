// Riley's voice: ElevenLabs takes re-recorded 2026-10-09, approved by Jason F via Grok Bot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const json = p => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const man = json('assets/audio/riley-voice-manifest.json');
const NOTE = 're-recorded 2026-10-09, approved by Jason F via Grok Bot';

test('every Riley line is an ElevenLabs eleven_v4 take with its prompt, generation id and file hash', () => {
  assert.equal(man.model, 'eleven_v4');
  assert.equal(man.voice_id, 'JjsQrIrIBD6TZ656NQfi');
  assert.equal(man.note, NOTE);
  assert.ok(man.lines.length >= 52);
  const ids = new Set();
  for (const l of man.lines) {
    assert.ok(!ids.has(l.id), l.id); ids.add(l.id);
    assert.equal(l.engine, 'elevenlabs', l.id);
    assert.equal(l.model, 'eleven_v4', l.id);
    assert.equal(l.note, NOTE, l.id);
    assert.match(l.generation_id, /^[A-Za-z0-9]{20}$/, l.id);
    assert.ok(l.prompt && !/\[quietly\]/.test(l.prompt), l.id);
    assert.ok((l.prompt.match(/\[[^\]]+\]/g) || []).length <= 1, `${l.id} has at most one tag`);
    assert.equal(l.voice_id, l.id === 'riley_super_01' ? 'QZ1okeFI43NQd6lXAzQ5' : man.voice_id, l.id);
    const bytes = readFileSync(resolve(root, l.asset_path));
    assert.equal(bytes.length, l.bytes, l.id);
    assert.ok(bytes.length > 2048 && bytes.length < 200 * 1024, l.id);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), l.sha256, l.id);
  }
});

test('the stage voice manifests point Riley at the same ElevenLabs cast and hashes', () => {
  const byId = new Map(man.lines.map(l => [l.id, l]));
  for (const name of ['power', 'stage2', 'stage3', 'stage4']) {
    const m = json(`assets/audio/${name}-voice-manifest.json`);
    assert.deepEqual(m.cast.riley, man.cast, name);
    for (const l of m.lines.filter(r => r.who === 'riley')) {
      const r = byId.get(l.id);
      assert.ok(r, `${name}:${l.id} in the Riley manifest`);
      assert.equal(l.sha256, r.sha256, `${name}:${l.id}`);
      assert.equal(l.generation_id, r.generation_id, `${name}:${l.id}`);
      assert.equal(l.note, NOTE, `${name}:${l.id}`);
    }
  }
  const prov = readFileSync(resolve(root, 'assets/audio/VOICE_PROVENANCE.md'), 'utf8');
  assert.ok(prov.includes(NOTE));
  assert.ok(prov.includes('JjsQrIrIBD6TZ656NQfi'));
});

test('the Riley TTS tool exits without writing voice files when the ElevenLabs key is missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'riley-tts-'));
  try {
    const r = spawnSync('python3', ['tools/riley_voice.py', dir], { cwd: root, encoding: 'utf8', env: { ...process.env, ELEVENLABS_API_KEY: '' } });
    assert.notEqual(r.status, 0);
    assert.match(`${r.stdout}\n${r.stderr}`, /No voice files were written/);
    assert.equal(readdirSync(dir).filter(n => n.endsWith('.mp3')).length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
