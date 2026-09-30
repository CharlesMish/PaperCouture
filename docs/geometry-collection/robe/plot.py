import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
D=json.load(open('docs/geometry-collection/robe/probe.json'))
f,axes=plt.subplots(2,len(D),figsize=(4*len(D),10))
for j,c in enumerate(D):
 for k in range(2):
  ax=axes[k,j];ax.set_aspect('equal');ax.set_xlim(-1.3,1.3);ax.set_ylim(-1.15,1.15);ax.set_facecolor('#c2bfb3')
  for p in sorted(c['states'][-1],key=lambda p:p['rank'],reverse=bool(k)):
   pts=[(-v['x'] if k else v['x'],v['y']) for v in p['poly']]
   face=p['flip'] if not k else not p['flip']
   ax.add_patch(Polygon(pts,facecolor='#d1c4a4' if face else '#355f70',edgecolor='#263742',lw=.45))
  ax.set_title(c['name']+(' back' if k else ' front'));ax.axis('off')
f.tight_layout();f.savefig('docs/geometry-collection/robe/probe.png',dpi=130)
