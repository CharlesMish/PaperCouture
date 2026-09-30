// Browser entry for scripts/paperCoverage.ts: draws both faces of every paper on
// a canvas, exactly as the app does, and returns the RGB bytes (base64).
import { PAPERS } from '../src/papers';

declare global { interface Window { rasterPapers(n: number): { id: string; name: string; hidden: boolean; front: string; back: string }[] } }
window.rasterPapers = (n: number) => PAPERS.map(p => {
  const face = (draw: (ctx: CanvasRenderingContext2D, size: number) => void) => {
    const c = document.createElement('canvas'); c.width = c.height = n;
    const ctx = c.getContext('2d')!; draw.call(p, ctx, n);
    const d = ctx.getImageData(0, 0, n, n).data;
    const rgb = new Uint8Array(n * n * 3);
    for (let i = 0; i < n * n; i++) { rgb[i * 3] = d[i * 4]; rgb[i * 3 + 1] = d[i * 4 + 1]; rgb[i * 3 + 2] = d[i * 4 + 2]; }
    let s = '';
    for (let i = 0; i < rgb.length; i += 8192) s += String.fromCharCode(...rgb.subarray(i, i + 8192));
    return btoa(s);
  };
  return { id: p.id, name: p.name, hidden: !!p.hidden, front: face(p.drawFront), back: face(p.drawBack) };
});
