'use strict';
(function () {
  const R = window.RWB;
  class Pickup {
    constructor(scene, x, y, kind) {
      this.g = scene;
      this.x = x;
      this.y = y;
      this.kind = kind;
      this.life = 14;
      this.age = 0;
      this.remove = false;
    }
    update(dt) {
      this.life -= dt;
      this.age += dt;
      if (this.life <= 0) this.remove = true;
      const player = this.g.player;
      if (Math.abs(player.x - this.x) < 24 && Math.abs(player.y - this.y) < 22) this.collect(player);
    }
    collect(player) {
      if (this.remove) return;
      this.remove = true;
      this.g.pickupsTaken += 1;
      this.g.playCue('pickup');
      if (this.kind === 'spark') {
        player.power = Math.min(player.powerMax, player.power + 24);
      } else if (this.kind === 'heal') {
        player.hp = Math.min(player.hpMax, player.hp + R.TUNE.healAmount);
        player.healPortrait = 2.2;
        R.voice('moiraine_heal_01');
        for (let i = 0; i < 18; i += 1) this.g.fx.sparks(player.x, player.y - 30, i % 2 ? '#b8efff' : '#ffffff', 1);
      } else if (this.kind === 'angreal') {
        player.angreal = R.TUNE.angrealSeconds;
        this.g.angrealDropped = true;
      }
    }
    draw(ctx, cameraX) {
      const x = this.x - cameraX;
      const y = this.y - 12 + Math.sin(this.age * 5) * 3;
      const color = this.kind === 'spark' ? '#77d8ff' : this.kind === 'heal' ? '#d7f7ff' : '#f1cf69';
      ctx.drawImage(RWB.effects.glow(color), x - 20, y - 20, 40, 40);
      ctx.fillStyle = color;
      ctx.beginPath();
      if (this.kind === 'angreal') {
        ctx.moveTo(x, y - 12);
        ctx.lineTo(x + 9, y);
        ctx.lineTo(x, y + 12);
        ctx.lineTo(x - 9, y);
      } else ctx.arc(x, y, this.kind === 'heal' ? 9 : 6, 0, Math.PI * 2);
      ctx.fill();
      if (this.kind === 'heal') {
        ctx.strokeStyle = '#639ee5';
        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y);
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x, y + 5);
        ctx.stroke();
      }
    }
  }
  class BreakableProp {
    constructor(scene, x, y, type) {
      this.g = scene;
      this.x = x;
      this.y = y;
      this.type = type;
      this.hp = 20;
      this.dead = false;
      this.bw = 34;
      this.bh = 34;
      this.z = 0;
    }
    hurtbox() {
      return R.collide.hurt(this);
    }
    takeHit(damage) {
      if (this.dead) return false;
      this.hp -= damage;
      if (this.hp <= 0) {
        this.dead = true;
        const kind = this.g.angrealDropped ? (Math.random() < 0.5 ? 'spark' : 'heal') : 'angreal';
        this.g.pickups.push(new Pickup(this.g, this.x, this.y, kind));
        this.g.fx.chunks(this.x, this.y - 16, '#8a6039', 10);
      }
      return true;
    }
    draw(ctx, cameraX) {
      if (this.dead) return;
      const x = this.x - cameraX;
      if (this.type === 'barrel') {
        ctx.fillStyle = '#79502f';
        ctx.beginPath();
        ctx.ellipse(x, this.y - 17, 17, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b18a56';
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 15, this.y - 24);
        ctx.lineTo(x + 15, this.y - 24);
        ctx.moveTo(x - 15, this.y - 10);
        ctx.lineTo(x + 15, this.y - 10);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#765434';
        ctx.fillRect(x - 17, this.y - 34, 34, 34);
        ctx.strokeStyle = '#b78950';
        ctx.strokeRect(x - 17, this.y - 34, 34, 34);
        ctx.beginPath();
        ctx.moveTo(x - 15, this.y - 32);
        ctx.lineTo(x + 15, this.y - 2);
        ctx.moveTo(x + 15, this.y - 32);
        ctx.lineTo(x - 15, this.y - 2);
        ctx.stroke();
      }
    }
  }
  R.Pickup = Pickup;
  R.BreakableProp = BreakableProp;
}());
