# Companion design studies

This draft is a separate descendant of the frozen outfit-proportions candidate
`574b2b10cc2894586f2ee3f8c9496035365e6408` (PR24). It does not update that branch,
the published source, or either existing site preview. The five-piece limit,
3.6 × 4.2 board, capture scaling, saved snapshot format and export camera remain
those of PR24.

## Review of the supplied proposals

The complete supplied message, both archive levels, six reference images and
four archive diagrams were inspected before choosing work. Raw supplied files
remain outside this repository. The archive uses a separate Python fold model;
its measurements and collision claims are proposals, not application evidence.

The generated reference images offer a useful oat/plum/slate palette, clear
garment proportions and small accents. Their curved necklines, tailored sleeves,
raised flowers, flared hip panels and cylindrical cuff do not establish a
construction from intact squares. The three application images also document
existing PR24 designs, including a funnel-coat study already marked rejected.

| Proposal | Decision and reason |
| --- | --- |
| Collared capelet | Retain experimentally at 14 cm. Its broad reverse collar and downward-widening body work over the taller cross-wrap top; it would conceal most of the shorter boat-neck top. |
| Mirrored ankle boots | Retain experimentally at 8 cm each, as two independently folded squares and two captures. The proposed relative boot size was too large. |
| Cufflet / band cuff | Defer: a flat strip repeats the folded sash; the cylindrical reference requires unproved volume. |
| Waist peplum | Defer: the proposed straight inward folds do not produce the reference's two flared panels. |
| Petal collar | Defer: later creases are underspecified and the role overlaps the neckerchief/bow. |
| Panel tuck / pocket square | Defer: overlaps the existing patch pocket and envelope clutch. |
| Folded window mat | Adapt to Framed brooch: four valley folds preserve a printed centre and true reverse borders on all four sides. The supplied alternating-turn recipe exposed reverse on only two sides. Retain experimentally at 6 cm. |
| Plum seed paper | Retain as a curated fixed two-sided companion: varied small plum/sage seeds on oat, with a registered patterned plum reverse. Distinct from regular Seed dashes and quiet Oat linen. |
| Additional quiet grains / grids | Defer: existing Oat linen, Slate grain, Running stitch and Indigo lattice already fill these roles. |
| Trousers, cap cavities, realistic mittens | Defer until there is a precise, independently checked fold construction. |

## Actual compositions and proportions

The first complete board contains capelet, skirt, two boots and brooch. The
second layers the capelet over a cross-wrap top, with skirt and two boots.
Both use five ordinary independent captures, the existing camera and the existing
3.6 × 4.2 board. No hidden extra sheets or smaller camera scale are introduced.

| New capture | Starting square | Finished board extent | Width at 320 px |
| --- | --- | --- | --- |
| Collared capelet | 14 cm | 1.400 × 0.700 | 103 px |
| Each ankle boot | 8 cm | 0.580 × 0.487 | 43 px |
| Framed brooch | 6 cm | 0.450 × 0.450 | 33 px |

In the layered outfit, 0.5751 board units of the top remain visible below the
capelet (42.5 px at 320). The capelet overlaps 0.6351 units of the upper top.
The brooch's printed centre is 22.17 px wide at 320; the earlier 5 cm study gave
18.47 px, which is why the retained default is 6 cm.

- [Before the capelet](evidence/layered-before-capelet.png) / [layered composition](evidence/layered-composite-1280.png)
- [Layered outfit at 390](evidence/layered-390.png) / [320](evidence/layered-320.png)
- [All new pieces with a skirt at 390](evidence/five-piece-390.png) / [320](evidence/five-piece-320.png)
- [Capelet/boot folds, source visibility maps and blossom before/after](../companion-folds/NOTES.md)
- [Brooch construction, flower placement and size comparison](../companion-accent/NOTES.md)
- [Plum seed registration and preserved-paper checks](../companion-papers/NOTES.md)

## Verification record

Node 24 `npm ci`, typecheck, complete `npm test` including the three new geometry/
paper checks, and production build pass. The served candidate bundle is
`index-Cb6mI6qu.js`, SHA-256
`fe5b42493ab64c8bbe373c5be36dea4b32446017e38bf28785895fdc0e321c13`.
CSS remains byte-identical to PR24.

The [compiled-browser receipt](evidence/result.json) records successful actual
Fold/Back/refold controls, front/back views, old-paper shifts/turns, exact captured
vertices/UVs/recipes, and both five-piece compositions. At desktop, 390 and 320,
the complete board stays visible, controls remain reachable, small-piece touch
cancel/commit/Undo works, and PNGs match the rendered scene exactly at 1800 × 2100.
Every piece was repeatedly moved to all bounds at both tilt limits. Layers,
remove/Undo, reload and injected storage failure/retry preserve captured data.
Five remove/Undo cycles retain seven geometries and twelve board-renderer textures.
The two saves are 92,377 and 102,105 characters, below the unchanged 2M limit.

The exact PR24 fixture and newly captured shapes using known papers render
pixel-identically in PR24. The new paper is intentionally unknown to PR24: the
old reader preserves its saved bytes and refuses to overwrite them, including
after pin/move/retry/reload attempts. No migration or fallback redraw is invented.
A completed jacket sash also survives switching to an unsupported new design
and back with its exact attachment, independent paper/offset and pose.

All 52 prior paper faces, 96 sampled supported-offset faces, registry metadata
and prior-paper order match PR24. Plum seed's full ellipse bounds, fixed-offset
normalization and front/back material registration pass at all four turns.

Real-engine geometry checks retain area 4 and rigid facets with zero sampled
strict triangle piercings at 81 poses per operation. The capelet's maximum hinge
gap is 0.0275; brooch 0.0165; boots reach the unchanged 0.044 limit. No gate was
relaxed. Intermediate boot ankle/toe views include 25/50/75% poses. These tests
do not certify physical folding or continuous collision-free motion. Browser
touch emulation cannot establish physical-phone feel.

CI retains the six inherited checks and adds three companion suites:
composition, fold/progression/visibility, and paper preservation. PR check runs
are the authority for their terminal status; local receipts are committed here.

Reproduction: serve the candidate production build and frozen PR24 production
build, then run `scripts/check-companion-browser.cjs` with `BASE_URL`,
`BASELINE_URL` and `CAPTURE_DIR`. Paper and fold browser checks use dev servers;
see `.github/workflows/companion-studies.yml` for the exact commands. Use disposable
browser contexts, never an owner's browser profile or storage.

The frozen PR24 fixture in `fixtures/pr24-five-piece.json` is an application-made
five-piece board, not an external proposal. Its bytes are retained to test exact
load, rendering and save compatibility.
