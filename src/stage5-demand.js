// Aginor, Balthamel, Loial and the grab atlas stay out of the zone 0 peak.
import { queueCharPages, makeCharAnims } from './assets.js';
import { queuePainted, paintBossFallback } from './stage5-art.js';

const BOSS_KEYS = ['s5agin', 's5balt', 'aginorPortrait'];

export function paintBossIfIdle(scene) {
  if (!scene || !BOSS_KEYS.some(k => !scene.textures?.exists?.(k))) return;
  if (scene._s5bossArt && scene.load?.isLoading?.()) return;
  paintBossFallback(scene);
}

function pump(scene, after) {
  const L = scene?.load;
  if (!L) return;
  const finish = () => {
    L.off?.('complete', finish);
    scene.events?.off?.('shutdown', finish);
    after?.();
  };
  L.once?.('complete', finish);
  scene.events?.once?.('shutdown', finish);
  if (typeof L.isLoading !== 'function' || !L.isLoading()) L.start?.();
}

function installGrab(scene) {
  const R = scene.riley;
  if (R && (R.state === 'grabbed' || R.state === 'escape')) { scene._s5grabWait = 1; return; }
  scene._s5grabWait = 0;
  scene.anims?.get?.('riley_grabbed')?.destroy();
  scene.anims?.get?.('riley_escape')?.destroy();
  const metas = makeCharAnims(scene, ['riley3']);
  if (metas.riley3 && scene.metas) scene.metas.riley3 = metas.riley3;
}

export function finishGrab(scene) {
  if (scene?._s5grabWait) installGrab(scene);
}

export function queueGrab(scene) {
  if (!scene?.load || scene._s5grab) return;
  scene._s5grab = 1;
  const arm = () => {
    queueCharPages(scene, ['riley3']);
    if (scene.textures?.exists?.('riley3-0')) { installGrab(scene); return; }
    pump(scene, () => installGrab(scene));
  };
  if (scene.cache?.json?.get?.('riley3.A')) { arm(); return; }
  scene.load.json('riley3.A', 'assets/stage3/chars/riley3.anims.json');
  const ev = 'filecomplete-json-riley3.A';
  const ready = () => { scene.load.off?.(ev, ready); arm(); };
  scene.load.once?.(ev, ready);
  pump(scene);
}

export function queueLoial(scene) {
  if (!scene?.load || scene.metas?.loial || scene._s5loial) return;
  scene._s5loial = 1;
  const arm = () => {
    queueCharPages(scene, ['loial']);
    const done = () => {
      const metas = makeCharAnims(scene, ['loial']);
      if (metas.loial && scene.metas) Object.assign(scene.metas, metas);
      scene._s5loial = 0;
      if (scene._loialWanted && scene.riley?.loialReady && !scene.loial) {
        scene._loialWanted = false;
        scene.callLoial?.();
      }
    };
    if (scene.textures?.exists?.('loial-0')) { done(); return; }
    pump(scene, done);
  };
  if (scene.cache?.json?.get?.('loial.A')) { arm(); return; }
  scene.load.json('loial.A', 'assets/chars/loial.anims.json');
  const ev = 'filecomplete-json-loial.A';
  const ready = () => { scene.load.off?.(ev, ready); arm(); };
  scene.load.once?.(ev, ready);
  pump(scene);
}

export function queueBossArt(scene) {
  if (!scene || scene._s5bossArt) return;
  scene._s5bossArt = 1;
  queuePainted(scene);
  queueGrab(scene);
  pump(scene, () => {
    if (BOSS_KEYS.some(k => !scene.textures?.exists?.(k))) paintBossFallback(scene);
  });
}
