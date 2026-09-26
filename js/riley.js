'use strict';
(function () {
  const R = window.RWB;
  function degrees(value) {
    return value * Math.PI / 180;
  }
  function limbPoint(x, y, length, angle) {
    return { x: x + Math.sin(degrees(angle)) * length, y: y + Math.cos(degrees(angle)) * length };
  }
  function drawLimb(ctx, start, a1, a2, first, second, width, boot) {
    const joint = limbPoint(start.x, start.y, first, a1);
    const end = limbPoint(joint.x, joint.y, second, a1 + a2);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(joint.x, joint.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    if (boot) {
      ctx.strokeStyle = '#080b11';
      ctx.lineWidth = width + 2;
      ctx.beginPath();
      ctx.moveTo(end.x - 3, end.y);
      ctx.lineTo(end.x + 7, end.y);
      ctx.stroke();
    }
    return end;
  }
  class Fireball {
    constructor(scene, owner, laneOffset) {
      this.g = scene;
      this.owner = owner;
      this.x = owner.x + owner.facing * 25;
      this.y = owner.y + laneOffset;
      this.z = 30;
      this.vx = owner.facing * 330;
      this.life = 2.3;
      this.radius = owner.angreal > 0 ? 10 : 7;
      this.damage = owner.angreal > 0 ? 20 : 15;
      this.hit = new Set();
    }
    update(dt) {
      this.x += this.vx * dt;
      this.life -= dt;
      if (Math.random() < 0.55) this.g.fx.sparks(this.x, this.y - this.z, '#ffb33d', 1);
      for (const enemy of this.g.enemies) {
        if (enemy.dead || this.hit.has(enemy)) continue;
        if (!R.collide.circle(this.x, this.y, this.z, this.radius, 25, enemy.hurtbox())) continue;
        this.hit.add(enemy);
        this.life = 0;
        this.g.damageEnemy(enemy, this.damage, this.owner.x, { kb: 105, move: 'fireball' });
        this.g.fx.sparks(this.x, this.y - this.z, '#fff1a1', 10);
        this.g.camera.impact(this.owner.facing, 'light');
        this.g.playCue('fireHit');
      }
    }
    draw(ctx, cameraX) {
      const glow = ctx.createRadialGradient(this.x - cameraX, this.y - this.z, 1, this.x - cameraX, this.y - this.z, 16);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.25, '#ffe06e');
      glow.addColorStop(0.65, '#f46b28');
      glow.addColorStop(1, 'rgba(244,60,20,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(this.x - cameraX, this.y - this.z, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  class Riley extends R.Entity {
    constructor(scene, carry) {
      super(scene, 110, 268, { hp: 100, bw: 25, bh: 67, gravity: R.TUNE.gravity });
      const saved = carry || {};
      this.hpMax = 100;
      this.powerMax = 100;
      this.power = saved.saidin || 0;
      this.score = saved.score || 0;
      this.lives = saved.lives == null ? 3 : saved.lives;
      this.loialReady = saved.loial !== false;
      this.angreal = 0;
      this.fireCooldown = 0;
      this.comboStep = 0;
      this.comboWindow = 0;
      this.attackBuffer = 0;
      this.attackMove = null;
      this.attackHits = new Set();
      this.walkDistance = 0;
      this.taintAge = 0;
      this.taintClock = 0;
      this.taintTell = 0;
      this.grabbed = null;
      this.knees = 0;
      this.healPortrait = 0;
      this.spokenFire = false;
      this.deadTimer = 0;
      this.getupTimer = 0;
    }
    get busy() {
      return !!this.attackMove || ['hurt', 'knockdown', 'lying', 'getup', 'death', 'super'].includes(this.state);
    }
    beginMove(name) {
      const move = R.MOVES[name];
      this.attackMove = move;
      this.attackName = name;
      this.attackHits.clear();
      this.setState(name);
      if (name === 'spin') this.invuln = Math.max(this.invuln, 0.22);
      this.g.movesUsed.add(name === 'back' ? 'combo3' : name === 'round' ? 'combo2' : name === 'front' ? 'combo1' : name);
      this.g.playCue(name === 'spin' ? 'spinKick' : name === 'jump' ? 'jumpKick' : 'kick');
    }
    tryAttack(input) {
      if (!R.keyPressed(input, 'attack')) return;
      if (this.grabbed) {
        if (this.knees < 2) this.knee();
        else this.throwGrab(this.facing);
        return;
      }
      if (this.attackMove) {
        this.attackBuffer = R.TUNE.attackBuffer;
        return;
      }
      if (!this.grounded) {
        this.beginMove('jump');
        return;
      }
      if (input.held && input.held.down) {
        this.beginMove('spin');
        return;
      }
      this.comboStep = this.comboWindow > 0 ? this.comboStep % 3 + 1 : 1;
      const names = ['front', 'round', 'back'];
      this.beginMove(names[this.comboStep - 1]);
      this.comboWindow = R.TUNE.comboWindow;
    }
    tryJump(input) {
      if (!R.keyPressed(input, 'jump') || !this.grounded || this.busy) return;
      if (input.pressed && input.pressed.attack) {
        this.beginMove('spin');
        return;
      }
      this.vz = R.TUNE.jumpSpeed;
      this.z = 0.01;
      this.setState('rise');
      this.g.playCue('jump');
    }
    tryFire(input) {
      if (!R.keyPressed(input, 'special') || this.fireCooldown > 0 || this.busy) return;
      this.fireCooldown = this.angreal > 0 ? R.TUNE.angrealFireCooldown : R.TUNE.fireCooldown;
      this.setState('channel');
      this.channelTimer = 0.22;
      const lanes = this.angreal > 0 ? [-20, 0, 20] : [0];
      for (const lane of lanes) this.g.projectiles.push(new Fireball(this.g, this, lane));
      this.g.movesUsed.add('fireball');
      this.g.playCue('fireball');
      if (!this.spokenFire) {
        R.voice('riley_fire_01');
        this.spokenFire = true;
      }
    }
    tryGrab() {
      if (this.grabbed || this.busy || !this.grounded) return;
      for (const enemy of this.g.enemies) {
        if (enemy.dead || enemy.boss || !['hurt', 'knockback', 'knockdown'].includes(enemy.state)) continue;
        if (Math.abs(enemy.x - this.x) > 28 || Math.abs(enemy.y - this.y) > 17) continue;
        this.grabbed = enemy;
        enemy.grabbedBy = this;
        enemy.setState('grabbed');
        enemy.vx = 0;
        enemy.vy = 0;
        this.knees = 0;
        R.voice('riley_grab_01');
        break;
      }
    }
    knee() {
      this.knees += 1;
      this.beginMove('knee');
    }
    throwGrab(direction) {
      if (!this.grabbed) return;
      const enemy = this.grabbed;
      this.grabbed = null;
      enemy.grabbedBy = null;
      enemy.facing = direction;
      enemy.thrown = 0.8;
      enemy.vx = direction * 290;
      enemy.vz = 180;
      enemy.z = 2;
      enemy.takeHit(R.MOVES.throw.damage, this.x, { kb: 290, launch: 180, knockdown: true, ignoreInvuln: true });
      this.g.movesUsed.add('throw');
      this.setState('throw');
      this.channelTimer = R.MOVES.throw.duration;
      R.voice('riley_throw_01');
      this.g.playCue('throw');
    }
    updateAttack(dt) {
      if (!this.attackMove) return;
      const move = this.attackMove;
      const active = this.stateT >= move.active[0] && this.stateT <= move.active[1];
      if (active) {
        const box = R.collide.front(this, move.reach, move.back, move.height, 2, move.depth);
        this.g.playerHitboxes.push(box);
        for (const enemy of this.g.enemies) {
          if (enemy.dead || this.attackHits.has(enemy)) continue;
          if (!R.collide.overlap(box, enemy.hurtbox())) continue;
          this.attackHits.add(enemy);
          this.g.damageEnemy(enemy, move.damage, this.x, { kb: move.knockback, knockdown: move.knockdown, move: this.attackName });
        }
      }
      if (this.stateT < move.duration) return;
      this.attackMove = null;
      if (this.attackBuffer > 0 && this.grounded && ['front', 'round'].includes(this.attackName)) {
        this.comboStep += 1;
        this.beginMove(this.comboStep === 2 ? 'round' : 'back');
      } else if (this.grounded) {
        this.setState('idle');
      }
    }
    updateTaint(dt) {
      if (this.power < this.powerMax || this.g.phase !== 'play') {
        this.taintAge = 0;
        this.taintClock = 0;
        this.taintTell = 0;
        return;
      }
      this.taintAge += dt;
      if (this.taintAge <= R.TUNE.taintGrace) return;
      if (this.taintTell > 0) {
        this.taintTell -= dt;
        if (this.taintTell <= 0) {
          this.hp = Math.max(1, this.hp - 3);
          this.g.damageTaken += 3;
          this.g.camera.flash(0.13, '#8b55bb');
        }
        return;
      }
      this.taintClock += dt;
      if (this.taintClock >= R.TUNE.taintInterval) {
        this.taintClock = 0;
        this.taintTell = R.TUNE.taintTell;
        this.g.warning = 'TAINT STRIKE INCOMING!';
        this.g.warningTimer = R.TUNE.taintTell;
        R.voice('moiraine_taint_01');
      }
    }
    update(dt, input) {
      this.fireCooldown = Math.max(0, this.fireCooldown - dt);
      this.angreal = Math.max(0, this.angreal - dt);
      this.comboWindow = Math.max(0, this.comboWindow - dt);
      this.attackBuffer = Math.max(0, this.attackBuffer - dt);
      this.healPortrait = Math.max(0, this.healPortrait - dt);
      if (this.dead) {
        this.deadTimer += dt;
        return;
      }
      if (this.state === 'knockdown' && this.stateT > 0.28) this.setState('lying');
      if (this.state === 'lying' && this.stateT > 0.5) {
        this.setState('getup');
        this.invuln = 1;
      }
      if (this.state === 'getup' && this.stateT > 0.42) this.setState('idle');
      const locked = ['hurt', 'knockdown', 'lying', 'getup', 'super'].includes(this.state);
      if (this.state === 'hurt' && this.stateT > 0.25) this.setState('idle');
      if (!locked) {
        this.tryJump(input);
        this.tryAttack(input);
        this.tryFire(input);
      }
      if (R.keyPressed(input, 'power') && this.power >= this.powerMax) this.g.activateBalefire();
      if (R.keyPressed(input, 'assist')) this.g.callLoial();
      if (this.grabbed && input && input.pressed) {
        const away = this.grabbed.x >= this.x ? input.pressed.left : input.pressed.right;
        if (away) this.throwGrab(this.grabbed.x >= this.x ? -1 : 1);
      }
      let axis = input && input.axis ? input.axis() : { x: 0, y: 0 };
      if (!locked && !this.attackMove) {
        this.vx = axis.x * R.TUNE.playerSpeed;
        this.vy = axis.y * R.TUNE.laneSpeed;
        if (axis.x) this.facing = Math.sign(axis.x);
        this.walkDistance += Math.abs(this.vx) * dt;
        if (this.grounded) this.setState(Math.abs(axis.x) + Math.abs(axis.y) > 0.1 ? 'walk' : 'idle');
      }
      if (!this.grounded && !this.attackMove) this.setState(this.vz >= 0 ? 'rise' : 'fall');
      this.updateAttack(dt);
      this.updateTaint(dt);
      super.update(dt);
      this.x = R.util.clamp(this.x, this.g.arenaLeft + 18, this.g.arenaRight - 18);
      if (this.grabbed) {
        this.grabbed.x = this.x + this.facing * 22;
        this.grabbed.y = this.y;
      } else this.tryGrab();
      if (this.channelTimer) {
        this.channelTimer -= dt;
        if (this.channelTimer <= 0 && this.grounded && !this.attackMove) this.setState('idle');
      }
    }
    onHurt() {
      if (this.hp <= 0) {
        this.setState('death');
        return;
      }
      this.setState('hurt');
      this.power = Math.min(this.powerMax, this.power + 3);
    }
    pose() {
      let key = this.state;
      if (this.attackMove) key = this.attackName;
      if (key === 'jump') key = 'fall';
      const frames = R.RILEY_POSES[key] || R.RILEY_POSES.idle;
      let index = 0;
      if (key === 'walk') index = Math.floor(this.walkDistance / 14) % frames.length;
      else if (frames.length > 1) index = Math.min(frames.length - 1, Math.floor(this.stateT / Math.max(0.08, (this.attackMove ? this.attackMove.duration : 0.4) / frames.length)));
      else if (key === 'idle') index = Math.floor(this.stateT * 2) % frames.length;
      return frames[index];
    }
    draw(ctx, cameraX) {
      this.drawShadow(ctx, cameraX, 20);
      const pose = this.pose();
      const x = this.x - cameraX;
      const y = this.y - this.z + pose.bob;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(this.facing, 1);
      if (this.angreal > 0) {
        ctx.strokeStyle = 'rgba(255,221,100,0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -34, 27 + Math.sin(this.stateT * 8) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      const leftHip = { x: -5, y: -18 };
      const rightHip = { x: 5, y: -18 };
      drawLimb(ctx, leftHip, pose.hip[0], pose.knee[0], 17, 17, 6, true);
      drawLimb(ctx, rightHip, pose.hip[1], pose.knee[1], 17, 17, 6, true);
      const coat = ctx.createLinearGradient(-15, -53, 15, -12);
      coat.addColorStop(0, '#27303c');
      coat.addColorStop(0.45, '#111722');
      coat.addColorStop(1, '#05080d');
      ctx.fillStyle = coat;
      ctx.beginPath();
      ctx.moveTo(-12, -54);
      ctx.quadraticCurveTo(-17, -38, -14, -15);
      ctx.lineTo(-9, -5);
      ctx.lineTo(0, -14);
      ctx.lineTo(10, -5);
      ctx.lineTo(15, -15);
      ctx.quadraticCurveTo(17, -39, 12, -54);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3f4b59';
      ctx.lineWidth = 1;
      ctx.stroke();
      drawLimb(ctx, { x: -11, y: -48 }, pose.shoulder[0], pose.elbow[0], 15, 14, 5, false);
      drawLimb(ctx, { x: 11, y: -48 }, pose.shoulder[1], pose.elbow[1], 15, 14, 5, false);
      ctx.strokeStyle = '#66717d';
      ctx.beginPath();
      ctx.moveTo(-12, -29);
      ctx.lineTo(12, -29);
      ctx.stroke();
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = '#cbd2d7';
        ctx.beginPath();
        ctx.arc(0, -43 + i * 7, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#c9c3b5';
      ctx.beginPath();
      ctx.moveTo(-8, -53);
      ctx.lineTo(-3, -57);
      ctx.lineTo(-1, -52);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d9e3e9';
      ctx.beginPath();
      ctx.moveTo(-7, -56);
      ctx.lineTo(-2, -51);
      ctx.stroke();
      ctx.fillStyle = '#b72f2f';
      ctx.beginPath();
      ctx.moveTo(4, -56);
      ctx.quadraticCurveTo(10, -54, 6, -49);
      ctx.quadraticCurveTo(2, -52, 4, -56);
      ctx.fill();
      ctx.strokeStyle = '#e8be48';
      ctx.stroke();
      const skin = ctx.createRadialGradient(-3, -67, 2, 0, -65, 14);
      skin.addColorStop(0, '#f3c9a5');
      skin.addColorStop(1, '#bd8063');
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(0, -66, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#17151b';
      ctx.beginPath();
      ctx.arc(0, -71, 12, Math.PI, Math.PI * 2);
      ctx.lineTo(11, -67);
      ctx.quadraticCurveTo(5, -72, 4, -79);
      ctx.lineTo(0, -74);
      ctx.lineTo(-4, -81);
      ctx.lineTo(-6, -73);
      ctx.lineTo(-12, -76);
      ctx.lineTo(-10, -67);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4d3b47';
      ctx.beginPath();
      ctx.moveTo(-7, -75);
      ctx.quadraticCurveTo(0, -79, 7, -73);
      ctx.stroke();
      ctx.strokeStyle = '#4fb7ef';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-9, -68, 7, 5);
      ctx.strokeRect(2, -68, 7, 5);
      ctx.beginPath();
      ctx.moveTo(-2, -66);
      ctx.lineTo(2, -66);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(-8, -67);
      ctx.lineTo(-5, -67);
      ctx.moveTo(3, -67);
      ctx.lineTo(6, -67);
      ctx.stroke();
      ctx.restore();
    }
  }
  R.Fireball = Fireball;
  R.Riley = Riley;
}());
