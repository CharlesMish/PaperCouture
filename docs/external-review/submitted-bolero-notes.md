# Shawl bolero — experimental

Isolated branch `experiment/shawl-bolero` from reviewed source
`21e0fdbd67b8c9c0e2ff7c6b8fb2baf7a851657f` (PR25). Not pushed, published,
merged, or deployed. Marked Experimental until owner review.

## Comparison

Three one-square studies were probed in the existing engine. Fold count was
not a goal; a fold had to change the silhouette or expose a paper face.

| Study | Why it lost or won |
| --- | --- |
| Notched stock | Two horizontal folds make a narrow bar. At board scale it repeats the folded sash and does not read as outerwear beside a top. |
| Sailor flap | Two edge folds make a flat rectangle with a short reverse band. It sits too close to the framed brooch and the capelet collar. |
| Shawl bolero | Two diagonal panels leave a reverse collar between them, then a hem crop. The peaked wrap and reverse collar are readable beside a top, skirt, hat and brooch. |

Schematic fronts, print in ivory and reverse in oat: `evidence/chosen-front.svg`,
`evidence/rejected-sailor.svg`, `evidence/rejected-stock.svg`.

## Chosen piece

Role: cropped outer wrap for the fifth board slot. It is laid over a top; it
is not a second top, and it has no reviewed attachment positions.

- Front: peaked shoulders, printed panels, a reverse collar across the upper
  centre, reverse notches at the shoulder folds. The collar opening is
  continuous lining, not a cut or a hole.
- Back: printed body with the hem fold's reverse edge. The panel creases
  remain boundaries, not painted seams.
- Side: cropped, no sleeve flap. The shoulder slope is the diagonal fold.

Starting square: 16 cm. Finished model: 1.5067 by 1.1800 units. Board
footprint: 12.05 cm wide by 9.44 cm tall. Suggested neighbours: boat-neck top
16 cm, pleated skirt 20 cm, folded hat 8 cm, framed brooch 6 cm.

Ordered steps, whole-stack valleys and turns only:

1. `bolero-reverse` — turn the sheet. Print goes underneath.
2. `bolero-panel-left` — valley from (-0.22, 1) to (-0.62, -0.5), moving (-1, 0.2).
3. `bolero-panel-right` — valley from (0.22, 1) to (0.62, -0.5), moving (1, 0.2).
4. `bolero-back` — turn over. Panels stay underneath.
5. `bolero-hem` — valley at y = -0.18, moving the lower panel.
6. `bolero-front` — turn to the printed wrap and reverse collar.

Shape was proved on Oat linen, a fixed quiet paper. Corner bloom is the
alignment study. Its flower is authored at canvas (0.30, 0.66), material
(-0.40, -0.32) at 0°. That point is buried at all four unshifted quarter-turns.
The right-panel centre would need about +0.96 in x, past the paper's 30% slide
limit. The deliberate alignment is a short slide toward the left panel. The workshop
buttons step by 1/32, so the played placement is printX -0.0625, printY -0.0625
(the computed target was -0.08, -0.08). Grain stays put. No new paper, and no
arrow-like motif.

Visibility samples (48×48 landings): front print 702, front reverse 36, back
print 526, back reverse 224. The reverse collar is a small real region, not a
painted band.

## Checks

`npm run check:shawl-bolero` records retained area 4, rigid facets, closed
material edges, endpoint continuity across steps, forward/back/reset and
mid-step reversal, hinge gap 0.033 against the 0.044 floor, no floor dip, and
zero strict interior triangle piercings at 81 samples per operation.
Automated checks do not certify continuous collision-free motion, physical
foldability, or phone feel.

No physical sheet was folded. No physical phone was used. A 16 cm square
prototype would resolve whether the reverse collar reads at arm's length and
whether the two diagonal folds can be made without the panels covering it.

## Limits

The collar is a narrow reverse band, not a deep overlapping shawl. A deeper V
hid the lining under the second panel. Workshop close-ups cannot establish
wardrobe scale; use the board sizes above. New captures of known papers can
be read by the reviewed preview; this draft is required to build the piece.


## Browser evidence

Headless Chromium on the production preview, software WebGL, not a phone and
not physical paper. `scripts/check-shawl-bolero-browser.cjs` folds the real
controls, including Back, and shoots half-steps, Oat linen front/angle/back,
and Corner bloom unshifted and aligned at all four quarter-turns. Reload kept
the finished piece, paper, turn and print position.

The board check pins boat-neck top, pleated skirt, folded hat, framed brooch
and shawl bolero, saves the composite PNG, removes the selected piece, undoes
that removal, and reloads the same five captures. Page overflow at 320px is
recorded in `evidence/browser-results.json`. Workshop close-ups still cannot
establish wardrobe scale; the arranged board is the scale check.
