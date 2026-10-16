#!/usr/bin/env python3
"""Algorithmic normal map from alpha distance + luminance detail. usage: nmap.py in.png out_n.png [radius strength detail]"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
src,dst=sys.argv[1],sys.argv[2];R=float(sys.argv[3]) if len(sys.argv)>3 else 18;S=float(sys.argv[4]) if len(sys.argv)>4 else 6;D=float(sys.argv[5]) if len(sys.argv)>5 else .6
im=np.array(Image.open(src).convert('RGBA'));a=im[:,:,3]/255.0;inside=a>0.1
h=np.sqrt(np.clip(ndi.distance_transform_edt(inside)/R,0,1)) if R>0 else np.zeros(a.shape)
lum=(im[:,:,:3].astype(np.float32)@np.array([.299,.587,.114]))/255.0
h=ndi.gaussian_filter(h,1.2)+(lum-ndi.gaussian_filter(lum,3))*D
gy,gx=np.gradient(h);nx=-gx*S;ny=gy*S;nz=np.ones_like(h);l=np.sqrt(nx*nx+ny*ny+nz*nz)
out=((np.stack([nx/l,ny/l,nz/l],-1)*.5+.5)*255).astype(np.uint8);out[~inside]=(128,128,255)
Image.fromarray(out).save(dst);print(dst)
