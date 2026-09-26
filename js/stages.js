'use strict';
(function () {
  const R = window.RWB;
  const PALETTES = [
    null,
    ['#653c5d', '#f5b17d', '#bf9f87', '#574653'],
    ['#100e29', '#64577e', '#444052', '#292735'],
    ['#163850', '#d5b879', '#697985', '#27353f'],
    ['#101628', '#5b6882', '#323c52', '#1f293b'],
  ];
  function tiled(ctx, key, cam, factor, y, h) {
    const img = R.assets.get(key);
    if (!img) return false;
    const width = (h * img.width) / img.height;
    const tile=Math.floor(cam*factor/width);
    for (let i=tile,x=tile*width-cam*factor;x<640;x+=width,i++) {ctx.save();ctx.translate(x,y);if(i%2){ctx.translate(width,0);ctx.scale(-1,1);}ctx.drawImage(img,0,0,width,h);ctx.restore();}
    return true;
  }
  function architecture(ctx, level, cam, time) {
    const pal = PALETTES[level],
      offset = cam * 0.55;
    for (let i = Math.floor(offset / 150) - 1; i < Math.floor(offset / 150) + 6; i++) {
      const x = i * 150 - offset;
      if (level === 1) {
        ctx.fillStyle = i % 2 ? '#ddc7a1' : '#c2b598';
        ctx.fillRect(x, 112, 139, 109);
        ctx.fillStyle = '#8e3f45';
        ctx.beginPath();
        ctx.moveTo(x - 8, 112);
        ctx.lineTo(x + 65, 67);
        ctx.lineTo(x + 148, 112);
        ctx.fill();
        ctx.strokeStyle = '#634644';
        ctx.lineWidth = 7;
        ctx.strokeRect(x, 113, 139, 108);
        ctx.beginPath();
        ctx.moveTo(x + 70, 117);
        ctx.lineTo(x + 70, 218);
        ctx.stroke();
        for (let j = 0; j < 3; j++) {
          ctx.fillStyle = '#393a4a';
          ctx.fillRect(x + 13 + j * 42, 138, 20, 27);
        }
        ctx.fillStyle = i % 2 ? '#af394a' : '#ede1c9';
        ctx.fillRect(x + 53, 105, 22, 55);
      } else if (level === 2) {
        ctx.fillStyle = i % 2 ? '#454052' : '#535065';
        ctx.beginPath();
        ctx.moveTo(x, 222);
        ctx.lineTo(x + 8, 94);
        ctx.lineTo(x + 48, 101);
        ctx.lineTo(x + 62, 79);
        ctx.lineTo(x + 99, 96);
        ctx.lineTo(x + 130, 91);
        ctx.lineTo(x + 140, 222);
        ctx.fill();
        ctx.fillStyle = '#18172c';
        ctx.beginPath();
        ctx.arc(x + 68, 166, 26, Math.PI, 0);
        ctx.lineTo(x + 94, 221);
        ctx.lineTo(x + 42, 221);
        ctx.fill();
        ctx.strokeStyle = '#918398';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 19, 103);
        ctx.lineTo(x + 37, 136);
        ctx.lineTo(x + 26, 155);
        ctx.lineTo(x + 35, 180);
        ctx.stroke();
      } else if (level === 3) {
        ctx.fillStyle = '#263a48';
        ctx.fillRect(x, 30, 150, 194);
        ctx.fillStyle = '#b2c3c5';
        ctx.fillRect(x + 8, 25, 28, 199);
        ctx.fillRect(x, 25, 44, 14);
        ctx.fillRect(x, 207, 44, 16);
        ctx.fillStyle = '#385777';
        ctx.fillRect(x + 60, 51, 43, 107);
        ctx.strokeStyle = '#d3b968';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 60, 51, 43, 107);
        ctx.fillStyle = '#ffce66';
        ctx.beginPath();
        ctx.ellipse(x + 132, 150, 5 + Math.sin(time * 6 + i), 11, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#263147';
        ctx.fillRect(x, 181, 145, 42);
        for (let j = 0; j < 4; j++) ctx.fillRect(x + j * 40, 161, 22, 35);
        ctx.strokeStyle = '#111d2d';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x + 68, 218);
        ctx.lineTo(x + 68, 83);
        ctx.stroke();
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.moveTo(x + 68, 87);
        ctx.lineTo(x + 116, 96 + Math.sin(time * 3 + i) * 8);
        ctx.lineTo(x + 111, 145);
        ctx.lineTo(x + 68, 135);
        ctx.fill();
      }
    }
    ctx.fillStyle = pal[3];
    ctx.fillRect(0, 218, 640, 7);
  }
  R.StageWorld = {
    draw(ctx, scene) {
      const n = scene.levelIndex + 1,
        cam = scene.camera.x,
        time = scene.time;
      if (n === 1 && !R.assets.has('stage1-far')) R.Stage1.draw(ctx, cam, time);
      else {
        const pal = PALETTES[n - 1] || ['#142b45','#6689a3','#8b9daf','#253443'],
          sky = ctx.createLinearGradient(0, 0, 0, 230);
        sky.addColorStop(0, pal[0]);
        sky.addColorStop(1, pal[1]);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = pal[3];
        for (let i = 0; i < 16; i++) {
          const x = i * 60 - ((cam * 0.08) % 60),
            h = 40 + ((i * 37) % 80);
          ctx.fillRect(x, 215 - h, 46, h);
        }
      }
      const roof = n === 5 && scene.wave === 5;
      tiled(ctx, roof ? 'stage5-roof-far' : 'stage' + n + '-far', cam, 0.10, 0, 244);
      if (!roof && !tiled(ctx, 'stage' + n + '-mid', cam, 0.42, 10, 222)) { if(n>1)architecture(ctx,n-1,cam,time);else R.Stage1.layers.mid(ctx,cam); }
      if (n > 1) {
        ctx.fillStyle = PALETTES[n - 1][3];
        ctx.fillRect(0, 224, 640, 136);
        ctx.strokeStyle = n === 4 ? '#8d855b' : '#69717b';
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        for (let y = 230; y < 360; y += 24) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(640, y);
          ctx.stroke();
          for (let x = (-cam % 80) + (y % 48 ? 40 : 0); x < 640; x += 80) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 8, y + 24);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
      // Wide floor plates are compressed in depth, not tiled into tiny squares.
      const floor = R.assets.get(roof ? 'floor-roof' : 'floor' + n);
      if (floor) for(let i=Math.floor(cam/640),x=i*640-cam;x<640;x+=640,i++){ctx.save();ctx.translate(x,222);if(i%2){ctx.translate(640,0);ctx.scale(-1,1);}ctx.drawImage(floor,0,0,640,138);ctx.restore();}
      else if(n===1)R.Stage1.layers.floor(ctx,cam);
      const depth=ctx.createLinearGradient(0,218,0,360);
      depth.addColorStop(0,'#080f254d');depth.addColorStop(.22,'#0d172208');depth.addColorStop(1,'#0c112346');ctx.fillStyle=depth;ctx.fillRect(0,218,640,142);
      const light=['#9bcfff','#ffdca0','#a99aff','#ffe8b0','#9ac2ff'][n-1];
      const glow=ctx.createRadialGradient(440,100,10,440,100,310);glow.addColorStop(0,light+'28');glow.addColorStop(1,light+'00');ctx.fillStyle=glow;ctx.fillRect(0,0,640,360);
      if (n === 5 && Math.sin(time * 0.8) > 0.995) {
        ctx.strokeStyle = '#bccfed';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(500, 0);
        ctx.lineTo(472, 60);
        ctx.lineTo(495, 56);
        ctx.lineTo(465, 110);
        ctx.stroke();
      }
    },
    grade(ctx,scene){
      const colors=['#73a7e6','#ffb65a','#a087ed','#f0cd89','#7d9cde'];
      ctx.save();ctx.globalCompositeOperation='soft-light';ctx.fillStyle=colors[scene.levelIndex];ctx.globalAlpha=.13;ctx.fillRect(0,0,640,360);ctx.restore();
      const v=ctx.createRadialGradient(320,220,145,320,210,410);v.addColorStop(0,'#050c2000');v.addColorStop(1,'#050c2050');ctx.fillStyle=v;ctx.fillRect(0,0,640,360);
    },
    near(ctx, scene) {
      const n = scene.levelIndex + 1;
      // Confine dense delivered foreground props to the bottom 26px; every lane
      // and attack tell remains visible, even on the lowest playable lane.
      ctx.save();ctx.beginPath();ctx.rect(0,334,640,26);ctx.clip();
      const painted=tiled(ctx, 'stage' + n + '-near', scene.camera.x, 1.12, 202, 158);ctx.restore();
      if (painted || n === 1) return;
      ctx.fillStyle = PALETTES[n - 1][2];
      for (let i = 0; i < 9; i++) {
        const x = i * 105 - ((scene.camera.x * 1.12) % 105);
        ctx.fillRect(x, 348 + (i % 3), 30 + (i % 4) * 5, 12);
      }
    },
  };
  class Mashadar {
    constructor(g) {
      this.g = g;
      this.age = 0;
      this.life = Infinity;
      this.lane = 246;
      this.tick = 0;
      this.active = false;
      this.drained = 0;
    }
    update(dt) {
      this.age += dt;
      const phase = this.age % 8;
      this.lane = Math.floor(this.age / 8) % 2 ? 296 : 246;
      this.active = phase >= 1.6 && phase < 6.4;
      if (this.active && Math.abs(this.g.player.y - this.lane) < 22 && this.g.player.z < 24) {
        this.tick += dt;
        if (this.tick >= 0.65) {
          this.tick = 0;
          if (
            this.g.hitPlayer(4, this.g.player.x - 1, {
              kb: 0,
              knockdown: false,
              source: 'MASHADAR',
            })
          )
            this.drained += 4;
        }
      } else this.tick = 0;
    }
    draw(ctx) {
      const phase = this.age % 8;
      if (phase >= 6.4) return;
      ctx.save();
      ctx.strokeStyle = '#efe7ff';
      ctx.fillStyle = '#c8bfe2';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(0, this.lane - 22, 640, 44);
      if (this.active) {
        ctx.globalAlpha = 0.32;
        for (let i = 0; i < 13; i++) {
          ctx.beginPath();
          ctx.ellipse(
            i * 60 + Math.sin(this.age + i) * 20,
            this.lane,
            53,
            15 + Math.sin(i + this.age) * 5,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      ctx.restore();
      R.drawText(
        ctx,
        this.active ? 'MASHADAR: CHANGE LANE OR JUMP' : 'MASHADAR IS GATHERING',
        320,
        148,
        6,
        '#eee7ff',
        'center',
      );
    }
  }
  R.Mashadar = Mashadar;
  R.drawTwinkle = function (ctx, x, y, casting, time) {
    if (R.paint(ctx, 'cg-twinkle', x - 28, y - 66, 56, 66)) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#6bc7ff';
    ctx.beginPath();
    ctx.moveTo(-8, -39);
    ctx.lineTo(8, -39);
    ctx.lineTo(19, -5);
    ctx.lineTo(-19, -5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f1c5a6';
    ctx.beginPath();
    ctx.arc(0, -48, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#382b31';
    ctx.beginPath();
    ctx.arc(0, -58, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e1f4ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, -33);
    ctx.lineTo(casting ? 30 : 16, casting ? -40 : -20);
    ctx.moveTo(-8, -33);
    ctx.lineTo(-16, -21);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.sin(i * 3) * 12, -26 + i * 4, 2, 2);
    }
    if (casting) {
      ctx.strokeStyle = '#b9f3ff';
      ctx.beginPath();
      ctx.arc(30, -40, 8 + Math.sin(time * 12) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };
})();
