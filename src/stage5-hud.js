// Stage 5 readouts inside the existing HUD. Drawn from the Stage 4 meter hook.
import { clamp } from './config.js';
const u = v => clamp(v, 0, 1);

export function surgeArc(s) {
  const a = s?.kit?.arena?.surge;
  if (!s || s.stageNo !== 5 || !a) return null;
  if (a.phase === 'tell') return { fill: u((a.st || 0) / 1.2), hot: false };
  if (a.phase === 'hot') return { fill: 1, hot: true };
  return null;
}
export function tetherLine(s) {
  const b = s?.boss;
  if (!s || s.stageNo !== 5 || !b || b.state !== 'tether' || !s.riley) return null;
  return { x0: b.x, y0: b.y - 90, x1: s.riley.x, y1: s.riley.y - 50, locked: !!b.locked };
}
export function snareRing(s) {
  const left = Math.max(s?.kit?.blight?.snare || 0, s?.kit?.arena?.snare || 0);
  if (!s?.riley || left <= 0) return null;
  return { x: s.riley.x, y: s.riley.y, t: left, max: 1.2 };
}
export function balthBar(s) {
  const b = s?.enemies?.find(e => e.type === 'balthamel' && (e.alive || e.state === 'vines') && e.state !== 'dead' && e.hp > 0);
  if (!s || s.stageNo !== 5 || !b || b.state === 'vines') return null;
  return { hp: b.hp, max: b.maxHp || 220 };
}
export function mashHint(s) {
  const R = s?.riley;
  if (!R || R.state !== 'grabbed' || R.grabbedBy?.type !== 'balthamel') return null;
  return 'MASH ATTACK';
}
export function drawStage5Meters(s, g) {
  if (!s || s.stageNo !== 5 || !g || !s.riley) return;
  const cam = s.camX || 0, boss = s.boss;
  const arc = surgeArc(s);
  if (arc && boss) {
    const x = boss.x - cam, y = boss.y - 210;
    g.lineStyle?.(4, arc.hot ? 0xffe090 : 0x3a2818, 0.95);
    g.beginPath?.();
    g.arc?.(x, y, 36, -Math.PI / 2, -Math.PI / 2 + arc.fill * Math.PI * 2, false);
    g.strokePath?.();
  }
  const line = tetherLine(s);
  if (line) {
    g.lineStyle?.(3, 0x8fbf78, line.locked ? 0.95 : 0.4);
    g.beginPath?.();
    g.moveTo?.(line.x0 - cam, line.y0);
    g.lineTo?.(line.x1 - cam, line.y1);
    g.strokePath?.();
  }
  if (boss?.locked) {
    g.fillStyle?.(0x8fbf78, 0.45);
    g.fillRect?.(112, 64, 220 * u((s.riley.saidin || 0) / 100), 8);
  }
  const sn = snareRing(s);
  if (sn) {
    g.lineStyle?.(3, 0x6a4030, 0.9);
    g.beginPath?.();
    g.arc?.(sn.x - cam, sn.y + 4, 28, -Math.PI / 2, -Math.PI / 2 + u(sn.t / sn.max) * Math.PI * 2, false);
    g.strokePath?.();
  }
  const bar = balthBar(s);
  if (bar) {
    g.fillStyle?.(0x140c10, 0.9); g.fillRect?.(560, 64, 500, 6);
    g.fillStyle?.(0xc06040, 1); g.fillRect?.(560, 64, 500 * Math.max(0, bar.hp) / bar.max, 6);
  }
  const hint = mashHint(s), hud = s.hud;
  if (hint && hud?.add?.text) {
    if (!hud.s5Hint) hud.s5Hint = hud.add.text(640, 86, hint, { fontFamily: 'sans-serif', fontSize: '16px', color: '#d8ff6a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(5000);
    hud.s5Hint.setText(hint).setVisible(true);
  } else hud?.s5Hint?.setVisible?.(false);
}
