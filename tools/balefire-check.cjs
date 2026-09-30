'use strict';
// Run with `node tools/balefire-check.cjs` after installing @napi-rs/canvas.
// Uses the real runtime renderer in offline Canvas; no browser or game server.
// Chromium release checks remain independent and mandatory.
const assert = require('assert');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const { boot } = require('./soak.cjs');
const R = boot(path.resolve(__dirname, '..'));

try {
  // Beam polish is confined to drawing: the original lane, damage, lifetime
  // and 32u visible strip remain intact, and neither random stream is used.
  const strike = new R.ShadowStrike({}, 320, 140, {
    source: 'DARK BALEFIRE', tell: 0, beamStartX: 590, beamEndX: 50, beamY: 90,
    w: 580, h: 90, depth: 17, damage: 23, duration: .36,
  });
  strike.age = .15;
  const snapshot = () => JSON.stringify(Object.fromEntries(Object.entries(strike).filter(([key]) => key !== 'g')));
  const before = snapshot(), beamCanvas = createCanvas(640, 220), beamCtx = beamCanvas.getContext('2d');
  let baked = 0;
  const stamp = R.effects.stamp;
  R.effects.stamp = function(key, paint, ...size) {
    return stamp.call(this, key, (...args) => { baked++; paint(...args); }, ...size);
  };
  R.__setRandom(() => { throw new Error('Beam rendering consumed gameplay RNG'); });
  R.util.fxRand = () => { throw new Error('Beam rendering consumed effect RNG'); };
  const imagesDrawn = [], composites = [], blit = beamCtx.drawImage.bind(beamCtx);
  beamCtx.drawImage = (...args) => { imagesDrawn.push(args); composites.push({ mode: beamCtx.globalCompositeOperation, alpha: beamCtx.globalAlpha }); blit(...args); };
  strike.draw(beamCtx, 0);
  const coreBlit = imagesDrawn[0], texture = coreBlit[0];
  assert.strictEqual(composites[0].mode, 'source-over', 'dark core is never additive');
  assert(Math.abs(composites[0].alpha - .96) < .005, 'beam uses original .96 opacity');
  assert.deepStrictEqual(coreBlit.slice(1), [50, 74, 540, 32], 'beam placement and height are preserved');
  assert.strictEqual(texture.width, 136);
  assert.strictEqual(texture.height, 64);
  const alpha = x => texture.getContext('2d').getImageData(x, 32, 1, 1).data[3];
  assert(alpha(0) < 32 && alpha(135) < 32, 'beam texture tapers at both ends');
  assert.strictEqual(alpha(68), 255, 'cached beam core retains original full opacity');
  const core = Array.from(beamCtx.getImageData(320, 90, 1, 1).data);
  assert(core[0] < 40 && core[1] < 20 && core[2] < 45 && core[3] >= 240, 'rendered beam retains a dark opaque heart');
  const initialBakes = baked;
  for (let i = 0; i < 12; i++) {
    beamCtx.clearRect(0, 0, 640, 220);
    strike.draw(beamCtx, 17.5);
  }
  assert.strictEqual(baked, initialBakes, 'warmed beam does not allocate new effect textures');
  assert.strictEqual(snapshot(), before, 'beam drawing does not change strike simulation');
  console.log('PASS Taim beam cached taper, original placement/opacity, no RNG or simulation mutation ' + JSON.stringify({ core, baked }));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
