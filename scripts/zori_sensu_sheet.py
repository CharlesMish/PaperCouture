#!/usr/bin/env python3
"""Printable folding sheet for the zori and the folding fan: both crease patterns
at actual size (an 8 cm and a 7.5 cm square) and at twice that size for a first
try, then the folding sequences, measurements and risks.

    npm run zori-sensu-pattern            # writes docs/kimono-companions/crease-pattern.json
    python3 scripts/zori_sensu_sheet.py   # writes docs/kimono-companions/zori-and-fan-folding-sheet.pdf

Every line is the engine's own finished crease pattern (scripts/crease_pattern.ts),
the one npm run check:zori-sensu verifies. Requires reportlab.
"""

from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib.colors import Color
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "docs/kimono-companions/crease-pattern.json").read_text())
OUT = ROOT / "docs/kimono-companions/zori-and-fan-folding-sheet.pdf"
INK = Color(0.18, 0.16, 0.15)
VALLEY = Color(0.18, 0.37, 0.62)
MOUNTAIN = Color(0.70, 0.23, 0.17)
W, H = letter


def draw_creases(c, creases, x0, y0, side, width=0.45):
    for cr in creases:
        ax, ay = x0 + (cr["a"]["x"] + 1) / 2 * side, y0 + (cr["a"]["y"] + 1) / 2 * side
        bx, by = x0 + (cr["b"]["x"] + 1) / 2 * side, y0 + (cr["b"]["y"] + 1) / 2 * side
        if cr["mv"] == "V":
            c.setStrokeColor(VALLEY)
            c.setDash(3, 1.6)
        else:
            c.setStrokeColor(MOUNTAIN)
            c.setDash([4, 1.4, 0.8, 1.4])
        c.setLineWidth(width)
        c.line(ax, ay, bx, by)
    c.setDash()


def pattern(c, label, creases, x0, y0, side):
    c.setStrokeColor(INK)
    c.setLineWidth(0.6)
    c.rect(x0, y0, side, side)
    draw_creases(c, creases, x0, y0, side)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(INK)
    c.drawString(x0, y0 + side + 3 * mm, label)


def crease_page(c):
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(18 * mm, H - 14 * mm, "Paper Couture  ·  Zori and folding fan  ·  crease patterns")
    c.setFont("Helvetica", 8.5)
    c.drawString(18 * mm, H - 19 * mm, "Actual size: print at 100% (no scaling). The next two pages give each at twice the size, for a first try; it folds the same.")
    z, s = DATA["zori"], DATA["sensu"]
    zs, ss = z["squareCm"] * 10 * mm, s["squareCm"] * 10 * mm
    top = H - 32 * mm
    pattern(c, f"Zori · {z['squareCm']:g} cm", z["creases"], 30 * mm, top - zs, zs)
    pattern(c, f"Folding fan · {s['squareCm']:g} cm", s["creases"], 125 * mm, top - ss, ss)
    y = 14 * mm
    c.setFont("Helvetica", 8.5)
    c.setStrokeColor(VALLEY)
    c.setDash(3, 1.6)
    c.line(18 * mm, y + 1, 30 * mm, y + 1)
    c.setDash()
    c.setFillColor(INK)
    c.drawString(32 * mm, y - 1.5, "valley (folds toward you)")
    c.setStrokeColor(MOUNTAIN)
    c.setDash([4, 1.4, 0.8, 1.4])
    c.line(72 * mm, y + 1, 84 * mm, y + 1)
    c.setDash()
    c.drawString(86 * mm, y - 1.5, "mountain (folds away)")
    c.setStrokeColor(INK)
    c.setLineWidth(0.8)
    bx = W - 18 * mm - 50 * mm
    c.line(bx, y + 1, bx + 50 * mm, y + 1)
    for t in (0, 50):
        c.line(bx + t * mm, y - 1, bx + t * mm, y + 3)
    c.setFont("Helvetica", 7.5)
    c.drawRightString(bx + 50 * mm, y - 4.5 * mm, "50 mm: measure this before folding")
    c.setFont("Helvetica", 7.8)
    c.drawString(18 * mm, y + 7 * mm, "Print side up as drawn. Every crease of the finished piece is drawn as seen from this side, where its layers lie flat.")


def practice_page(c, key, label):
    d = DATA[key]
    side = 2 * d["squareCm"] * 10 * mm
    x0, y0 = (W - side) / 2, H - 30 * mm - side
    c.setFillColor(INK)
    c.setFont("Helvetica", 8.5)
    c.drawString(x0, H - 14 * mm, "Practice size: print at 100%. Every line is the same pattern at twice the size.")
    pattern(c, f"{label} · {2 * d['squareCm']:g} cm (practice)", d["creases"], x0, y0, side)


def instructions_page(c):
    c.setFillColor(INK)
    x = 18 * mm
    y = H - 18 * mm

    def head(t):
        nonlocal y
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x, y, t)
        y -= 6 * mm

    def para(t, size=8.8, lead=4.2):
        nonlocal y
        c.setFont("Helvetica", size)
        for line in wrap(t, 114):
            c.drawString(x, y, line)
            y -= lead * mm
        y -= 1.4 * mm

    z, s = DATA["zori"], DATA["sensu"]
    f = z["fractions"]
    pct = lambda v: f"{v * 100:.1f}%"
    head("Zori: folding sequence (fold two the same for a pair)")
    para("A flat sandal seen from above: a sole with a thong of the paper's other side from a point near the toe out to "
         "both sides. Measurements are fractions of the square's side. For a reverse-colour sole, fold the band in step 1 "
         "behind instead and turn over before step 2.")
    for i, t in enumerate([
        f"Print side up. Fold the top edge down by {pct(f['band'])}: the thong.",
        "Fold the right half behind onto the left, edges together. The back half's band is now on its outside.",
        f"All layers: from the middle of the top edge, fold each top corner down along a line meeting the side "
        f"{pct(f['cornerDrop'])} below the top. The back half's band comes round to the front as two strips from the point.",
        f"Turn over. Fold both long sides in so the sole is {pct(f['soleWidth'])} wide, centred on the point; the edges meet down the middle.",
        f"Fold the bottom edge up past the top until, seen from the other side, {pct(f['toe'])} shows above the thong's point: the toe.",
        f"Fold the four corners in at 45 degrees: {pct(f['toeRound'])} along each edge at the toe, {pct(f['heelRound'])} at the heel. Turn over.",
    ], 1):
        para(f"{i}.  {t}")
    head("Folding fan: folding sequence")
    para("An open fan of eleven panels from five pleats a side, all from one rivet point. The pleats are easiest pre-creased "
         "on the flat square from the pattern, then collapsed one pair at a time. For a reverse-colour fan, fold step 1 up in "
         "front instead of behind.")
    ang = ", ".join(f"{a:g}" for a in reversed(s["innerFromMiddleDeg"][:-1]))
    for i, t in enumerate([
        "Print side up. Fold the bottom edge up behind to meet the top edge. The middle of the fold is the rivet.",
        f"Fold each top corner behind along a line {pct(s['cornerOffset'])} in from the corner along the top and the same down the side.",
        f"Pleat from the outside in. On each side, from the rivet: valley-fold along the line {s['innerFromMiddleDeg'][-1]:g} degrees from "
        f"the middle and mountain-fold {s['tuckDeg']:g} degrees further out, so the outer paper slides in over a narrow tuck. "
        f"Then the same at {ang} degrees, working inward. Press flat.",
    ], 1):
        para(f"{i}.  {t}")
    head("What paper has to cope with")
    zm, sm = z["metrics"], s["metrics"]
    para(f"The zori: {z['finishedMm']['length']} x {z['finishedMm']['width']} mm from an {z['squareCm']:g} cm square, the thong "
         f"{z['finishedMm']['thong']} mm wide. Up to {zm['layers']['max']} layers in small patches, mostly where the heel is rounded; 8 over half the sole. "
         f"Sharpest angle {zm['sharpestCreaseAngleDeg']:.0f} degrees, nothing narrower than {zm['narrowestFacetMm']} mm. Thin paper "
         "(kami or thinner) helps at the heel.", 8.5)
    para(f"The fan: {sm['finishedCm']['width']} x {sm['finishedCm']['height']} cm from a {s['squareCm']:g} cm square. Up to "
         f"{sm['layers']['max']} layers. The two creases of each tuck are {s['tuckDeg']:g} degrees apart, about "
         f"{s['tuckWidthAtEdgeMm']} mm apart at the edge and closing to nothing at the rivet: "
         f"pre-crease them; the rivet is "
         "where all of them meet, so hold it flat while you collapse each pair. Nothing locks: press the fan under a book.", 8.5)
    para("Both patterns pass the app's flat-foldability and rigid-motion checks. Neither has been folded in paper yet.", 8.5)
    head("If you fold them")
    para("Photograph the front and back beside the app's Display view (same paper side up). Note any step that fought you, "
         "anywhere the paper buckled or would not lie flat, and whether the thong reached both sides.", 8.5)


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
    c.setTitle("Paper Couture zori and folding fan sheet")
    c.setAuthor("Paper Couture")
    crease_page(c)
    c.showPage()
    practice_page(c, "zori", "Zori")
    c.showPage()
    practice_page(c, "sensu", "Folding fan")
    c.showPage()
    instructions_page(c)
    c.showPage()
    c.save()
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
