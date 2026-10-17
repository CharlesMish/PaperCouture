"""Arrange actual browser pixels; no generated artwork or colour correction."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).parent
OUT = ROOT / 'evidence'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
regular = ImageFont.truetype(FONT, 17)
small = ImageFont.truetype(FONT, 14)
title = ImageFont.truetype(FONT, 26)
papers = [('dusk-wash', 'Dusk wash · candidate'), ('oat-linen', 'Oat linen · existing'),
          ('slate-grain', 'Slate grain · existing'), ('copper-fleck', 'Copper fleck · existing')]
designs = [('swing-coat', 'Swing coat'), ('camp-shirt', 'Camp-collar shirt'),
           ('pleats', 'Pleated skirt'), ('framed-brooch', 'Framed brooch')]


def canvas(height, heading, explanation):
    im = Image.new('RGB', (1360, height), '#f1ebdf')
    draw = ImageDraw.Draw(im)
    draw.text((25, 18), heading, font=title, fill='#332d33')
    draw.text((25, 58), explanation, font=small, fill='#655c60')
    return im, draw


def tile(im, name, x, y, w=320, h=250):
    # Same crop and size for every paper within a garment row. Two garments
    # have a taller toolbar, so crop below it. Retain the full piece and base.
    source = Image.open(OUT / (name + '.png')).convert('RGB')
    top = 150 if name.startswith(('pleats-', 'framed-brooch-')) else 110
    source = ImageOps.contain(source.crop((300, top, 920, 595)), (w, h), Image.Resampling.LANCZOS)
    im.paste(source, (x + (w - source.width) // 2, y + (h - source.height) // 2))


im, draw = canvas(1420, 'Dusk wash: one quiet tonal field',
                  'Actual Chromium / SwiftShader renders · identical camera within each row · geometry and lighting unchanged')
for col, (paper, label) in enumerate(papers):
    x = 25 + col * 335
    draw.text((x, 91), label, font=regular, fill='#332d33')
    for face, dx in [('front', 0), ('back', 163)]:
        flat = Image.open(OUT / f'{paper}-flat-{face}.png').convert('RGB').resize((157, 157), Image.Resampling.LANCZOS)
        im.paste(flat, (x + dx, 119))
    draw.text((x, 282), 'Flat front / reverse · 0°', font=small, fill='#655c60')
for row, (design, label) in enumerate(designs):
    y = 322 + row * 267
    for col, (paper, _) in enumerate(papers):
        x = 25 + col * 335
        draw.text((x, y - 17), label, font=small, fill='#655c60')
        tile(im, f'{design}-{paper}-front', x, y + 3, 320, 245)
draw.text((25, 1393), 'Displayed piece sizes are framed independently by the app: compare papers across a row, not garment/accessory sizing between rows.', font=small, fill='#655c60')
im.save(OUT / 'quiet-comparison.jpg', quality=92)

im, draw = canvas(735, 'Turning the same printed square',
                  'Dusk wash on Swing coat · no artwork repositioning or garment-specific painting · front and back turn together')
for col in range(4):
    x = 25 + col * 335
    draw.text((x, 91), f'Front · {col * 90}°', font=regular, fill='#332d33')
    tile(im, f'swing-coat-dusk-wash-turn-{col}', x, 120)
for col, (design, label) in enumerate(designs):
    x = 25 + col * 335
    draw.text((x, 406), label + ' · back · 0°', font=small, fill='#655c60')
    tile(im, f'{design}-dusk-wash-back', x, 433)
draw.text((25, 706), 'The wash can reverse direction or be hidden by the real fold. Registration refers to the original sheet, not symmetry across each folded seam.', font=small, fill='#655c60')
im.save(OUT / 'turns-and-reverse.jpg', quality=92)
