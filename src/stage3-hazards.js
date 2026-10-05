// Stage 3 hazards: roof tiles (zone 2), shadow FX (pools, wisps, bursts), drops, Fade glimpse.
import { VW, LANE_TOP, LANE_BOT, clamp, rand, pick } from './config.js';
import { sfx, say } from './audio.js';
import { VOLLEY_BANDS } from './stages.js';
import { Stage2Kit, MID_Y } from './stage2.js';
import { FADE } from './myrddraal.js';

export const TILES = Object.freeze({
  zone: 2, warn: 0.9, speed: 900, every: Object.freeze([3.0, 4.2]),
  dmg: 9, enemyDmg: 14, hitDx: 60, hitZ: 90,
});

export const TILE_BANDS = VOLLEY_BANDS;

export class Stage3Hazards extends Stage2Kit {
  constructor(s) {
    super(s);
    this.tiles = []; this.drops = []; this.pools = []; this.copies = [];
    this.bursts = []; this.glimpse = null; this.glimpsed = false; this.roofSaid = false; this.tileT = TILES.every[0];
    this.saidParries = 0;
    Object.assign(this.stats, {
      tiles: 0, tileHits: 0, tileEnemyHits: 0, dropins: this.stats.dropins || 0,
      pools: 0, bursts: 0, glimpses: 0,
    });
  }

  startTile() {
    const s = this.s, R = s.riley, rb = Math.max(0, this.bandOf(R.y));
    // Riley's band is always marked.
    const bands = [rb];
    // This adjacency rule keeps the safe band next to Riley's band, so the walk to safety is at most one band (~40 px).
    if (Math.random() < 0.5) bands.push(rb === 1 ? pick([0, 2]) : 2 - rb);
    const markers = bands.map(i => {
      const [y0, y1] = VOLLEY_BANDS[i];
      return this.img('lanemark', s.camX + VW / 2, (y0 + y1) / 2, 950).setDisplaySize(VW + 80, y1 - y0).setTint(0xffb040).setAlpha(0.5);
    });
    const dir = pick([-1, 1]);
    this.tiles.push({ bands, markers, t: 0, dir, x: null, img: null, hit: new Set(), frame: 0, dustT: 0 });
    sfx.tileRattle?.();
    this.hint('tiles', 'ROOF TILES! CHANGE LANES!');
    if (!this.roofSaid) { this.roofSaid = true; say('riley_st3_roof_01', s.caption, false); }
    this.stats.tiles++;
  }

  updateTiles(dt) {
    const s = this.s;
    if (s.zoneI === TILES.zone && s.zone && s.locked && s.wave >= 0 && !s.victoryPending && !s.ended && this.tiles.length === 0) {
      if ((this.tileT -= dt) <= 0) {
        this.startTile();
        this.tileT = rand(TILES.every[0], TILES.every[1]);
      }
    }
    const R = s.riley;
    for (let i = 0; i < this.tiles.length; i++) {
      const k = this.tiles[i];
      k.t += dt;
      for (const m of k.markers) {
        m.setPosition(s.camX + VW / 2, m.y);
        m.setAlpha(0.32 + 0.28 * Math.abs(Math.sin(k.t * 9)));
      }
      if (k.t >= TILES.warn) {
        if (!k.img) {
          const x = k.dir > 0 ? s.camX - 120 : s.camX + VW + 120;
          const [y0, y1] = VOLLEY_BANDS[k.bands[0]];
          k.img = this.img('rooftiles', x, (y0 + y1) / 2, 1000 + y1).setScale(0.5).setLighting(true);
          k.img.flipX = k.dir > 0;
          k.x = x;
        }
        k.x += k.dir * TILES.speed * Math.min(dt, k.t - TILES.warn);
        k.img.setPosition(k.x, k.img.y);
        const f = Math.floor((k.t - TILES.warn) * 8) % 4;
        k.frame = f;
        k.img.setFrame?.(f);
        if ((k.dustT += dt) >= 0.05) {
          k.dustT = 0;
          s.fx?.dust?.emitParticleAt(k.x, k.img.y, 1);
        }
        if (R?.alive && k.bands.includes(this.bandOf(R.y)) && Math.abs(R.x - k.x) < TILES.hitDx && (R.z || 0) < TILES.hitZ && !k.hit.has(R)) {
          k.hit.add(R);
          if (R.takeHit({ dmg: TILES.dmg, kind: 'heavy', kb: 300 * k.dir, down: true }, { x: k.x - k.dir })) {
            this.stats.tileHits++;
            s.fx?.impact?.('heavy', R.x, R.y - 150, 1);
          }
        }
        for (const e of s.enemies || []) {
          if (e.canBeHit && k.bands.includes(this.bandOf(e.y)) && Math.abs(e.x - k.x) < TILES.hitDx && (e.z || 0) < TILES.hitZ && !k.hit.has(e)) {
            k.hit.add(e);
            if (e.takeHit({ dmg: TILES.enemyDmg, kind: 'heavy', kb: 300 * k.dir, launch: 200, down: true }, { x: k.x - k.dir })) {
              this.stats.tileEnemyHits++;
            }
          }
        }
        const done = k.dir > 0 ? k.x > s.camX + VW + 140 : k.x < s.camX - 140;
        if (done) {
          k.img.destroy();
          for (const m of k.markers) m.destroy();
          this.tiles.splice(i--, 1);
        }
      }
    }
  }

  shadowPool(pool) {
    const entry = { pool, img: this.img('shadowpool', pool.x, pool.y + 2, 905).setScale(0.4).setAlpha(0.4).setLighting(false) };
    this.pools.push(entry);
    this.stats.pools++;
    return entry;
  }

  shadowPoolEnd(pool) {
    const f = pool?.fx;
    if (!f) return;
    pool.fx = null;
    f.img?.destroy();
    const idx = this.pools.indexOf(f);
    if (idx !== -1) this.pools.splice(idx, 1);
  }

  copyWisps(copy) {
    if (this.copies.length >= 2) return;
    const thin = (this.s.fx?.quality || 0) >= 2;
    const em = this.s.add.particles(0, 0, 'smoke', {
      follow: copy.sprite, followOffset: { y: -10 }, lifespan: 700,
      speedY: { min: -40, max: -15 }, scale: { start: 0.35, end: 0.8 },
      alpha: { start: 0.35, end: 0 }, tint: 0x20242c,
      frequency: thin ? 270 : 90,
    }).setDepth(1000 + copy.y - 1);
    this.copies.push({ copy, em, thin });
  }

  copyGone(copy) {
    for (let i = 0; i < this.copies.length; i++) {
      if (this.copies[i].copy === copy) {
        this.copies[i].em?.destroy();
        this.copies.splice(i, 1);
        break;
      }
    }
  }

  shadowBurst(x, y) {
    this.bursts.push({ img: this.img('shadowburst', x, y - 100, 1000 + y + 2).setLighting(false), t: 0 });
    this.stats.bursts++;
  }

  dropMarker(e) {
    this.drops.push(e);
  }

  onZoneClear(i) {
    const s = this.s;
    for (const p of s.pickups.slice()) {
      if (p.kind === 'ribbon') { this.collectRibbon(p); s.removePickup(p); }
    }
    if (i === TILES.zone && !this.glimpsed) {
      this.glimpsed = true;
      const startX = s.camX * 0.3 - 128;
      this.glimpse = {
        img: s.add.image(startX, MID_Y - 330, 'fade_far', 0).setScrollFactor(0.3, 1).setDepth(-60).setLighting(false),
        t: 0,
      };
      say('riley_st3_glimpse_01', s.caption, false);
      this.stats.glimpses++;
    }
  }

  updateHazards(dt) {
    if (this.s.paused) return;
    const p = this.stats.parries || 0; if (p !== this.saidParries) { this.saidParries = p; if (p) say('riley_counter_01', this.s.caption, false); }
    this.updateTiles(dt);

    for (let i = 0; i < this.pools.length; i++) {
      const p = this.pools[i];
      const u = clamp(p.pool.t / FADE.blink.poolWarn, 0, 1);
      p.img.setScale(0.4 + 0.6 * u).setAlpha(0.4 + 0.6 * u).setFrame?.(Math.min(3, Math.floor(u * 4)));
    }

    const thin = (this.s.fx?.quality || 0) >= 2;
    for (let i = 0; i < this.copies.length; i++) {
      const c = this.copies[i];
      if (c.thin !== thin) { c.thin = thin; c.em.frequency = thin ? 270 : 90; }
    }

    for (let i = 0; i < this.bursts.length; i++) {
      const b = this.bursts[i];
      b.t += dt;
      if (b.t >= 0.5) { b.img.destroy(); this.bursts.splice(i--, 1); }
      else b.img.setFrame?.(Math.min(5, Math.floor(b.t * 12)));
    }

    for (let i = 0; i < this.drops.length; i++) {
      if (this.drops[i].state !== 'dropin') this.drops.splice(i--, 1);
    }

    if (this.glimpse) {
      const g = this.glimpse;
      g.t += dt;
      g.img.x += 700 * dt;
      g.img.setFrame?.(Math.floor(g.t * 10) % 4);
      if (g.img.x > this.s.camX * 0.3 + VW + 128) {
        g.img.destroy();
        this.glimpse = null;
      }
    }
  }

  clearHazards() {
    super.clearHazards();
    for (const k of this.tiles) { for (const m of k.markers) m.destroy(); k.img?.destroy(); }
    for (const p of this.pools) { if (p.pool) p.pool.fx = null; p.img?.destroy(); }
    for (const c of this.copies) c.em?.destroy();
    for (const b of this.bursts) b.img?.destroy();
    this.glimpse?.img?.destroy();
    this.tiles.length = this.pools.length = this.copies.length = this.bursts.length = this.drops.length = 0;
    this.glimpse = null;
    this.tileT = TILES.every[0];
  }

  threats() {
    return {
      ...super.threats(),
      tiles: this.tiles,
      drops: this.drops,
      pools: this.pools,
      copies: this.copies,
      aura: !!this.s.boss?.auraActive,
    };
  }
}
