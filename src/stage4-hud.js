// Croon arc and kiss-mash hint. Drawn by the shared HUD; the bytes live here so
// they sit in the Stage 4 source budget rather than the Stage 1 pre-fight sum.
import { clamp } from './config.js';
import { drawStage5Meters } from './stage5-hud.js';
const clamp01 = v => clamp(v, 0, 1);
const FILL = {};

export function croonArc(s, out = {}) {
  const b = s?.boss;
  if (!s || s.stageNo !== 4 || !b || !b.alive || b.state !== 'croon') return null;
  out.fill = clamp01((b.st || 0) / 2.5);
  return out;
}

export function kissHint(s) {
  const R = s?.riley;
  if (!R || R.state !== 'grabbed' || R.grabbedBy?.type !== 'draghkar') return null;
  return 'MASH ATTACK';
}

export function drawStage4Meters(s, g) {
  if (s?.stageNo === 5) return drawStage5Meters(s, g);
  if (!s || s.stageNo !== 4 || !g || !s.riley) return;
  const arc = croonArc(s, FILL);
  if (arc) {
    const R = s.riley, x = R.x - (s.camX || 0), y = R.y - 250;
    g.lineStyle?.(4, 0x143018, 0.8);
    g.strokeCircle?.(x, y, 34);
    if (arc.fill > 0) {
      g.lineStyle?.(4, 0xd8ff6a, 0.95);
      g.beginPath?.();
      g.arc?.(x, y, 34, -Math.PI / 2, -Math.PI / 2 + arc.fill * Math.PI * 2, false);
      g.strokePath?.();
    }
  }
  const hint = kissHint(s);
  const hud = s.hud;
  if (hint && hud?.add?.text) {
    if (!hud.kissHintT) hud.kissHintT = hud.add.text(640, 86, hint, { fontFamily: 'sans-serif', fontSize: '16px', color: '#d8ff6a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(5000);
    hud.kissHintT.setText(hint).setVisible(true);
  } else if (hud?.kissHintT?.setVisible) hud.kissHintT.setVisible(false);
}
