# Claude review brief: the finished Paper Couture board

Charlie would like an independent, critical review of the place where the craft
ends: a corkboard collage that is enjoyable to arrange, dress and photograph.
The board should feel worth spending time with after the folding is finished.
Please assess the implementation that exists, using actual browser interaction
and rendered evidence. A clean finding is useful; do not invent defects or assume
that another redesign is needed.

## Establish the candidate before reviewing

Repository: <https://github.com/CharlesMish/PaperCouture>

Source PR: <https://github.com/CharlesMish/PaperCouture/pull/35>

Use the exact commit in the pinned GitHub link to this brief, or the accompanying
handoff. If neither is pinned, authenticate the current PR head. Record the full
commit you reviewed and check current CI on that exact head. A green predecessor does not validate a new
commit. If the PR has moved, identify the difference before mixing evidence.

Start with `AGENTS.md`, `HANDOFF.md`, `README.md`, and the current
`docs/october-integration/presentation/NOTES.md`. Read the board model, layout,
presentation/decor, surface and UI code relevant to your findings. Inspect:

- `scripts/check-presentation-browser.cjs`
- `scripts/check-guide-browser.cjs`
- `scripts/check-roomy-board.cjs`
- `docs/october-integration/presentation/render-study.cjs`
- The current comparison images and machine results in this directory.

The latest candidate is expected to include independent figure movement and size
controls, plus slim white and black pin choices. If these or the guide browser
script are absent at the supplied SHA, report the candidate mismatch rather than
reviewing an older version as though it includes them. Earlier images may show
the preceding fixed-guide/three-pin implementation; distinguish those from new
renders of the candidate.

**Read-only review first.** Use an isolated checkout and browser profile. Do not
push commits, post a GitHub review, merge, change the separate `cmish.dev` website,
or publish anything. Keep any experiments uncommitted and identify them as
experiments. Recommendations and a small reproducible comparison are welcome;
integration remains Charlie's decision.

## The intended experience and its boundaries

The board holds twelve independent captures, with Standard and Roomy formats.
Roomy adds arranging space without resizing the paper. The newer finishing
controls add natural, rose and slate cork, a linen option, decorative pins,
optional flat figure guides, bounded lighting choices and a clean Photograph
view. Original board preserves the older presentation for existing saves.

Pins suggest a pinned paper collage. They do not prevent movement or turn the
board into a physical fastener simulation. A pin should stay on its chosen piece,
respect covering paper, and remain appropriately small on accessories. The new
white and black slim choices should provide useful visual alternatives, not just
more nearly identical menu entries.

Figures are arranging references, not dressed 3D bodies or anatomical fit models.
The latest controls allow each figure to move and change size independently of
the paper and of the other figure. They should help a user place a wardrobe while
preserving freedom to collage. Guide inclusion in the photograph is explicit.
No new folds or paper artwork are commissioned by this review.

## 1. Arrange and dress the board

Try an ordinary desktop viewport, **390 × 844**, and **320 × 568**. Start at phone
width for the phone journey. Do not rely only on resizing a completed desktop
arrangement. Use actual controls and pointer/touch input rather than mutating
diagnostic state to simulate the interaction being assessed.

Work with one figure, then two, on both board sizes where useful:

- Discover the finishing and guide controls without knowing their code paths.
  Can you identify which figure is selected, move it deliberately, and change
  its size without moving garments or the other figure?
- Try a shirt/skirt outfit and a longer coat or dress. Is the outline useful for
  positioning rather than misleading about garment scale? Are one/two guides
  readable on cork at phone width, including partly covered guides?
- Move and size each guide, turn guides off and on, change their count, undo,
  reload, and photograph. Check preservation/reset behavior against the current
  documented contract. Inspect boundary handling and what happens when controls
  are used while paper overlaps the guide.
- Check that guide changes never alter captured garment coordinates, sizes,
  snapshots or paper material coordinates. There should be no implicit fitting
  or snapping of the paper.

Use an isolated fixture if you need a clear dressed-guide example. State which
pieces you retained and which arrangement coordinates you changed. Do not imply
that a hand-arranged illustration demonstrates automatic fitting.

## 2. Cork, pins, light and photographs

Compare the same arrangement under the original presentation and the new
finishes. The current preferred starting point is Natural cork, Brass pins and
Soft daylight; treat that as a candidate preference, not a conclusion to repeat.

- Does the cork read as fine compressed cork at phone, desktop and export size?
  Is its contrast calm enough beside highly patterned paper? Which surface/pin
  combinations actually improve the composition?
- Inspect Brass, Pearl, Red, the new slim White/Black choices, and No pins.
  Check large garments and the smallest brooch/mitten/boot. Do small pins remain
  visible without becoming oversized buttons? Compare white on pale paper and
  black on dark paper as well as their stronger pairings.
- Place a pin on actual visible paper, move and tilt the piece, overlap it with
  another piece, undo and reload. Does the pin feel attached? Does an occluded
  pin stay underneath? Are placement and reset understandable on a phone?
- Do shadows establish paper depth without making the pieces seem to hover?
  Are Soft, Clear and Warm lighting meaningfully different and appropriately
  bounded? Recognize that lighting can change perceived paper colour without
  changing the authored artwork.
- Enter Photograph, return to arranging, and use Escape where available. Check
  that editing overlays disappear, export choices are clear, and guides appear
  only when included. Compare the clean preview with actual downloaded PNGs.
  Standard is 1800 × 2100; Roomy is 2400 × 2800. Look for clipping, surprise crop,
  changed arrangement, distracting empty UI space or poor action placement.

## 3. Typography, discoverability and paper pairing

Keep this secondary to the board's usefulness. Critique the title hierarchy,
control labels, selected-piece/figure distinction, spacing and finishing drawer.
At 320/390 px, actually scroll/tap to find controls. Playwright auto-scroll proves
reachability but does not prove an ordinary user can discover a control. Check
legibility, truncation, overlap and whether taps reach the intended control.

Choose the **three strongest paper/garment/board/pin combinations**, with a short
reason grounded in the render. Identify a weak combination only if it helps make
a concrete decision. Existing work suggests Riso on the camp shirt, Crease bloom
on the coat at 0°, and Marble contained by the brooch; these are prompts for
comparison, not required winners. Separate problems in presentation from paper
artwork and from the fold's exposure of front/reverse material.

## Running the focused checks

Use Node 24 and the repository lockfile:

```sh
node --version
npm ci
npm run typecheck
npm test
npm run build
```

The browser checks need Playwright and Chromium. Use their existing external
installation when available; do not change project dependencies or the lockfile
merely to run the review. Set `PLAYWRIGHT_MODULE` and
`CHROMIUM_EXECUTABLE_PATH` to real paths in your environment, or omit them if
Playwright and its installed browser resolve normally.

Serve the **production build**, using one explicit port for every check. In
container environments that isolate command network namespaces, run the server
and browser scripts in the same shell execution:

```sh
export BASE_URL=http://127.0.0.1:5637
npm run preview -- --host 127.0.0.1 --port 5637 --strictPort > /tmp/paper-review-preview.log 2>&1 &
PAPER_REVIEW_SERVER_PID=$!
trap 'kill "$PAPER_REVIEW_SERVER_PID" 2>/dev/null || true' EXIT
for attempt in {1..30}; do
  curl -fsS "$BASE_URL/" > /dev/null && break
  sleep 1
done
curl -fsS "$BASE_URL/" > /dev/null

# Optional: creates the real twelve-capture fixture used for matched evidence.
CAPTURE_DIR=.october-qa/roomy node scripts/check-roomy-board.cjs

CAPTURE_DIR=.october-qa/claude-presentation node scripts/check-presentation-browser.cjs
CAPTURE_DIR=.october-qa/claude-guides node scripts/check-guide-browser.cjs
```

Read the current scripts' fixture handling before omitting the Roomy run: a
fallback/stress fixture is not equivalent to the real twelve-capture wardrobe.
The optional `render-study.cjs` uses `.october-qa/roomy/twelve-piece.json` by
default and accepts `BOARD_FIXTURE`, `BASE_URL` and `CAPTURE_DIR`. Use fresh actual
renders for your conclusions rather than reproducing the old screenshots alone.
Do not rerun the entire 128-view paper gallery solely because it exists; broaden
testing only when a concrete finding crosses into that coverage.

## Evidence and review deliverable

Return a bounded review with:

1. **Verdict and exact reviewed SHA:** ready for owner review, specific repair
   needed, or inconclusive with the missing evidence stated. Include exact-head
   CI status separately from your local checks.
2. **Ranked findings:** severity, reproduction steps, expected/observed behavior,
   affected viewport, and screenshot/export or measurement. Distinguish functional
   defects, aesthetic preferences and untested concerns. Say when an area is
   clean; do not inflate a short list into a redesign agenda.
3. **Three strongest aesthetic combinations**, and **at most two small proposed
   improvements**, each with the benefit, tradeoff and a concrete acceptance
   check. Prefer improvements that preserve the craft and reduce friction.
4. **Validation limits:** browser/version, software or hardware rendering,
   emulated versus actual touch, what you ran and what you did not run.

Headless browser success is not a real iPhone/Safari trial. Numerical geometry and
rendered collision checks are not physical-paper validation. This finishing pass
does not establish a new fold mechanism or prove the mitten can be folded from
finite-thickness paper. The known cold first-selection cost of some procedural
papers remains; do not describe the finishing work as resolving it, and do not
translate one desktop timing or CPU throttle into a measured phone delay.

Prioritize the changes that would make Charlie enjoy arranging and keeping the
finished work. A recommendation to keep a successful part unchanged is welcome.
