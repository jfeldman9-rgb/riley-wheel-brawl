'use strict';
(function () {
  const R = window.RWB;
  function degrees(value) {
    return value * Math.PI / 180;
  }
  function limbPoint(x, y, length, angle) {
    return { x: x + Math.sin(degrees(angle)) * length, y: y + Math.cos(degrees(angle)) * length };
  }
  function drawLimb(ctx, start, a1, a2, first, second, width, boot, color) {
    const joint = limbPoint(start.x, start.y, first, a1);
    const end = limbPoint(joint.x, joint.y, second, a1 + a2);
    ctx.strokeStyle = color || '#1a2030';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(joint.x, joint.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    if (boot) {
      ctx.strokeStyle = '#080b11';
      ctx.lineWidth = width + 1.5;
      ctx.beginPath();
      ctx.moveTo(end.x - 2, end.y);
      ctx.lineTo(end.x + 6, end.y + 1);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#e4b898';
      ctx.beginPath();
      ctx.arc(end.x, end.y, 2.1, 0, Math.PI * 2);
      ctx.fill();
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
      this.queuedAttack = false;
      this.wantSpecial = false;
      this.hitFlash = 0;
      this.plantFoot = '';
      this.plantWorld = 0;
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
      const cue = name === 'spin' ? 'spinKick' : name === 'jump' ? 'jumpKick' : name === 'back' ? 'kick3' : name === 'round' ? 'kick2' : 'kick';
      this.g.playCue(cue);
    }
    startAttack(input) {
      if (!this.grounded) {
        this.beginMove('jump');
        return;
      }
      if (input && input.held && input.held.down) {
        this.beginMove('spin');
        return;
      }
      this.comboStep = this.comboWindow > 0 ? this.comboStep % 3 + 1 : 1;
      const names = ['front', 'round', 'back'];
      this.beginMove(names[this.comboStep - 1]);
    }
    tryAttack(input) {
      if (!R.keyPressed(input, 'attack')) return;
      if (this.grabbed) {
        if (this.knees < 2) this.knee();
        else this.throwGrab(this.facing);
        return;
      }
      if (this.attackMove) {
        this.queuedAttack = true;
        this.attackBuffer = R.TUNE.attackBuffer;
        return;
      }
      this.startAttack(input);
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
      if (R.keyPressed(input, 'special')) this.wantSpecial = true;
      if (!this.wantSpecial || this.fireCooldown > 0 || this.busy) return;
      this.wantSpecial = false;
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
      if (this.grabbed || this.busy || !this.grounded || this.attackMove || this.comboWindow > 0) return;
      if (Math.abs(this.vx) < 36) return;
      for (const enemy of this.g.enemies) {
        if (enemy.dead || enemy.boss || !['hurt', 'knockback', 'knockdown'].includes(enemy.state)) continue;
        if (Math.abs(enemy.x - this.x) > 30 || Math.abs(enemy.y - this.y) > 18) continue;
        const dir = Math.sign(enemy.x - this.x);
        if (dir && Math.sign(this.vx) !== dir) continue;
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
      if (this.state !== this.attackName) {
        this.attackMove = null;
        this.queuedAttack = false;
        return;
      }
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
      const queued = this.queuedAttack;
      const finished = this.attackName;
      this.queuedAttack = false;
      this.attackBuffer = 0;
      this.attackMove = null;
      if (queued && this.grounded && (finished === 'front' || finished === 'round')) {
        this.comboStep += 1;
        this.beginMove(this.comboStep === 2 ? 'round' : 'back');
        return;
      }
      if (this.grounded) this.setState('idle');
      this.comboWindow = finished === 'front' || finished === 'round' ? R.TUNE.comboWindow : 0;
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
      this.hitFlash = Math.max(0, this.hitFlash - dt);
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
      if (locked && R.keyPressed(input, 'attack')) this.queuedAttack = true;
      if (this.state === 'hurt' && this.stateT > 0.22) {
        this.setState('idle');
        this.friction = 8;
        if (this.queuedAttack) {
          this.queuedAttack = false;
          this.startAttack(input);
        }
      }
      if (!locked) {
        this.tryJump(input);
        this.tryAttack(input);
        this.tryFire(input);
      } else this.tryFire(input);
      if (R.keyPressed(input, 'power') && this.power >= this.powerMax) this.g.activateBalefire();
      if (R.keyPressed(input, 'assist')) this.g.callLoial();
      if (this.grabbed && input && input.pressed) {
        const away = this.grabbed.x >= this.x ? input.pressed.left : input.pressed.right;
        if (away) this.throwGrab(this.grabbed.x >= this.x ? -1 : 1);
      }
      let axis = input && input.axis ? input.axis() : { x: 0, y: 0 };
      const channeling = (this.channelTimer || 0) > 0;
      const recovering = this.attackMove && this.stateT > this.attackMove.active[1];
      if (!locked && !channeling && (!this.attackMove || recovering)) {
        const scale = this.attackMove ? 0.45 : 1;
        this.vx = axis.x * R.TUNE.playerSpeed * scale;
        this.vy = axis.y * R.TUNE.laneSpeed * scale;
        if (axis.x && !this.attackMove) this.facing = Math.sign(axis.x);
        this.walkDistance += Math.abs(this.vx) * dt;
        if (this.grounded && !this.attackMove) this.setState(Math.abs(axis.x) + Math.abs(axis.y) > 0.1 ? 'walk' : 'idle');
      }
      if (!locked && !channeling && this.state !== 'hurt') this.friction = 8;
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
    onHurt(damage, opts) {
      this.hitFlash = 0.12;
      this.friction = opts && opts.launch ? 2.4 : 3.1;
      this.attackMove = null;
      this.queuedAttack = false;
      this.attackBuffer = 0;
      if (this.hp <= 0) {
        this.setState('death');
        return;
      }
      this.setState('hurt');
      this.power = Math.min(this.powerMax, this.power + 4);
    }
    pose() {
      let key = this.state;
      if (this.attackMove) key = this.attackName;
      if (key === 'jump') key = 'fall';
      const frames = R.RILEY_POSES[key] || R.RILEY_POSES.idle;
      let index = 0;
      if (key === 'walk') index = Math.floor(this.walkDistance / 12) % frames.length;
      else if (frames.length > 1) index = Math.min(frames.length - 1, Math.floor(this.stateT / Math.max(0.08, (this.attackMove ? this.attackMove.duration : 0.4) / frames.length)));
      else if (key === 'idle') index = Math.floor(this.stateT * 2) % frames.length;
      return frames[index];
    }
    draw(ctx, cameraX) {
      this.drawShadow(ctx, cameraX, 14);
      const pose = this.pose();
      const hipY = -23;
      const leftFoot = limbPoint(limbPoint(-4, hipY, 12, pose.hip[0]).x, limbPoint(-4, hipY, 12, pose.hip[0]).y, 11, pose.hip[0] + pose.knee[0]);
      const rightHipPoint = limbPoint(4, hipY, 12, pose.hip[1]);
      const rightFoot = limbPoint(rightHipPoint.x, rightHipPoint.y, 11, pose.hip[1] + pose.knee[1]);
      const contact = leftFoot.y >= rightFoot.y ? 'l' : 'r';
      const plant = contact === 'l' ? leftFoot : rightFoot;
      let slide = 0;
      if (this.state === 'walk' && this.grounded) {
        if (this.plantFoot !== contact) {
          this.plantFoot = contact;
          this.plantWorld = this.x + this.facing * plant.x;
        }
        slide = R.util.clamp((this.plantWorld - this.x) * this.facing - plant.x, -7, 7);
      } else this.plantFoot = '';
      const x = this.x - cameraX;
      const y = this.y - this.z + pose.bob * 0.6;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(this.facing, 1);
      ctx.translate(slide, 0);
      if (this.invuln > 0 && Math.floor(this.invuln * 18) % 2 === 0) ctx.globalAlpha = 0.55;
      if (this.angreal > 0) {
        ctx.strokeStyle = 'rgba(255,221,100,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -32, 24 + Math.sin(this.stateT * 8) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawLimb(ctx, { x: -4, y: hipY }, pose.hip[0], pose.knee[0], 12, 11, 4.2, true, '#1a2030');
      drawLimb(ctx, { x: 4, y: hipY }, pose.hip[1], pose.knee[1], 12, 11, 4.2, true, '#1a2030');
      const coat = ctx.createLinearGradient(-12, -48, 12, -14);
      coat.addColorStop(0, '#2a3342');
      coat.addColorStop(0.4, '#10151e');
      coat.addColorStop(1, '#05070c');
      ctx.fillStyle = coat;
      ctx.beginPath();
      ctx.moveTo(-8, -46);
      ctx.lineTo(-10, -40);
      ctx.quadraticCurveTo(-13, -30, -11, -16);
      ctx.lineTo(-6, -12);
      ctx.lineTo(0, -18);
      ctx.lineTo(6, -12);
      ctx.lineTo(11, -16);
      ctx.quadraticCurveTo(13, -30, 10, -40);
      ctx.lineTo(8, -46);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#07090e';
      ctx.beginPath();
      ctx.moveTo(-7, -46);
      ctx.lineTo(-5, -50);
      ctx.lineTo(0, -47);
      ctx.lineTo(5, -50);
      ctx.lineTo(7, -46);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3a4554';
      ctx.lineWidth = 1;
      ctx.stroke();
      drawLimb(ctx, { x: -8, y: -40 }, pose.shoulder[0], pose.elbow[0], 10, 9, 3.4, false, '#121722');
      drawLimb(ctx, { x: 8, y: -40 }, pose.shoulder[1], pose.elbow[1], 10, 9, 3.4, false, '#121722');
      ctx.strokeStyle = '#8d7a45';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-9, -22);
      ctx.lineTo(9, -22);
      ctx.stroke();
      ctx.fillStyle = '#d7c37a';
      ctx.fillRect(-2, -24, 4, 4);
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = '#d5dde4';
        ctx.beginPath();
        ctx.arc(0, -38 + i * 5, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#d9dee6';
      ctx.beginPath();
      ctx.moveTo(-7, -46);
      ctx.lineTo(-3, -50);
      ctx.lineTo(-2, -44);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f2f6fb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, -49);
      ctx.lineTo(-3, -45);
      ctx.stroke();
      ctx.fillStyle = '#c43232';
      ctx.beginPath();
      ctx.moveTo(3, -49);
      ctx.quadraticCurveTo(8, -47, 5, -43);
      ctx.quadraticCurveTo(2, -45, 3, -49);
      ctx.fill();
      ctx.strokeStyle = '#e8be48';
      ctx.lineWidth = 1;
      ctx.stroke();
      const skin = ctx.createRadialGradient(-2, -54, 1, 0, -52, 11);
      skin.addColorStop(0, '#f6d0ae');
      skin.addColorStop(1, '#c48868');
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(0, -52, 8.5, 9.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16141a';
      ctx.beginPath();
      ctx.moveTo(-8, -54);
      ctx.lineTo(-9, -62);
      ctx.lineTo(-4, -56);
      ctx.lineTo(-1, -66);
      ctx.lineTo(2, -56);
      ctx.lineTo(5, -64);
      ctx.lineTo(8, -55);
      ctx.lineTo(8, -50);
      ctx.quadraticCurveTo(0, -56, -8, -50);
      ctx.closePath();
      ctx.fill();
      const hair = ctx.createLinearGradient(0, -66, 0, -52);
      hair.addColorStop(0, '#3c3844');
      hair.addColorStop(1, '#16141a');
      ctx.strokeStyle = hair;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-1, -64);
      ctx.quadraticCurveTo(-5, -58, -2, -51);
      ctx.stroke();
      ctx.strokeStyle = '#3d86c9';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.ellipse(-4.2, -52, 3.3, 2.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(4.2, -52, 3.3, 2.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.9, -52);
      ctx.lineTo(0.9, -52);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5.6, -53);
      ctx.lineTo(-3.6, -53.2);
      ctx.moveTo(2.8, -53);
      ctx.lineTo(4.6, -53.2);
      ctx.stroke();
      if (this.hitFlash > 0) {
        ctx.globalAlpha = Math.min(0.65, this.hitFlash * 6);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, -36, 14, 22, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  R.Fireball = Fireball;
  R.Riley = Riley;
}());
