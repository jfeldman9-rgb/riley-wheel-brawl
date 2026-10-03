#!/usr/bin/env python3
"""Objective cross-frame consistency checks on registered frames (measurement only)."""
import json,glob,numpy as np
from PIL import Image
def lab(rgb):
    rgb=rgb/255.0;rgb=np.where(rgb>0.04045,((rgb+0.055)/1.055)**2.4,rgb/12.92)
    M=np.array([[0.4124,0.3576,0.1805],[0.2126,0.7152,0.0722],[0.0193,0.1192,0.9505]]);xyz=rgb@M.T/np.array([0.9505,1,1.089])
    f=np.where(xyz>0.008856,np.cbrt(xyz),7.787*xyz+16/116);return np.stack([116*f[...,1]-16,500*(f[...,0]-f[...,1]),200*(f[...,1]-f[...,2])],-1)
def stats(path,kind):
    a=np.array(Image.open(path).convert('RGBA')).astype(float);al=a[...,3]>200;px=a[...,:3][al];L=lab(px)
    if kind=='riley':
        skin=(px[:,0]>140)&(px[:,0]>px[:,1]+25)&(px[:,1]>px[:,2]+5)
        coat=L[:,0]<22
        return dict(skin=L[skin].mean(0) if skin.sum()>50 else None,coat=L[coat].mean(0),skinfrac=skin.mean(),coatfrac=coat.mean())
    else:
        red=(px[:,0]>120)&(px[:,0]>px[:,1]*1.8)&(px[:,0]>px[:,2]*1.8)
        hide=(L[:,0]>20)&(L[:,0]<55)&(L[:,1]>3)&(L[:,2]>8)&~red
        return dict(skin=L[hide].mean(0),coat=L[red].mean(0) if red.sum()>50 else None,skinfrac=hide.mean(),coatfrac=red.mean())
out={}
for char,master in [('riley','gen/riley/master-side.png'),('trolloc','gen/trolloc/master-side.png')]:
    ms=stats(master,char);meta=json.load(open(f'frames/built/{char}/anims.json'));rows=[]
    seen=set()
    for a in meta['anims']:
        for n in a['frames']:
            s=stats(f'frames/built/{char}/{n}.png',char)
            d1=float(np.linalg.norm(s['skin']-ms['skin'])) if s['skin'] is not None else None
            d2=float(np.linalg.norm(s['coat']-ms['coat'])) if s['coat'] is not None else None
            rows.append((a['name'],n,d1,d2))
    d1s=[r[2] for r in rows if r[2] is not None];d2s=[r[3] for r in rows if r[3] is not None]
    out[char]=dict(frames=len(rows),skin_dE_mean=round(np.mean(d1s),2),skin_dE_max=round(max(d1s),2),second_dE_mean=round(np.mean(d2s),2),second_dE_max=round(max(d2s),2),
        per_anim={a:dict(skin=round(np.mean([r[2] for r in rows if r[0]==a and r[2] is not None]),2),second=round(np.mean([r[3] for r in rows if r[0]==a and r[3] is not None] or [0]),2)) for a in dict.fromkeys(r[0] for r in rows)})
json.dump(out,open('consistency.json','w'),indent=1);print(json.dumps(out,indent=1))
