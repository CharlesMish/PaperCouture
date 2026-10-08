// Run from the repository root. Uses the real Stage, SheetView, textures and
// timeline in a small study page; it does not exercise the integrated app UI.
const { createServer } = require('vite');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  let browser;
  try {
    let launch = { headless: true, args: ['--no-sandbox', '--use-angle=swiftshader'] };
    if (process.env.CHROMIUM_MODULE) {
      const binary = require(process.env.CHROMIUM_MODULE).default;
      launch = { headless: true, executablePath: await binary.executablePath(), args: [...binary.args, '--use-angle=swiftshader'] };
    }
    browser = await chromium.launch(launch);
    const page = await browser.newPage({ viewport: { width: 800, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    const port = server.httpServer.address().port;
    await page.goto(`http://127.0.0.1:${port}/docs/geometry-collection/pleats/preview.html`);
    await page.waitForFunction(() => window.study);
    for (const garment of ['pleats', 'wrap', 'dress']) {
      const papers = garment === 'pleats' ? ['contrast', 'cut-paper-mosaic', 'ivory-border'] : ['contrast'];
      const views = garment === 'pleats' ? ['front', 'angle', 'back'] : ['front'];
      for (const paper of papers) for (const view of views) {
        await page.evaluate(([g, p, v]) => window.study.show(g, p, v), [garment, paper, view]);
        await page.waitForTimeout(150);
        await page.screenshot({ path: `docs/geometry-collection/pleats/${garment}-${paper}-${view}.png` });
      }
    }
    await page.evaluate(() => window.study.show('pleats', 'contrast', 'angle', 1, 0.5));
    await page.screenshot({ path: 'docs/geometry-collection/pleats/return-mid-fold.png' });
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Pleated skirt study capture complete.');
  } finally {
    await browser?.close();
    await server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
