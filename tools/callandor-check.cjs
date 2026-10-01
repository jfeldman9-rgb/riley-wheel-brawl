'use strict';
// Focused renderer regression. Requires @napi-rs/canvas; this is offline
// Canvas evidence, not a substitute for the Chromium release checks.
const assert = require('assert');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { boot } = require('./soak.cjs');
const root = path.resolve(__dirname, '..');

(async () => {
  const R = boot(root);
  const images = {};
  for (const frame of Object.keys(R.RILEY16.frames)) {
    images['riley16-' + frame] = await loadImage(path.join(root, R.ART_FILES['riley16-' + frame]));
  }
  R.assets.get = key => images[key] || null;
  R.assets.has = key => !!images[key];
  const scene = { levelIndex: 4 };
  const player = new R.Riley(scene, { callandor: true });
  Object.assign(player, { x: 160, y: 230, z: 0, ghost: true, state: 'idle' });

  // The wrapped part of the original sword stamp is y=77..89. Its centre,
  // not the collar above it, belongs at the authored idle fist coordinate.
  for (const frame of Object.keys(R.RILEY16.frames)) {
    const calls = [];
    const ctx = createCanvas(640, 360).getContext('2d');
    const drawImage = ctx.drawImage.bind(ctx);
    ctx.drawImage = (...args) => { calls.push(args); drawImage(...args); };
    player.spriteFrame = () => frame;
    player.drawCallandor(ctx, 0);
    assert.strictEqual(calls.length, 1, frame + ' has one cached sword blit');
    assert.strictEqual(calls[0][2], -83, frame + ' sword grip pivot');
  }
  delete player.spriteFrame;

  // At both facings and three render scales, every opaque painted fist pixel
  // must survive the idle sword unchanged. No synthetic hand patch is used.
  const samples = [];
  for (const scale of [1, 2, 3]) for (const facing of [-1, 1]) {
    player.facing = facing;
    const canvases = [false, true].map(callandor => {
      const canvas = createCanvas(640 * scale, 360 * scale);
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      player.callandor = callandor;
      player.draw(ctx, 0);
      return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    });
    const [plain, armed] = canvases, hand = R.RILEY16.hands.idle;
    const cx = (player.x + facing * hand[0]) * scale, cy = (player.y + hand[1]) * scale;
    let opaque = 0, changed = 0;
    for (let y = Math.ceil(cy - 2 * scale); y <= Math.floor(cy + 2 * scale); y++) {
      for (let x = Math.ceil(cx - 2 * scale); x <= Math.floor(cx + 2 * scale); x++) {
        const index = (y * 640 * scale + x) * 4;
        if (plain[index + 3] !== 255) continue;
        opaque++;
        if ([0, 1, 2, 3].some(channel => plain[index + channel] !== armed[index + channel])) changed++;
      }
    }
    assert(opaque >= 8 * scale * scale, 'enough original opaque fist pixels to inspect');
    assert.strictEqual(changed, 0, 'idle sword leaves the painted fist intact');
    samples.push({ scale, facing, opaque, changed });
  }

  // Keep action poses in their existing foreground layer. Only idle changes
  // layer, and it must draw the sword exactly once.
  for (const frame of Object.keys(R.RILEY16.frames)) {
    const order = [], actor = new R.Riley(scene, { callandor: true });
    actor.spriteFrame = () => frame;
    actor.drawShadow = () => {};
    actor.drawSprite = () => { order.push('body'); return true; };
    actor.drawCallandor = () => order.push('sword');
    actor.draw(createCanvas(640, 360).getContext('2d'), 0);
    assert.strictEqual(order.join(','), frame === 'idle' ? 'sword,body' : 'body,sword', frame + ' layer order');
  }
  console.log('PASS Callandor cached pivots and layer order across 19 painted poses');
  console.log('PASS Callandor idle glove pixels ' + JSON.stringify(samples));

})().catch(error => { console.error(error); process.exitCode = 1; });
