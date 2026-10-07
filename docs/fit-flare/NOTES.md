# Fit-and-flare dress

Choose **Fit-and-flare dress** under Design (Experiments), or open `?design=fit-flare`. It is an experiment like the other one-square designs: no attachment positions yet, and the suggested starting square is the default 20 cm. Nothing about the existing designs changed.

`steps.png` is every workshop step on the diagnostic grid, then the three display presets. `motion.png` is the waist step in motion. `papers.png` is the curated papers and Sunray pleats, front and back. Regenerate with `DESIGN=fit-flare python3 scripts/capture_dress.py` against a running preview. The crease pattern for folding it from a real square is `../crease-patterns/fit-flare.svg`; `../paper-studies/sheet-map-fit-flare.png` shows which parts of the square reach the front and back.

## The fold

1. Fold the top edge down (the neckline band, reverse colour).
2. Turn over.
3. Fold both side edges in.
4. Turn over.
5. Fold the sides behind and pleat the waist, as one move.
6. Tuck the shoulder points behind.

Proportions, sheet = 2 units wide: 1.51 tall (Classic A-line 1.80), 1.00 across the neckline, 0.80 at the waist, 1.34 at the hem. Each side of the bodice narrows by 10.3° toward the waist; each side of the skirt flares by 16.5°. The values come from `fitFlareGeometry` in `src/fold/fitFlare.ts`.

## Why the waist needed a new kind of step

Every earlier fold is a reflection across one straight line through the whole stack. A nipped waist needs the side of the dress to bend at the waist, inward above and outward below. A crease cannot bend by itself and still fold flat. Two more creases have to meet it at the bend.

Here they are a small horizontal pleat across the waist and a short swivel crease inside the hidden side flap, a gusset. Each waist corner is then a four-crease vertex that satisfies Kawasaki: the upper corner's angles are 100.3°, 111.5°, 79.7° and 68.5°, the lower corner's 111.5°, 73.5°, 68.5° and 106.5°. Opposite angles in each list add to 180°.

No sequence of single-line folds reaches that state, so the engine gained a collapse step (`src/fold/collapse.ts`). It splits the stack into rigid bodies joined by creases. Around a flat-foldable four-crease vertex the fold angles stay locked together: tan(angle/2) of one crease is a fixed multiple of another's, set by the corner's angles. So the whole step is one rigid motion. No piece bends, and every crease reaches 180° together. The end state is exact. The layer order is read from the motion just before it lands flat; if that order loops (paper passing through paper) the step is refused and the error names the layers.

Two things from building it:

- The lower gusset crease has to tilt slightly down (`swivel: -5`). Tilted up, the only rigid motion that closes folds the skirt through the bodice. The layering check caught it: at the lower corner the one crease that folds the other way must sit beside the smallest angle, and tilting the crease down is what puts it there.
- The gusset narrows toward the edge of the paper, so the pleat must be deep enough for it to reach the edge before it closes. Step 3 brings the edge in. That keeps the pleat to 0.145 of height, taken up twice (0.29 in all).

## The motion

The waist step is folded from the front. The skirt stays on the table, the bodice lifts toward you and the pleat forms. The sides then fold away behind and the bodice settles back down. The pleat's creases move first and fastest; the sides finish last. When the side flaps would dip below the table, the whole model rises just enough, and the crease guides rise with it. The step lasts 2.6 s, against 1.15 s for a simple fold.

## Papers on this dress

The papers were drawn for the A-line. Here the front is one bodice panel and one skirt panel under the band, and the reverse shows as the band and as an hourglass on the back. Sunray pleats still reads as pleats but they jump at the waist (the pleat shifts the skirt), and its gold hem rule no longer meets on the back. `../paper-studies/sheet-map-fit-flare.png` is the map for drawing a paper to this dress.

## Tested

Headless Chromium (Playwright, SwiftShader) against the production preview of this branch, Node 22 (the repo asks for 24). Not a phone and not physical paper.

- `npm run typecheck`, the full `npm test` suite, `npm run build`. `npm run check` now includes the fit-and-flare. Its worst hinge opens 0.0032 beyond its resting height; every other construction's numbers are unchanged and stay under the old limit. The collapse's crease loops close at every stage, and Maekawa and Kawasaki hold at every vertex of every checked construction's crease pattern. `check-collection`, `check-sizing` and the other suites pass with the new design in the list.
- By button: all six steps forward and back; Start over during the collapse (step 0); Back during the collapse (returns to step 4); paper and paper turn changed during the collapse; drag-to-fold on the collapse step; Display, Front/Angle/Back, Turntable, paper change on display, Workshop with the step kept. No console errors.
- Design menu: Fit-and-flare dress sits under Experiments; switching to Dress and back keeps its finished folds.
- 390×844 (touch): all six steps by tap, then the display view; no horizontal page scroll.

## Not tested

A real phone; physical paper. The crease pattern passes the local flat-foldability tests, but nobody has folded it. Precreasing every line and then collapsing the waist is probably the easiest way in. The waist corner holds 12 layers, so at an angle its side edge is visibly thicker than the A-line's.

## Knobs

`DEFAULT_FIT_FLARE` in `src/fold/fitFlare.ts`: `collar`, `edgeFold`, `shoulder`, `waist`, `waistY`, `swivel`. Changing them recomputes the waist geometry, the fold-angle rates and the pleat depth. Run `npm test` and `npm run crease-pattern` after any change. Keep `swivel` negative. A wider flare or a deeper nip makes the pleat deeper and the dress shorter.
