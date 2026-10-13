// Optional focused browser check. Injects only the unregistered candidate into
// the live in-memory paper list, then uses the unchanged app/material renderer.
// Run against a Vite dev server. No source registry, saved board or geometry edits.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.BASE_URL || 'http://127.0.0.1:5354';
const out = process.env.CAPTURE_DIR || path.join(__dirname, 'evidence');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 }, reducedMotion: 'reduce' });
  const result = { errors: [], captures: [], checks: [] };
  page.on('pageerror', e => result.errors.push(String(e)));
  const ready = () => page.waitForFunction(() => window.paperCouture && !paperCouture.controller.moving && paperCouture.view.t === paperCouture.view.target && !paperCouture.displayCam.glide);
  const inject = () => page.evaluate(async () => {
    const { PAPERS } = await import('/src/papers/index.ts');
    const { duskWash } = await import('/src/papers/duskWash.ts');
    if (!PAPERS.some(p => p.id === duskWash.id)) PAPERS.push(duskWash);
  });
  const shot = async name => { await page.screenshot({ path: path.join(out, name + '.png') }); result.captures.push(name); };
  try {
    await page.goto(base); await ready(); await inject();
    result.registration = await page.evaluate(async () => {
      const { duskWash } = await import('/src/papers/duskWash.ts');
      const { paperCanvas, makePaperTextures } = await import('/src/render/textures.ts');
      const { Vector2 } = await import('/node_modules/.vite/deps/three.js');
      const N = 1024;
      // Keep the actual Canvas path, transforms and stops. Replace each face's
      // colour palette with one common scalar ramp so matching material dye
      // positions can be compared independently of the intentional colours.
      const masks = ['drawFront', 'drawBack'].map(side => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = N;
        const ctx = canvas.getContext('2d'), nativeGradient = ctx.createLinearGradient.bind(ctx);
        ctx.createLinearGradient = (...args) => {
          const gradient = nativeGradient(...args), nativeStop = gradient.addColorStop.bind(gradient);
          let i = 0; gradient.addColorStop = (offset) => {
            const v = [0, 0, 85, 170, 255][i++]; nativeStop(offset, `rgb(${v},${v},${v})`);
          };
          return gradient;
        };
        duskWash[side](ctx, N);
        return ctx.getImageData(0, 0, N, N).data;
      });
      const sample = (data, uv) => {
        const x = Math.max(0, Math.min(N - 1, Math.floor(uv.x * N)));
        const y = Math.max(0, Math.min(N - 1, Math.floor((1 - uv.y) * N)));
        return data[(y * N + x) * 4];
      };
      const turns = [];
      for (let q = 0; q < 4; q++) {
        const textures = makePaperTextures(duskWash, q, 1);
        let largest = 0, mismatched = 0, samples = 0;
        for (let y = 1; y < 200; y++) for (let x = 1; x < 200; x++) {
          const uv = new Vector2(x / 200, y / 200);
          const a = uv.clone().applyMatrix3(textures.front.matrix), b = uv.clone().applyMatrix3(textures.back.matrix);
          const difference = Math.abs(sample(masks[0], a) - sample(masks[1], b));
          largest = Math.max(largest, difference); if (difference > 1) mismatched++; samples++;
        }
        textures.dispose(); turns.push({ q, samples, largest, mismatched });
      }
      const hash = async c => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', c.getContext('2d').getImageData(0, 0, N, N).data))).map(v => v.toString(16).padStart(2, '0')).join('');
      const hashes = {};
      for (const side of ['front', 'back']) {
        hashes[side] = await hash(paperCanvas(duskWash, side, 0));
        if (hashes[side] !== await hash(paperCanvas(duskWash, side, 0))) throw Error('Nondeterministic paper');
        if (hashes[side] !== await hash(paperCanvas(duskWash, side, 0, { x: .2, y: -.2 }))) throw Error('Fixed placement accepted offset');
      }
      return { turns, hashes, fixedPlacement: !duskWash.placement };
    });
    assert(result.registration.turns.every(t => t.mismatched === 0 && t.largest <= 1));
    assert.notEqual(result.registration.hashes.front, result.registration.hashes.back);
    assert(result.registration.fixedPlacement);
    result.checks.push('39,601 material points per turn: actual front/back texture matrices retain matching scalar wash field within one 8-bit level at all four turns.');
    result.checks.push('Actual grain-overlaid front and back repeat exactly, differ from each other, and ignore unsupported placement.');
    const flats = await page.evaluate(async () => {
      const { PAPERS } = await import('/src/papers/index.ts');
      const { paperCanvas } = await import('/src/render/textures.ts');
      return ['dusk-wash', 'oat-linen', 'slate-grain', 'copper-fleck'].flatMap(id => ['front', 'back'].map(side => ({ name: id + '-flat-' + side, url: paperCanvas(PAPERS.find(p => p.id === id), side, 0).toDataURL() })));
    });
    for (const flat of flats) fs.writeFileSync(path.join(out, flat.name + '.png'), Buffer.from(flat.url.split(',')[1], 'base64'));
    for (const design of ['swing-coat', 'camp-shirt', 'pleats', 'framed-brooch']) {
      await page.goto(base + `/?design=${design}&paper=oat-linen&step=99&view=display`); await ready(); await inject();
      for (const paper of ['dusk-wash', 'oat-linen', 'slate-grain', 'copper-fleck']) {
        await page.evaluate(id => paperCouture.setPaper(id), paper); await ready();
        await page.getByRole('button', { name: 'Front', exact: true }).click(); await ready();
        await shot(`${design}-${paper}-front`);
        if (paper === 'dusk-wash') {
          await page.getByRole('button', { name: 'Back', exact: true }).click(); await ready();
          await shot(`${design}-${paper}-back`);
          await page.getByRole('button', { name: 'Front', exact: true }).click(); await ready();
        }
      }
    }
    await page.goto(base + '/?design=swing-coat&paper=oat-linen&step=99&view=display'); await ready(); await inject();
    await page.evaluate(() => paperCouture.setPaper('dusk-wash'));
    await page.getByRole('button', { name: 'Front', exact: true }).click(); await ready();
    for (let q = 0; q < 4; q++) { await page.evaluate(q => paperCouture.rotatePattern(q), q); await ready(); await shot(`swing-coat-dusk-wash-turn-${q}`); }
    await page.evaluate(() => paperCouture.rotatePattern(0)); await ready();
    result.checks.push('Actual unchanged WebGL renderer: matched coat/shirt/skirt/brooch front comparisons against Oat linen, Slate grain and Copper fleck; candidate reverse and all four coat turns captured.');
    assert.deepEqual(result.errors, []); result.passed = true;
  } finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
