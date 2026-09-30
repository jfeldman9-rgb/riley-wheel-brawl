'use strict';
(function () {
  const R = window.RWB;
  function bar(ctx, x, y, w, h, ratio, color, back) {
    ctx.fillStyle = back || '#252d38';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    const rs=(R.display&&R.display.renderScale)||1;
    ctx.fillRect(x, y, Math.max(0, Math.round(w * ratio * rs) / rs), h);
    ctx.strokeStyle = '#dce5e9';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }
  function drawRileyPortrait(ctx, x, y) {
    const img = R.assets.get('riley16-portrait');
    if (img) {
      ctx.save();ctx.beginPath();ctx.arc(x,y,21,0,Math.PI*2);ctx.clip();ctx.drawImage(img,x-21,y-21,42,42);ctx.restore();
      ctx.strokeStyle='#61c6ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,21,0,Math.PI*2);ctx.stroke();return;
    }
    ctx.fillStyle='#101c2d';ctx.beginPath();ctx.arc(x,y,21,0,Math.PI*2);ctx.fill();
    R.drawText(ctx,'R',x,y+5,15,'#61c6ff','center');
  }
  const hudLayer = { key: '', canvas: null };
  R.HUDStats = { paints: 0, hits: 0 };
  function paintHud(ctx, scene) {
    const player = scene.player;
    const big = !!R.settings.data.bigHud;
    const font = big ? 9 : 7;
    const small = big ? 8 : 6;
    const panelH = big ? 72 : 62;
    R.drawPanel(ctx, 7, 7, big ? 286 : 250, panelH);
    drawRileyPortrait(ctx, 31, big ? 42 : 36);
    R.drawText(ctx, 'RILEY', 57, big ? 20 : 17, font, '#ffffff');
    const hpColor = R.settings.data.colorblind ? '#28a8ff' : '#e45151';
    bar(ctx, 57, big ? 32 : 27, big ? 150 : 128, big ? 12 : 10, player.hp / player.hpMax, hpColor);
    R.drawText(ctx, 'HP ' + Math.ceil(player.hp), big ? 214 : 191, big ? 38 : 32, small, '#ffffff');
    const tainted = player.taintAge > R.TUNE.taintGrace;
    bar(ctx, 57, big ? 50 : 44, big ? 150 : 128, big ? 10 : 8, player.power / player.powerMax, tainted ? '#a05bd3' : '#61cdf2');
    R.drawText(ctx, tainted ? 'TAINT' : 'SAIDIN', big ? 214 : 191, big ? 55 : 48, small, tainted ? '#e2b5ff' : '#ffffff');
    R.drawText(ctx, 'LIVES ' + player.lives, big ? 214 : 191, big ? 70 : 60, small, '#ffffff');
    const rightW = big ? 196 : 173;
    const rightX = 640 - rightW - 7;
    R.drawPanel(ctx, rightX, 7, rightW, panelH);
    const textX = rightX + 9;
    R.drawText(ctx, 'LOIAL ' + (player.loialReady ? 'READY' : 'SPENT'), textX, big ? 24 : 20, font, player.loialReady ? '#8cf0ae' : '#87909a');
    R.drawText(ctx, 'SCORE ' + String(player.score).padStart(7, '0'), textX, big ? 44 : 38, font, '#ffffff');
    R.drawText(ctx, 'WAVE ' + Math.min(6, scene.wave + 1) + '/6', textX, big ? 64 : 54, small, '#b7cce1');
    // Banner names the stage itself (Callandor is Stage 4's reward, not Stage 5's title).
    R.drawText(ctx, 'STAGE ' + (scene.levelIndex + 1), 320, 16, 6, '#efdb97', 'center');
    R.drawText(ctx, (scene.level && scene.level.banner) || (scene.level && scene.level.name) || '', 320, 27, 5, '#efdb97', 'center');
    if (player.angreal > 0) {
      R.drawPanel(ctx, 235, 75, 170, 24);
      R.drawText(ctx, 'ANGREAL ' + player.angreal.toFixed(1) + 's', 320, 88, 7, '#ffe078', 'center');
    }
    if (player.healPortrait > 0) {
      R.drawMoirainePortrait(ctx, 430, 91, 18);
      R.drawText(ctx, '+' + R.TUNE.healAmount + ' HP', 454, 91, 6, '#d7f8ff');
    }
    if (scene.boss && !scene.boss.dead) {
      R.drawPanel(ctx, 142, big ? 83 : 73, 356, 35);
      R.drawText(ctx, scene.level.boss, 320, big ? 94 : 84, 7, '#f6ddb0', 'center');
      bar(ctx, 160, big ? 104 : 94, 320, 7, scene.boss.hp / scene.boss.hpMax, '#b94147', '#331f26');
    }
    if (scene.warningTimer > 0) R.drawText(ctx, scene.warning, 320, 122, 8, '#ffe67a', 'center');
    if (scene.fog && scene.levelIndex === 2) {
      const phase = scene.fog.age % 8;
      if (phase < 6.4) {
        const line = scene.fog.active ? 'MASHADAR: CHANGE LANE OR JUMP' : 'MASHADAR IS GATHERING';
        const y = scene.warningTimer > 0 ? 134 : 122;
        R.drawText(ctx, line, 320, y, 6, '#eee7ff', 'center');
      }
    }
    if (scene.goTimer > 0 && (!scene.marching || Math.floor((scene.time || 0) * 8) % 2 === 0)) R.drawText(ctx, 'GO  →', 562, 174, 12, '#fff2a0', 'center');
    if (scene.tutorial) { R.drawPanel(ctx, 125, 304, 390, 18); R.drawText(ctx, R.input.fillKeys(scene.tutorial), 320, 315, 6, '#ffffff', 'center'); }
  }
  R.drawHUD = function (ctx, scene) {
    const player = scene.player;
    const rs = (R.display && R.display.renderScale) || 1;
    const bw = Math.max(1, Math.ceil(640 * rs)), bh = Math.max(1, Math.ceil(360 * rs));
    const barWidth=R.settings.data.bigHud?150:128;
    const hpPixels=Math.round(barWidth*player.hp/player.hpMax*rs),powerPixels=Math.round(barWidth*player.power/player.powerMax*rs);
    const bossPixels=scene.boss&&!scene.boss.dead?Math.round(320*scene.boss.hp/scene.boss.hpMax*rs):-1;
    const goVisible=scene.goTimer>0&&(!scene.marching||Math.floor((scene.time||0)*8)%2===0);
    const key = [
      bw, Math.ceil(player.hp), hpPixels, powerPixels, player.lives, player.score, player.loialReady ? 1 : 0,
      Math.min(6,scene.wave+1), scene.levelIndex, (scene.level&&(scene.level.banner||scene.level.name))||'', scene.level&&scene.level.boss, bossPixels, player.angreal > 0 ? player.angreal.toFixed(1) : '',
      player.healPortrait > 0 ? 1 : 0, scene.warningTimer > 0 ? scene.warning : '', goVisible ? 1 : 0,
      scene.tutorial ? R.input.fillKeys(scene.tutorial) : '', R.settings.data.bigHud ? 1 : 0, R.settings.data.colorblind ? 1 : 0,
      player.taintAge > R.TUNE.taintGrace ? 1 : 0,
      scene.fog && scene.levelIndex === 2 ? ((scene.fog.age % 8) < 6.4 ? (scene.fog.active ? 'move' : 'gather') + (scene.warningTimer > 0 ? '@134' : '@122') : '') : ''
    ].join('|');
    if (!hudLayer.canvas) hudLayer.canvas = document.createElement('canvas');
    const sizeChanged = hudLayer.canvas.width !== bw || hudLayer.canvas.height !== bh;
    if (sizeChanged) {
      hudLayer.canvas.width = bw;
      hudLayer.canvas.height = bh;
    }
    if (hudLayer.key !== key || sizeChanged) {
      const g = hudLayer.canvas.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, bw, bh);
      g.setTransform(rs, 0, 0, rs, 0, 0);
      paintHud(g, scene);
      hudLayer.key = key;
      R.HUDStats.paints++;
    } else R.HUDStats.hits++;
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    const top = scene.tutorial ? 340 : (scene.goTimer > 0 ? 200 : 150);
    ctx.drawImage(hudLayer.canvas, 0, 0, bw, Math.ceil(top * rs), 0, 0, 640, top);
    ctx.imageSmoothingEnabled = smooth;
  };
}());
