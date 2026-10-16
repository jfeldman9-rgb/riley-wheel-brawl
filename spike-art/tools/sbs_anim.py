#!/usr/bin/env python3
"""Animated old-vs-new side-by-side MP4/GIF. Old timing for the kick chain is the measured 1.2 timing (kick 330 ms, roundhouse 650 ms)."""
import json,numpy as np,subprocess,os,shutil
from PIL import Image,ImageDraw,ImageFont
F=lambda s:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',s)
OLD='/tmp/rwb2-src/assets/art/riley16-v2'
PW,PH=640,560;GROUND=520;BG=(24,30,48)
def oldframes(names,holds,h=330):
    out=[]
    for n,ms in zip(names,holds):
        im=Image.open(f'{OLD}/{n}.png');a=np.array(im)[:,:,3];ys,xs=np.nonzero(a>8);im=im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
        sc=h/229;im=im.resize((round(im.width*sc),round(im.height*sc)),Image.LANCZOS);out.append((im,ms,'bottom'))
    return out
def newframes(char,anim,h=330,tgt=380):
    m=json.load(open(f'frames/built/{char}/anims.json'));a=[x for x in m['anims'] if x['name']==anim][0];sc=h/tgt;out=[]
    for n,ms in zip(a['frames'],a['holds']):
        im=Image.open(f'frames/built/{char}/{n}.png');im=im.resize((round(im.width*sc),round(im.height*sc)),Image.LANCZOS)
        out.append((im,ms,m['baseline']*sc))
    return out
def panel(fr,label,sub,col):
    im,ms,base=fr;p=Image.new('RGBA',(PW,PH),BG+(255,));d=ImageDraw.Draw(p)
    d.line([(0,GROUND+1),(PW,GROUND+1)],fill=(70,82,110),width=2)
    if base=='bottom': x=(PW-im.width)//2;y=GROUND-im.height
    else: x=(PW-im.width)//2;y=round(GROUND-base)
    p.alpha_composite(im,(x,y));d.text((14,12),label,fill=col,font=F(24));d.text((14,44),sub,fill=(200,210,230),font=F(15));return p
def timeline(frs):
    t=[];
    for f in frs: t+= [f]*max(1,round(f[1]/1000*60))
    return t
def make(old,new,olab,osub,nlab,nsub,out,reps=3):
    to,tn=timeline(old),timeline(new);L=max(len(to),len(tn))
    tmp='/tmp/sbsa';shutil.rmtree(tmp,ignore_errors=True);os.makedirs(tmp);n=0
    for r in range(reps):
        for i in range(L):
            fo=to[min(i,len(to)-1)];fn=tn[min(i,len(tn)-1)]
            c=Image.new('RGB',(PW*2+10,PH),(10,12,20))
            c.paste(panel(fo,olab,osub,(255,214,90)).convert('RGB'),(0,0));c.paste(panel(fn,nlab,nsub,(140,255,170)).convert('RGB'),(PW+10,0))
            c.save(f'{tmp}/{n:05d}.png');n+=1
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','60','-i',f'{tmp}/%05d.png','-c:v','libx264','-pix_fmt','yuv420p','-crf','18',out+'.mp4'],check=True)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',out+'.mp4','-vf','fps=30,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse','-loop','0',out+'.gif'],check=True)
    print(out)
make(oldframes(['kick','roundhouse'],[330,650]),newframes('riley','riley_combo'),'1.2  kick chain','2 frames (measured: 330 ms + 650 ms)','2.0  3-hit combo','12 frames with wind-up and follow-through','loops/sbs-riley-combo')
make(oldframes([f'walk{i}' for i in range(1,9)],[95]*8),newframes('riley','riley_walk'),'1.2  walk','8 frames, 229 px source','2.0  walk','8 frames, ~480 px source','loops/sbs-riley-walk',reps=4)
make(oldframes(['hurt','lying','getup'],[300,700,300]),newframes('riley','riley_knockdown_full'),'1.2  hurt / down / getup','3 frames','2.0  knockdown + get-up','8 frames','loops/sbs-riley-knockdown',reps=2)
