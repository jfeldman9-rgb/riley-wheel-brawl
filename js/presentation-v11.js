/* Release 1.1 presentation only. No combat clocks, RNG, hitboxes or save values
   are changed here. Whole independently painted outcome sprites replace the
   corresponding actor only during the already-existing clear presentation. */
'use strict';
(function () {
  const R = window.RWB;
  const kinds = ['chieftain', 'fade', 'draghkar', 'forsaken', 'taim'];
  const cards = {
    axe: { name: 'AXE TROLLOC', art: 'cg-trolloc', hint: 'STEP ASIDE, THEN KICK THE OPENING' },
    hound: { name: 'HOUND TROLLOC', art: 'cg-trolloc', hint: 'FAST CHARGE: CHANGE YOUR LANE' },
    spear: { name: 'SPEAR TROLLOC', art: 'cg-trolloc', hint: 'CLOSE THE GAP FROM ANOTHER LANE' },
    darkfriend: { name: 'DARKFRIEND', art: 'cg-darkfriend', hint: 'WATCH THE APPROACH; KEEP MOVING' },
    cultist: { name: 'CULTIST', art: 'cg-cultist', hint: 'DODGE THE SPELL, THEN STRIKE' },
    guard: { name: 'STONE GUARD', art: 'cg-stone-guard', hint: 'WAIT FOR THE HEAVY SWING TO MISS' },
    ashaman: { name: "TURNED ASHA'MAN", art: 'cg-turned-ashaman', hint: 'CHANGE LANES TO EVADE THE WEAVE' }
  };
  const cache = new Map();
  let outcomeLevel = -1;
  function keys(level) { const kind = kinds[level]; return ['riley-victory-' + kind, 'boss-defeat-' + kind]; }
  // Mirror Chromium's software decode-cache mip sizing: use the last ceil-sized
  // mip that is no smaller than the requested destination on either axis.
  // cc/tiles/mipmap_util.cc and software_image_decode_cache_utils.cc.
  function outcomeMipSize(width, height, targetWidth, targetHeight) {
    let level = 0, w = width, h = height;
    while (w > 1 || h > 1) {
      const divisor = Math.pow(2, level + 1);
      const nextW = Math.max(1, Math.ceil(width / divisor));
      const nextH = Math.max(1, Math.ceil(height / divisor));
      if (nextW < targetWidth || nextH < targetHeight) break;
      level++; w = nextW; h = nextH;
    }
    return { level, width: w, height: h };
  }
  function drawOutcomeBitmap(g, img, box, width, height) {
    const mip = outcomeMipSize(box[2], box[3], width, height);
    g.imageSmoothingQuality = 'low';
    if (!mip.level) {
      g.drawImage(img, box[0], box[1], box[2], box[3], 0, 0, width, height);
      return;
    }
    // Extract the authored integer subrect before mip filtering, so pixels
    // outside its edges cannot enter the intermediate's sampling footprint.
    const crop = document.createElement('canvas');
    crop.width = box[2]; crop.height = box[3];
    const cg = crop.getContext('2d');
    cg.imageSmoothingEnabled = false; cg.globalCompositeOperation = 'copy';
    cg.drawImage(img, box[0], box[1], box[2], box[3], 0, 0, crop.width, crop.height);
    const scaled = document.createElement('canvas');
    scaled.width = mip.width; scaled.height = mip.height;
    const mg = scaled.getContext('2d');
    mg.imageSmoothingEnabled = true; mg.imageSmoothingQuality = 'medium';
    mg.globalCompositeOperation = 'copy';
    // Chromium's cache uses Medium scalePixels on a cropped pixmap. Canvas
    // Medium is the public sampling request; exact equivalence is browser-tested.
    mg.drawImage(crop, 0, 0, crop.width, crop.height, 0, 0, scaled.width, scaled.height);
    g.drawImage(scaled, 0, 0, scaled.width, scaled.height, 0, 0, width, height);
  }
  function pose(key, height) {
    const img = R.assets.get(key);
    if (!img) return null;
    const scale = Math.min(3, (R.display && R.display.renderScale) || 1);
    const id = key + ':' + scale + ':' + height;
    if (cache.has(id)) return cache.get(id);
    const meta = R.OUTCOME_ART && R.OUTCOME_ART[key];
    const box = meta && meta.bounds || [0, 0, img.width, img.height];
    const width = height * box[2] / box[3];
    const c = document.createElement('canvas');
    c.width = Math.ceil(width * scale); c.height = Math.ceil(height * scale);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const outcomeBitmap = (key.startsWith('riley-victory-') || key.startsWith('boss-defeat-')) &&
      typeof ImageBitmap === 'function' && img instanceof ImageBitmap;
    // The lossless proxy is drawn exactly like the original encoded <img>, so
    // Chromium's decode-cache crop/mip/filter stages are the browser's own.
    const proxy = outcomeBitmap && R.assets.proxy ? R.assets.proxy(key) : null;
    if (proxy) g.drawImage(proxy, box[0], box[1], box[2], box[3], 0, 0, c.width, c.height);
    else if (outcomeBitmap && box.every(Number.isInteger)) drawOutcomeBitmap(g, img, box, c.width, c.height);
    else g.drawImage(img, box[0], box[1], box[2], box[3], 0, 0, c.width, c.height);
    const entry = { canvas: c, width, height };
    cache.set(id, entry);
    // Keep only current-stage pairs at current render scale, never all masters.
    while (cache.size > 4) cache.delete(cache.keys().next().value);
    return entry;
  }
  // Canvas draws are deferred: a pose's decode/resize runs when its surface is
  // first used. Rasterize each pose in its own task right after a frame, so the
  // cost neither stacks into one long task nor lands on the first clear frame.
  let warm = null;
  function preparePoses(pair, level) {
    const next = index => {
      if (index >= pair.length || outcomeLevel !== level) return;
      const run = () => {
        if (outcomeLevel !== level) return;
        const entry = pose(pair[index], heightFor(pair[index]));
        if (entry && typeof document !== 'undefined') {
          if (!warm) { warm = document.createElement('canvas'); warm.width = warm.height = 1; }
          const g = warm.getContext('2d');
          if (g) { g.drawImage(entry.canvas, 0, 0, 1, 1); warm.width = 1; }
        }
        next(index + 1);
      };
      if (typeof requestAnimationFrame === 'function' && typeof setTimeout === 'function') requestAnimationFrame(() => setTimeout(run, 0));
      else run();
    };
    next(0);
  }
  function heightFor(key) {
    const meta = R.OUTCOME_ART && R.OUTCOME_ART[key];
    return meta && meta.height || (key.startsWith('riley-') ? 100 : key.endsWith('draghkar') ? 78 : 74);
  }
  function drawPose(ctx, key, x, groundY, facing) {
    const p = pose(key, heightFor(key));
    if (!p) return false;
    const half = p.width / 2;
    // Visual containment only: this does not move the actor or change gameplay.
    x = Math.max(half + 8, Math.min(632 - half, x));
    ctx.save(); ctx.translate(x, groundY); ctx.scale(facing || 1, 1);
    ctx.drawImage(p.canvas, -half, -p.height, p.width, p.height); ctx.restore();
    return true;
  }
  function heroKey(actor) { return actor.g && actor.g.phase === 'clear' ? keys(actor.g.levelIndex)[0] : null; }
  const heroDraw = R.Riley.prototype.draw;
  R.Riley.prototype.draw = function (ctx, cam) {
    const key = heroKey(this);
    if (key && R.assets.has(key)) {
      this.drawShadow(ctx, cam, 19);
      if (drawPose(ctx, key, this.x - cam, this.y, this.facing)) return;
    }
    return heroDraw.call(this, ctx, cam);
  };
  const heroSprite = R.Riley.prototype.drawSprite;
  R.Riley.prototype.drawSprite = function (ctx, cam) {
    // The main draw above already rendered the victory painting; don't overlay
    // a ghost of the old idle frame while another dead actor overlaps it.
    if (this.ghost && heroKey(this) && R.assets.has(heroKey(this))) return true;
    return heroSprite.apply(this, arguments);
  };
  function bossPose(actor, ctx, cam) {
    const scene = actor.g;
    if (!actor.boss || !actor.dead || !scene || scene.phase !== 'clear') return false;
    const key = keys(scene.levelIndex)[1];
    if (!R.assets.has(key)) return false;
    actor.drawShadow(ctx, cam, actor.kind === 'draghkar' ? 38 : 29);
    return drawPose(ctx, key, actor.x - cam, actor.y + 2, actor.facing);
  }
  for (const Class of [R.Trolloc, R.Chieftain, R.ShadowBoss]) {
    const original = Class.prototype.draw;
    Class.prototype.draw = function (ctx, cam) {
      if (bossPose(this, ctx, cam)) return;
      return original.call(this, ctx, cam);
    };
  }
  const spawn = R.scenes.Play.prototype.spawnWave;
  R.scenes.Play.prototype.spawnWave = function (index, opts) {
    const result = spawn.call(this, index, opts);
    if (outcomeLevel !== this.levelIndex) {
      const keep = new Set(keys(this.levelIndex));
      if (R.assets.releaseDemand) R.assets.releaseDemand(kinds.flatMap((_, i) => keys(i)).filter(key => !keep.has(key)));
      cache.clear(); outcomeLevel = this.levelIndex;
    }
    this.enemyCards = this.enemyCards || [];
    this.seenEnemyCards = this.seenEnemyCards || new Set();
    if (index === 5) {
      const pair = keys(this.levelIndex);
      const level = this.levelIndex;
      R.assets.ready(pair).then(() => preparePoses(pair, level));
      this.enemyCards.length = 0;
    } else {
      for (const type of this.level.mix[index]) {
        if (!cards[type] || this.seenEnemyCards.has(type)) continue;
        this.seenEnemyCards.add(type);
        this.enemyCards.push({ type, remaining: 3.2 });
      }
    }
    return result;
  };
  function cardVisible(scene) {
    return !scene.paused && scene.phase === 'play' && !scene.marching && !scene.bossCard && !scene.boss &&
      !(scene.player.angreal > 0) && !(scene.player.healPortrait > 0) && scene.enemyCards && scene.enemyCards.length > 0;
  }
  const update = R.scenes.Play.prototype.update;
  R.scenes.Play.prototype.update = function (dt, input) {
    const result = update.call(this, dt, input);
    if (cardVisible(this)) {
      this.enemyCards[0].remaining -= dt;
      if (this.enemyCards[0].remaining <= 0) this.enemyCards.shift();
    }
    return result;
  };
  const world = R.scenes.Play.prototype.drawWorld;
  R.scenes.Play.prototype.drawWorld = function (ctx) {
    world.call(this, ctx);
    // Once removed from the simulation list, retain the authored defeat tableau
    // for the remainder of the existing clear hold. No extra enemy is spawned.
    if (this.phase === 'clear' && this.boss && (this.boss.remove || !this.enemies.includes(this.boss))) bossPose(this.boss, ctx, this.camera.x);
  };
  const draw = R.scenes.Play.prototype.draw;
  R.scenes.Play.prototype.draw = function (ctx) {
    draw.call(this, ctx);
    if (!cardVisible(this)) return;
    const card = cards[this.enemyCards[0].type];
    if (!card) return;
    // Non-modal and above the fighters: movement/attacks never wait for a card.
    R.drawPanel(ctx, 301, 76, 331, 39);
    const type = this.enemyCards[0].type;
    const rig = R.Puppet && R.Puppet.defs[['axe','hound','spear'].includes(type) ? 'trolloc' : type];
    const portrait = R.assets.get(card.art);
    if (portrait && rig && rig.head) {
      const b=rig.head;
      ctx.drawImage(portrait,b[0]*portrait.width,b[1]*portrait.height,(b[2]-b[0])*portrait.width,(b[3]-b[1])*portrait.height,307,79,26,33);
    } else R.paint(ctx, card.art, 307, 79, 26, 33);
    R.drawText(ctx, card.name, 342, 89, 6, '#efdb97');
    R.drawText(ctx, card.hint, 342, 105, 5, '#e4f6ff');
  };
  R.presentationV11 = { kinds, cards, keys, pose, drawPose, cache, bossPose, cardVisible };
})();
