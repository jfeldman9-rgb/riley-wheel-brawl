#!/usr/bin/env python3
"""Slice an AI-generated sprite sheet into figures by alpha connected components.
No pixels are altered: crops are exact copies of the generated image.
usage: slice.py sheet.png outdir [--min-area 4000] [--rows N]
writes outdir/NN.png and outdir/slices.json (bbox per figure in sheet coords, row index, row baseline)."""
import sys, json, os, argparse
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ap=argparse.ArgumentParser();ap.add_argument('sheet');ap.add_argument('out');ap.add_argument('--min-area',type=int,default=3000)
ap.add_argument('--rows',type=int,default=0);ap.add_argument('--merge-gap',type=int,default=6)
a=ap.parse_args()
im=Image.open(a.sheet).convert('RGBA');A=np.array(im)[:,:,3]
mask=A>24
# light dilation merges tiny detached bits (sparks, strands) into their figure
lab,n=ndi.label(ndi.binary_dilation(mask,iterations=a.merge_gap))
objs=ndi.find_objects(lab)
comps=[]
for i,sl in enumerate(objs):
    area=int((mask[sl]&(lab[sl]==i+1)).sum())
    if area<a.min_area: continue
    y0,y1,x0,x1=sl[0].start,sl[0].stop,sl[1].start,sl[1].stop
    comps.append(dict(x0=x0,y0=y0,x1=x1,y1=y1,area=area,id=i+1))
# merge components whose x-ranges overlap heavily (same figure split apart) within same row band
def ov(a,b):
    o=min(a['x1'],b['x1'])-max(a['x0'],b['x0']);return o/max(1,min(a['x1']-a['x0'],b['x1']-b['x0']))
# rows: cluster by vertical center
comps.sort(key=lambda c:(c['y0']+c['y1'])/2)
rows=[]
for c in comps:
    cy=(c['y0']+c['y1'])/2
    for r in rows:
        if r['y0']-20<=cy<=r['y1']+20: r['c'].append(c); r['y0']=min(r['y0'],c['y0']); r['y1']=max(r['y1'],c['y1']); break
    else: rows.append(dict(y0=c['y0'],y1=c['y1'],c=[c]))
out=[];os.makedirs(a.out,exist_ok=True)
for ri,r in enumerate(rows):
    cs=sorted(r['c'],key=lambda c:c['x0']);merged=[]
    for c in cs:
        if merged and ov(merged[-1],c)>0.6:
            m=merged[-1];m['ids'].append(c['id'])
            for k in('x0','y0'):m[k]=min(m[k],c[k])
            for k in('x1','y1'):m[k]=max(m[k],c[k])
            m['area']+=c['area']
        else: c=dict(c);c['ids']=[c['id']];merged.append(c)
    base=max(c['y1'] for c in merged)
    for c in merged:
        sub=np.array(im)[c['y0']:c['y1'],c['x0']:c['x1']].copy()
        keep=np.isin(lab[c['y0']:c['y1'],c['x0']:c['x1']],c['ids'])
        sub[~keep]=0  # drop pixels belonging to neighbouring figures only
        idx=len(out);Image.fromarray(sub).save(f"{a.out}/{idx:02d}.png")
        out.append(dict(i=idx,row=ri,x0=c['x0'],y0=c['y0'],x1=c['x1'],y1=c['y1'],area=c['area'],row_base=base))
json.dump(dict(sheet=a.sheet,size=im.size,figures=out),open(f"{a.out}/slices.json",'w'),indent=1)
print(len(out),'figures in',len(rows),'rows:',[ (f['x1']-f['x0'],f['y1']-f['y0']) for f in out])
