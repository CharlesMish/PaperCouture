import * as THREE from 'three';

export type CorkTone = 'natural' | 'rose' | 'slate';

const CORK_COLORS: Record<CorkTone, readonly [number, number, number]> = {
  natural: [183, 143, 101],
  rose: [177, 140, 132],
  slate: [112, 121, 119],
};

/**
 * A single, non-repeating cork sheet. Width/height are the board's dimensions;
 * its longest raster edge is capped at 1024 px. The same grain is used for each
 * colour so changing the stain does not rearrange the board surface.
 *
 * The caller owns the returned texture and must dispose it when replaced.
 */
export function createCorkTexture(tone: CorkTone, width: number, height: number): THREE.CanvasTexture {
  const aspect = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? Math.max(1 / 8, Math.min(8, width / height)) : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(1024 * Math.min(1, aspect));
  canvas.height = Math.round(1024 / Math.max(1, aspect));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('A drawing canvas is needed for the cork surface.');

  // An irregular cellular field gives the compressed granules their boundaries.
  // Cell data are small typed arrays; drawing is one bounded image-data pass,
  // with no per-pixel objects, canvas paths, cache growth or external artwork.
  const cellSize = 5.5;
  const cols = Math.ceil(canvas.width / cellSize) + 2;
  const rows = Math.ceil(canvas.height / cellSize) + 2;
  const cellX = new Float32Array(cols * rows);
  const cellY = new Float32Array(cols * rows);
  const shade = new Float32Array(cols * rows);
  let seed = 0x71c04a2d;
  const random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 0x100000000;
  };
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = y * cols + x;
    cellX[i] = (x - 1 + .16 + random() * .68) * cellSize;
    cellY[i] = (y - 1 + .16 + random() * .68) * cellSize;
    // Most chips are quiet mid-tones; a few dark fragments make it read as cork
    // rather than a regular, equally outlined stone mosaic.
    shade[i] = (random() - .5) * 18 - (random() < .16 ? 9 : 0);
  }

  const pixels = ctx.createImageData(canvas.width, canvas.height);
  const data = pixels.data, base = CORK_COLORS[tone];
  for (let y = 0; y < canvas.height; y++) {
    const row = Math.floor(y / cellSize);
    for (let x = 0; x < canvas.width; x++) {
      const col = Math.floor(x / cellSize);
      let closest = Infinity, second = Infinity, selected = 0;
      for (let j = row; j <= row + 2; j++) for (let i = col; i <= col + 2; i++) {
        const n = j * cols + i;
        const dx = x - cellX[n], dy = y - cellY[n];
        const distance = dx * dx + dy * dy;
        if (distance < closest) { second = closest; closest = distance; selected = n; }
        else if (distance < second) second = distance;
      }
      const edge = Math.max(0, 1 - (second - closest) / 4);
      const noise = (random() - .5) * 9;
      const pore = random() < .009 ? 15 + random() * 10 : 0;
      const value = shade[selected] - edge * 5 + noise - pore;
      const k = (y * canvas.width + x) * 4;
      data[k] = base[0] + value;
      data[k + 1] = base[1] + value * .86;
      data[k + 2] = base[2] + value * .69;
      data[k + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `Cork · ${tone}`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
