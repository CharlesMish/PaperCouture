"""Contact sheets from the integration harness's actual browser captures."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).parent
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
title = ImageFont.truetype(FONT, 25)
label = ImageFont.truetype(FONT, 16)
small = ImageFont.truetype(FONT, 13)
papers = [('riso-proof', 'Riso proof'), ('crease-bloom', 'Crease bloom'),
          ('marbled-endpaper', 'Marbled endpaper'), ('dusk-wash', 'Dusk wash')]
designs = [('swing-coat', 'Swing coat'), ('camp-shirt', 'Camp-collar shirt'),
           ('pleats', 'Pleated skirt'), ('framed-brooch', 'Framed brooch')]


def base(height, heading, note):
    image = Image.new('RGB', (1360, height), '#f2ecdf')
    draw = ImageDraw.Draw(image)
    draw.text((24, 17), heading, font=title, fill='#332c32')
    draw.text((24, 54), note, font=small, fill='#655b5b')
    for col, (_, text) in enumerate(papers):
        draw.text((24 + col * 336, 84), text, font=label, fill='#332c32')
    return image, draw


def tile(image, name, x, y):
    source = Image.open(ROOT / 'frames' / (name + '.png')).convert('RGB')
    # Same crop across each garment row. The skirt and brooch have a taller
    # toolbar. No object is repainted, relit or re-rendered for this sheet.
    top = 150 if name.startswith(('pleats-', 'framed-brooch-')) else 120
    source = ImageOps.contain(source.crop((315, top, 985, 695)), (320, 253), Image.Resampling.LANCZOS)
    image.paste(source, (x + (320 - source.width) // 2, y + (253 - source.height) // 2))


image, draw = base(2310, 'October papers · actual production Front and Back',
                   'Same camera and crop across each row · 0° paper turn · registered production picker · headless Chromium / SwiftShader')
for row, (design, text) in enumerate(designs):
    for side_index, side in enumerate(['front', 'back']):
        y = 125 + (row * 2 + side_index) * 269
        for col, (paper, _) in enumerate(papers):
            x = 24 + col * 336
            draw.text((x, y - 15), text + ' · ' + side, font=small, fill='#655b5b')
            tile(image, f'{design}-{paper}-0-{side}', x, y)
draw.text((24, 2284), 'Each garment is framed independently; use the actual pinboard export to judge garment/accessory size. The full harness captures all 128 combinations.', font=small, fill='#655b5b')
image.save(ROOT / 'registered-front-back.jpg', quality=91)

image, draw = base(1225, 'Four paper turns · Swing coat',
                   'Actual front renders · the same printed material and geometry · all corresponding reverse views were also tested and captured')
for q in range(4):
    y = 126 + q * 269
    for col, (paper, _) in enumerate(papers):
        x = 24 + col * 336
        draw.text((x, y - 15), str(q * 90) + '°', font=small, fill='#655b5b')
        tile(image, f'swing-coat-{paper}-{q}-front', x, y)
image.save(ROOT / 'registered-coat-turns.jpg', quality=91)

image = Image.new('RGB', (1360, 430), '#f2ecdf')
draw = ImageDraw.Draw(image)
draw.text((24, 17), 'Both registered mittens · Dusk wash', font=title, fill='#332c32')
draw.text((24, 54), 'Actual production Front/Back after full forward, Back and refold sequences · UI passes are not physical-folding certification', font=small, fill='#655b5b')
for col, (hand, side) in enumerate([('left', 'front'), ('left', 'back'), ('right', 'front'), ('right', 'back')]):
    x = 24 + col * 336
    draw.text((x, 86), f'Mitten {hand} · {side}', font=label, fill='#332c32')
    source = Image.open(ROOT / f'mitten-{hand}-{side}.png').convert('RGB')
    source = ImageOps.contain(source.crop((315, 120, 985, 695)), (320, 280), Image.Resampling.LANCZOS)
    image.paste(source, (x + (320 - source.width) // 2, 116))
draw.text((24, 405), 'Display framing enlarges each piece independently. The five-piece pinboard export shows the actual 6 cm starting-square relationship.', font=small, fill='#655b5b')
image.save(ROOT / 'registered-mittens.jpg', quality=91)

image = Image.new('RGB', (950, 1260), '#f2ecdf')
draw = ImageDraw.Draw(image)
draw.text((25, 19), 'Integration and size board', font=title, fill='#332c32')
draw.text((25, 56), 'All four new papers and both mitten directions · actual 1800 × 2100 PNG export', font=small, fill='#655b5b')
draw.text((25, 78), 'A coverage and proportion check; not a recommended coordinated outfit.', font=small, fill='#655b5b')
source = Image.open(ROOT / 'outfit-composite.png').convert('RGB').resize((900, 1050), Image.Resampling.LANCZOS)
image.paste(source, (25, 111))
draw.text((25, 1182), 'Starting squares: coat 20 cm · shirt 18 cm · brooch 4.5 cm · each mitten 6 cm', font=label, fill='#332c32')
draw.text((25, 1211), 'Five independent captures. The exported PNG is byte-identical after reload.', font=small, fill='#655b5b')
image.save(ROOT / 'integration-size-board.jpg', quality=93)
