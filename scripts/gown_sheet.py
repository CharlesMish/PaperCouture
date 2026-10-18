#!/usr/bin/env python3
"""Printable folding sheet for the one-shoulder gown: the crease pattern at actual
size on a 190 mm square (fits Letter and A4 with printer margins), then reference
points, the folding sequence and the known physical risks.

    npm run gown-pattern                 # writes docs/gown/crease-pattern.json
    python3 scripts/gown_sheet.py        # writes docs/gown/gown-folding-sheet.pdf

Every line is the engine's own finished crease pattern (scripts/crease_pattern.ts),
the one npm run check:gown verifies. Requires reportlab.
"""

from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib.colors import Color, black
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "docs/gown/crease-pattern.json").read_text())
OUT = ROOT / "docs/gown/gown-folding-sheet.pdf"
SIDE = 190 * mm
INK = Color(0.18, 0.16, 0.15)
VALLEY = Color(0.18, 0.37, 0.62)
MOUNTAIN = Color(0.70, 0.23, 0.17)
GREY = Color(0.55, 0.53, 0.50)

W, H = letter
X0 = (W - SIDE) / 2
Y0 = H - 22 * mm - SIDE


def to_page(p):
    """Sheet coordinates [-1, 1]^2 (y up, top of the gown at the top) to page points."""
    return X0 + (p["x"] + 1) / 2 * SIDE, Y0 + (p["y"] + 1) / 2 * SIDE


def mm_from_corner(p, side_mm):
    return (p["x"] + 1) / 2 * side_mm, (p["y"] + 1) / 2 * side_mm


def crease_page(c: canvas.Canvas):
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(INK)
    c.drawString(X0, H - 12 * mm, "Paper Couture  ·  One-shoulder gown  ·  crease pattern, actual size")
    c.setFont("Helvetica", 8.5)
    c.drawString(X0, H - 16.5 * mm, "Print at 100% (Actual size, no scaling). Cut along the outer square. Top of the gown at the top.")
    c.setStrokeColor(INK)
    c.setLineWidth(0.6)
    c.rect(X0, Y0, SIDE, SIDE)
    for cr in DATA["creases"]:
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
    pts = DATA["points"]
    c.setFont("Helvetica", 6.5)
    c.setFillColor(INK)
    marks = [("T", pts["tipA"], 3, -6), ("T'", pts["tipB"], 2, -7), ("S", pts["sashB"], 2, -7)]
    for name in ("W1", "W2"):
        for sx in (-1, 1):
            marks.append((name, {"x": sx * abs(pts[name]["x"]), "y": pts[name]["y"]}, -9 if sx < 0 else 3, 2.2))
    for name, p, dx, dy in marks:
        x, y = to_page(p)
        c.circle(x, y, 0.9, stroke=0, fill=1)
        c.drawString(x + dx, y + dy, name)
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
        "Print side up (the printed gown). Every crease of the finished gown is drawn, as seen from this side; lines that only",
        "cross some layers (the tuck, the sleeve) appear where those layers lie flat. Fold in the order on the next page.",
        "T, T': the corner-tip fold. T to S: the sash fold (the neckline). W1, W2: the waist pleat's corners.",
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

    head("One-shoulder gown: folding sequence")
    para("A floor-length column with an empire waist, one shoulder, a sash of the paper's other side from that shoulder "
         "across the bodice, a single cap sleeve and a contrast hem band: one uncut square, eight folds and one collapse. "
         "The app shows each step moving; this sheet is for paper. For a reverse-colour gown, fold the hem band behind "
         "in step 1, turn over, and carry on: every later step is the same.")
    steps = [
        "Print side up. Fold the bottom edge up toward you by a narrow band (3.5% of the side): the hem band.",
        "Fold the top-left corner down at 45 degrees, from T on the left edge to T' on the top edge (24% of the side from "
        "the corner each way). It will hide under the sash.",
        "Fold the sash: from T on the left edge to S on the top edge (62.5% of the side from the left), corner toward you. "
        "This crease is the neckline, low on the left, rising to the right shoulder.",
        "Turn over. Fold both side edges to the vertical centre line (a cupboard fold); these panels become the back.",
        "Turn over. On the low side of the neckline the right-hand back panel shows above it: fold that corner of the panel "
        "down behind, along the neckline.",
        "Precrease the waist through all layers: the two horizontal pleat creases at W1 and W2, the side creases from the top "
        "corners of the bodice down to W1, and the short gusset creases out to the folded edges. Then collapse: a pleat "
        "forms across the body, the sides fold behind, and the small gussets swivel between them. "
        "It is the fit-and-flare's waist and moves as one; ease it closed rather than forcing one crease.",
        "Behind the right shoulder, fold the top of the side flap out past the shoulder, along a line from the shoulder "
        "point slanting down and in (54 degrees below horizontal): the cap sleeve.",
    ]
    for i, t in enumerate(steps, 1):
        para(f"{i}.  {t}")
    head("Reference points")
    para("Millimetres from the bottom-left corner (x to the right, y up), print side up. Waist points are the left side; "
         "mirror x for the right: x' = side - x.", 8.5)
    pts = DATA["points"]
    rows = [("hem", "hem band crease (on the left edge)"), ("tipA", "T: tip fold on the left edge"), ("tipB", "T': tip fold on the top edge"),
            ("sashB", "S: sash fold on the top edge"), ("P", "top of the left side crease"), ("W1", "upper waist corner"),
            ("W2", "lower waist corner"), ("corner", "side crease meets the hem")]
    c.setFont("Helvetica-Bold", 8.5)
    cols = [x, x + 18 * mm, x + 82 * mm, x + 118 * mm]
    c.drawString(cols[0], y, "point")
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
    head("What paper has to cope with")
    m = DATA["metrics"]
    para(f"At a 20 cm square: finished about {m['finishedCm']['width']} x {m['finishedCm']['height']} cm; up to "
         f"{m['layers']['max']} layers at the waist corners (thin kami or printer paper is easier than card); the sharpest "
         f"angle is {m['sharpestCreaseAngleDeg']} degrees, where the tip and sash folds meet on the left edge; the shortest "
         f"crease is {m['shortestCreaseMm']} mm, where the two gusset creases nearly meet at the folded edge; the waist pleat "
         f"is {m['waistPleatMm']} mm deep and the skirt widens {m['skirtFlareDeg']} degrees each side. Nothing locks: the waist "
         "can spring open a little, so a press under a book or a small dab of glue inside the pleat may help. This pattern "
         "passes the app's flat-foldability and rigid-motion checks; it has not yet been folded in paper.", 8.5)
    head("If you fold it")
    para("Photograph the front and back beside the app's Display view (same paper side up). Note any step that fought you, "
         "anywhere the paper buckled or would not lie flat, and how far the neckline, sleeve or hem moved from the pattern.", 8.5)


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
    c.setTitle("Paper Couture one-shoulder gown folding sheet")
    c.setAuthor("Paper Couture")
    crease_page(c)
    c.showPage()
    instructions_page(c)
    c.showPage()
    c.save()
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
