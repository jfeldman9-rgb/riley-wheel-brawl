'use strict';
(function () {
  const R = window.RWB;
  const WAVE_POINTS = [360, 820, 1280, 1780, 2280, 2720];
  const WAVE_TABLE = [
    ['axe'],
    ['hound', 'axe'],
    ['spear', 'hound', 'axe'],
    ['hound', 'hound', 'axe', 'spear'],
    ['axe', 'spear', 'hound', 'axe'],
    ['boss']
  ];
  function starNoise(index) {
    const value = Math.sin(index * 127.13) * 43758.5453;
    return value - Math.floor(value);
  }
  function drawSky(ctx, cameraX) {
    const sky = ctx.createLinearGradient(0, 0, 0, 220);
    sky.addColorStop(0, '#050b1d');
    sky.addColorStop(0.55, '#122849');
    sky.addColorStop(1, '#38506a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 640, 230);
    for (let i = 0; i < 55; i += 1) {
      const x = (starNoise(i) * 760 - cameraX * 0.025) % 700;
      const y = 12 + starNoise(i + 80) * 130;
      ctx.fillStyle = i % 7 === 0 ? '#dcefff' : 'rgba(220,235,255,0.65)';
      ctx.fillRect(x < 0 ? x + 700 : x, y, i % 8 === 0 ? 2 : 1, i % 8 === 0 ? 2 : 1);
    }
    const moonX = 510 - cameraX * 0.03;
    const moonGlow = ctx.createRadialGradient(moonX, 55, 5, moonX, 55, 48);
    moonGlow.addColorStop(0, 'rgba(245,249,220,0.95)');
    moonGlow.addColorStop(0.35, 'rgba(230,240,210,0.45)');
    moonGlow.addColorStop(1, 'rgba(210,230,230,0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, 55, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2f2d6';
    ctx.beginPath();
    ctx.arc(moonX, 55, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b1830';
    ctx.beginPath();
    ctx.moveTo(0, 154);
    for (let i = 0; i <= 10; i += 1) {
      const x = i * 90 - (cameraX * 0.08) % 90;
      const y = 112 + starNoise(i + 200) * 55;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(700, 220);
    ctx.lineTo(0, 220);
    ctx.fill();
  }
  function drawHouse(ctx, x, base, scale, inn) {
    const width = 88 * scale;
    const height = 67 * scale;
    ctx.fillStyle = '#382d2a';
    ctx.fillRect(x, base - height, width, height);
    ctx.fillStyle = '#7f6549';
    ctx.beginPath();
    ctx.moveTo(x - 10, base - height + 4);
    ctx.lineTo(x + width * 0.5, base - height - 34 * scale);
    ctx.lineTo(x + width + 12, base - height + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ad9570';
    for (let line = 0; line < 5; line += 1) {
      ctx.beginPath();
      ctx.moveTo(x + line * 7, base - height - line * 3);
      ctx.lineTo(x + width - line * 6, base - height - line * 3);
      ctx.stroke();
    }
    const light = ctx.createRadialGradient(x + width * 0.32, base - 30, 1, x + width * 0.32, base - 30, 28);
    light.addColorStop(0, 'rgba(255,195,82,0.9)');
    light.addColorStop(1, 'rgba(255,140,30,0)');
    ctx.fillStyle = light;
    ctx.fillRect(x, base - 60, width, 60);
    ctx.fillStyle = '#ffd16b';
    ctx.fillRect(x + width * 0.2, base - 43, 17 * scale, 21 * scale);
    ctx.fillRect(x + width * 0.62, base - 43, 17 * scale, 21 * scale);
    ctx.fillStyle = '#201817';
    ctx.fillRect(x + width * 0.44, base - 35, 15 * scale, 35 * scale);
    if (inn) {
      ctx.fillStyle = '#b98a44';
      ctx.fillRect(x + width * 0.2, base - height + 7, width * 0.6, 13);
      R.drawText(ctx, 'WINESPRING INN', x + width * 0.5, base - height + 14, 5, '#24170f', 'center');
    }
  }
  function drawMid(ctx, cameraX) {
    const offset = cameraX * 0.32;
    for (let i = -1; i < 10; i += 1) {
      const x = i * 156 - (offset % 156);
      drawHouse(ctx, x, 229, i % 3 === 0 ? 1.15 : 0.9, i === 2);
      ctx.strokeStyle = '#18211f';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + 124, 219);
      ctx.lineTo(x + 126, 144);
      ctx.moveTo(x + 126, 158);
      ctx.lineTo(x + 104, 137);
      ctx.moveTo(x + 126, 171);
      ctx.lineTo(x + 148, 148);
      ctx.stroke();
    }
  }
  function drawBonfire(ctx, x, y, time) {
    const glow = ctx.createRadialGradient(x, y - 12, 2, x, y - 12, 54);
    glow.addColorStop(0, 'rgba(255,170,50,0.5)');
    glow.addColorStop(1, 'rgba(255,90,10,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 12, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#51311f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 13, y);
    ctx.lineTo(x + 13, y - 10);
    ctx.moveTo(x + 13, y);
    ctx.lineTo(x - 13, y - 10);
    ctx.stroke();
    ctx.fillStyle = '#ffcb42';
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.quadraticCurveTo(x - 15, y - 23, x - 2, y - 39 - Math.sin(time * 9) * 5);
    ctx.quadraticCurveTo(x + 17, y - 21, x, y - 5);
    ctx.fill();
    ctx.fillStyle = '#f16426';
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.quadraticCurveTo(x - 8, y - 20, x + 2, y - 29);
    ctx.quadraticCurveTo(x + 9, y - 17, x, y - 7);
    ctx.fill();
  }
  function drawNear(ctx, cameraX, time) {
    const base = -((cameraX * 0.72) % 250);
    ctx.strokeStyle = '#5b4937';
    ctx.lineWidth = 5;
    for (let i = -1; i < 5; i += 1) {
      const x = base + i * 250;
      ctx.beginPath();
      ctx.moveTo(x, 231);
      ctx.lineTo(x, 277);
      ctx.moveTo(x + 80, 231);
      ctx.lineTo(x + 80, 277);
      ctx.moveTo(x - 10, 241);
      ctx.lineTo(x + 90, 250);
      ctx.moveTo(x - 10, 259);
      ctx.lineTo(x + 90, 267);
      ctx.stroke();
    }
    const fireX = 530 - (cameraX * 0.78) % 820;
    drawBonfire(ctx, fireX, 283, time);
    ctx.strokeStyle = '#4e3929';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(105 - (cameraX * 0.8) % 900, 286, 18, 0, Math.PI * 2);
    ctx.arc(160 - (cameraX * 0.8) % 900, 286, 18, 0, Math.PI * 2);
    ctx.moveTo(105 - (cameraX * 0.8) % 900, 268);
    ctx.lineTo(160 - (cameraX * 0.8) % 900, 268);
    ctx.stroke();
  }
  function drawFloor(ctx, cameraX) {
    const ground = ctx.createLinearGradient(0, 220, 0, 360);
    ground.addColorStop(0, '#89969b');
    ground.addColorStop(0.35, '#596568');
    ground.addColorStop(1, '#303b3d');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 220, 640, 140);
    ctx.fillStyle = 'rgba(221,235,237,0.45)';
    for (let i = -1; i < 14; i += 1) {
      const x = i * 64 - (cameraX % 64);
      ctx.beginPath();
      ctx.ellipse(x, 245 + (i % 3) * 31, 25, 5, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(37,30,27,0.45)';
    for (let i = -1; i < 18; i += 1) {
      const x = i * 46 - (cameraX % 46);
      const y = 272 + (i % 4) * 19;
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 3, 0.4, 0, Math.PI * 2);
      ctx.ellipse(x + 9, y + 7, 6, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  class SnowField {
    constructor() {
      this.flakes = [];
      for (let i = 0; i < 75; i += 1) this.flakes.push({ x: Math.random() * 640, y: Math.random() * 360, speed: 15 + Math.random() * 30, drift: 5 + Math.random() * 12, size: 1 + Math.random() * 2 });
    }
    update(dt) {
      for (const flake of this.flakes) {
        flake.y += flake.speed * dt;
        flake.x += Math.sin(flake.y * 0.025) * flake.drift * dt;
        if (flake.y > 360) {
          flake.y = -4;
          flake.x = Math.random() * 640;
        }
      }
    }
    draw(ctx) {
      ctx.fillStyle = 'rgba(238,248,255,0.75)';
      for (const flake of this.flakes) ctx.fillRect(flake.x, flake.y, flake.size, flake.size);
    }
  }
  R.Stage1 = {
    wavePoints: WAVE_POINTS,
    waveTable: WAVE_TABLE,
    SnowField,
    draw(ctx, cameraX, time) {
      drawSky(ctx, cameraX);
      drawMid(ctx, cameraX);
      drawFloor(ctx, cameraX);
      drawNear(ctx, cameraX, time);
      const moonWash = ctx.createLinearGradient(0, 0, 640, 360);
      moonWash.addColorStop(0, 'rgba(90,145,190,0.08)');
      moonWash.addColorStop(1, 'rgba(255,140,55,0.05)');
      ctx.fillStyle = moonWash;
      ctx.fillRect(0, 0, 640, 360);
    }
  };
}());
