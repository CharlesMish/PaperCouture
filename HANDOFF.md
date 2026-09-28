# Paper Couture handoff — 2026-09-27

## Status

Ready for owner inspection and continuation in Cursor. Claude reached its usage limit
before the final handoff, but chunk 3 contains a substantially complete v0.1 application.
**All application files in `src/` remain byte-for-byte identical to Claude's export.**

Implemented: four visible procedural papers and contrasting reverse colors, quarter-turn
pattern rotation, six guided operations (collar, turn, sides, sleeves, hem points, turn),
forward/back/reset, constrained drag-to-fold, and a separate display view with orbit,
zoom, front/angle/back presets, optional turntable, and return to the workshop.
The same mesh representation is used throughout; there is no unrelated finished dress swap.

Charlie clarified that any depth should reveal the paper layers and folds. A shallow folded
paper dress is the goal. A hollow wearable garment, body, or full dressmaking simulator is
outside the current concept.

## Preparation changes

- Added Node 24 selection, README, AGENTS.md, this status record and CURSOR_START.md.
- Changed the geometry-check launcher from the `tsx` CLI to `node --import tsx`.
  The checks are unchanged; this avoids the CLI's unnecessary IPC listener, which was
  blocked in the audit environment. `npm test` now aliases that check.
- Made Python diagnostics use their own project root and configurable preview/capture
  locations rather than `/home/claude/...`. Checked all three scripts for Python syntax.
- Recorded current build/check/browser evidence and original-export provenance.
- No geometry, construction parameters, materials, display controls, styling, or runtime
  application source was rewritten or polished in this preparation.

## Verification

Linux, Node 24.19.0; clean `npm ci` succeeded. Typechecks for app and scripts passed.
`npm test` / `npm run check` passed. Production build passed.

Geometry report: six operations, 12 final facets (five flipped); final extent 1.707×1.800
from a 2×2 square. Maximum reported stack height 0.0290; worst sampled mid-fold hinge gap
0.0165, inside the existing test tolerance; minimum sampled z 0.0015. These are rendering
model units, not physical paper thickness measurements.

Fresh software-WebGL Chromium checks covered:
- both development and production rendering, with no page exceptions or console errors;
- all six forward operations through actual interface buttons;
- changing paper and rotating its pattern during a fold;
- display entry, angle/back presets, turntable toggle, reset view and workshop return;
- all six backward operations and reset during animation;
- 390×844 workshop/display layout with no horizontal overflow.

New screenshots and machine-readable reports are in `docs/verification`. The existing
screenshots in `docs/screenshots` are Claude's earlier evidence, not new audit results.

## Limits and sensible next step

The engine models rigid facets and authored layering with small rendering offsets. The
construction source calls this an original prototype pattern; it does not claim a named
traditional design. Passing checks for area, seams, resting states, sampled animation and
controller behavior is **not** a proof of physical foldability or a complete continuous
self-collision test. Layer spacing deliberately opens small gaps at some hinges. Physical
paper reproduction has not been attempted.

Actual mobile Safari, touch orbit/pinch, and the feel of dragging a fold have not been
validated on a real phone. Mobile controls are compact; inspect comfort before expanding.
Changes are not persisted across page reloads. No saved collection is implemented.

First let Charlie try the existing complete sequence and inspect the final object. Ask:
can he follow the transformation, do the layers read as paper, does inspection feel good,
and does another paper make him want to repeat the experience? Address a visible issue
before adding patterns or alternate garments. Avoid an engine rewrite or open-ended
physics research as the next task.
