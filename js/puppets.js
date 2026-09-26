'use strict';
// Each original cutout is a continuous painted skin bound to head, torso, upper/lower
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
    guard:{key:'cg-stone-guard',height:95,soles:[[330/768,969/1024],[450/768,1004/1024]],head:[.28,0,.65,.25],neck:[.49,.25],pelvis:[.52,.60],arms:[[[.40,.28],[.35,.40],[.30,.40]],[[.57,.28],[.61,.43],[.55,.59]]],legs:[[[.46,.61],[.47,.76],[.43,.945]],[[.61,.61],[.63,.77],[.65,.98]]]},
    ashaman:{key:'cg-turned-ashaman',height:93,head:[.39,0,.68,.25],neck:[.55,.20],pelvis:[.56,.54],arms:[[[.46,.23],[.31,.23],[.18,.21]],[[.64,.25],[.70,.36],[.73,.31]]],legs:[[[.49,.55],[.36,.70],[.24,.97]],[[.61,.55],[.74,.73],[.87,.95]]]},
    fade:{key:'cg-fade',height:105,head:[.32,0,.64,.26],neck:[.50,.24],pelvis:[.53,.61],arms:[[[.38,.29],[.36,.43],[.34,.59]],[[.61,.29],[.63,.47],[.57,.64]]],legs:[[[.44,.65],[.43,.81],[.41,.955]],[[.61,.65],[.63,.81],[.68,.97]]]},
    forsaken:{key:'cg-forsaken',height:107,head:[.32,.02,.59,.24],neck:[.46,.23],pelvis:[.47,.59],arms:[[[.36,.27],[.28,.35],[.24,.24]],[[.55,.27],[.64,.38],[.70,.41]]],legs:[[[.42,.65],[.36,.81],[.33,.975]],[[.56,.65],[.64,.81],[.75,.975]]]},
    taim:{key:'cg-taim',height:108,head:[.35,.01,.69,.23],neck:[.52,.22],pelvis:[.51,.60],arms:[[[.37,.26],[.27,.35],[.14,.20]],[[.65,.27],[.76,.40],[.68,.53]]],legs:[[[.42,.66],[.40,.80],[.33,.97]],[[.62,.66],[.64,.81],[.70,.98]]]},
    loial:{key:'cg-loial',height:125,head:[.24,0,.61,.29],neck:[.43,.25],pelvis:[.53,.56],arms:[[[.35,.29],[.23,.43],[.20,.33]],[[.57,.28],[.60,.41],[.45,.46]]],legs:[[[.45,.56],[.32,.65],[.20,.88]],[[.60,.58],[.67,.77],[.75,.96]]]},
  };
  const rigs=new Map();
  function knee(hip,foot,l1,l2,bend=1){const dx=foot.x-hip.x,dy=foot.y-hip.y,dist=Math.max(.001,Math.hypot(dx,dy)),d=Math.min(dist,l1+l2-.001),along=(l1*l1-l2*l2+d*d)/(2*d),side=Math.sqrt(Math.max(0,l1*l1-along*along))*bend;return{x:hip.x+dx/dist*along+dy/dist*side,y:hip.y+dy/dist*along-dx/dist*side};}
  function getRig(d){
    const image=R.assets.get(d.key);if(!image)return null;if(rigs.has(d.key))return rigs.get(d.key);
    const w=image.width,h=image.height,point=p=>({x:p[0]*w,y:p[1]*h});
    const neck=point(d.neck),hip=point(d.pelvis),arms=d.arms.map(a=>a.map(point)),legs=d.legs.map(a=>a.map(point));
    const bones=[[hip,neck],[neck,{x:neck.x,y:0}],...arms.flatMap(a=>[[a[0],a[1]],[a[1],a[2]]]),...legs.flatMap(a=>[[a[0],a[1]],[a[1],a[2]]])];
    const root={x:(legs[0][2].x+legs[1][2].x)/2,y:h};
    // A single connected skin avoids exposing square cuts at knees and hems.
    // Cache topology once; only vertex positions change while the actor moves.
    const cols=16,rows=24,vertices=[],triangles=[];
    const bake=document.createElement('canvas');bake.width=cols*4;bake.height=rows*4;
    const bc=bake.getContext('2d');bc.drawImage(image,0,0,bake.width,bake.height);
    const alpha=bc.getImageData(0,0,bake.width,bake.height).data;
    const texture=document.createElement('canvas');texture.width=Math.round(w*384/h);texture.height=384;
    const tc=texture.getContext('2d');tc.drawImage(image,0,0,texture.width,texture.height);
    const pixels=tc.getImageData(0,0,texture.width,texture.height).data,soles=legs.map(leg=>({x:leg[2].x,y:leg[2].y}));
    for(let yy=0;yy<texture.height;yy++)for(let xx=0;xx<texture.width;xx++){
      if(pixels[(yy*texture.width+xx)*4+3]<96)continue;
      const px=xx*w/texture.width,py=(yy+1)*h/texture.height;
      const i=Math.abs(px-legs[0][2].x)<Math.abs(px-legs[1][2].x)?0:1;
      if(py>legs[i][1].y&&Math.abs(px-legs[i][2].x)<w*.19&&py>=soles[i].y){
        const sole=soles[i];if(py>sole.y){sole.y=py;sole.sum=0;sole.count=0;}sole.sum+=px;sole.count++;sole.x=sole.sum/sole.count;
      }
    }
    // The guard's overlapping boots require authored contacts; automatic column
    // segmentation would mistake the forward toe for the rear sole.
    if(d.soles)d.soles.forEach((p,i)=>{soles[i]=point(p);});
    for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++)vertices.push({x:col*w/cols,y:row*h/rows});
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      let visible=false;for(let yy=row*4;yy<(row+1)*4;yy++)for(let xx=col*4;xx<(col+1)*4;xx++)if(alpha[(yy*bake.width+xx)*4+3])visible=true;
      if(!visible)continue;const a=row*(cols+1)+col,b=a+1,c=a+cols+1,d=c+1;triangles.push([a,b,c],[b,d,c]);
    }
    const rig={image,w,h,neck,hip,arms,legs,bones,root,vertices,triangles,texture,soles,cols,rows,height:d.height};rigs.set(d.key,rig);return rig;
  }

  function targets(a,d,r,pose){
    const unit=r.h/80,native=d.front?1:-1,bob=pose.bob*unit,shift=p=>({x:p.x+pose.lean*(r.root.y-p.y),y:p.y+bob});
    const bones=[[shift(r.hip),shift(r.neck)],[shift(r.neck),shift({x:r.neck.x,y:0})]];
    for(let i=0;i<2;i++){
      const [sh,el,wr]=r.arms[i],s=shift(sh);let hand=shift(wr);
      if(!pose.walking&&!pose.attack&&!pose.hurt&&a.state!=='channel'&&a.ai!=='telegraph'){bones.push([s,shift(el)],[shift(el),hand]);continue;}
      if(pose.walking){const f=pose.feet[i];hand.x-=f.x*native*unit*.75;hand.y-=Math.abs(f.x)*unit*.12;}
      if(pose.attack||a.state==='channel'||a.ai==='telegraph'){hand={x:s.x+native*(i?26:-6)*unit,y:s.y+(a.ai==='telegraph'?-16:7)*unit};}
      if(pose.hurt)hand={x:s.x-native*(i?7:20)*unit,y:s.y-5*unit};
      const e=knee(s,hand,Math.hypot(el.x-sh.x,el.y-sh.y),Math.hypot(wr.x-el.x,wr.y-el.y),native*(i?1:-1));bones.push([s,e],[e,hand]);
    }
    for(let i=0;i<2;i++){
      const [hp,kn,ft]=r.legs[i],hip=shift(hp);let foot={...ft};
      if(!pose.walking&&!a.attackMove&&!(a.z>0)){const k={x:kn.x,y:kn.y+bob*.5};bones.push([hip,k],[k,foot]);continue;}
      // Idle preserves the source stance. During walking both feet use the same
      // world anchors as the diagnostic pose, including vertical lane movement.
      if(pose.walking||a.attackMove||(a.z||0)>0){foot={x:r.root.x+pose.feet[i].x*native*unit-(r.soles[i].x-ft.x),y:r.root.y+pose.feet[i].y*unit-(r.soles[i].y-ft.y)};}
      const thigh=Math.hypot(kn.x-hp.x,kn.y-hp.y),shin=Math.hypot(ft.x-kn.x,ft.y-kn.y);
      // A kick must not stretch a painted trouser leg beyond its authored length.
      if(a.attackMove&&i===1){const dx=foot.x-hip.x,dy=foot.y-hip.y,length=Math.hypot(dx,dy),limit=(thigh+shin)*.98;if(length>limit)foot={x:hip.x+dx*limit/length,y:hip.y+dy*limit/length};}
      const k=knee(hip,foot,thigh,shin,native);
      bones.push([hip,k],[k,foot]);
    }
    return bones;
  }
  function smooth(a,b,v){const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);}
  function transformPoint(p,src,dst){
    const dx=src[1].x-src[0].x,dy=src[1].y-src[0].y,l=dx*dx+dy*dy||1,ex=dst[1].x-dst[0].x,ey=dst[1].y-dst[0].y;
    const a=(dx*ex+dy*ey)/l,b=(dx*ey-dy*ex)/l;
    return {x:dst[0].x+a*(p.x-src[0].x)-b*(p.y-src[0].y),y:dst[0].y+b*(p.x-src[0].x)+a*(p.y-src[0].y)};
  }
  function skinPoint(p,r,bones,pose){
    const {x,y}=p;let X=x+pose.lean*(r.root.y-y),Y=y+pose.bob*r.h/80;
    if(y>r.neck.y)for(let i=0;i<2;i++){
      const elbow=r.arms[i][1],hand=r.arms[i][2];let dx=0,dy=0,total=1;
      for(const [source,target] of [[elbow,bones[2+i*2][1]],[hand,bones[3+i*2][1]]]){
        const distance=Math.hypot(x-source.x,y-source.y),weight=Math.exp(-distance*distance/(r.h*r.h*.004));
        dx+=Math.max(-r.h*.12,Math.min(r.h*.12,target.x-source.x))*weight;
        dy+=Math.max(-r.h*.08,Math.min(r.h*.08,target.y-source.y))*weight;total+=weight;
      }
      X+=dx/total;Y+=dy/total;
    }
    if(y>r.hip.y){
      const legX=leg=>{const a=y<leg[1].y?leg[0]:leg[1],b=y<leg[1].y?leg[1]:leg[2],t=Math.max(0,Math.min(1,(y-a.y)/(b.y-a.y||1)));return a.x+(b.x-a.x)*t;};
      const centers=r.legs.map(legX),mid=(centers[0]+centers[1])/2;
      const side=x<mid?0:1,[hp,kn,ft]=r.legs[side],index=6+side*2;
      const upper=transformPoint(p,r.bones[index],bones[index]),lower=transformPoint(p,r.bones[index+1],bones[index+1]);
      const kneeWeight=smooth(kn.y-r.h*.055,kn.y+r.h*.055,y),bootWeight=pose.attack&&side===1?0:smooth(ft.y-r.h*.105,ft.y-r.h*.035,y);
      let lx=upper.x+(lower.x-upper.x)*kneeWeight,ly=upper.y+(lower.y-upper.y)*kneeWeight;
      // Soles translate rigidly with their world contact. The ankle blends into
      // the shin above the boot; neither a planted sole nor its texture rotates.
      const dst=bones[index+1][1];lx+=(x+dst.x-ft.x-lx)*bootWeight;ly+=(y+dst.y-ft.y-ly)*bootWeight;
      const weight=smooth(r.hip.y,r.hip.y+r.h*.16,y);X+=(lx-X)*weight;Y+=(ly-Y)*weight;
    }
    return {x,y,X,Y};
  }
  function paintedBody(output,r,bones,pose){
    // Composite the connected skin at full opacity before applying actor opacity.
    // Otherwise overlapping antialiased triangle edges show through during death.
    const composite=output.globalAlpha<.999,scale=384/r.h;
    if(composite&&!r.surface){r.surface=document.createElement('canvas');r.surface.width=r.texture.width+512;r.surface.height=896;}
    const ctx=composite?r.surface.getContext('2d'):output;
    if(composite){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,r.surface.width,r.surface.height);ctx.setTransform(scale,0,0,scale,256,256);}
    const padding=composite?.8/scale:r.h/r.height*.45;
    const vertices=r.vertices.map(p=>skinPoint(p,r,bones,pose));
    for(const indices of r.triangles){
      const [a,b,c]=indices.map(i=>vertices[i]);
      const det=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y),A=((b.X-a.X)*(c.y-a.y)-(c.X-a.X)*(b.y-a.y))/det,B=((b.Y-a.Y)*(c.y-a.y)-(c.Y-a.Y)*(b.y-a.y))/det,C=((c.X-a.X)*(b.x-a.x)-(b.X-a.X)*(c.x-a.x))/det,D=((c.Y-a.Y)*(b.x-a.x)-(b.Y-a.Y)*(c.x-a.x))/det;
      ctx.save();ctx.beginPath();const center={x:(a.X+b.X+c.X)/3,y:(a.Y+b.Y+c.Y)/3};[a,b,c].forEach((p,i)=>{const dx=p.X-center.x,dy=p.Y-center.y,l=Math.hypot(dx,dy)||1;ctx[i?'lineTo':'moveTo'](p.X+dx/l*padding,p.Y+dy/l*padding);});ctx.closePath();ctx.clip();ctx.transform(A,B,C,D,a.X-A*a.x-C*a.y,a.Y-B*a.x-D*a.y);ctx.drawImage(r.texture,0,0,r.w,r.h);ctx.restore();
    }
    if(composite)output.drawImage(r.surface,-256/scale,-256/scale,r.surface.width/scale,r.surface.height/scale);
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
  R.Puppet={defs,updateGait,knee,contacts(a,kind){
    const d=defs[kind],r=d&&getRig(d);if(!r)return [];
    const pose=this.pose(a,d.height),bones=targets(a,d,r,pose),scale=d.height/r.h,flip=(a.facing||1)*(d.front?1:-1);
    // Barycentric interpolation uses the exact triangles drawn on screen, not
    // just the desired IK targets. Source contacts lie on opaque sole pixels.
    return r.soles.map((p,i)=>{
      const gx=p.x/r.w*r.cols,gy=p.y/r.h*r.rows,col=Math.min(r.cols-1,Math.floor(gx)),row=Math.min(r.rows-1,Math.floor(gy)),u=gx-col,v=gy-row;
      const n=row*(r.cols+1)+col,indices=u+v<=1?[n,n+1,n+r.cols+1]:[n+1,n+r.cols+2,n+r.cols+1],weights=u+v<=1?[1-u-v,u,v]:[1-v,u+v-1,1-u];
      let X=0,Y=0;indices.forEach((index,j)=>{const q=skinPoint(r.vertices[index],r,bones,pose);X+=q.X*weights[j];Y+=q.Y*weights[j];});
      return {x:a.x+(X-r.root.x)*scale*flip,y:a.y-(a.z||0)+(Y-r.root.y)*scale,stance:!!a.gait?.feet[i]?.stance};
    });
  },pose(a,height=83){
    const scale=height/80,g=a.gait,walking=g&&g.moving,phase=g?g.phase:0;
    const bob=walking?Math.cos(phase*Math.PI*4)*1.2:Math.sin((a.stateT||0)*2)*.35;
    const feet=[{x:-7,y:0},{x:9,y:0}];
    if(walking) for(let i=0;i<2;i++) if(g.feet[i]) feet[i]={x:(g.feet[i].x-a.x)*(a.facing||1)/scale,y:(g.feet[i].y-a.y-g.feet[i].lift)/scale};
    const attack=!!a.attackMove||a.ai==='attack', hurt=['hurt','knockback'].includes(a.state)||a.hitFlash>0;
    let lean=hurt?-.18:attack?.12:walking?.04:0;
    if(a.attackMove && !['channel','throw'].includes(a.attackName)) {
      const t=Math.min(1,a.stateT/(a.attackMove.duration||.4)),kick=Math.sin(t*Math.PI);
      feet[1]={x:9+24*kick,y:-4-28*kick};feet[0]={x:-8,y:0};lean=-.12*kick;
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
    paintedBody(ctx,r,bones,pose);
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
