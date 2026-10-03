#!/usr/bin/env python3
"""Old 1.2 vs new 2.0 side-by-side sheets (frames shown unaltered, scaled to a common figure height)."""
import json,numpy as np,subprocess,os,shutil
from PIL import Image,ImageDraw,ImageFont
F=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
OLD='/tmp/rwb2-src/assets/art/riley16-v2';B='frames/built'
def trim(im):
    a=np.array(im)[:,:,3];ys,xs=np.nonzero(a>8);return im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
def row(ims,h,label,sub,bg=(30,38,60)):
    # keep relative scale inside a row: scale by factor that makes the row's reference (first) image height h
    ref=ims[0].height;sc=h/ref;tiles=[im.resize((max(1,round(im.width*sc)),max(1,round(im.height*sc))),Image.LANCZOS) for im in ims]
    W=sum(t.width for t in tiles)+14*len(tiles)+20;H=max(t.height for t in tiles)+70
    c=Image.new("RGB",(max(W,1000),H),bg);d=ImageDraw.Draw(c);x=14
    d.text((14,8),label,fill=(255,214,90),font=F(22));d.text((14,36),sub,fill=(200,210,230),font=F(15))
    for t in tiles:
        c.paste(t,(x,H-t.height-6),t);x+=t.width+14
    return c
def built(char,anim):
    m=json.load(open(f'{B}/{char}/anims.json'));a=[x for x in m['anims'] if x['name']==anim][0]
    return [Image.open(f'{B}/{char}/{n}.png') for n in a['frames']],m
def stack(rows,title,out):
    W=max(r.width for r in rows);H=sum(r.height for r in rows)+70
    c=Image.new('RGB',(W,H),(14,18,30));d=ImageDraw.Draw(c);d.text((14,16),title,fill='white',font=F(28));y=70
    for r in rows: c.paste(r,(0,y));y+=r.height
    if c.width>2400: c=c.resize((2400,round(c.height*2400/c.width)),Image.LANCZOS)
    c.save(out,optimize=True);print(out,c.size)
H=230
# Riley: new frames share one canvas scale, so crop all new frames by a common baseline-aware box per anim
def newrow(char,anim,label,sub,h):
    ims,m=built(char,anim)
    al=np.zeros(ims[0].size[::-1],bool)
    for im in ims: al|=np.array(im)[:,:,3]>8
    ys,xs=np.nonzero(al);box=(0,ys.min(),ims[0].width,m['baseline']+4)
    crops=[trim(im.crop(box)) for im in ims]
    # scale so that a standing guard of this character would be h tall: use canvas scale (target_height)
    tgt=380 if char=='riley' else 560
    sc=h/tgt;tiles=[c.resize((round(c.width*sc),round(c.height*sc)),Image.LANCZOS) for c in crops]
    W=sum(t.width for t in tiles)+14*len(tiles)+20;HH=max(t.height for t in tiles)+70
    c=Image.new('RGB',(W,HH),(24,44,40));d=ImageDraw.Draw(c);x=14
    d.text((14,8),label,fill=(140,255,170),font=F(22));d.text((14,36),sub,fill=(200,230,210),font=F(15))
    for t in tiles: c.paste(t,(x,HH-t.height-6),t);x+=t.width+14
    return c
O=lambda n:trim(Image.open(f'{OLD}/{n}.png'))
rows=[row([O(f'walk{i}') for i in range(1,9)],H,'1.2  WALK  (8 frames)','old painted frames, 229 px source'),
 newrow('riley','riley_walk','2.0  WALK  (8 frames)','new house style, ~480 px source',H),
 row([O('kick'),O('roundhouse')],H,'1.2  3-HIT KICK CHAIN  (2 frames: kick, roundhouse)','the whole chain plays these two images'),
 newrow('riley','riley_combo','2.0  3-HIT COMBO: jab, front kick, spinning hook kick  (12 frames)','wind-up, impact smear, follow-through, recovery',H),
 row([O('hurt'),O('lying'),O('getup')],H,'1.2  HURT + KNOCKDOWN  (3 frames: hurt, lying, getup)',''),
 newrow('riley','riley_hurt','2.0  HURT  (3 frames)','',H),
 newrow('riley','riley_knockdown_full','2.0  KNOCKDOWN + GET-UP  (8 frames)','launched, airborne, slam, lying, roll, kneel, rise, guard',H)]
stack(rows,'Riley: 1.2 (top of each pair) vs 2.0 spike (green rows). Frames unaltered, scaled to a common height.','shots/sbs-riley-old-vs-new.png')
# Trolloc: 1.2 is a single cutout puppet -> show the rig pose board row
rb=Image.open('/workspace/rwb-2/plan/shots/rig-pose-board.png').convert('RGB');tro=rb.crop((0,0,1600,330))
r1=Image.new('RGB',(1600,400),(30,38,60));d=ImageDraw.Draw(r1);d.text((14,8),'1.2  TROLLOC: one painted cutout bent by a puppet rig (idle / walk / attack / hurt / knockdown)',fill=(255,214,90),font=F(22));r1.paste(tro,(0,60))
trows=[r1,newrow('trolloc','trolloc_walk','2.0  WALK  (8 frames)','',260),newrow('trolloc','trolloc_attack','2.0  OVERHEAD CHOP  (6 frames)','ready, wind-up, peak, smear, impact, recover',260),
 newrow('trolloc','trolloc_hurt','2.0  HURT  (2 frames)','',260),newrow('trolloc','trolloc_knockdown','2.0  KNOCKDOWN  (5 frames)','launched, airborne, crash, lying (blade dropped), up to one knee',260)]
stack(trows,'Trolloc: 1.2 puppet vs 2.0 spike frame-by-frame (green rows).','shots/sbs-trolloc-old-vs-new.png')
