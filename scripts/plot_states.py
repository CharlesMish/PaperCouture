from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
import json, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
states=json.load(open(ROOT / 'docs/states.json'))

def clip(poly, a,b,c):  # keep a*x+b*y+c>=0
    out=[]
    n=len(poly)
    for i in range(n):
        p=poly[i]; q=poly[(i+1)%n]
        vp=a*p[0]+b*p[1]+c; vq=a*q[0]+b*q[1]+c
        if vp>=0: out.append(p)
        if (vp>0 and vq<0) or (vp<0 and vq>0):
            t=vp/(vp-vq); out.append((p[0]+(q[0]-p[0])*t, p[1]+(q[1]-p[1])*t))
    return out

def affine_from(mat, mod):
    # solve map from 3 material points to model points
    import numpy as np
    A=[];B=[]
    for (u,v),(x,y) in zip(mat[:3],mod[:3]):
        A.append([u,v,1]); B.append([x,y])
    M=np.linalg.solve(np.array(A),np.array(B))
    return lambda u,v:(u*M[0,0]+v*M[1,0]+M[2,0], u*M[0,1]+v*M[1,1]+M[2,1])

def draw(ax, facets, below=False):
    fs=sorted(facets,key=lambda f:f['rank'], reverse=below)
    for f in fs:
        mat=[(p['x'],p['y']) for p in f['material']]
        mod=[(p['x'],p['y']) for p in f['model']]
        T=affine_from(mat,mod)
        showFront = (not f['flipped']) != below
        sx = -1 if below else 1
        col = '#f3e3b0' if showFront else '#4a5d7a'
        line = '#9a7b2c' if showFront else '#9fb3d1'
        ax.add_patch(Polygon([(sx*x,y) for x,y in mod], closed=True, fc=col, ec='#222', lw=1.2))
        # grid cells 8x8, numbered row-major from top-left of the FRONT (A1..H8)
        for i in range(8):
            for j in range(8):
                u0=-1+j*0.25; v1=1-i*0.25
                cell=[(u0,v1-0.25),(u0+0.25,v1-0.25),(u0+0.25,v1),(u0,v1)]
                poly=mat
                for (a,b,c) in [(1,0,-u0),(-1,0,u0+0.25),(0,1,-(v1-0.25)),(0,-1,v1)]:
                    poly=clip(poly,a,b,c)
                    if len(poly)<3: break
                if len(poly)<3: continue
                pts=[T(u,v) for u,v in poly]
                ax.add_patch(Polygon([(sx*x,y) for x,y in pts], closed=True, fill=False, ec=line, lw=0.4))
                import numpy as np
                area=abs(0.5*sum(pts[k][0]*pts[(k+1)%len(pts)][1]-pts[(k+1)%len(pts)][0]*pts[k][1] for k in range(len(pts))))
                if area>0.012:
                    cx=np.mean([p[0] for p in pts]); cy=np.mean([p[1] for p in pts])
                    lab='ABCDEFGH'[i]+str(j+1)
                    ax.text(sx*cx,cy,lab if showFront else lab.lower(),fontsize=5,ha='center',va='center',color='#222' if showFront else '#e8eef7')
    ax.set_xlim(-1.4,1.4); ax.set_ylim(-1.2,1.2); ax.set_aspect('equal'); ax.axis('off')

titles=['0 start','1 collar','2 turn','3 sides','4 sleeves','5 hem points','6 turn']
fig,axs=plt.subplots(2,len(states),figsize=(3*len(states),6.2))
for k,s in enumerate(states):
    draw(axs[0][k],s); axs[0][k].set_title(titles[k]+' (top)',fontsize=9)
    draw(axs[1][k],s,below=True); axs[1][k].set_title('seen from below',fontsize=8)
plt.tight_layout(); plt.savefig(ROOT / 'docs/diagnostic-states.png',dpi=110)
