'use strict';
// Each original cutout is a painted cut-out puppet bound to head, torso, upper/lower
// arms and upper/lower legs. Source pixels, weapons, faces and clothing are kept.
// Stance feet live in world coordinates; IK bends the textured legs to meet them.
(function () {
  const R=window.RWB;
  // Joint coordinates on the delivered images: shoulder/elbow/wrist, hip/knee/ankle.
  const defs={
    riley:{key:'rig-riley',height:83,front:true,head:[.32,0,.69,.20],neck:[.5,.19],pelvis:[.50,.64],arms:[[[.24,.24],[.13,.38],[.10,.53]],[[.76,.24],[.86,.38],[.9,.53]]],legs:[[[.34,.67],[.30,.80],[.23,.985]],[[.65,.67],[.69,.80],[.79,.985]]]},
    twinkle:{key:'rig-twinkle',height:67,front:true,head:[.27,0,.72,.29],neck:[.50,.28],pelvis:[.50,.64],arms:[[[.26,.30],[.14,.46],[.09,.59]],[[.75,.30],[.86,.46],[.91,.59]]],legs:[[[.35,.73],[.35,.85],[.24,.98]],[[.65,.73],[.65,.85],[.77,.98]]]},
    trolloc:{key:'cg-trolloc',height:100,head:[.23,0,.70,.40],neck:[.53,.30],pelvis:[.64,.59],arms:[[[.51,.37],[.40,.46],[.33,.51]],[[.79,.34],[.90,.45],[.89,.60]]],legs:[[[.55,.60],[.44,.73],[.36,.93]],[[.72,.60],[.82,.77],[.92,.97]]]},
    chieftain:{key:'cg-trolloc-chieftain',height:119,head:[.29,0,.73,.27],neck:[.52,.27],pelvis:[.51,.62],arms:[[[.26,.31],[.18,.47],[.31,.52]],[[.75,.32],[.79,.48],[.72,.61]]],legs:[[[.40,.61],[.35,.78],[.22,.965]],[[.62,.62],[.72,.78],[.81,.97]]]},
    darkfriend:{key:'cg-darkfriend',height:87,head:[.11,.02,.56,.31],neck:[.39,.28],pelvis:[.50,.55],arms:[[[.38,.31],[.29,.43],[.19,.43]],[[.60,.29],[.66,.41],[.45,.405]]],legs:[[[.46,.55],[.34,.67],[.27,.96]],[[.56,.56],[.65,.73],[.77,.92]]]},
    cultist:{key:'cg-cultist',height:91,head:[.28,0,.69,.29],neck:[.48,.24],pelvis:[.49,.61],arms:[[[.35,.29],[.25,.42],[.17,.42]],[[.65,.29],[.69,.44],[.56,.54]]],legs:[[[.42,.63],[.35,.77],[.25,.96]],[[.60,.64],[.63,.79],[.76,.96]]]},
    guard:{key:'cg-stone-guard',height:95,head:[.28,0,.65,.25],neck:[.49,.25],pelvis:[.52,.60],arms:[[[.40,.28],[.35,.40],[.30,.40]],[[.57,.28],[.61,.43],[.55,.59]]],legs:[[[.46,.61],[.47,.76],[.43,.945]],[[.61,.61],[.63,.77],[.65,.98]]]},
    ashaman:{key:'cg-turned-ashaman',height:93,head:[.39,0,.68,.25],neck:[.55,.20],pelvis:[.56,.54],arms:[[[.46,.23],[.31,.23],[.18,.21]],[[.64,.25],[.70,.36],[.73,.31]]],legs:[[[.49,.55],[.36,.70],[.24,.97]],[[.61,.55],[.74,.73],[.87,.95]]]},
    fade:{key:'cg-fade',height:105,head:[.32,0,.64,.26],neck:[.50,.24],pelvis:[.53,.61],arms:[[[.38,.29],[.36,.43],[.34,.59]],[[.61,.29],[.63,.47],[.57,.64]]],legs:[[[.44,.65],[.43,.81],[.41,.955]],[[.61,.65],[.63,.81],[.68,.97]]]},
    forsaken:{key:'cg-forsaken',height:107,head:[.32,.02,.59,.24],neck:[.46,.23],pelvis:[.47,.59],arms:[[[.36,.27],[.28,.35],[.24,.24]],[[.55,.27],[.64,.38],[.70,.41]]],legs:[[[.42,.65],[.36,.81],[.33,.975]],[[.56,.65],[.64,.81],[.75,.975]]]},
    taim:{key:'cg-taim',height:108,head:[.35,.01,.69,.23],neck:[.52,.22],pelvis:[.51,.60],arms:[[[.37,.26],[.27,.35],[.14,.20]],[[.65,.27],[.76,.40],[.68,.53]]],legs:[[[.42,.66],[.40,.80],[.33,.97]],[[.62,.66],[.64,.81],[.70,.98]]]},
    loial:{key:'cg-loial',height:125,head:[.24,0,.61,.29],neck:[.43,.25],pelvis:[.53,.56],arms:[[[.35,.29],[.23,.43],[.20,.33]],[[.57,.28],[.60,.41],[.45,.46]]],legs:[[[.45,.56],[.32,.65],[.20,.88]],[[.60,.58],[.67,.77],[.75,.96]]]},
  };
  const rigs=new Map();
  function knee(hip,foot,l1,l2,bend=1){const dx=foot.x-hip.x,dy=foot.y-hip.y,dist=Math.max(.001,Math.hypot(dx,dy)),d=Math.min(dist,l1+l2-.001),along=(l1*l1-l2*l2+d*d)/(2*d),side=Math.sqrt(Math.max(0,l1*l1-along*along))*bend;return{x:hip.x+dx/dist*along+dy/dist*side,y:hip.y+dy/dist*along-dx/dist*side};}
  function dist(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
  function getRig(d){
    const image=R.assets.get(d.key);if(!image)return null;if(rigs.has(d.key))return rigs.get(d.key);
    const w=image.width,h=image.height,point=p=>({x:p[0]*w,y:p[1]*h});
    const neck=point(d.neck),hip=point(d.pelvis),arms=d.arms.map(a=>a.map(point)),legs=d.legs.map(a=>a.map(point));
    const bones=[[hip,neck],[neck,{x:neck.x,y:0}],...arms.flatMap(a=>[[a[0],a[1]],[a[1],a[2]]]),...legs.flatMap(a=>[[a[0],a[1]],[a[1],a[2]]])];
    const root={x:(legs[0][2].x+legs[1][2].x)/2,y:Math.max(legs[0][2].y,legs[1][2].y)};
    const bake=document.createElement('canvas'),k=384/h; bake.width=Math.ceil(w*k);bake.height=384;
    const bc=bake.getContext('2d');bc.drawImage(image,0,0,bake.width,bake.height);
    const rgba=bc.getImageData(0,0,bake.width,bake.height),masks=Array.from({length:10},()=>new Uint8ClampedArray(rgba.data.length));
    const bounds=Array.from({length:10},()=>({x:bake.width,y:bake.height,r:0,b:0}));
    for(let yy=0;yy<bake.height;yy++)for(let xx=0;xx<bake.width;xx++){
      const at=(yy*bake.width+xx)*4;if(rgba.data[at+3]<2)continue;
      const p={x:xx/k,y:yy/k},nx=p.x/w,ny=p.y/h;
      let index=0,best=Infinity;
      // Cloth belongs to the torso, not whichever hand happens to be nearest.
      // Only the actual sleeve / trouser regions are separated into limbs.
      for(const i of [2,3,4,5]){const distance=dist(p,...bones[i]);if(distance<h*.042&&distance<best){best=distance;index=i;}}
      let legStart=d.key.includes('riley')?.70:d.key.includes('twinkle')?.87:d.key==='cg-fade'?.88:d.key==='cg-forsaken'?.88:d.key==='cg-taim'?.77:hip.y/h+.035;
      if(ny>legStart){
        const atY=leg=>{const a=p.y<leg[1].y?leg[0]:leg[1],b=p.y<leg[1].y?leg[1]:leg[2],t=Math.max(0,Math.min(1,(p.y-a.y)/(b.y-a.y||1)));return a.x+(b.x-a.x)*t;};
        const mid=(atY(legs[0])+atY(legs[1]))/2,side=p.x<mid?0:1;
        index=6+side*2+(p.y>=legs[side][1].y?1:0);
      }
      if(d.key==='cg-darkfriend'){
        if((nx>.70&&ny<.77)||(ny<.36&&nx>.28))index=0;
      }
      if(d.key==='cg-cultist'&&ny<.70&&nx>.67)index=0;
      if(d.key==='cg-turned-ashaman'&&ny>.40&&ny<.79&&nx>.67)index=0;
      if(d.key==='cg-loial'&&ny>.43&&ny<.68&&nx>.63)index=0;
      if(nx>d.head[0]&&nx<d.head[2]&&ny>d.head[1]&&ny<d.head[3])index=1;
      if(p.y>neck.y&&p.y<hip.y&&Math.abs(p.x-(hip.x+neck.x)/2)<w*.105)index=0;
      // Long weapons stay with the gripping forearm, including their distant tip.
      if(d.key==='cg-trolloc'&&nx<.32&&ny<.58)index=3;
      if(d.key==='cg-stone-guard'&&nx<.35)index=3;
      if(d.key==='cg-darkfriend'&&nx<.27&&ny>.25&&ny<.53)index=3;
      if(d.key==='cg-turned-ashaman'&&nx<.29&&ny<.32)index=3;
      const data=masks[index];data[at]=rgba.data[at];data[at+1]=rgba.data[at+1];data[at+2]=rgba.data[at+2];data[at+3]=rgba.data[at+3];
      const box=bounds[index];box.x=Math.min(box.x,xx);box.y=Math.min(box.y,yy);box.r=Math.max(box.r,xx+1);box.b=Math.max(box.b,yy+1);
    }
    const parts=masks.map((data,i)=>{const b=bounds[i];if(b.r<=b.x)return null;
      const c=document.createElement('canvas');c.width=b.r-b.x;c.height=b.b-b.y;
      const full=new ImageData(data,bake.width,bake.height);bc.putImageData(full,0,0);
      c.getContext('2d').drawImage(bake,b.x,b.y,c.width,c.height,0,0,c.width,c.height);
      return {image:c,x:b.x/k,y:b.y/k,w:c.width/k,h:c.height/k};});
    // The connected upper silhouette keeps cloth continuous around the arms.
    const upper=document.createElement('canvas');upper.width=bake.width;upper.height=bake.height;
    const merged=new Uint8ClampedArray(rgba.data.length);for(let i=0;i<6;i++)for(let j=0;j<merged.length;j+=4)if(masks[i][j+3]){merged[j]=masks[i][j];merged[j+1]=masks[i][j+1];merged[j+2]=masks[i][j+2];merged[j+3]=masks[i][j+3];}
    upper.getContext('2d').putImageData(new ImageData(merged,bake.width,bake.height),0,0);
    const rig={image,w,h,neck,hip,arms,legs,bones,root,parts,upper};rigs.set(d.key,rig);return rig;
  }

  function targets(a,d,r,pose){
    const unit=r.h/80,native=d.front?1:-1,bob=pose.bob*unit,shift=p=>({x:p.x+pose.lean*(r.root.y-p.y),y:p.y+bob});
    const bones=[[shift(r.hip),shift(r.neck)],[shift(r.neck),shift({x:r.neck.x,y:0})]];
    for(let i=0;i<2;i++){
      const [sh,el,wr]=r.arms[i],s=shift(sh);let hand=shift(wr);
      if(!pose.walking&&!pose.attack&&!pose.hurt&&a.state!=='channel'&&a.ai!=='telegraph'){bones.push([s,shift(el)],[shift(el),hand]);continue;}
      if(pose.walking){const f=pose.feet[i];hand.x-=f.x*native*unit*.45;hand.y-=Math.abs(f.x)*unit*.12;}
      if(pose.attack||a.state==='channel'||a.ai==='telegraph'){hand={x:s.x+native*(i?26:-6)*unit,y:s.y+(a.ai==='telegraph'?-16:7)*unit};}
      if(pose.hurt)hand={x:s.x-native*(i?7:20)*unit,y:s.y-5*unit};
      const e=knee(s,hand,Math.hypot(el.x-sh.x,el.y-sh.y),Math.hypot(wr.x-el.x,wr.y-el.y),native*(i?1:-1));bones.push([s,e],[e,hand]);
    }
    for(let i=0;i<2;i++){
      const [hp,kn,ft]=r.legs[i],hip=shift(hp);let foot={...ft};
      if(!pose.walking&&!a.attackMove&&!(a.z>0)){const k={x:kn.x,y:kn.y+bob*.5};bones.push([hip,k],[k,foot]);continue;}
      // Idle preserves the source stance. During walking both feet use the same
      // world anchors as the diagnostic pose, including vertical lane movement.
      if(pose.walking||a.attackMove||(a.z||0)>0){foot={x:r.root.x+pose.feet[i].x*native*unit,y:r.root.y+pose.feet[i].y*unit};}
      const k=knee(hip,foot,Math.hypot(kn.x-hp.x,kn.y-hp.y),Math.hypot(ft.x-kn.x,ft.y-kn.y),native);
      bones.push([hip,k],[k,foot]);
    }
    return bones;
  }
  function boneTransform(ctx,src,dst){
    const dx=src[1].x-src[0].x,dy=src[1].y-src[0].y,l=dx*dx+dy*dy||1,ex=dst[1].x-dst[0].x,ey=dst[1].y-dst[0].y;
    const a=(dx*ex+dy*ey)/l,b=(dx*ey-dy*ex)/l;
    ctx.transform(a,b,-b,a,dst[0].x-a*src[0].x+b*src[0].y,dst[0].y-b*src[0].x-a*src[0].y);
  }
  function upperBody(ctx,r,bones,pose){
    const cols=12,rows=16,vertices=[];
    for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
      const x=col*r.w/cols,y=row*r.h/rows;let dx=0,dy=pose.bob*r.h/80,total=1;
      if(y>r.neck.y)for(let i=0;i<2;i++){
        const elbow=r.arms[i][1],hand=r.arms[i][2];
        for(const [source,target] of [[elbow,bones[2+i*2][1]],[hand,bones[3+i*2][1]]]){
          const distance=Math.hypot(x-source.x,y-source.y),weight=Math.exp(-distance*distance/(r.h*r.h*.007));
          dx+=Math.max(-r.h*.09,Math.min(r.h*.09,target.x-source.x))*weight;
          dy+=Math.max(-r.h*.055,Math.min(r.h*.055,target.y-source.y))*weight;total+=weight;
        }
      }
      vertices.push({x,y,X:x+dx/total,Y:y+dy/total});
    }
    function triangle(a,b,c){
      const det=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y),A=((b.X-a.X)*(c.y-a.y)-(c.X-a.X)*(b.y-a.y))/det,B=((b.Y-a.Y)*(c.y-a.y)-(c.Y-a.Y)*(b.y-a.y))/det,C=((c.X-a.X)*(b.x-a.x)-(b.X-a.X)*(c.x-a.x))/det,D=((c.Y-a.Y)*(b.x-a.x)-(b.Y-a.Y)*(c.x-a.x))/det;
      ctx.save();ctx.beginPath();const center={x:(a.X+b.X+c.X)/3,y:(a.Y+b.Y+c.Y)/3};[a,b,c].forEach((p,i)=>{const dx=p.X-center.x,dy=p.Y-center.y,l=Math.hypot(dx,dy)||1;ctx[i?'lineTo':'moveTo'](p.X+dx/l,p.Y+dy/l);});ctx.closePath();ctx.clip();ctx.transform(A,B,C,D,a.X-A*a.x-C*a.y,a.Y-B*a.x-D*a.y);ctx.drawImage(r.upper,0,0,r.w,r.h);ctx.restore();
    }
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const a=row*(cols+1)+col,b=a+1,c=a+cols+1,d=c+1;triangle(vertices[a],vertices[b],vertices[c]);triangle(vertices[b],vertices[d],vertices[c]);}
  }
  function updateGait(a, dt) {
    if(!a.visualHeight){const kind=a instanceof R.Riley?'riley':a instanceof R.Loial?'loial':a.kind||(a.boss?'chieftain':'trolloc');a.visualHeight=defs[kind]?.height||83;}
    const old=a.gait || (a.gait={x:a.x,y:a.y,phase:0,feet:[],moving:false});
    const dx=a.x-old.x,dy=a.y-old.y,dist=Math.hypot(dx,dy),scale=(a.visualHeight||83)/80;
    const walking=(a.state==='walk'||a instanceof R.Loial)&&!a.dead&&(a.z||0)<.1&&dist>.001&&dist<40;
    old.moving=walking;
    if(walking) {
      const stride=32*scale; old.phase+=dist/(stride*2);
      const ux=dx/dist,uy=dy/dist;
      for(let i=0;i<2;i++) {
        const p=(old.phase+i*.5)%1,stance=p<.5,prev=old.feet[i];
        if(stance) {
          if(!prev||!prev.stance) old.feet[i]={x:a.x+ux*stride/2,y:a.y+uy*stride/2, lift:0,stance:true};
        } else {
          const t=(p-.5)*2; old.feet[i]={x:a.x+ux*(-stride/2+stride*t), y:a.y+uy*(-stride/2+stride*t),lift:Math.sin(t*Math.PI)*7*scale,stance:false};
        }
      }
      const step=Math.floor(old.phase*2);
      if(old.step!==step&&a.g&&a.g.fx) a.g.fx.dust(a.x,a.y,3);
      old.step=step;
    } else { old.feet=[]; }
    old.x=a.x;old.y=a.y;
  }
  R.Puppet={defs,updateGait,knee,pose(a,height=83){
    const scale=height/80,g=a.gait,walking=g&&g.moving,phase=g?g.phase:0;
    const bob=walking?Math.cos(phase*Math.PI*4)*1.2:Math.sin((a.stateT||0)*2)*.35;
    const feet=[{x:-7,y:0},{x:9,y:0}];
    if(walking) for(let i=0;i<2;i++) if(g.feet[i]) feet[i]={x:(g.feet[i].x-a.x)*(a.facing||1)/scale,y:(g.feet[i].y-a.y-g.feet[i].lift)/scale};
    const attack=!!a.attackMove||a.ai==='attack', hurt=['hurt','knockback'].includes(a.state)||a.hitFlash>0;
    let lean=hurt?-.18:attack?.12:walking?.04:0;
    if(a.attackMove && !['channel','throw'].includes(a.attackName)) {
      const t=Math.min(1,a.stateT/(a.attackMove.duration||.4)),kick=Math.sin(t*Math.PI);
      feet[1]={x:12+38*kick,y:-5-37*kick};feet[0]={x:-8,y:0};lean=-.12*kick;
    } else if((a.z||0)>0&&!a.flying) {feet[0]={x:-17,y:-8};feet[1]={x:22,y:-13};}
    const arms=feet.map((f,i)=>({x:(i?9:-9)-f.x*.6,y:-31+(walking?Math.abs(f.x)*.10:0)}));
    if(attack||a.state==='channel'||a.ai==='telegraph') {arms[1]={x:attack?32:23,y:attack?-48:-62};arms[0]={x:-14,y:-43};}
    if(hurt){arms[0]={x:-23,y:-49};arms[1]={x:18,y:-55};}
    return {feet,arms,bob,lean,walking,attack,hurt};
  },draw(ctx,a,cam,kind){
    const d=defs[kind];if(!d)return false;const r=getRig(d);if(!r)return false;
    a.visualHeight=d.height;const pose=this.pose(a,d.height),bones=targets(a,d,r,pose);

    ctx.save();ctx.translate(a.x-cam,a.y-(a.z||0));ctx.scale((a.facing||1)*(d.front?1:-1),1);
    if(a.dead||['knockdown','lying','death'].includes(a.state)){ctx.translate(0,-8);ctx.rotate(d.front?-1.35:1.35);}
    if(a.dead)ctx.globalAlpha=Math.max(.1,Math.min(1,(a.deathTimer||.5)/.75));
    ctx.scale(d.height/r.h,d.height/r.h);ctx.translate(-r.root.x,-r.root.y);
    const articulated=pose.walking||pose.attack||pose.hurt||a.state==='channel'||a.ai==='telegraph'||a.dead||['knockdown','lying','death'].includes(a.state);
    if(!articulated)ctx.drawImage(r.image,0,0);
    else {
    const cloth={riley:'#1b2029',twinkle:'#4b9ccc',trolloc:'#60483c',chieftain:'#65513b',darkfriend:'#59452e',cultist:'#4e5140',guard:'#75643b',ashaman:'#242730',fade:'#20232d',forsaken:'#651e30',taim:'#242631',loial:'#596044'}[kind];
    ctx.strokeStyle=cloth;ctx.lineCap='butt';ctx.lineWidth=r.h*.041;
    for(const i of [6,7,8,9]){ctx.beginPath();ctx.moveTo(bones[i][0].x,bones[i][0].y);ctx.lineTo(bones[i][1].x,bones[i][1].y);ctx.stroke();}
    for(const i of [6,7,8,9]){const part=r.parts[i];if(!part)continue;ctx.save();boneTransform(ctx,r.bones[i],bones[i]);ctx.drawImage(part.image,part.x,part.y,part.w,part.h);ctx.restore();}
    upperBody(ctx,r,bones,pose);
    }
    ctx.restore();
    if(a.callandor){ctx.save();ctx.strokeStyle='#e8ffff';ctx.shadowColor='#9deaff';ctx.shadowBlur=10;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x-cam-12,a.y-a.z-22);ctx.lineTo(a.x-cam-22,a.y-a.z-66);ctx.stroke();ctx.restore();}
    if(a.hitFlash>0){ctx.save();ctx.globalAlpha=Math.min(.55,a.hitFlash*4);ctx.fillStyle='#ffe9ac';ctx.beginPath();ctx.ellipse(a.x-cam,a.y-(a.z||0)-40,18,24,0,0,7);ctx.fill();ctx.restore();}
    return true;
  }};
  // Movement is sampled after each full gameplay update (including arena clamp).
  const update=R.scenes.Play.prototype.updateObjects;
  R.scenes.Play.prototype.updateObjects=function(dt){update.call(this,dt);for(const a of [this.player,...this.enemies,...this.allies])updateGait(a,dt);};
  const riley=R.Riley.prototype.draw;
  R.Riley.prototype.draw=function(ctx,cam){if(R.assets.has('rig-riley')){this.drawShadow(ctx,cam,17);R.Puppet.draw(ctx,this,cam,'riley');}else riley.call(this,ctx,cam);};
  const troll=R.Trolloc.prototype.draw;
  R.Trolloc.prototype.draw=function(ctx,cam){const kind=this.boss?'chieftain':'trolloc';if(R.assets.has(defs[kind].key)){this.drawTell(ctx,cam);this.drawShadow(ctx,cam,this.boss?28:21);R.Puppet.draw(ctx,this,cam,kind);}else troll.call(this,ctx,cam);};
  for(const Type of [R.ShadowSoldier,R.ShadowBoss]){const draw=Type.prototype.draw;Type.prototype.draw=function(ctx,cam){
    if(this.kind==='draghkar') {const img=R.assets.get('cg-draghkar');if(img){this.drawTell(ctx,cam);this.drawShadow(ctx,cam,30);ctx.save();ctx.translate(this.x-cam,this.y-this.z-28);ctx.scale(-this.facing,1);const flap=Math.sin(this.flightTime*9)*.10;ctx.rotate(this.ai==='attack'?-.18:flap*.4);ctx.drawImage(img,-64,-45,128,86*(1+flap));ctx.restore();return;}}
    const kind=this.kind;if(defs[kind]&&R.assets.has(defs[kind].key)){this.drawTell(ctx,cam);this.drawShadow(ctx,cam,this.boss?25:19);R.Puppet.draw(ctx,this,cam,kind);}else draw.call(this,ctx,cam);
  };}
  const loial=R.Loial.prototype.draw;R.Loial.prototype.draw=function(ctx,cam){if(R.assets.has('cg-loial')){R.draw.shadow(ctx,this.x-cam,this.y,28);R.Puppet.draw(ctx,this,cam,'loial');}else loial.call(this,ctx,cam);};
  const twinkle=R.drawTwinkle;R.drawTwinkle=function(ctx,x,y,casting,time){if(!R.Puppet.draw(ctx,{x,y,z:0,facing:1,state:casting?'channel':'idle',stateT:time},0,'twinkle'))twinkle(ctx,x,y,casting,time);};
})();
