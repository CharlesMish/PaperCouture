# Independent core integration review

The independent reviewer ran `scripts/check-collection-review.cjs` against an
isolated copy of the integrated production build. It served the real compiled
files below `/play/paper-couture/` with the existing site CSP. Actions used the
actual controls; the public inspection handle was read for assertions and the
existing URL step parameter was used to set up cases.

Reviewed JavaScript bundle: `index-DRPsPNps.js`, SHA-256
`0074e8cd1f2b2bd0a8d1f8f08a01b5900ce146545daa32c90f082ce52cfb8197`.
This records the reviewed application build without claiming that later changes
were included. The lead records the final source commit in the collection notes.

## Passed

- Dress sleeves selected by keyboard; focus survives rebuilding the choice
  thumbnails. Flare remains selected when sleeves change. Revisiting sleeves
  returns before that fold; revisiting sides returns earlier while keeping the
  later sleeve preference. The paper and its quarter turn are retained.
- A completed pin made from an independently selected Reverse garden sheet at
  90 degrees survives revisiting and refolding the garment. It disappears while
  the garment is incomplete, then returns at the same right-waist position.
  Its paper and rotation remain distinct from the garment's.
- Opposite skirt wrap, one-turn and two-turn waistbands, and their separate
  revisits. The controller and progress marks agree on eight versus nine steps.
- Longer jacket and longline vest choices preserve completed shared folds and
  can be revisited from Display.
- At 390 × 844 and 844 × 390: sleeve choices, side choices, completed garment,
  attached pin, placement selection and revisit. Visible control centres were
  checked for pointer obstruction. The studio strip intentionally scrolls
  horizontally in landscape.
- No console errors, page errors or failed requests.

The reviewer inspected the desktop refold/accessory capture and the portrait and
landscape choice/accessory captures. The choices, folds and attached pin remain
readable. Portrait controls leave substantial paper space. At 844 × 390 the
paper is smaller during a choice, with approximately 131 CSS pixels between the
top studio strip and bottom dock. The fold button and the 44-pixel handle remain
usable; the small landscape presentation is a limitation rather than a blocker.

Results and dimensions are in `result.json`; screenshots are beside this note.
No application defect was found in this scope. One initial harness assertion
sampled mesh visibility before the next animation frame; the harness now waits
for the rendered state before asserting it.

## Scope limits

The new pleated construction and folded bow centre have separate construction
and interaction reviews. This core audit does not duplicate those. It does not
establish Safari, physical-phone or physical-paper behavior. See `BASELINE.md`
for the separately repeated existing small-flap interaction checks.

To rerun after the final build:

```sh
npm run build -- --base /play/paper-couture/
node scripts/check-collection-review.cjs
```

The script accepts `PLAYWRIGHT_MODULE`, `CHROMIUM_MODULE`, `REVIEW_DIST` and
`REVIEW_OUTPUT` for established external tooling and isolated review copies.

## Final-build Pleated skirt check

The independent reviewer subsequently ran `scripts/check-pleats-review.cjs`
against the final application bundle `index-COQy-8CP.js`, SHA-256
`914d3e15c46fc1c684996ca65ff3307f26ab60a9e506a1ae47c87417c0c137d0`.
The garment was selected through the real picker and folded all seven steps
forward, seven back and seven forward again. Turning its paper in Display kept
the final step and camera. A separately patterned pin attached to its waistband;
the three placement options, portrait presentation, accessory removal and Start
over passed. No console, page or network errors occurred.

The reviewer inspected `pleats-front-final.png` and `pleats-pin-390-final.png`.
The returned pleat edges are clear on the restrained Ink reverse paper, and the
pin rests on the waistband without obscuring the garment. The portrait controls
leave the paper comfortably visible. Results are in `pleats-result.json`.

An initial test locator used the visible word Workshop rather than the button's
accessible name, Return to the workshop. Correcting the locator resolved that
test timeout; no application change was needed. The final rerun passed fully.
