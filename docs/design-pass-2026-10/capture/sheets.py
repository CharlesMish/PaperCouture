import os, sys
from PIL import Image, ImageDraw, ImageFont
S = os.environ.get('CAPTURE_ROOT', '.'); CAP = S + '/cap'
OUT = os.environ.get('EVIDENCE_DIR', 'docs/design-pass-2026-10/evidence'); os.makedirs(OUT, exist_ok=True)
F = lambda n: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', n)
FB = lambda n: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', n)
BG = (247, 244, 238); INK = (40, 36, 32); MUTED = (110, 102, 92)

def grid(name, title, subtitle, cells, cols, cw, crop, note=None):
    """cells: list of (label, path or None)."""
    ar = (crop[3] - crop[1]) / (crop[2] - crop[0]) if crop else None
    ims = []
    for lab, p in cells:
        im = None
        if p and os.path.exists(p):
            im = Image.open(p).convert('RGB')
            if crop: im = im.crop(crop)
        ims.append((lab, im))
    first = next(im for _, im in ims if im is not None)
    ch = int(cw * first.height / first.width)
    lh, top = 22, 70 if subtitle else 46
    rows = (len(cells) + cols - 1) // cols
    W = Image.new('RGB', (cols * cw + 16, top + rows * (ch + lh + 6) + (28 if note else 8)), BG)
    d = ImageDraw.Draw(W)
    d.text((10, 10), title, fill=INK, font=FB(22))
    if subtitle: d.text((10, 40), subtitle, fill=MUTED, font=F(14))
    for i, (lab, im) in enumerate(ims):
        x, y = 8 + (i % cols) * cw, top + (i // cols) * (ch + lh + 6)
        d.text((x + 4, y + 3), lab, fill=INK, font=F(13))
        if im is not None: W.paste(im.resize((cw - 6, ch), Image.LANCZOS), (x, y + lh))
        else: d.text((x + 8, y + lh + 8), '(blank)', fill=MUTED, font=F(13))
    if note: d.text((10, W.height - 24), note, fill=MUTED, font=F(13))
    W.save(f'{OUT}/{name}', quality=86, optimize=True); print(name, W.size)

STAGE = (160, 110, 1020, 700)
r1 = lambda paper, g, t, v: f'{CAP}/r1/{paper}_{g}_t{t}-{v}.png'
which = sys.argv[1:] or ['flat', 'riso', 'bloom', 'marbled', 'mitten', 'beret', 'outfit']
if 'flat' in which:
    cells = []
    for p, n in [('riso-proof', 'Riso proof'), ('crease-bloom', 'Crease bloom'), ('marbled-endpaper', 'Marbled endpaper')]:
        cells += [(f'{n} · front', f'{S}/flat/{p}-front.png'), (f'{n} · reverse (seen from behind)', f'{S}/flat/{p}-back.png')]
    grid('papers-flat.jpg', 'Three new papers, flat', 'Both faces as drawn by the app (1024 px canvas, stationary grain added).', cells, 6, 300, None)
GS = {'swing-coat': 'Swing coat', 'camp-shirt': 'Camp shirt', 'dress': 'Dress (A-line)', 'jacket': 'Box jacket', 'capelet': 'Capelet', 'framed-brooch': 'Framed brooch',
      'pleats': 'Pleated skirt', 'fit-flare': 'Fit-and-flare', 'vest': 'Lapel vest', 'boat-top': 'Boat-neck top', 'skirt': 'Wrap skirt', 'necktie': 'Necktie',
      'hat': 'Folded hat', 'clutch': 'Clutch', 'wrap-top': 'Cross-wrap top'}
if 'riso' in which:
    cells = [(f'{GS[g]} · {t*90}° {v}', r1('riso-proof', g, t, v)) for g in ['swing-coat', 'camp-shirt', 'dress', 'jacket', 'capelet', 'framed-brooch', 'pleats', 'fit-flare', 'vest', 'boat-top'] for t in (0, 1) for v in ('front', 'back')]
    grid('riso-proof-garments.jpg', 'Riso proof on ten garments', 'Front and back at 0° and 90°. The proof-mark strip sits in the reverse margin, so edge turns show it at every turn; the fade changes direction with the turn.', cells, 8, 230, STAGE)
if 'bloom' in which:
    cells = [(f'Swing coat · {t*90}° {v}', r1('crease-bloom', 'swing-coat', t, v)) for t in range(4) for v in ('front', 'angle', 'back')]
    cells += [(f'{GS[g]} · 0° front', r1('crease-bloom', g, 0, 'front')) for g in ['camp-shirt', 'dress', 'jacket', 'capelet', 'fit-flare', 'wrap-top']]
    grid('crease-bloom.jpg', 'Crease bloom: registered on the Swing coat at 0° only', 'Row 1: designed case. Rows 2–4: the same coat turned 90/180/270°. Row 5–6: other garments at 0°, where the halos are an abstract dyed lattice.', cells, 6, 270, STAGE)
if 'marbled' in which:
    cells = [(f'{GS[g]} · {t*90}° {v}', r1('marbled-endpaper', g, t, v)) for g in ['swing-coat', 'camp-shirt', 'dress', 'skirt', 'pleats', 'necktie', 'hat', 'clutch'] for t in (0, 1) for v in ('front', 'back')]
    grid('marbled-garments.jpg', 'Marbled endpaper on eight garments', 'Front and back at 0° and 90°: combing runs top-to-bottom at 0°, across at 90°. The reverse is plain laid paper.', cells, 8, 230, STAGE)
ST = f'{CAP}/study'
if 'mitten' in which:
    labels = ['1 turn up the cuff', '2 turn over', '3 fold in thumb side', '4 swing out the thumb', '5 fold in far side', '6 round one tip', '7 round the other', '8 turn over: finished']
    cells = [(l, f'{ST}/seq{i}.png') for i, l in enumerate(labels)] + [('4 thumb, halfway', f'{ST}/thumbmid.png')]
    grid('mitten-sequence.jpg', 'Mitten study: fold sequence (engine states, diagnostic grid)', 'Each frame is the finished state of that step, seen on the table. Not registered in the app.', cells, 5, 240, (0, 30, 600, 720))
    cells = []
    for p, n in [('grid', 'Diagnostic grid'), ('oat-linen', 'Oat linen'), ('riso-proof', 'Riso proof'), ('marbled-endpaper', 'Marbled endpaper'), ('plum-scatter', 'Plum scatter')]:
        cells += [(f'{n} · thumb left', f'{ST}/L-{p}.png'), (f'{n} · thumb right', f'{ST}/R-{p}.png')]
    cells += [('Oat linen · back', f'{ST}/L-back.png'), ('Oat linen · angle', f'{ST}/L-angle.png'), ('First attempt (v1)', f'{ST}/v1.png')]
    grid('mitten-finished.jpg', 'Mitten study: finished pair and first attempt', 'Left/right are separate squares with mirrored creases. v1 (last) put the thumb at the wrist; the chosen parameters raise and lengthen it.', cells, 6, 220, (20, 30, 580, 580))
if 'beret' in which:
    cells = [(f'{d} · {p}', f'{ST}/{d}-{p}.png') for d in ['beret', 'beret-round'] for p in ['grid', 'oat-linen', 'marbled-endpaper']]
    cells += [('beret-round · back', f'{ST}/beret-round-back.png')]
    cells += [(f'rounded · step {i+1}', f'{ST}/bseq{i}.png') for i in [0, 2, 3, 6, 7, 8, 11]]
    grid('beret-study.jpg', 'Beret study: kept as a visual study, not recommended', 'Engine-valid, but the flat octagon reads as a cushion or purse rather than a beret.', cells, 7, 220, (0, 120, 600, 560))
if 'outfit' in which:
    O = f'{CAP}/outfit'
    cells = [('Petrol: coat Crease bloom 20 cm, shirt Copper fleck 18, skirt Marbled 20, hat Crease bloom 8', f'{O}/board-petrol.png'),
             ('Proof: shirt Riso 18 cm, pleats Slate grain 20, brooch Riso 4.5, tie Marbled 7, clutch Riso 8', f'{O}/board-proof.png')]
    grid('outfit-boards.jpg', 'Mixed outfits on the pinboard (exported PNG, suggested square sizes)', None, cells, 2, 640, None)
