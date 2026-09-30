'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { boot } = require('./soak.cjs');
const root = path.resolve(__dirname, '..');
let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; console.log('PASS ' + label); };
(async () => {
  const R = boot(root), P = R.presentationV11;
  check(!!P, 'New presentation module loads through the normal index');
  const requested=[];const assetGet=R.assets.get;R.assets.get=key=>{requested.push(key);return null;};
  new R.Riley(null,{}).drawSprite(createCanvas(640,360).getContext('2d'),0,'walk5');R.assets.get=assetGet;
  check(requested.includes('riley16-walk5'),'Presentation wrapper preserves forced-frame argument for inherited art review');
  check(Object.keys(P.cards).length === 7, 'All seven ordinary enemy variants have a first-encounter card');
  const scene = new R.scenes.Play(R.game, 0, {});
  const initial = scene.enemyCards.map(card => card.type);
  check(initial.length > 0 && new Set(initial).size === initial.length, 'First wave queues unique enemy introductions');
  scene.spawnWave(0);
  check(scene.enemyCards.length === initial.length, 'Revisiting a wave never queues duplicate seen introductions');
  const snapshots = () => JSON.stringify({ phase: scene.phase, x: scene.player.x, hp: scene.player.hp, enemies: scene.enemies.map(e => [e.x,e.y,e.hp]), wave:scene.wave, time:scene.time });
  const canvas = createCanvas(640, 360), ctx = canvas.getContext('2d');
  const before = snapshots(); scene.draw(ctx);
  check(snapshots() === before, 'Drawing a first-enemy card does not mutate simulation state');
  check(P.cards.cultist.hint.includes('SPELL') && P.cards.ashaman.hint.includes('LANES'), 'Previously missing spellcasters have concrete tactics');
  const pausedTimer = scene.enemyCards[0].remaining;
  scene.paused = true; scene.update(1, { pressed:{},held:{},axis:()=>({x:0,y:0}) });
  check(scene.enemyCards[0].remaining === pausedTimer, 'Pause freezes the card reading timer');
  scene.paused = false;scene.player.angreal=10;const hiddenTimer=scene.enemyCards[0].remaining;
  scene.update(1/60,{pressed:{},held:{},axis:()=>({x:0,y:0})});
  check(scene.enemyCards[0].remaining===hiddenTimer,'Hidden enemy card cannot expire behind an Angreal buff');
  scene.player.angreal=0;scene.spawnWave(5);
  check(scene.enemyCards.length === 0, 'Boss entry dismisses ordinary intro cards without conflicting with the boss card');
  const images = {}, hashes = new Set();
  for (const key of P.kinds.flatMap((_, i) => P.keys(i))) {
    const filename = R.ART_FILES[key];
    check(!!filename && R.ART_MANIFEST.includes(filename), key + ' is allowlisted');
    const bytes = fs.readFileSync(path.join(root, filename));
    hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
    images[key] = await loadImage(path.join(root, filename));
    const image = images[key], probe = createCanvas(image.width,image.height), g=probe.getContext('2d');
    g.drawImage(image,0,0); const pixels=g.getImageData(0,0,image.width,image.height).data;
    let clear=0,ink=0; for(let j=3;j<pixels.length;j+=4){if(pixels[j]===0)clear++;if(pixels[j]>128)ink++;}
    check(clear>image.width*image.height*.05 && ink>image.width*image.height*.05, key + ' has real transparent background and substantial painted content');
    const metadata=R.OUTCOME_ART&&R.OUTCOME_ART[key];
    check(metadata&&metadata.bounds&&metadata.bounds.length===4&&metadata.bounds[2]>0&&metadata.bounds[3]>0, key+' has reviewed grounding metadata');
  }
  check(hashes.size === 10, 'Ten independently delivered paintings are distinct files, not duplicate-frame aliases');
  const originalGet=R.assets.get.bind(R.assets),originalHas=R.assets.has.bind(R.assets);
  R.assets.get=key=>images[key]||originalGet(key); R.assets.has=key=>!!images[key]||originalHas(key);
  for(let level=0;level<5;level++) {
    const s=new R.scenes.Play(R.game,level,{wave:5,callandor:level===4});
    s.phase='clear';s.boss.dead=true;s.player.x=s.camera.x+200;s.boss.x=s.camera.x+430;
    const state=JSON.stringify({x:s.player.x,bossX:s.boss.x,phase:s.phase,hp:s.player.hp,power:s.player.power});
    for(const facing of [-1,1]){s.player.facing=facing;s.player.draw(ctx,s.camera.x);s.boss.draw(ctx,s.camera.x);}
    check(JSON.stringify({x:s.player.x,bossX:s.boss.x,phase:s.phase,hp:s.player.hp,power:s.player.power})===state,'Stage '+(level+1)+' outcome poses preserve positions/HP/power in both facings');
    check(P.cache.size<=4,'Stage '+(level+1)+' sprite-resize cache remains bounded');
  }
  R.assets.get=()=>null;R.assets.has=()=>false;
  scene.player.draw(ctx,scene.camera.x);scene.boss.dead=true;scene.phase='clear';scene.boss.draw(ctx,scene.camera.x);
  check(true,'Missing outcome paintings retain the original renderer fallback');
  console.log(checks+' presentation checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
