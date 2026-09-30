'use strict';
(function () {
  const R = window.RWB;
  function beamTexture(){
    return R.effects.stamp('dark-balefire-r6',g=>{
      const grad=g.createLinearGradient(0,0,0,64);
      grad.addColorStop(0,'rgba(114,42,190,0)');grad.addColorStop(.16,'rgba(151,82,230,.42)');
      grad.addColorStop(.2,'rgba(247,226,255,.96)');grad.addColorStop(.3125,'#1a071f');
      grad.addColorStop(.6875,'#08030d');grad.addColorStop(.8,'rgba(247,226,255,.96)');
      grad.addColorStop(.84,'rgba(151,82,230,.42)');grad.addColorStop(1,'rgba(114,42,190,0)');
      g.fillStyle=grad;g.fillRect(0,0,136,64);
    },136,64);
  }
  // Strikes snapshot their lane; tells and collision share the same dimensions.
  class ShadowStrike {
    constructor(g, x, y, opts) {
      Object.assign(
        this,
        {
          g,
          x,
          y,
          z: 0,
          w: 80,
          h: 100,
          depth: 19,
          tell: 0.7,
          duration: 0.24,
          damage: 15,
          color: '#c894ff',
          source: 'WEAVE',
          stun: 0,
        },
        opts,
      );
      this.age = 0;
      this.life = this.tell + this.duration;
      this.hit = false;
    }
    update(dt) {
      this.age += dt;
      this.life -= dt;
      if (this.age < this.tell || this.hit) return;
      const box = R.collide.box(this.x, this.y, this.z, this.w, this.h, this.depth);
      this.g.enemyHitboxes.push(box);
      if (R.collide.overlap(box, this.g.player.hurtbox())) {
        this.hit = true;
        if (
          this.g.hitPlayer(this.damage, this.x, {
            kb: 90,
            knockdown: false,
            source: this.source,
          }) &&
          this.stun
        )
          this.g.player.stunTimer = this.stun;
      }
    }
    draw(ctx, cam) {
      const beam = this.source === 'BALEFIRE' || this.source === 'DARK BALEFIRE';
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.age < this.tell ? 0.45 : 0.8;
      ctx.lineWidth = 2;
      if (this.age < this.tell && beam) {
        const start=this.beamStartX==null?this.x-this.w/2:this.beamStartX,end=this.beamEndX==null?this.x+this.w/2:this.beamEndX;
        const cy=this.beamY==null?this.y-55:this.beamY,pulse=.35+.25*Math.sin(this.age*18);
        ctx.globalAlpha=pulse;ctx.strokeStyle='#c88cff';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(start-cam,cy);ctx.lineTo(end-cam,cy);ctx.stroke();
        ctx.globalAlpha=pulse*.35;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(start-cam,this.y);ctx.lineTo(end-cam,this.y);ctx.stroke();
        ctx.globalAlpha=.65;ctx.fillStyle='#ead6ff';ctx.beginPath();ctx.arc(start-cam,cy,4+3*Math.sin(this.age*22),0,Math.PI*2);ctx.fill();
      } else if (this.age < this.tell) {
        ctx.strokeRect(this.x - cam - this.w / 2, this.y - this.depth, this.w, this.depth * 2);
        for (let x = -this.w / 2; x < this.w / 2; x += 14) {
          ctx.beginPath();
          ctx.moveTo(this.x - cam + x, this.y + this.depth);
          ctx.lineTo(this.x - cam + x + 10, this.y - this.depth);
          ctx.stroke();
        }
      } else if (beam) {
        // Cached gradient strip: only a stretch/blit occurs in the hot path.
        const start=this.beamStartX==null?this.x-this.w/2:this.beamStartX,end=this.beamEndX==null?this.x+this.w/2:this.beamEndX;
        const left=start-cam,right=end-cam,cy=this.beamY==null?this.y-55:this.beamY;
        // Preserve the violet-black heart under normal compositing; only the
        // edge energy, tendrils and blooms are additive.
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.96;ctx.drawImage(beamTexture(),Math.min(left,right),cy-16,Math.abs(right-left),32);
        ctx.globalCompositeOperation='lighter';
        ctx.strokeStyle='rgba(190,112,255,.75)';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();for(let n=0;n<=12;n++){const x=left+(right-left)*n/12,yy=cy+(i-1)*14+Math.sin(n*1.7+this.age*34+i)*6;n?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}ctx.stroke();}
        for(const p of [[left,10],[right,17]]){ctx.globalAlpha=.8;ctx.drawImage(R.effects.glow('#d9a6ff'),p[0]-p[1],cy-p[1],p[1]*2,p[1]*2);}
      } else ctx.fillRect(this.x - cam - this.w / 2, this.y - this.z - this.h, this.w, this.h);
      ctx.restore();
    }
  }
  const TYPES = {
    darkfriend: {
      hp: 125,
      speed: 94,
      color: '#6c294e',
      art: 'darkfriend',
      move: {
        name: 'DAGGER FEINT',
        tell: 0.46,
        active: 0.18,
        recover: 0.46,
        reach: 52,
        height: 45,
        depth: 19,
        damage: 12,
      },
    },
    cultist: {
      hp: 145,
      speed: 63,
      color: '#645577',
      art: 'cultist',
      move: {
        name: 'SILVER LANTERN',
        tell: 0.7,
        active: 0.25,
        recover: 0.6,
        reach: 85,
        height: 45,
        depth: 22,
        damage: 14,
      },
    },
    guard: {
      hp: 190,
      speed: 61,
      color: '#426777',
      art: 'stone-guard',
      move: {
        name: 'GUARD SPEAR',
        tell: 0.66,
        active: 0.2,
        recover: 0.65,
        reach: 94,
        height: 48,
        depth: 15,
        damage: 16,
      },
    },
    ashaman: {
      hp: 170,
      speed: 73,
      color: '#151c31',
      art: 'turned-ashaman',
      move: {
        name: 'FIRE WEAVE',
        tell: 0.85,
        active: 0.24,
        recover: 0.8,
        reach: 230,
        height: 56,
        depth: 18,
        damage: 17,
      },
    },
  };
  class ShadowSoldier extends R.Trolloc {
    constructor(g, x, y, kind) {
      super(g, x, y, kind === 'guard' ? 'spear' : 'axe');
      this.kind = kind;
      this.config = TYPES[kind];
      this.hp = this.hpMax = this.config.hp + g.wave * 8;
      this.speed = this.config.speed;
      this.laneBias = 0;
    }
    requestAttack() {
      if (!this.g.directorCanAttack(this)) return;
      this.attack = this.config.move;
      this.ai = 'telegraph';
      this.aiTimer = this.attack.tell;
      this.attackDidHit = false;
      this.g.registerAttacker(this);
      this.setState('telegraph');
    }
    updateAI(dt) {
      if (this.advanceEntry(dt)) return;
      if (
        this.kind === 'ashaman' &&
        this.ai === 'approach' &&
        Math.abs(this.x - this.g.player.x) < 220 &&
        Math.abs(this.y - this.g.player.y) < 17
      )
        this.requestAttack();
      super.updateAI(dt);
    }
    draw(ctx, cam) {
      drawActor(this, ctx, cam, this.config.color, this.config.art);
    }
  }
  function drawActor(a, ctx, cam, color, art) {
    a.drawTell(ctx, cam);
    a.drawShadow(ctx, cam, a.boss ? 24 : 17);
    const size = a.boss ? 94 : 75,
      step = a.state === 'walk' ? Math.sin(a.walkDistance / 13) : 0,
      bob = Math.abs(step) * 2;
    ctx.save();
    ctx.translate(a.x - cam, a.y - a.z);
    ctx.scale(a.facing, 1);
    if (a.dead) {
      ctx.globalAlpha = Math.max(0, a.deathTimer / 0.75);
      ctx.rotate(-0.7);
    }
    if (R.paint(ctx, 'cg-' + art, -size / 2, -size - bob, size, size)) {
      ctx.restore();
      return;
    }
    if (a.kind === 'draghkar') {
      const flap = Math.sin(a.flightTime * 10) * 15;
      ctx.fillStyle = '#6f678c';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, -45);
        ctx.lineTo(s * 59, -70 + flap);
        ctx.lineTo(s * 45, -30);
        ctx.lineTo(s * 20, -33);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.strokeStyle = '#121828';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, -23);
    ctx.lineTo(-8 + step * 9, -10);
    ctx.lineTo(-9 + step * 14, 0);
    ctx.moveTo(7, -23);
    ctx.lineTo(8 - step * 9, -10);
    ctx.lineTo(9 - step * 14, 0);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-15, -60 - bob);
    ctx.lineTo(15, -60 - bob);
    ctx.lineTo(21 + step * 3, -15);
    ctx.lineTo(-20, -15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = a.kind === 'taim' ? '#e6b94a' : '#a1acb8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-13, -51);
    ctx.lineTo(-19 - step * 8, -32);
    ctx.moveTo(13, -51);
    ctx.lineTo(20 + step * 8, a.ai === 'telegraph' ? -67 : -33);
    ctx.stroke();
    ctx.fillStyle = ['fade', 'draghkar'].includes(a.kind) ? '#d5d9e4' : '#d1a68b';
    ctx.beginPath();
    ctx.ellipse(0, -69 - bob, 10, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#171923';
    ctx.fillRect(-10, -82 - bob, 20, 6);
    if (a.kind !== 'fade') {
      ctx.fillRect(-5, -70 - bob, 3, 2);
      ctx.fillRect(3, -70 - bob, 3, 2);
    }
    if (!['draghkar', 'ashaman'].includes(a.kind)) {
      ctx.strokeStyle = '#dde9f2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(19, -35);
      ctx.lineTo(a.ai === 'attack' ? 60 : 28, a.ai === 'attack' ? -40 : -82);
      ctx.stroke();
    }
    if (a.kind === 'taim') {
      ctx.strokeStyle = '#c44836';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-16, -55);
      ctx.lineTo(-21, -44);
      ctx.lineTo(-16, -32);
      ctx.moveTo(16, -55);
      ctx.lineTo(22, -44);
      ctx.lineTo(17, -32);
      ctx.stroke();
    }
    if (a.hitFlash > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.strokeRect(-19, -84, 38, 68);
    }
    ctx.restore();
  }
  const MOVES = {
    fade: [
      { name: 'SHADOW BLINK', tell: 0.85, active: 0.32, recover: 0.8, mode: 'blink' },
      { name: 'SWORD COMBO', tell: 0.65, active: 0.95, recover: 0.85, mode: 'combo' },
      { name: 'FEAR STUN', tell: 1, active: 0.25, recover: 0.85, mode: 'fear' },
    ],
    draghkar: [
      { name: 'SWOOP', tell: 0.9, active: 0.75, recover: 0.85, mode: 'swoop' },
      { name: 'HYPNOTIC KISS', tell: 1.1, active: 0.65, recover: 1.1, mode: 'kiss' },
      { name: 'WING GUST', tell: 0.8, active: 0.35, recover: 0.8, mode: 'gust' },
    ],
    forsaken: [
      { name: 'SWORD FLURRY', tell: 0.7, active: 0.95, recover: 0.8, mode: 'combo' },
      { name: 'BALEFIRE', tell: 1.15, active: 0.35, recover: 1, mode: 'beam' },
      { name: 'WEAVE SNARE', tell: 0.85, active: 0.25, recover: 0.9, mode: 'snare' },
    ],
    taim: [
      { name: 'DARK BALEFIRE', tell: 1.05, active: 0.4, recover: 0.65, mode: 'beam' },
      { name: 'STORM STRIKES', tell: 0.85, active: 0.65, recover: 0.7, mode: 'storm' },
      { name: 'SHADOW SURGE', tell: 0.85, active: 0.65, recover: 0.8, mode: 'surge' },
    ],
  };
  class ShadowBoss extends R.Trolloc {
    constructor(g, x, y, kind) {
      super(g, x, y, 'axe');
      this.kind = kind;
      this.boss = true;
      this.laneBias = 0;
      this.hp = this.hpMax = kind === 'taim' ? 1500 : kind === 'draghkar' ? 700 : 1100;
      this.bw = 36;
      this.bh = 80;
      this.speed = 84;
      this.scoreValue = 4000;
      this.usedAttacks = new Set();
      this.receivedMoves = new Set();
      this.attackIndex = Math.floor(Math.random() * 3);
      this.introTimer = 3.2;
      this.ai = 'approach';
      this.aiTimer = 0.5;
      this.flying = kind === 'draghkar';
      this.z = this.flying ? 48 : 0;
      this.flightTime = 0;
    }
    takeHit(dmg, fromX, opts = {}) {
      if (this.introTimer > 0) return false;
      if (this.flying && !['jump', 'fireball'].includes(opts.move)) return false;
      if (this.kind === 'taim' && !opts.jointFinish) dmg = Math.min(dmg, Math.max(0, this.hp - 1));
      if (dmg <= 0) return this.kind === 'taim' && !this.dead && this.invuln <= 0;
      const landed = super.takeHit(dmg, fromX, opts);
      if (landed) this.receivedMoves.add(opts.move || 'other');
      if (this.kind === 'taim' && this.hp <= this.hpMax * 0.22 && !this.jointReady) {
        this.jointReady = true;
        this.g.freeTwinkle();
      }
      return landed;
    }
    onHurt() {
      this.hitFlash = 0.13;
      this.vx *= 0.15;
    }
    requestAttack() {
      const moves=MOVES[this.kind], previous=this.attack;
      let pick=Math.floor(R.util.rand(0,moves.length));
      if(moves[pick]===previous) pick=(pick+1)%moves.length;
      this.attack = moves[pick]; this.attackIndex++;
      this.ai = 'telegraph';
      this.aiTimer = this.attack.tell;
      this.attackDidHit = false;
      this.pulseIndex = -1;
      this.target = { x: this.g.player.x, y: this.g.player.y };
      this.facing = this.target.x >= this.x ? 1 : -1;
      this.setState('telegraph');
      this.g.warning = this.attack.name;
      this.g.warningTimer = this.attack.tell;
      if (this.attack.mode === 'blink')
        this.blinkTo = R.util.clamp(
          this.target.x - this.facing * 64,
          this.g.arenaLeft + 30,
          this.g.arenaRight - 30,
        );
    }
    strike(x, y, opts) {
      this.g.hazards.push(
        new ShadowStrike(this.g, x, y, Object.assign({ tell: 0, source: this.attack.name }, opts)),
      );
    }
    beginActive() {
      this.usedAttacks.add(this.attack.name);
      this.setState('attack');
      this.g.playCue(this.kind === 'draghkar' ? 'whoosh' : 'balefire');
      const m = this.attack.mode;
      if (m === 'blink') {
        this.x = this.blinkTo;
        this.y = this.target.y;
        this.facing = this.target.x > this.x ? 1 : -1;
      }
      if (m === 'fear')
        this.strike(this.x, this.y, { w: 230, depth: 33, h: 40, damage: 7, stun: 0.9 });
      if (m === 'beam')
        this.strike((this.g.arenaLeft + this.g.arenaRight) / 2, this.target.y, {
          w: this.g.arenaRight - this.g.arenaLeft,
          h: 90,
          depth: 17,
          damage: 23,
          duration: 0.36,
          color: '#fff5b1',
          beamStartX: this.x + this.facing * 18,
          beamEndX: this.facing > 0 ? this.g.arenaRight : this.g.arenaLeft,
          beamY: this.y - this.z - 58,
        });
      if (m === 'snare')
        this.strike(this.target.x, this.target.y, {
          w: 86,
          h: 25,
          depth: 27,
          damage: 10,
          stun: 0.85,
        });
      if (m === 'storm')
        for (let i = -1; i <= 1; i++)
          this.strike(this.target.x + i * 95, this.target.y + i * 24, {
            w: 42,
            depth: 21,
            h: 260,
            tell: (i + 1) * 0.22,
            damage: 18,
            color: '#9bdcff',
          });
      if (m === 'gust')
        this.strike(this.target.x, this.target.y, {
          w: 150,
          depth: 24,
          h: 35,
          damage: 12,
          color: '#b7cedd',
        });
    }
    activeAttack() {
      const m = this.attack.mode,
        elapsed = this.attack.active - this.aiTimer;
      if (m === 'combo') {
        const pulse = Math.floor(elapsed / 0.3);
        if (pulse !== this.pulseIndex) {
          this.pulseIndex = pulse;
          this.attackDidHit = false;
        }
      }
      if (['swoop', 'surge', 'kiss'].includes(m)) {
        this.vx = this.facing * (m === 'kiss' ? 180 : 330);
        if (this.flying) this.z = m === 'kiss' ? 24 : 18;
      }
      if (!['combo', 'blink', 'swoop', 'kiss', 'surge'].includes(m)) return;
      const box = R.collide.front(this, m === 'combo' ? 100 : 64, 15, 75, 0, 23);
      this.g.enemyHitboxes.push(box);
      if (!this.attackDidHit && R.collide.overlap(box, this.g.player.hurtbox())) {
        this.attackDidHit = true;
        if (
          this.g.hitPlayer(m === 'kiss' ? 10 : 16, this.x, {
            kb: m === 'kiss' ? 0 : 140,
            knockdown: false,
            source: this.attack.name,
          }) &&
          m === 'kiss'
        ) {
          this.g.player.grabbedBy = this;
          this.g.player.grabTimer = 1.1;
          this.g.player.grabDamageClock = 0;
          this.g.warning = 'HYPNOTIZED! TAP KICK TO BREAK FREE';
          this.g.warningTimer = 1.1;
        }
      }
    }
    update(dt) {
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      if (this.dead) {
        this.deathTimer -= dt;
        this.remove = this.deathTimer <= 0;
        return;
      }
      this.flightTime += dt;
      if (this.introTimer > 0) {
        this.introTimer -= dt;
        // Stride to a fixed on-screen mark. Do not chase Riley during the intro.
        const mark = this.g.arenaLeft + 490;
        const dx = mark - this.x;
        if (Math.abs(dx) > 4) {
          const step = Math.min(Math.abs(dx), this.speed * dt);
          this.x += Math.sign(dx) * step;
          this.facing = dx >= 0 ? 1 : -1;
          this.walkDistance += step;
          this.setState('walk');
        } else {
          this.x = mark;
          this.vx = 0;
          this.setState('idle');
        }
        return;
      }
      if (this.kind === 'taim' && !this.phaseTwo && this.hp < this.hpMax * 0.55) {
        this.phaseTwo = true;
        this.g.say('taim_phase_02');
      }
      this.aiTimer -= dt;
      this.vx = 0;
      this.vy = 0;
      if (this.ai === 'approach') {
        const dx = this.g.player.x - this.x,
          dy = this.g.player.y - this.y;
        this.facing = dx >= 0 ? 1 : -1;
        this.vx = Math.abs(dx) > 85 ? Math.sign(dx) * this.speed : 0;
        this.vy = Math.abs(dy) > 5 ? Math.sign(dy) * 65 : 0;
        this.walkDistance += Math.abs(this.vx) * dt;
        this.setState('walk');
        if (this.aiTimer <= 0) this.requestAttack();
      } else if (this.ai === 'telegraph' && this.aiTimer <= 0) {
        this.ai = 'attack';
        this.aiTimer = this.attack.active;
        this.beginActive();
      } else if (this.ai === 'attack') {
        this.activeAttack();
        if (this.aiTimer <= 0) {
          this.ai = 'recover';
          this.aiTimer = this.attack.recover * (this.phaseTwo ? 0.75 : 1);
          this.setState('recover');
        }
      } else if (this.ai === 'recover' && this.aiTimer <= 0) {
        this.ai = 'approach';
        this.aiTimer = this.phaseTwo && this.kind==='taim' ? 0.18 : 0.65;
      }
      if (this.flying && this.ai !== 'attack') this.z = 47 + Math.sin(this.flightTime * 2.8) * 9;
      R.Entity.prototype.update.call(this, dt);
      this.x = R.util.clamp(this.x, this.g.arenaLeft + 25, this.g.arenaRight - 25);
    }
    drawTell(ctx, cam) {
      if (this.ai !== 'telegraph' || !this.target) return;
      const m = this.attack.mode;
      ctx.save();
      ctx.strokeStyle = '#ffe17e';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      if (m === 'beam')
        {
          const hx=this.x+this.facing*18-cam,hy=this.y-this.z-58,pulse=9+Math.sin(this.flightTime*18)*3;
          ctx.setLineDash([]);ctx.fillStyle='rgba(120,55,190,.55)';ctx.beginPath();ctx.arc(hx,hy,pulse,0,Math.PI*2);ctx.fill();
          ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo((this.facing>0?this.g.arenaRight:this.g.arenaLeft)-cam,hy);ctx.stroke();
        }
      else if (m === 'fear') {
        ctx.beginPath();
        ctx.ellipse(this.x - cam, this.y, 115, 33, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (m === 'storm')
        for (let i = -1; i <= 1; i++)
          ctx.strokeRect(this.target.x + i * 95 - cam - 21, this.target.y + i * 24 - 21, 42, 42);
      else if (m === 'snare' || m === 'gust') {
        const w = m === 'snare' ? 86 : 150,
          d = m === 'snare' ? 27 : 24;
        ctx.strokeRect(this.target.x - cam - w / 2, this.target.y - d, w, d * 2);
      } else {
        const x = m === 'blink' ? this.blinkTo : this.x,
          y = m === 'blink' ? this.target.y : this.y;
        const facing = m === 'blink' ? (this.target.x >= x ? 1 : -1) : this.facing;
        const reach =
          m === 'combo'
            ? 100
            : 64 +
              (['swoop', 'surge', 'kiss'].includes(m)
                ? (m === 'kiss' ? 180 : 330) * this.attack.active
                : 0);
        const box = R.collide.front({ x, y, facing }, reach, 15, 75, 0, 23);
        ctx.strokeRect(box.x - cam - box.w / 2, y - 23, box.w, 46);
      }
      ctx.restore();
    }
    draw(ctx, cam) {
      drawActor(this, ctx, cam, this.kind === 'forsaken' ? '#613b51' : '#171c2f', this.kind);
    }
  }
  Object.assign(R, { ShadowStrike, ShadowSoldier, ShadowBoss, ShadowMoves: MOVES });
})();
