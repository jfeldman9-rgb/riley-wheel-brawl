// Native trimmed-frame registration and knife-glint probe, with optional HEAD source baseline.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const baseline = process.env.RWB_BASELINE === '1', base = process.env.RWB_URL || 'http://127.0.0.1:18767/';
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let result;
try {
  const page = await browser.newPage({ viewport: { width:1280, height:720 } });
  if (baseline) for (const name of ['grayman','belal']) {
    const body=execFileSync('git',['show',`HEAD:src/${name}.js`],{encoding:'utf8'});
    await page.route(`**/src/${name}.js`,r=>r.fulfill({contentType:'text/javascript',body}));
  }
  await page.goto(base + '?s6=1&stage=6&autostart=1&story=0&vig=0&bloom=0');
  await page.waitForFunction(() => window.__stage?.started, null, { timeout:60000 });
  result = await page.evaluate(async () => {
    const s = window.__stage, g = window.__game; g.loop.stop(); s.god=true;
    for (const e of s.enemies) e.destroy?.(); s.enemies=[];
    s.riley.sprite.setVisible(false); s.riley.shadow?.setVisible(false);
    const { GrayMan } = await import('./src/grayman.js'), { Belal } = await import('./src/belal.js'), { Fadelt } = await import('./src/fadelt.js');
    const actors = [new GrayMan(s,640,630), new Belal(s,980,630), new Fadelt(s,280,630)];
    actors[0].state='attack'; actors[0].facing=1; actors[0].age=6;
    actors[1].state='attack'; actors[1].hitI=0; actors[1].st=0.2; actors[1].facing=-1;
    actors[2].state='attack'; actors[2].hitI=1;
    const out=[];
    for (const e of actors) {
      e.sync(); const p=e.sprite, f=p.frame, rect=f.data.spriteSourceSize, source=f.data.sourceSize;
      out.push({ type:e.type, origin:[p.originX,p.originY], scale:p.scaleX, cell:[source.w,source.h], trim:[rect.x,rect.y,rect.w,rect.h],
        footAnchor:[p.x,p.y], shadow:[e.shadow.x,e.shadow.y],
        glint:e.glint && [e.glint.x-e.x,e.glint.y-e.y], streak:e.streak && [e.streak.x-e.x,e.streak.y-e.y] });
    }
    // SourceSize sets the origin in the full cell, even when the packed frame is trimmed.
    g.renderer.render(s, s.children.list, s.cameras.main);
    return out;
  });
  await page.screenshot({ path:`docs/stage6/final-alignment${baseline ? '-before' : ''}.jpg`, type: 'jpeg', quality: 72 });
} finally { await browser.close(); }
writeFileSync(`docs/stage6/final-alignment${baseline ? '-before' : ''}.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
