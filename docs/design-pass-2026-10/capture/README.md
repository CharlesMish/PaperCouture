# Capture tooling for the 2026-10 design pass

Run Vite on port 5627 (`npm run dev -- --host 127.0.0.1 --port 5627 --strictPort`).
Set `PLAYWRIGHT_MODULE` if Playwright is not resolvable. Raw PNGs go to
`$CAPTURE_ROOT/cap/...` (keep them outside the repo); `sheets.py` builds the
committed contact sheets in `docs/design-pass-2026-10/evidence/`.

```sh
export CAPTURE_ROOT=/tmp/pc-capture
node capture/flat.cjs $CAPTURE_ROOT/flat riso-proof crease-bloom marbled-endpaper
node capture/shoot.cjs capture/garment-jobs.json $CAPTURE_ROOT/cap/r1
node capture/study.cjs $CAPTURE_ROOT/cap/study $(cat capture/study-args.txt)
node capture/outfit.cjs $CAPTURE_ROOT/cap/outfit
python3 capture/sheets.py
```

(Paths are relative to `docs/design-pass-2026-10/` for the scripts, and the
repository root for `sheets.py`.) `shoot.cjs` loads URL state
(`design`, `paper`, `turn`, `step`, `view=display`) and clicks Front/Angle/Back;
it is a capture helper, not a test. Headless Chromium with software WebGL.
