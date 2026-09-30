'use strict';
(function () {
  const R = window.RWB;
  class Reel {
    constructor(game, lines, next, label, prefetchLevel) {
      this.game = game;
      this.lines = lines;
      this.next = next;
      this.label = label || 'STORY';
      this.prefetchLevel = prefetchLevel;
      this.i = 0;
      this.timer = 0;
      this.spoken = false;
      this.music = 'story';
      this.done = false;
      R.assets.ready(lines.map(line => R.storyArt(line.id)).filter(Boolean));
      if (R.voicePreload) R.voicePreload(lines.map(line => line.id));
    }
    update(dt, input) {
      if (this.done) return;
      if (R.Puppet && R.Puppet.prefetch && this.prefetchLevel != null) R.Puppet.prefetch(this.prefetchLevel);
      this.timer += dt;
      if (!this.spoken) {
        R.voice(this.lines[this.i].id, { quiet: true, sequence: true });
        this.spoken = true;
      }
      if (R.keyPressed(input, 'start') || R.keyPressed(input, 'attack') || R.keyPressed(input, 'jump') || R.keyPressed(input, 'click')) this.advance();
    }
    enter() { if (R.voiceReset) R.voiceReset(); R.audio.playMusic(this.music); }
    advance() {
      if (this.done) return;
      if (R.voiceReset) R.voiceReset();
      this.i += 1;
      if (this.i >= this.lines.length) { this.done = true; this.game.setScene(this.next()); }
      else {
        this.timer = 0;
        this.spoken = false;
      }
    }
    draw(ctx) {
      const line = this.lines[Math.min(this.i, this.lines.length - 1)];
      if (!line) return;
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
      const key = R.storyArt(line.id);
      if (!R.paint(ctx, key, 0, 0, 640, 360)) {
        const n = line.id.startsWith('escape_') ? 5 : Number((line.id.match(/^st(\d)_/) || [])[1]) || 1;
        R.StageWorld.draw(ctx, { levelIndex: n - 1, camera: { x: 300 + Math.min(this.timer, 8) * 4 }, time: this.timer });
        const hero = new R.Riley(null, {}); hero.x = 230; hero.y = 214; hero.facing = 1; hero.callandor = this.label.includes('CALLANDOR') || line.id.startsWith('escape_'); hero.draw(ctx, 0);
        if (line.who === 'kenzie' || line.id.startsWith('end_') || line.id.startsWith('escape_')) R.drawTwinkle(ctx, 382, 214, !line.id.startsWith('end_') && !line.id.startsWith('escape_'), this.timer);
        if (['taim','forsaken','fade','draghkar'].includes(line.who)) {
          const standin = { player: hero, wave: 5, arenaLeft: 0, arenaRight: 640 };
          const actor = new R.ShadowBoss(standin, 425, 218, line.who); actor.draw(ctx, 0);
        }
      }
      ctx.fillStyle = 'rgba(3,9,22,0.7)'; ctx.fillRect(0,0,640,41);
      R.drawText(ctx, this.label, 20, 22, 9, '#e8cd74');
      const portrait = 'portrait-' + (line.who === 'kenzie' ? 'twinkle' : line.who);
      if (line.who !== 'narrator' && !R.paint(ctx, portrait, 15, 231, 46, 58)) { ctx.fillStyle='#18314e'; ctx.beginPath(); ctx.arc(36,260,23,0,Math.PI*2); ctx.fill(); R.drawText(ctx,line.name[0],36,262,17,'#9bddff','center'); }
      R.drawPanel(ctx, 65, 225, 510, 82);
      R.drawText(ctx, line.name, 86, 244, 8, line.who === 'narrator' ? '#e8cd74' : '#70caff');
      // Long lines (the narrator) wrap onto up to three rows; typing runs across them.
      const rows = wrapText(line.text, 58);
      let budget = Math.floor(this.timer * 38);
      const top = rows.length > 1 ? 276 - (rows.length - 1) * 8 : 276;
      rows.forEach((row, n) => { if (budget > 0) R.drawText(ctx, row.slice(0, budget), 86, top + n * 16, 8, '#ffffff'); budget -= row.length + 1; });
      R.drawText(ctx, 'START / KICK / JUMP: NEXT', 620, 339, 6, '#aebdca', 'right');
    }
  }
  function wrapText(text, max) {
    const rows = [];
    let row = '';
    for (const word of String(text).split(' ')) {
      if (row && row.length + 1 + word.length > max) { rows.push(row); row = word; } else row = row ? row + ' ' + word : word;
    }
    if (row) rows.push(row);
    return rows;
  }
  R.wrapText = wrapText;
  class OptionsScene {
    constructor(game, mode) {
      this.game = game;
      this.panel = new R.OptionsPanel(mode, { full: true });
    }
    update(dt, input) {
      const action = this.panel.update(input, dt);
      if (action === 'back' || R.keyPressed(input, 'pause')) this.game.setScene(new Title(this.game));
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
    enter() { if (R.voiceReset) R.voiceReset(); R.audio.playMusic(this.music); }
    items() {
      return R.settings.loadRun() ? ['START', 'CONTINUE', 'OPTIONS', 'CONTROLS'] : ['START', 'OPTIONS', 'CONTROLS'];
    }
    update(dt, input) {
      const items = this.items();
      if (R.keyPressed(input, 'click')) {
        const pointer = input.pointer || R.input.pointer;
        const row = Math.round((pointer.y - 218) / 29);
        if (pointer.x >= 190 && pointer.x <= 450 && row >= 0 && row < items.length && Math.abs(pointer.y - (218 + row * 29)) <= 13) this.selection = row;
        else return;
      }
      if (R.keyPressed(input, 'down')) this.selection = (this.selection + 1) % items.length;
      if (R.keyPressed(input, 'up')) this.selection = (this.selection + items.length - 1) % items.length;
      if (!R.keyPressed(input, 'start') && !R.keyPressed(input, 'attack') && !R.keyPressed(input, 'click')) return;
      const chosen = items[this.selection];
      if (chosen === 'START') {
        R.settings.clearRun();
        this.game.setScene(new Reel(this.game, R.CAPTIONS.opening, () => new Reel(this.game, R.CAPTIONS.intro, () => new Play(this.game, 0, {}), "EMOND'S FIELD", 0), 'THE WHEEL TURNS', 0));
      } else if (chosen === 'CONTINUE') {
        const run = R.settings.loadRun();
        this.game.setScene(resumeRun(this.game, run));
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
      if (R.paint(ctx, 'title-key', 0, 0, 640, 360)) { const shade=ctx.createLinearGradient(0,120,0,360);shade.addColorStop(0,'#07132110');shade.addColorStop(1,'#030916ee');ctx.fillStyle=shade;ctx.fillRect(0,0,640,360); }
      if (!R.paint(ctx, 'logo', 35, 15, 335, 188)) {
        R.drawText(ctx, 'RILEY', 320, 72, 21, '#ffffff', 'center');
        R.drawText(ctx, 'WHEEL BRAWL', 320, 146, 17, '#e5c65f', 'center');
      }
      R.drawArtFailure(ctx);
      this.items().forEach((item, index) => R.drawText(ctx, (index === this.selection ? '◆ ' : '  ') + item, 320, 218 + index * 29, 9, index === this.selection ? '#70caff' : '#ffffff', 'center'));
      R.drawText(ctx, 'NEW RUN: ' + (R.settings.data.difficulty === 'hard' ? 'HARD' : 'NORMAL'), 20, 344, 6, '#e8cd74');
    }
  }
  // Keep story acknowledgement separate from the gameplay checkpoint.
  function resumeRun(game, run) {
    const carry = Object.assign({}, run.extra, { wave: run.wave, score: run.score, lives: run.extra.lives > 0 ? run.extra.lives : 3 });
    const play = () => new Play(game, run.level, carry);
    if (run.extra.pendingReveal === 'callandor') {
      return new Reel(game, R.CAPTIONS.callandor, () => {
        delete carry.pendingReveal;
        R.settings.saveRun({ level: run.level, wave: run.wave, score: run.score, extra: carry });
        return new Reel(game, R.CAPTIONS.stage5, play, R.LEVELS[4].name, 4);
      }, 'CALLANDOR ANSWERS', 4);
    }
    return play();
  }
  R.resumeRun = resumeRun;
  class GameOver {
    constructor(game, checkpoint) {
      this.game = game;
      this.checkpoint = checkpoint;
      this.time = 9;
      this.music = 'gameover';
    }
    continueRun() {
      const saved = Object.assign({}, this.checkpoint.extra, { wave: this.checkpoint.wave, score: Math.max(0, this.checkpoint.score - 500), lives: 3 });
      this.game.setScene(resumeRun(this.game, Object.assign({}, this.checkpoint, { score: saved.score, extra: saved })));
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
  class Victory {
    constructor(game) {
      this.game = game;
      this.time = 0;
      this.done = false;
      this.music = 'story';
      R.assets.ready(['cut-homecoming']);
    }
    enter() { if (R.voiceReset) R.voiceReset(); R.audio.playMusic(this.music); }
    update(dt, input) {
      if (this.done) return;
      this.time += dt;
      if (this.time > 1 && (R.keyPressed(input, 'start') || R.keyPressed(input, 'attack') || R.keyPressed(input, 'jump') || R.keyPressed(input, 'click'))) {
        this.done = true;
        this.game.setScene(new Title(this.game));
      }
    }
    draw(ctx) {
      ctx.fillStyle = '#081122';
      ctx.fillRect(0, 0, 640, 360);
      R.paint(ctx, 'cut-homecoming', 0, 0, 640, 360);
      R.drawPanel(ctx, 116, 28, 408, 292);
      R.drawText(ctx, 'TWINKLE TOES IS HOME!', 320, 63, 13, '#f0d36e', 'center');
      R.drawText(ctx, 'RILEY WHEEL BRAWL', 320, 91, 10, '#ffffff', 'center');
      R.drawText(ctx, 'FAMILY CREDITS', 320, 126, 7, '#91d3ff', 'center');
      R.drawText(ctx, 'JASON', 320, 157, 10, '#ffffff', 'center');
      R.drawText(ctx, 'RILEY', 320, 184, 10, '#ffffff', 'center');
      R.drawText(ctx, 'TWINKLE TOES', 320, 211, 10, '#ffffff', 'center');
      R.drawText(ctx, 'THE WHEEL TURNS. YOU WON.', 320, 249, 8, '#f0d36e', 'center');
      R.drawText(ctx, 'THANK YOU FOR PLAYING', 320, 277, 7, '#b9d4e7', 'center');
      R.drawText(ctx, 'START / KICK / TAP: TITLE', 320, 341, 6, '#ffffff', 'center');
    }
  }
  class Play {
    constructor(game, levelIndex, carry) {
      this.game = game;
      this.levelIndex = R.util.clamp(levelIndex | 0, 0, 4);
      this.level = R.LEVELS[this.levelIndex];
      this.carry = carry || {};
      this.difficulty = (this.carry.difficulty || R.settings.data.difficulty) === 'hard' ? 'hard' : 'normal';
      this.wave = R.util.clamp(this.carry.wave | 0, 0, 5);
      this.arenaLeft = this.level.wavePoints[this.wave];
      this.arenaRight = Math.min(this.level.length, this.arenaLeft + R.SCROLL.fight);
      this.player = new R.Riley(this, this.carry);
      this.player.x = this.arenaLeft + 90;
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
      this.marching = false;
      this.warning = '';
      this.warningTimer = 0;
      this.angrealDropped = false;
      this.superTimer = 0;
      this.superApplied = false;
      this.camera = new R.Camera({ length: this.level.length });
      this.camera.lock(this.arenaLeft, this.arenaRight);
      this.fx = new R.FX();
      this.snow = this.levelIndex === 0 ? new R.Stage1.SnowField() : { update() {}, draw() {} };
      this.music = 'stage' + (this.levelIndex + 1);
      this.subtitleQueue = [];
      this.seenEntrances = new Set();
      this.pauseMenu = new R.PauseMenu({
        onQuit: () => this.game.setScene(new Title(this.game)),
        extra: [{ label: 'RESTART STAGE', act: () => this.restartStage() }]
      });
      this.spawnWave(this.wave);
    }
    enter() {
      if (R.voiceReset) R.voiceReset();
      if (R.Puppet && R.Puppet.prepareStage) R.Puppet.prepareStage(this.levelIndex);
      const canvas = document.getElementById('game'), ctx = canvas && canvas.getContext('2d');
      if (ctx) {
        try {
          const rs = (R.display && R.display.renderScale) || 1;
          ctx.save();
          ctx.setTransform(rs, 0, 0, rs, 0, 0);
          // Bake every plate the march will cross, so the first time the
          // camera reaches it is not a stall in the middle of the walk.
          if (R.StageWorld) {
            for (const cam of [800, 1600, 2400, 3200, 3600]) {
              const ghost = { levelIndex: this.levelIndex, camera: { x: cam }, time: 0, wave: this.wave, roofOn: false, level: this.level };
              R.StageWorld.draw(ctx, ghost);
              R.StageWorld.near(ctx, ghost);
            }
          }
          this.draw(ctx);
          ctx.getImageData(0, 0, 1, 1);
          ctx.restore();
          if (R.perf) { R.perf.poseFallbacks = 0; R.perf.poseMiss = []; }
        } catch (e) { /* warmup is best-effort */ }
      }
      R.audio.playMusic(this.music);
      // Voice clips for this stage load after the cold enter has settled.
      if (R.voicePreloadStage) { const level = this.levelIndex; setTimeout(() => R.voicePreloadStage(level), 1200); }
      this.saveCheckpoint();
    }
    exit() { if (R.voiceReset) R.voiceReset(); }
    /** Speech bubble for a line spoken outside the subtitle queue (barks). Visual only. */
    showBark(line) {
      this.bark = { line, remaining: Math.max(1.6, 0.8 + line.text.length * 0.055) };
    }
    updateBark(dt) {
      if (this.bark) { this.bark.remaining -= dt; if (this.bark.remaining <= 0) this.bark = null; }
    }
    drawBark(ctx) {
      const bark = this.bark;
      if (!bark) return;
      const who = bark.line.who;
      const bossWho = this.levelIndex === 0 ? 'trolloc-chieftain' : this.level.kind;
      const actor = who === 'kenzie' && this.twinkle ? this.twinkle :
        who === 'loial' ? (this.allies.find(ally => ally.life > 0) || this.player) :
        this.boss && who === bossWho ? this.boss : this.player;
      const text = bark.line.text, name = bark.line.name;
      const w = Math.max(text.length, name.length) * 6 + 16, h = 30;
      const ax = actor.x - this.camera.x, ay = actor.y - (actor.z || 0) - (actor === this.boss ? 128 : 104);
      const x = R.util.clamp(ax - w / 2, 6, 634 - w), y = R.util.clamp(ay - h, 46, 250);
      ctx.save();
      ctx.globalAlpha = Math.min(1, bark.remaining * 4);
      ctx.fillStyle = 'rgba(250,247,236,0.95)'; ctx.strokeStyle = '#2a2033'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
      const tx = R.util.clamp(ax, x + 8, x + w - 8);
      ctx.beginPath(); ctx.moveTo(tx - 5, y + h - 1); ctx.lineTo(tx, y + h + 7); ctx.lineTo(tx + 5, y + h - 1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(tx - 5, y + h); ctx.lineTo(tx, y + h + 7); ctx.lineTo(tx + 5, y + h); ctx.stroke();
      R.drawText(ctx, name, x + 8, y + 9, 5, who === 'riley' || who === 'kenzie' ? '#1d5f9a' : '#9a2a2a');
      R.drawText(ctx, text, x + 8, y + 21, 6, '#141018');
      ctx.restore();
    }
    checkpointExtra() {
      const extra = { saidin: this.player.power, loial: this.player.loialReady, lives: this.player.lives, callandor: this.player.callandor, difficulty: this.difficulty };
      if (this.wave === 5 && this.boss && !this.boss.dead) extra.boss = {
        kind: this.level.kind, hp: this.boss.hp, attackIndex: this.boss.attackIndex || 0,
        usedAttacks: [...this.boss.usedAttacks], phaseTwo: !!this.boss.phaseTwo,
        twinkleFreed: !!this.twinkleFreed, rescueReady: !!this.rescueReady,
      };
      return extra;
    }
    saveCheckpoint(waveOverride) {
      const wave = waveOverride == null ? this.wave : waveOverride;
      const prev = this.wave;
      this.wave = wave;
      const extra = this.checkpointExtra();
      this.wave = prev;
      R.settings.saveRun({ level: this.levelIndex, wave, score: this.player.score, extra });
    }
    restartStage() {
      const carry = { saidin: this.player.power, loial: this.player.loialReady, lives: this.player.lives, score: this.player.score, callandor: this.player.callandor, difficulty: this.difficulty, wave: 0 };
      this.game.setScene(new Play(this.game, this.levelIndex, carry));
    }
    leash() {
      const margin = this.marching ? 0 : 120;
      return [this.arenaLeft - margin, this.arenaRight + margin];
    }
    spawnWave(index, opts) {
      const place = !opts || opts.place !== false;
      this.enemies.length = 0;
      this.projectiles.length = 0;
      this.hazards.length = 0;
      this.props.length = 0;
      this.marching = false;
      this.goTimer = 0;
      if (this.levelIndex === 2) { this.fog = new R.Mashadar(this); this.hazards.push(this.fog); }
      if (this.levelIndex === 4 && index === 4 && R.StageWorld && R.StageWorld.queueRoof) R.StageWorld.queueRoof();
      this.attackers.clear();
      const left = this.level.wavePoints[index];
      this.arenaLeft = left;
      this.arenaRight = Math.min(this.level.length, left + R.SCROLL.fight);
      if (this.camera) {
        this.camera.lead = 0.42;
        this.camera.x = left;
        this.camera.lock(this.arenaLeft, this.arenaRight);
      }
      if (place && this.player) this.player.x = this.arenaLeft + 90;
      const entries = this.level.mix[index];
      if (entries[0] === 'boss') {
        const bossX = this.camera.x + R.SCROLL.fight + 56;
        this.boss = this.levelIndex === 0 ? new R.Chieftain(this, bossX, 260) : new R.ShadowBoss(this, bossX, 260, this.level.kind);
        const savedBoss = this.carry.boss;
        if (savedBoss && savedBoss.kind === this.level.kind && Number.isFinite(savedBoss.hp)) {
          this.boss.hp = R.util.clamp(savedBoss.hp, 1, this.boss.hpMax);
          this.boss.attackIndex = Math.max(0, savedBoss.attackIndex | 0);
          this.boss.usedAttacks = new Set((Array.isArray(savedBoss.usedAttacks) ? savedBoss.usedAttacks : []).filter(a => this.level.attacks.includes(a)));
          this.boss.phaseTwo = !!savedBoss.phaseTwo;
          this.boss.jointReady = this.twinkleFreed = !!savedBoss.twinkleFreed;
          this.rescueReady = !!savedBoss.rescueReady;
          delete this.carry.boss;
        }
        this.enemies.push(this.boss);
        if (this.levelIndex === 4) this.twinkle = { x: this.arenaLeft + 80, y: 293, captive: !this.twinkleFreed };
        this.bossCard = this.levelIndex === 0 ? 2.2 : 3.2;
        const entrances = R.VOICE_TRIGGERS ? R.VOICE_TRIGGERS.bossEntry : [[], ['fade_intro_01','st2_fade_01'], ['draghkar_intro_01','st3_draghkar_01'], ['forsaken_intro_01'], ['taim_phase_01']];
        for (const id of entrances[this.levelIndex] || []) this.say(id, 1.5);
        if (this.twinkleFreed && !this.rescueReady) this.say('st5_kenzie_01');
      } else {
        entries.forEach((variant, i) => {
          const side = i % 2 ? -1 : 1;
          const cam = this.camera.x;
          // Enter from off-screen, then dash to the on-screen slot the fight was tuned for.
          const x = side > 0 ? cam + R.SCROLL.fight + 36 + (i >> 1) * 28 : cam - 36 - (i >> 1) * 28;
          const y = 235 + (i % 3) * 32;
          const enemy = ['axe','hound','spear'].includes(variant) ? new R.Trolloc(this, x, y, variant) : new R.ShadowSoldier(this, x, y, variant);
          enemy.facing = side > 0 ? -1 : 1;
          enemy.entryX = side > 0 ? cam + 460 + (i >> 1) * 36 : cam + 140 - (i >> 1) * 28;
          this.enemies.push(enemy);
          const entry = { darkfriend:'darkfriend_intro_01', guard:'stone_guard_intro_01', ashaman:'ashaman_intro_01', axe: this.levelIndex === 0 ? 'trolloc_intro_01' : null }[variant];
          if (entry && !this.seenEntrances.has(entry)) { this.seenEntrances.add(entry); this.say(entry); }
        });
      }
      // The old procedural barrel/crate read as placeholder boxes against the
      // painted stages; their reward now appears directly as a glowing pickup.
      if (index === 1 || index === 3) { const kind = this.angrealDropped ? (index === 1 ? 'heal' : 'spark') : 'angreal'; this.pickups.push(new R.Pickup(this, left + (index === 1 ? 420 : 180), index === 1 ? 305 : 244, kind)); if (kind === 'angreal') this.angrealDropped = true; }
      this.tutorial = index === 0 ? '{attack} KICK • {jump} JUMP' : index === 1 ? '{special} FIRE • DOWN+{attack} SPIN' : index === 2 ? '{assist} CALL LOIAL' : null;
      if (this.levelIndex > 0) this.tutorial = this.levelIndex === 2 ? 'AIRBORNE FOE: JUMP KICK OR FIREBALL' : this.levelIndex === 4 ? "BREAK TAIM'S SHIELD; FREE TWINKLE TOES" : null;
      this.saveCheckpoint();
    }
    say(id, duration) {
      const line = R.VOICE_LINES[id];
      if (line) this.subtitleQueue.push({ line, remaining: duration || 2.2 });
    }
    updateDialogue(dt) {
      if (!this.subtitle && this.subtitleQueue.length) {
        this.subtitle = this.subtitleQueue.shift();
        const id = this.subtitle.line.id;
        R.voice(id, { quiet: true, sequence: true });
        // The thank-you line now opens the rescue; the joint finish unlocks at the same moment as before.
        if (id === 'st5_kenzie_01' || id === 'st5_kenzie_03') this.rescueReady = true;
      }
      if (this.subtitle) { this.subtitle.remaining -= dt; if (this.subtitle.remaining <= 0) this.subtitle = null; }
    }
    carryToNext() {
      return { score: this.player.score, saidin: this.player.power, lives: this.player.lives, callandor: this.player.callandor, difficulty: this.difficulty, loial: true };
    }
    nextStage() {
      const next = this.levelIndex + 1;
      const carry = this.carryToNext();
      const start = () => new Reel(this.game, R.CAPTIONS['stage' + (next + 1)], () => new Play(this.game, next, carry), R.LEVELS[next].name, next);
      if (this.levelIndex === 4) return new Reel(this.game, R.CAPTIONS.escape, () => new Reel(this.game, R.CAPTIONS.ending, () => new Victory(this.game), 'HOMECOMING'), 'ESCAPE FROM THE BLACK TOWER');
      if (this.levelIndex === 0) return new Reel(this.game, R.CAPTIONS.clear, start, 'STAGE 1 CLEAR', next);
      if (this.levelIndex === 3) return resumeRun(this.game, { level: 4, wave: 0, score: this.player.score, extra: Object.assign(carry, { pendingReveal: 'callandor' }) });
      return start();
    }
    freeTwinkle() {
      this.twinkleFreed = true;
      this.say('taim_phase_03'); this.say('st5_kenzie_03'); this.say('st5_kenzie_01');
      this.warning = 'TWINKLE TOES IS FREE! FILL SAIDIN, THEN POWER'; this.warningTimer = 5;
      // A one-time rescue reward; hoarding it still starts the normal taint clock.
      this.player.power = this.player.powerMax;
      this.twinkle = { x: this.arenaLeft + 80, y: 293 };
    }
    startJoint() {
      if (!this.twinkleFreed || !this.rescueReady || this.joint || this.player.power < this.player.powerMax || this.player.dead || this.player.busy || this.player.grabbedBy || this.player.stunTimer > 0) return false;
      this.player.power = 0; this.player.taintAge = 0; this.player.taintClock = 0; this.player.taintTell = 0;
      this.player.invuln = 0.35; this.joint = { age: 0, hit: false };
      this.subtitle = null; this.subtitleQueue.length = 0;
      if (R.voiceReset) R.voiceReset(); // the player's joint command supersedes rescue chatter
      this.say('st5_riley_02', 0.8); this.say('st5_kenzie_02', 1.5);
      this.movesUsed.add('joint'); return true;
    }
    updateJoint(dt) {
      if (!this.joint || this.joint.hit) return;
      this.joint.age += dt;
      // Taim continues his normal AI and can hurt Riley during charge-up.
      if (this.player.dead) { this.joint = null; return; }
      const b = this.boss, progress = Math.min(1, this.joint.age / 1.25);
      this.joint.tips = [this.player, this.twinkle].map(source => ({
        x: source.x + (b.x - source.x) * progress,
        y: source.y + (b.y - source.y) * progress,
        z: 40 + (b.z + b.bh / 2 - 40) * progress
      }));
      // Collision uses the two visible advancing beam tips, never a timer-only kill.
      const contact = this.joint.tips.map(tip => R.collide.circle(tip.x, tip.y, tip.z, 6, 12, b.hurtbox()));
      if (progress >= 1 && contact.every(Boolean)) {
        this.joint.hit = b.takeHit(b.hp, this.player.x, { jointFinish: true, move: 'joint' });
        if (this.joint.hit) { this.fx.impact(b.x,b.y-b.z-b.bh/2,1,'finisher','#9ff5ff'); this.camera.impact(1, 'super'); this.playCue('balefire'); this.player.invuln = 2; }
      }
    }

    directorCanAttack(enemy) {
      const cap = this.level.maxAttackers || 2;
      return (this.attackers.has(enemy) || this.attackers.size < cap) && this.time >= (this.nextEnemyAttackAt || 0);
    }
    registerAttacker(enemy) {
      const cap = this.level.maxAttackers || 2;
      if (this.attackers.size < cap) {
        this.attackers.add(enemy);
        // A short randomized token hand-off prevents two valid attackers from
        // resolving their strikes on the same simulation frame.
        this.nextEnemyAttackAt = this.time + R.util.rand(0.16, 0.32);
      }
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
      const hitY = enemy.y - enemy.z - 40;
      const move=opts&&opts.move, callandor=this.player.callandor&&move!=='fireball', tint=move==='fireball'?'#ff8b38':callandor?'#9ff5ff':'#fff0ad';
      this.fx.impact(enemy.x,hitY,this.player.facing,(opts&&opts.knockdown)?(enemy.boss?'boss':'heavy'):'light',tint);
      this.fx.ring(enemy.x, enemy.y, !!(opts && opts.knockdown), '#fff3c7');
      this.fx.dust(enemy.x, enemy.y, 6);
      this.fx.spawn('slash', enemy.x, hitY, 0.16, { vx: this.player.facing || 1 });
      if (opts && opts.knockdown) this.fx.chunks(enemy.x, hitY, ['#fff1c4', '#d8c48a', '#ffffff'], 7, enemy.y);
      this.camera.impact(this.player.facing, opts && opts.knockdown ? 'heavy' : 'light');
      this.playCue(opts && opts.knockdown ? 'thud' : 'hit');
      return true;
    }
    latchInput(input) {
      if (!input) return;
      const keep = ['attack', 'jump', 'special', 'assist', 'power', 'up', 'down', 'left', 'right', 'start'];
      this.latchedPress = this.latchedPress || {};
      this.latchedHeld = this.latchedHeld || {};
      for (const key of keep) {
        if (input.pressed && input.pressed[key]) this.latchedPress[key] = true;
        if (input.held && input.held[key]) this.latchedHeld[key] = true;
      }
    }
    mergeLatch(input) {
      const pressed = Object.assign({}, this.latchedPress || {}, input && input.pressed || {});
      const held = Object.assign({}, this.latchedHeld || {}, input && input.held || {});
      this.latchedPress = {};
      this.latchedHeld = {};
      return Object.assign({}, input, { pressed, held });
    }
    hitPlayer(damage, fromX, opts) {
      if (this.phase !== 'play' || this.player.invuln > 0 || this.player.dead) return false;
      damage *= this.level.damageScale || 1;
      // Stage 2's Fade is the endurance gate; keep its multi-hit strings from
      // crossing a whole-heart breakpoint while ordinary soldiers stay sharp.
      if(this.levelIndex===1 && opts && ['SWORD COMBO','SHADOW BLINK','FEAR STUN'].includes(opts.source)) damage*=.94;
      // Preserve ordinary Black Tower wave breakpoints while making Taim the
      // final-stage pressure gate; applying this only to his named techniques
      // avoids the cliff caused by raising the whole stage damage scale.
      if(this.levelIndex===4 && opts && ['DARK BALEFIRE','STORM STRIKES','SHADOW SURGE'].includes(opts.source)) damage*=1.08;
      const kb = opts.kb == null ? 110 : opts.kb * (opts.knockdown ? 1.2 : 1.28);
      const landed = this.player.takeHit(damage, fromX, { kb, launch: opts.knockdown ? 320 : 150 });
      if (!landed) return false;
      this.damageTaken += damage;
      this.timesHit += 1;
      this.fx.impact(this.player.x,this.player.y-48,fromX<this.player.x?1:-1,opts.knockdown?(opts.source&&/BALEFIRE|BOSS/.test(opts.source)?'boss':'heavy'):'light','#ed79b7');
      this.fx.spawn('slash', this.player.x, this.player.y - 48, 0.14, { vx: fromX < this.player.x ? 1 : -1, color: '#ffe1e1' });
      if (opts.knockdown) this.fx.chunks(this.player.x, this.player.y - 30, ['#d7e4ee', '#ffffff'], 5, this.player.y);
      this.player.invuln = opts.knockdown ? 0.85 : 0.5;
      if (opts.knockdown && this.player.hp > 0) {
        this.player.setState('knockdown');
        // Big hit: Riley reacts (at most every 20 s so it never nags).
        if (R.VOICE_TRIGGERS && this.time >= (this.nextBigHitAt || 0)) { this.nextBigHitAt = this.time + 20; const n = this.bigHits || 0; this.bigHits = n + 1; R.voice(R.VOICE_TRIGGERS.bigHit[n % 2]); }
      }
      this.camera.impact(fromX < this.player.x ? 1 : -1, opts.knockdown ? 'boss' : 'heavy');
      this.playCue('hurt');
      if (this.player.hp <= 0) this.beginDeath();
      return true;
    }
    beginDeath() {
      this.player.dead = true;
      this.player.grabbedBy = null; this.player.stunTimer = 0; this.joint = null;
      this.saveCheckpoint();
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
        const checkpoint = { level: this.levelIndex, wave: this.wave, score: this.player.score, extra: this.checkpointExtra() };
        R.settings.saveRun(checkpoint);
        this.game.setScene(new GameOver(this.game, checkpoint));
      }
    }
    onEnemyDeath(enemy) {
      this.kills += 1;
      if (enemy.boss && enemy === this.boss && R.VOICE_TRIGGERS && !this.bossDefeatSaid) {
        this.bossDefeatSaid = true;
        R.voice(R.VOICE_TRIGGERS.bossDefeat[this.levelIndex], { sequence: true });
        R.voice(R.VOICE_TRIGGERS.bossWin[this.levelIndex], { sequence: true });
      }
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
      if (this.phase !== 'play') return false;
      if (!this.player.loialReady) { this.player.utilityVoice('riley_call_spent_01'); return false; }
      this.player.loialReady = false;
      this.allies.push(new R.Loial(this));
      this.playCue('loialHorn');
      R.voice('riley_call_01');
      this.saveCheckpoint();
      return true;
    }
    activateBalefire() {
      if (this.twinkleFreed) return this.startJoint();
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
      if (this.player.callandor && !this.player.spokenCallandor) { this.say('riley_callandor_01'); this.player.spokenCallandor = true; }
      R.voice('riley_super_01', { sequence: true });
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
          const damage = enemy.boss ? (this.player.callandor ? 156 : 78) : enemy.hpMax + 10;
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
      this.enemies = this.enemies.filter(item => !item.remove);
      for (const box of this.playerHitboxes) {
        for (const prop of this.props) if (!prop.dead && R.collide.overlap(box, prop.hurtbox())) prop.takeHit(12);
      }
      this.fx.update(dt);
      this.snow.update(dt);
    }
    finishWave(dt) {
      if (this.marching) return;
      if (this.enemies.some(enemy => !enemy.dead)) {
        this.waveClearTimer = 0;
        return;
      }
      if (!this.enemies.length && this.waveClearTimer <= 0) return;
      if (this.wave === 5) {
        this.phase = 'clear';
        if (this.levelIndex === 3) this.player.callandor = true;
        if (this.levelIndex === 4) R.settings.clearRun();
        else R.settings.saveRun({ level: this.levelIndex + 1, wave: 0, score: this.player.score, extra: Object.assign(this.carryToNext(), this.levelIndex === 3 ? { pendingReveal: 'callandor' } : {}) });
        this.clearTimer = this.bossDefeatSaid ? 3.6 : 1.4;
        return;
      }
      this.waveClearTimer += dt;
      this.goTimer = 99;
      if (this.waveClearTimer > 0.35) this.beginMarch();
    }
    beginMarch() {
      if (this.marching || this.wave >= 5) return;
      this.marching = true;
      this.waveClearTimer = 0;
      this.goTimer = 99;
      this.hazards.length = 0;
      this.camera.lead = 0.18;
      this.camera.unlock();
      this.arenaLeft = this.camera.x;
      this.arenaRight = this.level.length;
      if (R.audio && R.audio.sfx && R.audio.sfx.go) R.audio.sfx.go();
      this.marchPace = 1;
      this.saveCheckpoint(this.wave + 1);
    }
    stepRoofFade(dt) {
      const fade = this.roofFade;
      if (!fade) return;
      fade.t += dt;
      if (fade.phase === 'out' && fade.t >= 0.2) {
        this.roofOn = true;
        if (R.StageWorld && R.StageWorld.evictStreet) R.StageWorld.evictStreet();
        fade.phase = 'in';
        fade.t = 0;
      } else if (fade.phase === 'in' && fade.t >= 0.2) {
        this.roofFade = null;
        this.wave = 5;
        this.spawnWave(5, { place: false });
      }
    }
    updateMarch() {
      if (!this.marching || this.roofFade) return;
      // Live playerSpeed. +8% still walks under 6.2s, but fewer march frames
      // shift the seeded fight stream and natural damage leaves the band.
      this.marchPace = 1;
      const next = this.level.wavePoints[this.wave + 1];
      this.arenaLeft = this.camera.x;
      this.arenaRight = this.level.length;
      if (this.player.x >= next && this.camera.x >= next - 2) {
        if (this.levelIndex === 4 && this.wave === 4) {
          this.camera.x = next;
          this.camera.lead = 0.42;
          this.arenaLeft = next;
          this.arenaRight = Math.min(this.level.length, next + R.SCROLL.fight);
          this.camera.lock(this.arenaLeft, this.arenaRight);
          this.marching = false;
          this.goTimer = 0;
          this.roofFade = { phase: 'out', t: 0 };
          return;
        }
        this.camera.x = next;
        this.wave += 1;
        this.spawnWave(this.wave, { place: false });
      }
    }
    update(dt, input) {
      input = input || { pressed: {}, held: {}, axis: () => ({ x: 0, y: 0 }) };
      let openedPause = false;
      if (R.keyPressed(input, 'pause')) {
        this.paused = !this.paused;
        if (this.paused) { this.pauseMenu.open(); openedPause = true; }
      }
      if (!this.paused) this.updateBark(dt);
      if (this.paused) {
        this.currentInput = input;
        // The press that opened the menu is still in this update. Feeding it
        // to the menu selects RESUME and closes the pause on the same frame.
        if (!openedPause) {
          const result = this.pauseMenu.update(input, dt);
          if (result === 'resume') this.paused = false;
        }
        return;
      }
      if (this.phase === 'death') {
        this.deathTimer -= dt;
        if (this.deathTimer <= 0) this.resolveDeath();
        return;
      }
      if (this.phase === 'clear') {
        this.clearTimer -= dt;
        if (this.levelIndex < 4 && R.Puppet && R.Puppet.prefetch) R.Puppet.prefetch(this.levelIndex + 1);
        if (this.clearTimer <= 0 && !R.audio.voiceBusy && !this.clearQueued) { this.clearQueued = true; this.game.setScene(this.nextStage()); }
        return;
      }
      const frozen = this.camera.update(dt);
      if (frozen) {
        this.latchInput(input);
        this.currentInput = input;
        return;
      }
      input = this.mergeLatch(input);
      this.currentInput = input;
      this.time += dt;
      this.warningTimer = Math.max(0, this.warningTimer - dt);
      if (!this.marching) this.goTimer = Math.max(0, this.goTimer - dt);
      this.bossCard = Math.max(0, (this.bossCard || 0) - dt);
      if (this.marching) { this.marchPace = 1; this.arenaLeft = this.camera.x; this.arenaRight = this.level.length; }
      this.updateDialogue(dt);
      this.updateSuper(dt);
      this.updateObjects(dt);
      if (this.boss && !this.boss.dead && !this.bossMidSaid && this.boss.hp <= this.boss.hpMax * 0.5 && R.VOICE_TRIGGERS) {
        this.bossMidSaid = true;
        const mid = R.VOICE_TRIGGERS.bossMid[this.levelIndex];
        if (mid) R.voice(mid);
      }
      this.updateJoint(dt);
      this.finishWave(dt);
      this.stepRoofFade(dt);
      this.updateMarch();
      this.camera.follow(this.player.x, dt);
      if (this.boss && !this.boss.dead && this.time >= (this.nextBossSave || 0)) { this.nextBossSave = this.time + 1; this.saveCheckpoint(); }
    }
    drawWorld(ctx) {
      R.StageWorld.draw(ctx, this);
      const list = this.enemies.filter(item => !item.remove).concat(this.props.filter(item => !item.dead), this.pickups, this.allies, [this.player]);
      R.Entity.sortByDepth(list);
      for (const item of list) if(Math.abs(item.x-this.camera.x-320)<520)item.draw(ctx, this.camera.x);
      // If a nearer actor covers Riley, redraw him faintly on top so the player
      // never loses track of him in a pack (depth order itself is by foot y).
      const p = this.player;
      if (p && p.drawSprite && !p.dead && list.some(e => e !== p && e.y > p.y && Math.abs(e.x - p.x) < 60 && !e.dead)) { ctx.save(); ctx.globalAlpha = .38; p.ghost = true; p.drawSprite(ctx, this.camera.x); p.ghost = false; ctx.restore(); }
      for (const projectile of this.projectiles) if(Math.abs(projectile.x-this.camera.x-320)<440)projectile.draw(ctx, this.camera.x);
      for (const hazard of this.hazards) hazard.draw(ctx, this.camera.x);
      this.fx.draw(ctx, this.camera.x);
      if (this.superTimer > 0) {
        const alpha = Math.min(1, this.superTimer * 2);
        ctx.strokeStyle = 'rgba(255,248,190,' + alpha + ')';
        ctx.lineWidth = this.player.callandor ? 30 : 18;
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
      if (this.twinkle) {
        R.draw.shadow(ctx,this.twinkle.x-this.camera.x,this.twinkle.y,14,null,0);
        R.drawTwinkle(ctx, this.twinkle.x - this.camera.x, this.twinkle.y, !!this.joint, this.time);
        if (this.twinkle.captive) { ctx.strokeStyle='#a684dd'; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(this.twinkle.x-this.camera.x,this.twinkle.y-35,31,47,0,0,Math.PI*2); ctx.stroke(); }
      }
      if (this.joint) {

        for (const [i,source] of [this.player,this.twinkle].entries()) {
          const tip = this.joint.tips && this.joint.tips[i];
          if (!tip) continue;
          ctx.strokeStyle = i ? '#83dbff' : '#fff4b7'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(source.x-this.camera.x,source.y-40); ctx.lineTo(tip.x-this.camera.x,tip.y-tip.z); ctx.stroke();
        }
      }
      R.StageWorld.near(ctx, this);
      this.snow.draw(ctx);
      R.StageWorld.grade(ctx,this);
    }
    draw(ctx) {
      if (R.Bake) R.Bake.flushTouches(2);
      R.Motion.apply(this);ctx.save();
      try {this.camera.apply(ctx);this.drawWorld(ctx);} finally {ctx.restore();R.Motion.restore(this);}
      R.drawHUD(ctx, this);
      if (this.phase === 'play' && !this.paused) {
        for (const button of R.input.touch.buttons) {
          if (button.id === 'assist') button.label = 'CALL';
          if (button.id === 'special') button.label = 'FIRE';
        }
        R.input.drawTouch(ctx, { always: true, powerReady: this.player.power >= 100, assistReady: this.player.loialReady });
      }
      R.drawArtFailure(ctx);
      if (this.bossCard > 0) {
        R.drawPanel(ctx, 112, 107, 416, 113);
        const portrait = 'portrait-' + (this.levelIndex === 0 ? 'trolloc-chieftain' : this.level.kind);
        if (!R.paint(ctx, portrait, 124, 117, 72, 93)) R.drawText(ctx, this.level.boss[0], 160, 171, 26, '#91d3ff', 'center');
        R.drawText(ctx, 'BOSS ENCOUNTER', 350, 132, 7, '#e7ca6b', 'center');
        R.drawText(ctx, this.level.boss, 350, 162, 11, '#ffffff', 'center');
        const tips = ['DODGE THE SLAM. STRIKE BACK.', 'WATCH THE BLINK. CHANGE LANES.', 'JUMP KICK OR FIREBALL.', 'EVADE THE WEAVES. CLAIM CALLANDOR.', 'FREE TWINKLE TOES. FINISH TOGETHER.'];
        R.drawText(ctx, tips[this.levelIndex], 350, 192, 6, '#b9d4e7', 'center');
      }
      if (this.player.taintAge > R.TUNE.taintGrace) {
        const amount = Math.min(0.55, 0.15 + (this.player.taintAge - R.TUNE.taintGrace) * 0.035);
        const gradient = ctx.createRadialGradient(320, 180, 100, 320, 180, 360);
        gradient.addColorStop(0, 'rgba(25,0,35,0)');
        gradient.addColorStop(1, 'rgba(52,0,75,' + amount + ')');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 640, 360);
      }
      if (this.subtitle) {
        // Below the fighter band on every stage. y=192 crossed chests.
        const y = 328;
        R.drawPanel(ctx, 42, y, 556, 22);
        R.drawText(ctx, this.subtitle.line.name + ': ' + this.subtitle.line.text, 320, y + 14, 6, '#e4f6ff', 'center');
      }
      this.drawBark(ctx);
      if (this.twinkleFreed && !this.joint) R.drawText(ctx, R.input.fillKeys('FULL SAIDIN + {power}: TOGETHER!'), 320, 292, 7, '#a9edff', 'center');
      if (this.paused) this.pauseMenu.draw(ctx);
      this.camera.drawFlash(ctx);
      if (this.roofFade) {
        const fade = this.roofFade;
        const alpha = fade.phase === 'out' ? Math.min(1, fade.t / 0.2) : Math.max(0, 1 - fade.t / 0.2);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 640, 360);
        ctx.restore();
      }
    }
  }
  R.scenes = R.scenes || {};
  Object.assign(R.scenes, { Title, Reel, Play, GameOver, Victory });
  R.settings.validateRun = function (run) {
    run.level = R.util.clamp(run.level | 0, 0, 4);
    run.extra = run.extra || {};
    run.extra.callandor = !!run.extra.callandor;
    run.extra.difficulty = run.extra.difficulty === 'hard' ? 'hard' : 'normal';
    run.wave = R.util.clamp(run.wave | 0, 0, 5);
    run.score = Math.max(0, run.score | 0);
    run.extra.saidin = R.util.clamp(Number(run.extra.saidin) || 0, 0, 100);
    run.extra.loial = run.extra.loial !== false;
    run.extra.lives = R.util.clamp(run.extra.lives == null ? 3 : run.extra.lives | 0, 0, 3);
    return run;
  };
}());
