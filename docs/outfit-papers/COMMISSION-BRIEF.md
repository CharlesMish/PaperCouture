# Paper Couture: independent outfit brainstorming brief

Inventory refreshed on 2026-10-12 against main `cedf65c`; the October integration
addendum at the end records the two recovered mitten entries and four new papers.

Copy this brief into a separate Claude or Grok conversation. Give each the same
reviewed source SHA, front/back images, and one mixed-board image. Ask them to work
independently. No external model has been contacted for this study.

> Propose one useful garment, one small accessory, and one or two complementary
> papers for Paper Couture. A strong paper or accessory without a new garment is
> preferable to an implausible fold. Begin with a concise proposal and crease
> sequence; do not generate a large catalogue. Your acceptance image is a mixed
> outfit on our board, with a plausible top/bottom/accessory size relationship.
>
> The owner enjoys positioning blossoms so they land on visible folded panels.
> He wants more dress-up variety, but found the clutch larger than the skirt and
> the apron oversized beside other garments. State each starting square's side
> length relative to a reference garment. Compare changing that sheet size with
> adding folds; do not add arbitrary creases simply to make an item smaller.
> Preserve existing saved captures at their recorded sizes.
>
> Inventory, refreshed against source main `cedf65c` (merged PR31, 2026-10-12).
> Design offers one garment list. Established: Dress (Straight, Classic A-line or
> Wide flare sides; Classic, Lifted or Dropped sleeves), Box jacket (Cropped or
> Longer; plain or printed-corner cuffs), Wrap skirt (either wrap direction; turn-once
> or turn-twice band; Short, Classic or Long), Lapel vest (Short, Longline or Tapered
> hem), Pleated skirt (Shallow, Classic or Deep). Experimental, each with stated
> limits and suggested starting square: Swing coat (20 cm; ten steps, long flared
> front panels and edge-turn facings over continuous lining, broad shoulder yoke;
> no opening or fastening), Fit-and-flare dress (nipped waist folded in one rigid
> `collapse` step; sleeveless, no armholes), Camp-collar shirt (18 cm; folded
> collar points and edge-turn cuffs; continuous backing at the neck), Open-front
> capelet (18 cm), Cross-wrap top (18 cm), Boat-neck top (16 cm), Bib apron (14 cm),
> One-shoulder tunic, Pointed tabard, Envelope clutch (8 cm), Folded hat (8 cm;
> flat crown and brim), Ankle boot toe left / toe right (8 cm each; fold one of
> each for a pair), Folded necktie (7 cm; kite-folded blade and pleated knot, no
> loop) and Framed brooch (4.5 cm; Square or Rectangle frame). Accessories:
> Diamond pin, Two-piece bow with optional third-square centre, Neckerchief,
> Folded patch pocket, Folded tulip, experimental Folded sash. The five-piece
> pinboard places pieces at their starting-square sizes and exports PNG.
> Parked and not selectable: cross-front robe (reverse shawl dominated the chest),
> trousers (gate-flap legs tore or left a solid centre), funnel coat (duplicated
> the straight dress), notch crop and bolero studies. Avoid duplicating any of
> these under new names. A cap, gloves or scarf are examples, not a checklist.
>
> Paper direction: 13 curated papers (Stripe and disc, the default; Running stitch;
> Pinstripe and lining; Plum scatter; Oat linen; Slate grain; Plum seed; Broken
> twill; Copper fleck; Border print; Botanical sprigs; Indigo lattice; Ivory, ink
> border) and 16 visible experimental ones (Reed study, Arc study, Ginkgo pairs, Corner
> bloom, Midnight orchard, Tidal bands, Woven checks, Seed dashes, Ink reverse,
> Reverse garden, Starlit lining, Open stems, Falling chevrons, Sunray pleats,
> Cut-paper mosaic, Wide frame), plus hidden Compass lining and Diagnostic grid.
> Plum scatter, Corner bloom, Ginkgo pairs and Reed study are positionable motifs
> (finite slide); Seed dashes snaps by half-cells. Sunray pleats is the one
> paper engineered to a garment's creases (Classic A-line dress at 0°). Broken
> twill / Copper fleck / Reed study form the Swing coat's coordinated capsule.
> Prefer a complementary scale or palette, not another large directional arrow,
> and say plainly which garment and turn any crease-aware art is drawn for.
>
> Engine constraints: each sheet begins as an uncut square `[-1,1]²`, area 4.
> It retains convex material polygons, rigid transforms and stack ranks.
> Operations are straight-crease folds (`a`, `b`, a moving-side point, valley or
> mountain sense, optionally a previously tagged flap) or full turn-overs.
> Animated facets rotate rigidly about their creases. Keep original UV/material
> coordinates, front/back sides, Fold/Back/reset and existing engine behavior.
> Do not use mesh morphs, cuts, hidden missing paper, cloth simulation, unproved
> joins, or a mannequin to disguise a weak construction. Say plainly if there
> is no opening, tie, fastening, lock, volume or demonstrated physical stability.
>
> Papers are deterministic Canvas drawings in `src/papers`, separate from
> geometry. The reverse canvas is drawn as viewed from behind, so its horizontal
> material direction is mirrored once. Both faces rotate with the sheet. A
> sliding design must separate solid ground from ink, declare finite bounds,
> keep grain stationary and register paired front/back contours at all four
> turns. Use fixed placement when sliding has not been verified. Existing paper
> IDs and drawings must remain exact.
>
> Deliver: (1) sheet counts/sizes and every crease with plain instructions;
> (2) flat front/back, each intermediate fold, completed front/angle/back and a
> mixed outfit at desktop and 390/320 portrait; (3) material-space visibility
> maps plus actual rendered occlusion checks, with useful and poor print offsets;
> (4) retained area, rigidity/connectivity, reversible endpoints, sampled
> collisions/floor clearance, attachment footprint and board-bound tests;
> (5) independent paper/turn/offset, saved capture, reload/Undo and composite PNG
> checks. Distinguish browser emulation, physical-paper trial and real-phone use.
> Keep new geometry experimental until owner review; curate only useful tested
> papers. Park weak/redundant folds. Work in an isolated draft; no merge or deploy.

Optional differentiation: ask Claude for a quiet botanical top/outerwear pairing;
ask Grok for a structured graphic garment/accessory pairing. These are creative
directions, not claims about model strengths. Refresh the inventory against the
reviewed candidate before commissioning implementation; concurrent designs may
still be experimental or rejected.

Starting references: `AGENTS.md`, `README.md`, `HANDOFF.md`,
`src/fold/{engine,garments,accessories,garmentOptions}.ts`,
`src/papers/{types,printPosition}.ts`, `scripts/paperLanding.ts`,
`docs/design-curation/NOTES.md`. The published baseline and development candidate
have different SHAs; record which was actually supplied.

## October integration addendum

The source candidate on `design/october-integration` retains the current-main
inventory above and adds two Experimental main-design entries, Folded mitten
with thumb left/right, plus four visible Experimental papers: Riso proof,
Crease bloom, Marbled endpaper and Dusk wash. The recovered mittens each use
one 6 cm square and finish approximately 4.06 × 4.35 cm; they are flat ornaments
with a low wrist-root thumb and no hand opening. Beret stays unregistered.

Candidate totals: **22 main design entries, six optional accessories, 35 paper
definitions / 33 visible papers**. The original 13 curated papers are unchanged;
20 visible papers are Experimental. Compass lining and the diagnostic grid are
hidden. See [review and rendered evidence](../october-integration/NOTES.md) for
the Riso arithmetic correction, Crease bloom’s limited alignment claim, remaining
mitten connector intersections, and the distinction between numerical checks
and physical-paper feasibility. This candidate is not merged or published.
