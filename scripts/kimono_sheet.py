#!/usr/bin/env python3
"""Printable folding sheet for the kimono and its obi: the kimono's crease pattern
at actual size on a 190 mm square (fits Letter and A4 with printer margins), then
the folding sequence, the obi (its own small square), measurements and risks.

    npm run kimono-pattern               # writes docs/kimono/crease-pattern.json
    python3 scripts/kimono_sheet.py      # writes docs/kimono/kimono-folding-sheet.pdf

Every line is the engine's own finished crease pattern (scripts/crease_pattern.ts),
the one npm run check:kimono verifies. Requires reportlab.
"""

from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib.colors import Color, black
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "docs/kimono/crease-pattern.json").read_text())
OUT = ROOT / "docs/kimono/kimono-folding-sheet.pdf"
SIDE = 190 * mm
INK = Color(0.18, 0.16, 0.15)
VALLEY = Color(0.18, 0.37, 0.62)
MOUNTAIN = Color(0.70, 0.23, 0.17)
GREY = Color(0.55, 0.53, 0.50)

W, H = letter
X0 = (W - SIDE) / 2
Y0 = H - 22 * mm - SIDE


def to_page(p):
    """Sheet coordinates [-1, 1]^2 (y up, the open edges at the top) to page points."""
    return X0 + (p["x"] + 1) / 2 * SIDE, Y0 + (p["y"] + 1) / 2 * SIDE


def mm_from_corner(p, side_mm):
    return (p["x"] + 1) / 2 * side_mm, (p["y"] + 1) / 2 * side_mm


def draw_creases(c, creases, x0, y0, side):
    for cr in creases:
        ax, ay = x0 + (cr["a"]["x"] + 1) / 2 * side, y0 + (cr["a"]["y"] + 1) / 2 * side
        bx, by = x0 + (cr["b"]["x"] + 1) / 2 * side, y0 + (cr["b"]["y"] + 1) / 2 * side
        if cr["mv"] == "V":
            c.setStrokeColor(VALLEY)
            c.setDash(4.5, 2.5)
        else:
            c.setStrokeColor(MOUNTAIN)
            c.setDash([6, 2, 1.2, 2])
        c.setLineWidth(0.7)
        c.line(ax, ay, bx, by)
    c.setDash()


def crease_page(c: canvas.Canvas):
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(INK)
    c.drawString(X0, H - 12 * mm, "Paper Couture  ·  Kimono  ·  crease pattern, actual size")
    c.setFont("Helvetica", 8.5)
    c.drawString(X0, H - 16.5 * mm, "Print at 100% (Actual size, no scaling). Cut along the outer square. Printed side up as drawn.")
    c.setStrokeColor(INK)
    c.setLineWidth(0.6)
    c.rect(X0, Y0, SIDE, SIDE)
    draw_creases(c, DATA["creases"], X0, Y0, SIDE)
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
        "The printed kimono, print side up. Every crease of the finished kimono is drawn as seen from this side; where a",
        "crease runs through layers folded earlier, it is drawn where those layers lie flat. Fold in the order on the next page.",
        "The horizontal centre line is the hem; the narrow bands at the top and bottom edges become the collar.",
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

    f = DATA["fractions"]
    head("Kimono: folding sequence")
    para("The traditional paper kimono: square sleeves, a collar of the paper's other side down the front from a point at "
         "the neck, and a body that narrows to the hem; one uncut square, six folds and one squash. The obi folds from its "
         "own small square. The app shows each step moving; this sheet is for paper. For a reverse-colour kimono, fold step 1 "
         "the other way (bottom edge up in front) and skip the turn.")
    steps = [
        "Print side up. Crease the vertical centre line. Fold the bottom edge up behind to meet the top edge; turn over. "
        "The fold is the hem; the two open edges are at the top.",
        f"Crease a line across the front layer {f['collarBand'] * 100:.1f}% of the side (of the original square) below the top edge. "
        "Fold both lower corners up at 45 degrees, all layers, until their points just touch that line.",
        "Front layer only: fold the top edge down along the line, over the corner points (the first collar band).",
        "Turn over. Fold the other layer's top edge down the same amount, level with the band underneath.",
        "Fold both top corners down at 45 degrees, all layers, so the banded top edges lie along the centre line. The two "
        "bands meet down the middle and hang past the bottom: the collar.",
        "The squash. Turn the model over (the side triangles are on this side). Lift the lower half of the body up across "
        "the line joining the two side points while opening each side triangle outward into the empty shoulder corner, "
        "and press flat: a wide rectangle across the top. Turn back over: square sleeves.",
    ]
    for i, t in enumerate(steps, 1):
        para(f"{i}.  {t}")
    head("The obi (a separate square, a third of the kimono's)")
    o = DATA["obi"]
    para(f"About {o['squareCm']} cm for a 20 cm kimono. 1. Fold the top and bottom edges over by a narrow band "
         f"({f['obiCord'] * 100:.0f}% of the side) toward you. 2. Turn over. 3. Fold the top and bottom edges to the centre line: "
         "the two bands meet as the cord. 4. Fold the top and bottom behind so the band is a quarter of the side tall, with "
         "the cord in the middle. Place it across the waist, just under the sleeves; it is not tied.", 8.5)
    head("What paper has to cope with")
    m = DATA["metrics"]
    para(f"At a 20 cm square the kimono is about {m['finishedCm']['width']} x {m['finishedCm']['height']} cm (for an outfit "
         f"beside the 20 cm dresses, a 30 cm square gives 15 cm). Up to {m['layers']['max']} layers, only at the two side "
         f"points where the sleeves meet the body; the sharpest angle between creases is {m['sharpestCreaseAngleDeg']:.0f} degrees and "
         f"no crease or facet is shorter than {m['shortestCreaseMm']:.0f} mm. The collar bands are {m['collarBandMm']} mm wide and the "
         f"sleeves {m['sleeveMm']} mm square. Nothing locks: the squash can spring open a little, so press it under a book. "
         "This pattern passes the app's flat-foldability and rigid-motion checks; it has not yet been folded in paper.", 8.5)
    head("If you fold it")
    para("Photograph the front and back beside the app's Display view (same paper side up). Note any step that fought you, "
         "anywhere the paper buckled or would not lie flat, and whether the sleeves came out square.", 8.5)


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
    c.setTitle("Paper Couture kimono folding sheet")
    c.setAuthor("Paper Couture")
    crease_page(c)
    c.showPage()
    instructions_page(c)
    c.showPage()
    c.save()
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
