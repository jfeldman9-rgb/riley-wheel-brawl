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
  // Finished paintings retain their independent parallax. Camera motion only
  // selects a source rectangle; it never repaints or regrades a stage.
  const backgrounds = new Map();
  const backgroundStats = { builds: 0, composites: 0, hits: 0 };
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
    const tBake=performance.now();
    // floorN-loop plates are pre-quilted offline, so they wrap with no dissolve.
    const start=0,end=img.width,sourceWidth=end-start;
    const overlap=0 /* floors are pre-quilted; nothing is dissolved or mirrored */,step=sourceWidth-overlap;
    const c=document.createElement('canvas');c.width=step;c.height=img.height;
    const g=c.getContext('2d');g.drawImage(img,start,0,step,img.height,0,0,step,img.height);
    if(topFeather){g.globalCompositeOperation='destination-in';const feather=/^floor/.test(key)?Math.round(img.height*24/138):Math.min(24,img.height),v=g.createLinearGradient(0,0,0,feather);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,1)');g.fillStyle=v;g.fillRect(0,0,c.width,img.height);}
    c.loopKind='painted';seamless.set(id,c);if(R.perf&&R.perf.noteBake)R.perf.noteBake('seamlessPlate:'+key,performance.now()-tBake);return c;
  }
  function sizedPlate(key,image,w,h){
    if(!image)return null;const id=key+':'+Math.round(w)+':'+Math.round(h);if(sized.has(id))return sized.get(id);
    const tBake=performance.now();
    const c=document.createElement('canvas');c.width=Math.ceil(w*2);c.height=Math.ceil(h*2);const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(image,0,0,c.width,c.height);sized.set(id,c);
    if(R.perf&&R.perf.noteBake)R.perf.noteBake('sizedPlate:'+key,performance.now()-tBake);return c;
  }
  function overlay(key,paint){if(overlays.has(key))return overlays.get(key);const tBake=performance.now();const c=document.createElement('canvas');c.width=1280;c.height=720;const g=c.getContext('2d');g.scale(2,2);paint(g);overlays.set(key,c);if(R.perf&&R.perf.noteBake)R.perf.noteBake('overlay:'+key,performance.now()-tBake);return c;}
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
  // Whole plates, drawn at the original plate's pixels per unit. Pool 0 is the
  // original plate. S5 reuses that plate whole on the right instead of slicing it.
  const PPU={1:1672/720,2:1774/700,3:1774/700,4:2172/700,5:2172/700};
  const MID_POOL={
    1:[{id:'stage1-mid',key:'stage1-mid',px:1672},{id:'stage1-mid-b',key:'stage1-mid-b',px:2196},{id:'stage1-mid-c',key:'stage1-mid-c',px:1672}],
    2:[{id:'stage2-mid',key:'stage2-mid',px:1774},{id:'stage2-mid-b',key:'stage2-mid-b',px:2070},{id:'stage2-mid-c',key:'stage2-mid-c',px:1774}],
    3:[{id:'stage3-mid',key:'stage3-mid',px:1774},{id:'stage3-mid-b',key:'stage3-mid-b',px:2070},{id:'stage3-mid-c',key:'stage3-mid-c',px:1774}],
    4:[{id:'stage4-mid',key:'stage4-mid',px:2172},{id:'stage4-mid-b',key:'stage4-mid-b',px:2172},{id:'stage4-transition-bc',key:'stage4-transition-bc',px:2172},{id:'stage4-mid-c',key:'stage4-mid-c',px:2400}],
    5:[{id:'stage5-mid',key:'stage5-mid',px:2172},{id:'stage5-transition-ab',key:'stage5-transition-ab',px:2300},{id:'stage5-mid-b',key:'stage5-mid-b',px:2300}]
  };
  const FAR_GRADE={1:'night',5:'black-tower-dusk'};
  const layoutCache=new Map();
  function sliceLayout(n,travel){
    const id='slice:'+n+':'+travel,cached=layoutCache.get(id);if(cached)return cached;
    const spec=MID_SRC[n],slices=sliceList(n),M=640+K_MID*travel,pieces=[],lastEnd={},planned=[];
    let nx=0;
    for(const s of slices){
      const w=(s.x1-s.x0)/spec.imgW*spec.plateW;
      pieces.push({id:s.id,x:nx,w,x0:s.x0,x1:s.x1,full:false,native:true});
      nx+=w;lastEnd[s.id]=nx;
    }
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
    const layout={M,plateW,k:K_MID,pieces,planned,pools:3,mode:'slices'};
    layoutCache.set(id,layout);return layout;
  }
  function midLayout(n,travel){
    const id='plates:'+n+':'+travel,cached=layoutCache.get(id);if(cached)return cached;
    const M=640+K_MID*travel,ppu=PPU[n];
    if(n===4||n===5){
      const px=n===4?3667:4169,key='stage'+n+'-mid-cont',w=px/ppu;
      const piece={id:key,key,x:0,w,px,ramp:0,rampOut:0,fade:0,pool:0,sx0:0,repeat:null,seam:null};
      const layout={M,available:w,shortfall:Math.max(0,M-w),plateW:w,k:K_MID,pieces:[piece],planned:[],pools:1,mode:'continuous',clamp:true,slack:w-M};
      layoutCache.set(id,layout);return layout;
    }
    const items=MID_POOL[n].map(p=>({id:p.id,key:p.key,w:p.px/ppu,px:p.px}));
    // The supplied transition paintings are complete plates. Keep every pixel
    // intact and use hard, vertical overlaps: no ramp, colour match, blur or
    // per-column seam selection is applied to either transition.
    const a=items[0],b=items[1],c=items[2];
    // Stage 4's hall repeats about every 446 source pixels. Two of plate b's
    // own bays are cloned on so the b→c join can sit in plate c's dark niche
    // (source 810–910) instead of on a pillar. Stage 5's palisade gains one
    // quiet span of itself so both joins can overlap by at least 32 units.
    if(n===4){
      b.w+=2*(446/ppu);
      // Plate b's bay is 446 source px. The quiet niche at 562–631 repeats
      // three bays later at 1900–1964. Tiles of that bay overlap on the niche
      // and a min-error cut joins them there, not on a pillar.
      b.repeat={period:446,copies:2,from:562,seam:1900,ov:64};
      const crop=810/ppu;
      c.w-=crop;c.sx0=810;c.sx1=2400;
    }else if(n===5){
      const srcW=2300;
      b.w+=200*(b.w/srcW);
      // One quiet span of the palisade, seamed inside that span (2100 and 900).
      b.repeat={period:200,copies:1,from:900,seam:2100,ov:40};
    }
    const lastX=M-c.w,slack=a.w+b.w+c.w-M;
    let ovL,ovR;
    // Stage 4's right join lands on a pillar, not through two of them. Plate c's
    // first pier is 113 source pixels in; plate b's matching pier is 2084
    // pixels in. ovL ≈ 29 puts those edges on the same world x so the crossfade
    // does not leave a second, half-transparent pillar beside the first.
    if(n===4){ovL=Math.max(32,slack-36);ovR=slack-ovL;}
    else if(n===5){ovL=32;ovR=Math.max(32,slack-32);}
    else if(slack>=80){ovL=40;ovR=slack-40;}
    else ovL=ovR=slack/2;
    const xB=a.w-ovL,rampOf=ov=>n===1?(ov>=48?48:ov>=40?40:32):Math.max(32,Math.min(48,Math.round(ov)));
    const rampL=rampOf(ovL),rampR=rampOf(ovR);
    // Stage 4 and 5 joins are a recorded min-error seam across the real
    // overlap, not an alpha ramp. The seam is the whole overlap.
    let fadeL=Math.min(rampL,ovL),fadeR=Math.min(rampR,ovR);
    const seamed=n===4||n===5;
    if(seamed){fadeL=ovL;fadeR=ovR;}
    const pieceA={id:a.id,key:a.key,x:0,w:a.w,ramp:0,rampOut:seamed||n===1?0:fadeL,fade:0,pool:0,sx0:a.sx0||0,repeat:a.repeat||null};
    const pieceB={id:b.id,key:b.key,x:xB,w:b.w,sx0:b.sx0||0,sx1:b.sx1,repeat:b.repeat||null,ramp:seamed?0:rampL,rampOut:seamed||n===1?0:fadeR,fade:n===1?rampL:fadeL,pool:1,seam:seamed?{overlap:+ovL.toFixed(2),cut:'min-error'}:null};
    const pieceC={id:c.id,key:c.key,x:lastX,w:c.w,sx0:c.sx0||0,sx1:c.sx1,ramp:seamed?0:rampR,rampOut:0,fade:n===1?rampR:fadeR,pool:2,seam:seamed?{overlap:+ovR.toFixed(2),cut:'min-error'}:null};
    const specOf=(piece,ov)=>({key:piece.key,w:piece.w,ramp:piece.ramp||0,rampOut:piece.rampOut||0,ov,sx0:piece.sx0||0,sx1:piece.sx1||null,repeat:piece.repeat||null,seam:piece.seam?1:0});
    // A source-over fade-out under a coincident fade-in only sums to 0.75
    // alpha mid-band, so the far layer bled through both plates. Plate b's
    // fade-out also sat at its own end, 49 units right of plate c's fade-in.
    // b now ends where c's fade-in ends, both ramps cover the same columns, and
    // the incoming plate is added ('lighter') so s + (1-s) = 1: a plain dissolve.
    if(n!==1&&!seamed){
      const end=lastX+fadeR;
      if(end<pieceB.x+pieceB.w){pieceB.sx1=(end-pieceB.x)*ppu;pieceB.w=end-pieceB.x;}
      pieceB.dissolve=true;pieceC.dissolve=true;
      pieceB.under=specOf(pieceA,fadeL);pieceC.under=specOf(pieceB,fadeR);
    }else if(n!==1){pieceB.under=specOf(pieceA,ovL);pieceC.under=specOf(pieceB,ovR);}
    const pieces=[pieceA,pieceB,pieceC];
    const planned=[];
    const sorted=pieces.slice().sort((p,q)=>p.x-q.x);
    let cursor=0;
    for(const piece of sorted){
      if(piece.x>cursor+1e-4&&cursor<M)planned.push([cursor,Math.min(piece.x,M)]);
      cursor=Math.max(cursor,piece.x+piece.w);
    }
    const layout={M,plateW:a.w,k:K_MID,pieces,planned,pools:3,mode:'plates',slack};
    layoutCache.set(id,layout);return layout;
  }
  // Dropping a cache entry has to release the bitmap too. A later stage
  // change still saw the old plate's pixels until the element itself was collected.
  function releaseCanvas(c){
    if(c&&c.width>1){c.width=1;c.height=1;}
  }
  // Only unfinished middle jobs own these canvases. Published surfaces are
  // detached from the job before completion and keep their cache lifetime.
  function releaseMidJob(job){
    if(job.backgroundLayer)job.backgroundLayer.pending=false;
    releaseCanvas(job.plate&&job.plate.c);releaseCanvas(job.window&&job.window.canvas);
    job.plate=null;job.window=null;job.backgroundLayer=null;
  }
  function cancelBackgroundJobs(pred){
    if(!R.Bake)return;
    R.Bake.drop(job=>{if(!job.background||!pred(job))return false;releaseMidJob(job);return true;});
  }
  function dropKey(map,id){
    releaseCanvas(map.get(id));
    map.delete(id);
  }
  function evictStage(n){
    const keep='stage'+n+'-',floorKeep='floor'+n;
    for(const id of [...overlays.keys()]){
      const s=String(id);
      if(s==='vignette'||s==='light:'+n)continue;
      if(s.startsWith('light:')||s.startsWith('haze:'))dropKey(overlays,id);
    }
    for(const id of [...sized.keys()]){
      const s=String(id);
      if(s.startsWith('pin:'))continue;
      if(s.startsWith('stage')&&!s.startsWith(keep))dropKey(sized,id);
      else if(s.startsWith('floor')&&!s.startsWith(floorKeep)&&!s.startsWith('floor-roof'))dropKey(sized,id);
    }
    for(const id of [...sliceCache.keys()]){
      const s=String(id);
      if(s.startsWith('pin:'))continue;
      if(!s.startsWith(keep))dropKey(sliceCache,id);
    }
    for(const id of [...seamless.keys()]){
      const s=String(id);
      if(s.startsWith('floor')&&!s.startsWith(floorKeep)&&!s.startsWith('floor-roof'))dropKey(seamless,id);
    }
  }
  function evictStreet(){
    const drop=s=>!s.includes('roof')&&(s.includes('stage5-mid')||s.includes('stage5-far')||s.includes('stage5-near')||s.includes('floor5'));
    for(const map of [sized,sliceCache,seamless]){
      for(const id of [...map.keys()])if(drop(String(id)))dropKey(map,id);
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
    const tBake=performance.now();
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.ceil(logicalW*rs));c.height=Math.max(1,Math.ceil(logicalH*rs));
    const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    g.drawImage(img,0,0,c.width,c.height);sized.set(id,c);
    if(R.perf&&R.perf.noteBake)R.perf.noteBake('displayPlate:'+key,performance.now()-tBake);return c;
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
    const tBake=performance.now();
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
    c.logicalW=plateW;c.logicalH=drawH;sliceCache.set(id,c);if(R.perf&&R.perf.noteBake)R.perf.noteBake('bakedNear:'+key,performance.now()-tBake);return c;
  }
  function clampByte(v){return v<0?0:v>255?255:v|0;}
  // The right half of stage4-mid-c is a cool white hall. A light warm shift
  // pulls it toward the torchlit left. The shift is additive and small on
  // purpose: a heavy blue crush cut this plate's detail to 77% of the source.
  function warmPlate(canvas){
    const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height,img=g.getImageData(0,0,w,h),d=img.data;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      let t=(x/w-0.32)/0.2;
      if(t<=0)continue;
      if(t>1)t=1;
      t=t*t*(3-2*t);
      const i=(y*w+x)*4;
      d[i]=clampByte(d[i]+18*t);
      d[i+1]=clampByte(d[i+1]-6*t);
      d[i+2]=clampByte(d[i+2]-22*t);
    }
    g.putImageData(img,0,0);
  }
  // stage4-mid-b is the cool blue-pillar room between the original hall and
  // plate c. Shift the whole plate toward that same torchlight. The shift is
  // a per-pixel add, so columns are not smeared into each other.
  function hallGrade(canvas){
    const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height,img=g.getImageData(0,0,w,h),d=img.data;
    for(let i=0;i<d.length;i+=4){
      if(d[i+3]<16)continue;
      d[i]=clampByte(d[i]+14);
      d[i+1]=clampByte(d[i+1]+4);
      d[i+2]=clampByte(d[i+2]-12);
    }
    g.putImageData(img,0,0);
  }
  // Matte fringe on the stage 5 street becomes fully clear. Shadows stay
  // dark and torches stay hot, so the street is not one muddy grey. Nothing
  // here averages a pixel with its neighbours.
  function nightGrade(canvas){
    const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height,img=g.getImageData(0,0,w,h),d=img.data;
    for(let i=0;i<d.length;i+=4){
      const a=d[i+3];
      if(a<240){d[i]=d[i+1]=d[i+2]=d[i+3]=0;continue;}
      const r=d[i],gc=d[i+1],b=d[i+2],L=0.2126*r+0.7152*gc+0.0722*b;
      const max=Math.max(r,gc,b),min=Math.min(r,gc,b),sat=max?(max-min)/max:0;
      if(sat>=0.28){
        d[i]=clampByte(r*1.4+22);
        d[i+1]=clampByte(gc*1.15+8);
        d[i+2]=clampByte(b*0.82);
        continue;
      }
      const lifted=22+(L-22)*1.48;
      const k=L>1?Math.max(0.55,lifted/L):1;
      d[i]=clampByte(r*k);
      d[i+1]=clampByte(gc*k);
      d[i+2]=clampByte(b*k*0.92);
    }
    g.putImageData(img,0,0);
  }
  // A one-pixel fringe on a plate edge reads as a bright line once it is the
  // right side of the screen or the cut of a join. Copy the stable inner
  // column over only that fringe. The rest of the plate is untouched.
  function trimFringe(canvas,side){
    const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height,span=Math.max(1,Math.min(3,Math.round(w*2/700)));
    const src=side==='left'?span:w-1-span;if(src<1||src>=w-1)return;
    const left=side==='left'?0:src,readW=span+1,img=g.getImageData(left,0,readW,h),d=img.data;
    for(let y=0;y<h;y++){
      const sourceX=src-left,si=(y*readW+sourceX)*4,Ls=.2126*d[si]+.7152*d[si+1]+.0722*d[si+2],as=d[si+3];
      const x0=side==='left'?0:1,x1=side==='left'?sourceX:readW;
      for(let x=x0;x<x1;x++){const i=(y*readW+x)*4,L=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
        if((d[i+3]<16&&as>=200)||(d[i+3]>=16&&Math.abs(L-Ls)>26)){d[i]=d[si];d[i+1]=d[si+1];d[i+2]=d[si+2];d[i+3]=Math.max(d[i+3],as);}
      }
    }
    g.putImageData(img,left,0);
  }
  function columnMeans(canvas,x0,x1){
    const w=canvas.width,h=canvas.height,y0=h*0.2|0,y1=h*0.8|0,out=[];
    x0=Math.max(0,x0|0);x1=Math.min(w,Math.max(x0,x1|0));
    const width=x1-x0;if(!width||y1<=y0)return out;
    const d=canvas.getContext('2d').getImageData(x0,y0,width,y1-y0).data;
    for(let x=0;x<width;x++){
      let r=0,gc=0,b=0,n=0;
      for(let y=0;y<y1-y0;y+=2){const i=(y*width+x)*4;if(d[i+3]<32||d[i]+d[i+1]+d[i+2]<12)continue;r+=d[i];gc+=d[i+1];b+=d[i+2];n++;}
      out.push(n?[r/n,gc/n,b/n]:null);
    }
    return out;
  }
  // Shift each ramp column's average onto the plate underneath at the same
  // world position. Vertical detail stays. Only the ramp is touched, and the
  // shift eases to zero at the inner end so the plate's own colour resumes.
  function matchEdge(canvas,under,fadePx,ovPx){
    if(!under||fadePx<2)return;
    const w=canvas.width,uw=under.width;
    ovPx=Math.max(fadePx,Math.min(uw-1,ovPx|0));
    const incoming=columnMeans(canvas,0,fadePx);
    const underStart=uw-ovPx;
    const underCols=columnMeans(under,underStart,Math.min(uw,underStart+fadePx));
    const raw=[];
    let gr=0,gg=0,gb=0,gn=0;
    for(let x=0;x<fadePx&&x<w;x++){
      const src=incoming[x],dst=underCols[Math.min(underCols.length-1,Math.max(0,x))];
      if(!src||!dst){raw.push(null);continue;}
      raw.push([dst[0]-src[0],dst[1]-src[1],dst[2]-src[2]]);
      gr+=dst[0]-src[0];gg+=dst[1]-src[1];gb+=dst[2]-src[2];gn++;
    }
    if(!gn)return;
    const mean=[gr/gn,gg/gn,gb/gn];
    // A wide average follows the colour of the pier. It does not copy a one-pixel
    // edge from the plate underneath onto this one.
    const smooth=[];
    const rad=8;
    for(let x=0;x<raw.length;x++){
      if(!raw[x]){smooth.push(mean);continue;}
      let r=0,gc=0,b=0,n=0;
      for(let k=-rad;k<=rad;k++){
        const s=raw[x+k];
        if(!s)continue;
        r+=s[0];gc+=s[1];b+=s[2];n++;
      }
      const local=n?[r/n,gc/n,b/n]:mean;
      smooth.push([(local[0]+mean[0])/2,(local[1]+mean[1])/2,(local[2]+mean[2])/2]);
    }
    const g=canvas.getContext('2d'),h=canvas.height,readW=Math.min(w,fadePx),img=g.getImageData(0,0,readW,h),d=img.data;
    for(let x=0;x<fadePx&&x<w;x++){
      const delta=smooth[x];
      if(!delta)continue;
      let t=1-x/fadePx;t=t*t*(3-2*t);
      const dr=Math.max(-40,Math.min(40,delta[0]))*t,dg=Math.max(-40,Math.min(40,delta[1]))*t,db=Math.max(-40,Math.min(40,delta[2]))*t;
      for(let y=0;y<h;y++){
        const i=(y*readW+x)*4;
        if(d[i+3]<32)continue;
        d[i]=clampByte(d[i]+dr);
        d[i+1]=clampByte(d[i+1]+dg);
        d[i+2]=clampByte(d[i+2]+db);
      }
    }
    g.putImageData(img,0,0);
  }
  function plateId(piece,drawH){
    const rs=rsNow(),pin=piece.key==='stage5-mid-b'?'pin:':'';
    const rep=piece.repeat?piece.repeat.copies+':'+piece.repeat.period+':'+piece.repeat.from+':'+(piece.repeat.seam||0)+':'+(piece.repeat.ov||0):0;
    return pin+piece.key+':plate:'+(piece.ramp||0)+':'+(piece.rampOut||0)+':'+(piece.sx0||0)+':'+rep+':'+(piece.seam?1:0)+'@'+rs+':'+Math.round(piece.w*10)+'x'+Math.round(drawH*10);
  }
  // A cropped piece keeps the plate's pixels per unit, so its height follows
  // the cropped source width, not the whole image.
  function srcW(piece,img){return (piece.sx1||img.width)-(piece.sx0||0);}
  function pieceDrawH(piece){
    const img=R.assets.get(piece.key);if(!img)return 1;
    const fullH=piece.w*img.height/srcW(piece,img);
    return /^stage4-mid/.test(piece.key)?MID_HEIGHTS[3]:fullH;
  }
  function bakeRamp(g,width,height,leftPx,rightPx){
    if(leftPx<=0&&rightPx<=0)return;
    leftPx=Math.max(0,Math.min(width-1,leftPx|0));
    rightPx=Math.max(0,Math.min(width-1-leftPx,rightPx|0));
    g.globalCompositeOperation='destination-in';
    const fade=g.createLinearGradient(0,0,width,0);
    const stops=[];
    if(leftPx>0){for(let i=0;i<=8;i++){const t=i/8;stops.push([leftPx*t/width,t*t*(3-2*t)]);}}
    else stops.push([0,1]);
    const rightStart=width-rightPx;
    if(rightPx>0){
      stops.push([rightStart/width,1]);
      for(let i=1;i<=8;i++){const t=i/8,x=rightStart+rightPx*t;stops.push([x/width,1-t*t*(3-2*t)]);}
    }else stops.push([1,1]);
    let prev=-1;
    for(const [at,alpha] of stops){
      const stop=Math.max(prev+1e-4,Math.min(1,at));
      fade.addColorStop(stop,'rgba(0,0,0,'+alpha+')');
      prev=stop;
    }
    g.fillStyle=fade;g.fillRect(0,0,width,height);
    g.globalCompositeOperation='source-over';
  }
  // Min-error cut across [x0, x1). Pixels left of the path stay on `base`.
  // Pixels on and right of the path are copied from `over`. One plate per pixel.
  function seamBand(base,over,x0,x1){
    const width=base.canvas.width,height=base.canvas.height;
    x0=Math.max(0,x0|0);x1=Math.min(width,x1|0);
    const w=x1-x0;if(w<2||height<2)return;
    const bd=base.getImageData(x0,0,w,height),od=over.getImageData(x0,0,w,height);
    const B=bd.data,O=od.data,arg=new Array(height);
    let prev=new Float64Array(w);
    for(let y=0;y<height;y++){
      const next=new Float64Array(w),from=new Int16Array(w);
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4;
        const cost=Math.abs(B[i]-O[i])+Math.abs(B[i+1]-O[i+1])+Math.abs(B[i+2]-O[i+2])+Math.abs(B[i+3]-O[i+3]);
        let best=x,bestV=prev[x];
        if(x>0&&prev[x-1]<bestV){bestV=prev[x-1];best=x-1;}
        if(x+1<w&&prev[x+1]<bestV){bestV=prev[x+1];best=x+1;}
        next[x]=(y?bestV:0)+cost;from[x]=best;
      }
      arg[y]=from;prev=next;
    }
    let x=0;for(let i=1;i<w;i++)if(prev[i]<prev[x])x=i;
    for(let y=height-1;y>=0;y--){
      const cut=x;
      for(let xx=cut;xx<w;xx++){const i=(y*w+xx)*4;B[i]=O[i];B[i+1]=O[i+1];B[i+2]=O[i+2];B[i+3]=O[i+3];}
      x=arg[y][x];
    }
    base.putImageData(bd,x0,0);
  }
  // Extend a plate with copies of one of its own bays. Each copy overlaps the
  // previous bay on a niche and the overlap is a min-error seam, not a butt join.
  function paintRepeat(g,img,piece,c){
    const rep=piece.repeat,period=rep.period,from=rep.from,ov=rep.ov||48;
    const seam=rep.seam==null?img.width:rep.seam;
    const total=img.width+period*rep.copies;
    const sc=c.width/total;
    g.drawImage(img,0,0,img.width,img.height,0,0,img.width*sc,c.height);
    const tileSrc=Math.min(img.width-from,period+ov);
    const tiles=Math.ceil(Math.max(0,total-seam)/period);
    for(let k=0;k<tiles;k++){
      const place=seam+k*period;
      const destX=place*sc,destW=tileSrc*sc;
      const tileEnd=Math.min(c.width,Math.ceil(destX+destW));
      const bandL=Math.max(0,Math.floor(destX));
      const bandR=Math.min(c.width,Math.ceil(destX+Math.min(ov,tileSrc)*sc));
      const temp=document.createElement('canvas');temp.width=c.width;temp.height=c.height;
      const tg=temp.getContext('2d',{willReadFrequently:true});
      tg.imageSmoothingEnabled=true;tg.imageSmoothingQuality='high';
      tg.drawImage(img,from,0,tileSrc,img.height,destX,0,destW,c.height);
      if(bandR<tileEnd)g.drawImage(temp,bandR,0,tileEnd-bandR,c.height,bandR,0,tileEnd-bandR,c.height);
      seamBand(g,tg,bandL,bandR);
    }
  }
  function paintPiece(g,img,piece,c){
    const rep=piece.repeat;
    if(rep&&rep.copies>0&&rep.seam!=null){paintRepeat(g,img,piece,c);return;}
    if(rep&&rep.copies>0){
      const total=img.width+rep.period*rep.copies;
      const base=img.width/total*c.width;
      g.drawImage(img,0,0,img.width,img.height,0,0,base,c.height);
      const dw=rep.period/total*c.width;
      for(let i=0;i<rep.copies;i++)g.drawImage(img,rep.from,0,rep.period,img.height,base+i*dw,0,dw,c.height);
      return;
    }
    const sx0=piece.sx0||0,sx1=piece.sx1||img.width;
    g.drawImage(img,sx0,0,Math.max(1,sx1-sx0),img.height,0,0,c.width,c.height);
  }
  // Each overlap pixel comes from exactly one plate. The cut is the minimum
  // |ΔRGB|+|Δalpha| path, free to step one column per row.
  function applySeam(top,under,overlapU,underPiece,topW){
    const g=top.getContext('2d'),tw=top.width,th=top.height;
    const td=g.getImageData(0,0,tw,th),ud=under.getContext('2d').getImageData(0,0,under.width,under.height);
    const uw=under.width,uh=under.height;
    const fadePx=Math.max(2,Math.min(tw-1,Math.round(overlapU/Math.max(1,topW)*tw)));
    const worldW=underPiece.w||overlapU;
    const ovPx=Math.max(2,Math.min(uw-1,Math.round(overlapU/worldW*uw)));
    const W=fadePx;
    let prev=new Float64Array(W);
    const arg=new Array(th);
    for(let y=0;y<th;y++){
      const uy=Math.min(uh-1,Math.round(y*(uh-1)/Math.max(1,th-1)));
      const next=new Float64Array(W),from=new Int16Array(W);
      for(let x=0;x<W;x++){
        const ti=(y*tw+x)*4;
        const ux=Math.min(uw-1,Math.max(0,(uw-ovPx)+Math.round(x*(ovPx-1)/Math.max(1,W-1))));
        const ui=(uy*uw+ux)*4;
        const cost=Math.abs(td.data[ti]-ud.data[ui])+Math.abs(td.data[ti+1]-ud.data[ui+1])+Math.abs(td.data[ti+2]-ud.data[ui+2])+Math.abs(td.data[ti+3]-ud.data[ui+3]);
        let best=x,bestV=prev[x];
        if(x>0&&prev[x-1]<bestV){bestV=prev[x-1];best=x-1;}
        if(x+1<W&&prev[x+1]<bestV){bestV=prev[x+1];best=x+1;}
        next[x]=(y?bestV:0)+cost;from[x]=best;
      }
      arg[y]=from;prev=next;
    }
    let x=0;for(let i=1;i<W;i++)if(prev[i]<prev[x])x=i;
    const path=new Int16Array(th);
    for(let y=th-1;y>=0;y--){path[y]=x;x=arg[y][x];}
    const out=td.data;
    for(let y=0;y<th;y++){
      const uy=Math.min(uh-1,Math.round(y*(uh-1)/Math.max(1,th-1)));
      const cut=path[y];
      for(let x=0;x<cut;x++){
        const ux=Math.min(uw-1,Math.max(0,(uw-ovPx)+Math.round(x*(ovPx-1)/Math.max(1,W-1))));
        const ui=(uy*uw+ux)*4,ti=(y*tw+x)*4;
        out[ti]=ud.data[ui];out[ti+1]=ud.data[ui+1];out[ti+2]=ud.data[ui+2];out[ti+3]=ud.data[ui+3];
      }
    }
    g.putImageData(td,0,0);
    top.seamPath=path;
  }
  function bakedPlate(piece,drawH,screenY){
    const rampU=piece.fade!=null?piece.fade:(piece.ramp||0),rampOut=piece.rampOut||0;
    const id=plateId(piece,drawH);
    if(sliceCache.has(id))return sliceCache.get(id);
    const img=R.assets.get(piece.key);if(!img)return null;
    const rs=rsNow();
    const tBake=performance.now();
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.ceil(piece.w*rs));c.height=Math.max(1,Math.ceil(drawH*rs));
    const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    paintPiece(g,img,piece,c);
    if(piece.key==='stage4-mid-c')warmPlate(c);
    if(piece.key==='stage4-mid-b')hallGrade(c);
    if(piece.key==='stage5-mid'||piece.key==='stage5-mid-b')nightGrade(c);
    if(piece.key==='stage2-mid-c'||piece.key==='stage4-mid-b'||piece.key==='stage5-mid')trimFringe(c,'right');
    if(piece.under&&piece.seam){
      const uid=plateId(piece.under,pieceDrawH(piece.under));
      const under=sliceCache.get(uid);
      c.underHit=!!under;
      if(under){applySeam(c,under,piece.seam.overlap||piece.fade||32,piece.under,piece.w);c.seamed=true;}
    }else if(piece.under&&rampU>0){
      const uid=plateId(piece.under,pieceDrawH(piece.under));
      const under=sliceCache.get(uid);
      c.underHit=!!under;
      const fadePx=Math.max(1,Math.round(rampU/piece.w*c.width));
      const ovWorld=piece.under.ov||piece.under.rampOut||rampU;
      const ovPx=Math.max(fadePx,Math.round(ovWorld/piece.under.w*(under?under.width:c.width)));
      if(under){matchEdge(c,under,fadePx,ovPx);c.matched=true;}
    }
    if(!piece.seam&&(rampU>0||rampOut>0)&&c.width>2){
      const leftPx=rampU>0?Math.max(1,Math.round(rampU/piece.w*c.width)):0;
      const rightPx=rampOut>0?Math.max(1,Math.round(rampOut/piece.w*c.width)):0;
      bakeRamp(g,c.width,c.height,leftPx,rightPx);
    }
    c.rampU=rampU;c.rampOutU=rampOut;sliceCache.set(id,c);
    if(R.perf&&R.perf.noteBake)R.perf.noteBake('bakedPlate:'+piece.key,performance.now()-tBake);
    return c;
  }
  // Interior detail: mean adjacent-channel energy on opaque pixels, excluding
  // the join ramps. The unfiltered bake is the same drawImage with no grade.
  function interiorEnergy(canvas,leftPx,rightPx){
    const w=canvas.width,h=canvas.height,d=canvas.getContext('2d').getImageData(0,0,w,h).data;
    const x0=Math.max(1,(leftPx|0)+2),x1=Math.max(x0+1,w-(rightPx|0)-2);
    let sum=0,n=0;
    for(let y=0;y<h;y++)for(let x=x0;x<x1;x++){
      const i=(y*w+x)*4,p=i-4;
      if(d[i+3]<250||d[p+3]<250)continue;
      sum+=Math.abs(d[i]-d[p])+Math.abs(d[i+1]-d[p+1])+Math.abs(d[i+2]-d[p+2]);
      n++;
    }
    return {sum,n,mean:n?sum/n:0};
  }
  function detailEnergy(){
    const travel=3600,out=[];
    for(let n=1;n<=5;n++){
      const layout=midLayout(n,travel);
      let bakedSum=0,rawSum=0,pixels=0;
      const plates=[];
      for(const piece of layout.pieces){
        const img=R.assets.get(piece.key);if(!img)continue;
        const fullH=piece.w*img.height/srcW(piece,img);
        const drawH=/^stage4-mid/.test(piece.key)?MID_HEIGHTS[3]:fullH;
        const baked=bakedPlate(piece,drawH,0);if(!baked)continue;
        const raw=document.createElement('canvas');
        raw.width=baked.width;raw.height=baked.height;
        const g=raw.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
        g.drawImage(img,0,0,raw.width,raw.height);
        const leftPx=(piece.fade||0)>0?Math.round((piece.fade)/piece.w*baked.width):0;
        const rightPx=(piece.rampOut||0)>0?Math.round((piece.rampOut)/piece.w*baked.width):0;
        const a=interiorEnergy(baked,leftPx,rightPx),b=interiorEnergy(raw,leftPx,rightPx);
        bakedSum+=a.sum;rawSum+=b.sum;pixels+=b.n;
        plates.push({key:piece.key,ramp:piece.ramp||0,rampOut:piece.rampOut||0,ratio:b.mean?a.mean/b.mean:1,baked:a.mean,raw:b.mean,n:b.n,matched:!!baked.matched,underHit:!!baked.underHit,w:baked.width,h:baked.height});
      }
      out.push({stage:n,ratio:rawSum?bakedSum/rawSum:1,pixels,plates});
    }
    return out;
  }
  function gradedFar(key,logicalW,logicalH,stageN){
    const mode=FAR_GRADE[stageN]||'';
    const rs=rsNow(),id=(stageN===5?'pin:':'')+key+':far:'+mode+'@'+rs+':'+Math.round(logicalW)+'x'+Math.round(logicalH);
    if(sized.has(id))return sized.get(id);
    const img=R.assets.get(key);if(!img)return null;
    const tBake=performance.now();
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.ceil(logicalW*rs));c.height=Math.max(1,Math.ceil(logicalH*rs));
    const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    if(mode==='night'){
      g.filter='brightness(0.72) saturate(0.78)';
      g.drawImage(img,0,0,c.width,c.height);
      g.filter='none';
      g.globalCompositeOperation='multiply';g.globalAlpha=0.45;g.fillStyle='#34466e';
      g.fillRect(0,0,c.width,c.height);
      g.globalAlpha=1;g.globalCompositeOperation='source-over';
    }else if(mode==='black-tower-dusk'){
      // The source is a daylight plate: its white sky is visible through the
      // transparent street painting. Grade the complete far plate into a
      // narrow dusk range, preserving local colour/detail without a blur.
      // The low brightness followed by 0.70 contrast supplies the dusk floor
      // across the image instead of clipping its daylight sky to white.
      g.filter='saturate(0.20) brightness(0.03) contrast(0.70)';
      g.drawImage(img,0,0,c.width,c.height);
      g.filter='none';
    }else g.drawImage(img,0,0,c.width,c.height);
    sized.set(id,c);
    if(mode)R.StageWorld.farGraded[stageN]=mode;
    if(R.perf&&R.perf.noteBake)R.perf.noteBake('gradedFar:'+key,performance.now()-tBake);
    return c;
  }
  function haze(ctx,y,color='#c9d7df') {ctx.drawImage(overlay('haze:'+y+color,g=>{const f=g.createLinearGradient(0,y-9,0,y+12);f.addColorStop(0,color+'00');f.addColorStop(.5,color+'24');f.addColorStop(1,color+'00');g.fillStyle=f;g.fillRect(0,y-9,640,21);}),0,0,R.StageWorld._paintWidth||640,360);}
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
    // Older diagnostics inspect rounded per-layer views. Materialize these
    // only when inspected; gameplay consumes the finished paintings instead.
    get _views(){
      if(this._viewScene&&!this._readingViews){
        const scene=this._viewScene;this._viewScene=null;this._readingViews=true;
        try{const c=document.createElement('canvas');c.width=640;c.height=360;this.drawCachedView(c.getContext('2d'),scene);}finally{this._readingViews=false;}
      }
      return this._legacyViews;
    },
    set _views(value){this._legacyViews=value;},
    K_FAR,K_MID,K_NEAR,PPU,MID_POOL,FAR_GRADE,evictStreet,detailEnergy,
    farGraded:{},
    travelOf,midLayout,midStrips,sliceLayout,bakedPlate,
    farRight(scene,cam){return farGeom(scene,cam==null?(scene.camera&&scene.camera.x)||0:cam).right;},
    queueRoof(){
      if(this._roofQueued||!R.Bake||backgrounds.has([5,rsNow(),3600,1].join(':')))return;
      this._roofQueued=true;
      const touch=img=>{
        const canvas=document.getElementById('game'),ctx=canvas&&canvas.getContext('2d');
        if(!ctx||!img)return;
        ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(img,0,0,8,8);ctx.restore();
      };
      R.Bake.enqueue(1,'roof-far',(job,end)=>{
        const img=R.assets.get('stage5-roof-far');if(!img)return true;
        const travel=3600,farW=640+K_FAR*travel,drawH=farW*img.height/img.width,rs=rsNow();
        // Same key gradedFar uses for an ungraded roof (stage index 0).
        const id='stage5-roof-far:far:@'+rs+':'+Math.round(farW)+'x'+Math.round(drawH);
        if(sized.has(id))return true;
        const dw=Math.max(1,Math.ceil(farW*rs)),dh=Math.max(1,Math.ceil(drawH*rs));
        if(!job.pending&&job.bmp==null){
          try{
            job.pending=createImageBitmap(img,{resizeWidth:dw,resizeHeight:dh,resizeQuality:'high'});
            job.pending.then(bmp=>{job.bmp=bmp;}).catch(()=>{job.bmp=false;});
          }catch(e){job.bmp=false;}
          return false;
        }
        if(job.bmp==null)return false;
        if(!job.c){
          job.c=document.createElement('canvas');job.c.width=dw;job.c.height=dh;
          job.g=job.c.getContext('2d');job.g.imageSmoothingEnabled=true;job.g.imageSmoothingQuality='high';
          job.y=0;
        }
        const t0=performance.now();
        if(job.bmp&&job.bmp!==false){
          while(job.y<dh&&performance.now()-t0<1.2&&performance.now()<end){
            const rows=Math.min(24,dh-job.y);
            job.g.drawImage(job.bmp,0,job.y,dw,rows,0,job.y,dw,rows);
            job.y+=rows;
          }
          if(job.y<dh)return false;
          if(job.bmp.close)job.bmp.close();
        }else job.g.drawImage(img,0,0,dw,dh);
        sized.set(id,job.c);touch(job.c);
        if(R.perf.markStep)R.perf.markStep('roof-far',performance.now()-t0);
        return true;
      });
      R.Bake.enqueue(1,'roof-mid',(job,end)=>{
        const img=R.assets.get('stage5-roof-mid');if(!img)return true;
        const lw=2172/PPU[5],lh=lw*img.height/img.width;
        const piece={key:'stage5-roof-mid',w:lw,ramp:0};
        const id=plateId(piece,lh);
        if(sliceCache.has(id))return true;
        const rs=rsNow(),dw=Math.max(1,Math.ceil(lw*rs)),dh=Math.max(1,Math.ceil(lh*rs));
        if(!job.pending&&job.bmp==null){
          try{
            job.pending=createImageBitmap(img,{resizeWidth:dw,resizeHeight:dh,resizeQuality:'high'});
            job.pending.then(bmp=>{job.bmp=bmp;}).catch(()=>{job.bmp=false;});
          }catch(e){job.bmp=false;}
          return false;
        }
        if(job.bmp==null)return false;
        if(!job.c){
          job.c=document.createElement('canvas');job.c.width=dw;job.c.height=dh;
          job.g=job.c.getContext('2d');job.g.imageSmoothingEnabled=true;job.g.imageSmoothingQuality='high';
          job.y=0;
        }
        const t0=performance.now();
        if(job.bmp&&job.bmp!==false){
          while(job.y<dh&&performance.now()-t0<1.2&&performance.now()<end){
            const rows=Math.min(24,dh-job.y);
            job.g.drawImage(job.bmp,0,job.y,dw,rows,0,job.y,dw,rows);
            job.y+=rows;
          }
          if(job.y<dh)return false;
          if(job.bmp.close)job.bmp.close();
        }else job.g.drawImage(img,0,0,dw,dh);
        job.c.rampU=0;job.c.rampOutU=0;sliceCache.set(id,job.c);touch(job.c);
        if(R.perf.markStep)R.perf.markStep('roof-mid',performance.now()-t0);
        return true;
      });
      R.Bake.enqueue(1,'roof-floor',()=>{
        const t0=performance.now();
        const plate=sizedPlate('floor-roof',seamlessPlate('floor-roof',true),FLOOR_LOOP,138);
        touch(plate);if(R.perf.markStep)R.perf.markStep('roof-floor',performance.now()-t0);return true;
      });
    },
    // Kept as the lower-memory fallback if a finished panoramic allocation
    // cannot be made. Its camera rounding and capped parallax are unchanged.
    drawCachedView(ctx,scene){
      this._viewScene=null;
      const n=scene.levelIndex+1;
      if(!this._painting && R.assets.has('stage'+n+'-far')){
        const rs=R.display.renderScale||1,camExact=scene.camera.x||0,bw=Math.max(1,Math.ceil(640*rs)),bh=Math.max(1,Math.ceil(360*rs)),roundCam=Math.round(camExact);
        if(this._stageKept!==n){evictStage(n);this._stageKept=n;this._platesBaked=0;}
        if(n>1&&this._platesBaked!==n&&R.assets.has('stage'+n+'-mid-b')){
          const layout=midLayout(n,travelOf(scene));
          for(const piece of layout.pieces){
            const img=R.assets.get(piece.key);if(!img)continue;
            const fullH=piece.w*img.height/srcW(piece,img);
            const y=n===4?0:10+MID_HEIGHTS[n-1]-fullH;
            bakedPlate(piece,n===4?MID_HEIGHTS[3]:fullH,y);
          }
          this._platesBaked=n;
        }
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
    },
    backgroundStats,
    primeMidWindow(entry,origin,width,one){
      if(roofing(entry.scene))return true;
      const n=entry.scene.levelIndex+1,layout=midLayout(n,travelOf(entry.scene));
      for(const piece of layout.pieces){
        if(piece.x>origin+width+2)break;
        const img=R.assets.get(piece.key);if(!img)continue;
        const fullH=piece.w*img.height/srcW(piece,img),dh=n===4?MID_HEIGHTS[3]:fullH;
        if(sliceCache.has(plateId(piece,dh)))continue;
        bakedPlate(piece,dh,n===4?0:10+MID_HEIGHTS[n-1]-fullH);
        if(one)return false;
      }
      return true;
    },
    stepMidPrime(entry,origin,width,job,end){
      if(roofing(entry.scene))return true;
      const n=entry.scene.levelIndex+1,layout=midLayout(n,travelOf(entry.scene));
      let piece,img,dh,id;
      for(const candidate of layout.pieces){
        if(candidate.x>origin+width+2)break;
        const source=R.assets.get(candidate.key);if(!source)continue;
        const height=n===4?MID_HEIGHTS[3]:candidate.w*source.height/source.width,key=plateId(candidate,height);
        if(!sliceCache.has(key)){piece=candidate;img=source;dh=height;id=key;break;}
      }
      if(!piece)return true;
      let st=job.plate;
      if(!st||st.id!==id){
        const c=document.createElement('canvas');c.width=Math.ceil(piece.w*entry.rs);c.height=Math.ceil(dh*entry.rs);
        const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
        st=job.plate={id,c,g,y:0,phase:'copy',ramp:piece.fade!=null?piece.fade:(piece.ramp||0),out:piece.rampOut||0};
      }
      const {c,g}=st;
      if(st.phase==='copy'){
        while(st.y<c.height&&performance.now()<end){
          const rows=Math.min(16,c.height-st.y),at=performance.now();
          g.save();g.beginPath();g.rect(0,st.y,c.width,rows);g.clip();paintPiece(g,img,piece,c);g.restore();
          // Complete only this clipped strip now: no hidden whole-canvas flush
          // can move the queued resize into a later visible frame.
          g.getImageData(0,st.y,1,rows);st.y+=rows;
          if(performance.now()-at>1.2)return false;
        }
        if(st.y<c.height)return false;st.phase='edge';
      }
      if(performance.now()>=end)return false;
      if(st.phase==='edge'){
        // These supplied future plates need only their small border/overlap.
        // The full-frame stage4/5 grades belong to already-visible sources.
        if(piece.key==='stage2-mid-c')trimFringe(c,'right');
        if(piece.under&&st.ramp>0){
          const under=sliceCache.get(plateId(piece.under,pieceDrawH(piece.under)));c.underHit=!!under;
          const fadePx=Math.max(1,Math.round(st.ramp/piece.w*c.width)),ovWorld=piece.under.ov||piece.under.rampOut||st.ramp;
          if(under){matchEdge(c,under,fadePx,Math.max(fadePx,Math.round(ovWorld/piece.under.w*under.width)));c.matched=true;}
        }
        st.phase='ramp';st.y=0;return false;
      }
      if(st.phase==='ramp'&&(st.ramp>0||st.out>0)){
        const left=st.ramp>0?Math.max(1,Math.round(st.ramp/piece.w*c.width)):0,right=st.out>0?Math.max(1,Math.round(st.out/piece.w*c.width)):0;
        while(st.y<c.height&&performance.now()<end){
          const rows=Math.min(16,c.height-st.y),at=performance.now();
          g.save();g.beginPath();g.rect(0,st.y,c.width,rows);g.clip();bakeRamp(g,c.width,c.height,left,right);g.restore();
          g.getImageData(0,st.y,1,rows);st.y+=rows;if(performance.now()-at>1.2)return false;
        }
        if(st.y<c.height)return false;
      }
      c.rampU=st.ramp;c.rampOutU=st.out;sliceCache.set(id,c);job.plate=null;return false;
    },
    stepMidWindow(entry,layer,origin,width,job,end){
      let st=job.window;
      if(!st){const c=document.createElement('canvas');c.width=Math.ceil(width*entry.rs);c.height=Math.ceil(layer.h*entry.rs);st=job.window={canvas:c,g:c.getContext('2d'),y:0};}
      const c=st.canvas,g=st.g,rs=entry.rs,ghost=Object.assign({},entry.scene,{camera:{x:layer.k?origin/layer.k:0}});
      const before={painting:this._painting,layer:this._layer,width:this._paintWidth};
      try{
        this._painting=true;this._layer='mid';this._paintWidth=width;
        while(st.y<c.height&&performance.now()<end){
          const rows=Math.min(16,c.height-st.y),at=performance.now();
          g.save();g.setTransform(1,0,0,1,0,0);g.beginPath();g.rect(0,st.y,c.width,rows);g.clip();g.setTransform(rs,0,0,rs,0,-layer.y*rs);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';this.draw(g,ghost);g.restore();
          g.getImageData(0,st.y,1,rows);st.y+=rows;if(performance.now()-at>1.2)break;
        }
      }finally{this._painting=before.painting;this._layer=before.layer;this._paintWidth=before.width;}
      if(st.y<c.height)return null;
      backgroundStats.windows=(backgroundStats.windows||0)+1;return {canvas:c,origin,viewW:width};
    },
    paintMidWindow(entry,layer,origin,width){
      this.primeMidWindow(entry,origin,width,false);
      const c=document.createElement('canvas'),rs=entry.rs;c.width=Math.ceil(width*rs);c.height=Math.ceil(layer.h*rs);
      const g=c.getContext('2d');g.setTransform(rs,0,0,rs,0,-layer.y*rs);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
      const before={painting:this._painting,layer:this._layer,width:this._paintWidth};
      const ghost=Object.assign({},entry.scene,{camera:{x:layer.k?origin/layer.k:0}});
      try{this._painting=true;this._layer='mid';this._paintWidth=width;this.draw(g,ghost);}
      finally{this._painting=before.painting;this._layer=before.layer;this._paintWidth=before.width;}
      backgroundStats.windows=(backgroundStats.windows||0)+1;
      return {canvas:c,origin,viewW:width};
    },
    activateStage(scene){
      // Preloading the next view happens while the old stage is still visible.
      // Only gameplay entry changes which stage may keep unfinished mid work.
      const n=scene.levelIndex+1;
      cancelBackgroundJobs(job=>job.backgroundStage!==n);
    },
    queueMidWindow(entry,layer,left){
      if(!R.Bake||!layer.k||layer.w<=640||layer.pending||layer.next)return;
      if(left<layer.origin+Math.max(0,(layer.viewW-640)/2))return;
      const origin=layer.viewW<=640?layer.origin:Math.min(layer.origin+128,Math.max(0,layer.w-768));
      const width=Math.min(768,layer.w-origin);
      if(origin===layer.origin&&width<=layer.viewW)return;
      layer.pending=true;
      R.Bake.enqueue(1.5,'background-mid:'+entry.key+':'+origin,(job,end)=>{
        if(backgrounds.get(entry.key)!==entry){releaseMidJob(job);return true;}
        // Source-plate preparation is one job slice per image; completed
        // windows never redo a source grade, overlap or downsample.
        if(!this.stepMidPrime(entry,origin,width,job,end))return false;
        const next=this.stepMidWindow(entry,layer,origin,width,job,end);if(!next)return false;
        layer.next=next;job.window=null;layer.pending=false;return true;
      },{background:entry.key,backgroundStage:entry.scene.levelIndex+1,backgroundLayer:layer});
    },
    preload(scene){
      const n=scene.levelIndex+1,rs=rsNow(),roof=roofing(scene),travel=travelOf(scene);
      const key=[n,rs,travel,roof?1:0].join(':');
      if(backgrounds.has(key)){const cached=backgrounds.get(key);backgrounds.delete(key);backgrounds.set(key,cached);return cached;}
      if(!R.assets.has('stage'+n+'-far'))return null;
      // Keep one render resolution resident. Resizes invalidate pixel caches,
      // but visiting another stage does not discard completed paintings.
      for(const [id,old] of backgrounds)if(old.rs!==rs){
        for(const layer of old.layers){releaseCanvas(layer.canvas);if(layer.next)releaseCanvas(layer.next.canvas);}
        releaseCanvas(old.composite);releaseCanvas(old.near);backgrounds.delete(id);cancelBackgroundJobs(j=>j.background===id);
      }
      const layout=midLayout(n,travel);
      const midWidth=roof?640:layout.clamp?Math.max(640,layout.available):640+K_MID*travel;
      const specs=[
        {id:'base',k:0,w:640,y:0,h:360},
        {id:'back',k:roof?0:K_FAR,w:roof?640:640+K_FAR*travel,y:0,h:360},
        {id:'mid',k:roof?0:K_MID,w:midWidth,y:0,h:280,clamp:layout.clamp,windowed:true},
        {id:'floor',k:1,w:FLOOR_LOOP,y:222,h:138,loop:true},
        {id:'screen',k:0,w:640,y:0,h:360}
      ];
      const result={key,rs,layers:[],composite:null,camera:NaN};
      evictStage(n);
      const ghost={levelIndex:scene.levelIndex,camera:{x:0},time:0,wave:roof?5:scene.wave,roofOn:roof,level:scene.level};
      const before={painting:this._painting,layer:this._layer,width:this._paintWidth};
      result.scene=ghost;
      try{
        this._painting=true;
        for(const spec of specs){
          if(spec.windowed){const origin=Math.max(0,Math.min((scene.camera.x||0)*spec.k,spec.w-640));result.layers.push(Object.assign({},spec,this.paintMidWindow(result,spec,origin,640)));continue;}
          const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(spec.w*rs));c.height=Math.max(1,Math.ceil(spec.h*rs));
          const g=c.getContext('2d',{alpha:spec.id!=='base'});
          g.setTransform(rs,0,0,rs,0,-spec.y*rs);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
          this._layer=spec.id;this._paintWidth=spec.w;
          this.draw(g,ghost);
          if(spec.id==='base')bakeGrade(g,ghost);
          if(spec.id==='screen')blitVignette(g);
          result.layers.push(Object.assign({canvas:c},spec));
        }
        const near=bakedNear('stage'+n+'-near');
        if(near){
          result.near=document.createElement('canvas');result.near.width=Math.ceil(700*rs);result.near.height=Math.ceil(26*rs);
          result.near.getContext('2d').drawImage(near,0,Math.max(0,near.height-26*rs),near.width,26*rs,0,0,result.near.width,result.near.height);
        }
      }catch(error){
        for(const layer of result.layers)releaseCanvas(layer.canvas);
        releaseCanvas(result.near);
        return null;
      }finally{this._painting=before.painting;this._layer=before.layer;this._paintWidth=before.width;}
      backgrounds.set(key,result);backgroundStats.builds++;
      // Two completed stage/roof variants cover the current and upcoming view.
      // Only visible source plates and two small mid windows are resident;
      // a full 2080-unit middle painting is never allocated at cold entry.
      while(backgrounds.size>2){const id=backgrounds.keys().next().value,old=backgrounds.get(id);for(const layer of old.layers){releaseCanvas(layer.canvas);if(layer.next)releaseCanvas(layer.next.canvas);}releaseCanvas(old.composite);releaseCanvas(old.near);backgrounds.delete(id);cancelBackgroundJobs(j=>j.background===id);}
      // Visible source plates stay resident for the queued neighboring window.
      // Unseen B/C paintings and Stage 5's roof are not part of cold entry.
      // queueRoof still prepares the roof in wave four, before the switch.
      return result;
    },
    prepare(level){
      const scene={levelIndex:level,camera:{x:0},time:0,wave:0,level:{length:(R.SCROLL&&R.SCROLL.length)||4240}};
      this.preload(scene);
      if(level===4){scene.wave=5;scene.roofOn=true;this.preload(scene);}
    },
    draw(ctx, scene) {
      const n = scene.levelIndex + 1;
      if(!this._painting && R.assets.has('stage'+n+'-far')){
        let entry;
        try{entry=this.preload(scene);}catch(e){entry=null;}
        if(!entry)return this.drawCachedView(ctx,scene);
        this._viewScene=scene;
        const rs=entry.rs,cam=scene.camera.x||0;
        if(!entry.composite){entry.composite=document.createElement('canvas');entry.composite.width=Math.ceil(640*rs);entry.composite.height=Math.ceil(360*rs);entry.ctx=entry.composite.getContext('2d',{alpha:false});}
        if(entry.camera!==cam){
          const g=entry.ctx;g.setTransform(rs,0,0,rs,0,0);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='low';
          for(const layer of entry.layers){
            let c=layer.canvas;
            let left=cam*layer.k;
            if(layer.loop)left=((left%layer.w)+layer.w)%layer.w;
            else left=Math.max(0,Math.min(left,layer.w-640));
            if(layer.windowed){
              if(left<layer.origin||left+640>layer.origin+layer.viewW+1e-7){
                let next=layer.next;
                if(!next||left<next.origin||left+640>next.origin+next.viewW+1e-7){
                  cancelBackgroundJobs(j=>j.background===entry.key);layer.pending=false;
                  next=this.paintMidWindow(entry,layer,left,640);
                }
                releaseCanvas(layer.canvas);if(layer.next&&layer.next!==next)releaseCanvas(layer.next.canvas);
                Object.assign(layer,next);layer.next=null;c=layer.canvas;
              }
              g.drawImage(c,(left-layer.origin)*rs,0,640*rs,c.height,0,layer.y,640,layer.h);
              this.queueMidWindow(entry,layer,left);continue;
            }
            const first=Math.min(640,layer.w-left);
            g.drawImage(c,left*rs,0,first*rs,c.height,0,layer.y,first,layer.h);
            if(first<640)g.drawImage(c,0,0,(640-first)*rs,c.height,first,layer.y,640-first,layer.h);
          }
          entry.camera=cam;backgroundStats.composites++;
        }else{
          backgroundStats.hits++;
          // A retained composite can return at the identical camera after its
          // unfinished neighbor was canceled; retry without repainting it.
          for(const layer of entry.layers)if(layer.windowed)this.queueMidWindow(entry,layer,Math.max(0,Math.min(cam*layer.k,layer.w-640)));
        }
        const smooth=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
        ctx.drawImage(entry.composite,0,0,640,360);ctx.imageSmoothingEnabled=smooth;
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
          const plate=gradedFar(farKey,farW,drawH,roof?0:n);
          ctx.globalAlpha=1;
          noteScrollAlpha(ctx);
          if(plate)ctx.drawImage(plate,x,drawY,farW,drawH);
        }
        let factor=K_FAR;
        R.StageWorld._layerFactor=factor;
      }
      if(show('mid')){
        const roof=roofing(scene);
        const spec=MID_SRC[n];
        const usePlates=!roof&&R.assets.has(n>=4?'stage'+n+'-mid-cont':'stage'+n+'-mid-b');
        if(roof){
          const key='stage5-roof-mid',img=R.assets.get(key);
          if(img){
            const lw=2172/PPU[5],lh=lw*img.height/img.width;
            const plate=bakedPlate({key:key,w:lw,ramp:0,id:'roof'},lh);
            ctx.globalAlpha=1;
            noteScrollAlpha(ctx);
            if(plate)ctx.drawImage(plate,(640-lw)/2,10+MID_HEIGHTS[4]-lh,lw,lh);
          }
          R.StageWorld._layerFactor=0;
        }else if(usePlates){
          const travel=travelOf(scene),layout=midLayout(n,travel);
          const midX=layout.clamp?Math.min(cam*K_MID,Math.max(0,layout.available-640)):cam*K_MID;
          const viewL=midX-2,viewR=midX+(this._paintWidth||640)+2;
          for(const piece of layout.pieces){
            if(piece.x+piece.w<viewL||piece.x>viewR)continue;
            const img=R.assets.get(piece.key);if(!img)continue;
            const fullH=piece.w*img.height/srcW(piece,img);
            const y=n===4?0:10+MID_HEIGHTS[n-1]-fullH;
            const dh=n===4?MID_HEIGHTS[3]:fullH;
            const plate=bakedPlate(piece,dh,y);
            if(!plate)continue;
            ctx.globalAlpha=1;
            noteScrollAlpha(ctx);
            if(piece.dissolve)ctx.globalCompositeOperation='lighter';
            ctx.drawImage(plate,piece.x-midX,y,piece.w,dh);
            ctx.globalCompositeOperation='source-over';
          }
          haze(ctx,20);
          R.StageWorld._layerFactor=layout.clamp&&cam*K_MID>=layout.available-640?0:K_MID;
        }else{
          const img=spec&&R.assets.get(spec.key);
          if(img){
            const travel=travelOf(scene),layout=sliceLayout(n,travel);
            const drawH=spec.plateW*img.height/img.width,drawY=10+MID_HEIGHTS[n-1]-drawH;
            const viewL=cam*K_MID-2,viewR=cam*K_MID+(this._paintWidth||640)+2;
            const plate=displayPlate(spec.key,spec.plateW,drawH);
            if(plate&&layout.plateW>viewL&&0<viewR){noteScrollAlpha(ctx);ctx.globalAlpha=1;ctx.drawImage(plate,-cam*K_MID,drawY,spec.plateW,drawH);}
            for(const piece of layout.pieces){
              if(piece.native||piece.x+piece.w<viewL||piece.x>viewR)continue;
              const slice=bakedSlice(spec,piece,drawH);
              if(!slice)continue;
              noteScrollAlpha(ctx);
              ctx.globalAlpha=1;
              ctx.drawImage(slice,piece.x-cam*K_MID,drawY,piece.w,drawH);
            }
          }else if(n>1)architecture(ctx,n-1,cam,time);
          else R.Stage1.layers.mid(ctx,cam);
          haze(ctx,20);
          R.StageWorld._layerFactor=K_MID;
        }
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
      if (floor){const fw=FLOOR_LOOP;const off=((cam%fw)+fw)%fw;for(let x=-off;x<(this._paintWidth||640);x+=fw)ctx.drawImage(floor,x,222,fw,138);haze(ctx,224,roof?'#aebbd0':'#b8c1c6');}
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
      if(!this._painting&&R.assets.has('stage'+n+'-far')){
        let entry;try{entry=this.preload(scene);}catch(e){entry=null;}
        if(entry&&entry.near){
          const cam=scene.camera.x||0,step=684,shift=((cam*K_NEAR)%step+step)%step;
          // Same right-to-left overlap as the original strip, but only the
          // visible bottom 26 pixels are ever submitted to the renderer.
          const last=Math.floor((640+shift-1e-7)/step)*step-shift;
          for(let x=last;x>=-shift-1e-7;x-=step)ctx.drawImage(entry.near,x,334,700,26);
          return;
        }
      }
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
