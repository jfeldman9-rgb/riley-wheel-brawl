#!/usr/bin/env node
'use strict';
// Size the approved street plates offline. Raw sources stay in assets/art/newplates.
// Run: npx --yes -p sharp node tools/prep-plates.cjs
// sharp is not a project dependency. Do not commit node_modules.
let sharp;
try { sharp = require('sharp'); }
catch (e) {
  console.error('Run with: npx --yes -p sharp node tools/prep-plates.cjs');
  process.exit(1);
}
const path = require('path');
const root = path.resolve(__dirname, '..');

const PLATES = [
  { name: 'stage1-mid-b', scale: 1.146, outW: 2196, outH: 941, ground: 700 },
  { name: 'stage1-mid-c', scale: 0.613, outW: 1672, outH: 941, ground: 700 },
  { name: 'stage2-mid-b', scale: 1.080, outW: 2070, outH: 887, ground: 800 },
  { name: 'stage2-mid-c', scale: 0.645, outW: 1774, outH: 887, ground: 800 },
  { name: 'stage3-mid-b', scale: 1.080, outW: 2070, outH: 887, ground: 800 },
  { name: 'stage3-mid-c', scale: 0.645, outW: 1774, outH: 887, ground: 800 },
  { name: 'stage4-mid-b', scale: 1.061, outW: 2172, outH: 724, ground: 570 },
  { name: 'stage4-transition-bc', scale: 1.061, outW: 2172, outH: 724, ground: 570 },
  { name: 'stage4-mid-c', scale: 0.872, outW: 2400, outH: 724, ground: 570 },
  { name: 'stage4-mid-cont', scale: 1.061, outW: 3667, outH: 724, ground: 570 },
  { name: 'stage5-mid-b', scale: 1.123, outW: 2300, outH: 724, ground: 520 },
  { name: 'stage5-transition-ab', scale: 1.123, outW: 2300, outH: 724, ground: 520 },
  { name: 'stage5-mid-cont', scale: 1.123, outW: 4169, outH: 724, ground: 520 },
  { name: 'stage5-roof-mid', scale: 0.789, outW: 2172, outH: 724, ground: 520 }
];

function edgeScores(data, w, h, ch) {
  const score = new Float64Array(h);
  for (let y = 2; y < h - 2; y++) {
    let s = 0, n = 0;
    for (let x = 0; x < w; x += 4) {
      const i1 = ((y - 2) * w + x) * ch, i2 = ((y + 2) * w + x) * ch;
      if (data[i1 + 3] < 40 || data[i2 + 3] < 40) continue;
      const d = (data[i2] + data[i2 + 1] + data[i2 + 2]) - (data[i1] + data[i1 + 1] + data[i1 + 2]);
      if (d > 30) s += d;
      n++;
    }
    score[y] = n ? s / n : 0;
  }
  const sm = new Float64Array(h);
  for (let y = 6; y < h - 6; y++) {
    let a = 0;
    for (let k = -6; k <= 6; k++) a += score[y + k];
    sm[y] = a / 13;
  }
  return sm;
}

// Strongest street edge that can land on the target row after a top crop.
// Sky and ceiling are cut first. The ground line itself stays in frame.
function measureGround(data, w, h, ch, scale, outH, ground) {
  const sm = edgeScores(data, w, h, ch);
  const needBelow = (outH - ground) / scale - 8;
  const peaks = [];
  let bandY = -1, bandS = -1;
  for (let y = Math.floor(h * 0.35); y < h - 4; y++) {
    const below = h - 1 - y;
    const top = y * scale - ground;
    const placeable = below >= needBelow && top >= -6;
    if (placeable && sm[y] > bandS) { bandS = sm[y]; bandY = y; }
    if (placeable && sm[y] >= sm[y - 1] && sm[y] >= sm[y + 1] && sm[y] >= sm[y - 3] && sm[y] > 8) peaks.push({ y, s: sm[y] });
  }
  const best = peaks.reduce((m, p) => Math.max(m, p.s), 0);
  const keep = peaks.filter(p => p.s >= best * 0.5);
  keep.sort((a, b) => b.y - a.y);
  const chosen = keep[0] || { y: bandY < 0 ? Math.round(ground / scale) : bandY, s: bandS };
  return chosen.y;
}

function edgeLuminance(data, w, h, ch) {
  const lum = (x0, x1) => {
    let s = 0, n = 0;
    for (let x = x0; x < x1; x++) {
      for (let y = 0; y < h; y += 2) {
        const i = (y * w + x) * ch;
        if (data[i + 3] < 16) continue;
        s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        n++;
      }
    }
    return n ? s / n : 0;
  };
  const edge = Math.min(80, Math.floor(w / 2));
  return { left: lum(0, edge), right: lum(w - edge, w) };
}

(async () => {
  for (const spec of PLATES) {
    const srcPath = path.join(root, 'assets/art/newplates', spec.name + '.png');
    const src = sharp(srcPath);
    const meta = await src.metadata();
    const { data, info } = await src.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const measured = measureGround(data, info.width, info.height, info.channels, spec.scale, spec.outH, spec.ground);
    const sw = Math.max(spec.outW, Math.round(meta.width * spec.scale));
    const uniform = sw / meta.width;
    const sh = Math.max(spec.outH, Math.round(meta.height * uniform));
    let top = Math.round(measured * (sh / meta.height) - spec.ground);
    const maxTop = sh - spec.outH;
    top = Math.max(0, Math.min(maxTop, top));
    const left = Math.max(0, Math.min(sw - spec.outW, Math.round((sw - spec.outW) / 2)));
    const outGround = Math.round(measured * (sh / meta.height) - top);
    const scaled = await sharp(srcPath).resize(sw, sh, { fit: 'fill', kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
    const cropped = await sharp(scaled, { raw: { width: sw, height: sh, channels: 4 } })
      .extract({ left, top, width: spec.outW, height: spec.outH })
      .webp({ quality: 90, alphaQuality: 100, lossless: false, smartSubsample: false, effort: 4 })
      .toBuffer();
    const outPath = path.join(root, 'assets/art', spec.name + '.webp');
    await sharp(cropped).toFile(outPath);
    const outMeta = await sharp(outPath).metadata();
    const outRaw = await sharp(outPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const edges = edgeLuminance(outRaw.data, outRaw.info.width, outRaw.info.height, outRaw.info.channels);
    const bottomCut = sh - top - spec.outH;
    console.log([
      spec.name,
      'src ' + meta.width + 'x' + meta.height,
      'scale ' + spec.scale,
      'scaled ' + sw + 'x' + sh,
      'crop top ' + top + ' left ' + left + ' bottom ' + bottomCut,
      'out ' + outMeta.width + 'x' + outMeta.height,
      'ground src ' + measured + ' -> row ' + outGround + ' (target ' + spec.ground + ')',
      'edgeL ' + edges.left.toFixed(1) + ' / ' + edges.right.toFixed(1)
    ].join(' | '));
    if (outMeta.width !== spec.outW || outMeta.height !== spec.outH) {
      throw new Error(spec.name + ' size mismatch');
    }
  }
})().catch(error => { console.error(error); process.exit(1); });
