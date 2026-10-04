# Integrated single-square studies

The main Design menu retains the five collection garments and adds an experimental group:
Bib apron, Envelope clutch, and One-shoulder tunic. Original garment geometry, papers,
accessory construction and material coordinates are unchanged. The apron/clutch operations
are copied from PR16 (992169afec594bc6c577483760e967366d009053); their standalone study source
remains intact. The tunic operations come from the source-hash-verified Library divided-silhouette
bundle, which records study commit afb1cb51dd72d89b7f016196aeb252512f3d5e36. That bundle's
commit is provenance supplied by its manifest, not an independently fetched Git object.

The apron has no ties; the clutch is a flat envelope without a locking closure; the tunic is
an asymmetric folded silhouette without a cut neckline. These forms have no reviewed accessory
anchors, so the controls are hidden and any existing accessory is held aside, then restored on
return to a compatible collection garment. Clutch Display orientation matches the original study.

Completed fold counts are kept per design while the page remains open. Start over resets only
the selected design. Paper/turn and fold-option preferences remain shared, as in the collection.
The URL tracks the current garment, completed step, paper, turn, options and Workshop/Display
mode, so reloading restores those fields. It does not encode accessories or other designs' progress.
No localStorage, sessionStorage, old save deletion or migration is introduced.

Not integrated: culottes are a posed three-square assembly without a playable assembly/join flow;
the fork silhouette loses its split at full closure; lantern/riding panels remain parked. The
pinboard and print-shift laboratory uses fixed outfits, study-only persistence and shifts grain
with ink. It needs product integration rather than simply copying its controls into the game.

Validation: typecheck, normal/experiment builds, existing numerical collection checks, exact
apron/clutch parity, new silhouettes at 81 samples per operation (retained material, rigid edges,
seams, endpoints, table clearance, strict triangle piercings), and reversible controller checks.
Browser validation covers actual fold controls, sampled motion, all paper turns and Front/Angle/Back,
paper selection, progress/accessory round trips and reload, desktop and emulated phone layouts.
Sampled software geometry and headless Chromium are not continuous collision, physical-paper,
Safari or actual-device certification.
