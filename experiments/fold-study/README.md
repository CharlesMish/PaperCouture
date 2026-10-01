# Owner trial: envelope clutch and bib apron

This separate experiment turns the two strongest candidates from the Sol 6.1 fold study into playable sequences. It uses the existing rigid-fold engine, material coordinates, paper textures and workshop/display controls. The regular collection and saved designs are untouched. The fan stays parked in the study; it is not selectable here.

## Try it

Open `/experiments/fold-study/`. The clutch starts selected. Use **Fold** and **Turn over**, or drag the highlighted paper; the tiny first flap also has a tap/drag grip. After six operations, choose **Display** and inspect **Front**, **Angle** and **Back**. Return to **Workshop**, use **Back** to unfold, or **Start over** to return to the square.

Choose **Bib apron** in the Study menu for its five operations. Each candidate retains its own progress and paper while the page stays open. Nothing is written to local storage. Try Pinstripe and lining for strong front/reverse contrast, then Border print or Starlit lining and the four paper turns.

Useful trial questions: can you reach the clutch tip before turning the square over; does closing the lid keep its contrasting triangle exposed; can you narrow both apron corners without fighting the hem layers; do the layer stacks and edges read clearly from the back? The apron is a bib/hem silhouette without ties. The clutch is a flat envelope form without a physically proven lock or bag cavity.

## Source and scope

- Main inspected: `05bba444be376664aeb8c1c35d0463f5cf59e26f`.
- Exact starting version: open draft PR15, `79d545778b5ea28e6fa59087fe14af93dc6098ec`, branch `drafts/papercouture-drafter-15`.
- PR10 and PR11–15 are concurrent work. This branch does not merge or replace them.
- Reviewed study report: Library file `libfile_47bb4347f47c81919a22bbc5fbd311ee`, version 0. The experiment preserves its accepted five-op apron and six-op clutch geometry, including folding the clutch tip before the first turn-over.
- No product collection integration, physical-paper certification or device QA. Existing layer-gap approximations remain. Sampled strict triangle piercing checks exclude coplanar contact, tangency, thickness and unsampled motion.

## Run and verify

Use Node 24, then `npm ci`. Run `npm run typecheck`, `npm test`, `npm run test:experiment`, `npm run build` and `npm run build:experiment`. The regular build stays in `dist`; the experiment goes to `dist-experiment`.

For local development run `npm run dev` and open `/experiments/fold-study/`. For the rendered browser checks, install Playwright 1.62.1 and Chromium, build the experiment, then run `node scripts/check-fold-study-browser.cjs`. It serves the experiment on a temporary loopback port and records screenshots/results in `.experiment-qa/`. `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE_PATH` and `CAPTURE_DIR` support existing local dependencies. `BASE_URL` targets a hosted experiment, and `EXPECTED_SHA` checks its source metadata.

Geometry checks cover retained area, rigidity, seams, endpoint continuity, reverse exposure, 81 sampled poses per operation, and controller reversal/reset. Browser checks cover both complete sequences, every backwards step, mid-motion reversal/reset, display views, paper turns, independent candidate sessions and portrait/landscape rendering. These are simulation checks; Charlie's paper/device trials remain the next evidence.
