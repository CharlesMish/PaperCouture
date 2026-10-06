// Make a compact contact sheet from the actual browser captures, without
// redrawing any paper. Rows compare papers on the same garment and camera.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const source = process.env.CAPTURE_DIR || 'docs/outfit-papers/evidence';
const out = process.env.REVIEW_DIR || 'docs/outfit-papers';
const papers = [ ['oat-linen', 'Oat linen · curated'], ['slate-grain', 'Slate grain · curated'], ['ginkgo-pairs', 'Ginkgo pairs · experimental'] ];
(async () => {
  const result = JSON.parse(fs.readFileSync(path.join(source, 'results.json')));
  assert(result.checks.some(text => text.startsWith('All three papers rendered')), 'Complete the paper gallery first');
  const interactionPath = path.join(source, 'interaction-results.json');
  assert.equal(fs.existsSync(interactionPath) ? JSON.parse(fs.readFileSync(interactionPath)).passed : result.passed, true, 'Complete the interaction checks first');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
    const rows = [ ['jacket', 'Box jacket'], ['pleats', 'Pleated skirt'], ['clutch', 'Envelope clutch'] ];
    const uri = name => 'data:image/png;base64,' + fs.readFileSync(path.join(source, name + '.png')).toString('base64');
    const data = { papers, rows, flat: Object.fromEntries(papers.map(([id]) => [id, ['front', 'back'].map(side => uri(id + '-flat-' + side))])),
      folded: rows.flatMap(([design, title]) => ['front', 'back'].flatMap(side => papers.map(([id]) => ({ id, label: title + ' · ' + side, image: uri(`${design}-${id}-0-${side}`) })))) };
    await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#f3eee5;color:#292722;font:16px system-ui;padding:28px}h1{font:500 28px Georgia;margin:0 0 8px}p{margin:0 0 18px;line-height:1.4}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.cell{background:#fffaf0;border:1px solid #d7ccba;border-radius:8px;padding:10px}h2{font-size:18px;margin:0 0 10px}.flats{display:flex;gap:8px}.flats img{width:calc(50% - 4px)}canvas{width:100%;display:block}.label{font-size:14px;color:#655b4c;margin:4px 0 8px}</style><h1>Quiet companions, one positionable motif</h1><p>Three new procedural papers. Every old paper stays exact. These are actual Chromium renders.<br>Each garment uses its own Display camera: compare papers across a row, not garment sizes between rows.</p><main class="grid"></main>');
    await page.evaluate(async data => {
      const grid = document.querySelector('main');
      for (const [id, name] of data.papers) {
        const cell = document.createElement('section'); cell.className = 'cell';
        const title = document.createElement('h2'); title.textContent = name; cell.append(title);
        const label = document.createElement('div'); label.className = 'label'; label.textContent = 'Flat printed front / reverse'; cell.append(label);
        const pair = document.createElement('div'); pair.className = 'flats';
        for (const url of data.flat[id]) { const img = new Image(); img.src = url; await img.decode(); pair.append(img); }
        cell.append(pair); grid.append(cell);
      }
      for (const entry of data.folded) {
        const cell = document.createElement('section'); cell.className = 'cell';
        const label = document.createElement('div'); label.className = 'label'; label.textContent = entry.label + ' · 0°'; cell.append(label);
        const img = new Image(); img.src = entry.image; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = 620; canvas.height = 455;
        // Crop only the surrounding controls; the garment's rendered pixels are unchanged.
        canvas.getContext('2d').drawImage(img, 300, 140, 620, 455, 0, 0, 620, 455);
        cell.append(canvas); grid.append(cell);
      }
    }, data);
    await page.screenshot({ path: path.join(out, 'comparison.jpg'), fullPage: true, type: 'jpeg', quality: 90 });
    console.log('Saved actual-render contact sheet: ' + path.join(out, 'comparison.jpg'));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
