# Separate design commissions — ready as briefs, deferred for geometry

Recommendation: let the owner review board spacing and touch feel first. The current
capture model preserves exact finished pieces and supports independent accessory
captures, so a small design study is feasible after that review. It is not yet a
2–3-outfit layout system: the cap remains four, and multiple outfits/mannequin forms
would require their own composition, selection, camera and phone-scale design review.

Paper positioning is a useful direction now. Corner bloom and Plum scatter already
support bounded artwork shifts while preserving the grain and folds. Seed dashes
uses discrete half-cell positions; Arc study has paired front/back sliding contours.
Those capabilities are paper-specific. Do not label arbitrary artwork movable unless
its ground/art layers and front/back registration actually support the operation.

Two briefs below are copyable planning material. No model has been contacted. They
are complementary directions, not promises that a particular model is better suited
to either. Give both commissioners the same owner-approved source SHA and the same
baseline screenshots when the board candidate has been reviewed; record that SHA in
their handoffs. Work independently and never merge/deploy automatically.

## Brief A — for Claude, a quiet botanical outfit study

Create one feasible folded top (or one useful improvement to an existing top if a
new shape cannot pass the gates), one small separate-square accessory, and one or
two complementary papers. Aim for a readable top/bottom outfit with the existing
wrap or pleated skirt. Explore a small botanical motif that the owner can position
to land on a visible panel, plus a quieter coordinating print. Avoid another bow
lookalike, decorative instruction-arrow motifs, and geometry that merely resembles
a wearable opening without constructing one. A pin/tab or scarf-like accent is an
option, not a required category.

Treat every geometry as experimental until reviewed. Preserve the current fold
engine, rigid material facets, original sheet coordinates, reversible controller,
turn-over operations and independent front/back paper. State sheet count, all real
creases, attachment method and any absent physical lock/ties/openings. Prefer fewer
well-explained operations over an impressive but unproved silhouette. Stop and
report if the feasible result is weak; do not disguise a failed construction.

Deliver a draft PR containing the design, tests and the shared evidence package below.
Keep unrelated board, UI, storage, camera and dependency changes out of the branch.

## Brief B — for Grok, a contrasting coordinated study

Create one feasible folded garment that complements existing tops/bottoms without
duplicating Brief A, one small separate-sheet accessory, and one or two papers.
Explore a structured graphic or textile-like direction with restrained scale and a
clear contrast between body and trim. A cap, glove or scarf is optional only if its
crease geometry and visible result work; none is mandatory. Reuse an existing
garment when a new construction cannot be justified. Do not reintroduce parked
trousers, robes or mannequin geometry merely to increase variety.

Use the same geometry/paper preservation rules and stopping criteria as Brief A.
Keep shapes in an explicitly labelled experimental group until owner review; propose
curated papers only when the folded evidence supports their usefulness. Deliver a
separate draft PR with the shared evidence below and no merge/deploy action.

## Shared acceptance/evidence package

1. Before/after at a fixed camera: flat front/back, every intermediate fold and
   completed front/angle/back; all four paper rotations; 390 and 320 portrait plus
   desktop. Show the proposed top/bottom with accessory on the reviewed board.
2. Material-space visibility maps tied to real final facets: which printed regions
   land on body/trim/reverse, which are hidden, and where overlap or severe cropping
   occurs. Identify useful motif placements rather than claiming a universal best
   offset. Distinguish projection maps from rendered visibility/occlusion.
3. For sliding papers: unchanged grain, declared finite bounds, mirrored front/back
   registration at all turns, edge behavior and useful offset examples before/after.
   Test independent garment/accessory/centre paper and offsets, URL/reload, retained
   board capture and PNG. For fixed papers, label placement fixed explicitly.
4. Geometry: retained material area, rigid facets, connectivity, meaningful seams,
   endpoints, sampled collisions/floor clearance, Fold/Back/reset, option-prefix
   continuity, attachment footprint and reasonable board bounds at ±12°. Report
   sampling limits; no claim of real-paper or continuous collision certification.
5. Regression: Node 24 typecheck/test/build, existing relevant rendered workflows,
   saved v1 board restoration, layering/picking, remove/Undo, four-piece limit,
   storage failures and export. Preserve all old papers/IDs and captured snapshots.
6. Curatorial handoff: strongest design first, what to keep, what to park, and a
   plain explanation of “curated” versus “experimental.” Keep experiments visible
   but separate; do not promote every generated design into the curated set.

Existing starting points: `src/fold/garments.ts`, `src/fold/garmentOptions.ts`,
`src/papers/printPosition.ts`, `scripts/check-drafts.ts`,
`scripts/check-curation-ink.cjs`, `scripts/check-positioning-browser.cjs`,
`docs/geometry-collection/drafts/landing-maps.png` and the design-curation notes.
Read AGENTS.md, README.md and HANDOFF.md before implementing anything.

## Bow feedback, precisely scoped

The owner clarified that folding worked. The automatically selected paper looked
like an instructional arrow, and a late fold looked awkward. There is no confirmed
missing-paper bug and no authorization here for speculative bow geometry changes.
Any bow styling proposal must first reproduce the visual problem, compare alternate
papers and show the late fold; keep folding geometry unchanged unless evidence
identifies a concrete defect and a separate review accepts the fix.
