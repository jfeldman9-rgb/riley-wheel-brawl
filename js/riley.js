'use strict';
(function () {
  const R = window.RWB;
  const RILEY16 = R.RILEY16 = {
    height: 96,
    frames: {
      idle:[178,227,92,226], walk1:[173,229,95,229], walk2:[169,230,88,229],
      walk3:[166,229,95,229], walk4:[167,226,89,226], punch:[210,214,105,214],
      kick:[227,215,101,215], fireball:[303,206,144,205], hurt:[166,215,62,214], jump:[178,172,82,171]
    }
  };
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
      this.z = 30 + owner.z;
      const flyer = scene.enemies.find(e => e.flying && !e.dead && Math.abs(e.y - this.y) < 28 && (e.x - owner.x) * owner.facing > 0);
      // Aim once on release, never home; makes fireballs a usable anti-air tool.
      this.vz = flyer ? (flyer.z + 25 - this.z) / Math.max(0.15, Math.abs(flyer.x - this.x) / 330) : 0;
      this.vx = owner.facing * 330;
      this.life = 2.3;
      this.radius = owner.angreal > 0 ? 10 : 7;
      this.damage = owner.angreal > 0 ? 20 : 15;
      this.hit = new Set();
    }
    update(dt) {
      this.x += this.vx * dt;
      this.z += this.vz * dt;
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
      const x=this.x-cameraX,y=this.y-this.z,dir=Math.sign(this.vx)||1;
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
      for(let i=0;i<4;i++) {const trail=ctx.createLinearGradient(x-dir*42,y,x,y);trail.addColorStop(0,'#ff7b0000');trail.addColorStop(1,i%2?'#ffd86caa':'#ff6633aa');ctx.strokeStyle=trail;ctx.lineWidth=2+i*.6;ctx.beginPath();ctx.moveTo(x-dir*(34+i*4),y+Math.sin(this.x*.08+i)*6);ctx.quadraticCurveTo(x-dir*16,y+(i-1.5)*5,x,y);ctx.stroke();}
      ctx.restore();
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
      super(scene, 110, 268, { hp: 100, bw: 25, bh: 92, gravity: R.TUNE.gravity });
      const saved = carry || {};
      this.hpMax = 100;
      this.powerMax = 100;
      this.power = saved.saidin || 0;
      this.score = saved.score || 0;
      this.lives = saved.lives == null ? 3 : saved.lives;
      this.loialReady = saved.loial !== false;
      this.callandor = !!saved.callandor;
      this.stunTimer = 0;
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
      if (this.g.paused || this.dead) return;
      if (this.power < this.powerMax || this.g.phase !== 'play') {
        this.taintWarned = false;
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
        if (!this.taintWarned) { R.voice('moiraine_taint_01'); this.taintWarned = true; }
      }
    }
    update(dt, input) {
      if (this.grabbedBy) {
        this.grabTimer -= dt + (R.keyPressed(input, 'attack') ? 0.23 : 0);
        this.grabDamageClock += dt;
        this.vx = this.vy = 0;
        if (this.grabDamageClock >= 0.4) { this.grabDamageClock = 0; this.g.hitPlayer(3, this.grabbedBy.x, { kb:0, knockdown:false, source:'HYPNOTIC KISS' }); }
        if (this.grabTimer <= 0 || this.grabbedBy.dead) { this.grabbedBy = null; this.invuln = 0.7; }
        this.updateTaint(dt); super.update(dt); return;
      }
      if (this.stunTimer > 0) { this.stunTimer -= dt; this.vx = this.vy = 0; this.updateTaint(dt); super.update(dt); return; }
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
    spriteFrame() {
      const state = this.attackMove ? this.attackName : this.state;
      if (state === 'walk' && this.grounded) return 'walk' + (Math.floor(this.walkDistance / 20) % 4 + 1);
      if (!this.grounded || ['rise', 'fall', 'jump'].includes(state)) return this.attackMove ? 'kick' : 'jump';
      if (['front', 'round', 'back', 'spin', 'knee', 'kick', 'kick2', 'kick3', 'spinKick', 'launcher'].includes(state)) return 'kick';
      if (['punch', 'jab', 'combo', 'combo1', 'combo2', 'combo3'].includes(state)) return 'punch';
      if (['channel', 'fireball', 'throw', 'special', 'super', 'balefire'].includes(state)) return 'fireball';
      if (['hurt', 'knockback', 'knockdown', 'lying', 'getup', 'death'].includes(state) || this.dead) return 'hurt';
      return 'idle';
    }
    drawSprite(ctx, cameraX, forcedFrame) {
      const frame = forcedFrame || this.spriteFrame();
      const img = R.assets.get('riley16-' + frame), data = RILEY16.frames[frame];
      if (!img || !data) return false;
      const [w,h,ax,ay] = data, scale = RILEY16.height / RILEY16.frames.idle[1];
      const lying = !forcedFrame && (this.dead || ['knockdown', 'lying', 'death'].includes(this.state));
      ctx.save();
      ctx.translate(this.x - cameraX, this.y - this.z);
      if (lying) ctx.rotate(this.facing * 80 * Math.PI / 180);
      ctx.scale(this.facing, 1);
      if (this.invuln > 0 && Math.floor(this.invuln * 18) % 2 === 0) ctx.globalAlpha *= .55;
      if (this.dead) ctx.globalAlpha *= Math.max(.1, Math.min(1, 1 - this.deadTimer / .75));
      // Thin warm rim + contact shadow keep Riley readable against busy art.
      if (!this.ghost) ctx.filter = 'drop-shadow(0 0 1.2px rgba(255,232,180,.7)) drop-shadow(0 1px 1px rgba(0,0,0,.65))';
      ctx.drawImage(img, -ax * scale, -ay * scale, w * scale, h * scale);
      ctx.filter = 'none';
      ctx.restore();
      return true;
    }
    draw(ctx, cameraX) {
      this.drawShadow(ctx, cameraX, 18);
      if (!this.drawSprite(ctx, cameraX)) {
        // The compact procedural actor is retained only as a load-failure fallback.
        if (R.paint && R.paint(ctx, 'cg-riley', this.x-cameraX-40, this.y-this.z-96, 80, 96)) return;
      }
      if (this.angreal > 0) {
        ctx.save();ctx.strokeStyle='rgba(255,221,100,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(this.x-cameraX,this.y-this.z-48,31+Math.sin(this.stateT*8)*2,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
      if (this.callandor) {
        ctx.save();ctx.strokeStyle='#e8ffff';ctx.shadowColor='#9deaff';ctx.shadowBlur=10;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(this.x-cameraX-13,this.y-this.z-31);ctx.lineTo(this.x-cameraX-25,this.y-this.z-86);ctx.stroke();ctx.restore();
      }
      if (this.hitFlash > 0) {
        ctx.save();ctx.globalAlpha=Math.min(.65,this.hitFlash*6);ctx.fillStyle='#fff4d5';ctx.beginPath();ctx.ellipse(this.x-cameraX,this.y-this.z-48,23,43,0,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }
  }
  R.Fireball = Fireball;
  R.Riley = Riley;
}());
