#!/usr/bin/env python3
"""Pack registered frames (+ their normal maps) into a trimmed atlas pair for Phaser.
usage: pack.py frames_dir out_prefix [scale]   (scale<1 downsizes uniformly, LANCZOS)"""
import sys, json, os
import numpy as np
from PIL import Image
fd,outp=sys.argv[1],sys.argv[2];S=float(sys.argv[3]) if len(sys.argv)>3 else 1.0
meta=json.load(open(f'{fd}/anims.json'));EX=set(os.environ.get('EXCLUDE','').split(','))
meta['anims']=[a for a in meta['anims'] if a['name'] not in EX]
names=[n for a in meta['anims'] for n in a['frames']]
items=[]
for n in names:
    im=Image.open(f'{fd}/{n}.png');nm=Image.open(f'{fd}/{n}_n.png')
    if S!=1.0:
        sz=(round(im.width*S),round(im.height*S));im=im.resize(sz,Image.LANCZOS);nm=nm.resize(sz,Image.LANCZOS)
    a=np.array(im)[:,:,3];ys,xs=np.nonzero(a>4)
    x0,y0,x1,y1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
    items.append(dict(n=n,im=im.crop((x0,y0,x1,y1)),nm=nm.crop((x0,y0,x1,y1)),x0=int(x0),y0=int(y0),sw=im.width,sh=im.height))
MAXW=4096;pad=2;items.sort(key=lambda i:-i['im'].height)
x=y=rowh=0;W=0
for it in items:
    w,h=it['im'].size
    if x+w+pad>MAXW: x=0;y+=rowh+pad;rowh=0
    it['ax'],it['ay']=x,y;x+=w+pad;rowh=max(rowh,h);W=max(W,x)
H=y+rowh
atl=Image.new('RGBA',(W,H),(0,0,0,0));nat=Image.new('RGBA',(W,H),(128,128,255,0))
frames={}
for it in items:
    atl.paste(it['im'],(it['ax'],it['ay']));nat.paste(it['nm'],(it['ax'],it['ay']))
    w,h=it['im'].size
    frames[it['n']]=dict(frame=dict(x=it['ax'],y=it['ay'],w=w,h=h),rotated=False,trimmed=True,
        spriteSourceSize=dict(x=it['x0'],y=it['y0'],w=w,h=h),sourceSize=dict(w=it['sw'],h=it['sh']))
base=os.path.basename(outp)
atl.save(outp+'.webp',quality=92,method=6);nat.convert('RGB').save(outp+'_n.webp',quality=90,method=6)
json.dump(dict(frames=frames,meta=dict(image=base+'.webp',size=dict(w=W,h=H),scale=1)),open(outp+'.json','w'))
m=dict(meta);m['scale']=S;json.dump(m,open(outp+'.anims.json','w'),indent=1)
print(outp,W,H,len(items),'frames')
