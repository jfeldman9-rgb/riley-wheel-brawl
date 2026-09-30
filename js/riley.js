'use strict';
(function () {
  const R = window.RWB;
  const RILEY16 = R.RILEY16 = {
    height: 96,
    frames: {
      walk1:[136,231,72,230],walk2:[126,228,58,227],walk3:[100,231,48,230],walk4:[117,235,58,234],
      walk5:[144,231,73,230],walk6:[115,226,56,225],walk7:[96,233,48,232],walk8:[129,235,62,234],
      idle:[167,229,83,228],punch:[203,229,100,228],kick:[208,234,73,233],fireball:[257,201,135,200],
      hurt:[165,219,51,218],jump:[143,170,84,169],roundhouse:[223,238,74,237],knee:[115,238,43,237],
      channel:[146,238,71,237],lying:[227,83,116,82],getup:[136,141,87,140]
    }
  };
  const rims=new Map(),flashes=new Map();
  // Hand positions are authored in actor-space game units.  Keeping this table
  // beside the atlas makes Callandor follow the actual pose instead of Riley's
  // collision box. Angles point from the grip toward the blade tip.
  const HANDS=R.RILEY16.hands={
    idle:[19.7,-69,-.22],walk1:[20.1,-47,-2.25],walk2:[22.6,-49.5,-2.08],walk3:[17.6,-55,-1.94],
    walk4:[19.7,-53,-2.12],walk5:[10.5,-40,-2.34],walk6:[19.3,-45.3,-2.16],walk7:[14.7,-55.3,-1.98],walk8:[22.2,-55.8,-2.12],
    punch:[32.3,-73,.72],kick:[0,-64,-1.02],fireball:[9.6,-35.6,.58],hurt:[29.3,-45,-.82],jump:[8.8,-40,-.65],
    roundhouse:[20.5,-71,-1.22],knee:[18,-77,-.28],channel:[10,-57,-.08],lying:[-21,-5,-1.42],getup:[6,-4,.72]
  };
  // Measured glove centres in each original painted frame. Earlier action
  // anchors landed on the belt/raised leg in several poses; use the actual
  // fist pixels, then transform with the same atlas anchor as Riley's body.
  RILEY16.handPixels = {
    walk1:[119,113],walk2:[113,106],walk3:[88,95],walk4:[105,103],
    walk5:[100,106],walk6:[102,110],walk7:[82,95],walk8:[115,99],
    punch:[177,48],kick:[43,56],fireball:[174,76],hurt:[141,68],jump:[114,58],
    roundhouse:[123,49],knee:[81,45],channel:[88,66],lying:[66,70],getup:[101,132]
  };
  for (const [frame, hand] of Object.entries(RILEY16.handPixels)) {
    const data=RILEY16.frames[frame],scale=RILEY16.height/RILEY16.frames.idle[1];
    HANDS[frame][0]=(hand[0]-data[2])*scale;HANDS[frame][1]=(hand[1]-data[3])*scale;
  }
  // [sole x, sole y, planted side, distance span], in actor units relative to
  // the atlas anchor. Spans are the measured body travel to the next exposure;
  // each four-frame stance totals 32u and begins on a check/contact boundary.
  R.RILEY16.feet={
    walk1:[11.5,0,'right',6.3],walk2:[13.2,0,'right',7.1],walk3:[-1.9,0,'right',13.4],walk4:[11.2,-1.3,'right',5.2],
    walk5:[14.5,0,'left',8],walk6:[9.5,0,'left',9.6],walk7:[.4,0,'left',13.4],walk8:[-13,0,'left',1]
  };
  const WALK_STANCES=[['walk1','walk2','walk3','walk4'],['walk5','walk6','walk7','walk8']];
  function walkContact(distance){
    const into=((distance%64)+64)%64,stance=into<32?0:1,phase=into-stance*32,frames=WALK_STANCES[stance];
    let start=0,index=0;
    while(index<frames.length-1&&phase>=start+RILEY16.feet[frames[index]][3])start+=RILEY16.feet[frames[index++]][3];
    return {frame:frames[index],foot:RILEY16.feet[frames[index]],phase,start,first:RILEY16.feet[frames[0]][0]};
  }
  let swordCanvas=null;
  function prepareSword(){
    if(swordCanvas)return swordCanvas;
    const c=document.createElement('canvas');c.width=24;c.height=92;const g=c.getContext('2d');
    // Point up, with the wrapped grip centred at (12,83). All gradients are built once.
    const glass=g.createLinearGradient(5,0,19,0);glass.addColorStop(0,'rgba(25,54,92,.72)');glass.addColorStop(.28,'rgba(126,235,255,.30)');glass.addColorStop(.63,'rgba(235,255,255,.66)');glass.addColorStop(1,'rgba(37,88,132,.62)');
    g.fillStyle=glass;g.beginPath();g.moveTo(12,1);g.lineTo(19,14);g.lineTo(17,65);g.lineTo(12,72);g.lineTo(6,65);g.lineTo(5,14);g.closePath();g.fill();
    g.strokeStyle='rgba(238,255,255,.9)';g.lineWidth=1;g.beginPath();g.moveTo(12,2);g.lineTo(8,64);g.lineTo(12,70);g.moveTo(12,2);g.lineTo(16,64);g.stroke();
    g.strokeStyle='rgba(14,25,58,.85)';g.beginPath();g.moveTo(6,15);g.lineTo(7,64);g.stroke();
    g.strokeStyle='rgba(190,251,255,.75)';g.lineWidth=1.5;g.beginPath();g.moveTo(12,12);g.lineTo(12,61);g.stroke();
    g.fillStyle='#c6d1d5';g.fillRect(2,70,20,4);g.fillStyle='#61717d';g.fillRect(7,74,10,3);
    g.fillStyle='#17202b';g.fillRect(9,77,6,12);g.strokeStyle='#a9bdc8';g.lineWidth=1;for(let y=78;y<89;y+=3){g.beginPath();g.moveTo(9,y);g.lineTo(15,y+2);g.stroke();}
    g.fillStyle='#d8eef2';g.beginPath();g.arc(12,90,3,0,Math.PI*2);g.fill();swordCanvas=c;return c;
  }
  function rimFrame(frame,stage){
    const colors=['255,224,158','198,220,255','185,166,255','255,205,145','174,147,255'],key=frame+':'+stage;
    if(rims.has(key))return rims.get(key);const img=R.assets.get('riley16-'+frame);if(!img)return null;
    const c=document.createElement('canvas');c.width=img.width+16;c.height=img.height+16;const g=c.getContext('2d');
    g.filter='drop-shadow(0 0 2.84px rgba('+(colors[stage]||colors[0])+',.72)) drop-shadow(0 2.36px 2.36px rgba(0,0,0,.65))';g.drawImage(img,8,8);rims.set(key,c);return c;
  }
  function flashFrame(frame){
    if(flashes.has(frame))return flashes.get(frame);const img=R.assets.get('riley16-'+frame);if(!img)return null;
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');
    g.drawImage(img,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='#fff4c8';g.fillRect(0,0,c.width,c.height);flashes.set(frame,c);return c;
  }
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
      if (R.util.fxRand(0, 1) < 0.55) this.g.fx.sparks(this.x, this.y - this.z, '#ffb33d', 1);
      for (const enemy of this.g.enemies) {
        if (enemy.dead || this.hit.has(enemy)) continue;
        if (!R.collide.circle(this.x, this.y, this.z, this.radius, 25, enemy.hurtbox())) continue;
        this.hit.add(enemy);
        this.life = 0;
        this.g.damageEnemy(enemy, this.damage, this.owner.x, { kb: 105, move: 'fireball' });
        this.g.fx.impact(this.x,this.y-this.z,this.owner.facing,'heavy','#ff8b38');
        this.g.camera.impact(this.owner.facing, 'light');
        this.g.playCue('fireHit');
      }
    }
    draw(ctx, cameraX) {
      const x=this.x-cameraX,y=this.y-this.z,dir=Math.sign(this.vx)||1;
      const phase=Math.floor(this.x*.08*4/Math.PI)%8;
      const texture=R.effects.stamp('fireball:'+phase,(g)=>{
        g.translate(68,48);g.lineCap='round';g.globalCompositeOperation='lighter';
        for(let i=0;i<4;i++){const trail=g.createLinearGradient(-42,0,0,0);trail.addColorStop(0,'#ff7b0000');trail.addColorStop(1,i%2?'#ffd86caa':'#ff6633aa');g.strokeStyle=trail;g.lineWidth=2+i*.6;g.beginPath();g.moveTo(-(34+i*4),Math.sin(phase*Math.PI/4+i)*6);g.quadraticCurveTo(-16,(i-1.5)*5,0,0);g.stroke();}
        g.globalCompositeOperation='source-over';const glow=g.createRadialGradient(0,0,1,0,0,16);glow.addColorStop(0,'#ffffff');glow.addColorStop(.25,'#ffe06e');glow.addColorStop(.65,'#f46b28');glow.addColorStop(1,'rgba(244,60,20,0)');g.fillStyle=glow;g.beginPath();g.arc(0,0,16,0,Math.PI*2);g.fill();
      });
      ctx.save();ctx.translate(x,y);ctx.scale(dir,1);ctx.drawImage(texture,-68,-48);ctx.restore();
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
      this.utilitySpoken = new Set();
      this.nextUtilityAt = 0;
      this.lowVoiceArmed = true;
      this.powerWasFull = this.power >= this.powerMax;
      this.deadTimer = 0;
      this.getupTimer = 0;
    }
    get busy() {
      return !!this.attackMove || ['hurt', 'knockdown', 'lying', 'getup', 'death', 'super'].includes(this.state);
    }
    /** Context-only flavor: never queue it behind dialogue or interrupt speech.
        An obscured event is dropped, not replayed later after it loses meaning. */
    utilityVoice(id, once = true) {
      const g = this.g, A = R.audio;
      if (once && this.utilitySpoken.has(id)) return false;
      if (this.dead || g.phase !== 'play' || g.paused || g.subtitle || g.subtitleQueue.length ||
          g.time < this.nextUtilityAt || A.voicePlaying || A.voicePending) return false;
      if (once) this.utilitySpoken.add(id);
      this.nextUtilityAt = g.time + 6;
      R.voice(id, { flavor: true });
      return true;
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
        this.utilityVoice('riley_grab_01');
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
      this.g.fx.impact(enemy.x,enemy.y-enemy.z-40,direction,'heavy',this.callandor?'#9ff5ff':'#fff0ad');
      this.g.movesUsed.add('throw');
      this.setState('throw');
      this.channelTimer = R.MOVES.throw.duration;
      this.utilityVoice('riley_throw_01');
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
          const landed = this.g.damageEnemy(enemy, move.damage, this.x, { kb: move.knockback, knockdown: move.knockdown, move: this.attackName });
          if (landed && this.g.levelIndex === 0) {
            const line = { front: 'riley_combo_01', round: 'riley_combo_02', back: 'riley_combo_03' }[this.attackName];
            if (line) this.utilityVoice(line);
          }
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
      if (this.hp > 40) this.lowVoiceArmed = true;
      const full = this.power >= this.powerMax;
      if (full && !this.powerWasFull) this.utilityVoice('riley_saidin_full_01');
      this.powerWasFull = full;
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
      if (this.state === 'getup' && this.stateT > 0.42) {
        // Protect the first controllable recovery frames, including an externally
        // entered get-up pose. Existing respawn/knockdown grace stays intact.
        this.invuln = Math.max(this.invuln, 0.24);
        this.setState('idle');
      }
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
        const pace = this.g && this.g.marching ? (this.g.marchPace || 1) : 1;
        this.vx = axis.x * R.TUNE.playerSpeed * scale * pace;
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
      // The painted torso is wider than the 25-unit hurtbox. Keep its centre
      // a full half-body inside the visible left wall, including during recoil.
      const visibleLeft = Math.max(this.g.arenaLeft, this.g.camera ? this.g.camera.x : this.g.arenaLeft);
      this.x = R.util.clamp(this.x, visibleLeft + 40, this.g.arenaRight - 40);
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
      this.hitFlash = 0.16;
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
      if (this.hp <= 25 && this.lowVoiceArmed) {
        this.lowVoiceArmed = false;
        this.utilityVoice('riley_low_01', false);
      }
    }
    pose() {
      let key = this.state;
      if (this.attackMove) key = this.attackName;
      if (key === 'jump') key = 'fall';
      const frames = R.RILEY_POSES[key] || R.RILEY_POSES.idle;
      let index = 0;
      if (key === 'walk') index = Math.floor(this.walkDistance / 16) % frames.length;
      else if (frames.length > 1) index = Math.min(frames.length - 1, Math.floor(this.stateT / Math.max(0.08, (this.attackMove ? this.attackMove.duration : 0.4) / frames.length)));
      else if (key === 'idle') index = Math.floor(this.stateT * 2) % frames.length;
      return frames[index];
    }
    spriteFrame() {
      const state = this.attackMove ? this.attackName : this.state;
      if (state === 'walk' && this.grounded) return walkContact(this.walkDistance).frame;
      if (!this.grounded || ['rise', 'fall', 'jump'].includes(state)) return this.attackMove ? 'kick' : 'jump';
      if (['round', 'back', 'spin', 'kick2', 'kick3', 'spinKick', 'launcher'].includes(state)) return 'roundhouse';
      if (state === 'knee') return 'knee';
      if (['front', 'kick'].includes(state)) return 'kick';
      if (['punch', 'jab', 'combo', 'combo1', 'combo2', 'combo3'].includes(state)) return 'punch';
      if (['channel', 'super', 'balefire'].includes(state)) return 'channel';
      if (['fireball', 'throw', 'special'].includes(state)) return 'fireball';
      if (['knockdown', 'lying', 'death'].includes(state) || this.dead) return 'lying';
      if (state === 'getup') return 'getup';
      if (['hurt', 'knockback'].includes(state)) return 'hurt';
      return 'idle';
    }
    drawSprite(ctx, cameraX, forcedFrame) {
      const frame = forcedFrame || this.spriteFrame();
      const img = R.assets.get('riley16-' + frame), data = RILEY16.frames[frame];
      if (!img || !data) return false;
      const [w,h,ax,ay] = data, scale = RILEY16.height / RILEY16.frames.idle[1];
      const lying = !forcedFrame && (this.dead || ['knockdown', 'lying', 'death'].includes(this.state));
      // The per-frame sole table drives the distance cadence; a tiny correction
      // removes pixel-rounding error without detaching the body from its hitbox.
      let drawX = this.x, drawY = this.y, legShift=0;
      if (!forcedFrame && !lying && this.grounded && frame && frame.indexOf('walk') === 0) {
        const contact=walkContact(this.walkDistance),foot=contact.foot;
        // Lock the stance sole at touchdown. Only two units may move the body;
        // the remaining correction is skinned progressively below the hip.
        const correction=this.facing*(contact.first-contact.phase-foot[0]);
        const bodyShift=Math.max(-2,Math.min(2,correction));
        drawX+=bodyShift;legShift=(correction-bodyShift)*this.facing;
        drawY=this.y-foot[1];
      }
      this._spriteX = drawX;
      ctx.save();
      ctx.translate(drawX - cameraX, drawY - this.z);
      ctx.scale(this.facing, 1);
      const smoothing=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
      if (this.invuln > 0 && Math.floor(this.invuln * 18) % 2 === 0) ctx.globalAlpha *= .55;
      if (this.dead) ctx.globalAlpha *= Math.max(.1, Math.min(1, 1 - this.deadTimer / .75));
      // Thin warm rim + contact shadow keep Riley readable against busy art.
      const rim=!this.ghost&&rimFrame(frame,this.g ? (this.g.levelIndex||0) : 0);
      const drawSkinned=(source,pad)=>{
        const sw=w+pad*2,sh=h+pad*2,hip=Math.floor((ay-88)+pad),sole=ay+pad;
        ctx.drawImage(source,0,0,sw,hip,(-ax-pad)*scale,(-ay-pad)*scale,sw*scale,hip*scale);
        // Rasterise exactly one complete device row at a time. Source-row
        // strips are only .42 actor units high, so their fractional device
        // edges used to be antialiased and repeatedly source-over composited.
        // Sampling at each device-row centre preserves the continuous shear
        // without translucent overlaps; only x is allowed to remain fractional.
        const tr=ctx.getTransform(),top=(-ay-pad+hip)*scale,bottom=(-ay-pad+sh)*scale;
        const first=Math.floor(tr.d*top+tr.f),last=Math.ceil(tr.d*bottom+tr.f);
        for(let deviceY=first;deviceY<last;deviceY++){
          const localY=(deviceY+.5-tr.f)/tr.d;
          const sy=Math.max(hip,Math.min(sh-1,Math.floor(localY/scale+ay+pad)));
          const t=Math.max(0,Math.min(1,(sy+.5-hip)/(sole-hip))),smooth=t*t*(3-2*t);
          ctx.drawImage(source,0,sy,sw,1,(-ax-pad)*scale+legShift*smooth,(deviceY-tr.f)/tr.d,sw*scale,1/tr.d);
        }
      };
      if(legShift&&rim)drawSkinned(rim,8);else if(legShift)drawSkinned(img,0);
      else if(rim)ctx.drawImage(rim,(-ax-8)*scale,(-ay-8)*scale,(w+16)*scale,(h+16)*scale);
      else ctx.drawImage(img, -ax * scale, -ay * scale, w * scale, h * scale);
      if(this.hitFlash>0){const flash=flashFrame(frame);if(flash){ctx.globalAlpha*=Math.min(.75,this.hitFlash*6);ctx.drawImage(flash,-ax*scale,-ay*scale,w*scale,h*scale);}}
      ctx.imageSmoothingEnabled=smoothing;
      ctx.restore();
      return true;
    }
    draw(ctx, cameraX) {
      this.drawShadow(ctx, cameraX, 18);
      // In the resting stance the original painted glove must close around
      // the hilt. Drawing the sword first preserves those fingers unmodified.
      const idleCallandor=this.callandor&&this.spriteFrame()==='idle';
      if(idleCallandor)this.drawCallandor(ctx,cameraX);
      if (!this.drawSprite(ctx, cameraX)) {
        // The compact procedural actor is retained only as a load-failure fallback.
        if (R.paint && R.paint(ctx, 'cg-riley', this.x-cameraX-40, this.y-this.z-96, 80, 96)) return;
      }
      if (this.angreal > 0) {
        ctx.save();ctx.strokeStyle='rgba(255,221,100,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(this.x-cameraX,this.y-this.z-48,31+Math.sin(this.stateT*8)*2,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
      if (this.callandor&&!idleCallandor) this.drawCallandor(ctx,cameraX);
      // Hit tint is baked into Riley's own pixels inside drawSprite.
    }
    drawCallandor(ctx,cameraX){
      const frame=this.spriteFrame(),h=HANDS[frame]||HANDS.idle,lying=this.dead||['knockdown','lying','death'].includes(this.state);
      const alpha=this.dead?Math.max(.1,Math.min(1,1-this.deadTimer/.75)):(this.invuln>0&&Math.floor(this.invuln*18)%2===0?.55:1);
      const attack=this.attackMove,progress=attack?Math.min(1,this.stateT/Math.max(.01,attack.duration)):0;
      const swing=attack?(-110+150*progress)*Math.PI/180:0;
      // Every pose anchors the wrapped grip centre, never the collar above it.
      const gripY=83;
      let bodyX=this.x,bodyY=this.y;
      if (!lying && this.grounded && frame.indexOf('walk')===0) {
        const contact=walkContact(this.walkDistance),correction=this.facing*(contact.first-contact.phase-contact.foot[0]);
        bodyX+=Math.max(-2,Math.min(2,correction));bodyY-=contact.foot[1];
      }
      ctx.save();ctx.globalAlpha*=alpha;ctx.translate(bodyX-cameraX,bodyY-this.z);ctx.scale(this.facing,1);ctx.translate(h[0],h[1]);ctx.rotate(h[2]+swing);
      ctx.globalAlpha*=.96;ctx.drawImage(prepareSword(),-12,-gripY);ctx.restore();
      const angle=h[2]+swing,cs=Math.cos(angle),sn=Math.sin(angle),tip={x:bodyX+this.facing*(h[0]+sn*gripY),y:bodyY-this.z+h[1]-cs*gripY};
      if(this.attackMove){this.callandorTips=this.callandorTips||[];this.callandorTips.push({x:tip.x,y:tip.y,t:performance.now()});if(this.callandorTips.length>9)this.callandorTips.shift();}
      else this.callandorTips=[];
      if(this.callandorTips.length>1){ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineJoin='round';const grip={x:bodyX+this.facing*h[0],y:bodyY-this.z+h[1]},n=this.callandorTips.length;for(let i=1;i<n;i++){const a=this.callandorTips[i-1],b=this.callandorTips[i],fade=i/n,ma={x:(grip.x+a.x)*.5,y:(grip.y+a.y)*.5},mb={x:(grip.x+b.x)*.5,y:(grip.y+b.y)*.5};ctx.globalAlpha=.08+fade*.25;ctx.fillStyle='#75dfff';ctx.beginPath();ctx.moveTo(ma.x-cameraX,ma.y);ctx.lineTo(a.x-cameraX,a.y);ctx.lineTo(b.x-cameraX,b.y);ctx.lineTo(mb.x-cameraX,mb.y);ctx.closePath();ctx.fill();ctx.globalAlpha=.18+fade*.55;ctx.strokeStyle='#efffff';ctx.lineWidth=2+fade*3;ctx.beginPath();ctx.moveTo(a.x-cameraX,a.y);ctx.lineTo(b.x-cameraX,b.y);ctx.stroke();}ctx.restore();}
    }
  }
  R.Fireball = Fireball;
  R.Riley = Riley;
  // Sprite-derived canvases are intentionally lazy: only frames actually drawn
  // in the current stage occupy memory, never five complete tinted atlases at boot.
  R.Riley.prepare=()=>{prepareSword();};
}());
