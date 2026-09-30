'use strict';
(function () {
  const R = window.RWB;
  class Loial {
    constructor(scene) {
      this.g = scene;
      this.x = scene.camera.x - 90;
      this.y = scene.player.y;
      this.vx = 300;
      this.life = 3;
      this.age = 0;
      this.chargeSpoken = false;
      this.doneSpoken = false;
      this.hit = new Set();
      this.walkDistance = 0;
    }
    update(dt) {
      this.x += this.vx * dt;
      this.life -= dt;
      this.age += dt;
      // Let Riley's call land before Loial answers; these barks never touch
      // combat, movement, or the subtitle queue.
      if (!this.chargeSpoken && this.age >= 1) { this.chargeSpoken = true; R.voice('loial_charge_01'); }
      if (!this.doneSpoken && this.life <= 0.2) { this.doneSpoken = true; R.voice('loial_done_01'); }
      this.walkDistance += this.vx * dt;
      for (const enemy of this.g.enemies) {
        if (enemy.dead || this.hit.has(enemy)) continue;
        if (Math.abs(enemy.x - this.x) > 46 || Math.abs(enemy.y - this.y) > 35) continue;
        this.hit.add(enemy);
        this.g.damageEnemy(enemy, enemy.boss ? 18 : 44, this.x, { kb: 220, knockdown: true, stagger: true, move: 'loial' });
      }
    }
    draw(ctx, cameraX) {
      if (R.paint(ctx, 'cg-loial', this.x-cameraX-52, this.y-140, 104, 140)) return;
      const phase = Math.floor(this.walkDistance / 22) % 4;
      const stride = [18, 4, -18, -4][phase];
      const x = this.x - cameraX;
      const y = this.y;
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = '#26342f';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-10, -34);
      ctx.lineTo(-14 + stride, 0);
      ctx.moveTo(10, -34);
      ctx.lineTo(14 - stride, 0);
      ctx.stroke();
      const coat = ctx.createLinearGradient(-26, -100, 28, -20);
      coat.addColorStop(0, '#63705b');
      coat.addColorStop(1, '#293a34');
      ctx.fillStyle = coat;
      ctx.beginPath();
      ctx.moveTo(-25, -93);
      ctx.quadraticCurveTo(-34, -55, -23, -25);
      ctx.lineTo(24, -25);
      ctx.quadraticCurveTo(34, -57, 25, -93);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#b68d68';
      ctx.beginPath();
      ctx.ellipse(0, -108, 24, 27, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-20, -115);
      ctx.quadraticCurveTo(-50, -122, -41, -101);
      ctx.quadraticCurveTo(-28, -103, -19, -108);
      ctx.moveTo(20, -115);
      ctx.quadraticCurveTo(50, -122, 41, -101);
      ctx.quadraticCurveTo(28, -103, 19, -108);
      ctx.fill();
      ctx.fillStyle = '#6b4f3d';
      ctx.beginPath();
      ctx.ellipse(0, -105, 11, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#49372d';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-17, -120);
      ctx.lineTo(-4, -116);
      ctx.moveTo(17, -120);
      ctx.lineTo(4, -116);
      ctx.stroke();
      ctx.strokeStyle = '#72523a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(25, -78);
      ctx.lineTo(48, -21);
      ctx.stroke();
      ctx.fillStyle = '#b6bec0';
      ctx.beginPath();
      ctx.moveTo(35, -69);
      ctx.lineTo(57, -78);
      ctx.lineTo(59, -55);
      ctx.lineTo(45, -45);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  R.drawMoirainePortrait = function (ctx, x, y, radius) {
    if (R.paint(ctx, 'portrait-moiraine', x-radius,y-radius,radius*2,radius*2)) return;
    ctx.fillStyle = '#142845';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#91cfff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e9c7aa';
    ctx.beginPath();
    ctx.ellipse(x, y - 1, radius * 0.42, radius * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#33251e';
    ctx.beginPath();
    ctx.arc(x, y - radius * 0.2, radius * 0.48, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4f87bf';
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.7, y + radius);
    ctx.lineTo(x, y + radius * 0.3);
    ctx.lineTo(x + radius * 0.7, y + radius);
    ctx.fill();
  };
  R.Loial = Loial;
}());
