# Independent paper preservation check

Compared the frozen Claude proposal `3c448a9e9bc992e3fae91b42f83cb4e67d213787`
against the integration candidate's corrected Riso drawing and bounded raster
caches, using the real Canvas drawing functions in Chromium 153 / Node 24.19.0.

| Artwork | Sizes (pixels) | Result |
| --- | --- | --- |
| Crease bloom, both faces | 48, 96, 256, 512, 1024 | All 10 raw pixel hashes identical |
| Marbled endpaper, both faces | 48, 96, 256, 512, 1024 | All 10 raw pixel hashes identical |
| Riso proof, reverse | 48, 96, 256, 512, 1024 | All 5 raw pixel hashes identical |
| Riso proof, front | 48, 96, 256, 512, 1024 | All 5 changed as intended; nonfinite arc arguments reduced from 2,138 to zero out of 7,201 calls per draw |

The intentional Riso change introduces the authored 8% second-ink floor where
the original negative-base fractional power produced `NaN`. Its appearance
still needs the integration comparison renders; finite arithmetic alone is not
an aesthetic approval.

Full hashes and counts are in [paper-preservation.json](paper-preservation.json).
The repeatable harness is `scripts/check-paper-preservation.cjs`. On Node 24,
with Playwright/Chromium installed and a separate checkout of the baseline:

```sh
BASELINE_DIR=/path/to/claude-baseline node scripts/check-paper-preservation.cjs
```

`PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE_PATH` can select external browser
dependencies. The script owns its two local Vite servers and isolates their
temporary dependency caches, so the baseline checkout's source is unchanged.
It fails if any expected-preserved drawing changes or if the current artwork
supplies nonfinite arc arguments.

This is a comparison of the raw procedural artwork at five sampled sizes. It
does not test grain, GPU sampling, folded geometry, a real phone, physical ink,
or physical-paper feasibility. The integration's separate browser test covers
actual texture matrices, front/back material correspondence, and cache rebuilds.
