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
  const seamless = new Map();
  const strips = new Map();
  const CAMERA_RANGE=2360;
  // One quilted floor loop spans ~1.7 screens, so no floor landmark repeats inside a view.
  const FLOOR_LOOP=1100;
  // Stages 2-5 mid/near plates: one full-width painting per view (no second copy,
  // so no landmark ever appears twice on screen and no internal join exists).
  const SINGLE_WIDE=/^stage[2-5]-(?:mid|near)$/;
  const LOOP_CROPS={
    'stage1-mid':[196,1492],'stage1-near':[194,1623],
    'stage2-mid':[306,1472],'stage2-near':[544,1417],
    'stage3-mid':[430,1614],'stage3-near':[461,1468],
    'stage4-mid':[564,1547],'stage4-near':[520,1398],
    'stage5-mid':[380,1656],'stage5-near':[608,1524],
  };
  // Crop at measured matching columns. Opaque layers use only a narrow 6%
  // dissolve; transparent middle plates instead reveal the far plate through
  // a 10% feather at either side of the join.
  function seamlessPlate(key, topFeather) {
    const img = R.assets.get(key);
    if (!img) return null;
    const id=key+':'+!!topFeather;if(seamless.has(id))return seamless.get(id);
    // floorN-loop plates are pre-quilted offline (min-error cut through a 260px
    // overlap), so they wrap with no dissolve at all. SINGLE_WIDE plates are
    // drawn once, full source width, and never wrap inside the camera range.
    const prelooped=/^floor/.test(key)||SINGLE_WIDE.test(key),crop=prelooped?[0,img.width]:LOOP_CROPS[key]||[0,img.width-44],start=crop[0],end=Math.min(img.width,crop[1]),sourceWidth=end-start;
    // The measured loop columns are dissolved into one another.  The resulting
    // plate is still a single painting (never a flipped/ghosted second pass).
    const overlap=0 /* every non-floor plate is drawn as a single copy; floors are pre-quilted */,step=sourceWidth-overlap;
    const c=document.createElement('canvas');c.width=step;c.height=img.height;
    const g=c.getContext('2d');g.drawImage(img,start,0,step,img.height,0,0,step,img.height);
    if(overlap){
      g.drawImage(img,end-overlap,0,overlap,img.height,step-overlap,0,overlap,img.height);
      const temp=document.createElement('canvas');temp.width=overlap;temp.height=img.height;const t=temp.getContext('2d');
      t.drawImage(img,start,0,overlap,img.height,0,0,overlap,img.height);t.globalCompositeOperation='destination-in';const fade=t.createLinearGradient(0,0,overlap,0);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'#000');t.fillStyle=fade;t.fillRect(0,0,overlap,img.height);g.drawImage(temp,step-overlap,0);
    }
    if(topFeather){g.globalCompositeOperation='destination-in';const feather=/^floor/.test(key)?Math.round(img.height*24/138):Math.min(24,img.height),v=g.createLinearGradient(0,0,0,feather);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,1)');g.fillStyle=v;g.fillRect(0,0,c.width,img.height);}
    c.loopKind='painted';seamless.set(id,c);return c;
  }
  const sized=new Map(),overlays=new Map();
  function sizedPlate(key,image,w,h){
    if(!image)return null;const id=key+':'+Math.round(w)+':'+Math.round(h);if(sized.has(id))return sized.get(id);
    const c=document.createElement('canvas');c.width=Math.ceil(w*2);c.height=Math.ceil(h*2);const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(image,0,0,c.width,c.height);sized.set(id,c);return c;
  }
  function overlay(key,paint){if(overlays.has(key))return overlays.get(key);const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');g.scale(2,2);paint(g);overlays.set(key,c);return c;}
  function tiled(ctx, key, cam, factor, y, h, topFeather=false, mistColor='#c9d7df') {
    const tile = seamlessPlate(key,topFeather);
    if (!tile) return false;
    // Stage 1 uses a 720-unit, bottom-anchored plate, so its inn cannot repeat
    // inside one 640-unit view. Far skies use one wide copy and tiny capped
    // parallax; other stages retain their measured non-mirrored loop crops.
    const stage1Wide=/^stage1-(?:mid|near)$/.test(key),far=/^stage\d-(?:roof-)?far$/.test(key);
    const targetWidth=stage1Wide?720:far?700:SINGLE_WIDE.test(key)?700:0;
    const drawH=targetWidth?targetWidth*tile.height/tile.width:Math.max(h,320*tile.height/tile.width),tileWidth=targetWidth||drawH*tile.width/tile.height,copies=tileWidth<640?2:1,width=tileWidth*copies,drawY=y+h-drawH;
    let plate=tile;
    if(copies===2){const id=key+':'+!!topFeather+':strip';plate=strips.get(id);if(!plate){plate=document.createElement('canvas');plate.width=tile.width*2;plate.height=tile.height;const pg=plate.getContext('2d');pg.drawImage(tile,0,0);pg.drawImage(tile,tile.width,0);strips.set(id,plate);}}
    plate=sizedPlate(key+':'+!!topFeather,plate,width,drawH);
    factor=Math.min(factor,Math.max(0,(width-640)/CAMERA_RANGE));
    if(R.StageWorld&&R.StageWorld._layer)R.StageWorld._layerFactor=factor;
    const offset=cam*factor;
    for(let stripX=-offset;stripX<640;stripX+=width){
      ctx.drawImage(plate,stripX,drawY,width,drawH);
      // Only the internal continuation can enter the viewport; soften it once.
      if(copies===2){const join=stripX+tileWidth,band=Math.min(28,tileWidth*.035),m=ctx.createLinearGradient(join-band,0,join+band,0);m.addColorStop(0,mistColor+'00');m.addColorStop(.5,mistColor+'28');m.addColorStop(1,mistColor+'00');ctx.fillStyle=m;ctx.fillRect(join-band,drawY,band*2,drawH);}
    }
    return true;
  }
  function haze(ctx,y,color='#c9d7df') {ctx.drawImage(overlay('haze:'+y+color,g=>{const f=g.createLinearGradient(0,y-9,0,y+12);f.addColorStop(0,color+'00');f.addColorStop(.5,color+'24');f.addColorStop(1,color+'00');g.fillStyle=f;g.fillRect(0,y-9,640,21);}),0,0,640,360);}
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
  function bakeGrade(ctx, scene) {
    const colors = ['#73a7e6', '#ffb65a', '#a087ed', '#f0cd89', '#7d9cde'];
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = colors[scene.levelIndex] || colors[0];
    ctx.globalAlpha = 0.13;
    ctx.fillRect(0, 0, 640, 360);
    ctx.restore();
  }
  function blitVignette(ctx) {
    ctx.drawImage(overlay('vignette', g => {
      const v = g.createRadialGradient(320, 220, 145, 320, 210, 410);
      v.addColorStop(0, '#050c2000');
      v.addColorStop(1, '#050c2050');
      g.fillStyle = v;
      g.fillRect(0, 0, 640, 360);
    }), 0, 0, 640, 360);
  }
  function strokeLightning(ctx) {
    ctx.strokeStyle = '#bccfed';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(500, 0);
    ctx.lineTo(472, 60);
    ctx.lineTo(495, 56);
    ctx.lineTo(465, 110);
    ctx.stroke();
  }
  R.StageWorld = {
    prepare(level){
      if(!R.assets.has('stage'+(level+1)+'-far'))return;
      const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');g.scale(2,2);const scene={levelIndex:level,camera:{x:0},time:0,wave:0};this.draw(g,scene);this.near(g,scene);this.grade(g,scene);if(level===4){scene.wave=5;this.draw(g,scene);}
    },
    draw(ctx, scene) {
      const n = scene.levelIndex + 1;
      // Stage 1's alpha plates plus the saved world layer were a synchronous
      // ~9ms composite on software canvas. Reuse one view per parallax group
      // while the camera sits on the same pixel. Each group is blitted by the
      // factor tiled() actually applied (capped to the plate's spare width),
      // times (round(camera) - camera). The nominal 0.10/0.42 would sawtooth
      // a plate that can barely scroll.
      if(!this._painting && R.assets.has('stage'+n+'-far')){
        const rs=R.display.renderScale||1,camExact=scene.camera.x||0,cam=Math.round(camExact),bw=Math.max(1,Math.ceil(640*rs)),bh=Math.max(1,Math.ceil(360*rs));
        const views=this._views||(this._views={});
        const layers=[
          {id:'base',k:0},
          {id:'back',k:0.10},
          {id:'mid',k:0.42},
          {id:'floor',k:1},
          {id:'screen',k:0}
        ];
        for(const layer of layers){
          const key=n+':'+cam+':'+bw+':'+(scene.wave===5?1:0)+':'+layer.id;
          const slot=views[layer.id]||(views[layer.id]={key:'',canvas:document.createElement('canvas')});
          if(!slot.ctx)slot.ctx=slot.canvas.getContext('2d',{alpha:layer.id!=='base'});
          const sizeChanged=slot.canvas.width!==bw||slot.canvas.height!==bh;
          if(slot.key!==key||sizeChanged){
            if(sizeChanged){slot.canvas.width=bw;slot.canvas.height=bh;}
            const g=slot.ctx;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,bw,bh);
            g.setTransform(rs,0,0,rs,0,0);g.imageSmoothingEnabled=true;g.globalAlpha=1;g.globalCompositeOperation='source-over';
            const prev=scene.camera.x;scene.camera.x=cam;this._painting=true;this._layer=layer.id;this._layerFactor=null;
            try{this.draw(g,scene);if(layer.id==='base')bakeGrade(g,scene);if(layer.id==='screen')blitVignette(g);}finally{this._painting=false;this._layer=null;scene.camera.x=prev;}
            slot.key=key;slot.k=this._layerFactor==null?layer.k:this._layerFactor;
          }
          const shift=slot.k*(cam-camExact),smooth=ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled=shift!==0;
          ctx.drawImage(slot.canvas,shift,0,640,360);
          if(shift>0)ctx.drawImage(slot.canvas,0,0,1,slot.canvas.height,0,0,shift,360);
          else if(shift<0)ctx.drawImage(slot.canvas,slot.canvas.width-1,0,1,slot.canvas.height,640+shift,0,-shift,360);
          ctx.imageSmoothingEnabled=smooth;
        }
        if(n===5&&Math.sin((scene.time||0)*0.8)>0.995)strokeLightning(ctx);
        return;
      }
      const cam = scene.camera.x,
        time = scene.time;
      const layer=this._layer,show=id=>!layer||layer===id;
      const stagePalette=PALETTES[n - 1] || ['#142b45','#6689a3','#8b9daf','#253443'];
      const pal = stagePalette;
      if (n === 1 && !R.assets.has('stage1-far')) { if(show('base')) R.Stage1.draw(ctx, cam, time); }
      else if (show('base') || show('back')) {
        if(show('base')){
          const sky = ctx.createLinearGradient(0, 0, 0, 230);
          sky.addColorStop(0, pal[0]);
          sky.addColorStop(1, pal[1]);
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, 640, 360);
        }
        if(show('back')){
          ctx.fillStyle = pal[3];
          for (let i = 0; i < 16; i++) {
            const x = i * 60 - ((cam * 0.08) % 60),
              h = 40 + ((i * 37) % 80);
            ctx.fillRect(x, 215 - h, 46, h);
          }
        }
      }
      const roof = n === 5 && scene.wave === 5;
      if(show('back'))tiled(ctx, roof ? 'stage5-roof-far' : 'stage' + n + '-far', cam, 0.10, 0, 244);
      const midHeights=[260,256,252,248,222];
      if(show('mid')){
        if (!roof && !tiled(ctx, 'stage' + n + '-mid', cam, 0.42, 10, midHeights[n-1], true,stagePalette[1])) { if(n>1)architecture(ctx,n-1,cam,time);else R.Stage1.layers.mid(ctx,cam); }
        if(!roof)haze(ctx,20);
      }
      const floorKey=roof ? 'floor-roof' : 'floor' + n;
      if(show('floor')){
      if (n > 1 && !R.assets.has(floorKey)) {
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
      const floor = sizedPlate(floorKey,seamlessPlate(floorKey,true),FLOOR_LOOP,138);
      if (floor){const fw=FLOOR_LOOP;const off=((cam%fw)+fw)%fw;for(let x=-off;x<640;x+=fw)ctx.drawImage(floor,x,222,fw,138);haze(ctx,224,roof?'#aebbd0':'#b8c1c6');}
      else if(n===1)R.Stage1.layers.floor(ctx,cam);
      }
      if(show('screen'))ctx.drawImage(overlay('light:'+n,g=>{
        const depth=g.createLinearGradient(0,218,0,360);depth.addColorStop(0,'#080f254d');depth.addColorStop(.22,'#0d172208');depth.addColorStop(1,'#0c112346');g.fillStyle=depth;g.fillRect(0,218,640,142);
        const light=['#9bcfff','#ffdca0','#a99aff','#ffe8b0','#9ac2ff'][n-1],glow=g.createRadialGradient(440,100,10,440,100,310);glow.addColorStop(0,light+'28');glow.addColorStop(1,light+'00');g.fillStyle=glow;g.fillRect(0,0,640,360);
      }),0,0,640,360);
      if (n === 5 && !this._painting && Math.sin(time * 0.8) > 0.995) strokeLightning(ctx);
    },
    grade(ctx,scene){
      const n=scene.levelIndex+1;
      // Painted stages bake soft-light and the vignette into the opaque view.
      // A live full-frame blend was a SwiftShader present stall.
      if(R.assets.has('stage'+n+'-far'))return;
      bakeGrade(ctx,scene);
      blitVignette(ctx);
    },
    near(ctx, scene) {
      const n = scene.levelIndex + 1;
      // Confine dense delivered foreground props to the bottom 26px; every lane
      // and attack tell remains visible, even on the lowest playable lane.
      ctx.save();ctx.beginPath();ctx.rect(0,334,640,26);ctx.clip();
      const painted=tiled(ctx, 'stage' + n + '-near', scene.camera.x, 1.12, 202, 158, true);ctx.restore();
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
      // Soft, drifting ground mist instead of a dashed debug box. The lane edges
      // stay readable as faint glowing seams on the ground.
      ctx.save();
      const rise = this.active ? Math.min(1, (phase - 1.6) / .6) : .35;
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 16; i++) {
        const x = i * 44 + Math.sin(this.age * .7 + i * 1.7) * 26, y = this.lane + Math.sin(this.age + i) * 6, rx = 58 + (i % 3) * 12;
        ctx.globalAlpha=.20*rise;ctx.drawImage(R.effects.glow('#c4b6ec'),x-rx,y-20,rx*2,40);
      }
      ctx.globalAlpha=1;ctx.globalCompositeOperation = 'source-over';
      const edge = ctx.createLinearGradient(0, 0, 640, 0); edge.addColorStop(0, 'rgba(230,220,255,0)'); edge.addColorStop(.5, `rgba(230,220,255,${.28 + .2 * rise})`); edge.addColorStop(1, 'rgba(230,220,255,0)');
      ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -this.age * 12;
      ctx.beginPath(); ctx.moveTo(0, this.lane + 22); ctx.lineTo(640, this.lane + 22); ctx.moveTo(0, this.lane - 22); ctx.lineTo(640, this.lane - 22); ctx.stroke();
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
