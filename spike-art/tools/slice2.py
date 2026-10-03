#!/usr/bin/env python3
"""Slice a sheet with a KNOWN figure count per row. Pixels are copied, never altered.
Each connected component goes wholly to the figure band holding most of its mass; only a component that
genuinely touches two figures (e.g. blade tip touching a neighbour's tail) is split at the emptiest column.
usage: slice2.py sheet.png outdir --n 8        (single row)   |  --n 6,6  (two rows)"""
import json, os, argparse
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ap=argparse.ArgumentParser();ap.add_argument('sheet');ap.add_argument('out');ap.add_argument('--n',required=True);ap.add_argument('--min-area',type=int,default=60)
a=ap.parse_args();ns=[int(x) for x in a.n.split(',')]
img=np.array(Image.open(a.sheet).convert('RGBA'));A=img[:,:,3];mask=A>24
H,W=mask.shape
# rows: split at the emptiest horizontal lines
if len(ns)==1: bands=[(0,H)]
else:
    rs=ndi.uniform_filter1d(mask.sum(1).astype(float),9);cuts=[]
    for i in range(1,len(ns)):
        c=H*i/len(ns);lo,hi=int(c-H/(3*len(ns))),int(c+H/(3*len(ns)));cuts.append(lo+int(np.argmin(rs[lo:hi])))
    edges=[0]+cuts+[H];bands=list(zip(edges[:-1],edges[1:]))
lab,nl=ndi.label(mask);out=[];os.makedirs(a.out,exist_ok=True);log=[]
for ri,((y0,y1),n) in enumerate(zip(bands,ns)):
    m=mask[y0:y1];cs=ndi.uniform_filter1d(m.sum(0).astype(float),5)
    xs=np.nonzero(cs>0)[0];L,R=xs.min(),xs.max();span=R-L
    cuts=[]
    for i in range(1,n):
        c=L+span*i/n;w=span/(2.5*n);lo,hi=int(c-w),int(c+w);cuts.append(lo+int(np.argmin(cs[lo:hi])))
    edges=[0]+cuts+[W]
    fig=np.full(mask.shape,-1,int)
    sub=lab[y0:y1]
    for cid in np.unique(sub[sub>0]):
        cm=(sub==cid);area=cm.sum()
        if area<a.min_area: continue
        colmass=cm.sum(0);bandmass=[colmass[edges[k]:edges[k+1]].sum() for k in range(n)]
        k=int(np.argmax(bandmass))
        if sorted(bandmass)[-2]>0.08*area:   # genuinely bridges two figures -> split at band edges
            for kk in range(n):
                seg=np.zeros_like(cm);seg[:,edges[kk]:edges[kk+1]]=cm[:,edges[kk]:edges[kk+1]]
                fig[y0:y1][seg]=kk
            log.append(f'row{ri} comp{cid} area {area} split across bands {[int(b) for b in bandmass]}')
        else: fig[y0:y1][cm]=k
    base=None;figs=[]
    for k in range(n):
        fm=fig==k;ys,xs2=np.nonzero(fm)
        if len(ys)==0: log.append(f'row{ri} figure {k} EMPTY');continue
        bx0,bx1,by0,by1=xs2.min(),xs2.max()+1,ys.min(),ys.max()+1
        crop=img[by0:by1,bx0:bx1].copy();crop[~fm[by0:by1,bx0:bx1]]=0
        figs.append((k,bx0,by0,bx1,by1,crop))
    base=max(f[4] for f in figs)
    for k,bx0,by0,bx1,by1,crop in figs:
        idx=len(out);Image.fromarray(crop).save(f'{a.out}/{idx:02d}.png')
        out.append(dict(i=idx,row=ri,x0=int(bx0),y0=int(by0),x1=int(bx1),y1=int(by1),row_base=int(base)))
json.dump(dict(sheet=a.sheet,figures=out,log=log),open(f'{a.out}/slices.json','w'),indent=1)
print(len(out),'figures;',[(f['x1']-f['x0'],f['y1']-f['y0']) for f in out]);print('\n'.join(log))
