#!/usr/bin/env python3
"""Register sliced AI frames onto a fixed canvas, make normal maps, GIF/MP4 loops.
Only uniform scale + translation are applied per sheet/frame (registration). No blur, mirror,
recolor, interpolation or synthetic frames. usage: build_anim.py config.json"""
import sys, json, os, subprocess, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
cfg=json.load(open(sys.argv[1]));root=os.path.dirname(os.path.abspath(sys.argv[1]))
def P(p): return p if os.path.isabs(p) else os.path.join(root,p)
W,H=cfg.get('canvas',[512,512]);BASE=cfg.get('baseline',H-24);TARGET=cfg['target_height']
FONT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',14)
def normal_map(rgba):
    a=rgba[:,:,3].astype(np.float32)/255.0
    inside=a>0.1
    d=ndi.distance_transform_edt(inside);R=cfg.get('nm_radius',18.0)
    h=np.sqrt(np.clip(d/R,0,1))
    lum=(rgba[:,:,:3].astype(np.float32)@np.array([.299,.587,.114]))/255.0
    detail=lum-ndi.gaussian_filter(lum,3)
    h=ndi.gaussian_filter(h,1.2)+detail*cfg.get('nm_detail',0.6)
    gy,gx=np.gradient(h);s=cfg.get('nm_strength',6.0)
    nx=-gx*s;ny=gy*s;nz=np.ones_like(h)   # green = up (OpenGL convention)
    l=np.sqrt(nx*nx+ny*ny+nz*nz);n=np.stack([nx/l,ny/l,nz/l],-1)
    out=((n*0.5+0.5)*255).astype(np.uint8)
    out[~inside]=(128,128,255)
    return np.dstack([out,(a*255).astype(np.uint8)])
def torso_x(arr):
    al=arr[:,:,3]>24;ys,xs=np.nonzero(al)
    if len(ys)==0: return arr.shape[1]/2
    top,bot=ys.min(),ys.max();cut=top+(bot-top)*cfg.get('torso_frac',0.45)
    m=ys<=cut;return xs[m].mean()
outdir=P(cfg['out']);os.makedirs(outdir,exist_ok=True)
frames=[];report=[]
for anim in cfg['anims']:
    sl=json.load(open(P(anim['slices'])+'/slices.json'))
    figs={f['i']:f for f in sl['figures']}
    ref=figs[anim.get('ref',anim['order'][0])]
    refh=anim.get('ref_height') or (ref['y1']-ref['y0'])
    sc=TARGET/refh*anim.get('scale_mul',1.0)
    names=[]
    for k,idx in enumerate(anim['order']):
        f=figs[idx];im=Image.open(P(anim['slices'])+f'/{idx:02d}.png').convert('RGBA')
        fsc=sc*float((anim.get('row_scale',{}) or {}).get(str(f['row']),1.0))
        w,h=im.size;nw,nh=max(1,round(w*fsc)),max(1,round(h*fsc))
        im=im.resize((nw,nh),Image.LANCZOS);arr=np.array(im)
        mode=(anim.get('anchor_override',{}) or {}).get(str(k),anim.get('anchor','torso'))
        ax=torso_x(arr) if mode=='torso' else nw/2
        cx=W*cfg.get('anchor_x',0.5)
        dx,dy=(anim.get('offsets',{}) or {}).get(str(k),[0,0])
        x=round(cx-ax+dx)
        bottom=BASE-(f['row_base']-f['y1'])*fsc if anim.get('ground','row')=='row' else BASE
        y=round(bottom-nh+dy)
        can=Image.new('RGBA',(W,H),(0,0,0,0));can.alpha_composite(im,(max(0,x),max(0,y)),(max(0,-x),max(0,-y)))
        if x<0 or y<0 or x+nw>W or y+nh>H: report.append(f"WARN {anim['name']} frame {k} clipped by canvas ({x},{y},{nw},{nh})")
        nm=f"{anim['name']}_{k:02d}";can.save(f'{outdir}/{nm}.png')
        Image.fromarray(normal_map(np.array(can))).save(f'{outdir}/{nm}_n.png')
        names.append(nm)
        report.append(f"{nm}: src fig {idx} {w}x{h} scale {fsc:.3f} anchor {mode} at ({x},{y})")
    frames.append(dict(name=anim['name'],frames=names,holds=anim['holds'],loop=anim.get('loop',True)))
json.dump(dict(canvas=[W,H],baseline=BASE,anims=frames),open(f'{outdir}/anims.json','w'),indent=1)
open(f'{outdir}/register-log.txt','w').write('\n'.join(report))
# loops
loopdir=P(cfg['loops']);os.makedirs(loopdir,exist_ok=True)
BG=tuple(cfg.get('bg',[24,30,48]))
def plate(img,label):
    b=Image.new('RGBA',(W,H+26),BG+(255,));d=ImageDraw.Draw(b)
    d.line([(0,BASE+1),(W,BASE+1)],fill=(70,82,110),width=2)
    b.alpha_composite(img,(0,0));d.text((8,H+5),label,fill=(255,214,90),font=FONT);return b.convert('RGB')
for a in frames:
    ims=[Image.open(f'{outdir}/{n}.png') for n in a['frames']]
    plates=[plate(im,f"{a['name']}  {i+1}/{len(ims)}  {a['holds'][i]}ms") for i,im in enumerate(ims)]
    plates[0].save(f"{loopdir}/{a['name']}.gif",save_all=True,append_images=plates[1:],duration=a['holds'],loop=0,disposal=1)
    tmp=f'/tmp/mp4_{a["name"]}';shutil.rmtree(tmp,ignore_errors=True);os.makedirs(tmp)
    n=0
    for rep in range(3 if a['loop'] else 2):
        for p,ms in zip(plates,a['holds']):
            for _ in range(max(1,round(ms/1000*60))): p.save(f'{tmp}/{n:05d}.png');n+=1
        if not a['loop']:
            for _ in range(30): plates[-1].save(f'{tmp}/{n:05d}.png');n+=1
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','60','-i',f'{tmp}/%05d.png','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-pix_fmt','yuv420p','-crf','18',f"{loopdir}/{a['name']}.mp4"],check=True)
    # contact strip (every frame, in order)
    strip=Image.new('RGB',(W*len(plates),H+26),BG)
    for i,p in enumerate(plates): strip.paste(p,(i*W,0))
    strip.save(f"{loopdir}/{a['name']}-strip.png")
print('\n'.join(r for r in report if r.startswith('WARN')) or 'no clipping');print('built',[a['name'] for a in frames])
