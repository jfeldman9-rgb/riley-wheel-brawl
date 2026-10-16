#!/usr/bin/env python3
"""Contact sheet of registered frames cropped to their union bbox, with a baseline and anchor guide.
usage: contact.py built_dir anim_name out.png [cols]"""
import sys,json,numpy as np
from PIL import Image,ImageDraw,ImageFont
d,name,out=sys.argv[1:4];cols=int(sys.argv[4]) if len(sys.argv)>4 else 99
meta=json.load(open(f'{d}/anims.json'));a=[x for x in meta['anims'] if x['name']==name][0]
ims=[Image.open(f'{d}/{n}.png') for n in a['frames']]
al=np.zeros(ims[0].size[::-1],bool)
for im in ims: al|=np.array(im)[:,:,3]>8
ys,xs=np.nonzero(al);box=(max(0,xs.min()-8),max(0,ys.min()-8),min(al.shape[1],xs.max()+8),min(al.shape[0],meta['baseline']+14))
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',15)
cw,ch=box[2]-box[0],box[3]-box[1];n=len(ims);cols=min(cols,n);rows=(n+cols-1)//cols
sheet=Image.new('RGB',(cw*cols,(ch+22)*rows),(26,32,50));dr=ImageDraw.Draw(sheet)
ax=meta['canvas'][0]*0.5
for i,im in enumerate(ims):
    x=(i%cols)*cw;y=(i//cols)*(ch+22)
    cell=Image.new('RGBA',(cw,ch),(30,38,60,255));c=ImageDraw.Draw(cell)
    c.line([(0,meta['baseline']-box[1]),(cw,meta['baseline']-box[1])],fill=(90,110,150),width=2)
    cell.alpha_composite(im.crop(box));sheet.paste(cell.convert('RGB'),(x,y))
    dr.text((x+6,y+ch+2),f"{i+1}  {a['holds'][i]}ms",fill=(255,214,90),font=F)
mx=1800
if sheet.width>mx: sheet=sheet.resize((mx,round(sheet.height*mx/sheet.width)),Image.LANCZOS)
sheet.save(out);print(out,sheet.size)
