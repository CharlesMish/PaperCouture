// Independent before/after raster check. Baseline is a separate read-only
// checkout of Claude's 3c448a9 proposal with dependencies available.
//   BASELINE_DIR=/path/to/baseline node scripts/check-paper-preservation.cjs
// Optional PLAYWRIGHT_MODULE, CHROMIUM_EXECUTABLE_PATH, CAPTURE_DIR, QA_PORT.
// Only fixed-paper raw artwork is compared; grain, rendering and physical
// paper feasibility are outside this check.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const { createServer } = await import('vite');
  assert(process.env.BASELINE_DIR, 'Set BASELINE_DIR to the original Claude checkout');
  const roots = [path.resolve(process.env.BASELINE_DIR), process.cwd()];
  const baselineCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: roots[0], encoding: 'utf8' }).trim();
  assert(baselineCommit.startsWith('3c448a9'), 'Expected frozen Claude proposal 3c448a9');
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'couture-preservation-'));
  const servers = [], results = [];
  let browser;
  try {
    const startPort = Number(process.env.QA_PORT || 5631);
    for (let i = 0; i < roots.length; i++) {
      const server = await createServer({
        root: roots[i], configFile: false, cacheDir: path.join(cache, String(i)),
        optimizeDeps: { noDiscovery: true, include: [] },
        server: { host: '127.0.0.1', port: startPort + i, strictPort: true },
        plugins: [{ name: 'empty-preservation-page', configureServer(s) {
          s.middlewares.use('/__preservation__', (_req, res) => {
            res.setHeader('Content-Type', 'text/html');
            res.end('<!doctype html><title>Raw paper preservation</title>');
          });
        } }],
      });
      await server.listen(); servers.push(server);
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    for (let i = 0; i < roots.length; i++) {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${startPort + i}/__preservation__`);
      results.push(await page.evaluate(async () => {
        const { creaseBloom } = await import('/src/papers/creaseBloom.ts');
        const { marbledEndpaper } = await import('/src/papers/marbledEndpaper.ts');
        const { risoProof } = await import('/src/papers/risoProof.ts');
        const rows = [];
        for (const paper of [creaseBloom, marbledEndpaper, risoProof]) {
          for (const side of ['Front', 'Back']) for (const size of [48, 96, 256, 512, 1024]) {
            const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            let invalidArcs = 0, arcCalls = 0;
            const originalArc = ctx.arc;
            ctx.arc = function (...args) {
              arcCalls++;
              if (!args.slice(0, 5).every(Number.isFinite) || args[2] < 0) invalidArcs++;
              return originalArc.apply(this, args);
            };
            paper['draw' + side](ctx, size);
            const pixels = ctx.getImageData(0, 0, size, size).data;
            const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', pixels)))
              .map(n => n.toString(16).padStart(2, '0')).join('');
            rows.push({ id: paper.id, side, size, hash, invalidArcs, arcCalls });
          }
        }
        return rows;
      }));
      await page.close();
    }
    const rows = results[0].map((before, i) => {
      const after = results[1][i];
      const intentionalChange = before.id === 'riso-proof' && before.side === 'Front';
      assert.equal(before.hash === after.hash, !intentionalChange, `${before.id} ${before.side} ${before.size}`);
      assert.equal(after.invalidArcs, 0, 'Current artwork must pass finite Canvas arguments');
      if (intentionalChange) {
        assert.equal(before.invalidArcs, 2138, 'Original Riso bug must be reproduced');
        assert.equal(after.arcCalls, 7201);
      }
      return { id: before.id, side: before.side, size: before.size, identical: before.hash === after.hash,
        beforeHash: before.hash, afterHash: after.hash, beforeInvalidArcs: before.invalidArcs,
        afterInvalidArcs: after.invalidArcs, afterArcCalls: after.arcCalls };
    });
    const report = { baselineCommit, browser: browser.version(), node: process.version,
      summary: { preservedRasters: rows.filter(r => r.identical).length, intentionallyChangedRasters: rows.filter(r => !r.identical).length },
      limits: 'Raw procedural artwork only, software Chromium Canvas; no GPU material rendering, phone or physical-paper claim.', rows };
    const out = process.env.CAPTURE_DIR || 'docs/october-integration/verification-review';
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'paper-preservation.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ baselineCommit, ...report.summary, browser: report.browser }));
  } finally {
    if (browser) await browser.close();
    for (const server of servers) await server.close();
    fs.rmSync(cache, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
