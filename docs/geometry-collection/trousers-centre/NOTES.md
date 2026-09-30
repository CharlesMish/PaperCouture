# Trousers checkpoint and optional folded bow centre

## Result

The wide-leg trousers experiment is **parked**. The separate folded bow centre is
accepted as a geometry candidate for integration. No trousers entry or unused
trousers builder was added to production code. The existing two-piece bow builder
was not edited.

## Trousers: two attempts, then stop

The first candidate gate-folded the sides to the centre and tried to swing each
lower flap out about an interior diagonal hinge. The fold engine rejected the
first leg: `probe-left-leg: moving paper is still attached away from the crease
(would tear)`. The flap remains attached along the lower part of its side crease,
so pivoting it about that diagonal cannot be a simple rigid fold.

The single repair moved the hinges to the free top boundary. This does pass the
resting-state area, rigidity and connectivity checks. However, it produces small
sleeve-like flaps above a solid centre. The backing occupies the entire centreline
from y = -1 to y = 1; there is no gap between two legs. The actual facet render
[`trousers-parked.png`](trousers-parked.png) makes the failure clear.

This is not a proof that single-square trousers are impossible. It is a reason to
stop this particular batch: the tried gate-flap route would need a different base
or coordinated tuck/squash work before it can earn a trouser silhouette. No cuts,
hidden material, altered engine, or two-sheet substitute were used.

Reproduce the bounded study:

```sh
node --import tsx docs/geometry-collection/trousers-centre/trousers-probe.ts
```

The study is kept here as diagnostic documentation and is not imported by the app.

## Folded centre: API and assembly

`src/fold/bowCentre.ts` exports `buildBowCentre(): Construction`.

Five steps fold a third square into a narrow rectangular centre:

1. Turn the print underneath.
2. Bring the top and bottom edges to the middle with two disjoint valley folds.
3. Fold the left end inward.
4. Overlap it with the right end.
5. Turn over to reveal the clean printed front.

The final rectangle is 0.72 wide by 1.0 tall in model units, with nine retained
material facets. Its print and reverse use the same existing material-coordinate
texture mapping as every other construction. It is a separate folded component;
placing it over the wing tips does not assert a self-locking paper joint.

Suggested assembly, verified by the isolated facet renders:

- Add a third `SheetView` beneath the existing bow assembly root.
- Use group scale **0.85**, local position **(0, 0, 0.08)**, and zero rotation.
- The existing root scale of 0.19 and garment attachment-size multiplier then
  scale all three components together. The centre comes from a slightly smaller
  square than each wing.
- Keep the existing two-piece bow as the default. Offer the centre after the two
  wings are complete. Removing or cancelling the centre must retain both wings.
- Use the current accessory paper for the first integration if independent centre
  paper would expand state handling. Its separate folded crop already creates a
  visible centre on patterned papers; independent centre paper can be added later.
- Keep the centre's actual boundary seam treatment consistent with the existing
  wing seams. In a perfectly head-on plain-paper render, equal colours can merge;
  a subtle physical boundary is useful. Do not draw a decorative fake knot line.

The bow-root placement above is an integration recommendation, not an application
interaction result. The lead owns the actual accessory session and UI integration.

## Evidence and checks

```sh
node --import tsx scripts/check-trousers-centre.ts
```

The centre passes retained material area, rigid transforms, connectivity, closed
edges, adjacent-step endpoint continuity, and 21 animation samples per operation.
All its folds lift toward the visible side. Worst sampled hinge gap is **0.0275**,
below the existing 8 × 0.0055 bound; lowest vertex z is **0.0015**, above the table.
These checks do not prove complete collision-free motion or physical foldability.

`render.html` renders the actual `SheetView` and timeline for the centre and wings.
The rejected trousers image renders the engine's retained material facets directly.
The browser capture used headless Chromium with software WebGL and reported no
page exceptions. It is an isolated geometry study, **not a production app playtest**.

Reviewed images:

- [Centre, front](centre-front.png), [angle](centre-angle.png), [back](centre-back.png), and [mid-fold](centre-midfold.png).
- [Assembled bow on plain paper](bow-plain.png), [Cut-paper mosaic](bow-mosaic.png), and [Reverse garden at an angle](bow-garden.png).
- Four actual grid-paper turns: [0°](bow-rotation-0.png), [90°](bow-rotation-1.png), [180°](bow-rotation-2.png), [270°](bow-rotation-3.png).

The centre fits the join without swallowing the broad wings. Mosaic makes its
separate material crop readily visible. Reverse garden remains restrained and the
rectangle boundary is visible at an angle. Plain paper has the least separation in
the head-on view, as noted above. The two original wing shapes remain unchanged.

Rerun captures with external browser tooling already used by the project:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright \
CHROMIUM_MODULE=/path/to/@sparticuz/chromium/build/index.js \
node docs/geometry-collection/trousers-centre/capture.cjs
```

No real phone, Safari, physical paper, or integrated centre UI was tested here.
