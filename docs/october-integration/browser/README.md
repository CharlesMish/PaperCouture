# October production browser evidence

Run `scripts/check-october-browser.cjs` against a production preview. The check
uses the registered papers and mittens and rejects requests for source modules.
It opens isolated browser contexts and never reads a personal browser profile.

**PASS** on production bundle `index-bFd0QWb3.js`, with zero runtime errors and
zero source-module requests. The machine-readable result records every capture's SHA-256,
the complete 128-view gallery inventory, the five starting-square sizes and
rendered dimensions, export hash, touch checks, errors and final pass status.
The integration and size board uses all four papers and both separately folded
mittens. It is a coverage/proportion comparison, not a claim of the strongest
coordinated editorial outfit.

The complete pass includes 128 registered paper views; 84 completed forward,
Back and refold step transitions across the coat and both mittens; 28 half-fold
scrub cancellations; three resets during observed motion; exact frozen posed
geometry/UV/paper recipes; uniform size matrices; five-piece board limits;
move/remove Undo; identical PNG bytes after reload; touch drag/cancel/Undo and
working swatches at 390×844 and 320×568; and a legacy fixture retained unchanged
before adding the new paper. No page exceptions or browser console errors arose.

Review these files:

- `registered-front-back.jpg`: four new papers on coat, shirt, skirt and brooch.
- `registered-coat-turns.jpg`: four papers at all four turns on the coat.
- `registered-mittens.jpg` and native `mitten-*-front/back.png`: both registered
  hands after their full UI forward/Back/refold sequences.
- `integration-size-board.jpg`: a titled overview of the actual exported board.
- `outfit-composite.png`: the actual 1800×2100 integration/size board export, useful for judging
  the 20 cm coat, 18 cm shirt, 4.5 cm brooch and two 6 cm mitten squares together.
- `outfit-desktop.png`, `outfit-touch-390.png`, `outfit-touch-320.png` and the
  corresponding picker screenshots: actual app controls and layout.

The contact sheets crop and resize actual browser pixels. Every paper in a
garment row uses the same crop; the taller skirt/brooch toolbar requires a
different top margin. Nothing is repainted, relit or generated. Each Display
piece is framed independently, so use the pinboard for relative sizing.
The raw gallery frames and repeated exports are omitted from Git because the
script regenerates them. Their hashes and inventory remain in `results.json`.

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 5365
# In a second shell; set paths for the local installation:
PLAYWRIGHT_MODULE=/path/to/playwright \
CHROMIUM_EXECUTABLE_PATH=/path/to/chromium \
node scripts/check-october-browser.cjs
python docs/october-integration/browser/make-contact.py
```

`BASE_URL` and `CAPTURE_DIR` can override the preview and evidence locations.
The contact-sheet script expects the default evidence location. Headless
Chromium with software WebGL and emulated touch establishes neither mobile
Safari/real-phone behaviour nor physical-paper foldability. Half-fold scrubbing
uses the exposed diagnostic controller; board dragging uses dispatched touch
input. Mitten seam/collision limitations remain those documented in the
geometry review, separate from these UI and persistence results.
