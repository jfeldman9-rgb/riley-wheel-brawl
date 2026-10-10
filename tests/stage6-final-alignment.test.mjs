import './helpers/install-location.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GrayMan } from '../src/grayman.js';

function display() {
  const o = { setPosition(x,y) { this.x=x; this.y=y; return this; }, setScale(v) { this.scale=v; return this; }, setOrigin() { return this; },
    setFrame() { return this; }, setAlpha() { return this; }, setDepth() { return this; }, setVisible() { return this; }, destroy() {} };
  return o;
}
for (const facing of [-1,1]) test(`painted Gray Man knife glint lies on the attack blade facing ${facing}`, () => {
  const s = { textures: { exists: () => true, get: () => ({ source: [{ isCanvas:false }] }) }, add: { image: display, sprite: display },
    enemies: [], riley: { x:700, y:630 }, lights: { lights: [] } };
  const e = new GrayMan(s, 600, 630); e.state='attack'; e.facing=facing; e.sync();
  const f = JSON.parse(readFileSync('assets/stage6/chars/s6gray.json')).frames['2'];
  // The painted blade tip is 5 px inside the attack rect's right edge, 44 px below its top (verified on the shipped atlas).
  const bladeX = f.spriteSourceSize.x + f.frame.w - 5 - f.sourceSize.w * 0.5;
  const bladeY = f.spriteSourceSize.y + 44 - f.sourceSize.h * 0.96;
  assert.ok(Math.abs((e.glint.x-e.x)*facing-bladeX) <= 10, `glint x ${(e.glint.x-e.x)*facing}, blade x ${bladeX}`);
  assert.ok(Math.abs(e.glint.y-e.y-bladeY) <= 10, `glint y ${e.glint.y-e.y}, blade y ${bladeY}`);
  assert.equal(e.sprite.scale, 1); assert.equal(e.shadow.y, e.y+2);
});

test('code Gray Man retains its original glint offsets and combat dimensions', () => {
  const s = { textures: { exists: () => true, get: () => ({ source: [{ isCanvas:true }] }) }, add: { image: display, sprite: display },
    enemies: [], riley: { x:700, y:630 }, lights: { lights: [] } };
  const e = new GrayMan(s, 600, 630); e.state='attack'; e.facing=1; e.sync();
  assert.equal(e.glint.x, 628); assert.equal(e.glint.y, 552); assert.equal(e.sprite.scale, 3.4); assert.equal(e.def.shadowW, 110);
});

const { Belal } = await import('../src/belal.js');
for (const facing of [-1,1]) for (const hitI of [0,1,2,3]) test(`painted Be'lal flurry ${hitI} streak follows the visible blade facing ${facing}`, () => {
  const s = { textures: { exists: () => true, get: () => ({ source: [{ isCanvas:false }] }) }, add: { image: display, sprite: display }, enemies: [] };
  const e = new Belal(s,600,630); e.state='attack'; e.hitI=hitI; e.st=0.1; e.facing=facing; e.sync();
  // Blade-centre samples from the shipped atlas, converted through each frame's sourceSize and trim registration.
  const f = JSON.parse(readFileSync('assets/stage6/chars/s6belal.json')).frames[String(1+Math.min(2,hitI))];
  const sample = [[217,45],[158,80],[100,28]][Math.min(2,hitI)];
  const bladeX = f.spriteSourceSize.x + sample[0] - f.sourceSize.w * 0.5;
  const bladeY = f.spriteSourceSize.y + sample[1] - f.sourceSize.h * 0.96;
  assert.ok(Math.abs((e.streak.x-e.x)*facing-bladeX)<=10, `streak x ${(e.streak.x-e.x)*facing}, blade x ${bladeX}`);
  assert.ok(Math.abs(e.streak.y-e.y-bladeY)<=10, `streak y ${e.streak.y-e.y}, blade y ${bladeY}`);
});
