/* Game entities: Player (riley), Enemy (healthy magic), Boss (five bespoke champions),
   Pickup, Breakable, Projectile, Particle. The Play scene (RWB.scenes.Play)
   owns them and is passed in as `g` for spawning FX/sounds/score. */
'use strict';

(function () {
  const U = RWB.util;
  const S = RWB.sprites;
  const GRAV = 900;

  /* ------------------------------------------------------------------ */
  /* Player                                                              */
  /* ------------------------------------------------------------------ */
  const ATTACKS = {
    jab: { pose: 'jab', dur: 0.18, hitAt: 0.045, reach: 44, dmg: 5, kb: 78, lunge: 120, next: 'smash', sfx: 'hit', stop: 'light' },
    smash: { pose: 'smash', windPose: 'smashWind', windUntil: 0.08, dur: 0.26, hitAt: 0.09, reach: 48, dmg: 7, kb: 110, lunge: 90, next: 'sweep', sfx: 'clank', stop: 'light' },
    sweep: { pose: 'sweep', windPose: 'sweepWind', windUntil: 0.1, dur: 0.36, hitAt: 0.12, reach: 58, back: 36, dmg: 11, kb: 190, lunge: 60, knockdown: true, next: null, sfx: 'hitHeavy', stop: 'heavy' },
    // rising kick: the timed third hit. Pause a beat after the kick instead of
    // mashing and riley uppercuts; the enemy floats for a short juggle.
    pop: { pose: 'uppercut', windPose: 'popWind', windUntil: 0.07, dur: 0.3, hitAt: 0.1, reach: 48, dmg: 8, kb: 30, lunge: 80, launch: true, next: 'jab', slash: 'pop', sfx: 'pop', stop: 'heavy' }
  };

  /* Hitbox / invulnerability tuning. Every number the fight uses for
     fairness lives here so the floor tells can draw the same boxes.
     Player-side boxes are a little more generous than enemy-side ones on
     purpose: the arcade convention is "your swing connects if it looked
     like it did; theirs only if it really did". */
  const FAIR = {
    // riley's hurtbox as seen by enemy melee.
    hurtHalfW: 13,        // body half width (px)
    hurtDepth: 18,        // lane (y) tolerance; enemies commit at <16, so a side-step during a tell escapes
    // riley's swings.
    swingDepth: 26,       // lane tolerance for riley's attacks
    activeFrames: 0.06,   // seconds a swing stays live after hitAt (was a single frame)
    // Getting hit.
    lightStun: 0.28,      // hurt state length (was 0.32)
    lightIframes: 0.56,   // covers the stun plus ~0.28 s to act (was 0.15 + 0.25 after)
    getupIframes: 1.0,    // after a knockdown (was 0.9)
    streakWindow: 1.6,    // three light hits inside this window...
    streakLimit: 3,       // ...and the third becomes a knockdown: a release, not a lock
    // Enemies getting hit.
    enemyStreakLimit: 5,  // 5 light hits without a knockdown and the enemy tumbles
    enemyGetupIframes: 0.35,
    juggleHits: 3,        // follow-ups a rising kick allows before the enemy drops
    juggleDamage: 0.8,
    popDelay: 0.07,       // wait at least this long after the kick (mash = sweep, rhythm = pop)
    // Boss.
    slamDepth: 34, slamReach: 130, flopRadius: 78,
    rainRx: 26, rainRy: 13
  };

  class Player {
    constructor(g, x, y) {
      this.g = g;
      this.x = x; this.y = y; this.z = 0;
      this.vx = 0; this.vy = 0; this.vz = 0;
      this.facing = 1;
      this.maxHp = 100; this.hp = 100;
      this.lives = 3; this.score = 0;
      this.saidin = 0; this.saidinMax = 100; this.angrealT = 0; this.loialReady = true;
      this.hasRelic = false;
      this.state = 'idle'; this.stateT = 0; this.t = 0;
      this.invuln = 0; this.flash = 0;
      this.attack = null; this.hitDone = false; this.comboTimer = 0; this.nextCombo = 'jab';
      this.bufferAttack = false; this.bufferSurge = false;
      this.grab = null; this.grabHits = 0; this.grabT = 0;
      this.specialCd = 0; this.grabCd = 0;
      this.hits = 0; this.comboCount = 0; this.comboDisplayT = 0; this.comboPop = 0;
      this.lastTool = ''; this.lastToolT = 0; this.lowBarked = false;
      this.speed = 135;
      this.dead = false;
      this.won = false;
      this.hitSet = new Set();
      this.hitStreak = 0; this.hitStreakT = 0; this.wakeT = 0;
      this.whiffed = false;
      this.juggleCount = 0;
    }
    /** True while the rising kick timing window is open (for the HUD glint). */
    get popReady() {
      return (this.state === 'idle' || this.state === 'walk') && this.nextCombo === 'sweep' && this.comboTimer > 0 && (0.42 - this.comboTimer) >= FAIR.popDelay;
    }

    get busy() { return !['idle', 'walk'].includes(this.state); }
    get canBeHit() { return this.invuln <= 0 && !['down', 'dead', 'saidin', 'surgeCharge', 'victory'].includes(this.state) && !this.won; }

    setState(s) { this.state = s; this.stateT = 0; }

    update(dt, inp) {
      this.t += dt; this.stateT += dt;
      if (this.invuln > 0) this.invuln -= dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.specialCd > 0) this.specialCd -= dt;
      if (this.angrealT > 0) this.angrealT = Math.max(0, this.angrealT - dt);
      if (this.grabCd > 0) this.grabCd -= dt;
      if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.nextCombo = 'jab'; }
      if (this.comboDisplayT > 0) { this.comboDisplayT -= dt; if (this.comboDisplayT <= 0) { this.comboCount = 0; this.juggleCount = 0; } }
      if (this.comboPop > 0) this.comboPop = Math.max(0, this.comboPop - dt * 3.2);
      if (this.lastToolT > 0) this.lastToolT -= dt;
      if (this.hitStreakT > 0) { this.hitStreakT -= dt; if (this.hitStreakT <= 0) this.hitStreak = 0; }
      if (this.wakeT > 0) this.wakeT -= dt;
      const ax = inp.axis();
      const pressed = inp.pressed;

      // gravity / jump physics
      if (this.z > 0 || this.vz !== 0) {
        this.vz -= GRAV * dt;
        this.z += this.vz * dt;
        if (this.z <= 0) {
          this.z = 0; this.vz = 0;
          if (this.state === 'jump' || this.state === 'jumpkick') { this.setState('idle'); this.g.fx.dust(this.x, this.y); }
          else if (this.state === 'down') { this.g.fx.dust(this.x, this.y, 10); RWB.audio.sfx.thud(); this.vx = 0; }
          else if (this.state === 'dead') { this.vx = 0; }
        }
      }

      switch (this.state) {
        case 'idle': case 'walk': {
          // movement
          this.vx = ax.x * this.speed; this.vy = ax.y * this.speed * 0.62;
          if (ax.x !== 0) this.facing = ax.x > 0 ? 1 : -1;
          this.setState(ax.x || ax.y ? 'walk' : 'idle');
          if (this.state === 'walk' && this.stateT === 0) { /* keep t continuous */ }
          if ((pressed.saidin || this.bufferSurge) && this.saidin >= this.saidinMax) { this.bufferSurge = false; this.startSurge(); break; }
          if (pressed.attack || this.bufferAttack) {
            // Buffered (mashed) presses keep the classic sweep; a deliberate
            // beat after the kick gets the launcher instead.
            const timed = !this.bufferAttack && this.popReady;
            this.bufferAttack = false;
            this.startAttack(timed ? 'pop' : (this.comboTimer > 0 ? this.nextCombo : 'jab'));
            break;
          }
          // SoR-style: walking into an enemy grabs it
          if (ax.x !== 0 && this.grabCd <= 0) {
            const target = this.findGrabTarget(22);
            if (target) { this.startGrab(target); break; }
          }
          if (pressed.jump) { this.vz = 330; this.z = 0.01; this.setState('jump'); RWB.audio.sfx.jump(); break; }
          if (pressed.special && this.specialCd <= 0) { this.startFireball(); break; }
          if (pressed.tool) {
            if (this.hasRelic) { this.startThrow(); break; }
            if (this.loialReady) { this.loialReady = false; this.g.callLoial(); break; }
          }
          break;
        }
        case 'attack': {
          const a = this.attack;
          this.vy = 0;
          // A short lunge, then shrine. Decay is frame-rate independent.
          if (this.stateT < 0.07) this.vx = this.facing * (a.lunge || 80);
          else this.vx *= Math.pow(0.5, dt * 60);
          if (pressed.attack) this.bufferAttack = true;
          // Live for a few frames, not one, so an enemy stepping into the
          // swing still gets hit. Each enemy is hit once per swing.
          if (this.stateT >= a.hitAt && this.stateT <= a.hitAt + FAIR.activeFrames) {
            const first = !this.hitDone;
            this.hitDone = true;
            this.doAttackHit(a, first);
          }
          // An empty swing is an opening the AI may answer (with a normal tell).
          this.whiffed = this.hitDone && this.stateT > a.hitAt + FAIR.activeFrames && this.hitSet.size === 0;
          if (a.next && this.bufferAttack && this.hitDone && this.stateT >= a.hitAt + 0.02) {
            this.bufferAttack = false;
            this.startAttack(a.next);
          } else if (this.stateT >= a.dur) {
            this.bufferAttack = false;
            this.setState('idle');
            this.comboTimer = a.next ? 0.42 : 0; this.nextCombo = a.next || 'jab';
          }
          break;
        }
        case 'jump': case 'jumpkick': {
          this.vx = ax.x !== 0 ? ax.x * this.speed * 0.9 : this.vx * 0.99;
          this.vy = ax.y * this.speed * 0.5;
          if (this.state === 'jump' && pressed.attack) { this.setState('jumpkick'); this.hitDone = false; RWB.audio.sfx.swing(); }
          if (this.state === 'jumpkick' && !this.hitDone) {
            const hit = this.hitEnemies({ reach: 46, back: 0, dmg: 9, kb: 120, knockdown: true, zTol: 60 });
            if (hit) { this.hitDone = true; RWB.audio.sfx.hit(true); if (this.g.impact) this.g.impact(this.facing, 'heavy'); }
          }
          break;
        }
        case 'fire': {
          this.vx = 0; this.vy = 0;
          if (!this.hitDone && this.stateT >= 0.1) {
            this.hitDone = true;
            const lanes = this.angrealT > 0 ? [-28, 0, 28] : [0];
            const big = this.angrealT > 0;
            for (const lane of lanes) this.g.projectiles.push(new Projectile(this.g, { kind: 'fireball', owner: 'player', x: this.x + this.facing * 24, y: this.y + lane, z: 38, vx: this.facing * (big ? 300 : 340), dmg: big ? 11 : 8, knockdown: true, pierce: 1, life: 1.8, big }));
          }
          if (this.stateT >= 0.6) { this.setState('idle'); this.specialCd = 0.7; }
          break;
        }
        case 'throw': {
          this.vx = 0; this.vy = 0;
          if (!this.hitDone && this.stateT >= 0.1) {
            this.hitDone = true; this.hasRelic = false;
            this.g.projectiles.push(new Projectile(this.g, { kind: 'relic', owner: 'player', x: this.x + this.facing * 20, y: this.y, z: 44, vx: this.facing * 430, vz: 40, dmg: 15, knockdown: true, pierce: 3, life: 0.9, dropAsPickup: true }));
            RWB.audio.sfx.throwSfx();
          }
          if (this.stateT >= 0.32) this.setState('idle');
          break;
        }
        case 'grab': {
          const e = this.grab;
          this.vx = 0; this.vy = 0;
          this.grabT += dt;
          if (!e || e.dead || e.state !== 'grabbed') { this.grab = null; this.setState('idle'); break; }
          e.x = this.x + this.facing * 30; e.y = this.y; e.facing = -this.facing;
          if (this.grabT > 3.2) { this.releaseGrab(true); break; }
          if (pressed.attack && this.stateT > 0.15) {
            const back = ax.x !== 0 && Math.sign(ax.x) === -this.facing;
            if (back || this.grabHits >= 2) this.throwGrabbed();
            else {
              this.grabHits++; this.setState('grabHit');
              e.hurt(6, this.x, { noInterrupt: true, kb: 0 }); this.registerHits(1);
              this.g.fx.turnedAshaman(e.x, e.y - 30); RWB.audio.sfx.hit(false);
              if (this.g.impact) this.g.impact(this.facing, 'light'); else { this.g.hitstop = 0.05; this.g.shake(2, 0.08); }
            }
          } else if (pressed.jump || pressed.tool) this.throwGrabbed();
          break;
        }
        case 'grabHit': {
          if (this.stateT >= 0.22) this.setState('grab');
          if (this.grab) { this.grab.x = this.x + this.facing * 30; this.grab.y = this.y; }
          break;
        }
        case 'hurt': {
          this.vx *= 0.85; this.vy = 0;
          if (this.stateT >= FAIR.lightStun) this.setState('idle');
          break;
        }
        case 'down': {
          if (this.z <= 0) { this.vx *= 0.8; if (this.stateT > 0.9 && this.z <= 0) { this.setState('idle'); this.invuln = FAIR.getupIframes; this.wakeT = FAIR.getupIframes; } }
          break;
        }
        case 'dead': {
          this.vx *= 0.9;
          if (this.stateT >= 1.6) { this.setState('gone'); this.g.playerDied(); /* may respawn -> idle */ }
          break;
        }
        case 'gone': this.vx = 0; break;
        case 'surgeCharge': {
          this.vx = 0; this.vy = 0;
          if (this.stateT >= 0.4) { this.setState('saidin'); this.g.triggerSurge(); }
          break;
        }
        case 'saidin': {
          this.vx = 0; this.vy = 0;
          if (this.stateT >= 1.1) this.setState('idle');
          break;
        }
        case 'victory': this.vx = 0; this.vy = 0; break;
      }

      // integrate
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.y = U.clamp(this.y, RWB.FLOOR_TOP, RWB.FLOOR_BOTTOM);
      const b = this.g.playerBounds();
      this.x = U.clamp(this.x, b.min, b.max);
      // pickups
      if (this.z < 12 && !['down', 'dead', 'gone', 'saidin', 'surgeCharge'].includes(this.state)) {
        for (const p of this.g.pickups) {
          if (p.dead || p.z > 20) continue;
          if (Math.abs(p.x - this.x) < 20 && Math.abs(p.y - this.y) < 16) this.collect(p);
        }
      }
    }

    startAttack(name) {
      const a = ATTACKS[name];
      this.attack = a; this.hitDone = false; this.comboTimer = 0; this.bufferAttack = false;
      this.hitSet.clear(); this.whiffed = false;
      this.setState('attack');
      RWB.audio.sfx.swing();
    }
    doAttackHit(a, first) {
      const n = this.hitEnemies({ reach: a.reach, back: a.back || 0, dmg: a.dmg, kb: a.kb, knockdown: a.knockdown, launch: a.launch, zTol: 40, exclude: this.hitSet });
      // breakables
      if (first) {
        for (const o of this.g.objects) {
          if (o.dead) continue;
          const dx = (o.x - this.x) * this.facing;
          if (dx > -(a.back || 0) - 10 && dx < a.reach + 10 && Math.abs(o.y - this.y) < 34) { o.hit(this.g, 1); this.g.fx.turnedAshaman(o.x, o.y - 20); }
        }
      }
      if (n) {
        const firstHit = this.hitSet.size === n;
        if (firstHit) {
          if (a.sfx === 'pop') { RWB.audio.sfx.pop(); RWB.audio.sfx.hit(true); }
          else if (a.sfx === 'hitHeavy') RWB.audio.sfx.hit(true); else if (a.sfx === 'clank') RWB.audio.sfx.clank(); else RWB.audio.sfx.hit(false);
          if (this.g.impact) this.g.impact(this.facing, a.stop || 'light');
          else { this.g.hitstop = a.knockdown ? 0.09 : 0.05; this.g.shake(a.knockdown ? 5 : 2, 0.1); }
        }
        this.lastTool = a.pose; this.lastToolT = 0.55;
        if (a.knockdown && this.g.bark) this.g.bark('sweep');
      }
    }
    /** Apply damage to enemies in the melee box in front. Returns hit count. */
    hitEnemies(box) {
      let n = 0;
      for (const e of this.g.enemies) {
        if (!e.hittable || (box.exclude && box.exclude.has(e))) continue;
        const dx = (e.x - this.x) * this.facing, dy = Math.abs(e.y - this.y);
        const hw = e.isBoss ? 40 : (e.def.hurtW || 12);
        // Juggled enemies float above the normal z window; still reachable.
        const zTol = e.state === 'juggle' ? Math.max(box.zTol || 40, 90) : (box.zTol || 40);
        if (dx > -(box.back || 0) - hw && dx < box.reach + hw && dy < FAIR.swingDepth && Math.abs(e.z - this.z) < zTol) {
          if (box.exclude) box.exclude.add(e);
          const juggled = e.state === 'juggle';
          e.hurt(box.dmg, this.x, { knockdown: box.knockdown, kb: box.kb, launch: box.launch });
          if (juggled || e.state === 'juggle') this.juggleCount++;
          const hitX = e.x - this.facing * 6;
          const hitY = e.y - e.height * 0.55 - e.z;
          this.g.fx.turnedAshaman(hitX, hitY, box.knockdown);
          this.g.fx.battleDebris(hitX, hitY, e.type, e.y, box.knockdown);
          this.g.fx.impactRing(hitX, hitY, box.knockdown);
          if (this.g.triggerHitFlash) this.g.triggerHitFlash(box.knockdown ? 0.05 : 0.03);
          n++;
        }
      }
      if (n) this.registerHits(n);
      return n;
    }
    registerHits(n) {
      const before = this.comboCount;
      this.hits += n; this.comboCount += n; this.comboDisplayT = 1.7; this.comboPop = 1;
      if (this.g.onCombo) this.g.onCombo(before, this.comboCount);
    }
    findGrabTarget(range) {
      let best = null, bd = 1e9;
      for (const e of this.g.enemies) {
        if (!e.grabbable || e.state === 'windup') continue;
        const dx = (e.x - this.x) * this.facing, dy = Math.abs(e.y - this.y);
        if (dx > 0 && dx < (range || 34) && dy < 14 && dx < bd) { best = e; bd = dx; }
      }
      return best;
    }
    startGrab(e) {
      this.grab = e; this.grabHits = 0; this.grabT = 0;
      e.getGrabbed(this);
      this.setState('grab');
      RWB.audio.sfx.tape();
      if (this.g.bark) this.g.bark('grab');
    }
    releaseGrab(broken) {
      const e = this.grab; this.grab = null; this.grabCd = 0.8;
      if (e && e.state === 'grabbed') { e.release(); if (broken) { e.setState('approach'); this.hurt(4, e.x, false); } }
      this.setState('idle');
    }
    throwGrabbed() {
      const e = this.grab; this.grab = null; this.grabCd = 0.5;
      if (e) { e.thrown(this.facing, this); this.registerHits(1); }
      this.setState('throw'); this.hitDone = true;
      RWB.audio.sfx.throwSfx();
      if (this.g.impact) this.g.impact(this.facing, 'light'); else this.g.shake(2, 0.1);
      if (this.g.bark) this.g.bark('throw');
    }
    startFireball() { this.setState('fire'); this.hitDone = false; RWB.audio.sfx.fire(); if (this.g.bark) this.g.bark('fire'); }
    startThrow() { this.setState('throw'); this.hitDone = false; if (this.g.bark) this.g.bark('box'); }
    startSurge() {
      if (this.grab) this.releaseGrab(false);
      this.setState('surgeCharge'); this.invuln = 2;
      RWB.audio.sfx.blip();
    }
    collect(p) {
      p.dead = true;
      switch (p.kind) {
        case 'saidinSpark': this.addSurge(35, 'SAIDIN SPARK +35'); break;
        case 'saidinSurge': this.addSurge(50, 'SAIDIN SURGE +50'); break;
        case 'power': this.addSurge(25, 'SAIDIN +25'); break;
        case 'angreal': this.angrealT = 12; this.g.fx.text(this.x, this.y - 90, 'ANGREAL: TRIPLE FIRE', '#ffcf68'); RWB.audio.sfx.pickup(); break;
        case 'heal': this.heal(30, 'Rise, Riley, Rise!'); if (this.g.bannerT <= 0) this.g.showBanner('MOIRAINE', 'Rise, Riley, Rise!', 1.4); break;
        case 'trolloc': this.heal(60, 'MOIRAINE HEALS +60'); break;
        case 'mark': this.addScore(500); this.g.fx.text(this.x, this.y - 90, 'SIGIL +500', '#ffe14a'); RWB.audio.sfx.pickup(); break;
        case 'relic': this.hasRelic = true; this.g.fx.text(this.x, this.y - 90, 'RELIC RECOVERED', '#f66'); RWB.audio.sfx.pickup(); break;
      }
    }
    addSurge(n, label) {
      const was = this.saidin;
      this.saidin = Math.min(this.saidinMax, this.saidin + n);
      this.g.fx.text(this.x, this.y - 90, label, '#9f3');
      RWB.audio.sfx.pickupTone();
      if (this.saidin >= this.saidinMax && was < this.saidinMax) { this.g.fx.text(this.x, this.y - 106, 'SAIDIN IS FULL!', '#b6ff4a', 2.2); RWB.audio.sfx.oneUp(); }
    }
    heal(n, label) { this.hp = Math.min(this.maxHp, this.hp + n); if (this.hp > 55) this.lowBarked = false; this.g.fx.text(this.x, this.y - 90, label, '#6f6'); RWB.audio.sfx.heal(); }
    addScore(n) { this.score += n; }

    hurt(dmg, fromX, knockdown) {
      if (!this.canBeHit) return false;
      if (this.g.cheatInvuln) return false;
      if (this.grab) this.releaseGrab(false);
      this.hp -= dmg; this.flash = 0.12;
      if (RWB.input.rumble) RWB.input.rumble(knockdown ? 120 : 60, knockdown ? 0.7 : 0.35, 0.25);
      const dir = this.x < fromX ? -1 : 1; // pushed away from attacker
      this.comboCount = 0; this.juggleCount = 0;
      if (this.hp <= 0) {
        this.hp = 0; this.setState('dead'); this.vx = dir * 120; this.vz = 200; this.z = 0.01;
        RWB.audio.sfx.hurt(); RWB.audio.sfx.thud();
        if (this.g.impact) this.g.impact(dir, 'heavy'); else this.g.shake(6, 0.3);
        return true;
      }
      if (this.hp <= 28 && !this.lowBarked) { this.lowBarked = true; if (this.g.bark) this.g.bark('low'); }
      if (!knockdown) {
        this.hitStreak = this.hitStreakT > 0 ? this.hitStreak + 1 : 1;
        this.hitStreakT = FAIR.streakWindow;
        // Third light hit in a row knocks riley down, which means get-up
        // iframes: a way out of a crowd instead of a stun-lock.
        if (this.hitStreak >= FAIR.streakLimit) { knockdown = true; this.hitStreak = 0; this.hitStreakT = 0; }
      }
      if (knockdown) { this.setState('down'); this.vx = dir * 160; this.vz = 210; this.z = 0.01; RWB.audio.sfx.hurt(); if (this.g.impact) this.g.impact(dir, 'heavy'); else this.g.shake(4, 0.2); }
      else { this.setState('hurt'); this.vx = dir * 110; this.invuln = FAIR.lightIframes; RWB.audio.sfx.hurt(); if (this.g.impact) this.g.impact(dir, 'light'); else this.g.shake(2, 0.1); }
      return true;
    }
    /** Enemies hold their attacks while riley is stunned, down, or just back up. */
    get open() {
      return this.state === 'hurt' || this.state === 'down' || this.state === 'dead' || this.state === 'gone' || (this.wakeT || 0) > FAIR.getupIframes - 0.55;
    }

    respawn(x, y) {
      this.hp = this.maxHp; this.x = x; this.y = y; this.z = 0; this.vx = this.vy = this.vz = 0;
      this.setState('idle'); this.invuln = 2.5; this.grab = null; this.hasRelic = false; this.lowBarked = false; this.bufferAttack = false;
      this.hitStreak = 0; this.hitStreakT = 0; this.wakeT = 1.2;
    }

    get height() { return 78; }

    /** Pose name for the sprite renderer */
    pose() {
      switch (this.state) {
        case 'idle': return this.hasRelic ? 'idle' : 'idle';
        case 'walk': return 'walk';
        case 'attack': { const a = this.attack; return (a.windPose && this.stateT < a.windUntil) ? a.windPose : a.pose; }
        case 'jump': return 'jump';
        case 'jumpkick': return 'jumpkick';
        case 'fire': return 'fire';
        case 'throw': return 'throw';
        case 'grab': return 'grab';
        case 'grabHit': return 'grabHit';
        case 'hurt': return 'hurt';
        case 'down': return this.z > 0 ? 'hurt' : 'down';
        case 'dead': case 'gone': return 'dead';
        case 'surgeCharge': return 'surgeCharge';
        case 'saidin': return 'saidin';
        case 'victory': return 'victory';
      }
      return 'idle';
    }

    draw(ctx, camX) {
      const sx = Math.round(this.x - camX), sy = Math.round(this.y);
      if (this.state === 'gone') return;
      RWB.draw.shadow(ctx, sx, sy, 20, 6, this.z, RWB.art.has('riley'));
      const blink = this.invuln > 0 && !['down', 'dead', 'saidin', 'surgeCharge'].includes(this.state) && Math.floor(this.t * 20) % 2 === 0;
      S.drawRiley(ctx, sx, sy - this.z, { pose: this.pose(), t: this.t, facing: this.facing, flash: this.flash > 0, alpha: blink ? 0.45 : 1, floorY: sy });
      if (this.state === 'attack' && this.attack) {
        const a = this.attack;
        const u = (this.stateT - (a.windUntil || 0)) / Math.max(0.05, a.dur - (a.windUntil || 0));
        if (u > 0 && u < 1) S.drawSlash(ctx, sx, sy - 48 - this.z, this.facing, a.slash || a.pose, u);
      }
      // rising kick window: a rising chevron over the kick says "now".
      if (this.popReady) {
        const k = U.clamp((0.42 - this.comboTimer - FAIR.popDelay) / 0.12, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * k;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
        const cx = sx + this.facing * 22, cy = sy - 92 - this.z - k * 4;
        ctx.beginPath(); ctx.moveTo(cx - 6, cy + 4); ctx.lineTo(cx, cy - 2); ctx.lineTo(cx + 6, cy + 4); ctx.stroke();
        ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - 6, cy + 10); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx + 6, cy + 10); ctx.stroke();
        ctx.restore();
      }
      if (this.state === 'jumpkick') {
        S.drawSlash(ctx, sx + this.facing * 16, sy - 30 - this.z, this.facing, 'jumpkick', 0.5);
      }
      if (this.state === 'fire' && this.stateT > 0.08) S.drawFireBurst(ctx, sx + this.facing * 30, sy - 56, this.facing, this.t, 100);
      if (this.state === 'surgeCharge') {
        // rumble lines
        ctx.save(); ctx.strokeStyle = '#9f3'; ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) { const a = this.t * 12 + i; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 30, sy - 30 + Math.sin(a) * 10); ctx.lineTo(sx + Math.cos(a) * 40, sy - 30 + Math.sin(a) * 14); ctx.stroke(); }
        ctx.restore();
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Enemy                                                               */
  /* ------------------------------------------------------------------ */
  const ENEMY_DEFS = {
    // hurtW: half width riley's swings test against, matched to each sprite's body.
    // agile: may side-step out of a swing it sees coming (never mid-combo).
    trolloc: { hp: 24, speed: 54, dmg: 6, reach: 36, score: 100, height: 66, windup: 0.48, attackDur: 0.28, ranged: false, hurtW: 14, plate: '#6b5340', name: 'TROLLOC' },
    trollocCaptain: { hp: 44, speed: 50, dmg: 8, reach: 32, score: 150, height: 70, windup: 0.52, attackDur: 0.24, roll: true, charge: true, chargeChance: 0.8, armor: true, hurtW: 14, agile: true, plate: '#c4552a', name: 'TROLLOC CAPTAIN' },
    Darkfriend: { hp: 22, speed: 62, dmg: 10, reach: 56, score: 120, height: 84, windup: 0.5, attackDur: 0.3, armor: true, hurtW: 11, agile: true, plate: '#3a3a48', name: 'DARKFRIEND' },
    assassin: { hp: 22, speed: 118, dmg: 10, reach: 34, score: 150, height: 62, windup: 0.4, attackDur: 0.24, dash: true, ranged: 'shuriken', armor: true, hurtW: 12, agile: true, plate: '#1c1c28', name: 'CAEMLYN ASSASSIN' },
    mashadarCultist: { hp: 40, speed: 44, dmg: 10, reach: 40, score: 200, height: 70, windup: 0.62, attackDur: 0.32, knockdown: true, armor: true, hurtW: 15, plate: '#6a6888', name: 'MASHADAR-TOUCHED' },
    stoneDefender: { hp: 56, speed: 52, dmg: 22, reach: 48, score: 300, height: 84, windup: 0.58, attackDur: 0.34, knockdown: true, armor: true, charge: true, chargeChance: 0.86, hurtW: 17, plate: '#8a8478', name: 'STONE DEFENDER' },
    turnedAshaman: { hp: 30, speed: 68, dmg: 9, reach: 32, score: 400, height: 68, windup: 0.42, attackDur: 0.28, ranged: 'shadowBolt', keepAway: true, hurtW: 13, plate: '#14141c', name: "TURNED ASHA'MAN" }
  };
  const ATTACKING = ['windup', 'prime', 'attack', 'dash', 'charge', 'roll'];

  class Enemy {
    constructor(g, type, x, y, opts = {}) {
      this.g = g; this.type = type;
      const d = ENEMY_DEFS[type]; this.def = d;
      const mult = opts.hpMult || 1;
      this.maxHp = Math.round(d.hp * mult); this.hp = this.maxHp;
      this.speed = d.speed * (opts.speedMult || 1) * U.rand(0.92, 1.08);
      this.x = x; this.y = y; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0;
      this.facing = -1;
      this.state = 'approach'; this.stateT = 0; this.t = U.rand(0, 10);
      this.flash = 0; this.stun = 0;
      this.attackCd = U.rand(0.6, 1.6);
      this.laneOff = U.rand(-14, 14);
      this.side = opts.side || (U.chance(0.5) ? 1 : -1); // preferred side of player
      this.sideTimer = U.rand(2, 5);
      this.waitT = 0;
      this.dead = false; this.remove = false;
      this.isBoss = false;
      this.height = d.height;
      this.hitDone = false;
      this.rangedCd = U.rand(1.5, 3);
      this.dropChance = opts.dropChance !== undefined ? opts.dropChance : 0.22;
      this.elite = !!opts.elite;
      if (this.elite) { this.maxHp = Math.round(this.maxHp * 1.5); this.hp = this.maxHp; }
      this.flankSide = 0; this.flankT = 0;
      this.streak = 0; this.streakT = 0;
      this.juggleLeft = 0;
      this.evadeCd = U.rand(1.5, 3);
    }

    // 'getup' is a short wake-up window: no free hits on a rising enemy.
    get hittable() { return !this.dead && !['down', 'dead', 'thrown', 'spawn', 'getup'].includes(this.state) && this.z < 80; }
    /** The exact melee box an attack tests (floor tells draw this). */
    meleeBox() {
      return { back: FAIR.hurtHalfW * 0.5, front: this.def.reach + FAIR.hurtHalfW, depth: FAIR.hurtDepth };
    }
    get grabbable() { return !this.dead && !this.isBoss && ['approach', 'wait', 'stunned', 'hurt', 'windup', 'prime', 'idle'].includes(this.state) && this.z <= 0; }
    setState(s) { this.state = s; this.stateT = 0; }

    update(dt) {
      this.t += dt; this.stateT += dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.attackCd > 0) this.attackCd -= dt;
      if (this.rangedCd > 0) this.rangedCd -= dt;
      if (this.streakT > 0) { this.streakT -= dt; if (this.streakT <= 0) this.streak = 0; }
      if (this.flankT > 0) this.flankT -= dt;
      if (this.evadeCd > 0) this.evadeCd -= dt;
      const p = this.g.player;

      // vertical physics (juggles float a little: lower gravity while popped)
      if (this.z > 0 || this.vz !== 0) {
        this.vz -= GRAV * (this.state === 'juggle' ? 0.72 : 1) * dt; this.z += this.vz * dt;
        if (this.z <= 0) {
          this.z = 0; this.vz = 0;
          if (this.state === 'thrown') { this.landThrown(); }
          else if (this.state === 'down') { this.vx = 0; this.g.fx.dust(this.x, this.y, 8); RWB.audio.sfx.thud(); }
          else if (this.state === 'juggle') { this.juggleLeft = 0; this.setState('down'); this.stateT = 0.4; this.vx = 0; this.g.fx.dust(this.x, this.y, 10); RWB.audio.sfx.thud(); }
        }
      }

      if (this.dead) { this.vx *= 0.9; if (this.stateT > 0.9) this.remove = true; this.x += this.vx * dt; return; }

      switch (this.state) {
        case 'approach': case 'wait': this.think(dt, p); break;
        case 'windup':
          this.vx = 0; this.vy = 0;
          if (this.stateT >= this.def.windup) { this.setState('attack'); this.hitDone = false; }
          break;
        case 'prime':
          // Locked facing from the moment the tell started. The floor mark is the contract.
          this.vx = 0; this.vy = 0;
          if (this.stateT >= (this.primeDur || 0.28)) {
            this.setState(this.pending || 'approach');
            this.hitDone = false;
            if (this.pending === 'dash' || this.pending === 'charge') RWB.audio.sfx.swing();
          }
          break;
        case 'attack': {
          this.vx = this.facing * 30; this.vy = 0;
          if (!this.hitDone && this.stateT >= 0.08) {
            this.hitDone = true;
            const dx = (p.x - this.x) * this.facing, dy = Math.abs(p.y - this.y);
            const box = this.meleeBox();
            if (dx > -box.back && dx < box.front && dy < box.depth && p.z < 40) {
              if (p.hurt(this.def.dmg, this.x, !!this.def.knockdown)) this.g.fx.turnedAshaman(p.x, p.y - 50, !!this.def.knockdown);
            }
          }
          if (this.stateT >= this.def.attackDur) { this.setState('recover'); this.attackCd = U.rand(0.9, 1.9); }
          break;
        }
        case 'recover': this.vx *= 0.8; this.vy = 0; if (this.stateT >= 0.45) this.setState('approach'); break;
        case 'dash': case 'roll': {
          this.vx = this.facing * this.speed * 2.6; this.vy = 0;
          if (!this.hitDone) {
            const dx = (p.x - this.x) * this.facing, dy = Math.abs(p.y - this.y);
            if (dx > -10 && dx < 30 && dy < FAIR.hurtDepth && p.z < 30) { this.hitDone = true; if (p.hurt(this.def.dmg, this.x, this.state === 'roll')) this.g.fx.turnedAshaman(p.x, p.y - 40); }
          }
          if (this.stateT >= 0.42) { this.setState('recover'); this.attackCd = U.rand(1.2, 2.2); }
          break;
        }
        case 'charge': {
          this.vx = this.facing * this.speed * 2.2; this.vy = 0;
          if (!this.hitDone) {
            const dx = (p.x - this.x) * this.facing, dy = Math.abs(p.y - this.y);
            if (dx > -10 && dx < 36 && dy < FAIR.hurtDepth + 2 && p.z < 30) { this.hitDone = true; if (p.hurt(this.def.dmg, this.x, true)) { this.g.fx.turnedAshaman(p.x, p.y - 50, true); this.g.shake(4, 0.15); } }
          }
          if (this.stateT >= 0.7) { this.setState('recover'); this.attackCd = U.rand(1.5, 2.5); }
          break;
        }
        case 'spit': {
          this.vx = 0; this.vy = 0;
          if (!this.hitDone && this.stateT >= 0.3) {
            this.hitDone = true;
            if (this.def.ranged === 'shuriken') { this.g.projectiles.push(new Projectile(this.g, { kind: 'shuriken', owner: 'enemy', x: this.x + this.facing * 14, y: this.y, z: 40, vx: this.facing * 300, vz: 0, dmg: 6, life: 1.6 })); RWB.audio.sfx.shuriken(); }
            else { this.g.projectiles.push(new Projectile(this.g, { kind: 'shadowBolt', owner: 'enemy', x: this.x + this.facing * 14, y: this.y, z: 48, vx: this.facing * 240, vz: 60, dmg: 5, life: 1.8, color: U.pick(['#ff4a4a', '#4ad0ff', '#ffe14a', '#4aff88']) })); RWB.audio.sfx.splat(); }
          }
          if (this.stateT >= 0.6) { this.setState('approach'); this.rangedCd = U.rand(2.5, 4.5); }
          break;
        }
        case 'hurt': this.vx *= 0.82; this.vy = 0; if (this.stateT >= 0.3) this.setState('approach'); break;
        case 'down':
          if (this.z <= 0) { this.vx *= 0.8; if (this.stateT >= 1.1) { this.setState('getup'); } }
          break;
        case 'getup': this.vx = 0; if (this.stateT >= FAIR.enemyGetupIframes) { this.setState('approach'); this.attackCd = U.rand(0.3, 0.9); } break;
        case 'juggle': this.vx *= 0.985; this.vy = 0; break;
        case 'evade':
          // Short hop back and off-lane, out of a swing it saw coming.
          this.vx = -this.facing * this.speed * 1.6; this.vy = this.evadeVy || 0;
          if (this.stateT >= 0.26) { this.setState('approach'); this.attackCd = Math.max(this.attackCd, 0.25); }
          break;
        case 'stunned':
          this.vx = 0; this.vy = 0; this.stun -= dt;
          if (this.stun <= 0) this.setState('approach');
          break;
        case 'grabbed': this.vx = 0; this.vy = 0; break;
        case 'thrown': {
          // fly, hit other enemies
          for (const o of this.g.enemies) {
            if (o === this || !o.hittable || o.state === 'grabbed') continue;
            if (Math.abs(o.x - this.x) < (o.isBoss ? 40 : 22) && Math.abs(o.y - this.y) < 28 && !this.hitList.has(o)) {
              this.hitList.add(o);
              o.hurt(o.isBoss ? 18 : 14, this.x, { knockdown: true, kb: 120 });
              this.g.fx.turnedAshaman(o.x, o.y - 30, true); RWB.audio.sfx.hit(true); this.g.player.registerHits(1);
            }
          }
          for (const ob of this.g.objects) if (!ob.dead && Math.abs(ob.x - this.x) < 26 && Math.abs(ob.y - this.y) < 30) ob.hit(this.g, 3);
          break;
        }
        case 'spawn': this.vx = 0; this.vy = 0; if (this.stateT > 0.5) this.setState('approach'); break;
      }

      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.state !== 'thrown') this.y = U.clamp(this.y, RWB.FLOOR_TOP, RWB.FLOOR_BOTTOM);
      // keep within a generous margin of the camera so they don't wander off forever
      const cam = this.g.camX;
      if (this.state !== 'thrown') this.x = U.clamp(this.x, cam - 60, cam + RWB.W + 60);
    }

    think(dt, p) {
      const dx = p.x - this.x, dy = (p.y + this.laneOff) - this.y;
      const adx = Math.abs(dx);
      this.facing = dx > 0 ? 1 : -1;
      this.sideTimer -= dt;
      if (this.sideTimer <= 0) { this.sideTimer = U.rand(2, 5); if (U.chance(0.4)) this.side *= -1; this.laneOff = U.rand(-14, 14); }
      const pDown = ['down', 'dead', 'gone'].includes(p.state);
      // riley is reeling or just got up: circle, don't pile on.
      const pOpen = p.open != null ? p.open : pDown;
      const canStart = () => (this.g.canStartAttack ? this.g.canStartAttack(this) : this.g.attackers() < 2);

      // Side-step a swing that is clearly coming (agile greens only, never mid-combo).
      if (this.def.agile && this.evadeCd <= 0 && p.state === 'attack' && p.attack && !p.hitDone &&
        (this.x - p.x) * p.facing > 0 && adx < p.attack.reach + 26 && Math.abs(p.y - this.y) < 22) {
        this.evadeCd = U.rand(2.6, 4.2);
        if (U.chance(0.3)) {
          this.evadeVy = (this.y < p.y ? -1 : 1) * this.speed * 0.9;
          this.setState('evade');
          return;
        }
      }
      // Ranged behavior
      if (this.def.ranged && this.rangedCd <= 0 && adx > 120 && adx < 300 && Math.abs(dy) < 30 && !pDown && !pOpen) {
        this.setState('spit'); this.hitDone = false; return;
      }
      // Dash / roll / charge openers
      if (!pDown && !pOpen && this.attackCd <= 0 && Math.abs(dy) < 16 && adx > 70 && adx < 200 && canStart()) {
        let pending = null;
        if (this.def.dash && U.chance(0.7)) pending = 'dash';
        else if (this.def.roll && U.chance(0.6)) pending = 'roll';
        else if (this.def.charge && U.chance(this.def.chargeChance || 0.5)) pending = 'charge';
        if (pending) {
          this.pending = pending;
          this.primeDur = pending === 'roll' ? 0.22 : pending === 'charge' ? 0.38 : 0.28;
          this.setState('prime');
          if (this.g.noteAttackStart) this.g.noteAttackStart(this);
          if (pending === 'charge') RWB.audio.sfx.bossRoar(); else RWB.audio.sfx.blip();
          return;
        }
      }

      // desired standoff position
      let standoff = this.def.reach - 8;
      if (this.def.keepAway && this.rangedCd > 0.6) standoff = 150; // turnedAshaman hangs back while reloading
      if (pOpen) standoff = Math.max(standoff, this.def.reach + 26); // give him room to get up
      const onSide = Math.sign(this.x - p.x) || 1;
      // The director may assign a flank; otherwise stay on the side we're on.
      const side = this.flankT > 0 && this.flankSide ? this.flankSide : onSide;
      const wantX = p.x + side * standoff;
      let wantY = p.y + this.laneOff;
      if (side !== onSide && adx < standoff + 60) {
        // Crossing to the far flank: arc around riley, not through him.
        const up = this.y < p.y;
        let arcY = p.y + (up ? -48 : 48);
        if (arcY < RWB.FLOOR_TOP + 4 || arcY > RWB.FLOOR_BOTTOM - 4) arcY = p.y + (up ? 48 : -48);
        wantY = arcY;
      }
      const ex = wantX - this.x, ey = wantY - this.y;
      const dist = Math.hypot(ex, ey);

      if (this.state === 'wait') {
        this.vx = 0; this.vy = 0;
        if (this.stateT >= this.waitT) this.setState('approach');
        // still attack if in range
      }

      const inRange = adx <= this.def.reach && Math.abs(dy - this.laneOff) < 16 && Math.abs(p.y - this.y) < 16;
      if (inRange && !pDown && side === onSide) {
        this.vx = 0; this.vy = 0;
        // A whiffed swing is an opening: answer it sooner (still with a full tell).
        if (p.whiffed && p.state === 'attack' && this.attackCd > 0 && this.attackCd < 0.6) this.attackCd = 0;
        if (this.attackCd <= 0 && !pOpen && canStart() && p.z < 40) {
          this.setState('windup');
          if (this.g.noteAttackStart) this.g.noteAttackStart(this);
          return;
        }
        if (this.attackCd <= 0) this.attackCd = U.rand(0.2, 0.5);
        return;
      }
      if (this.state === 'approach') {
        if (dist > 4) {
          const spd = pDown ? this.speed * 0.5 : this.speed;
          this.vx = (ex / dist) * spd; this.vy = (ey / dist) * spd * 0.7;
        } else { this.vx = 0; this.vy = 0; }
        // Occasionally pause (SoR hover)
        if (adx > 60 && U.chance(dt * 0.35)) { this.setState('wait'); this.waitT = U.rand(0.4, 1.1); }
      }
      // separation from other enemies
      for (const o of this.g.enemies) {
        if (o === this || o.dead || o.isBoss) continue;
        const sx = this.x - o.x, sy = this.y - o.y;
        const d = Math.hypot(sx, sy);
        if (d < 26 && d > 0.01) { this.vx += (sx / d) * 40; this.vy += (sy / d) * 30; }
      }
    }

    hurt(dmg, fromX, opts = {}) {
      if (this.dead) return;
      if (this.state === 'thrown') return;
      const juggling = this.state === 'juggle';
      if (juggling) dmg = Math.max(1, Math.round(dmg * FAIR.juggleDamage));
      this.hp -= dmg; this.flash = 0.1;
      this.g.player.addScore(Math.round(dmg * (this.type === 'turnedAshaman' ? 4 : 2)));
      const dir = this.x < fromX ? -1 : 1;
      if (this.hp <= 0) { this.die(dir); return; }
      if (opts.stun) { this.stun = opts.stun; this.setState('stunned'); this.vx = dir * 20; RWB.audio.sfx.blip(); this.g.fx.text(this.x, this.y - this.height - 10, 'STUNNED!', '#8ff'); return; }
      if (opts.noInterrupt || this.state === 'grabbed') return;
      if (juggling) {
        // Each follow-up re-pops a little; out of budget (or a heavy) sends it down.
        if (this.juggleLeft > 0 && !opts.knockdown) {
          this.juggleLeft--;
          this.vz = Math.max(this.vz, 190); this.vx = dir * 36;
          RWB.audio.sfx.juggle();
          return;
        }
        this.juggleLeft = 0;
        this.setState('down'); this.vx = dir * (opts.kb || 140); this.vz = Math.max(120, this.vz); this.z = Math.max(this.z, 0.01);
        if (opts.knockdown) this.g.fx.text(this.x, this.y - this.height - this.z - 8, 'LAUNCHED!', '#ffe14a', 0.8);
        return;
      }
      const armored = this.def.armor && ['windup', 'attack', 'charge'].includes(this.state) && !opts.knockdown && !opts.launch;
      if (armored) { this.g.fx.text(this.x, this.y - this.height - 6, 'BLOCKED', '#c8e0ff', 0.6); return; }
      if (opts.launch && !this.isBoss) {
        this.streak = 0; this.streakT = 0;
        this.juggleLeft = FAIR.juggleHits;
        this.setState('juggle'); this.vx = dir * (opts.kb || 30); this.vz = 330; this.z = Math.max(this.z, 0.01);
        this.g.fx.text(this.x, this.y - this.height - 12, 'POP!', '#bff', 0.7);
        return;
      }
      if (!opts.knockdown) {
        // Light-hit lock limit: the fifth un-knocked hit tumbles the enemy.
        this.streak = this.streakT > 0 ? this.streak + 1 : 1;
        this.streakT = 1.4;
        if (this.streak >= FAIR.enemyStreakLimit) { opts = Object.assign({}, opts, { knockdown: true, kb: 90 }); this.streak = 0; this.streakT = 0; }
      } else { this.streak = 0; this.streakT = 0; }
      if (opts.knockdown) { this.setState('down'); this.vx = dir * (opts.kb || 120); this.vz = 200; this.z = 0.01; }
      else { this.setState('hurt'); this.vx = dir * (opts.kb || 50); }
    }
    die(dir) {
      this.dead = true; this.setState('dead'); this.vx = (dir || 1) * 120; this.vz = 220; this.z = Math.max(this.z, 0.01);
      const pts = this.def.score * (this.elite ? 2 : 1);
      this.g.player.addScore(pts);
      this.g.fx.text(this.x, this.y - this.height, `+${pts}`, '#ffe14a');
      if (this.type === 'turnedAshaman') this.g.player.addScore(pts);
      if (!this.isBoss && this.g.bark && !(this.g.surgeT >= 0)) {
        if (this.type === 'turnedAshaman') this.g.bark('turnedAshaman');
        else if (this.elite) this.g.bark('elite');
      }
      RWB.audio.sfx.enemyDie();
      this.g.fx.burst(this.x, this.y - this.height / 2, this.type, this.y);
      // drops
      if (U.chance(this.dropChance) || this.forceDrop) {
        const kind = this.forceDrop || U.pick(['saidinSpark', 'saidinSpark', 'saidinSurge', 'power', 'power', 'heal', 'mark', 'angreal']);
        this.g.spawnPickup(kind, this.x, this.y, true);
      }
      this.g.onEnemyKilled(this);
    }
    getGrabbed(p) { this.setState('grabbed'); this.vx = 0; this.vy = 0; this.z = 0; this.vz = 0; }
    release() { this.setState('recover'); }
    thrown(dir, p) {
      this.setState('thrown'); this.facing = -dir; this.vx = dir * 400; this.vz = 210; this.z = 0.01; this.hitList = new Set();
      this.hp -= 10;
    }
    landThrown() {
      this.vx = 0; this.g.fx.dust(this.x, this.y, 12); RWB.audio.sfx.thud(); this.g.shake(3, 0.12);
      this.hitList = null;
      if (this.hp <= 0) this.die(this.facing); else { this.setState('down'); this.stateT = 0.3; }
    }

    pose() {
      switch (this.state) {
        case 'approach': return (Math.abs(this.vx) + Math.abs(this.vy) > 8) ? 'walk' : 'idle';
        case 'wait': case 'recover': case 'getup': case 'spawn': return 'idle';
        case 'windup': case 'prime': return 'windup';
        case 'attack': return this.def.reach > 50 ? 'kick' : 'attack';
        case 'dash': case 'charge': return 'dash';
        case 'roll': return 'roll';
        case 'spit': return 'spit';
        case 'hurt': return 'hurt';
        case 'down': case 'juggle': return this.z > 0 ? 'knockdown' : 'down';
        case 'evade': return 'walk';
        case 'dead': return 'dead';
        case 'stunned': return 'stunned';
        case 'grabbed': return 'grabbed';
        case 'thrown': return 'thrown';
      }
      return 'idle';
    }
    draw(ctx, camX) {
      const sx = Math.round(this.x - camX), sy = Math.round(this.y);
      const plate = this.def.plate || '#888';
      // Type marker on the stage: a lit ring rather than an opaque disc.
      ctx.save();
      const prx = Math.max(12, this.height * 0.24);
      const painted = RWB.art.has(this.type);
      ctx.globalAlpha = this.elite ? 0.5 : painted ? 0.12 : 0.28;
      RWB.draw.ellipse(ctx, sx, sy + 1, prx, 5.5, plate);
      ctx.globalAlpha = this.elite ? 1 : painted ? 0.5 : 0.85;
      ctx.lineWidth = this.elite ? 2 : 1.5;
      ctx.strokeStyle = this.elite ? '#ffe14a' : plate;
      ctx.beginPath(); ctx.ellipse(sx, sy + 1, prx, 5.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      RWB.draw.shadow(ctx, sx, sy, this.height * 0.28, this.height * 0.09, this.z, RWB.art.has(this.type));
      const alpha = this.dead ? Math.max(0, 1 - (this.stateT - 0.4) * 2) : (this.state === 'spawn' ? this.stateT * 2 : 1);
      S.drawEnemy(ctx, sx, sy - this.z, { type: this.type, pose: this.pose(), t: this.t, facing: this.facing, flash: this.flash > 0 || (this.dead && Math.floor(this.t * 30) % 2 === 0), alpha, taped: this.state === 'grabbed', stunTint: this.state === 'stunned', floorY: sy });
      if (this.elite) RWB.text.draw(ctx, 'ELITE', sx, sy - this.z - this.height - 14, { size: 6, align: 'center', color: '#fc6', stroke: '#000', strokeWidth: 2 });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Boss: five bespoke champions                                      */
  /* ------------------------------------------------------------------ */
  // Wind-up length per phase [1, 2, 3]. Jump was 0.42 s, too short to read a locked mark.
  const BOSS_TELLS = { slamWind: [0.8, 0.75, 0.62], jumpWind: [0.6, 0.6, 0.52], rainWind: [0.8, 0.8, 0.7] };
  const BOSS_LAST_CALL = 0.2;
  class Boss extends Enemy {
    constructor(g, x, y, bossType) {
      super(g, 'turnedAshaman', x, y);
      this.bossType = bossType || 'myrddraal';
      const profiles = {
        trollocChief: { name:'TROLLOC CHIEFTAIN', hp:260, speed:42, dmg:8, height:132, armor:36 },
        myrddraal: { name:'MYRDDRAAL', hp:380, speed:70, dmg:10, height:116, armor:48 },
        draghkar: { name:'DRAGHKAR', hp:440, speed:62, dmg:10, height:128, armor:44 },
        forsaken: { name:'THE FORSAKEN', hp:500, speed:52, dmg:11, height:124, armor:56 },
        taim: { name:'MAZRIM TAIM', hp:600, speed:56, dmg:18, height:126, armor:64 }
      };
      const profile = profiles[this.bossType] || profiles.myrddraal;
      this.isBoss = true; this.def = { ...ENEMY_DEFS.turnedAshaman, name: profile.name, reach: 96, dmg: profile.dmg, score: 5000, height: profile.height, knockdown: true };
      this.maxHp = profile.hp; this.hp = this.maxHp; this.height = profile.height; this.speed = profile.speed;
      this.armorMax = profile.armor; this.armorHp = this.armorMax; this.armorRegen = 0;
      this.phase = 1; this.summoned = false; this.puddleT = 0;
      this.FURY = 0; this.dropChance = 0;
      this.intro = 2.2; this.state = 'intro';
      this.attackCd = 1.2;
      this.tellDur = 0.75; this.lastCalled = false;
    }
    get grabbable() { return false; }
    get hittable() { return !this.dead && this.state !== 'intro' && this.z < 120; }
    get armor() { return this.phase === 1 && this.armorHp > 0 ? this.armorHp / this.armorMax : 0; }

    update(dt) {
      this.t += dt; this.stateT += dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.attackCd > 0) this.attackCd -= dt;
      const p = this.g.player;
      // phase
      const r = this.hp / this.maxHp;
      const np = r > 0.66 ? 1 : r > 0.33 ? 2 : 3;
      if (np !== this.phase && !this.dead) {
        this.phase = np; this.g.onBossPhase(np);
        this.setState('stagger'); this.staggerT = 1.4;
      }
      if (this.phase === 1 && this.armorHp <= 0 && this.state !== 'stagger' && this.bossType !== 'trollocChief') { this.armorRegen += dt; if (this.armorRegen > 12) { this.armorHp = this.armorMax; this.armorRegen = 0; this.g.fx.text(this.x, this.y - 170, 'THE SHIELD RETURNS', '#bff', 1.6); } }

      if (this.z > 0 || this.vz !== 0) {
        this.vz -= GRAV * dt; this.z += this.vz * dt;
        if (this.z <= 0) {
          this.z = 0; this.vz = 0;
          if (this.state === 'jump') { this.setState('land'); this.landHit(); }
        }
      }
      if (this.dead) {
        this.FURY = Math.min(1, this.stateT / 3);
        if (Math.random() < 0.3) this.g.fx.burst(this.x + U.rand(-50, 50), this.y - U.rand(20, 140), 'turnedAshaman', this.y + U.rand(-10, 10));
        if (this.stateT > 3.2) { this.remove = true; this.g.bossDefeated(); }
        return;
      }
      const dx = p.x - this.x, adx = Math.abs(dx), dy = p.y - this.y;
      switch (this.state) {
        case 'intro': this.vx = 0; this.vy = 0; if (this.stateT >= this.intro) this.setState('approach'); break;
        case 'approach': {
          this.facing = dx > 0 ? 1 : -1;
          const standoff = 80;
          const wantX = p.x - Math.sign(dx || 1) * standoff;
          const ex = wantX - this.x, ey = dy;
          const dist = Math.hypot(ex, ey);
          if (dist > 4) { this.vx = ex / dist * this.speed * (this.phase === 3 ? 1.5 : 1); this.vy = ey / dist * this.speed * 0.7; } else { this.vx = 0; this.vy = 0; }
          if (this.phase >= 3) { this.puddleT += dt; if (this.puddleT > 2.4) { this.puddleT = 0; this.g.puddles.push({ x: this.x, y: this.y + 4, r: 34, t: 0, life: 9, arm: 0.55 }); } }
          if (this.attackCd <= 0) {
            const pDown = ['down', 'dead', 'gone'].includes(p.state);
            if (pDown || p.open) { this.attackCd = 0.55; break; }
            const type = this.bossType;
            const roll = Math.random();
            const cam = this.g.camX;
            const lockJump = () => {
              this.jumpTargetX = U.clamp(p.x, cam + 50, cam + RWB.W - 50);
              this.jumpTargetY = U.clamp(p.y, RWB.FLOOR_TOP + 8, RWB.FLOOR_BOTTOM - 8);
              this.startTell('jumpWind');
              RWB.audio.sfx.tellJump();
            };
            if (type === 'trollocChief') {
              this.startTell('slamWind'); this.tellDur = 1.05;
              RWB.audio.sfx.tellSlam();
              this.g.fx.text(this.x, this.y - 140, 'AXE SWING!', '#e8c070', 0.9);
              break;
            }
            if (type === 'myrddraal') {
              if (adx > 70) {
                this.x = U.clamp(p.x - (p.facing || 1) * 96, cam + 48, cam + RWB.W - 48);
                this.y = U.clamp(p.y, RWB.FLOOR_TOP, RWB.FLOOR_BOTTOM);
                this.facing = p.x > this.x ? 1 : -1;
              }
              this.startTell('slamWind'); this.tellDur = Math.max(this.tellDur, 0.9);
              RWB.audio.sfx.tellSlam();
              this.g.fx.text(this.x, this.y - 140, 'FADE STRIKE!', '#c9c4e8', 0.9);
              break;
            }
            if (type === 'draghkar') {
              if (this.phase >= 2 && roll < 0.28) { this.startTell('rainWind'); RWB.audio.sfx.tellRain(); this.g.fx.text(this.x, this.y - 150, 'SHRIEK!', '#e8a0b0', 0.9); break; }
              lockJump();
              this.g.fx.text(this.x, this.y - 150, 'SCREAM DIVE!', '#e8a0b0', 0.9);
              break;
            }
            if (type === 'forsaken') {
              if (this.phase >= 2 && !this.summoned && roll > 0.82) { this.summoned = true; this.summonNext = true; this.startTell('rainWind'); RWB.audio.sfx.tellSummon(); break; }
              if (this.phase >= 2 && roll < 0.28 && adx > 80) { lockJump(); this.g.fx.text(this.x, this.y - 150, 'SHADOW LEAP!', '#c9a0ff', 0.9); break; }
              this.startTell('rainWind'); RWB.audio.sfx.tellRain();
              this.g.fx.text(this.x, this.y - 150, 'CHANNELING!', '#c9a0ff', 0.9);
              break;
            }
            if (this.phase >= 3 && roll < 0.22) { lockJump(); this.g.fx.text(this.x, this.y - 150, 'ROOF STRIKE!', '#9eeaff', 0.9); break; }
            if (this.phase >= 2 && roll < 0.5) {
              if (!this.summoned && roll < 0.16) { this.summoned = true; this.summonNext = true; this.startTell('rainWind'); RWB.audio.sfx.tellSummon(); }
              else { this.startTell('rainWind'); RWB.audio.sfx.tellRain(); this.g.fx.text(this.x, this.y - 150, 'BLACK BOLTS!', '#9eeaff', 0.9); }
              break;
            }
            this.startTell('slamWind'); RWB.audio.sfx.tellSlam();
            this.g.fx.text(this.x, this.y - 140, this.phase >= 3 ? 'LIGHTNING BLADE!' : 'BLADE!', '#f0d0d8', 0.9);
          }
          break;
        }
        case 'slamWind': this.vx = 0; this.vy = 0; this.tellTick(); if (this.stateT >= this.tellDur) { this.setState('slam'); this.hitDone = false; } break;
        case 'slam': {
          this.vx = 0; this.vy = 0;
          if (!this.hitDone && this.stateT >= 0.1) {
            this.hitDone = true; RWB.audio.sfx.slam();
            if (this.g.impact) this.g.impact(this.facing, 'boss'); else this.g.shake(7, 0.3);
            this.g.fx.dust(this.x + this.facing * 70, this.y, 22);
            const ddx = (p.x - this.x) * this.facing;
            if (ddx > -10 && ddx < FAIR.slamReach && Math.abs(p.y - this.y) < FAIR.slamDepth && p.z < 50) { if (p.hurt(this.def.dmg, this.x, true)) this.g.fx.turnedAshaman(p.x, p.y - 50, true); }
            if (this.phase >= 3) this.g.puddles.push({ x: this.x + this.facing * 70, y: this.y + 4, r: 30, t: 0, life: 8, arm: 0.2 });
          }
          if (this.stateT >= 0.5) { this.setState('recover'); this.attackCd = this.phase === 3 ? 0.7 : 1.3; }
          break;
        }
        case 'jumpWind':
          this.vx = 0; this.vy = 0;
          this.facing = (this.jumpTargetX || p.x) >= this.x ? 1 : -1;
          this.tellTick();
          if (this.stateT >= this.tellDur) {
            this.setState('jump'); this.vz = 460; this.z = 0.01; RWB.audio.sfx.jump();
            // Constant velocity over the whole flight: touchdown is the ring.
            const flight = 2 * 460 / GRAV;
            this.vx = (this.jumpTargetX - this.x) / flight;
            this.vy = (this.jumpTargetY - this.y) / flight;
          }
          break;
        case 'jump': {
          // The mark was locked in jumpWind. He commits to it.
          this.facing = this.jumpTargetX >= this.x ? 1 : -1;
          break;
        }
        case 'land': this.vx = 0; this.vy = 0; if (this.stateT >= 0.7) { this.setState('recover'); this.attackCd = 1.0; } break;
        case 'rainWind': {
          this.vx = 0; this.vy = 0;
          this.tellTick();
          if (!this.hitDone && this.stateT >= this.tellDur) {
            this.hitDone = true;
            if (this.summonNext) {
              this.summonNext = false;
              this.g.spawnEnemy('turnedAshaman', this.g.camX + 40, U.rand(RWB.FLOOR_TOP + 20, RWB.FLOOR_BOTTOM - 20), { hpMult: 0.8 });
              this.g.spawnEnemy('turnedAshaman', this.g.camX + RWB.W - 40, U.rand(RWB.FLOOR_TOP + 20, RWB.FLOOR_BOTTOM - 20), { hpMult: 0.8 });
              this.g.fx.text(this.x, this.y - 170, 'SHADOW REINFORCEMENTS', '#f9c', 1.6);
            } else {
              const n = this.phase === 3 ? 12 : 8;
              for (let i = 0; i < n; i++) {
                const tx = U.clamp(p.x + U.rand(-140, 140), this.g.camX + 20, this.g.camX + RWB.W - 20);
                const ty = U.rand(RWB.FLOOR_TOP, RWB.FLOOR_BOTTOM);
                this.g.projectiles.push(new Projectile(this.g, { kind: 'bigshadowBolt', owner: 'enemy', x: tx, y: ty, z: 340 + i * 30, vx: 0, vz: -20, dmg: 7, knockdown: true, falling: true, color: U.pick(['#ff4a4a', '#4ad0ff', '#ffe14a', '#4aff88', '#ff8ae0']), rot: U.rand(0, 3) }));
              }
              RWB.audio.sfx.throwSfx();
              this.g.fx.text(this.x, this.y - 170, 'SHADOW BOLTS ABOVE', '#fc6', 1.6);
            }
          }
          if (this.stateT >= this.tellDur + 0.6) { this.setState('recover'); this.attackCd = 1.4; }
          break;
        }
        case 'recover': this.vx = 0; this.vy = 0; if (this.stateT >= 0.6) this.setState('approach'); break;
        case 'hurt': this.vx = 0; this.vy = 0; if (this.stateT >= 0.18) this.setState('approach'); break;
        case 'stagger': this.vx = 0; this.vy = 0; if (this.stateT >= (this.staggerT || 3)) { this.setState('approach'); this.attackCd = 0.5; } break;
      }
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.y = U.clamp(this.y, RWB.FLOOR_TOP, RWB.FLOOR_BOTTOM);
      this.x = U.clamp(this.x, this.g.camX + 40, this.g.camX + RWB.W - 40);
    }
    /* Tells run on a fixed clock per move and phase. Phase 3 is faster, but
       never below the floor a first-time player can react to, and the last
       0.2 s is always marked the same way (white outline + click). */
    startTell(state) {
      const T = BOSS_TELLS[state];
      this.tellDur = T[Math.min(this.phase, 3) - 1];
      this.lastCalled = false;
      this.hitDone = false;
      this.setState(state);
    }
    tellTick() {
      if (!this.lastCalled && this.stateT >= this.tellDur - BOSS_LAST_CALL) { this.lastCalled = true; RWB.audio.sfx.lastCall(); }
    }
    /** 0..1 progress through the current tell, and whether we are in the last call. */
    tellProgress() {
      const dur = this.tellDur || 0.75;
      return { k: U.clamp(this.stateT / dur, 0, 1), last: this.stateT >= dur - BOSS_LAST_CALL, dur };
    }
    landHit() {
      RWB.audio.sfx.slam();
      if (this.g.impact) this.g.impact(this.facing, 'boss'); else this.g.shake(9, 0.35);
      this.g.fx.dust(this.x, this.y, 30);
      const p = this.g.player;
      if (Math.hypot(p.x - this.x, (p.y - this.y) * 1.6) < FAIR.flopRadius && p.z < 60) { if (p.hurt(12, this.x, true)) this.g.fx.turnedAshaman(p.x, p.y - 50, true); }
      for (const e of this.g.enemies) if (e !== this && e.hittable && Math.hypot(e.x - this.x, (e.y - this.y) * 1.6) < 95) e.hurt(10, this.x, { knockdown: true });
      if (this.phase >= 3) this.g.puddles.push({ x: this.x, y: this.y + 4, r: 44, t: 0, life: 9, arm: 0.35 });
    }
    hurt(dmg, fromX, opts = {}) {
      if (this.dead || this.state === 'intro') return;
      let real = dmg;
      if (this.armor > 0) {
        real = Math.round(dmg * 0.35);
        this.armorHp -= dmg;
        if (this.armorHp <= 0) { this.armorHp = 0; this.armorRegen = 0; this.setState('stagger'); this.staggerT = 2.4; this.g.fx.text(this.x, this.y - 170, 'SHIELD BREAKS!', '#fff', 1.6); RWB.audio.sfx.break(); if (this.g.impact) this.g.impact(1, 'heavy'); else this.g.shake(5, 0.3); }
        else this.g.fx.text(this.x + U.rand(-20, 20), this.y - 150, 'SHIELD', '#bff', 0.45);
      }
      if (opts.saidin) real = dmg;
      this.hp -= real; this.flash = 0.1;
      this.g.player.addScore(real * 3);
      if (this.bossType === 'taim' && this.phase === 3 && this.hp <= 28) { this.hp = 0; this.g.showBanner('TWINKLE TOES, NOW!', 'LIGHTNING JOINS RILEY\'S BALEFIRE!', 3, true); this.die(); return; }
      if (this.hp <= 0) { this.hp = 0; this.die(); return; }
      if (opts.saidin) { this.armorHp = 0; this.armorRegen = 0; this.setState('stagger'); this.staggerT = 3; return; }
      if (['approach', 'recover'].includes(this.state) && !opts.noInterrupt) this.setState('hurt');
    }
    die() {
      this.dead = true; this.setState('dead'); this.vx = 0; this.vy = 0;
      this.g.player.addScore(5000);
      this.g.fx.text(this.x, this.y - 160, '+5000', '#ffe14a', 3);
      RWB.audio.sfx.bossRoar(); RWB.audio.sfx.enemyDie(); this.g.shake(10, 0.8);
    }
    pose() {
      switch (this.state) {
        case 'approach': return Math.abs(this.vx) + Math.abs(this.vy) > 5 ? 'walk' : 'idle';
        case 'slamWind': return 'slamWind'; case 'slam': return 'slam';
        case 'jumpWind': return 'jumpWind'; case 'jump': return 'jump'; case 'land': return 'land';
        case 'rainWind': return 'rainWind';
        case 'hurt': return 'hurt'; case 'stagger': return 'stagger';
        case 'dead': return 'dead';
      }
      return 'idle';
    }
    draw(ctx, camX) {
      const sx = Math.round(this.x - camX), sy = Math.round(this.y);
      RWB.draw.shadow(ctx, sx, sy, 50, 14, this.z);
      ctx.save();
      if (this.dead) { ctx.globalAlpha = Math.max(0, 1 - Math.max(0, this.stateT - 2) * 0.9); }
      S.drawBoss(ctx, sx, sy - this.z, { bossType:this.bossType, pose: this.pose(), t: this.t, facing: this.facing, flash: this.flash > 0, armor: this.armor, phase: this.phase, FURY: this.FURY });
      ctx.restore();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Pickup                                                              */
  /* ------------------------------------------------------------------ */
  class Pickup {
    constructor(g, kind, x, y, pop) {
      this.g = g; this.kind = kind; this.x = x; this.y = U.clamp(y, RWB.FLOOR_TOP, RWB.FLOOR_BOTTOM); this.z = pop ? 1 : 0; this.vz = pop ? 230 : 0; this.vx = pop ? U.rand(-60, 60) : 0;
      this.t = U.rand(0, 5); this.dead = false; this.remove = false;
    }
    update(dt) {
      this.t += dt;
      if (this.z > 0 || this.vz) { this.vz -= GRAV * dt; this.z += this.vz * dt; this.x += this.vx * dt; if (this.z <= 0) { this.z = 0; if (Math.abs(this.vz) > 60) this.vz = -this.vz * 0.4; else { this.vz = 0; this.vx = 0; } } }
      if (this.dead) this.remove = true;
    }
    draw(ctx, camX) {
      const sx = Math.round(this.x - camX), sy = Math.round(this.y);
      RWB.draw.shadow(ctx, sx, sy, 10, 3, this.z);
      S.drawPickup(ctx, sx, sy - this.z, this.kind, this.t);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Breakable object                                                    */
  /* ------------------------------------------------------------------ */
  class Breakable {
    constructor(g, kind, x, y, contents) {
      this.g = g; this.kind = kind; this.x = x; this.y = y; this.z = 0;
      this.hp = kind === 'urn' ? 1 : (kind === 'rack' || kind === 'stool') ? 2 : kind === 'obelisk' ? 4 : kind === 'crate' ? 3 : 2;
      this.contents = contents || (['urn', 'stool'].includes(kind) ? (U.chance(0.5) ? [U.pick(['mark', 'saidinSpark'])] : []) : [U.pick(['saidinSpark', 'saidinSurge', 'power', 'heal'])]);
      this.dead = false; this.remove = false; this.t = 0; this.shakeT = 0;
      this.height = kind === 'obelisk' ? 70 : (kind === 'stool' ? 44 : 36);
    }
    hit(g, n) {
      if (this.dead) return;
      this.hp -= n; this.shakeT = 0.15;
      if (this.kind === 'urn') RWB.audio.sfx.clank();
      else if (this.kind === 'rack') RWB.audio.sfx.clatter();
      else RWB.audio.sfx.clank();
      if (this.hp <= 0) {
        this.dead = true; this.remove = true;
        if (this.kind === 'urn') RWB.audio.sfx.shatter();
        else if (this.kind === 'rack') RWB.audio.sfx.clatter();
        else RWB.audio.sfx.break();
        g.shake(2.5, 0.12);
        g.fx.debris(this.x, this.y - 18, this.kind, this.y + 2);
        this.contents.forEach((c, i) => setTimeout(() => g.spawnPickup(c, this.x + (i - (this.contents.length - 1) / 2) * 24, this.y, true), i * 60));
        g.player.addScore(50);
      }
    }
    update(dt) {
      this.t += dt; if (this.shakeT > 0) this.shakeT -= dt;
      // Walk through / sprint through breakable props (battle trays, urn, chairs)
      if (!this.dead && ['urn', 'rack', 'stool'].includes(this.kind)) {
        const p = this.g.player;
        if (p && !p.dead) {
          const dx = Math.abs(p.x - this.x), dy = Math.abs(p.y - this.y);
          if (dx < 20 && dy < 14 && (Math.abs(p.vx) > 25 || Math.abs(p.vy) > 20 || p.state === 'walk')) {
            this.hit(this.g, 2);
          }
        }
      }
    }
    draw(ctx, camX) {
      const sx = Math.round(this.x - camX) + (this.shakeT > 0 ? Math.round(Math.sin(this.t * 80) * 2) : 0), sy = Math.round(this.y);
      RWB.draw.shadow(ctx, sx, sy, this.kind === 'urn' ? 16 : 24, 6, this.z);
      S.drawObject(ctx, sx, sy, this.kind, this.hp, this.t);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Projectile                                                          */
  /* ------------------------------------------------------------------ */
  class Projectile {
    constructor(g, o) {
      this.g = g; Object.assign(this, { t: 0, life: 2, z: 30, vz: 0, dmg: 5, pierce: 0, hits: 0, dead: false, remove: false }, o);
      this.hitList = new Set();
    }
    update(dt) {
      this.t += dt;
      if (this.falling) {
        this.vz -= GRAV * 0.9 * dt; this.z += this.vz * dt;
        if (this.z <= 0) { this.land(); }
        return;
      }
      this.x += this.vx * dt;
      if (this.kind === 'shadowBolt' || this.kind === 'relic') { this.vz -= 300 * dt; this.z += this.vz * dt; }
      if (this.z < 0) { this.z = 0; this.expire(); return; }
      if (this.t >= this.life) { this.expire(); return; }
      const p = this.g.player;
      if (this.owner === 'enemy') {
        if (Math.abs(p.x - this.x) < 16 && Math.abs(p.y - this.y) < 18 && Math.abs(p.z - this.z + 30) < 50) {
          if (p.hurt(this.dmg, this.x - Math.sign(this.vx) * 10, !!this.knockdown)) { this.g.fx.turnedAshaman(p.x, p.y - 45); }
          this.remove = true;
        }
      } else {
        for (const e of this.g.enemies) {
          if (!e.hittable || this.hitList.has(e)) continue;
          if (Math.abs(e.x - this.x) < (e.isBoss ? 44 : 20) && Math.abs(e.y - this.y) < 24) {
            this.hitList.add(e); this.hits++;
            e.hurt(this.dmg, this.x - Math.sign(this.vx) * 10, { knockdown: this.knockdown, kb: 110 });
            this.g.fx.turnedAshaman(e.x, e.y - 40, true); RWB.audio.sfx.hit(true); p.registerHits(1);
            if (this.g.impact) this.g.impact(Math.sign(this.vx) || 1, 'heavy'); else this.g.hitstop = 0.06;
            if (this.hits >= this.pierce) { this.expire(); return; }
          }
        }
        for (const ob of this.g.objects) if (!ob.dead && Math.abs(ob.x - this.x) < 26 && Math.abs(ob.y - this.y) < 30) { ob.hit(this.g, 3); }
      }
      // walls (camera bounds)
      if (this.x < this.g.camX - 20 || this.x > this.g.camX + RWB.W + 20) this.expire();
    }
    expire() {
      this.remove = true;
      if (this.kind === 'fireball') this.g.fx.impactRing(this.x, this.y - 20, !!this.big);
      if (this.dropAsPickup) this.g.spawnPickup('relic', U.clamp(this.x, this.g.camX + 20, this.g.camX + RWB.W - 20), this.y, true);
    }
    land() {
      this.remove = true;
      const p = this.g.player;
      this.g.fx.dust(this.x, this.y, 10); RWB.audio.sfx.splat(); this.g.shake(1.5, 0.05);
      // Same ellipse the landing ring draws.
      const ex = (p.x - this.x) / FAIR.rainRx, ey = (p.y - this.y) / FAIR.rainRy;
      if (ex * ex + ey * ey < 1 && p.z < 30) { if (p.hurt(this.dmg, this.x, true)) this.g.fx.turnedAshaman(p.x, p.y - 45, true); }
      for (const e of this.g.enemies) if (!e.isBoss && e.hittable && Math.abs(e.x - this.x) < 26 && Math.abs(e.y - this.y) < 20) e.hurt(8, this.x, { knockdown: true });
    }
    draw(ctx, camX) {
      const sx = Math.round(this.x - camX), sy = Math.round(this.y);
      if (this.falling) {
        // Red ring from the moment it leaves the machine, so the rain is a tell.
        const k = U.clamp(1 - this.z / 420, 0.25, 1);
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = this.z > 70 ? '#ff3355' : '#ffffff';
        ctx.lineWidth = this.z > 70 ? 2 : 3;
        // Outer ring is the true hit ellipse; the inner one closes in as it falls.
        ctx.setLineDash(this.z > 70 ? [4, 3] : []);
        ctx.beginPath();
        ctx.ellipse(sx, sy, FAIR.rainRx, FAIR.rainRy, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.35 + 0.4 * k;
        ctx.fillStyle = this.z > 70 ? 'rgba(255,51,85,0.35)' : 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, FAIR.rainRx * k, FAIR.rainRy * k, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.9;
        if (Math.floor((this.t || 0) * 10) % 2 === 0 && this.z > 70) {
          ctx.strokeStyle = '#fff';
          ctx.beginPath();
          ctx.moveTo(sx - 6, sy - 3); ctx.lineTo(sx + 6, sy + 3);
          ctx.moveTo(sx + 6, sy - 3); ctx.lineTo(sx - 6, sy + 3);
          ctx.stroke();
        }
        ctx.restore();
        if (this.z > 330) return;
      } else RWB.draw.shadow(ctx, sx, sy, 8, 3);
      S.drawProjectile(ctx, sx, sy - this.z, this);
    }
  }

  RWB.entities = { Player, Enemy, Boss, Pickup, Breakable, Projectile, ENEMY_DEFS, ATTACKS, FAIR, ATTACKING, BOSS_TELLS };
})();
