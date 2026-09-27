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
  const sized = new Map();
  const overlays = new Map();
  const sliceCache = new Map();
  // One quilted floor loop spans ~1.7 screens, so no floor landmark repeats inside a view.
  const FLOOR_LOOP=1100;
  const K_FAR=0.08,K_MID=0.40,K_NEAR=1.15;
  const MID_HEIGHTS=[260,256,252,248,222];
  // Slice cuts measured in headless Chromium: each seed ±40px, the column in
  // rows 0..0.75h with the fewest pixels of alpha>32. Image widths are the
  // painted plates. plateW is the live on-screen scale (never a zoomed crop).
  const MID_SRC={
    1:{key:'stage1-mid',imgW:1672,plateW:720,cuts:[0,550,903,1672]},
    2:{key:'stage2-mid',imgW:1774,plateW:700,cuts:[0,352,762,1398,1774]},
    3:{key:'stage3-mid',imgW:1774,plateW:700,cuts:[0,422,1065,1774]},
    4:{key:'stage4-mid',imgW:2172,plateW:700,cuts:[0,697,1460,2172]},
    5:{key:'stage5-mid',imgW:2172,plateW:700,cuts:[0,546,1344,2172]}
  };
  // Mid strips are slices of each stage's own plate. Cuts were measured once
  // in headless Chromium (seed ±40px, fewest alpha>32 pixels in rows 0..0.75h).
  function seamlessPlate(key, topFeather) {
    const img = R.assets.get(key);
    if (!img) return null;
    const id=key+':'+!!topFeather;if(seamless.has(id))return seamless.get(id);
    // floorN-loop plates are pre-quilted offline, so they wrap with no dissolve.
    const start=0,end=img.width,sourceWidth=end-start;
    const overlap=0 /* floors are pre-quilted; nothing is dissolved or mirrored */,step=sourceWidth-overlap;
    const c=document.createElement('canvas');c.width=step;c.height=img.height;
    const g=c.getContext('2d');g.drawImage(img,start,0,step,img.height,0,0,step,img.height);
    if(topFeather){g.globalCompositeOperation='destination-in';const feather=/^floor/.test(key)?Math.round(img.height*24/138):Math.min(24,img.height),v=g.createLinearGradient(0,0,0,feather);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,1)');g.fillStyle=v;g.fillRect(0,0,c.width,img.height);}
    c.loopKind='painted';seamless.set(id,c);return c;
  }
  function sizedPlate(key,image,w,h){
    if(!image)return null;const id=key+':'+Math.round(w)+':'+Math.round(h);if(sized.has(id))return sized.get(id);
    const c=document.createElement('canvas');c.width=Math.ceil(w*2);c.height=Math.ceil(h*2);const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(image,0,0,c.width,c.height);sized.set(id,c);return c;
  }
  function overlay(key,paint){if(overlays.has(key))return overlays.get(key);const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');g.scale(2,2);paint(g);overlays.set(key,c);return c;}
  function levelSpan(scene){return (scene&&scene.level&&scene.level.length)||(R.SCROLL&&R.SCROLL.length)||4240;}
  function travelOf(scene){return Math.max(1,levelSpan(scene)-640);}
  function rsNow(){return (R.display&&R.display.renderScale)||1;}
  function noteScrollAlpha(ctx){if(ctx.globalAlpha<1)R.StageWorld.lowAlphaDraws++;}
  function sliceList(n){
    const spec=MID_SRC[n],slices=[];
    for(let i=0;i<spec.cuts.length-1;i++)slices.push({id:'ABCDEF'[i],x0:spec.cuts[i],x1:spec.cuts[i+1]});
    return slices;
  }
  function midStrips(n){
    const slices=sliceList(n);
    return {k:K_MID,pools:[slices,slices,slices]};
  }
  const layoutCache=new Map();
  function midLayout(n,travel){
    const id=n+':'+travel,cached=layoutCache.get(id);if(cached)return cached;
    const spec=MID_SRC[n],slices=sliceList(n),M=640+K_MID*travel,pieces=[],lastEnd={},planned=[];
    let nx=0;
    for(const s of slices){
      const w=(s.x1-s.x0)/spec.imgW*spec.plateW;
      pieces.push({id:s.id,x:nx,w,x0:s.x0,x1:s.x1,full:false,native:true});
      nx+=w;lastEnd[s.id]=nx;
    }
    // The native slices reconstruct the plate from x=0, so the first screen matches live.
    const plateW=nx;
    const strips=midStrips(n);
    let cursor=plateW,guard=0,cycle=0;
    while(cursor<M&&guard++<40){
      const pool=Math.min(2,Math.floor(Math.max(0,cursor)/(M/3)));
      const s=strips.pools[pool][cycle++%strips.pools[pool].length];
      const w=(s.x1-s.x0)/spec.imgW*spec.plateW;
      const minGap=cursor+48,separated=(lastEnd[s.id]||0)+640;
      const x=Math.max(minGap,separated);
      if(x-cursor>110)planned.push([cursor,x]);
      pieces.push({id:s.id,x,w,x0:s.x0,x1:s.x1,full:false,native:false,pool});
      lastEnd[s.id]=x+w;cursor=x+w;
    }
    const layout={M,plateW,k:K_MID,pieces,planned,pools:3};
    layoutCache.set(id,layout);return layout;
  }
  function evictStage(n){
    const keep='stage'+n+'-',floorKeep='floor'+n;
    for(const id of [...sized.keys()]){
      const s=String(id);
      if(s.startsWith('stage')&&!s.startsWith(keep))sized.delete(id);
      else if(s.startsWith('floor')&&!s.startsWith(floorKeep)&&!s.startsWith('floor-roof'))sized.delete(id);
    }
    for(const id of [...sliceCache.keys()])if(!String(id).startsWith(keep))sliceCache.delete(id);
    for(const id of [...seamless.keys()]){
      const s=String(id);
      if(s.startsWith('floor')&&!s.startsWith(floorKeep)&&!s.startsWith('floor-roof'))seamless.delete(id);
    }
  }
  function roofing(scene){return !!(scene&&scene.levelIndex===4&&(scene.wave===5||scene.roofOn));}
  function farGeom(scene,cam){
    const travel=travelOf(scene),farW=640+K_FAR*travel,roof=roofing(scene);
    const x=roof?-(farW-640)/2:-cam*K_FAR;
    return {farW,x,right:x+farW,travel,roof};
  }
  function displayPlate(key,logicalW,logicalH){
    const img=R.assets.get(key);if(!img)return null;
    const rs=rsNow(),id=key+'@'+rs+':'+Math.round(logicalW)+'x'+Math.round(logicalH);
    if(sized.has(id))return sized.get(id);
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.ceil(logicalW*rs));c.height=Math.max(1,Math.ceil(logicalH*rs));
    const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(img,0,0,c.width,c.height);sized.set(id,c);return c;
  }
  function bakedSlice(spec,slice,drawH){
    const rs=rsNow(),id=spec.key+':'+slice.x0+':'+slice.x1+'@'+rs;
    if(sliceCache.has(id))return sliceCache.get(id);
    const plate=displayPlate(spec.key,spec.plateW,drawH);if(!plate)return null;
    const w=(slice.x1-slice.x0)/spec.imgW*spec.plateW;
    const sx=(slice.x0/spec.imgW)*plate.width,sw=((slice.x1-slice.x0)/spec.imgW)*plate.width;
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.ceil(sw));c.height=plate.height;
    const g=c.getContext('2d');
    g.drawImage(plate,sx,0,sw,plate.height,0,0,c.width,c.height);
    const feather=12*rs;
    if(feather>0&&c.width>feather*2){
      g.globalCompositeOperation='destination-in';
      const fade=g.createLinearGradient(0,0,c.width,0);
      const a=Math.min(0.45,feather/c.width),b=Math.max(0.55,1-feather/c.width);
      if(slice.x0>0){fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(a,'#000');}
      else fade.addColorStop(0,'#000');
      if(slice.x1<spec.imgW){fade.addColorStop(b,'#000');fade.addColorStop(1,'rgba(0,0,0,0)');}
      else fade.addColorStop(1,'#000');
      g.fillStyle=fade;g.fillRect(0,0,c.width,c.height);
    }
    sliceCache.set(id,c);return c;
  }
  function bakedNear(key){
    const img=R.assets.get(key);if(!img)return null;
    const plateW=700,drawH=plateW*img.height/img.width,rs=rsNow();
    const id=key+':near@'+rs;
    if(sliceCache.has(id))return sliceCache.get(id);
    const plate=displayPlate(key,plateW,drawH);if(!plate)return null;
    const c=document.createElement('canvas');c.width=plate.width;c.height=plate.height;
    const g=c.getContext('2d');g.drawImage(plate,0,0);
    const feather=16*rs;
    if(feather>0&&c.width>feather*2){
      // destination-in keeps pixels only where this fill is opaque, so the
      // gradient has to cover the whole plate or the unfilled span is cleared.
      g.globalCompositeOperation='destination-in';
      const fade=g.createLinearGradient(0,0,c.width,0);
      const b=1-feather/c.width;
      fade.addColorStop(0,'#000');fade.addColorStop(b,'#000');fade.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=fade;g.fillRect(0,0,c.width,c.height);
      g.globalCompositeOperation='source-over';
    }
    c.logicalW=plateW;c.logicalH=drawH;sliceCache.set(id,c);return c;
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
    lowAlphaDraws:0,
    K_FAR,K_MID,K_NEAR,
    travelOf,midLayout,midStrips,
    farRight(scene,cam){return farGeom(scene,cam==null?(scene.camera&&scene.camera.x)||0:cam).right;},
    prepare(level){
      if(!R.assets.has('stage'+(level+1)+'-far'))return;
      const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');g.scale(2,2);
      const scene={levelIndex:level,camera:{x:0},time:0,wave:0,level:{length:(R.SCROLL&&R.SCROLL.length)||4240}};
      try{this.draw(g,scene);this.near(g,scene);this.grade(g,scene);if(level===4){scene.wave=5;scene.roofOn=true;this.draw(g,scene);this.near(g,scene);}}
      finally{sized.clear();sliceCache.clear();evictStage(9);}
    },
    draw(ctx, scene) {
      const n = scene.levelIndex + 1;
      // One view per parallax group, painted at the rounded camera. The blit
      // shifts by the factor this layer actually used, times (round - camera).
      if(!this._painting && R.assets.has('stage'+n+'-far')){
        const rs=R.display.renderScale||1,camExact=scene.camera.x||0,bw=Math.max(1,Math.ceil(640*rs)),bh=Math.max(1,Math.ceil(360*rs)),roundCam=Math.round(camExact);
        if(this._stageKept!==n){evictStage(n);this._stageKept=n;}
        const views=this._views||(this._views={});
        const roof=roofing(scene)?1:0;
        const layers=[
          {id:'base',k:0},
          {id:'back',k:K_FAR},
          {id:'mid',k:K_MID},
          {id:'floor',k:1},
          {id:'screen',k:0}
        ];
        for(const layer of layers){
          let cam=roundCam;
          const key=layer.id==='base'?n+':'+bw+':base':layer.id==='screen'?n+':'+bw+':screen':n+':'+roundCam+':'+bw+':'+roof+':'+layer.id;
          const slot=views[layer.id]||(views[layer.id]={key:'',canvas:document.createElement('canvas')});
          if(!slot.ctx)slot.ctx=slot.canvas.getContext('2d',{alpha:layer.id!=='base'});
          const sizeChanged=slot.canvas.width!==bw||slot.canvas.height!==bh;
          if(slot.key!==key||sizeChanged){
            if(sizeChanged){slot.canvas.width=bw;slot.canvas.height=bh;}
            const g=slot.ctx;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,bw,bh);
            g.setTransform(rs,0,0,rs,0,0);g.imageSmoothingEnabled=true;g.globalAlpha=1;g.globalCompositeOperation='source-over';
            const prev=scene.camera.x;scene.camera.x=cam;this._painting=true;this._layer=layer.id;this._layerFactor=null;
            try{this.draw(g,scene);if(layer.id==='base')bakeGrade(g,scene);if(layer.id==='screen')blitVignette(g);}finally{this._painting=false;this._layer=null;scene.camera.x=prev;}
            slot.key=key;slot.k=this._layerFactor==null?layer.k:this._layerFactor;slot.painted=cam;
          }
          const shift=slot.k*(cam-camExact),smooth=ctx.imageSmoothingEnabled,quality=ctx.imageSmoothingQuality;
          ctx.imageSmoothingEnabled=shift!==0;
          if(shift!==0)ctx.imageSmoothingQuality='low';
          ctx.drawImage(slot.canvas,shift,0,640,360);
          if(shift>0)ctx.drawImage(slot.canvas,0,0,1,slot.canvas.height,0,0,shift,360);
          else if(shift<0)ctx.drawImage(slot.canvas,slot.canvas.width-1,0,1,slot.canvas.height,640+shift,0,-shift,360);
          ctx.imageSmoothingQuality=quality;
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
      else if (show('base')) {
        const sky = ctx.createLinearGradient(0, 0, 0, 230);
        sky.addColorStop(0, pal[0]);
        sky.addColorStop(1, pal[1]);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, 640, 360);
      }
      if(show('back')){
        const roof=roofing(scene);
        const farKey=roof?'stage5-roof-far':'stage'+n+'-far';
        const img=R.assets.get(farKey);
        if(!img){
          ctx.fillStyle = pal[3];
          for (let i = 0; i < 16; i++) {
            const x = i * 60 - ((cam * K_FAR) % 60),
              h = 40 + ((i * 37) % 80);
            ctx.fillRect(x, 215 - h, 46, h);
          }
        }else{
          const travel=travelOf(scene);
          const farW=640+K_FAR*travel;
          if(farW-640<K_FAR*travel)throw new Error('far plate ends inside the view');
          const drawH=farW*img.height/img.width,drawY=-0.376*drawH;
          const x=roof?-(farW-640)/2:-cam*K_FAR;
          const plate=displayPlate(farKey,farW,drawH);
          noteScrollAlpha(ctx);
          if(plate)ctx.drawImage(plate,x,drawY,farW,drawH);
        }
        let factor=K_FAR;
        R.StageWorld._layerFactor=factor;
      }
      if(show('mid')){
        if(!roofing(scene)){
          const spec=MID_SRC[n],img=spec&&R.assets.get(spec.key);
          if(img){
            const travel=travelOf(scene),layout=midLayout(n,travel);
            const drawH=spec.plateW*img.height/img.width,drawY=10+MID_HEIGHTS[n-1]-drawH;
            const viewL=cam*K_MID-80,viewR=cam*K_MID+720;
            const plate=displayPlate(spec.key,spec.plateW,drawH);
            if(plate&&layout.plateW>viewL&&0<viewR){noteScrollAlpha(ctx);ctx.drawImage(plate,-cam*K_MID,drawY,spec.plateW,drawH);}
            for(const piece of layout.pieces){
              if(piece.native||piece.x+piece.w<viewL||piece.x>viewR)continue;
              const slice=bakedSlice(spec,piece,drawH);
              if(!slice)continue;
              noteScrollAlpha(ctx);
              ctx.drawImage(slice,piece.x-cam*K_MID,drawY,piece.w,drawH);
            }
          }else if(n>1)architecture(ctx,n-1,cam,time);
          else R.Stage1.layers.mid(ctx,cam);
          haze(ctx,20);
        }
        let factor=K_MID;
        R.StageWorld._layerFactor=factor;
      }
      if(show('floor')){
      const roof=roofing(scene);
      const floorKey=roof?'floor-roof':'floor'+n;
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
      let factor=1;
      R.StageWorld._layerFactor=factor;
      }
      if(show('screen')){ctx.drawImage(overlay('light:'+n,g=>{
        const depth=g.createLinearGradient(0,218,0,360);depth.addColorStop(0,'#080f254d');depth.addColorStop(.22,'#0d172208');depth.addColorStop(1,'#0c112346');g.fillStyle=depth;g.fillRect(0,218,640,142);
        const light=['#9bcfff','#ffdca0','#a99aff','#ffe8b0','#9ac2ff'][n-1],glow=g.createRadialGradient(440,100,10,440,100,310);glow.addColorStop(0,light+'28');glow.addColorStop(1,light+'00');g.fillStyle=glow;g.fillRect(0,0,640,360);
      }),0,0,640,360);}
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
      const baked=bakedNear('stage'+n+'-near');
      const cam=scene.camera.x||0;
      if(baked){
        const step=700-16,shift=((cam*K_NEAR)%step+step)%step,y=360-baked.logicalH,xs=[];
        for(let x=-shift;x<640;x+=step)xs.push(x);
        for(let i=xs.length-1;i>=0;i--)ctx.drawImage(baked,xs[i],y,700,baked.logicalH);
      }
      ctx.restore();
      if (baked || n === 1) return;
      ctx.fillStyle = PALETTES[n - 1][2];
      for (let i = 0; i < 9; i++) {
        const x = i * 105 - ((cam * K_NEAR) % 105);
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
