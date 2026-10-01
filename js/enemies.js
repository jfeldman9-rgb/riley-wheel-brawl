'use strict';
(function () {
  const R = window.RWB;
  const ATTACKS = {
    axe: { name: 'AXE CHOP', tell: 0.62, active: 0.14, recover: 0.48, reach: 52, height: 58, depth: 20, damage: 16, knockdown: false },
    bite: { name: 'BITE AND CLAW', tell: 0.38, active: 0.16, recover: 0.34, reach: 46, height: 36, depth: 22, damage: 14, knockdown: false },
    spear: { name: 'SPEAR THRUST', tell: 0.56, active: 0.12, recover: 0.44, reach: 86, height: 28, depth: 14, damage: 15, knockdown: false },
    crash: { name: 'AXE CRASH', tell: 0.78, active: 0.16, recover: 0.62, reach: 62, height: 70, depth: 24, damage: 20, knockdown: true },
    charge: { name: 'HORN CHARGE', tell: 0.9, active: 0.7, recover: 0.58, reach: 50, height: 30, depth: 14, damage: 18, knockdown: true },
    stomp: { name: 'GROUND STOMP', tell: 0.74, active: 0.22, recover: 0.56, reach: 100, height: 16, depth: 70, damage: 18, knockdown: true }
  };
  // Hard is run-scoped. These gates consume no random values, and Normal never
  // enters the tactical path, preserving its established simulation and seed curve.
  const HardAI = R.HardAI = {
    enabled(scene) { return scene.difficulty === 'hard'; },
    canCommit(enemy) {
      const scene = enemy.g;
      if (!this.enabled(scene)) return true;
      const player = scene.player;
      if (player.dead || player.grabbedBy || player.invuln > 0.65 ||
          player.state === 'knockdown' || player.state === 'getup') return false;
      const cameraX = scene.camera ? scene.camera.x : scene.arenaLeft;
      if (enemy.x < cameraX + 16 || enemy.x > cameraX + R.W - 16) return false;
      const move = enemy.config ? enemy.config.move : ATTACKS[enemy.variant === 'hound' ? 'bite' : enemy.variant];
      const tell = enemy.boss ? 0.65 : move.tell;
      if (scene.time + tell < (scene.hardNextStrikeAt || 0)) return false;
      // Tells may overlap, strikes may not. Leave an extra reaction gap after
      // the previous active window, including any travelling boss strike.
      if (scene.enemies.some(other => {
        if (other === enemy || other.dead || other.grabbedBy || other.thrown > 0) return false;
        const remaining = other.state === 'telegraph' ? other.aiTimer + other.attack.active : other.state === 'attack' ? other.aiTimer : 0;
        return remaining > 0 && tell < remaining + 0.18;
      })) return false;
      return !scene.hazards.some(hazard => Number.isFinite(hazard.life) && hazard.life > 0 && !hazard.hit && tell < hazard.life + 0.18);
    },
    committed(enemy) {
      if (!this.enabled(enemy.g)) return;
      enemy.g.hardNextStrikeAt = enemy.g.time + enemy.attack.tell + enemy.attack.active + 0.18;
    },
    approach(enemy, dt) {
      const scene = enemy.g, player = scene.player;
      if (enemy.hardSlot == null) {
        enemy.hardSlot = scene.hardSlotCount || 0;
        scene.hardSlotCount = enemy.hardSlot + 1;
      }
      const ranged = enemy.kind === 'ashaman';
      const move = enemy.config ? enemy.config.move : ATTACKS[enemy.variant === 'hound' ? 'bite' : enemy.variant];
      const range = ranged ? 205 : Math.min(move.reach - 8, 72);
      const standOff = ranged ? 164 : range - 8;
      const left = scene.arenaLeft + 26, right = scene.arenaRight - 26;
      let side = enemy.hardSlot % 2 ? -1 : 1;
      // Near a wall, use the open side rather than pinning an actor off-screen.
      if (player.x + side * standOff < left || player.x + side * standOff > right) side *= -1;
      const goalX = R.util.clamp(player.x + side * standOff, left, right);
      const dx = player.x - enemy.x, dy = player.y - enemy.y;
      const crossing = (enemy.x - player.x) * side < 0;
      const canPress = this.canCommit(enemy) && scene.directorCanAttack(enemy);
      let goalY = player.y + (canPress ? 0 : enemy.hardSlot % 2 ? -10 : 10);
      enemy.hardIntent = canPress ? 'press' : 'hold';
      if (crossing) {
        // Cross around Riley on a separate floor lane, never through his body.
        const preferred = enemy.hardSlot % 2 ? -1 : 1;
        let laneSide = preferred;
        if (player.y + laneSide * 48 < R.FLOOR_TOP + 6 || player.y + laneSide * 48 > R.FLOOR_BOTTOM - 6) laneSide *= -1;
        goalY = R.collide.clampLane(player.y + laneSide * 48);
        enemy.hardIntent = 'flank';
      }
      // React only to visible nearby projectiles, with ordinary walking speed.
      if (scene.projectiles.some(projectile => Math.abs(projectile.x - enemy.x) < 110 && Math.abs(projectile.y - enemy.y) < 20)) {
        goalY = R.collide.clampLane(enemy.y + (enemy.y < (R.FLOOR_TOP + R.FLOOR_BOTTOM) / 2 ? -42 : 42));
        enemy.hardIntent = 'sidestep';
      }
      const velocity = (delta, speed) => Math.abs(delta) < 2 ? 0 : Math.sign(delta) * Math.min(speed, Math.abs(delta) / Math.max(dt, 0.001));
      enemy.vx = velocity(goalX - enemy.x, enemy.speed);
      enemy.vy = velocity(goalY - enemy.y, enemy.speed * 0.82);
      const cameraX = scene.camera ? scene.camera.x : scene.arenaLeft;
      const visible = enemy.x >= cameraX + 16 && enemy.x <= cameraX + R.W - 16;
      // Finish entering the visible fight before holding a crossing lane. A
      // knockback near a screen edge must not leave a pursued flanker stuck
      // outside the view, where the attack safety gate cannot let it respond.
      if (visible && crossing && Math.abs(dy) < 34 && Math.abs(dx) < 70) enemy.vx = 0;
      enemy.walkDistance += Math.hypot(enemy.vx, enemy.vy) * dt;
      enemy.setState(enemy.vx || enemy.vy ? 'walk' : 'idle');
      // A flank is a movement goal, not a requirement for attacking. If Riley
      // pursues a flanker, take the visible opening on its current side instead
      // of endlessly trying to cross his body or passing up a clear ranged shot.
      if (canPress && enemy.aiTimer <= 0 && Math.abs(dx) < range && Math.abs(dy) < (ranged ? 16 : 19)) enemy.requestAttack();
    }
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
      const wave = scene && scene.wave ? scene.wave : 0;
      const base = type === 'hound' ? 92 : type === 'spear' ? 104 : 118;
      super(scene, x, y, { hp: base + wave * 10, bw: type === 'hound' ? 31 : 36, bh: type === 'hound' ? 54 : 69 });
      this.variant = type;
      this.ai = 'approach';
      this.aiTimer = Math.random() * 0.4;
      this.attack = null;
      this.attackDidHit = false;
      this.walkDistance = 0;
      this.stun = 0;
      this.getupCount = 0;
      this.hitFlash = 0;
      this.deathTimer = 0;
      this.speed = type === 'hound' ? 96 : type === 'spear' ? 62 : 64;
      this.scoreValue = type === 'hound' ? 160 : type === 'spear' ? 190 : 180;
      this.dropRoll = Math.random();
      this.spawnJitter = Math.random();
      this.laneBias = type === 'spear' ? 0 : type === 'hound' ? (this.spawnJitter > 0.5 ? 18 : -18) : (this.spawnJitter > 0.5 ? 8 : -8);
      this.drawScale = 1;
    }
    requestAttack() {
      if (!HardAI.canCommit(this)) return;
      if (!this.g.directorCanAttack(this)) {
        this.ai = 'circle';
        this.aiTimer = 0.35 + Math.random() * 0.45;
        return;
      }
      this.attack = ATTACKS[this.variant === 'hound' ? 'bite' : this.variant];
      this.ai = 'telegraph';
      this.aiTimer = this.attack.tell;
      this.attackDidHit = false;
      this.activeCounted = false;
      this.g.registerAttacker(this);
      HardAI.committed(this);
      this.setState('telegraph');
    }
    activeAttack() {
      const box = R.collide.front(this, this.attack.reach, 9, this.attack.height, 0, this.attack.depth);
      this.g.enemyHitboxes.push(box);
      if (!this.attackDidHit && R.collide.overlap(box, this.g.player.hurtbox())) {
        this.attackDidHit = true;
        const bonus = this.boss ? 0 : (this.g.wave || 0);
        this.g.hitPlayer(this.attack.damage + bonus, this.x, { kb: this.attack.knockdown ? 210 : 120, knockdown: this.attack.knockdown, source: this.attack.name });
      }
    }
    advanceEntry(dt) {
      if (this.entryX == null || this.boss) return false;
      const cam = this.g.camera ? this.g.camera.x : 0;
      const onScreen = this.x >= cam + 24 && this.x <= cam + 616;
      const dx = this.entryX - this.x;
      if (onScreen) {
        this.enteredFight = true;
        this.entryX = null;
        this.vx = 0;
        return false;
      }
      this.facing = dx >= 0 ? 1 : -1;
      this.vx = Math.sign(dx) * this.speed * 3.0;
      this.vy = 0;
      this.walkDistance += Math.abs(this.vx) * dt;
      this.setState('walk');
      return true;
    }
    constrainToFight() {
      if (!this.g.camera) return;
      const left = Math.max(this.g.arenaLeft, this.g.camera.x) + 24;
      const right = Math.min(this.g.arenaRight, this.g.camera.x + R.W) - 24;
      // Entry is a brief, deliberate walk-in. Once an enemy is in the fight,
      // knockback, recovery and pack separation cannot hide it beyond a wall.
      if (this.x >= left && this.x <= right) this.enteredFight = true;
      if (this.enteredFight || this.entryX == null || ['hurt', 'knockback', 'knockdown', 'getup'].includes(this.state) || this.thrown > 0) {
        this.x = R.util.clamp(this.x, left, right);
        this.enteredFight = true;
        if (this.entryX != null) this.entryX = null;
      }
    }
    updateAI(dt) {
      if (this.advanceEntry(dt)) return;
      const player = this.g.player;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const committed = this.ai === 'telegraph' || this.ai === 'attack' || this.ai === 'recover';
      if (!committed) this.facing = dx >= 0 ? 1 : -1;
      this.aiTimer -= dt;
      if (HardAI.enabled(this.g) && !this.boss && (this.ai === 'approach' || this.ai === 'circle')) {
        this.ai = 'approach';
        HardAI.approach(this, dt);
      } else if (this.ai === 'approach') {
        const live=this.g.enemies.filter(e=>!e.dead),slot=live.indexOf(this),side=slot%2?1:-1;
        const goalY = player.y + side*(14+Math.min(24,slot*5)) + (this.laneBias || 0);
        this.vx = Math.sign(dx || 1) * this.speed;
        this.vy = Math.sign(goalY - this.y) * this.speed * 0.7;
        // Sidestep an incoming lane attack instead of waiting in its path.
        if(this.g.projectiles&&this.g.projectiles.some(p=>Math.abs(p.x-this.x)<90&&Math.abs(p.y-this.y)<20)) this.vy=side*this.speed;
        this.walkDistance += Math.abs(this.vx) * dt;
        this.setState('walk');
        const range = this.variant === 'spear' ? 76 : this.variant === 'hound' ? 40 : 46;
        if (Math.abs(dx) < range && Math.abs(dy) < 24) this.requestAttack();
      } else if (this.ai === 'circle') {
        this.vx = Math.sign(dx || 1) * this.speed * 0.35;
        this.vy = (this.spawnJitter > 0.5 ? 1 : -1) * this.speed * 0.65;
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
          if (this.variant === 'hound') this.vx = this.facing * 175;
          this.g.playCue(this.variant === 'axe' ? 'axe' : this.variant === 'hound' ? 'claw' : 'spear');
        }
      } else if (this.ai === 'attack') {
        this.activeAttack();
        if (this.variant === 'hound') this.vx = this.facing * 175;
        if (this.aiTimer <= 0) {
          this.ai = 'recover';
          this.aiTimer = this.attack.recover;
          this.g.releaseAttacker(this);
          this.setState('recover');
        }
      } else if (this.ai === 'recover') {
        this.vx = -this.facing * this.speed * 0.55;
        this.vy = 0;
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
    separate() {
      for (const other of this.g.enemies) {
        if (other === this || other.dead) continue;
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        if (Math.abs(dx) < 32 && Math.abs(dy) < 16) {
          this.x += Math.sign(dx || (this.spawnJitter > 0.5 ? 1 : -1)) * 0.7;
          this.y = R.collide.clampLane(this.y + Math.sign(dy || 1) * 0.35);
        }
      }
    }
    update(dt) {
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      if (this.dead) {
        this.deathTimer -= dt;
        if (this.deathTimer <= 0) this.remove = true;
        super.update(dt);
        this.constrainToFight();
        return;
      }
      if (this.grabbedBy) return;
      if (this.thrown > 0) this.updateThrown(dt);
      else if (this.state === 'hurt' || this.state === 'knockback') {
        this.stun -= dt;
        if (this.stun <= 0) {
          this.friction = 8;
          this.ai = 'approach';
          this.setState('idle');
        }
      } else if (this.state === 'knockdown') {
        this.stun -= dt;
        if (this.stun <= 0) {
          this.setState('getup');
          this.stun = 0.4;
          this.invuln = 0.32;
          this.friction = 8;
        }
      } else if (this.state === 'getup') {
        this.stun -= dt;
        if (this.stun <= 0) {
          this.ai = 'approach';
          this.setState('idle');
        }
      } else this.updateAI(dt);
      super.update(dt);
      const leash = this.boss || !this.g.leash ? [this.g.arenaLeft, this.g.arenaRight] : this.g.leash();
      this.x = R.util.clamp(this.x, leash[0] + 12, leash[1] - 12);
      if (!this.dead && !this.grabbedBy) this.separate();
      this.constrainToFight();
    }
    onHurt(damage, opts) {
      this.g.releaseAttacker(this);
      this.hitFlash = 0.16;
      if (opts.knockdown) {
        this.setState('knockdown');
        this.stun = 0.72;
        this.friction = 2.15;
      } else {
        this.setState('hurt');
        this.stun = 0.4;
        this.friction = 6.5;
        this.vx *= 0.78;
      }
    }
    onDeath() {
      this.g.releaseAttacker(this);
      this.setState('knockdown');
      this.deathTimer = 0.75;
      this.friction = 2.4;
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
      if (this.variant === 'axe' || this.boss) {
        ctx.fillStyle = this.boss ? '#c5ccd2' : '#9ca4aa';
        ctx.beginPath();
        const size = this.boss ? 1.35 : 1;
        ctx.moveTo(-2, -24 * size);
        ctx.lineTo(18 * size, -34 * size);
        ctx.lineTo(14 * size, -12 * size);
        ctx.lineTo(-2, -10);
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
    drawTell(ctx, cameraX) {
      if (!this.attack || (this.ai !== 'telegraph' && this.ai !== 'attack')) return;
      if (this.boss && this.ai === 'telegraph') {
        const box = this.attack === ATTACKS.stomp ? { x: this.x, w: 188, d: 72 } :
          this.attack === ATTACKS.charge ? { x: this.x + this.facing * 123, w: 246, d: 14 } :
          { x: this.x + this.facing * (this.attack.reach - 9) / 2, w: this.attack.reach + 9, d: this.attack.depth };
        ctx.save();ctx.beginPath();ctx.rect(box.x-cameraX-box.w/2,this.y-box.d,box.w,box.d*2);
        ctx.globalAlpha=.2+Math.abs(Math.sin(this.stateT*9))*.1;ctx.fillStyle='#ffd15a';ctx.fill();
        ctx.globalAlpha=.94;ctx.strokeStyle='#160d15';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#ffe17e';ctx.lineWidth=2;ctx.stroke();ctx.restore();
      }
      const pulse = 0.28 + Math.abs(Math.sin(this.stateT * 16)) * 0.35;
      ctx.save();
      ctx.globalAlpha = this.ai === 'telegraph' ? pulse : 0.22;
      const reach = this.attack.reach;
      const left = this.x + Math.min(0, this.facing * reach) - cameraX;
      ctx.fillStyle = this.variant === 'hound' ? '#ff7848' : this.variant === 'spear' ? '#8dffb0' : '#ffd15a';
      if (this.attack === ATTACKS.stomp) {
        ctx.beginPath();
        ctx.ellipse(this.x - cameraX, this.y, 78, 22, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.attack === ATTACKS.charge) {
        ctx.fillRect(this.facing > 0 ? this.x - cameraX : this.x - cameraX - 220, this.y - 5, 220, 8);
      } else {
        ctx.fillRect(left, this.y - 4, Math.abs(reach), 6);
      }
      ctx.restore();
    }
    draw(ctx, cameraX) {
      this.drawTell(ctx, cameraX);
      this.drawShadow(ctx, cameraX, 24);
      const spriteSize = this.boss ? 132 : 90;
      if (R.paint(ctx, this.boss ? 'cg-trolloc-chieftain' : 'cg-trolloc', this.x-cameraX-spriteSize/2, this.y-this.z-spriteSize, spriteSize, spriteSize)) return;
      const frame = Math.floor(this.walkDistance / 16) % 4;
      const legs = [[-10, 10], [-4, 5], [10, -10], [5, -4]][this.state === 'walk' ? frame : 0];
      const scale = this.drawScale || 1;
      ctx.save();
      ctx.translate(this.x - cameraX, this.y - this.z);
      ctx.scale(this.facing * scale, scale);
      if (this.variant === 'hound') ctx.translate(0, 8);
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
      if (this.hitFlash > 0) {
        ctx.globalAlpha = Math.min(0.7, this.hitFlash * 6);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, -40, 22, 32, 0, 0, Math.PI * 2);
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
      this.speed = 68;
      this.usedAttacks = new Set();
      this.attackIndex = Math.floor(Math.random() * 3);
      this.scoreValue = 3000;
      this.introTimer = 1.35;
      this.drawScale = 1.5;
      this.laneBias = 0;
    }
    chooseBossAttack() {
      const cycle = [ATTACKS.crash, ATTACKS.charge, ATTACKS.stomp];
      this.attack = cycle[this.attackIndex % cycle.length];
      // Advance the cycle only once a move becomes active; a stagger must not
      // silently skip one of the three boss attacks.
      this.ai = 'telegraph';
      this.aiTimer = this.attack.tell;
      this.attackDidHit = false;
      this.activeCounted = false;
      this.g.registerAttacker(this);
      HardAI.committed(this);
      this.setState('telegraph');
      this.g.warning = this.attack.name;
      this.g.warningTimer = this.attack.tell;
      this.g.playCue('roar');
    }
    requestAttack() {
      if (!HardAI.canCommit(this)) return;
      if (!this.g.directorCanAttack(this)) return;
      this.chooseBossAttack();
    }
    updateAI(dt) {
      if (this.introTimer > 0) {
        this.introTimer -= dt;
        this.invuln = Math.max(this.invuln, 0.12);
        const mark = this.g.arenaLeft + 400;
        const dx = mark - this.x;
        if (Math.abs(dx) > 4) {
          const step = Math.min(Math.abs(dx), 240 * dt);
          this.x += Math.sign(dx) * step;
          this.facing = dx >= 0 ? 1 : -1;
          this.walkDistance += step;
          this.setState('walk');
        } else {
          this.vx = 0;
          this.vy = 0;
          this.setState('idle');
        }
        return;
      }
      super.updateAI(dt);
      if (this.ai === 'attack' && !this.activeCounted) {
        this.activeCounted = true; this.attackIndex += 1;
        this.usedAttacks.add(this.attack.name);
        this.g.playCue(this.attack === ATTACKS.crash ? 'bossCrash' : this.attack === ATTACKS.charge ? 'bossCharge' : 'bossStomp');
        if (this.attack === ATTACKS.crash) this.g.hazards.push(new Shockwave(this.g, this.x, this.y, this.facing));
      }
      if (this.ai === 'attack' && this.attack === ATTACKS.charge) this.vx = this.facing * 280;
      if (this.ai === 'attack' && this.attack === ATTACKS.stomp) {
        const ring = R.collide.box(this.x, this.y, 0, 188, 16, 72);
        this.g.enemyHitboxes.push(ring);
        if (!this.attackDidHit && this.g.player.z < 20 && R.collide.overlap(ring, this.g.player.hurtbox())) {
          this.attackDidHit = true;
          this.g.hitPlayer(this.attack.damage, this.x, { kb: 200, knockdown: true, source: this.attack.name });
        }
      }
    }
    onHurt(damage, opts) {
      if (this.dead) return;
      this.hitFlash = 0.16;
      if (opts.stagger || opts.knockdown) {
        this.g.releaseAttacker(this);
        this.setState('hurt');
        this.stun = 0.22;
        this.friction = 3;
        this.ai = 'recover';
        this.aiTimer = 0.22;
      }
    }
    draw(ctx, cameraX) {
      super.draw(ctx, cameraX);
      if (R.assets.has('cg-trolloc-chieftain')) return;
      const scale = this.drawScale || 1;
      ctx.save();
      ctx.translate(this.x - cameraX, this.y - this.z);
      ctx.scale(this.facing * scale, scale);
      ctx.fillStyle = '#e6d7b4';
      ctx.beginPath();
      ctx.moveTo(-16, -78);
      ctx.lineTo(0, -96);
      ctx.lineTo(16, -78);
      ctx.lineTo(11, -64);
      ctx.lineTo(-11, -64);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6d4634';
      ctx.beginPath();
      ctx.moveTo(-24, -58);
      ctx.quadraticCurveTo(0, -46, 24, -58);
      ctx.lineTo(16, -44);
      ctx.lineTo(-16, -44);
      ctx.fill();
      ctx.restore();
    }
  }
  R.EnemyAttacks = ATTACKS;
  R.Shockwave = Shockwave;
  R.Trolloc = Trolloc;
  R.Chieftain = Chieftain;
}());
