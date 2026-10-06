// Stage 4 stand-in for the Stage 3 cutthroat sheet, which is still a labelled
// grey card. Frames stay on the existing atlas so hitboxes and anim keys do not move.
// Riley's grabbed/escape clips are copied from clips Stage 4 already loaded.

function alias(anims, name, from, loop) {
  if (anims.exists(name) || !anims.exists(from)) return;
  const src = anims.get(from);
  const frames = [];
  for (const fr of src?.frames || []) {
    const frame = fr.frame || fr;
    const key = frame.texture?.key || frame.textureKey;
    const id = frame.name ?? frame.textureFrame;
    if (!key || id == null) return;
    frames.push({ key, frame: id, duration: fr.duration });
  }
  if (frames.length) anims.create({ key: name, frames, repeat: loop ? -1 : 0 });
}

export function ensureStage4Anims(scene) {
  const anims = scene?.anims;
  if (!anims || typeof anims.create !== 'function' || typeof anims.get !== 'function') return;
  alias(anims, 'riley_grabbed', 'riley_hurt', true);
  alias(anims, 'riley_escape', 'riley_knockdown', false);
}

function upload(scene, source, canvas) {
  if (!source) return;
  source.image = canvas;
  source.width = canvas.width;
  source.height = canvas.height;
  source.isCanvas = true;
  const renderer = scene.sys?.renderer || scene.game?.renderer;
  if (renderer?.createCanvasTexture) source.glTexture = renderer.createCanvasTexture(canvas, false, !!source.flipY);
}

function pose(name) {
  const kind = name.split('_')[1] || 'walk';
  const i = Number(name.slice(-2)) || 0;
  if (kind === 'knockdown') return { down: 1 - i * 0.28, lean: -20 };
  if (kind === 'getup') return { crouch: i === 0 ? 28 : 10, lean: -6 };
  if (kind === 'hurt' || kind === 'shoved') return { lean: -16, arm: -0.6, step: 0 };
  if (kind === 'dazed') return { lean: -4, arm: -0.2, sway: 1 };
  if (kind === 'lunge') return { lean: 8 + i * 4, arm: i > 1 ? 1 : 0.3, step: 1 };
  if (kind === 'slash' || kind === 'grabthrow') return { lean: 12, arm: i >= 2 ? 1 : 0.2, step: 0 };
  if (kind === 'hold') return { lean: 6, arm: 0.45, grab: 1, step: 0 };
  const step = i % 2 ? 1 : -1;
  return { lean: kind === 'flee' ? -10 : 4, arm: 0, step, flee: kind === 'flee' };
}

function limb(g, x0, y0, x1, y1, w, color) {
  g.strokeStyle = color;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
}

function drawThug(g, w, h, spec) {
  const cx = w * 0.48 + (spec.lean || 0) * 0.15;
  const foot = h - 10;
  const crouch = spec.crouch || 0;
  const hip = foot - 46 + crouch * 0.35;
  const shoulder = foot - 118 + crouch;
  if (spec.down) {
    g.strokeStyle = '#1a1618';
    g.lineWidth = 16;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - 40, foot - 18);
    g.quadraticCurveTo(cx, foot - 36 * spec.down, cx + 42, foot - 10);
    g.stroke();
    g.fillStyle = '#d7b39a';
    g.beginPath();
    g.arc(cx - 48, foot - 22, 11, 0, 6.3);
    g.fill();
    g.fillStyle = '#141214';
    g.fillRect(cx - 58, foot - 30, 18, 7);
    return;
  }
  const step = spec.step || 0;
  limb(g, cx - 8, hip, cx - 16 - step * 10, hip + 22, 9, '#241c1e');
  limb(g, cx - 16 - step * 10, hip + 22, cx - 12 - step * 14, foot, 7, '#3a3032');
  limb(g, cx + 8, hip, cx + 14 + step * 8, hip + 20, 9, '#1c1618');
  limb(g, cx + 14 + step * 8, hip + 20, cx + 18 + step * 12, foot, 7, '#2c2426');
  g.fillStyle = '#4a1e28';
  g.beginPath();
  g.moveTo(cx - 22, shoulder + 16);
  g.lineTo(cx - 26 - step * 2, foot - 6);
  g.lineTo(cx + 24, foot - 4);
  g.lineTo(cx + 20, shoulder + 10);
  g.quadraticCurveTo(cx, shoulder - 8, cx - 22, shoulder + 16);
  g.fill();
  g.fillStyle = '#2a2428';
  g.fillRect(cx - 16, shoulder + 8, 30, hip - shoulder - 6);
  g.strokeStyle = '#6e5a42';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx - 18, foot - 4);
  g.lineTo(cx + 20, foot - 2);
  g.stroke();
  const ax = cx + 18 + (spec.arm || 0) * 28;
  const ay = shoulder + 28 - (spec.arm || 0) * 36;
  limb(g, cx + 10, shoulder + 16, ax, ay, 6, '#d7b39a');
  g.strokeStyle = '#5c4030';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(ax + 8, ay + (spec.grab ? 16 : 22));
  g.stroke();
  g.fillStyle = '#141214';
  g.beginPath();
  g.moveTo(cx - 16, shoulder + 4);
  g.quadraticCurveTo(cx, shoulder - 28, cx + 18, shoulder + 2);
  g.lineTo(cx + 14, shoulder + 16);
  g.lineTo(cx - 12, shoulder + 16);
  g.fill();
  g.fillStyle = '#1a1614';
  g.fillRect(cx - 18, shoulder - 8, 36, 8);
  g.fillStyle = '#d7b39a';
  g.beginPath();
  g.ellipse(cx + 1, shoulder + 6, 9, 11, 0, 0, 6.3);
  g.fill();
  g.fillStyle = '#6a3030';
  g.fillRect(cx - 2, shoulder + 4, 7, 2);
  g.fillStyle = '#1a1214';
  g.fillRect(cx - 5, shoulder + 2, 4, 2);
  g.fillRect(cx + 3, shoulder + 2, 4, 2);
  if (spec.sway) {
    g.strokeStyle = 'rgba(220, 200, 140, 0.7)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cx, shoulder - 2, 18, 0.4, 2.2);
    g.stroke();
  }
}

function normalFrom(color) {
  const n = document.createElement('canvas');
  n.width = color.width;
  n.height = color.height;
  const cg = color.getContext('2d');
  const ng = n.getContext('2d');
  const img = cg.getImageData(0, 0, n.width, n.height);
  const out = ng.createImageData(n.width, n.height);
  for (let p = 0; p < img.data.length; p += 4) {
    if (img.data[p + 3] < 24) continue;
    out.data[p] = 128;
    out.data[p + 1] = 128;
    out.data[p + 2] = 255;
    out.data[p + 3] = 255;
  }
  ng.putImageData(out, 0, 0);
  return n;
}

export function paintCutthroats(scene) {
  const texture = scene.textures?.get?.('cutthroat-0');
  const source = texture?.source?.[0];
  const image = source?.image;
  const w = image?.naturalWidth || image?.width || 0;
  const h = image?.naturalHeight || image?.height || 0;
  if (!w || !h || typeof texture.getFrameNames !== 'function') return;
  const names = texture.getFrameNames().filter(name => name.startsWith('cutthroat_'));
  if (!names.length) return;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  for (const name of names) {
    const frame = texture.get(name);
    const x = frame?.cutX ?? frame?.x;
    const y = frame?.cutY ?? frame?.y;
    const fw = frame?.cutWidth ?? frame?.width;
    const fh = frame?.cutHeight ?? frame?.height;
    if (x == null || !fw || !fh) continue;
    g.save();
    g.beginPath();
    g.rect(x, y, fw, fh);
    g.clip();
    g.translate(x, y);
    drawThug(g, fw, fh, pose(name));
    g.restore();
  }
  upload(scene, source, canvas);
  const normal = normalFrom(canvas);
  for (const extra of texture.dataSource || []) upload(scene, extra, normal);
  const flipped = scene.textures.get?.('cutthroat-0_nl');
  if (flipped?.source?.[0]) upload(scene, flipped.source[0], normal);
}
