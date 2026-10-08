> Submitted external report on frozen PR25. The independent review and current
> combined-candidate status are in [External review](../external-review/NOTES.md).
> Historical test claims below should be read with that review.

# Folded necktie — one developed design (Experimental)

Isolated branch `design/necktie` from the reviewed PR25 source
`21e0fdbd67b8c9c0e2ff7c6b8fb2baf7a851657f`. Nothing was pushed, merged,
published or deployed, and nobody was contacted. Later local capelet/brooch
experiments were not used. The engine, timeline, board, snapshot schema, camera,
renderers, papers and every existing design are unchanged.

## Concepts compared

| Concept | Role | What the real engine showed | Decision |
| --- | --- | --- | --- |
| **Folded necktie** | Neckwear worn over a top | Classic kite-base tie from one square on its diagonal: pointed tip, slim neck, two-crease knot. All gates pass (worst hinge gap 0.0385 of 0.044). | **Developed** |
| Culottes (divided bottom) | Second bottom type | A quartered four-layer strip with both ends swung down on 45° creases gives a real gap between legs from whole-stack valley folds — the parked trousers lacked this. But legs are only 0.4 units below 45° mitred hips (a pagoda outline), a cuff fold reached 0.0605 > 0.044, and a second bottom would compete for a five-slot board. | Recorded; not developed |
| Top-handle bag | Small accessory | A handle needs an enclosed opening. Whole-stack folds of a convex stack leave a convex static part; a loop would need a long strip folded around itself, far past the layer limit. The envelope clutch already fills the role. | Rejected before building |

[Concept facet renders and gate results](concepts/concepts.png) are reproducible:
`node --import tsx docs/necktie/concepts/concept-study.ts docs/necktie/concepts`.
Other tie variants were swept and rejected: narrower kites (15°/7.5°, 18°/8°,
22.5°/9°) and a third narrowing pass all exceeded the layer-gap limit at the knot
(0.0605–0.0935). Only exact angle-bisector kites, whose folded edges land on the
axis without overlap, pass.

## The design

**Role.** A flat paper necktie laid over a top, especially the Cross-wrap top,
whose V of backing frames it like a shirt collar. It is recognisable at outfit
scale by its long tapering blade, square-corner point and knot.

**Front.** One continuous printed blade: the untouched central strip of the
square, widest just above the 90° tip and narrowing to a 0.28-unit knot. The knot
is the narrow end folded down and its point tucked back up — two real creases
form its top and bottom edges; its inner fold lines read as a small "W".
**Back.** The kite flaps meeting on a centre seam, with the reverse showing only
in the tip triangle. **Side.** A flat stack, thickest at the knot (rendered stack height 0.062); the
established `8 × LAYER_GAP` hinge limit is not reached (0.0385).

**Not claimed.** No neck loop, no tied knot, no opening or cavity, no attachment
anchors. Display stands it on its tip; it is a flat board piece.

**Why the diagonal.** Folding along the diagonal uses the square's longest line
(2.83 units) and gives the tip from a true corner. It also puts printed stripes
on the bias, as on a cut cloth tie: Pinstripe and Stripe-and-disc read as
regimental stripes; Indigo lattice as a foulard. The workshop keeps the sheet's
own orientation (the tie lies diagonally, as the clutch does); Display and the
board stand it upright through the existing `garmentDisplayAngle` (+45°).

### Ordered creases

Model coordinates at each step (the square is [-1, 1]²). All folds are valley
folds; turns mirror x. Full values: [`geometry-report.json`](geometry-report.json).

| # | Step | Crease (a → b), moving point | Instruction (abridged) |
| --- | --- | --- | --- |
| 1 | Put the print underneath | turn over | Work from the reverse; knot corner upper-left, tip lower-right |
| 2 | Fold the first edge to the diagonal | (−1, 1) → (−0.1716, −1), moves (−0.859, −1.141) | 22.5° bisector from the knot corner |
| 3 | Fold the other edge to meet it | (−1, 1) → (1, 0.1716) | Flaps meet on the diagonal without overlap |
| 4 | Narrow the first side again | (−1, 1) → (0.3364, −1) | 11.25° from the axis |
| 5 | Narrow the other side | (−1, 1) → (1, −0.3364) | The far corner stays whole: the tip |
| 6 | Turn over to the printed blade | turn over | Kite folds go behind |
| 7 | Fold the narrow end down | perpendicular to the axis, 0.70 from the centre (toward the knot corner) | Starts the knot |
| 8 | Tuck the point back up | parallel, 0.38 lower; **only the knot flap** (`only: 'tie-knot'`) | Ends inside the knot |

Step 8 is the only selective fold. Its flap is the top layer and is attached to
the rest of the paper only along the step-7 crease, so the engine's tear and
trapped-flap checks pass; physically you lift the folded point and turn it back.
The tuck depth must exceed half of the folded point (0.357), or its tip would
rise above the knot; 0.38 keeps it 0.046 inside.

### Size

| | Upright model | Starting square | Board |
| --- | --- | --- | --- |
| Folded necktie | 0.939 × 2.114 | **7 cm** (suggested; choices 5.6/7/8.4/20) | 0.329 × 0.740 |
| Cross-wrap top (existing) | 1.137 × 1.345 | 18 cm | 1.024 × 1.210 |

At 7 cm the tie is 32% of the top's width and 61% of its height; at 320 px it is
24 × 55 px. One intact square; no second sheet.

## Paper

**Neutral proof:** Oat linen (fixed). **Complementary print:** the existing,
positionable Corner bloom — a single flower, so its placement is legible. No new
paper is proposed; paper drawing stays in `src/papers`, untouched.

[Actual-engine visibility maps](visibility/necktie.png) (`scripts/paperLanding.ts`,
96² samples, flat normal projection): the Front shows 30.8% of the print face and
**none of the reverse**; the blade is the central diagonal band of the source
canvas, the knot shows small islands near the knot corner. The Back shows 22.7%
print (kite flaps) and 7.8% reverse (tip triangle). Shares are identical at all
four turns; only their source positions rotate.

| Turn | Original flower on the Front | Aligned offset (nudges) | Aligned on the Front |
| --- | --- | --- | --- |
| 0° | 100% — low on the blade | +6 right, +5 up | 100% |
| 90° | 0.7% — hidden in the flaps | +5 right, −6 up | 100% |
| 180° | 27.8% — wrapped around the knot | −6 right, −5 up | 100% |
| 270° | 4.9% — hidden | −5 right, +6 up | 100% |

"Aligned" centres the flower on the blade axis just below the knot (the
square's centre). It is reachable at every turn within the existing 0.3 slide
limit, in the app's 1/32 steps; leaves crop differently because they turn with
the paper. The 0° original placement is itself a good alternative (a low motif).
[Renders: original, aligned Front and aligned Back at four turns](evidence/bloom-four-turns.jpg).

## Evidence

- [Every fold, half-way and resting, in the app](evidence/progression.jpg)
- [Display Front / Angle / Back, Oat linen](evidence/neutral-front-angle-back.jpg)
- [Outfit before/after and layer check](evidence/outfit-before-after.jpg) ·
  [desktop / 390 / 320](evidence/outfit-viewports.jpg) ·
  [exact 1800 × 2100 composite PNG](evidence/outfit-composite-1280.png)
- [Browser receipt](evidence/browser-results.json) · [saved board](evidence/outfit-board.json)

The outfit is five ordinary captures with existing pieces: Wrap skirt 20 cm,
Cross-wrap top 18 cm, the necktie 7 cm, Folded hat 8 cm and Envelope clutch 8 cm.

## Verification

Node 24.21.0: `npm ci`, `npm run typecheck`, `npm test` (all prior suites plus the
new `check:necktie`), `npm run build` pass. Candidate bundle `index-qYNL8xGB.js`;
CSS is byte-identical to PR25 (`index-BzK8gymu.css`).

`scripts/check-necktie.ts` (real engine): retained area 4 and closed, connected,
rigid facets at all nine states; 81 sampled poses per operation with no edge
stretch, worst hinge gap 0.0385 (limit 0.044, unchanged), lowest point 0.0015,
zero strict triangle piercings; endpoint continuity between every pair of
operations, the flat start and every resting state; controller forward, back,
mid-step reversal (including reversing the tuck) and reset; upright symmetric
silhouette, single tip, tuck inside the knot, untouched printed blade, no reverse
on the Front; visibility shares and Corner bloom alignment.

`scripts/check-necktie-browser.cjs` (compiled preview, fresh Chromium contexts,
SwiftShader): real Fold controls and scrub poses for all eight steps; Back ×2 and
refold reproduce identical material; Start over; Display views; print turns and
nudges never rebuild the folded material; reload restores design, step and paper.
Board: captures preserve vertices, UVs and both-face paper recipes; no horizontal
overflow and every piece inside the margins at 1280, 390 and 320; tie inside its
top; exported PNG equals the rendered scene and is identical across viewports;
remove/Undo and send-backward/Undo restore the exact state; reload restores it
without rewriting the save (121,619 characters). The frozen PR25 production build
loads that saved board unchanged and renders a byte-identical PNG.

Reproduce (two terminals for the previews):

```sh
git checkout design/necktie && npm ci && npm run typecheck && npm test && npm run build
node --import tsx scripts/check-necktie.ts docs/necktie   # rewrites report + map
npx vite preview --port 4301 --strictPort                  # candidate
# frozen PR25: git worktree add ../pc-baseline 21e0fdbd67b8c9c0e2ff7c6b8fb2baf7a851657f,
# then npm ci && npm run build && npx vite preview --port 4201 --strictPort there
BASE_URL=http://127.0.0.1:4301 BASELINE_URL=http://127.0.0.1:4201 \
  CAPTURE_DIR=docs/necktie/evidence node scripts/check-necktie-browser.cjs
```

## Limits and open compromises

- **Nobody folded paper and no physical phone was used.** Browser touch is
  emulated. The checks do not certify continuous collision-free motion or real
  foldability. Suggested prototype: fold a 15 cm square to test the knot tuck through
  the thickest stack and whether the narrow end lies flat without creasing the flaps.
- The tie is broad (width : length ≈ 1 : 2.25) — an origami tie, not a skinny one.
  Slimmer kites exceed the layer limit at the knot; the gate was not relaxed.
- The knot is an inset in the outline, not wider than the neck beneath it (a
  convex whole-stack fold cannot pinch the neck). It reads by its two creases and
  shading; on very quiet papers it is subtle at 320 px.
- The workshop shows the tie diagonally; only Display and the board stand it
  upright. Display places it on its tip.
- Experimental: no accessory anchors, curation or default changes until owner
  review. The browser script is not wired into CI.
