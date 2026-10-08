# Swing coat and Reed suite - local review candidate

One new fold and three original procedural papers. The coat adds a long flared
outerwear silhouette to a collection whose strongest recent top is the short
Camp-collar shirt. It keeps broad printed front panels, turned shoulder flaps
that read as a shawl-like yoke, narrow folded facings and a continuous lining.
The view is authored folded paper, not a hollow clothing shell.

## Pinned baseline and ownership

Baseline: `3fed818781aad112b52f00d9c87f2e65fa17900f` (main read on 2026-10-08 UTC).
`a89f48c46685acaac645ad1ab48fb5de79110979` is its ancestor;
`3372f86b400fe3c7498ecd85367abd9901a2af19` is an ancestor of that reviewed candidate.
The publication stack had reached main before this checkout was pinned.
Local branch: `design/swing-coat-reed-suite` in the task-7 isolated clone.
No publisher checkout, branch, PR, vendor copy or deployment was modified.
No push, PR, merge, deployment, Claude contact or Grok contact is part of this work.
The parent/publisher owns any later integration. This record is not a live-site claim.

Read AGENTS.md, README.md, HANDOFF.md, prior garment/outfit/external review notes,
construction/paper code and its tests. No .agents/skills exists in this checkout.
The owner's supplied feedback guided selection and board scale.

## Selection and short exploration

- Another waistcoat was considered, then rejected: the existing lapel vest already
  has short, longline and tapered-hem choices. No new waistcoat was implemented.
- The short capelet, shirt and parked bolero/crop were inspected. Another crop
  would add less than a long outer layer, and the prior bolero had weak outfit value.
- A wide-opening coat prototype exposed too much lining and too little print.
  Narrower gate folds briefly trapped the upper flap; the existing engine rejected
  them. The final gates leave clearance and keep substantially broader front panels.
- Selected: one ten-step Swing coat, with no extra shape variants. Its broad upper
  reverse area is a deliberate shawl-like yoke, not a claim to tailored sleeve anatomy.

## Fold and scale

Two side edge turns become narrow reverse-colour facings. Turn over, bring in two
sloping gates, open their free upper corners from the gate crease endpoints, turn
to the back, fold the hem, and turn to reveal. All paper is retained. A printable
[crease map](crease-pattern.svg) is a diagnostic, not a tested physical instruction.

At the suggested 20 cm square, the finished outline is about 14.25 x 17.8 cm.
The [five-piece outfit](evidence/outfit.jpg) compares the coat with the 18 cm shirt,
20 cm wrap skirt, 8 cm hat and 8 cm clutch. All five use explicit starting-square
sizes; no old capture is rescaled. The coat is intentionally longer than the shirt
and narrower than the skirt. It sits beside the coordinated separates on the board;
the continuous backing would cover an underlying top if stacked directly on it.

[Front / angle / back](evidence/views.jpg) show the real folded shoulders and hem.
There is no neck hole, open torso, armhole, fastening or demonstrated wearable cavity.
No physical paper or real phone was tested. Small retained hem tabs and rendering
layer offsets remain visible at close inspection.

## Three-paper capsule

| Paper | Role | Reverse / placement |
| --- | --- | --- |
| Reed study | Three copper seedhead clusters with petrol leaves on pearl; movable accent | Pale matching reeds on petrol; bounded +/-0.25 slide, mirrored in material coordinates |
| Broken twill | Fine alternating diagonal rhythm for coat or hat | Copper field with light twill marks; fixed repeat, quarter-turns |
| Copper fleck | Quiet companion for skirt or small accessory | Pearl with fine irregular flecks; deterministic fixed pattern |

[Full sheets](evidence/papers.jpg) and [coat choices](evidence/paper-choices.jpg).
All are original Canvas drawings. Existing paper drawings, defaults and IDs are
unchanged. The two reliable textures join curated papers; movable Reed study stays
with placement-dependent papers. There are only three additions.

The [turn/slide comparison](evidence/print-turns.jpg) and [reverse comparison](evidence/print-backs.jpg)
use the same coat at 0, 90, 180 and 270 degrees, first centred, then shifted right
and down by 0.125. A shift can expose one reed while hiding another; no universal
best offset is claimed. The shirt and clutch in the outfit use the same Reed study.

## Verification and exact limits

Node 24.16.0; npm ci; strict typecheck; full npm test; production build.
The new check is included in npm test, and the new browser/paper/phone checks have
an exact-PR-head CI workflow ready for future authorized integration.
Existing construction, controller, renderer and layer-separation code are unchanged.

- `check-swing-coat.ts`: area 4, 14 final facets, all resting states valid,
  endpoint continuity, rigid edges (max error 1.12e-15), above-table motion,
  absolute hinge gap <=0.044, local crease vertices, selected-flap tear guard,
  actual visible facings/panels/shoulder flaps, and forward/reverse/cancel/reset
  controller behavior. 161 poses per operation; no strict interior facet piercing.
  [Geometry metrics](evidence/geometry.json).
- Maximum hinge gap 0.0275; maximum stack 0.04; minimum Z 0.0015. Tolerances were
  not relaxed. [Ten half-operation renders](evidence/motion.jpg).
- `check-swing-coat-rendered.ts`: 201 poses per operation using actual Float32
  SheetView buffers. No facet/facet crossings. Synthetic hinge strips do intersect:
  coat-back 140 facet/hinge + 94 hinge/hinge occurrences; coat-hem 9 + 10;
  coat-front 2102 + 2155. These are repeated triangle-pair sample counts, not
  distinct physical collisions. Full [render audit](evidence/rendered-geometry.json).
  This does not establish continuous collision freedom or physical foldability.
- `check-published-geometry.ts` against this pinned baseline: all 46 pre-existing
  variants preserve exact resting states and 41 sampled poses per operation.
  The test enumerates the supplied baseline's designs, so additions do not silently
  compare against the fallback dress. [Preservation result](evidence/preservation.json).
- Production browser: 10 forward, 10 Back, 10 repeated forward; reset during
  motion; each half-operation cancelled; all paper choices, Front/Angle/Back,
  four-turn two-sided print positioning, URL reload, Turntable, Back/refold.
- Pinboard: exact capture positions/UVs, suggested sizes and a separate 16 cm
  repeat capture, five-piece cap, remove/move/tilt plus Undo, reload/reset
  persistence, original v1 fixture preserved, new/old mixed board, byte-identical
  1800 x 2100 PNG export. [Browser result](evidence/browser/results.json).
- Desktop 1180 x 900, phone-sized 390 x 844 and 320 x 568, landscape 844 x 390.
  [Desktop](evidence/desktop-board.jpg) and [phone boards](evidence/phone-board.jpg).
- Phone touch emulation: ten forward taps at both 390 and 320 px, Back, print
  nudge and reverse view; no document overflow or page errors. [Phone result](evidence/browser/phone-results.json).
  At 320 x 568 the display garment becomes small between the existing control
  panels; the board provides the clearer outfit comparison.
- `check-reed-suite-browser.cjs`: deterministic front/back drawings, distinct
  sides, mirrored motif masks at four turns and three offsets; 20,736 pixel samples
  per comparison through the actual front/back texture matrices, <=0.5% mask difference allowing antialiasing/grain.
  [Paper result](evidence/papers/results.json).

The browser checks use isolated Chromium contexts and software WebGL, not the
owner's browser storage. Board arrangements are test fixtures, not an auto-outfit
feature. Source includes no mesh, camera, storage-schema or geometry-limit changes.

## Independent review corrections

The independent review of the initial committed candidate found two small issues:
fold instructions called the broad shoulder flaps sleeves, and a paper-test comment
claimed texture-matrix coverage while comparing raw mirrored canvas columns.
The final candidate calls the flaps a shawl-like yoke and samples both canvases
through their actual texture matrices, asserting material registration first.
No crease coordinate, facet, fold order or geometry tolerance changed. The final
exact reviewed hash and independent verdict are supplied with the portable package.

## Rerun

```sh
npm ci
npm run typecheck
npm test
npm run build
# separate shells, after installing Playwright and its Chromium browser:
npm run dev -- --host 127.0.0.1 --port 5627 --strictPort
npm run preview -- --host 127.0.0.1 --port 5637 --strictPort
node scripts/check-swing-coat-browser.cjs
node scripts/check-swing-coat-phone.cjs
node scripts/check-reed-suite-browser.cjs
# optional independent pinned checkout:
BASELINE_DIR=/path/to/pinned-baseline node --import tsx scripts/check-published-geometry.ts
```

Raw PNG captures stay local and are reproducible; compact contact sheets and metrics
are committed. The final illustrated PDF, exact reviewed commit and portable bundle
are delivered outside the source checkout so they cannot change the reviewed head.
