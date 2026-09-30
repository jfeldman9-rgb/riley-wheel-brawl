/* Engine asset loader. Every image is optional: when a file is missing the game
   keeps its procedurally drawn stand-in, so it always stays playable.

   Sources:
   - RWB.ARTDATA (js/artdata.js, written by an art bake tool or by hand):
       { <atlasName>: { src, k, f: {frame: [sx,sy,sw,sh,ax,ay,_,painted]} }, plates: { <name>: { src } } }
     atlases register as 'art:<name>', plates as 'plate:<name>'.
   - RWB.assets.register(key, src, { lazy }) from content code, before load().
   - RWB.ART_MANIFEST (js/artmanifest.js): optional array of bundled file paths
     (e.g. 'assets/art/atlas-hero.webp'). When it is an array, ONLY listed files
     are requested, so absent art never produces a 404. When undefined, every
     registered file is tried (and a miss is retried once, then falls back).

   URLs carry the same ?v= stamp as the scripts, so a stale cached file or 404
   from an older deploy can't pin the fallback. */
'use strict';

RWB.ASSET_VER = '20260930-release2';
RWB.assets = (function () {
  const images = {};
  const cs = typeof document !== 'undefined' && document.currentScript;
  const VER = RWB.ASSET_VER = (cs && (cs.src.match(/[?&]v=([^&#]+)/) || [])[1]) || RWB.ASSET_VER;
  const manifest = {};   // key -> src, fetched during load()
  const lazy = {};       // key -> src, fetched in the background after load()

  const art = RWB.ARTDATA || {};
  for (const k of Object.keys(art)) if (k !== 'plates' && art[k] && art[k].src) manifest['art:' + k] = art[k].src;
  for (const k of Object.keys(art.plates || {})) manifest['plate:' + k] = art.plates[k].src;

  function listed(src) {
    const list = RWB.ART_MANIFEST;
    return !Array.isArray(list) || list.includes(src);
  }

  let loaded = 0, total = 0, done = false;
  const failed = [];
  const skipped = [];
  const pending = {};

  function register(key, src, opts) {
    if (opts && opts.lazy) lazy[key] = src; else manifest[key] = src;
  }
  function fetchImage(url, deferDecode) {
    return new Promise(resolve => {
      const img = new Image();
      // Story art is fetched in the background but decoded only when its reel
      // is about to show it (see ready()). Force-decoding every story still
      // at boot kept ~13 full-size bitmaps resident and evicted the stage
      // plates' decodes, which then re-decoded inside the cold stage enter.
      img.onload = async () => { try { if (deferDecode) { resolve((img.naturalWidth || img.width) > 0 ? img : null); return; } if (img.decode) await img.decode(); resolve(img); } catch (_) { resolve(null); } };
      img.onerror = () => resolve(null);
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  }
  function fetchResource(url, deferDecode) {
    if (!/\.json(?:[?&]|$)/.test(url)) return fetchImage(url, deferDecode);
    return fetch(url).then(response => response.ok ? response.json() : null).catch(() => null);
  }
  async function fetchKey(k, src) {
    if (!listed(src)) { images[k] = null; skipped.push(k); return null; }
    const url = src + (src.includes('?') ? '&' : '?') + 'v=' + VER;
    const deferDecode = k in lazy;
    let img = await fetchResource(url, deferDecode);
    if (!img) img = await fetchResource(url + '&r=' + Date.now(), deferDecode);
    images[k] = img;
    if (!img) { failed.push(k); if (k in lazy && typeof console !== 'undefined') console.info('[RWB] story art unavailable; using drawn art:', k); }
    return img;
  }

  function load(onProgress) {
    const keys = Object.keys(manifest);
    total = keys.length;
    if (!total) { done = true; onProgress && onProgress(1); loadLazy(); return Promise.resolve(); }
    return Promise.all(keys.map(async k => {
      await fetchKey(k, manifest[k]);
      loaded++; onProgress && onProgress(loaded / total);
    })).then(() => {
      done = true;
      if (failed.length && typeof console !== 'undefined') console.info('[RWB] optional art unavailable; using drawn art:', failed.join(', '));
      loadLazy();
    });
  }
  /* Two at a time, in registration order. */
  function loadLazy() {
    const keys = Object.keys(lazy).filter(k => !(k in pending));
    let i = 0;
    const next = () => {
      if (i >= keys.length) return Promise.resolve();
      const k = keys[i++];
      pending[k] = fetchKey(k, lazy[k]);
      return pending[k].then(next);
    };
    return Promise.all([next(), next()]);
  }
  /** Resolves when the given keys have settled (loaded, failed or skipped). */
  function ready(keys) {
    const want = keys || [];
    if (want.some(k => k in lazy && !(k in pending))) loadLazy();
    // A reel asks for its stills when it is built; start their off-thread
    // decode then, so the first painted frame does not decode synchronously.
    const warm = (k, img) => { if (img && k in lazy && img.decode) img.decode().catch(() => {}); return img; };
    return Promise.all(want.map(k => (pending[k] || Promise.resolve(images[k] || null)).then(img => warm(k, img))));
  }

  function get(key) { return images[key] || null; }
  function has(key) { return !!images[key]; }
  function settled(key) { return key in images; }
  return {
    register, load, ready, get, has, settled, VER, listed,
    failed: () => failed.slice(), skipped: () => skipped.slice(),
    get progress() { return total ? loaded / total : 1; }, get done() { return done; }
  };
})();
