'use strict';
// Each original cutout is a continuous painted skin bound to head, torso, upper/lower
// arms and upper/lower legs. Source pixels, weapons, faces and clothing are kept.
// Stance feet live in world coordinates; IK bends the textured legs to meet them.
(function () {
  const R=window.RWB;
  // Joint coordinates on the delivered images: shoulder/elbow/wrist, hip/knee/ankle.
  const defs={
    twinkle:{key:'rig-twinkle',height:66,front:true,head:[.27,0,.72,.29],neck:[.50,.28],pelvis:[.50,.64],arms:[[[.26,.30],[.14,.46],[.09,.59]],[[.75,.30],[.86,.46],[.91,.59]]],legs:[[[.35,.73],[.35,.85],[.24,.98]],[[.65,.73],[.65,.85],[.77,.98]]]},
    trolloc:{key:'cg-trolloc',height:112,head:[.23,0,.70,.40],neck:[.53,.30],pelvis:[.64,.59],arms:[[[.51,.37],[.40,.46],[.33,.51]],[[.79,.34],[.90,.45],[.89,.60]]],legs:[[[.55,.60],[.44,.73],[.36,.93]],[[.72,.60],[.82,.77],[.92,.97]]]},
    chieftain:{key:'cg-trolloc-chieftain',height:133,head:[.29,0,.73,.27],neck:[.52,.27],pelvis:[.51,.62],arms:[[[.26,.31],[.18,.47],[.31,.52]],[[.75,.32],[.79,.48],[.72,.61]]],legs:[[[.40,.61],[.35,.78],[.22,.965]],[[.62,.62],[.72,.78],[.81,.97]]]},
    darkfriend:{key:'cg-darkfriend',height:97,head:[.11,.02,.56,.31],neck:[.39,.28],pelvis:[.50,.55],arms:[[[.38,.31],[.29,.43],[.19,.43]],[[.60,.29],[.66,.41],[.45,.405]]],legs:[[[.46,.55],[.34,.67],[.27,.96]],[[.56,.56],[.65,.73],[.77,.92]]]},
    cultist:{key:'cg-cultist',height:102,head:[.28,0,.69,.29],neck:[.48,.24],pelvis:[.49,.61],arms:[[[.35,.29],[.25,.42],[.17,.42]],[[.65,.29],[.69,.44],[.56,.54]]],legs:[[[.42,.63],[.35,.77],[.25,.96]],[[.60,.64],[.63,.79],[.76,.96]]]},
    guard:{key:'cg-stone-guard',height:106,soles:[[330/768,969/1024],[450/768,1004/1024]],head:[.28,0,.65,.25],neck:[.49,.25],pelvis:[.52,.60],arms:[[[.40,.28],[.35,.40],[.30,.40]],[[.57,.28],[.61,.43],[.55,.59]]],legs:[[[.46,.61],[.47,.76],[.43,.945]],[[.61,.61],[.63,.77],[.65,.98]]]},
    ashaman:{key:'cg-turned-ashaman',height:104,head:[.39,0,.68,.25],neck:[.55,.20],pelvis:[.56,.54],arms:[[[.46,.23],[.31,.23],[.18,.21]],[[.64,.25],[.70,.36],[.73,.31]]],legs:[[[.49,.55],[.36,.70],[.24,.97]],[[.61,.55],[.74,.73],[.87,.95]]]},
    fade:{key:'cg-fade',height:118,head:[.32,0,.64,.26],neck:[.50,.24],pelvis:[.53,.61],arms:[[[.38,.29],[.36,.43],[.34,.59]],[[.61,.29],[.63,.47],[.57,.64]]],legs:[[[.44,.65],[.43,.81],[.41,.955]],[[.61,.65],[.63,.81],[.68,.97]]]},
    // Be'lal is baked from the male lunging Asha'man source, then regraded and
    // given a separately articulated sword (rather than reusing Taim/Forsaken).
    forsaken:{key:'cg-turned-ashaman',variant:'belal',height:116,male:true,sword:{length:.55},head:[.39,0,.68,.25],neck:[.55,.20],pelvis:[.56,.54],arms:[[[.46,.23],[.31,.23],[.18,.21]],[[.64,.25],[.70,.36],[.73,.31]]],legs:[[[.49,.55],[.36,.70],[.24,.97]],[[.61,.55],[.74,.73],[.87,.95]]]},
    taim:{key:'cg-taim',height:121,head:[.35,.01,.69,.23],neck:[.52,.22],pelvis:[.51,.60],arms:[[[.37,.26],[.27,.35],[.14,.20]],[[.65,.27],[.76,.40],[.68,.53]]],legs:[[[.42,.66],[.40,.80],[.33,.97]],[[.62,.66],[.64,.81],[.70,.98]]]},
    loial:{key:'cg-loial',height:140,head:[.24,0,.61,.29],neck:[.43,.25],pelvis:[.53,.56],arms:[[[.35,.29],[.23,.43],[.20,.33]],[[.57,.28],[.60,.41],[.45,.46]]],legs:[[[.45,.56],[.32,.65],[.20,.88]],[[.60,.58],[.67,.77],[.75,.96]]]},
  };
  const rigs=new Map();
  function knee(hip,foot,l1,l2,bend=1){const dx=foot.x-hip.x,dy=foot.y-hip.y,dist=Math.max(.001,Math.hypot(dx,dy)),d=Math.min(dist,l1+l2-.001),along=(l1*l1-l2*l2+d*d)/(2*d),side=Math.sqrt(Math.max(0,l1*l1-along*along))*bend;return{x:hip.x+dx/dist*along+dy/dist*side,y:hip.y+dy/dist*along-dx/dist*side};}
  function bakedImage(d,image){
    const c=document.createElement('canvas');
    c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);
    const g=c.getContext('2d');
    if(d.variant==='belal'){
      const data=g.getImageData(0,0,c.width,c.height),p=data.data,source=new Uint8ClampedArray(p),removed=new Uint8Array(c.width*c.height);
      const luminance=new Float32Array(c.width*c.height);
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){let sum=0,count=0;for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++){const xx=x+ox,yy=y+oy;if(xx<0||yy<0||xx>=c.width||yy>=c.height)continue;const j=(yy*c.width+xx)*4;sum+=.2126*source[j]+.7152*source[j+1]+.0722*source[j+2];count++;}luminance[y*c.width+x]=sum/count;}
      const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);},mix=(a,b,t)=>a+(b-a)*t;
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4,r=p[i],gg=p[i+1],b=p[i+2];
        // Remove the orange weave and its soft halo in the extended-hand corner.
        if(x<c.width*.36&&y<c.height*.36){
          const warm=r>145&&r>gg*1.16&&gg>b*1.08,green=gg>95&&gg>r*.72&&gg>b*1.16,white=r>205&&gg>205&&b>185;
          const skin=r>95&&r>gg*1.08&&gg>b*1.18&&r-b<105;
          if(!skin&&(warm||green||white)){p[i+3]=0;removed[y*c.width+x]=1;continue;}
        }
        // Smooth luminance-driven crimson cloth; soft masks avoid posterised
        // thresholds while skin, silver trim and hair retain their own colour.
        const max=Math.max(r,gg,b),min=Math.min(r,gg,b),sat=max-min;
        const skin=ease((r-gg*1.04)/28)*ease((gg-b*1.08)/25)*ease((130-(r-b))/45),body=ease((y/c.height-.15)/.12),dark=ease((175-max)/55),coat=body*dark*(1-skin);
        const L=ease((luminance[y*c.width+x]-18)/175),upper=ease((L-.48)/.52),lower=ease(L/.48),ramp=upper?[mix(106,192,upper),mix(20,72,upper),mix(32,90,upper)]:[mix(26,106,lower),mix(5,20,lower),mix(8,32,lower)],blend=.70*coat;
        p[i]=mix(r,ramp[0],blend);p[i+1]=mix(gg,ramp[1],blend);p[i+2]=mix(b,ramp[2],blend);
        if(sat<35&&y<c.height*.29&&max>95){p[i]=Math.min(220,max*1.05);p[i+1]=Math.min(215,max*.98);p[i+2]=Math.min(210,max*.91);}
        else if(sat<28&&max>75){p[i]=max*.82;p[i+1]=max*.86;p[i+2]=max*.91;}
      }
      // Fade the antialiased glow surrounding every removed weave pixel.
      for(let y=0;y<c.height*.36;y++)for(let x=0;x<c.width*.36;x++)if(removed[y*c.width+x])for(let oy=-4;oy<=4;oy++)for(let ox=-4;ox<=4;ox++){
        const xx=x+ox,yy=y+oy,dist=Math.hypot(ox,oy);if(xx<0||yy<0||xx>=c.width||yy>=c.height||dist>4)continue;const j=(yy*c.width+xx)*4,rr=p[j],gr=p[j+1],bb=p[j+2],skin=rr>95&&rr>gr*1.08&&gr>bb*1.18&&rr-bb<105;if(!skin)p[j+3]=Math.min(p[j+3],Math.round(255*Math.max(0,dist/4)));
      }g.putImageData(data,0,0);
    }
    return c;
  }
  function getRig(d){
    const primary=R.assets.get(d.key),raw=primary||R.assets.get(d.fallback);if(!raw)return null;const cacheKey=(primary?d.key:d.fallback)+':'+(d.variant||'base');if(rigs.has(cacheKey))return rigs.get(cacheKey);const image=bakedImage(primary?d:{...d,sourcePanel:null},raw);
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
    // Grade the source once, keeping every runtime pose on one painted texture.
    tc.globalCompositeOperation='source-atop';const shade=tc.createLinearGradient(0,0,texture.width,0);shade.addColorStop(0,'rgba(12,18,30,.13)');shade.addColorStop(.55,'rgba(255,241,210,.04)');shade.addColorStop(1,'rgba(8,13,25,.16)');tc.fillStyle=shade;tc.fillRect(0,0,texture.width,texture.height);tc.globalCompositeOperation='source-over';
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
    // Side-view rigs overlap their legs, so one mesh would smear the kicking leg
    // across the standing one. Split the far leg into its own texture layer.
    let split=null;
    if(d.splitLegs){
      const kick=document.createElement('canvas'),body=document.createElement('canvas');kick.width=body.width=texture.width;kick.height=body.height=texture.height;
      const kd=tc.getImageData(0,0,texture.width,texture.height),bd=tc.getImageData(0,0,texture.width,texture.height);
      for(let yy=0;yy<texture.height;yy++){const py=yy*h/texture.height;const lx=leg=>{const a=py<leg[1].y?leg[0]:leg[1],b=py<leg[1].y?leg[1]:leg[2],t=Math.max(0,Math.min(1,(py-a.y)/(b.y-a.y||1)));return a.x+(b.x-a.x)*t;};const mid=(lx(legs[0])+lx(legs[1]))/2;
        for(let xx=0;xx<texture.width;xx++){const px=xx*w/texture.width,j=(yy*texture.width+xx)*4,isKick=py>hip.y+h*.02&&px>=mid;if(isKick)bd.data[j+3]=0;else kd.data[j+3]=0;}}
      kick.getContext('2d').putImageData(kd,0,0);body.getContext('2d').putImageData(bd,0,0);split={kick,body};
    }
    const rig={image,w,h,neck,hip,arms,legs,bones,root,vertices,triangles,texture,soles,cols,rows,split,height:d.height,sword:!!d.sword};for(const p of vertices)p.weights=skinWeights(p,rig);
    rig.faces=triangles.map(([a,b,c])=>{const p=vertices[a],q=vertices[b],v=vertices[c],bx=q.x-p.x,by=q.y-p.y,cx=v.x-p.x,cy=v.y-p.y,det=bx*cy-cx*by;return {a,b,c,bx:bx/det,by:by/det,cx:cx/det,cy:cy/det};});
    rigs.set(cacheKey,rig);return rig;
  }

  function targets(a,d,r,pose){
    const unit=r.h/80,native=d.front?1:-1,bob=pose.bob*unit,shift=p=>({x:p.x+pose.lean*(r.root.y-p.y),y:p.y+bob});
    const bones=[[shift(r.hip),shift(r.neck)],[shift(r.neck),shift({x:r.neck.x,y:0})]];
    for(let i=0;i<2;i++){
      const [sh,el,wr]=r.arms[i],s=shift(sh);let hand=shift(wr);
      if(!pose.walking&&!pose.attack&&!pose.hurt&&a.state!=='channel'&&a.ai!=='telegraph'){bones.push([s,shift(el)],[shift(el),hand]);continue;}
      if(pose.walking){const f=pose.feet[i];hand.x-=f.x*native*unit*.75;hand.y-=Math.abs(f.x)*unit*.12;}
      if(d.sword&&i===0&&(pose.attack||a.ai==='telegraph')){bones.push([s,shift(el)],[shift(el),hand]);continue;}
      // Be'lal's sword arm keeps its painted fist; SWORD FLURRY swings the blade about it.
      if(pose.attack||a.state==='channel'||a.ai==='telegraph'){hand={x:s.x+native*((d.sword?!i:i)?26:-6)*unit,y:s.y+(a.ai==='telegraph'?-16:7)*unit};}
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
  function skinWeights(p,r,forceSide){
    const {x,y}=p,arms=[];
    if(y>r.neck.y)for(const arm of r.arms){const weights=[arm[1],arm[2]].map(q=>Math.exp(-((x-q.x)**2+(y-q.y)**2)/(r.h*r.h*.004))),total=1+weights[0]+weights[1];arms.push(weights.map(w=>w/total));}
    let leg=null;
    if(y>r.hip.y){const centers=r.legs.map(l=>{const a=y<l[1].y?l[0]:l[1],b=y<l[1].y?l[1]:l[2],t=Math.max(0,Math.min(1,(y-a.y)/(b.y-a.y||1)));return a.x+(b.x-a.x)*t;});const side=forceSide!==undefined?forceSide:x<(centers[0]+centers[1])/2?0:1,[hp,kn,ft]=r.legs[side];leg={side,knee:smooth(kn.y-r.h*.055,kn.y+r.h*.055,y),boot:smooth(ft.y-r.h*.105,ft.y-r.h*.035,y),pelvis:smooth(r.hip.y,r.hip.y+r.h*.16,y)};}
    return {arms,leg};
  }
  function boneTransforms(r,bones){return r.bones.map((src,i)=>{const dst=bones[i],dx=src[1].x-src[0].x,dy=src[1].y-src[0].y,l=dx*dx+dy*dy||1,ex=dst[1].x-dst[0].x,ey=dst[1].y-dst[0].y,a=(dx*ex+dy*ey)/l,b=(dx*ey-dy*ex)/l;return {a,b,x:dst[0].x-a*src[0].x+b*src[0].y,y:dst[0].y-b*src[0].x-a*src[0].y};});}
  function skinPoint(p,r,bones,pose,forceSide,transforms,out){
    const {x,y}=p,w=forceSide===undefined?(p.weights||skinWeights(p,r)):skinWeights(p,r,forceSide);let X=x+pose.lean*(r.root.y-y),Y=y+pose.bob*r.h/80;
    for(let i=0;i<w.arms.length;i++)for(let j=0;j<2;j++){const source=r.arms[i][j+1],target=bones[2+i*2+j][1],capX=r.sword&&i===0?Infinity:r.h*.12,capY=r.sword&&i===0?Infinity:r.h*.08;X+=Math.max(-capX,Math.min(capX,target.x-source.x))*w.arms[i][j];Y+=Math.max(-capY,Math.min(capY,target.y-source.y))*w.arms[i][j];}
    if(w.leg){const l=w.leg,index=6+l.side*2,ft=r.legs[l.side][2],t=transforms||boneTransforms(r,bones),u=t[index],v=t[index+1],ux=u.a*x-u.b*y+u.x,uy=u.b*x+u.a*y+u.y,lx0=v.a*x-v.b*y+v.x,ly0=v.b*x+v.a*y+v.y,boot=pose.attack&&l.side===1?0:l.boot,dst=bones[index+1][1];let lx=ux+(lx0-ux)*l.knee,ly=uy+(ly0-uy)*l.knee;lx+=(x+dst.x-ft.x-lx)*boot;ly+=(y+dst.y-ft.y-ly)*boot;X+=(lx-X)*l.pelvis;Y+=(ly-Y)*l.pelvis;}
    const q=out||{};q.x=x;q.y=y;q.X=X;q.Y=Y;return q;
  }
  // Batch the connected skin in one indexed GPU draw. Keep Canvas skinning for
  // disabled/lost WebGL contexts. No image/pose quality is dropped in either path.
  let meshGPU;
  function gpuRenderer(){
    if(meshGPU!==undefined)return meshGPU;
    meshGPU=null;
    try {
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
      const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,preserveDrawingBuffer:true,depth:false,stencil:false});if(!gl)return null;
      const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Mesh shader unavailable');return s;};
      const program=gl.createProgram(),vs=shader(gl.VERTEX_SHADER,'attribute vec2 position;attribute vec2 uv;uniform vec4 bounds;varying vec2 tex;void main(){gl_Position=vec4((position.x-bounds.x)/bounds.z*2.0-1.0,1.0-(position.y-bounds.y)/bounds.w*2.0,0.0,1.0);tex=uv;}'),fs=shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 tex;uniform sampler2D image;void main(){gl_FragColor=texture2D(image,tex);}');
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Mesh program unavailable');
      gl.useProgram(program);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
      const position=gl.getAttribLocation(program,'position'),uv=gl.getAttribLocation(program,'uv'),bounds=gl.getUniformLocation(program,'bounds');gl.uniform1i(gl.getUniformLocation(program,'image'),0);
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();meshGPU=null;});
      meshGPU={canvas,gl,position,uv,bounds,rigs:new WeakMap()};
    } catch(_){meshGPU=null;}
    return meshGPU;
  }
  function gpuSkin(r,vertices,bounds,scale,destination){
    if(r.split||R.perf.canvasSkin)return false;const gpu=gpuRenderer();if(!gpu)return false;
    const {gl,canvas}=gpu,{left,top,width,height}=bounds;if(width>canvas.width||height>canvas.height||gl.isContextLost())return false;
    let data=gpu.rigs.get(r);
    if(!data){
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,r.texture);
      const vertex=gl.createBuffer(),indices=gl.createBuffer(),array=new Float32Array(vertices.length*4),faces=new Uint16Array(r.triangles.flat());gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,faces,gl.STATIC_DRAW);
      r.vertices.forEach((v,i)=>{array[i*4+2]=v.x/r.w;array[i*4+3]=v.y/r.h;});data={texture,vertex,indices,array,count:faces.length};gpu.rigs.set(r,data);
    }
    vertices.forEach((v,i)=>{data.array[i*4]=v.X*scale;data.array[i*4+1]=v.Y*scale;});
    gl.viewport(0,0,width,height);gl.enable(gl.SCISSOR_TEST);gl.scissor(0,0,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.bindTexture(gl.TEXTURE_2D,data.texture);gl.bindBuffer(gl.ARRAY_BUFFER,data.vertex);gl.bufferData(gl.ARRAY_BUFFER,data.array,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(gpu.position);gl.vertexAttribPointer(gpu.position,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(gpu.uv);gl.vertexAttribPointer(gpu.uv,2,gl.FLOAT,false,16,8);gl.uniform4f(gpu.bounds,left,top,width,height);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,data.indices);gl.drawElements(gl.TRIANGLES,data.count,gl.UNSIGNED_SHORT,0);
    destination.setTransform(1,0,0,1,0,0);destination.drawImage(canvas,0,canvas.height-height,width,height,0,0,width,height);return true;
  }
  // Walk / attack / hurt poses are baked once per rig and shared by every actor.
  // Live draws blit that composite. Skinning a mesh every frame was the whole
  // mid-fight cost (about 8ms per enemy on software canvas).
  const WALK_FRAMES=12,KICK_FRAMES=6;
  function bakePose(r,bones,pose){
    const scale=384/r.h,transforms=boneTransforms(r,bones),layers=r.split?[[r.split.kick,1],[r.split.body,0]]:[[r.texture,undefined]];
    r.buffers=r.buffers||layers.map(()=>r.vertices.map(()=>({})));
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(let n=0;n<layers.length;n++)for(let i=0;i<r.vertices.length;i++){const v=skinPoint(r.vertices[i],r,bones,pose,layers[n][1],transforms,r.buffers[n][i]);minX=Math.min(minX,v.X);minY=Math.min(minY,v.Y);maxX=Math.max(maxX,v.X);maxY=Math.max(maxY,v.Y);}
    const left=Math.floor(minX*scale)-2,top=Math.floor(minY*scale)-2,width=Math.max(1,Math.ceil(maxX*scale)-left+2),height=Math.max(1,Math.ceil(maxY*scale)-top+2);
    const surface=document.createElement('canvas');surface.width=width;surface.height=height;
    const ctx=surface.getContext('2d'),bounds={left,top,width,height},padding=.8/scale;
    ctx.setTransform(scale,0,0,scale,-left,-top);
    if(!gpuSkin(r,r.buffers[0],bounds,scale,ctx))for(let n=0;n<layers.length;n++){const vertices=r.buffers[n],tex=layers[n][0];
      for(const f of r.faces){const a=vertices[f.a],b=vertices[f.b],c=vertices[f.c],bx=b.X-a.X,by=b.Y-a.Y,cx=c.X-a.X,cy=c.Y-a.Y,A=bx*f.cy-cx*f.by,B=by*f.cy-cy*f.by,C=cx*f.bx-bx*f.cx,D=cy*f.bx-by*f.cx,centerX=(a.X+b.X+c.X)/3,centerY=(a.Y+b.Y+c.Y)/3;
        ctx.save();ctx.beginPath();for(let k=0;k<3;k++){const p=k===0?a:k===1?b:c,dx=p.X-centerX,dy=p.Y-centerY,l=Math.hypot(dx,dy)||1;ctx[k?'lineTo':'moveTo'](p.X+dx/l*padding,p.Y+dy/l*padding);}ctx.closePath();ctx.clip();ctx.transform(A,B,C,D,a.X-A*a.x-C*a.y,a.Y-B*a.x-D*a.y);ctx.drawImage(tex,0,0,r.w,r.h);ctx.restore();
      }
    }
    return {surface,bounds};
  }
  function blitPose(output,r,entry){
    const scale=384/r.h,b=entry.bounds;
    output.drawImage(entry.surface,0,0,b.width,b.height,b.left/scale,b.top/scale,b.width/scale,b.height/scale);
  }
  // Tint only the baked character's pixels. source-atop stays on this copy,
  // never on the main canvas (that lit a box around Be'lal).
  function flashOf(entry){
    if(entry.flash)return entry.flash;const b=entry.bounds,c=document.createElement('canvas');c.width=b.width;c.height=b.height;const g=c.getContext('2d');
    g.drawImage(entry.surface,0,0,b.width,b.height);g.globalCompositeOperation='source-atop';g.fillStyle='#fff4c8';g.fillRect(0,0,b.width,b.height);entry.flash=c;return c;
  }
  function frameKey(a){
    if(a.attackMove){const t=Math.min(1,(a.stateT||0)/(a.attackMove.duration||.4));return 'k'+Math.min(KICK_FRAMES-1,Math.floor(t*KICK_FRAMES));}
    if(a.hitFlash>0||a.state==='hurt'||a.state==='knockback')return 'hurt';
    if(a.state==='channel')return 'channel';
    if(a.ai==='telegraph')return 'cast';
    if(a.ai==='attack'||a.state==='attack')return 'attack';
    if((a.z||0)>6&&!a.flying)return 'air';
    if(a.gait&&a.gait.moving){const phase=((a.gait.phase%1)+1)%1;return 'w'+(Math.floor(phase*WALK_FRAMES)%WALK_FRAMES);}
    return 'idle';
  }
  function actorFor(d,key){
    const height=d.height,scale=height/80,stride=32*scale;
    const a={x:0,y:0,z:0,facing:1,state:'idle',stateT:0,ai:'',visualHeight:height,attackMove:null,attackName:'',hitFlash:0,dead:false,flying:false,gait:{moving:false,phase:0,feet:[]}};
    if(key==='hurt'){a.state='hurt';a.hitFlash=.1;}
    else if(key==='cast'){a.ai='telegraph';a.state='telegraph';}
    else if(key==='attack'){a.ai='attack';a.state='attack';}
    else if(key==='air'){a.z=18;a.state='rise';}
    else if(key==='channel'){a.state='channel';}
    else if(key[0]==='w'){
      const phase=Number(key.slice(1))/WALK_FRAMES;a.state='walk';a.gait.moving=true;a.gait.phase=phase;
      for(let i=0;i<2;i++){const p=(phase+i*.5)%1,stance=p<.5;if(stance)a.gait.feet.push({x:stride/2,y:0,lift:0,stance:true});else{const t=(p-.5)*2;a.gait.feet.push({x:-stride/2+stride*t,y:0,lift:Math.sin(t*Math.PI)*7*scale,stance:false});}}
    }else if(key[0]==='k'){
      const step=Number(key.slice(1));a.state='attack';a.attackName='front';a.attackMove={duration:.4};a.stateT=((step+.5)/KICK_FRAMES)*.4;
    }
    return a;
  }
  function paintedBody(output,r,bones,pose,actor,key){
    const lib=r.library||(r.library=new Map());
    let entry=key?lib.get(key):null;
    if(!entry){
      if(!R.perf.poseWarm){
        const now=performance.now();
        if(now-(R.perf.poseStamp||0)>14){R.perf.poseStamp=now;R.perf.poseBuilds=0;}
        if((R.perf.poseBuilds||0)>=1)entry=lib.get('idle')||lib.values().next().value;
      }
      if(!entry){
        if(!bones)return null;
        entry=bakePose(r,bones,pose);
        if(key)lib.set(key,entry);
        if(!R.perf.poseWarm)R.perf.poseBuilds=(R.perf.poseBuilds||0)+1;
      }
    }
    if(!output||!entry)return entry;
    // A single tightly bounded composite prevents triangle-edge alpha seams.
    blitPose(output,r,entry);
    if(actor&&actor.hitFlash>0){const alpha=output.globalAlpha,b=entry.bounds,scale=384/r.h;output.globalAlpha=alpha*Math.min(.72,actor.hitFlash*6);output.drawImage(flashOf(entry),0,0,b.width,b.height,b.left/scale,b.top/scale,b.width/scale,b.height/scale);output.globalAlpha=alpha;}
    return entry;
  }
  function drawSword(ctx,a,d,r,bones,pose){
    // Anchor to the painted fist as actually skinned (bones[3] wrist), not the
    // raw IK target, which the clamped arm skin can lag behind.
    if(!d.sword)return;const skin=p=>{const gx=p.x/r.w*r.cols,gy=p.y/r.h*r.rows,col=Math.max(0,Math.min(r.cols-1,Math.floor(gx))),row=Math.max(0,Math.min(r.rows-1,Math.floor(gy))),u=gx-col,v=gy-row,n=row*(r.cols+1)+col,ids=u+v<=1?[n,n+1,n+r.cols+1]:[n+1,n+r.cols+2,n+r.cols+1],wt=u+v<=1?[1-u-v,u,v]:[1-v,u+v-1,1-u];let X=0,Y=0;ids.forEach((k,j)=>{const q=skinPoint(r.vertices[k],r,bones,pose);X+=q.X*wt[j];Y+=q.Y*wt[j];});return{x:X,y:Y};},hand=pose?skin(r.arms[0][2]):bones[3][1],elbow=pose?skin(r.arms[0][1]):bones[2][1],dx=hand.x-elbow.x,dy=hand.y-elbow.y,l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l;
    const flourish=a.ai==='attack'?Math.sin(Math.min(1,(a.stateT||.2)/.55)*Math.PI*2)*.9:0,cs=Math.cos(flourish),sn=Math.sin(flourish),vx=ux*cs-uy*sn,vy=ux*sn+uy*cs,len=r.h*d.sword.length;
    ctx.save();ctx.lineCap='round';ctx.translate(hand.x,hand.y);ctx.rotate(Math.atan2(vy,vx));
    ctx.strokeStyle='#39281f';ctx.lineWidth=r.h*.018;ctx.beginPath();ctx.moveTo(-r.h*.06,0);ctx.lineTo(r.h*.022,0);ctx.stroke();
    ctx.strokeStyle='#b9a16c';ctx.lineWidth=r.h*.012;ctx.beginPath();ctx.moveTo(r.h*.022,-r.h*.06);ctx.lineTo(r.h*.022,r.h*.06);ctx.stroke();
    ctx.fillStyle='#798896';ctx.strokeStyle='#303a46';ctx.lineWidth=r.h*.009;ctx.beginPath();ctx.moveTo(r.h*.022,-r.h*.018);ctx.lineTo(len,0);ctx.lineTo(r.h*.022,r.h*.018);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#edf5fb';ctx.lineWidth=r.h*.006;ctx.beginPath();ctx.moveTo(r.h*.07,-r.h*.006);ctx.lineTo(len*.94,-r.h*.002);ctx.stroke();
    ctx.restore();
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
  R.Puppet={defs,updateGait,knee,prepare(kind){
    const d=defs[kind],r=d&&getRig(d);if(!r)return null;
    const prev=R.perf.poseWarm;R.perf.poseWarm=true;
    const keys=['idle','hurt','cast','attack','air','channel'];
    for(let i=0;i<WALK_FRAMES;i++)keys.push('w'+i);
    for(let i=0;i<KICK_FRAMES;i++)keys.push('k'+i);
    for(const key of keys){const a=actorFor(d,key),pose=this.pose(a,d.height);paintedBody(null,r,targets(a,d,r,pose),pose,a,key);}
    if(r.library)for(const entry of r.library.values())flashOf(entry);
    R.perf.poseWarm=prev;return r;
  },contacts(a,kind){
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
    if(kind==='forsaken'&&R.drawBelal&&R.assets.has('belal-idle'))return R.drawBelal(ctx,a,cam,defs.forsaken.height);
    const d=defs[kind];if(!d)return false;const r=getRig(d);if(!r)return false;
    a.visualHeight=d.height;const pose=this.pose(a,d.height);

    ctx.save();ctx.translate(a.x-cam,a.y-(a.z||0));ctx.scale((a.facing||1)*(d.front?1:-1),1);
    if(a.dead||['knockdown','lying','death'].includes(a.state)){ctx.translate(0,-8);ctx.rotate(d.front?-1.35:1.35);}
    if(a.dead)ctx.globalAlpha=Math.max(.1,Math.min(1,(a.deathTimer||.5)/.75));
    ctx.scale(d.height/r.h,d.height/r.h);ctx.translate(-r.root.x,-r.root.y);
    const key=frameKey(a),lib=r.library,cached=lib&&lib.has(key);
    // Idle breathing is a translate of the baked stance. Walk and kick frames
    // already include their own bob, so they are not shifted again.
    if(cached&&key[0]!=='w'&&key[0]!=='k')ctx.translate(0,pose.bob*r.h/80);
    const sample=cached?null:actorFor(d,key),skinPose=sample?this.pose(sample,d.height):pose,skinBones=cached?null:targets(sample,d,r,skinPose);
    // Processed connected skin is mandatory even at idle: no raw adult Riley,
    // alternate palette, or uncomposited joint path can leak through.
    paintedBody(ctx,r,skinBones,skinPose,a,key);
    if(d.sword)drawSword(ctx,a,d,r,cached?targets(a,d,r,pose):skinBones,cached?pose:skinPose);
    ctx.restore();
    if(a.callandor){ctx.save();ctx.lineCap='round';ctx.strokeStyle='rgba(100,220,255,.35)';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(a.x-cam-12,a.y-a.z-22);ctx.lineTo(a.x-cam-22,a.y-a.z-66);ctx.stroke();ctx.strokeStyle='#e8ffff';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
    return true;
  }};
  // Movement is sampled after each full gameplay update (including arena clamp).
  const update=R.scenes.Play.prototype.updateObjects;
  R.scenes.Play.prototype.updateObjects=function(dt){update.call(this,dt);for(const a of [this.player,...this.enemies,...this.allies])updateGait(a,dt);};
  const troll=R.Trolloc.prototype.draw;
  R.Trolloc.prototype.draw=function(ctx,cam){const kind=this.boss?'chieftain':'trolloc';if(R.assets.has(defs[kind].key)){this.drawTell(ctx,cam);this.drawShadow(ctx,cam,this.boss?28:21);R.Puppet.draw(ctx,this,cam,kind);}else troll.call(this,ctx,cam);};
  // Be'lal: frame-based painted sheet (assets/art/belal, source faces LEFT).
  const BELAL=R.BELAL={frames:{idle:[238,222,149,221], walk1:[204,220,117,220], walk2:[199,220,117,220], walk3:[212,221,125,221], walk4:[233,221,140,220], windup:[224,221,106,220], slash:[236,201,115,200], lunge:[304,193,173,193], hurt:[179,197,60,197], cast:[260,197,140,197]}};
  function belalFrame(a){
    if(a.dead||['hurt','knockback','knockdown','lying','rise','getup','death'].includes(a.state))return 'hurt';
    const m=a.attack&&a.attack.mode;
    if(a.ai==='telegraph')return m==='combo'?'windup':'cast';
    if(a.ai==='attack'){if(m!=='combo')return 'cast';const t=1-Math.max(0,a.aiTimer)/(a.attack.active||1);return t<.18?'windup':t<.55?'slash':'lunge';}
    if(a.ai==='recover'&&m==='combo'&&a.aiTimer>(a.attack.recover||0)*.5)return 'lunge';
    if(a.ai==='recover'&&m&&m!=='combo'&&a.aiTimer>(a.attack.recover||0)*.6)return 'cast';
    if(a.state==='walk'||Math.hypot(a.vx||0,a.vy||0)>12)return 'walk'+(1+Math.floor((a.walkDistance||0)/15)%4);
    return 'idle';
  }
  const belalFlashCache={};
  function belalFlash(name,img,w,h){let c=belalFlashCache[name];if(!c){c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));const g=c.getContext('2d');g.drawImage(img,0,0,w,h);g.globalCompositeOperation='source-atop';g.fillStyle='#fff4c8';g.fillRect(0,0,w,h);belalFlashCache[name]=c;}return c;}
  R.drawBelal=function(ctx,a,cam,height){
    const name=a.belalFrame||belalFrame(a),img=R.assets.get('belal-'+name);if(!img)return false;
    const [w,h,ax,ay]=BELAL.frames[name],s=(height||116)/BELAL.frames.idle[1];
    ctx.save();
    if(a.dead)ctx.globalAlpha*=Math.max(0,a.deathTimer/0.75);
    ctx.translate(a.x-cam,a.y-(a.z||0));
    if(['knockdown','lying'].includes(a.state)||a.dead)ctx.rotate(-(a.facing||-1)*Math.min(1,(a.stateT||0)*4)*1.25);
    ctx.scale(a.facing===1?-s:s,s);
    ctx.drawImage(img,-ax,-ay,w,h);
    // Tint only Be'lal's own pixels: source-atop on the live canvas would light a box over the scene.
    if(a.hitFlash>0){ctx.globalAlpha*=Math.min(.65,a.hitFlash*5);ctx.drawImage(belalFlash(name,img,w,h),-ax,-ay,w,h);}
    ctx.restore();
    return true;
  };
  for(const Type of [R.ShadowSoldier,R.ShadowBoss]){const draw=Type.prototype.draw;Type.prototype.draw=function(ctx,cam){
    if(this.kind==='draghkar') {const img=R.assets.get('cg-draghkar');if(img){this.drawTell(ctx,cam);this.drawShadow(ctx,cam,30);ctx.save();ctx.translate(this.x-cam,this.y-this.z-28);ctx.scale(-this.facing,1);const flap=Math.sin(this.flightTime*9)*.10;ctx.rotate(this.ai==='attack'?-.18:flap*.4);ctx.drawImage(img,-64,-45,128,86*(1+flap));ctx.restore();return;}}
    const kind=this.kind;if(kind==='forsaken'&&R.assets.has('belal-idle')){this.drawTell(ctx,cam);this.drawShadow(ctx,cam,this.boss?25:19);R.drawBelal(ctx,this,cam,defs.forsaken.height);}else if(defs[kind]&&R.assets.has(defs[kind].key)){this.drawTell(ctx,cam);this.drawShadow(ctx,cam,this.boss?25:19);R.Puppet.draw(ctx,this,cam,kind);}else draw.call(this,ctx,cam);
  };}
  const loial=R.Loial.prototype.draw;R.Loial.prototype.draw=function(ctx,cam){if(R.assets.has('cg-loial')){R.draw.shadow(ctx,this.x-cam,this.y,28);R.Puppet.draw(ctx,this,cam,'loial');}else loial.call(this,ctx,cam);};
  const twinkle=R.drawTwinkle;R.drawTwinkle=function(ctx,x,y,casting,time){if(!R.Puppet.draw(ctx,{x,y,z:0,facing:1,state:casting?'channel':'idle',stateT:time},0,'twinkle'))twinkle(ctx,x,y,casting,time);};
})();
