'use strict';
(function () {
  const R = window.RWB;
  class Reel {
    constructor(game, lines, next, label) {
      this.game = game;
      this.lines = lines;
      this.next = next;
      this.label = label || 'STORY';
      this.i = 0;
      this.timer = 0;
      this.spoken = false;
      this.music = 'story';
    }
    update(dt, input) {
      this.timer += dt;
      if (!this.spoken) {
        R.voice(this.lines[this.i].id);
        this.spoken = true;
      }
      if (R.keyPressed(input, 'start') || R.keyPressed(input, 'attack') || R.keyPressed(input, 'jump')) this.advance();
    }
    advance() {
      this.i += 1;
      if (this.i >= this.lines.length) this.game.setScene(this.next());
      else {
        this.timer = 0;
        this.spoken = false;
      }
    }
    draw(ctx) {
      const line = this.lines[this.i];
      const bg = ctx.createLinearGradient(0, 0, 640, 360);
      bg.addColorStop(0, '#050b19');
      bg.addColorStop(1, '#1b3657');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 640, 360);
      ctx.strokeStyle = 'rgba(120,190,240,0.16)';
      for (let i = 0; i < 12; i += 1) {
        ctx.beginPath();
        ctx.arc(320, 155, 20 + i * 16, 0, Math.PI * 2);
        ctx.stroke();
      }
      R.drawText(ctx, this.label, 20, 22, 9, '#e8cd74');
      R.drawPanel(ctx, 65, 225, 510, 82);
      R.drawText(ctx, line.name, 86, 244, 8, '#70caff');
      const shown = line.text.slice(0, Math.floor(this.timer * 38));
      R.drawText(ctx, shown, 86, 276, 8, '#ffffff');
      R.drawText(ctx, 'START / KICK / JUMP: NEXT', 620, 339, 6, '#aebdca', 'right');
    }
  }
  class OptionsScene {
    constructor(game, mode) {
      this.game = game;
      this.panel = new R.OptionsPanel(mode, { full: true });
    }
    update(dt, input) {
      this.panel.update(input, dt);
      if (R.keyPressed(input, 'pause')) this.game.setScene(new Title(this.game));
    }
    draw(ctx) {
      ctx.fillStyle = '#071323';
      ctx.fillRect(0, 0, 640, 360);
      this.panel.draw(ctx);
      R.drawText(ctx, 'ESC: TITLE', 620, 344, 7, '#b5bdc7', 'right');
    }
  }
  class Title {
    constructor(game) {
      this.game = game;
      this.selection = 0;
      this.music = 'title';
    }
    items() {
      return R.settings.loadRun() ? ['START', 'CONTINUE', 'OPTIONS', 'CONTROLS'] : ['START', 'OPTIONS', 'CONTROLS'];
    }
    update(dt, input) {
      const items = this.items();
      if (R.keyPressed(input, 'down')) this.selection = (this.selection + 1) % items.length;
      if (R.keyPressed(input, 'up')) this.selection = (this.selection + items.length - 1) % items.length;
      if (!R.keyPressed(input, 'start') && !R.keyPressed(input, 'attack')) return;
      const chosen = items[this.selection];
      if (chosen === 'START') {
        R.settings.clearRun();
        this.game.setScene(new Reel(this.game, R.CAPTIONS.opening, () => new Reel(this.game, R.CAPTIONS.intro, () => new Play(this.game, 0, {}), "EMOND'S FIELD"), 'THE WHEEL TURNS'));
      } else if (chosen === 'CONTINUE') {
        const run = R.settings.loadRun();
        this.game.setScene(new Play(this.game, run.level, Object.assign({}, run.extra, { wave: run.wave, score: run.score })));
      } else this.game.setScene(new OptionsScene(this.game, chosen.toLowerCase()));
    }
    draw(ctx) {
      const bg = ctx.createLinearGradient(0, 0, 0, 360);
      bg.addColorStop(0, '#061123');
      bg.addColorStop(1, '#11192b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 640, 360);
      ctx.strokeStyle = '#d9bc59';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(320, 106, 72, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        const angle = i * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(320 + Math.cos(angle) * 28, 106 + Math.sin(angle) * 28);
        ctx.lineTo(320 + Math.cos(angle) * 67, 106 + Math.sin(angle) * 67);
        ctx.stroke();
      }
      ctx.strokeStyle = '#6fd0ff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(343, 27);
      ctx.lineTo(300, 103);
      ctx.lineTo(332, 103);
      ctx.lineTo(293, 185);
      ctx.stroke();
      R.drawText(ctx, 'RILEY', 320, 72, 21, '#ffffff', 'center');
      R.drawText(ctx, 'WHEEL BRAWL', 320, 146, 17, '#e5c65f', 'center');
      this.items().forEach((item, index) => R.drawText(ctx, (index === this.selection ? '◆ ' : '  ') + item, 320, 218 + index * 29, 9, index === this.selection ? '#70caff' : '#ffffff', 'center'));
    }
  }
  class GameOver {
    constructor(game, checkpoint) {
      this.game = game;
      this.checkpoint = checkpoint;
      this.time = 9;
      this.music = 'gameover';
    }
    continueRun() {
      const saved = Object.assign({}, this.checkpoint.extra, { wave: this.checkpoint.wave, score: Math.max(0, this.checkpoint.score - 500), lives: 3 });
      this.game.setScene(new Play(this.game, this.checkpoint.level, saved));
    }
    update(dt, input) {
      this.time -= dt;
      if (R.keyPressed(input, 'start') || R.keyPressed(input, 'attack')) this.continueRun();
      if (R.keyPressed(input, 'pause') || this.time <= 0) this.game.setScene(new Title(this.game));
    }
    draw(ctx) {
      ctx.fillStyle = '#090b13';
      ctx.fillRect(0, 0, 640, 360);
      R.drawText(ctx, 'GAME OVER', 320, 120, 23, '#e25454', 'center');
      R.drawText(ctx, 'CONTINUE?', 320, 188, 11, '#ffffff', 'center');
      R.drawText(ctx, String(Math.max(0, Math.ceil(this.time))), 320, 229, 20, '#f2d66f', 'center');
      R.drawText(ctx, 'START: YES    ESC: NO', 320, 284, 7, '#aebdca', 'center');
    }
  }
  class ContinuedCard {
    constructor(game) {
      this.game = game;
      this.time = 0;
    }
    update(dt, input) {
      this.time += dt;
      if (this.time > 4 || R.keyPressed(input, 'start') || R.keyPressed(input, 'attack')) this.game.setScene(new Title(this.game));
    }
    draw(ctx) {
      ctx.fillStyle = '#081122';
      ctx.fillRect(0, 0, 640, 360);
      R.drawText(ctx, 'TO BE CONTINUED', 320, 143, 18, '#f0d36e', 'center');
      R.drawText(ctx, 'STAGE 2 COMING NEXT', 320, 202, 10, '#91d3ff', 'center');
    }
  }
  class Play {
    constructor(game, levelIndex, carry) {
      this.game = game;
      this.levelIndex = 0;
      this.level = R.LEVELS[0];
      this.carry = carry || {};
      this.wave = R.util.clamp(this.carry.wave | 0, 0, 5);
      this.arenaLeft = Math.max(0, R.Stage1.wavePoints[this.wave] - 280);
      this.arenaRight = Math.min(this.level.length, R.Stage1.wavePoints[this.wave] + 310);
      this.player = new R.Riley(this, this.carry);
      this.player.x = this.arenaLeft + 80;
      this.enemies = [];
      this.projectiles = [];
      this.hazards = [];
      this.pickups = [];
      this.props = [];
      this.allies = [];
      this.attackers = new Set();
      this.playerHitboxes = [];
      this.enemyHitboxes = [];
      this.movesUsed = new Set();
      this.pickupsTaken = 0;
      this.damageTaken = 0;
      this.timesHit = 0;
      this.deaths = 0;
      this.kills = 0;
      this.phase = 'play';
      this.isGameplay = true;
      this.paused = false;
      this.time = 0;
      this.waveClearTimer = 0;
      this.goTimer = 0;
      this.warning = '';
      this.warningTimer = 0;
      this.angrealDropped = false;
      this.superTimer = 0;
      this.superApplied = false;
      this.camera = new R.Camera({ length: this.level.length });
      this.camera.lock(this.arenaLeft, this.arenaRight);
      this.fx = new R.FX();
      this.snow = new R.Stage1.SnowField();
      this.music = 'stage1';
      this.pauseMenu = new R.PauseMenu({
        onQuit: () => this.game.setScene(new Title(this.game)),
        extra: [{ label: 'RESTART STAGE', act: () => this.restartStage() }]
      });
      this.spawnWave(this.wave);
    }
    enter() {
      this.saveCheckpoint();
    }
    saveCheckpoint() {
      R.settings.saveRun({ level: 0, wave: this.wave, score: this.player.score, extra: { saidin: this.player.power, loial: this.player.loialReady, lives: this.player.lives } });
    }
    restartStage() {
      const carry = { saidin: this.player.power, loial: this.player.loialReady, lives: this.player.lives, score: this.player.score, wave: 0 };
      this.game.setScene(new Play(this.game, 0, carry));
    }
    spawnWave(index) {
      this.enemies.length = 0;
      this.projectiles.length = 0;
      this.hazards.length = 0;
      this.attackers.clear();
      const center = R.Stage1.wavePoints[index];
      this.arenaLeft = Math.max(0, center - 280);
      this.arenaRight = Math.min(this.level.length, center + 310);
      if (this.camera) this.camera.lock(this.arenaLeft, this.arenaRight);
      const entries = R.Stage1.waveTable[index];
      if (entries[0] === 'boss') {
        this.boss = new R.Chieftain(this, center + 130, 260);
        this.enemies.push(this.boss);
        this.bossCard = 2.2;
      } else {
        entries.forEach((variant, i) => {
          const side = i % 2 ? -1 : 1;
          const x = center + side * (120 + i * 45 + Math.random() * 25);
          const y = 235 + (i % 3) * 32 + Math.random() * 9;
          this.enemies.push(new R.Trolloc(this, x, y, variant));
        });
      }
      if (index === 1) this.props.push(new R.BreakableProp(this, center + 35, 305, 'barrel'));
      if (index === 3) this.props.push(new R.BreakableProp(this, center - 65, 244, 'crate'));
      this.tutorial = index === 0 ? '{attack} KICK • {jump} JUMP' : index === 1 ? '{special} FIRE • DOWN+{attack} SPIN' : index === 2 ? '{assist} CALL LOIAL' : null;
      this.saveCheckpoint();
    }
    directorCanAttack(enemy) {
      return this.attackers.has(enemy) || this.attackers.size < 2;
    }
    registerAttacker(enemy) {
      if (this.attackers.size < 2) this.attackers.add(enemy);
    }
    releaseAttacker(enemy) {
      this.attackers.delete(enemy);
    }
    playCue(name) {
      const cue = R.audio.sfx[name] || R.audio.sfx.hit || R.audio.sfx.blip;
      if (cue) cue();
    }
    damageEnemy(enemy, damage, fromX, opts) {
      if (!enemy.takeHit(damage, fromX, opts || {})) return false;
      this.player.power = Math.min(this.player.powerMax, this.player.power + Math.round((opts && opts.move === 'fireball' ? 8 : 10) * (this.player.angreal > 0 ? 1.6 : 1)));
      this.player.score += damage * 10;
      this.fx.sparks(enemy.x, enemy.y - enemy.z - 35, '#ffd268', 7);
      this.camera.stop(opts && opts.knockdown ? 0.07 : 0.04);
      this.camera.impact(this.player.facing, opts && opts.knockdown ? 'heavy' : 'light');
      this.playCue('hit');
      return true;
    }
    hitPlayer(damage, fromX, opts) {
      if (this.phase !== 'play' || this.player.invuln > 0 || this.player.dead) return false;
      const landed = this.player.takeHit(damage, fromX, { kb: opts.kb, launch: opts.knockdown ? 120 : 0 });
      if (!landed) return false;
      this.damageTaken += damage;
      this.timesHit += 1;
      this.player.invuln = opts.knockdown ? 0.75 : 0.45;
      if (opts.knockdown && this.player.hp > 0) this.player.setState('knockdown');
      this.camera.impact(fromX < this.player.x ? 1 : -1, 'heavy');
      this.playCue('hurt');
      if (this.player.hp <= 0) this.beginDeath();
      return true;
    }
    beginDeath() {
      this.player.dead = true;
      this.player.setState('death');
      this.phase = 'death';
      this.deathTimer = 1.4;
      this.deaths += 1;
    }
    resolveDeath() {
      this.player.lives -= 1;
      if (this.player.lives > 0) {
        this.player.dead = false;
        this.player.hp = this.player.hpMax;
        this.player.invuln = 2;
        this.player.setState('getup');
        this.phase = 'play';
        this.camera.flash(0.35, '#ffffff');
        R.voice('riley_respawn_01');
        this.saveCheckpoint();
      } else {
        const checkpoint = { level: 0, wave: this.wave, score: this.player.score, extra: { saidin: this.player.power, loial: this.player.loialReady, lives: 0 } };
        R.settings.saveRun(checkpoint);
        this.game.setScene(new GameOver(this.game, checkpoint));
      }
    }
    onEnemyDeath(enemy) {
      this.kills += 1;
      this.player.score += enemy.scoreValue;
      if (!enemy.boss) {
        const roll = enemy.dropRoll;
        let kind = null;
        if (!this.angrealDropped && this.wave >= 2 && roll < 0.22) kind = 'angreal';
        else if (roll < 0.48) kind = 'spark';
        else if (roll < 0.61) kind = 'heal';
        if (kind) {
          if (kind === 'angreal') this.angrealDropped = true;
          this.pickups.push(new R.Pickup(this, enemy.x, enemy.y, kind));
        }
      }
    }
    callLoial() {
      if (!this.player.loialReady || this.phase !== 'play') return false;
      this.player.loialReady = false;
      this.allies.push(new R.Loial(this));
      this.playCue('loialHorn');
      this.saveCheckpoint();
      return true;
    }
    activateBalefire() {
      if (this.player.power < this.player.powerMax || this.superTimer > 0) return false;
      this.player.power = 0;
      this.player.taintAge = 0;
      this.player.taintTell = 0;
      this.player.invuln = 1.5;
      this.player.setState('super');
      this.superTimer = 1.15;
      this.superApplied = false;
      this.camera.stop(0.18);
      this.camera.impact(this.player.facing, 'super');
      if (R.audio.duck) R.audio.duck(0.3, 1.2);
      R.voice('riley_super_01');
      this.playCue('balefire');
      this.movesUsed.add('super');
      return true;
    }
    updateSuper(dt) {
      if (this.superTimer <= 0) return;
      this.superTimer -= dt;
      if (!this.superApplied && this.superTimer < 0.78) {
        this.superApplied = true;
        for (const enemy of this.enemies) {
          if (enemy.dead) continue;
          const damage = enemy.boss ? 78 : enemy.hpMax + 10;
          this.damageEnemy(enemy, damage, this.player.x, { kb: 260, knockdown: true, stagger: true, move: 'super' });
        }
      }
      if (this.superTimer <= 0 && !this.player.dead) this.player.setState('idle');
    }
    updateObjects(dt) {
      this.playerHitboxes.length = 0;
      this.enemyHitboxes.length = 0;
      this.player.update(dt, this.currentInput);
      for (const enemy of this.enemies) enemy.update(dt);
      for (const projectile of this.projectiles) projectile.update(dt);
      for (const hazard of this.hazards) hazard.update(dt);
      for (const pickup of this.pickups) pickup.update(dt);
      for (const ally of this.allies) ally.update(dt);
      this.projectiles = this.projectiles.filter(item => item.life > 0);
      this.hazards = this.hazards.filter(item => item.life > 0);
      this.pickups = this.pickups.filter(item => !item.remove);
      this.allies = this.allies.filter(item => item.life > 0);
      for (const box of this.playerHitboxes) {
        for (const prop of this.props) if (!prop.dead && R.collide.overlap(box, prop.hurtbox())) prop.takeHit(12);
      }
      this.fx.update(dt);
      this.snow.update(dt);
    }
    finishWave(dt) {
      if (!this.enemies.length || !this.enemies.every(enemy => enemy.dead)) return;
      if (this.wave === 5) {
        this.phase = 'clear';
        R.settings.clearRun();
        this.clearTimer = 1.4;
        return;
      }
      this.waveClearTimer += dt;
      this.goTimer = 1.5;
      if (this.waveClearTimer > 1.15) {
        this.wave += 1;
        this.waveClearTimer = 0;
        this.goTimer = 0;
        this.spawnWave(this.wave);
        this.player.x = this.arenaLeft + 75;
      }
    }
    update(dt, input) {
      this.currentInput = input || { pressed: {}, held: {}, axis: () => ({ x: 0, y: 0 }) };
      if (R.keyPressed(input, 'pause')) {
        this.paused = !this.paused;
        if (this.paused) this.pauseMenu.open();
      }
      if (this.paused) {
        const result = this.pauseMenu.update(input, dt);
        if (result === 'resume') this.paused = false;
        return;
      }
      if (this.phase === 'death') {
        this.deathTimer -= dt;
        if (this.deathTimer <= 0) this.resolveDeath();
        return;
      }
      if (this.phase === 'clear') {
        this.clearTimer -= dt;
        if (this.clearTimer <= 0) this.game.setScene(new Reel(this.game, R.CAPTIONS.clear, () => new ContinuedCard(this.game), 'STAGE 1 CLEAR'));
        return;
      }
      const frozen = this.camera.update(dt);
      if (frozen) return;
      this.time += dt;
      this.warningTimer = Math.max(0, this.warningTimer - dt);
      this.goTimer = Math.max(0, this.goTimer - dt);
      this.bossCard = Math.max(0, (this.bossCard || 0) - dt);
      this.updateSuper(dt);
      this.updateObjects(dt);
      this.finishWave(dt);
      this.camera.follow(this.player.x, dt);
    }
    drawWorld(ctx) {
      R.Stage1.draw(ctx, this.camera.x, this.time);
      const list = this.enemies.filter(item => !item.dead).concat(this.props.filter(item => !item.dead), this.pickups, this.allies, [this.player]);
      R.Entity.sortByDepth(list);
      for (const item of list) item.draw(ctx, this.camera.x);
      for (const projectile of this.projectiles) projectile.draw(ctx, this.camera.x);
      for (const hazard of this.hazards) hazard.draw(ctx, this.camera.x);
      this.fx.draw(ctx, this.camera.x);
      if (this.superTimer > 0) {
        const alpha = Math.min(1, this.superTimer * 2);
        ctx.strokeStyle = 'rgba(255,248,190,' + alpha + ')';
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.moveTo(this.player.x - this.camera.x + this.player.facing * 14, this.player.y - 42);
        ctx.lineTo(this.player.facing > 0 ? 660 : -20, this.player.y - 42);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
        ctx.lineWidth = 6;
        ctx.stroke();
        for (let i = 0; i < 5; i += 1) {
          const x = 80 + i * 125;
          ctx.strokeStyle = 'rgba(150,210,255,' + alpha + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x - 15, 80);
          ctx.lineTo(x + 8, 125);
          ctx.lineTo(x - 3, 210);
          ctx.stroke();
        }
      }
      this.snow.draw(ctx);
    }
    draw(ctx) {
      this.drawWorld(ctx);
      R.drawHUD(ctx, this);
      if (this.bossCard > 0) {
        R.drawPanel(ctx, 148, 131, 344, 74);
        R.drawText(ctx, 'BOSS', 320, 151, 8, '#e7ca6b', 'center');
        R.drawText(ctx, 'TROLLOC CHIEFTAIN', 320, 181, 12, '#ffffff', 'center');
      }
      if (this.player.taintAge > R.TUNE.taintGrace) {
        const amount = Math.min(0.55, 0.15 + (this.player.taintAge - R.TUNE.taintGrace) * 0.035);
        const gradient = ctx.createRadialGradient(320, 180, 100, 320, 180, 360);
        gradient.addColorStop(0, 'rgba(25,0,35,0)');
        gradient.addColorStop(1, 'rgba(52,0,75,' + amount + ')');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 640, 360);
      }
      if (this.paused) this.pauseMenu.draw(ctx);
      this.camera.drawFlash(ctx);
    }
  }
  R.scenes = R.scenes || {};
  Object.assign(R.scenes, { Title, Reel, Play, GameOver, ContinuedCard });
  R.settings.validateRun = function (run) {
    if (run.level !== 0) run.level = 0;
    run.wave = R.util.clamp(run.wave | 0, 0, 5);
    run.score = Math.max(0, run.score | 0);
    run.extra.saidin = R.util.clamp(Number(run.extra.saidin) || 0, 0, 100);
    run.extra.loial = run.extra.loial !== false;
    run.extra.lives = R.util.clamp(run.extra.lives == null ? 3 : run.extra.lives | 0, 0, 3);
    return run;
  };
}());
