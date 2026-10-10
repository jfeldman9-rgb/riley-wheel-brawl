// Live fault-injection probe. Run against this worktree's static server.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.RWB_URL || 'http://127.0.0.1:18767/';
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const rows = [], transitions = [];
try {
  for (const mode of ['none', 'one', 'atlas-json', 'atlas-webp', 'all']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = [], warnings = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (/missing|Failed to process/i.test(m.text())) warnings.push(m.text()); });
    await page.route('**/assets/**', route => {
      const p = new URL(route.request().url()).pathname;
      const fail = mode === 'one' ? p.endsWith('/bg6mid3.webp') : mode === 'atlas-json' ? p.endsWith('/s6belal.json') : mode === 'atlas-webp' ? p.endsWith('/s6belal.webp') : mode === 'all' ? /\/(stage6|bg6)\/.*\.(webp|jpg|json)$/.test(p) && !p.endsWith('/layout.json') || p.endsWith('/prop-crate.webp') : false;
      return fail ? route.fulfill({ status: 404, body: 'fault injected' }) : route.continue();
    });
    await page.goto(base + '?s6=1&stage=6&story=0&autostart=1', { waitUntil: 'load' });
    try { await page.waitForFunction(() => window.__stage?.started, null, { timeout: 60000 }); }
    catch (e) { errors.push(e.message); }
    rows.push({ mode, errors, warnings, state: await page.evaluate(async () => {
      const p = await import('./src/stage6-paint.js'), a = await import('./src/stage6-art.js'), s = window.__stage;
      if (!s) return { startup: document.getElementById('startup-error')?.textContent };
      return { started: s.started, optional: [...s.load.optionalAssetKeys || []], keys: p.PAINTED6_ROWS.map(r => [r.key, s.textures.exists(r.key) ? (p.isPainted(s, r.key) ? 'file' : 'canvas') : 'absent']),
        missingCanvases: a.STAGE6_CANVASES.filter(([k]) => !s.textures.exists(k) && !k.startsWith('story')).map(([k]) => k),
        plateTiles: s.children.list.filter(o => o.scrollFactorX === 0.4).map(o => [o.texture?.key, o.texture?.source?.[0]?.isCanvas]),
        atlasMeta: s.textures.get('s6belal').customData };
    }) });
    await page.close();
  }
  for (const to of [1,2,3,4,5,6]) {
    const page = await browser.newPage({ viewport: { width:1280, height:720 } }), errors=[], missing=[], crateRequests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=> { if (/Texture.*not found|missing texture/i.test(m.text())) missing.push(m.text()); });
    page.on('request',r=> { if (r.url().endsWith('/prop-crate.webp')) crateRequests.push(r.url()); });
    await page.goto(base+'?s6=1&stage=5&autostart=1&story=0');
    await page.waitForFunction(()=>window.__stage?.stageNo===5 && window.__stage.started,null,{timeout:60000});
    await page.evaluate(()=> { window.__crateBefore=window.__stage.textures.get('crate'); window.__stage.scene.restart({stage:6,autostart:true,story:false}); });
    await page.waitForFunction(()=>window.__stage?.stageNo===6 && window.__stage.started,null,{timeout:60000});
    const reuse = await page.evaluate(()=>window.__stage.textures.get('crate')===window.__crateBefore);
    assert.equal(reuse,true); assert.equal(crateRequests.length,1);
    await page.evaluate(to=>window.__stage.scene.restart({stage:to,autostart:true,story:false}),to);
    await page.waitForFunction(to=>window.__stage?.stageNo===to && window.__stage.started,to,{timeout:60000});
    const after = await page.evaluate(async ()=> {
      const s=window.__stage, { STAGE_TEXTURES, SHARED_TEXTURES }=await import('./src/stages.js');
      const { STAGE6_TEXTURES }=await import('./src/stage6-def.js');
      return {stage:s.stageNo, optional:[...s.load.optionalAssetKeys || []],
        remaining6:STAGE6_TEXTURES.filter(k=>s.textures.exists(k) && !(STAGE_TEXTURES[s.stageNo] || []).includes(k)),
        missingNeeded:(STAGE_TEXTURES[s.stageNo] || []).filter(k=>!s.textures.exists(k) && !k.startsWith('story')),
        crateSame:s.textures.exists('crate') && s.textures.get('crate')===window.__crateBefore,
        shared:SHARED_TEXTURES.filter(k=>s.textures.exists(k))};
    });
    assert.deepEqual(after.remaining6,[]); assert.deepEqual(after.missingNeeded,[]); assert.deepEqual(errors,[]); assert.deepEqual(missing,[]);
    assert.equal(after.crateSame,to!==1); assert.equal(crateRequests.length,1);
    transitions.push({to,reuse,crateLoads:crateRequests.length,after,errors,missing}); await page.close();
  }
} finally { await browser.close(); }
writeFileSync('docs/stage6/final-browser.json', JSON.stringify(rows, null, 2) + '\n');
writeFileSync('docs/stage6/final-transitions.json', JSON.stringify(transitions,null,2)+'\n');
console.log(JSON.stringify(rows));
console.log(JSON.stringify(transitions));
