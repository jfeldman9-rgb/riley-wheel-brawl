import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { releaseIdleRenderTargets } from '../src/render-resources.js';

// Exercise the actual pinned library without starting Phaser, a DOM, a browser,
// or WebGL. Only the in-memory bundle entrypoint is replaced to expose require.
// An intentional library update must re-audit this private extraction and the
// public DrawingContextPool contract, rather than silently testing stale code.
const source = readFileSync(new URL('../lib/phaser.min.js', import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), '66348b1b5141e49b7d5ebbe688cddcb502eab1cb00f21c538686a5b2c5abe4de');
const entry = 'i(85454)})());';
assert.ok(source.endsWith(entry), 'Unknown pinned Phaser bundle entrypoint');
const sandbox = { module: { exports: {} }, exports: {}, console };
runInNewContext(source.slice(0, -entry.length) + 'i})());', sandbox, { timeout: 1000, filename: 'phaser-pool-contract.vm.js' });
const requirePinned = sandbox.module.exports;
const DrawingContextPool = requirePinned(65656), DrawingContext = requirePinned(87774);

function fixture() {
  const deletedTextures = [], deletedFramebuffers = [];
  const renderer = { gl: { isContextLost: () => false }, contextLost: false, width: 1280, height: 720,
    getMaxTextureSize: () => 8192, renderNodes: { finishBatch() {} },
    deleteTexture: texture => deletedTextures.push(texture),
    deleteFramebuffer: framebuffer => deletedFramebuffers.push(framebuffer) };
  const pool = renderer.drawingContextPool = new DrawingContextPool(renderer, 1000, 1024);
  function context(name, width, height) {
    // Use production release, lock, unlock, and destroy methods. Only allocation
    // is stubbed: these tokens are not real GPU resources or memory measurements.
    return Object.assign(Object.create(DrawingContext.prototype), { renderer, pool, width, height, lastUsed: 0, _locks: [],
      texture: name + ':texture', framebuffer: name + ':framebuffer', state: { bindings: { framebuffer: name + ':framebuffer' } } });
  }
  return { game: { renderer }, pool, context, deletedTextures, deletedFramebuffers };
}

test('same-size cache hits retain older large targets despite maxAge', () => {
  const f = fixture(), old = f.context('old', 2560, 1440), current = f.context('current', 1280, 720);
  old.release(); old.lastUsed = 0; current.release();
  for (let frame = 0; frame < 1000; frame++) {
    const target = f.pool.get(1280, 720); assert.equal(target, current); target.release();
  }
  assert.ok(f.pool.agePool.includes(old));
  assert.equal(f.pool.agePool.length, 2); assert.deepEqual(f.deletedTextures, []);
  assert.equal(releaseIdleRenderTargets(f.game), true);
  assert.equal(f.pool.agePool.length, 0); assert.deepEqual(Object.keys(f.pool.sizePool), []);
  assert.deepEqual(f.deletedTextures, ['old:texture', 'current:texture']);
  assert.deepEqual(f.deletedFramebuffers, ['old:framebuffer', 'current:framebuffer']);
});

test('clearing released targets preserves locked and checked-out contexts', () => {
  const f = fixture(), idle = f.context('idle', 32, 32), locked = f.context('locked', 64, 64), checkedOut = f.context('checked-out', 128, 128);
  idle.release(); locked.lock('filter'); locked.release(); checkedOut.release();
  assert.equal(f.pool.get(128, 128), checkedOut);
  assert.equal(f.pool.agePool.length, 1);
  assert.equal(releaseIdleRenderTargets(f.game), true);
  assert.deepEqual(f.deletedTextures, ['idle:texture']);
  assert.equal(locked.renderer, f.game.renderer); assert.equal(checkedOut.renderer, f.game.renderer);
  assert.equal(locked.texture, 'locked:texture'); assert.equal(checkedOut.texture, 'checked-out:texture');
  checkedOut.release(); locked.unlock('filter', true);
  assert.equal(f.pool.agePool.length, 2);
  releaseIdleRenderTargets(f.game); releaseIdleRenderTargets(f.game);
  assert.deepEqual(f.deletedTextures, ['idle:texture', 'checked-out:texture', 'locked:texture']);
});

test('unavailable or lost renderers are harmless no-ops', () => {
  let clears = 0;
  const pool = { clear() { clears++; } };
  for (const game of [undefined, {}, { renderer: {} }, { renderer: { gl: {}, drawingContextPool: {} } },
    { renderer: { gl: null, drawingContextPool: pool } },
    { renderer: { gl: {}, contextLost: true, drawingContextPool: pool } },
    { renderer: { gl: { isContextLost: () => true }, drawingContextPool: pool } }]) {
    assert.equal(releaseIdleRenderTargets(game), false);
  }
  assert.equal(clears, 0);
  assert.equal(releaseIdleRenderTargets({ renderer: { gl: {}, drawingContextPool: pool } }), true);
  assert.equal(clears, 1);
});
