"""Lay out actual production screenshots; no generated or retouched scene pixels.

Run scripts/check-board-review-browser.cjs with REVIEW_BASELINE=1 against 6284b4e
and normally against the candidate, using the default before/after directories.
This helper only resizes those screenshots and adds captions outside them.
"""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[3]
parser = argparse.ArgumentParser()
parser.add_argument('--before', type=Path, default=root / '.october-qa/board-review/before')
parser.add_argument('--after', type=Path, default=root / '.october-qa/board-review/after')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
regular = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
bold = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def font(size, strong=False):
    return ImageFont.truetype(bold if strong else regular, size)

def base(height, title, subtitle):
    canvas = Image.new('RGB', (1000, height), '#f6f2eb')
    draw = ImageDraw.Draw(canvas)
    draw.text((34, 23), title, fill='#302f2d', font=font(28, True))
    draw.text((34, 66), subtitle, fill='#5e5b56', font=font(16))
    draw.text((54, 107), 'Before · 6284b4e', fill='#302f2d', font=font(20, True))
    draw.text((554, 107), 'After · review fixes', fill='#302f2d', font=font(20, True))
    return canvas, draw

def paste(canvas, source, x, y, width):
    image = Image.open(source).convert('RGB')
    height = round(image.height * width / image.width)
    image = image.resize((width, height), Image.Resampling.LANCZOS)
    canvas.paste(image, (x, y))
    return height

canvas, draw = base(854, 'Clear save actions and guide focus', 'Matched production renders · Chromium 153 · software WebGL')
for folder, x in [(args.before, 54), (args.after, 554)]:
    paste(canvas, folder / 'save-png-hover.png', x + 40, 153, 340)
draw.text((54, 231), 'Save PNG, hovered', fill='#302f2d', font=font(18))
draw.text((554, 231), 'The primary fill stays visible', fill='#302f2d', font=font(18))
draw.text((54, 281), 'Adjust guides open · Guide 2 at 74% · Move guide off', fill='#302f2d', font=font(18, True))
for folder, x in [(args.before, 54), (args.after, 554)]:
    paste(canvas, folder / 'guide-selection-390.png', x + 26, 318, 370)
draw.text((54, 778), 'The outline remains on the paper.', fill='#5e5b56', font=font(16))
draw.text((554, 778), 'The outline marks Guide 2.', fill='#5e5b56', font=font(16))
draw.text((54, 818), '390 px emulated phone view; five captured pieces unchanged. Selection stays out of PNG exports.', fill='#5e5b56', font=font(14))
canvas.save(args.output / 'review-controls.jpg', quality=88, optimize=True)

canvas, draw = base(731, 'Smaller guides retain their line weight', 'Natural cork · 50% guide · 320 × 568 emulated touch viewport, DPR 2')
for folder, x in [(args.before, 54), (args.after, 554)]:
    paste(canvas, folder / 'natural-guide-50-320.png', x, 151, 392)
draw.text((54, 634), 'Stroke: 0.0055 board units', fill='#5e5b56', font=font(17))
draw.text((554, 634), 'Stroke: 0.011 board units', fill='#5e5b56', font=font(17))
draw.text((54, 678), 'The repaired guide keeps the same stroke at 50%, 100% and 150%; no screen-space enlargement.', fill='#5e5b56', font=font(14))
draw.text((54, 700), 'Actual screenshots, resized equally. Headless Chromium is not a real-phone or Safari test.', fill='#5e5b56', font=font(14))
canvas.save(args.output / 'review-small-guides.jpg', quality=90, optimize=True)
