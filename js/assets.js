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

RWB.ASSET_VER = '20260930-v11-review';
RWB.assets = (function () {
  const images = {};
  const cs = typeof document !== 'undefined' && document.currentScript;
  const VER = RWB.ASSET_VER = (cs && (cs.src.match(/[?&]v=([^&#]+)/) || [])[1]) || RWB.ASSET_VER;
  const manifest = {};   // key -> src, fetched during load()
  const lazy = {};       // key -> src, fetched in the background after load()
  const demand = new Set(); // requested stage-only art, never boot-prefetched
  const generation = {};  // release invalidates an in-flight master safely
  const bitmapKeys = new Set(), ownedBitmaps = new WeakSet();

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
    if (opts && (opts.lazy || opts.demand)) lazy[key] = src; else manifest[key] = src;
    if (opts && opts.demand) demand.add(key);
    if (opts && opts.bitmap) bitmapKeys.add(key);
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
  function closeBitmap(img) {
    if (!img || !ownedBitmaps.has(img)) return;
    ownedBitmaps.delete(img);
    dropProxy(img);
    try { img.close(); } catch (_) { /* already detached */ }
  }
  /* Lossless lazy-image proxy for a retained outcome master. Chromium resizes an
     encoded <img> through its decode cache (crop, Medium mip, Low final), which
     ImageBitmap draws never use. A worker copies the master's decoded pixels into
     an uncompressed 32-bit BMP, so the pose cache can take the exact HTML-image
     path while the per-draw decode is a near-memcpy instead of a 57 ms WebP decode.
     The master ImageBitmap stays the owned resource; any failure keeps the
     existing ImageBitmap pose path. */
  const proxyOf = new WeakMap();
  let proxyWorker = null, proxyJob = 0, proxyAlpha = null;
  const proxyWaits = new Map();
  const PROXY_WORKER = 'self.onmessage=function(e){var d=e.data,b=d.bitmap,buf=null;try{' +
    'var w=b.width,h=b.height,c=new OffscreenCanvas(w,h),g=c.getContext("2d",{willReadFrequently:true});' +
    'g.globalCompositeOperation="copy";g.drawImage(b,0,0);var px=g.getImageData(0,0,w,h).data;' +
    'buf=new ArrayBuffer(124+w*h*4);var v=new DataView(buf);v.setUint16(0,0x4d42,true);v.setUint32(2,buf.byteLength,true);' +
    'v.setUint32(10,124,true);v.setUint32(14,108,true);v.setInt32(18,w,true);v.setInt32(22,-h,true);v.setUint16(26,1,true);' +
    'v.setUint16(28,32,true);v.setUint32(30,3,true);v.setUint32(34,w*h*4,true);v.setUint32(54,0xff0000,true);' +
    'v.setUint32(58,0xff00,true);v.setUint32(62,0xff,true);v.setUint32(66,0xff000000,true);v.setUint32(70,0x73524742,true);' +
    'var s=new Uint32Array(px.buffer,px.byteOffset,w*h),o=new Uint32Array(buf,124,w*h);' +
    'for(var i=0;i<s.length;i++){var p=s[i];o[i]=(p&0xff00ff00)|((p&0xff)<<16)|((p>>>16)&0xff);}' +
    '}catch(_){buf=null;}try{b.close();}catch(_){}self.postMessage({id:d.id,buf:buf},buf?[buf]:[]);};';
  function proxySupported() {
    return typeof Worker === 'function' && typeof OffscreenCanvas === 'function' && typeof Blob === 'function' &&
      typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && typeof Image === 'function';
  }
  function loadProxyImage(blob) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(blob), img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }
  // One-time 2x2 check that this browser decodes 32-bit BMP alpha (premultiplied
  // exactly as the master was); otherwise proxies are never used.
  function proxyAlphaOk() {
    if (proxyAlpha) return proxyAlpha;
    return proxyAlpha = (async () => {
      const buf = new ArrayBuffer(124 + 16), v = new DataView(buf);
      v.setUint16(0, 0x4d42, true); v.setUint32(2, buf.byteLength, true); v.setUint32(10, 124, true); v.setUint32(14, 108, true);
      v.setInt32(18, 2, true); v.setInt32(22, -2, true); v.setUint16(26, 1, true); v.setUint16(28, 32, true); v.setUint32(30, 3, true);
      v.setUint32(34, 16, true); v.setUint32(54, 0xff0000, true); v.setUint32(58, 0xff00, true); v.setUint32(62, 0xff, true);
      v.setUint32(66, 0xff000000, true); v.setUint32(70, 0x73524742, true);
      v.setUint32(132, 0x80ff4020, true); v.setUint32(136, 0xff102030, true);
      const loaded = await loadProxyImage(new Blob([buf], { type: 'image/bmp' }));
      if (!loaded) return false;
      try {
        const c = document.createElement('canvas'); c.width = 2; c.height = 2;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(loaded.img, 0, 0);
        const d = g.getImageData(0, 0, 2, 2).data;
        return d[3] === 0 && d[7] === 0 && d[11] === 128 && d[8] === 255 && d[9] === 64 && d[10] === 32 &&
          d[12] === 16 && d[13] === 32 && d[14] === 48 && d[15] === 255;
      } catch (_) { return false; } finally { URL.revokeObjectURL(loaded.url); }
    })();
  }
  async function buildProxy(master) {
    if (!proxySupported()) return null;
    try {
      if (!(await proxyAlphaOk())) return null;
      if (!proxyWorker) {
        const url = URL.createObjectURL(new Blob([PROXY_WORKER], { type: 'text/javascript' }));
        proxyWorker = new Worker(url); URL.revokeObjectURL(url);
        proxyWorker.onmessage = e => { const done = proxyWaits.get(e.data.id); if (done) { proxyWaits.delete(e.data.id); done(e.data.buf); } };
        proxyWorker.onerror = () => { for (const done of proxyWaits.values()) done(null); proxyWaits.clear(); };
      }
      const copy = await createImageBitmap(master), id = ++proxyJob;
      const buf = await new Promise(resolve => {
        // A stalled worker must never hold back the outcome master itself.
        const timer = typeof setTimeout === 'function' ? setTimeout(() => { if (proxyWaits.delete(id)) resolve(null); }, 5000) : 0;
        proxyWaits.set(id, value => { if (timer) clearTimeout(timer); resolve(value); });
        proxyWorker.postMessage({ id, bitmap: copy }, [copy]);
      });
      if (!buf || !master.width) return null;
      const loaded = await loadProxyImage(new Blob([buf], { type: 'image/bmp' }));
      if (loaded && (loaded.img.naturalWidth !== master.width || loaded.img.naturalHeight !== master.height)) { URL.revokeObjectURL(loaded.url); return null; }
      return loaded;
    } catch (_) { return null; }
  }
  function dropProxy(img) {
    const entry = img && proxyOf.get(img);
    if (!entry) return;
    proxyOf.delete(img);
    URL.revokeObjectURL(entry.url);
    entry.img.removeAttribute && entry.img.removeAttribute('src');
  }
  async function fetchBitmap(url, deferDecode) {
    if (typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return fetchImage(url, deferDecode);
    let blob;
    try {
      const response = await fetch(url);
      if (!response || !response.ok || typeof response.blob !== 'function') return null;
      blob = await response.blob();
    } catch (_) { return null; }
    let img;
    try {
      // Outcome masters must retain decoded pixels. HTMLImageElement.decode()
      // can succeed, then its evicted decode is repeated during the pose blit.
      img = await createImageBitmap(blob);
      if (!img || !img.width || !img.height) throw Error('Empty outcome bitmap');
      ownedBitmaps.add(img);
      Object.defineProperties(img, {
        naturalWidth: { configurable: true, get() { return this.width; } },
        naturalHeight: { configurable: true, get() { return this.height; } }
      });
    } catch (_) {
      if (img) {
        // A rejected compatibility wrapper must not leak its decoded master.
        if (!ownedBitmaps.has(img)) ownedBitmaps.add(img);
        closeBitmap(img);
      }
      return fetchImage(url, deferDecode);
    }
    const proxy = await buildProxy(img);
    // Released (closed) while the proxy was built: never attach to a detached master.
    if (proxy && ownedBitmaps.has(img) && img.width) proxyOf.set(img, proxy);
    else if (proxy) URL.revokeObjectURL(proxy.url);
    return img;
  }
  function fetchResource(url, deferDecode, bitmap) {
    if (!/\.json(?:[?&]|$)/.test(url)) return bitmap ? fetchBitmap(url, deferDecode) : fetchImage(url, deferDecode);
    return fetch(url).then(response => response.ok ? response.json() : null).catch(() => null);
  }
  async function fetchKey(k, src) {
    if (!listed(src)) { images[k] = null; skipped.push(k); return null; }
    const url = src + (src.includes('?') ? '&' : '?') + 'v=' + VER;
    const deferDecode = k in lazy, token = generation[k] || 0;
    let img = await fetchResource(url, deferDecode, bitmapKeys.has(k));
    if (!img && (generation[k] || 0) === token) img = await fetchResource(url + '&r=' + Date.now(), deferDecode, bitmapKeys.has(k));
    if ((generation[k] || 0) !== token) { closeBitmap(img); return null; }
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
  /* Two fetches at a time. Every queued key gets its promise immediately,
     so ready() can wait for a late-registered story/outcome rather than falsely
     resolving null just because the first two downloads are still in flight. */
  const lazyQueue = [];
  let lazyActive = 0;
  function pumpLazy() {
    while (lazyActive < 2 && lazyQueue.length) {
      const job = lazyQueue.shift();
      lazyActive++;
      fetchKey(job.key, lazy[job.key]).then(job.resolve, () => job.resolve(null)).finally(() => {
        lazyActive--;
        pumpLazy();
      });
    }
  }
  function loadLazy(requested) {
    const wanted = new Set((requested || []).filter(key => key in lazy));
    const keys = [...wanted, ...Object.keys(lazy).filter(key => !demand.has(key) && !wanted.has(key))];
    for (const key of keys) {
      if (key in pending) continue;
      pending[key] = new Promise(resolve => lazyQueue.push({ key, resolve }));
    }
    // A requested reel or current-stage outcome goes before unused ambient art.
    // Downloads already in flight finish normally; the two-fetch limit remains.
    lazyQueue.sort((a, b) => Number(wanted.has(b.key)) - Number(wanted.has(a.key)));
    pumpLazy();
    return Promise.all(keys.map(key => pending[key]));
  }
  function releaseDemand(keys) {
    for (const key of keys || []) {
      if (!demand.has(key)) continue;
      generation[key] = (generation[key] || 0) + 1;
      closeBitmap(images[key]);
      delete images[key]; delete pending[key];
      for (let i = lazyQueue.length - 1; i >= 0; i--) if (lazyQueue[i].key === key) {
        lazyQueue[i].resolve(null); lazyQueue.splice(i, 1);
      }
    }
  }
  /** Resolves when the given keys have settled (loaded, failed or skipped). */
  function ready(keys) {
    const want = keys || [];
    if (want.some(k => k in lazy)) loadLazy(want);
    // A reel asks for its stills when it is built; start their off-thread
    // decode then, so the first painted frame does not decode synchronously.
    const warm = async (k, img, token) => {
      if (img && k in lazy && img.decode) { try { await img.decode(); } catch (_) {} }
      return demand.has(k) && ((generation[k] || 0) !== token || images[k] !== img) ? null : img;
    };
    return Promise.all(want.map(k => {
      const token = generation[k] || 0;
      return (pending[k] || Promise.resolve(images[k] || null)).then(img => warm(k, img, token));
    }));
  }

  function get(key) { return images[key] || null; }
  /** Exact lazy-image proxy of a retained outcome master, or null. */
  function proxy(key) { const img = images[key]; const entry = img && proxyOf.get(img); return entry ? entry.img : null; }
  function has(key) { return !!images[key]; }
  function settled(key) { return key in images; }
  return {
    register, load, ready, releaseDemand, get, proxy, has, settled, VER, listed,
    failed: () => failed.slice(), skipped: () => skipped.slice(),
    get progress() { return total ? loaded / total : 1; }, get done() { return done; }
  };
})();
