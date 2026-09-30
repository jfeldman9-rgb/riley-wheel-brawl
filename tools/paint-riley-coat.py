#!/usr/bin/env python3
"""Bake Riley's Asha'man coat details into the hand-painted PNG frame set.

This intentionally uses only Python's standard library so the authored art can
be reproduced in the offline build container.  It preserves every source pixel
outside the coat/boot overlays and writes lossless RGBA PNGs.
"""
import json, struct, zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/art/riley16'

def read_png(path):
    raw = path.read_bytes(); pos = 8; chunks = []
    while pos < len(raw):
        n = struct.unpack('>I', raw[pos:pos+4])[0]; kind = raw[pos+4:pos+8]
        chunks.append((kind, raw[pos+8:pos+8+n])); pos += n + 12
    hdr = next(v for k,v in chunks if k == b'IHDR'); w,h,depth,color,_,_,_ = struct.unpack('>IIBBBBB', hdr)
    assert depth == 8 and color == 6
    packed = zlib.decompress(b''.join(v for k,v in chunks if k == b'IDAT')); stride=w*4; rows=[]; p=0; prior=bytearray(stride)
    for _ in range(h):
        mode=packed[p]; p+=1; scan=bytearray(packed[p:p+stride]); p+=stride
        for x in range(stride):
            a=scan[x-4] if x>=4 else 0; b=prior[x]; c=prior[x-4] if x>=4 else 0
            if mode==1: scan[x]=(scan[x]+a)&255
            elif mode==2: scan[x]=(scan[x]+b)&255
            elif mode==3: scan[x]=(scan[x]+((a+b)//2))&255
            elif mode==4:
                q=a+b-c; pa=abs(q-a); pb=abs(q-b); pc=abs(q-c); scan[x]=(scan[x]+(a if pa<=pb and pa<=pc else b if pb<=pc else c))&255
        rows.append(scan); prior=scan
    return w,h,rows

def write_png(path,w,h,rows):
    def chunk(k,v): return struct.pack('>I',len(v))+k+v+struct.pack('>I',zlib.crc32(k+v)&0xffffffff)
    body=b''.join(b'\0'+bytes(r) for r in rows)
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(body,9))+chunk(b'IEND',b''))

def blend(rows,x,y,c):
    if y<0 or y>=len(rows) or x<0 or x*4+3>=len(rows[y]): return
    i=x*4; a=c[3]/255; oa=rows[y][i+3]/255; out=a+oa*(1-a)
    if not out: return
    for j in range(3): rows[y][i+j]=round((c[j]*a+rows[y][i+j]*oa*(1-a))/out)
    rows[y][i+3]=round(out*255)

def poly(rows,pts,c):
    ymin=max(0,int(min(y for x,y in pts))); ymax=min(len(rows)-1,int(max(y for x,y in pts)))
    for y in range(ymin,ymax+1):
        xs=[]
        for (x1,y1),(x2,y2) in zip(pts,pts[1:]+pts[:1]):
            if (y1<=y<y2) or (y2<=y<y1): xs.append(x1+(y-y1)*(x2-x1)/(y2-y1))
        xs.sort()
        for a,b in zip(xs[::2],xs[1::2]):
            for x in range(int(a),int(b)+1): blend(rows,x,y,c)

def disc(rows,cx,cy,r,c):
    for y in range(int(cy-r),int(cy+r)+1):
        for x in range(int(cx-r),int(cx+r)+1):
            if (x-cx)**2+(y-cy)**2<=r*r: blend(rows,x,y,c)

meta=json.loads((ART/'frames.json').read_text())['frames']
for name,d in meta.items():
    if name == 'portrait': continue
    path=ART/(name+'.png'); w,h,rows=read_png(path); ax=d['ax']; ay=d['ay']
    # Tailored, knee-length split skirts. Translucency retains painted folds.
    top=max(40,int(h*.34)); waist=max(top+18,int(h*.48)); knee=min(ay-18,int(h*.78)); half=max(18,int(w*.13))
    poly(rows,[(ax-half,top),(ax+half,top),(ax+half+5,waist),(ax+5,knee),(ax,knee-13),(ax-5,knee),(ax-half-5,waist)],(5,8,14,205))
    # High standing collar and fastened chest with cool silver piping.
    poly(rows,[(ax-18,top-18),(ax-3,top-25),(ax,top-4),(ax-18,top-1)],(4,7,12,235))
    poly(rows,[(ax+18,top-18),(ax+3,top-25),(ax,top-4),(ax+18,top-1)],(4,7,12,235))
    for yy in range(top+5,waist,10): disc(rows,ax,yy,2,(180,191,202,245))
    # Sword pin (silver) and red-and-gold Dragon pin, one on each point.
    poly(rows,[(ax-13,top-17),(ax-10,top-19),(ax-4,top-8),(ax-7,top-7)],(211,226,235,255))
    disc(rows,ax+10,top-13,4,(156,24,31,255)); poly(rows,[(ax+7,top-13),(ax+13,top-16),(ax+11,top-9)],(244,186,55,255))
    # A deliberately authored eight-pose sole cadence: each stance sole shifts
    # 19 source pixels (=8 game units) back per frame while the torso advances.
    if name.startswith('walk'):
        number=int(name[4:]); phase=(number-1)%4; sole=ax+40-phase*19
        poly(rows,[(sole-13,ay-5),(sole+10,ay-5),(sole+15,ay-2),(sole+15,ay-1),(sole-14,ay-1)],(4,6,9,255))
        disc(rows,sole-8,ay-5,3,(25,29,34,255))
        # The free boot describes contact/down/passing/up on the opposite half
        # of the cycle; its small steel welt makes all eight silhouettes unique.
        free=ax-30+phase*15 if number<=4 else ax+28-phase*15
        lift=(0,7,15,8)[phase]
        poly(rows,[(free-9,ay-7-lift),(free+8,ay-7-lift),(free+12,ay-4-lift),(free-9,ay-3-lift)],(7,9,14,245))
        poly(rows,[(free-8,ay-4-lift),(free+11,ay-4-lift),(free+11,ay-3-lift),(free-8,ay-3-lift)],(105,114,122,220))
    write_png(path,w,h,rows)
