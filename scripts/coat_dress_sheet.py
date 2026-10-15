#!/usr/bin/env python3
"""Printable folding sheet for the coat-dress: the crease pattern at actual size
on a 190 mm square (fits Letter and A4 with printer margins), then reference
points, the folding sequence and the known physical risks.

    node --import tsx scripts/coat-dress-pattern.ts      # writes docs/coat-dress/crease-pattern.json
    python3 scripts/coat_dress_sheet.py                  # writes docs/coat-dress/coat-dress-folding-sheet.pdf

Every line is the engine's own finished crease pattern (scripts/crease_pattern.ts),
the one npm run check:coat-dress verifies. Requires reportlab.
"""

from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib.colors import Color, black
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "docs/coat-dress/crease-pattern.json").read_text())
OUT = ROOT / "docs/coat-dress/coat-dress-folding-sheet.pdf"
SIDE = 190 * mm
INK = Color(0.18, 0.16, 0.15)
VALLEY = Color(0.18, 0.37, 0.62)
MOUNTAIN = Color(0.70, 0.23, 0.17)
GREY = Color(0.55, 0.53, 0.50)

W, H = letter
X0 = (W - SIDE) / 2
Y0 = H - 22 * mm - SIDE


def to_page(p):
    """Sheet coordinates [-1, 1]^2 (y up, top of the coat at the top) to page points."""
    return X0 + (p["x"] + 1) / 2 * SIDE, Y0 + (p["y"] + 1) / 2 * SIDE


def mm_from_corner(p, side_mm):
    return (p["x"] + 1) / 2 * side_mm, (p["y"] + 1) / 2 * side_mm


def crease_page(c: canvas.Canvas):
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(INK)
    c.drawString(X0, H - 12 * mm, "Paper Couture  ·  Coat-dress  ·  crease pattern, actual size")
    c.setFont("Helvetica", 8.5)
    c.drawString(X0, H - 16.5 * mm, "Print at 100% (Actual size, no scaling). Cut along the outer square. Top of the coat at the top.")
    # paper edge / cut line
    c.setStrokeColor(INK)
    c.setLineWidth(0.6)
    c.rect(X0, Y0, SIDE, SIDE)
    # creases (reverse-colour coat; mountain and valley as seen from this printed side)
    for cr in DATA["reverse"]:
        (ax, ay), (bx, by) = to_page(cr["a"]), to_page(cr["b"])
        if cr["mv"] == "V":
            c.setStrokeColor(VALLEY)
            c.setDash(4.5, 2.5)
        else:
            c.setStrokeColor(MOUNTAIN)
            c.setDash([6, 2, 1.2, 2])
        c.setLineWidth(0.7)
        c.line(ax, ay, bx, by)
    c.setDash()
    # reference points
    pts = DATA["points"]
    c.setFont("Helvetica", 6.5)
    c.setFillColor(INK)
    for name in ("V", "A", "W1", "W2"):
        for sx in (-1, 1):
            p = {"x": sx * abs(pts[name]["x"]), "y": pts[name]["y"]}
            x, y = to_page(p)
            c.circle(x, y, 0.9, stroke=0, fill=1)
            dx = -9 if sx < 0 else 3
            c.drawString(x + dx, y + 2.2, name)
    # legend and scale bar
    y = Y0 - 9 * mm
    c.setFont("Helvetica", 8.5)
    c.setStrokeColor(VALLEY)
    c.setDash(4.5, 2.5)
    c.line(X0, y + 1, X0 + 14 * mm, y + 1)
    c.setDash()
    c.drawString(X0 + 16 * mm, y - 1.5, "valley (folds toward you)")
    c.setStrokeColor(MOUNTAIN)
    c.setDash([6, 2, 1.2, 2])
    c.line(X0 + 62 * mm, y + 1, X0 + 76 * mm, y + 1)
    c.setDash()
    c.drawString(X0 + 78 * mm, y - 1.5, "mountain (folds away)")
    c.setStrokeColor(INK)
    c.setLineWidth(0.8)
    bx = X0 + SIDE - 50 * mm
    c.line(bx, y + 1, bx + 50 * mm, y + 1)
    for t in (0, 50):
        c.line(bx + t * mm, y - 1, bx + t * mm, y + 3)
    c.setFont("Helvetica", 7.5)
    c.drawRightString(bx + 50 * mm, y - 4.5 * mm, "50 mm: measure this before folding")
    c.setFont("Helvetica", 8)
    lines = [
        "Lines are drawn on the side that becomes the collar, the underskirt in the opening and the back yoke (the reverse-colour coat).",
        "Fold with this side up. For a printed coat, start with this side down: the same moves, every crease reversed relative to the paper.",
        "V: shoulder points (four creases meet). A: top of the waist's side creases. W1, W2: the waist pleat's corners.",
    ]
    for i, t in enumerate(lines):
        c.drawString(X0, y - 13 * mm - i * 4 * mm, t)


def instructions_page(c: canvas.Canvas):
    c.setFillColor(INK)
    x = 18 * mm
    y = H - 18 * mm

    def head(t):
        nonlocal y
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x, y, t)
        y -= 6 * mm

    def para(t, size=9, lead=4.4):
        nonlocal y
        c.setFont("Helvetica", size)
        for line in wrap(t, 112 if size <= 9 else 100):
            c.drawString(x, y, line)
            y -= lead * mm
        y -= 1.5 * mm

    head("Coat-dress: folding sequence")
    para("A sailor collar in front that becomes a square cape across the back, fronts that meet under the collar and open "
         "over an underskirt, short sleeves under the collar, a pleated waist and a flared skirt: one uncut square, two "
         "collapses. The app shows each step moving; this sheet is for paper.")
    steps = [
        "Precrease every line on the flat sheet, lines side up: valleys toward you, mountains away. Sharp, accurate creases "
        "matter most at the shoulder points (V) and at the waist corners near the side seams, where creases are 1 to 3 mm apart.",
        "Collapse both shoulders together. Bring the side panels up and in along the side seams (valleys) so the fronts meet at "
        "the centre; the strip above the shoulder line folds down behind (mountain). At each V the triangular wedge between the "
        "two collar creases turns over the shoulder by itself and lies on top: that is the collar. The short sleeves come down "
        "behind it with the back yoke.",
        "Check: the fronts meet just under the collar's V and lean apart toward the hem; the collar points sit over the shoulders.",
        "Collapse the waist. Below the collar, the two horizontal creases form a pleat across the whole body (mountain above, valley "
        "below); at each side the body folds behind along the short side creases, and a small hidden gusset swivels between them. "
        "This is the fit-and-flare's waist; it moves as one, so ease it closed rather than forcing one crease.",
        "Flatten and press. The skirt flares out to the hem corners; the opening between the fronts shows the underskirt.",
    ]
    for i, t in enumerate(steps, 1):
        para(f"{i}.  {t}")
    head("Reference points")
    para("Millimetres from the bottom-left corner (x to the right, y up), left side. Mirror x for the right side: x' = side - x.", 8.5)
    pts = DATA["points"]
    rows = [("V", "shoulder point"), ("X1", "collar crease meets top edge"), ("X2", "collar crease meets side edge"),
            ("A", "top of the waist's side crease"), ("W1", "upper waist corner"), ("W2", "lower waist corner"),
            ("corner", "side seam meets the hem")]
    c.setFont("Helvetica-Bold", 8.5)
    cols = [x, x + 18 * mm, x + 72 * mm, x + 110 * mm]
    c.drawString(cols[0], y, "point")
    c.drawString(cols[1], y, "")
    c.drawString(cols[2], y, "190 mm square")
    c.drawString(cols[3], y, "8.5 in square (215.9 mm)")
    y -= 4.6 * mm
    c.setFont("Helvetica", 8.5)
    for key, label in rows:
        p = pts[key]
        a = mm_from_corner(p, 190)
        b = mm_from_corner(p, 215.9)
        c.drawString(cols[0], y, key)
        c.drawString(cols[1], y, label)
        c.drawString(cols[2], y, f"{a[0]:6.1f}, {a[1]:6.1f}")
        c.drawString(cols[3], y, f"{b[0]:6.1f}, {b[1]:6.1f}")
        y -= 4.4 * mm
    y -= 3 * mm
    p = DATA["params"]
    para(f"Shoulder line at {mm_from_corner({'x': 0, 'y': p['shoulder']}, 190)[1]:.1f} mm (190) / "
         f"{mm_from_corner({'x': 0, 'y': p['shoulder']}, 215.9)[1]:.1f} mm (8.5 in) from the bottom. Side seams lean out "
         f"{p['flare']} degrees. Upper collar crease at {p['collar']} degrees from the shoulder line; lower collar crease at "
         f"{p['collar'] + 90 - p['flare']} degrees.", 8.5)
    head("What paper has to cope with")
    m = DATA["metrics"]
    para(f"At a 20 cm square: finished about {m['finishedCm']['width']} x {m['finishedCm']['height']} cm; up to "
         f"{m['layers']['max']} layers at the waist corners (thin kami or printer paper is easier than card); the sharpest "
         f"angle is {m['sharpestCreaseAngleDeg']} degrees, a sliver at each hem corner; the shortest crease is "
         f"{m['shortestCreaseMm']} mm, beside the side seam at the waist; the waist pleat is {m['waistPleatMm']} mm deep. "
         "Nothing locks: both collapses can spring open a little, so a press under a book or a small dab of glue under "
         "the collar may help. This pattern passes the app's flat-foldability and rigid-motion checks; it has not yet "
         "been folded in paper.", 8.5)
    head("If you fold it")
    para("Photograph the front and back beside the app's Display view (same paper side up). Note any step that fought you, "
         "anywhere the paper buckled or would not lie flat, and how far the collar points or hem moved from the pattern.", 8.5)


def wrap(text: str, width: int):
    words, line, out = text.split(), "", []
    for w_ in words:
        if len(line) + len(w_) + 1 > width:
            out.append(line)
            line = w_
        else:
            line = f"{line} {w_}".strip()
    if line:
        out.append(line)
    return out


def main():
    c = canvas.Canvas(str(OUT), pagesize=letter)
    c.setTitle("Paper Couture coat-dress folding sheet")
    c.setAuthor("Paper Couture")
    crease_page(c)
    c.showPage()
    instructions_page(c)
    c.showPage()
    c.save()
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
