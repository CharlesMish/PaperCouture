// 2026-10 design pass: draws each new paper's faces twice through the app's own
// paperCanvas at all four turns, and checks determinism, distinct faces and
// draw time. Isolated context; never reads the owner's browser storage.
//   npm run dev -- --host 127.0.0.1 --port 5627 --strictPort
//   node scripts/check-design-pass-browser.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), assert = require('node:assert/strict');
const base = process.env.DEV_URL || 'http://127.0.0.1:5627';
const out = process.env.CAPTURE_DIR || 'docs/design-pass-2026-10/evidence';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(base); await page.waitForFunction(() => window.paperCouture);
    const result = await page.evaluate(async () => {
      const { PAPERS } = await import('/src/papers/index.ts');
      const { paperCanvas } = await import('/src/render/textures.ts');
      const rows = [];
      for (const id of ['riso-proof', 'crease-bloom', 'marbled-endpaper']) {
        const paper = PAPERS.find(p => p.id === id);
        const row = { id, ms: {}, deterministic: true, distinctFaces: true };
        for (let q = 0; q < 4; q++) {
          const uri = {};
          for (const side of ['front', 'back']) {
            const t0 = performance.now(); const a = paperCanvas(paper, side, q).toDataURL();
            row.ms[`${side}${q}`] = Math.round(performance.now() - t0);
            if (a !== paperCanvas(paper, side, q).toDataURL()) row.deterministic = false;
            uri[side] = a;
          }
          if (uri.front === uri.back) row.distinctFaces = false;
        }
        rows.push(row);
      }
      return rows;
    });
    for (const r of result) { assert(r.deterministic, r.id); assert(r.distinctFaces, r.id); }
    assert.deepEqual(errors, []);
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(out + '/papers-browser.json', JSON.stringify({ base, result, note: 'Headless Chromium with software WebGL; not a real phone.' }, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
