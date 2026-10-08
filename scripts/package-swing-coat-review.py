"""Assemble review contact sheets from actual browser pixels; never synthesize garments."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
ev=root/'docs/swing-coat/evidence'; raw=ev/'browser'; papers=ev/'papers'
font_path='/System/Library/Fonts/Supplemental/Arial.ttf'
def font(n):
    try: return ImageFont.truetype(font_path,n)
    except OSError: return ImageFont.load_default()
def contact(name,items,cols,tile=(380,350),crop=None):
    rows=(len(items)+cols-1)//cols
    im=Image.new('RGB',(cols*tile[0],rows*tile[1]),'#f1ede4');d=ImageDraw.Draw(im)
    for i,(path,label) in enumerate(items):
        pic=Image.open(path).convert('RGB')
        if crop: pic=pic.crop(crop)
        pic=ImageOps.contain(pic,(tile[0]-24,tile[1]-52))
        x=(i%cols)*tile[0];y=(i//cols)*tile[1]
        im.paste(pic,(x+(tile[0]-pic.width)//2,y+12))
        d.text((x+16,y+tile[1]-29),label,font=font(15),fill='#263e3e')
    im.save(ev/name,quality=93)
contact('views.jpg',[(raw/('broken-twill-'+v+'.png'),v.capitalize()) for v in ['front','angle','back']],3,(390,460),(350,110,960,700))
contact('papers.jpg',[(papers/(p+'-'+s+'.png'),name+' / '+s) for p,name in [('reed-study','Reed study'),('broken-twill','Broken twill'),('copper-fleck','Copper fleck')] for s in ['front','back']],2,(400,410))
contact('paper-choices.jpg',[(raw/(p+'-front.png'),name) for p,name in [('reed-study','Reed study'),('broken-twill','Broken twill'),('copper-fleck','Copper fleck')]],3,(390,460),(350,110,960,700))
contact('print-turns.jpg',[(raw/f'reed-{q}-{shift}-front.png',f'{q*90} degrees / {shift}') for q in range(4) for shift in ['original','shifted']],4,(310,365),(390,115,910,695))
contact('print-backs.jpg',[(raw/f'reed-{q}-{shift}-back.png',f'{q*90} degrees / {shift}') for q in range(4) for shift in ['original','shifted']],4,(310,365),(390,115,910,695))
contact('motion.jpg',[(raw/f'motion-{i:02}.png',f'Step {i} / halfway') for i in range(1,11)],5,(280,275),(230,160,1040,725))
contact('phone-board.jpg',[(raw/f'outfit-five-{w}.png',f'{w}px viewport') for w in [390,320]],2,(340,680))
for source,target in [('outfit-five-composite.png','outfit.jpg'),('outfit-five-desktop.png','desktop-board.jpg')]:
    Image.open(raw/source).convert('RGB').save(ev/target,quality=94)
print('Review contact sheets assembled from rendered evidence.')
