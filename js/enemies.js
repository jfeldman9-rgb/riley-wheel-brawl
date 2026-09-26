'use strict';
(function () {
  const R = window.RWB;
  const ATTACKS = {
    axe: { name: 'AXE CHOP', tell: 0.55, active: 0.12, recover: 0.5, reach: 55, height: 62, depth: 22, damage: 9, knockdown: false },
    bite: { name: 'BITE AND CLAW', tell: 0.32, active: 0.18, recover: 0.36, reach: 48, height: 38, depth: 25, damage: 7, knockdown: false },
    spear: { name: 'SPEAR THRUST', tell: 0.48, active: 0.14, recover: 0.46, reach: 82, height: 38, depth: 17, damage: 8, knockdown: false },
    crash: { name: 'AXE CRASH', tell: 0.72, active: 0.16, recover: 0.72, reach: 65, height: 72, depth: 27, damage: 14, knockdown: true },
    charge: { name: 'HORN CHARGE', tell: 0.85, active: 0.75, recover: 0.7, reach: 54, height: 60, depth: 16, damage: 13, knockdown: true },
    stomp: { name: 'GROUND STOMP', tell: 0.7, active: 0.2, recover: 0.65, reach: 95, height: 18, depth: 62, damage: 12, knockdown: true }
  };
  class Shockwave {
    constructor(scene, x, y, facing) {
      this.g = scene;
      this.x = x;
      this.y = y;
      this.facing = facing;
      this.life = 1.15;
      this.hit = false;
    }
    update(dt) {
      this.life -= dt;
      this.x += this.facing * 190 * dt;
      if (!this.hit && this.g.player.z < 18 && R.collide.circle(this.x, this.y, 0, 15, 23, this.g.player.hurtbox())) {
        this.hit = true;
        this.g.hitPlayer(8, this.x, { kb: 130, knockdown: true, source: 'shockwave' });
      }
    }
    draw(ctx, cameraX) {
      ctx.strokeStyle = '#efc45d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(this.x - cameraX, this.y, 20, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  class Trolloc extends R.Entity {
    constructor(scene, x, y, variant) {
      const type = variant || 'axe';
      super(scene, x, y, { hp: type === 'hound' ? 34 : type === 'spear' ? 39 : 44, bw: type === 'hound' ? 31 : 36, bh: type === 'hound' ? 54 : 69 });
      this.variant = type;
      this.ai = 'approach';
      this.aiTimer = Math.random() * 0.4;
      this.attack = null;
      this.attackDidHit = false;
      this.walkDistance = 0;
      this.stun = 0;
      this.getupCount = 0;
      this.speed = type === 'hound' ? 91 : type === 'spear' ? 65 : 58;
      this.scoreValue = type === 'hound' ? 160 : type === 'spear' ? 190 : 180;
      this.dropRoll = Math.random();
      this.spawnJitter = Math.random();
    }
    requestAttack() {
      if (!this.g.directorCanAttack(this)) {
        this.ai = 'circle';
        this.aiTimer = 0.35 + Math.random() * 0.45;
        return;
      }
      this.attack = ATTACKS[this.variant === 'hound' ? 'bite' : this.variant];
      this.ai = 'telegraph';
      this.aiTimer = this.attack.tell;
      this.attackDidHit = false;
      this.g.registerAttacker(this);
      this.setState('telegraph');
    }
    activeAttack() {
      const box = R.collide.front(this, this.attack.reach, 9, this.attack.height, 0, this.attack.depth);
      this.g.enemyHitboxes.push(box);
      if (!this.attackDidHit && R.collide.overlap(box, this.g.player.hurtbox())) {
        this.attackDidHit = true;
        this.g.hitPlayer(this.attack.damage, this.x, { kb: this.attack.knockdown ? 145 : 70, knockdown: this.attack.knockdown, source: this.attack.name });
      }
    }
    updateAI(dt) {
      const player = this.g.player;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      this.facing = dx >= 0 ? 1 : -1;
      this.aiTimer -= dt;
      if (this.ai === 'approach') {
        this.vx = Math.sign(dx) * this.speed;
        this.vy = Math.sign(dy) * this.speed * 0.62;
        this.walkDistance += Math.abs(this.vx) * dt;
        this.setState('walk');
        if (Math.abs(dx) < (this.variant === 'spear' ? 78 : 51) && Math.abs(dy) < 18) this.requestAttack();
      } else if (this.ai === 'circle') {
        this.vx = Math.sign(dx) * this.speed * 0.28;
        this.vy = (this.spawnJitter > 0.5 ? 1 : -1) * this.speed * 0.55;
        this.walkDistance += Math.abs(this.vx) * dt;
        this.setState('walk');
        if (this.aiTimer <= 0) this.ai = 'approach';
      } else if (this.ai === 'telegraph') {
        this.vx = 0;
        this.vy = 0;
        if (this.aiTimer <= 0) {
          this.ai = 'attack';
          this.aiTimer = this.attack.active;
          this.setState('attack');
          if (this.variant === 'hound') this.vx = this.facing * 160;
          this.g.playCue(this.variant === 'axe' ? 'axe' : this.variant === 'hound' ? 'claw' : 'spear');
        }
      } else if (this.ai === 'attack') {
        this.activeAttack();
        if (this.aiTimer <= 0) {
          this.ai = 'recover';
          this.aiTimer = this.attack.recover;
          this.g.releaseAttacker(this);
          this.setState('recover');
        }
      } else if (this.ai === 'recover') {
        this.vx = 0;
        if (this.aiTimer <= 0) this.ai = 'approach';
      }
    }
    updateThrown(dt) {
      this.thrown -= dt;
      for (const other of this.g.enemies) {
        if (other === this || other.dead || this.throwHits && this.throwHits.has(other)) continue;
        if (Math.abs(other.x - this.x) < 35 && Math.abs(other.y - this.y) < 24) {
          if (!this.throwHits) this.throwHits = new Set();
          this.throwHits.add(other);
          this.g.damageEnemy(other, 18, this.x, { kb: this.vx, knockdown: true, move: 'throw' });
        }
      }
      if (this.thrown <= 0 && this.z <= 0) {
        this.setState('knockdown');
        this.stun = 0.6;
      }
    }
    update(dt) {
      if (this.dead) return;
      if (this.grabbedBy) return;
      if (this.thrown > 0) this.updateThrown(dt);
      else if (this.state === 'hurt' || this.state === 'knockback') {
        this.stun -= dt;
        if (this.stun <= 0) {
          this.ai = 'approach';
          this.setState('idle');
        }
      } else if (this.state === 'knockdown') {
        this.stun -= dt;
        if (this.stun <= 0) {
          this.setState('getup');
          this.stun = 0.45;
          this.invuln = 0.7;
        }
      } else if (this.state === 'getup') {
        this.stun -= dt;
        if (this.stun <= 0) {
          this.ai = 'approach';
          this.setState('idle');
        }
      } else this.updateAI(dt);
      super.update(dt);
      this.x = R.util.clamp(this.x, this.g.arenaLeft + 12, this.g.arenaRight - 12);
    }
    onHurt(damage, opts) {
      this.g.releaseAttacker(this);
      if (opts.knockdown) {
        this.setState('knockdown');
        this.stun = 0.7;
      } else {
        this.setState('hurt');
        this.stun = 0.28;
      }
    }
    onDeath() {
      this.g.releaseAttacker(this);
      this.setState('death');
      this.g.onEnemyDeath(this);
    }
    drawHead(ctx) {
      if (this.variant === 'hound') {
        ctx.fillStyle = '#79584b';
        ctx.beginPath();
        ctx.ellipse(8, -59, 18, 11, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a1f1d';
        ctx.beginPath();
        ctx.arc(23, -57, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e4d9bd';
        ctx.beginPath();
        ctx.moveTo(-4, -67);
        ctx.lineTo(-12, -78);
        ctx.lineTo(2, -69);
        ctx.fill();
      } else {
        ctx.fillStyle = '#876854';
        ctx.beginPath();
        ctx.ellipse(0, -70, 15, 17, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d6c39a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(-10, -74, 13, Math.PI * 0.8, Math.PI * 1.65);
        ctx.moveTo(10, -85);
        ctx.arc(10, -74, 13, Math.PI * 1.35, Math.PI * 2.2);
        ctx.stroke();
      }
    }
    drawWeapon(ctx) {
      ctx.save();
      ctx.translate(15, -43);
      const raised = this.ai === 'telegraph' ? -1.2 : 0.25;
      ctx.rotate(raised);
      ctx.strokeStyle = '#6a4b30';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(0, 31);
      ctx.stroke();
      if (this.variant === 'axe') {
        ctx.fillStyle = '#9ca4aa';
        ctx.beginPath();
        ctx.moveTo(-2, -24);
        ctx.lineTo(16, -32);
        ctx.lineTo(13, -15);
        ctx.lineTo(-2, -12);
        ctx.fill();
      } else if (this.variant === 'spear') {
        ctx.fillStyle = '#bcc5ca';
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(-6, -20);
        ctx.lineTo(6, -20);
        ctx.fill();
      }
      ctx.restore();
    }
    draw(ctx, cameraX) {
      this.drawShadow(ctx, cameraX, 24);
      const frame = Math.floor(this.walkDistance / 17) % 4;
      const legs = [[-10, 10], [-4, 5], [10, -10], [5, -4]][frame];
      ctx.save();
      ctx.translate(this.x - cameraX, this.y - this.z);
      ctx.scale(this.facing, 1);
      ctx.strokeStyle = '#27241f';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, -20);
      ctx.lineTo(-10 + legs[0], 0);
      ctx.moveTo(8, -20);
      ctx.lineTo(10 + legs[1], 0);
      ctx.stroke();
      ctx.fillStyle = this.variant === 'hound' ? '#59423b' : this.variant === 'spear' ? '#485d45' : '#604d3f';
      ctx.beginPath();
      ctx.moveTo(-18, -61);
      ctx.quadraticCurveTo(-24, -37, -16, -17);
      ctx.lineTo(17, -17);
      ctx.quadraticCurveTo(24, -40, 16, -62);
      ctx.closePath();
      ctx.fill();
      this.drawHead(ctx);
      if (this.variant !== 'hound') this.drawWeapon(ctx);
      if (this.ai === 'telegraph') {
        ctx.strokeStyle = '#ffd34d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -42, 29 + Math.sin(this.stateT * 20) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  class Chieftain extends Trolloc {
    constructor(scene, x, y) {
      super(scene, x, y, 'axe');
      this.boss = true;
      this.hpMax = R.TUNE.bossHp;
      this.hp = this.hpMax;
      this.bw = 55;
      this.bh = 95;
      this.speed = 55;
      this.usedAttacks = new Set();
      this.attackIndex = Math.floor(Math.random() * 3);
      this.scoreValue = 3000;
      this.introTimer = 0.45;
    }
    chooseBossAttack() {
      const cycle = [ATTACKS.crash, ATTACKS.charge, ATTACKS.stomp];
      this.attack = cycle[this.attackIndex % cycle.length];
      this.attackIndex += 1;
      this.ai = 'telegraph';
      this.aiTimer = this.attack.tell;
      this.attackDidHit = false;
      this.g.registerAttacker(this);
      this.setState('telegraph');
      this.g.warning = this.attack.name;
      this.g.warningTimer = this.attack.tell;
      this.g.playCue('roar');
    }
    requestAttack() {
      if (!this.g.directorCanAttack(this)) return;
      this.chooseBossAttack();
    }
    updateAI(dt) {
      if (this.introTimer > 0) {
        this.introTimer -= dt;
        this.setState('idle');
        return;
      }
      super.updateAI(dt);
      if (this.ai === 'attack' && !this.usedAttacks.has(this.attack.name)) {
        this.usedAttacks.add(this.attack.name);
        this.g.playCue(this.attack === ATTACKS.crash ? 'bossCrash' : this.attack === ATTACKS.charge ? 'bossCharge' : 'bossStomp');
        if (this.attack === ATTACKS.crash) this.g.hazards.push(new Shockwave(this.g, this.x, this.y, this.facing));
      }
      if (this.ai === 'attack' && this.attack === ATTACKS.charge) this.vx = this.facing * 245;
      if (this.ai === 'attack' && this.attack === ATTACKS.stomp) {
        const ring = R.collide.box(this.x, this.y, 0, 170, 18, 65);
        this.g.enemyHitboxes.push(ring);
        if (!this.attackDidHit && this.g.player.z < 18 && R.collide.overlap(ring, this.g.player.hurtbox())) {
          this.attackDidHit = true;
          this.g.hitPlayer(this.attack.damage, this.x, { kb: 150, knockdown: true, source: this.attack.name });
        }
      }
    }
    onHurt(damage, opts) {
      if (this.dead) return;
      this.g.releaseAttacker(this);
      if (opts.stagger || opts.knockdown) {
        this.setState('hurt');
        this.stun = 0.2;
      }
    }
    draw(ctx, cameraX) {
      ctx.save();
      ctx.translate(this.x - cameraX, this.y - this.z);
      ctx.scale(this.facing * 1.32, 1.32);
      ctx.translate(-(this.x - cameraX), -(this.y - this.z));
      super.draw(ctx, cameraX);
      ctx.restore();
      ctx.save();
      ctx.translate(this.x - cameraX, this.y - this.z);
      ctx.fillStyle = '#d7c7a4';
      ctx.beginPath();
      ctx.moveTo(-20, -91);
      ctx.lineTo(0, -105);
      ctx.lineTo(21, -91);
      ctx.lineTo(14, -72);
      ctx.lineTo(-14, -72);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#76523c';
      ctx.beginPath();
      ctx.moveTo(-29, -65);
      ctx.lineTo(29, -65);
      ctx.lineTo(20, -49);
      ctx.lineTo(-20, -49);
      ctx.fill();
      ctx.restore();
    }
  }
  R.EnemyAttacks = ATTACKS;
  R.Shockwave = Shockwave;
  R.Trolloc = Trolloc;
  R.Chieftain = Chieftain;
}());
