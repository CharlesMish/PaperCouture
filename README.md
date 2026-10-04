# Paper Couture — Cursor continuation of Claude chunk 3

Open **this folder** in Cursor. Use Node.js 24.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally http://localhost:5173/.
No account, API key, external image service, or backend is needed. All papers are drawn
procedurally. The source is standard Three.js + TypeScript + Vite.

For the first agent session, paste **CURSOR_START.md**. Read **HANDOFF.md** before editing.
Claude stopped before its final handoff, but the exported application already has a complete
six-step sequence, sixteen visible papers, fold/back/reset controls, and a display view.

## Checks and production preview

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Production preview normally uses http://localhost:4173/. The static build is in `dist/`
and uses relative asset paths. Serve it over HTTP; do not double-click index.html.

## Garments and optional accessories

Choose Dress, Box jacket, Wrap skirt, Lapel vest or Pleated skirt from Design. After folding the garment, optionally
fold a separate diamond pin or a two-piece bow (one square per wing), choose its own paper and place or remove it.
At dress step 3, choose Straight, Classic A-line or Wide flare, then choose the sleeve angle at step 4.
The jacket and vest offer two body lengths. The wrap skirt offers either wrap direction and a broad
one-turn or narrow two-turn waistband. Use Revisit to return to a completed choice; paper, other
preferences and finished accessories are kept while affected folds are redone.
After folding both bow wings, optionally fold a third centre square with its own paper and rotation.
See [collection notes](docs/geometry-collection/NOTES.md) and [styling notes](docs/astra-review/STYLING_CHOICES.md). See
[the prototype notes](docs/astra-review/JACKET_AND_PIN.md) for behavior and checks.

The Wrap skirt has eight or nine steps, the Pleated skirt seven; both have three waistband
attachment positions. The Lapel vest has eight steps and five clasp/lapel/panel positions.
See [garment study notes](docs/garment-studies/NOTES.md).

Small flaps have 44px arrow handles: drag toward the arrow or tap to complete the
pending fold. See [owner-feedback fixes](docs/feedback-pass/NOTES.md).

## Try it

Choose a paper swatch and press Fold/Turn over for each step. Back reverses a step;
Start over resets the square. When finished, Display places the same object on a small
stand. Drag to orbit; use Front/Angle/Back, zoom and the optional Turntable. Workshop
returns to the same folded piece. Changing paper and rotating its pattern also work
on the finished object. Arrow keys advance/reverse in the workshop; Escape returns
from display. A constrained drag-to-fold interaction also exists for owner evaluation.

## Code map

- `src/fold/construction.ts`: authored original A-line dress, six steps.
- `src/fold/garments.ts`: garment registry and attachment anchors.
- `src/fold/wrapSkirt.ts`, `lapelVest.ts`: new authored single-square sequences.
- `src/fold/engine.ts`, `geometry.ts`: material polygons, creases and resting states.
- `src/fold/timeline.ts`: animated rigid facet transforms and layer spacing.
- `src/app/controller.ts`: forward, reverse, reset, and scrub state.
- `src/render/`: paper meshes, materials, guides, scene and stand.
- `src/papers/`: sixteen visible paper designs and a diagnostic grid.
- `src/app/displayCamera.ts`, `viewSwitch.ts`: display inspection and transitions.
- `src/ui/` and `src/main.ts`: interface and application wiring.
- `scripts/check.ts`: geometry and controller checks.
- `docs/screenshots/`: Claude's supplied screenshots; `docs/verification/`: fresh checks.

## Optional diagnostic scripts

`npm run check -- --dump` produces `docs/states.json`. `scripts/plot_states.py` uses
Python with matplotlib and numpy. `scripts/browser_check.py` and `scripts/screenshots.py`
use Python Playwright (install its Chromium browser) and expect a running preview.
They now use project-relative output paths. `BASE_URL` overrides the default preview URL;
`CAPTURE_DIR` overrides `docs/captures`. These optional Python tools are not needed to
run or build the application. Their syntax was checked during this handoff; the fresh
browser verification used a separate audit harness, not these Python scripts.


## Print placement and pinboard candidate

Corner bloom and Plum scatter support bounded artwork sliding; Seed dashes has
verified half-cell positions. Fold any current piece, enter Display and use
Pinboard to arrange and export that piece with its attached accessory. See
[behavior, limits and checks](docs/print-position-pinboard/NOTES.md).
