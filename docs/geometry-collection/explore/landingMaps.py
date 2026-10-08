# Draws the landing JSON from landingMaps.ts as a PNG (PR #13 exploration).
# python3 landingMaps.py landing.json landing-maps.png
import json, sys
from PIL import Image, ImageDraw, ImageFont
d=json.load(open(sys.argv[1])); out=sys.argv[2]
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
col={'F':(214,120,60),'B':(60,110,190),'X':(150,80,170),'.':(225,222,215)}
cell=3; S=64*cell; pad=10
ids=list(d.keys())
W=pad+len(ids)*(S+pad); H=40+2*(S+28)+60
im=Image.new('RGB',(W,H),'white'); dr=ImageDraw.Draw(im)
dr.text((pad,6),'Where each face lands at turn 0 (canvas coordinates of that face; top of canvas = top of the drawing)',fill='black',font=F)
for k,g in enumerate(ids):
    x0=pad+k*(S+pad)
    for r,face in enumerate(['print','reverse']):
        y0=40+r*(S+28)
        dr.text((x0,y0-2),f"{d[g]['name']} · {'drawFront' if face=='print' else 'drawBack'}",fill='black',font=F)
        rows=d[g][face]
        for j,row in enumerate(rows):
            for i,ch in enumerate(row):
                dr.rectangle([x0+i*cell,y0+14+j*cell,x0+i*cell+cell-1,y0+14+j*cell+cell-1],fill=col[ch])
ly=40+2*(S+28)+8
for i,(k,t) in enumerate([('F','seen in the Front view'),('B','seen in the Back view'),('X','seen from both'),('.','hidden inside the folds')]):
    dr.rectangle([pad+i*230,ly,pad+i*230+14,ly+14],fill=col[k]); dr.text((pad+i*230+20,ly),t,fill='black',font=F)
im.save(out)
