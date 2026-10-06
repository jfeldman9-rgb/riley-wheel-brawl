// Mashadar: soft banks, tapering tendrils, flaring cracks, churning walls, a bolt.
import { tex, sheet } from './stage4-art.js';

function puff(g, w, h, core, mid, edge) {
  const rad = g.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w * 0.48);
  rad.addColorStop(0, core);
  rad.addColorStop(0.35, mid);
  rad.addColorStop(1, edge);
  g.fillStyle = rad;
  g.beginPath();
  g.ellipse(w / 2, h / 2, w * 0.48, h * 0.44, 0, 0, 6.3);
  g.fill();
}

function crack(g, w, h, hot) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#3a342c';
  g.beginPath();
  g.moveTo(2, h * 0.62);
  g.lineTo(w * 0.22, h * 0.5);
  g.lineTo(w * 0.55, h * 0.58);
  g.lineTo(w - 2, h * 0.48);
  g.lineTo(w - 2, h - 2);
  g.lineTo(2, h - 2);
  g.fill();
  g.strokeStyle = '#1c1814';
  g.lineWidth = 1;
  g.stroke();
  const glow = g.createRadialGradient(w / 2, h * 0.62, 2, w / 2, h * 0.62, w * (hot ? 0.6 : 0.4));
  glow.addColorStop(0, hot ? 'rgba(230,255,170,0.95)' : 'rgba(140,220,100,0.45)');
  glow.addColorStop(1, 'rgba(40,80,30,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = hot ? '#f4ffc8' : '#7dcc62';
  g.lineWidth = hot ? 3 : 1.6;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(w * 0.12, h * 0.7);
  g.lineTo(w * 0.3, h * 0.42);
  g.lineTo(w * 0.46, h * 0.74);
  g.lineTo(w * 0.66, h * 0.36);
  g.lineTo(w * 0.88, h * 0.64);
  g.stroke();
  if (hot) {
    g.strokeStyle = 'rgba(255,255,210,0.8)';
    g.lineWidth = 1;
    g.stroke();
  }
}

function bank(g, w, h, phase) {
  for (let i = 0; i < 7; i++) {
    const y = 8 + (i / 6) * (h - 16);
    const x = w * 0.42 + Math.sin(i * 1.3 + phase) * 6;
    const puffG = g.createRadialGradient(x, y, 2, x, y, w * 0.62);
    puffG.addColorStop(0, 'rgba(210,235,200,0.2)');
    puffG.addColorStop(0.55, 'rgba(36,84,48,0.45)');
    puffG.addColorStop(1, 'rgba(8,24,14,0)');
    g.fillStyle = puffG;
    g.beginPath();
    g.ellipse(x, y, w * 0.5, 16 + (i % 3) * 4, 0, 0, 6.3);
    g.fill();
  }
  const edge = g.createLinearGradient(w * 0.55, 0, w, 0);
  edge.addColorStop(0, 'rgba(180,255,160,0)');
  edge.addColorStop(0.55, 'rgba(220,255,190,0.82)');
  edge.addColorStop(1, 'rgba(255,255,230,0.08)');
  g.fillStyle = edge;
  g.fillRect(0, 4, w, h - 8);
}

function tower(g, w, h, dust) {
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.beginPath();
  g.ellipse(w / 2, h - 8, 28, 6, 0, 0, 6.3);
  g.fill();
  g.fillStyle = '#6e675c';
  g.beginPath();
  g.moveTo(34, h - 16);
  g.lineTo(40, 70);
  g.lineTo(36, 44);
  g.lineTo(52, 22);
  g.lineTo(48, 48);
  g.lineTo(66, 16);
  g.lineTo(74, 46);
  g.lineTo(88, 30);
  g.lineTo(90, h - 16);
  g.closePath();
  g.fill();
  g.fillStyle = '#5a554c';
  g.fillRect(44, 56, 30, h - 78);
  g.fillStyle = '#7c756a';
  g.fillRect(46, 56, 8, h - 80);
  g.strokeStyle = '#3a342e';
  g.lineWidth = 1;
  for (let y = 70; y < h - 30; y += 16) {
    g.beginPath(); g.moveTo(44, y); g.lineTo(74, y + 2); g.stroke();
  }
  g.strokeStyle = '#2a2620';
  g.beginPath();
  g.moveTo(52, 40); g.lineTo(58, h - 28);
  g.moveTo(68, 36); g.lineTo(62, h - 36);
  g.stroke();
  g.fillStyle = '#14120e';
  g.fillRect(50, 78, 8, 14);
  g.fillRect(64, 108, 8, 14);
  g.fillRect(52, 150, 8, 16);
  g.fillStyle = 'rgba(160,255,140,0.35)';
  g.fillRect(66, 112, 4, 6);
  if (dust) {
    g.fillStyle = 'rgba(220,210,186,0.8)';
    for (let i = 0; i < 18; i++) {
      const x = 28 + (i * 11) % 62;
      const y = 16 + (i * 23) % (h - 36);
      g.fillRect(x, y, 3, 10 + (i % 4) * 2);
    }
    g.fillStyle = 'rgba(180,170,150,0.35)';
    g.beginPath();
    g.ellipse(w / 2, h - 22, 30, 10, 0, 0, 6.3);
    g.fill();
  }
}

export function paintFog(scene) {
  tex(scene, 's4tip', 48, 48, (g, w, h) => {
    puff(g, w, h, 'rgba(255,255,220,1)', 'rgba(190,255,110,0.75)', 'rgba(80,180,40,0)');
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(w / 2, h / 2, 3, 0, 6.3); g.fill();
  });
  tex(scene, 's4seg', 40, 40, (g, w, h) => puff(g, w, h, 'rgba(210,235,190,0.8)', 'rgba(70,150,80,0.4)', 'rgba(20,50,28,0)'));
  tex(scene, 's4fog', 220, 90, (g, w, h) => {
    puff(g, w, h, 'rgba(220,240,220,0.55)', 'rgba(90,170,110,0.42)', 'rgba(16,36,22,0)');
    puff(g, w * 0.62, h * 0.9, 'rgba(236,245,230,0.4)', 'rgba(140,190,150,0.28)', 'rgba(16,36,22,0)');
  });
  tex(scene, 's4bolt', 32, 32, (g, w, h) => {
    puff(g, w, h, 'rgba(255,255,230,1)', 'rgba(160,255,90,0.8)', 'rgba(40,140,20,0)');
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(w / 2, h / 2, 2.5, 0, 6.3); g.fill();
  });
  sheet(scene, 's4vent', 2, 96, 48, (g, i, w, h) => crack(g, w, h, i === 1));
  sheet(scene, 's4wall', 2, 72, 180, (g, i, w, h) => bank(g, w, h, i));
  sheet(scene, 's4tower', 2, 120, 260, (g, i, w, h) => tower(g, w, h, i === 1));
  tex(scene, 's4rubble', 110, 48, (g, w, h) => {
    const chunk = (pts, fill, edge) => {
      g.fillStyle = fill;
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath(); g.fill();
      g.strokeStyle = edge; g.lineWidth = 1; g.stroke();
    };
    chunk([[6, 34], [18, 16], [40, 12], [48, 28], [36, 40]], '#6a6358', '#3e3a34');
    chunk([[40, 38], [52, 18], [78, 14], [88, 30], [70, 42]], '#847c70', '#4a453e');
    chunk([[72, 36], [84, 22], [104, 26], [100, 42], [80, 44]], '#534e46', '#2c2924');
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath(); g.moveTo(22, 20); g.lineTo(34, 18); g.lineTo(30, 26); g.fill();
  });
}
