# Paper Couture: independent outfit brainstorming brief

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
> Available baseline: Dress (straight/A-line/wide, sleeve choices), Box jacket
> (two lengths and cuff choice), Wrap skirt (two wrap directions, band and length
> choices), Lapel vest (short/longline), Pleated skirt (depth choice). Experimental
> garments: Envelope clutch (no locking closure), Bib apron (no ties),
> One-shoulder tunic (no cut neckline), Pointed tabard (no neck opening/ties).
> Accessories: Diamond pin, Two-piece bow with optional third-square centre,
> Neckerchief, Folded patch pocket, Folded tulip, experimental Folded sash.
> The concurrent development collection adds experimental Boat-neck top,
> Cross-wrap top, and a standalone Folded hat. The tops retain continuous paper
> behind their neckline shapes; the hat is a flat crown/brim silhouette without
> an opened cavity or wearable lock. A proposed funnel coat was parked because
> it duplicated the straight dress. Confirm these against the supplied SHA.
> Avoid duplicating these under new names. A cap is welcome only if its geometry
> works; hats, gloves and scarves are examples rather than a checklist.
>
> Paper direction: existing Plum scatter/Corner bloom offer positionable flowers;
> Running stitch, Pinstripe and lining, Indigo lattice and border prints already
> cover textile/graphic directions. New study companions are Oat linen
> (oat/plum), Slate grain (blue-grey/sage), and experimental Ginkgo pairs
> (cream/plum, positionable leaf pairs). Prefer a complementary scale or palette,
> not another large directional arrow. Bow folding worked; the owner disliked
> its automatically selected ink and one late-fold appearance. There is no
> confirmed missing-paper bug and no basis for speculative bow geometry edits.
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
