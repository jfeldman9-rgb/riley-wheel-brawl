import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '' }; globalThis.window = { devicePixelRatio: 1 };
const { Fighter } = await import('../src/fighter.js');
function fighter(state, spriteAlpha, z = 0) {
  const f = Object.create(Fighter.prototype), shadow = { setPosition() { return this; }, setDepth() { return this; },
    setAlpha(value) { this.alpha = value; return this; }, setScale() { return this; } };
  Object.assign(f, { state, z, x: 300, y: 630, shudder: 0, def: { shadowW: 120 },
    sprite: { alpha: spriteAlpha, setDepth() {} }, shadow });
  return f;
}
test('sync preserves the intended corpse shadow fade instead of resetting it to full opacity', () => {
  const f = fighter('dead', 0.5); f.sync(); assert.equal(f.shadow.alpha, 0.4);
  f.sprite.alpha = 0; f.sync(); assert.equal(f.shadow.alpha, 0);
});
test('live Riley invulnerability flicker does not flicker the ground shadow', () => {
  const f = fighter('idle', 0.45); f.sync(); assert.equal(f.shadow.alpha, 0.9);
});
test('airborne shadow height fading is unchanged outside the corpse state', () => {
  const f = fighter('air', 1, 250); f.sync(); assert.equal(f.shadow.alpha, 0.45);
});
