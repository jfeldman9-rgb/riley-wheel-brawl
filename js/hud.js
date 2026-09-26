'use strict';
(function () {
  const R = window.RWB;
  function bar(ctx, x, y, w, h, ratio, color, back) {
    ctx.fillStyle = back || '#252d38';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(0, w * ratio), h);
    ctx.strokeStyle = '#dce5e9';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }
  function drawRileyPortrait(ctx, x, y) {
    ctx.fillStyle = '#101c2d';
    ctx.beginPath();
    ctx.arc(x, y, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#61c6ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#d6a47f';
    ctx.beginPath();
    ctx.ellipse(x, y - 1, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#17151a';
    ctx.beginPath();
    ctx.arc(x, y - 5, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4eb5ef';
    ctx.strokeRect(x - 8, y - 2, 6, 4);
    ctx.strokeRect(x + 2, y - 2, 6, 4);
  }
  R.drawHUD = function (ctx, scene) {
    const player = scene.player;
    const scale = R.settings.data.bigHud ? 1.16 : 1;
    ctx.save();
    ctx.scale(scale, scale);
    R.drawPanel(ctx, 7, 7, 250, 59);
    drawRileyPortrait(ctx, 31, 36);
    R.drawText(ctx, 'RILEY', 57, 17, 7, '#ffffff');
    const hpColor = R.settings.data.colorblind ? '#28a8ff' : '#e45151';
    bar(ctx, 57, 27, 128, 10, player.hp / player.hpMax, hpColor);
    R.drawText(ctx, 'HP ' + Math.ceil(player.hp), 191, 32, 6, '#ffffff');
    const tainted = player.taintAge > R.TUNE.taintGrace;
    bar(ctx, 57, 44, 128, 8, player.power / player.powerMax, tainted ? '#a05bd3' : '#61cdf2');
    R.drawText(ctx, tainted ? 'TAINT' : 'SAIDIN', 191, 48, 6, tainted ? '#e2b5ff' : '#ffffff');
    R.drawText(ctx, 'LIVES ' + player.lives, 191, 60, 6, '#ffffff');
    ctx.restore();
    R.drawPanel(ctx, 460, 7, 173, 59);
    R.drawText(ctx, 'LOIAL ' + (player.loialReady ? 'READY' : 'SPENT'), 469, 20, 7, player.loialReady ? '#8cf0ae' : '#87909a');
    R.drawText(ctx, 'SCORE ' + String(player.score).padStart(7, '0'), 469, 38, 7, '#ffffff');
    R.drawText(ctx, 'WAVE ' + Math.min(6, scene.wave + 1) + '/6', 469, 54, 6, '#b7cce1');
    if (player.angreal > 0) {
      R.drawPanel(ctx, 235, 75, 170, 24);
      R.drawText(ctx, 'ANGREAL ' + player.angreal.toFixed(1) + 's', 320, 88, 7, '#ffe078', 'center');
    }
    if (player.healPortrait > 0) {
      R.drawMoirainePortrait(ctx, 430, 91, 18);
      R.drawText(ctx, '+' + R.TUNE.healAmount + ' HP', 454, 91, 6, '#d7f8ff');
    }
    if (scene.boss && !scene.boss.dead) {
      R.drawPanel(ctx, 142, 70, 356, 35);
      R.drawText(ctx, 'TROLLOC CHIEFTAIN', 320, 81, 7, '#f6ddb0', 'center');
      bar(ctx, 160, 91, 320, 7, scene.boss.hp / scene.boss.hpMax, '#b94147', '#331f26');
    }
    if (scene.warningTimer > 0) R.drawText(ctx, scene.warning, 320, 122, 8, '#ffe67a', 'center');
    if (scene.goTimer > 0) R.drawText(ctx, 'GO  →', 562, 174, 12, '#fff2a0', 'center');
    if (scene.tutorial) R.drawText(ctx, R.input.fillKeys(scene.tutorial), 320, 332, 7, '#ffffff', 'center');
  };
}());
