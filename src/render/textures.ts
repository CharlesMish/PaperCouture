import * as THREE from 'three';
import { PaperDesign } from '../papers/types';
import { applySheetOrientation } from './sheetOrientation';

const SIZE = 1024;

let grainCanvas: HTMLCanvasElement | null = null;

/** Soft fibrous noise shared by every paper, so all of them read as matte paper. */
function grain(): HTMLCanvasElement {
  if (grainCanvas) return grainCanvas;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(256, 256);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rnd() - 0.5) * 70;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // a few long, faint fibres
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#fff';
  for (let i = 0; i < 120; i++) {
    const x = rnd() * 256;
    const y = rnd() * 256;
    const a = rnd() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 18, y + Math.sin(a) * 18);
    ctx.stroke();
  }
  grainCanvas = c;
  return c;
}

function paint(draw: (ctx: CanvasRenderingContext2D, size: number) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d')!;
  draw(ctx, SIZE);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = ctx.createPattern(grain(), 'repeat')!;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.restore();
  return c;
}

export interface PaperTextures {
  front: THREE.CanvasTexture;
  back: THREE.CanvasTexture;
  dispose(): void;
}

/**
 * Build the two textures for a paper. `quarterTurns` turns the whole sheet
 * relative to the folds (0..3): both faces, about the centre.
 */
export function makePaperTextures(design: PaperDesign, quarterTurns: number, maxAnisotropy: number): PaperTextures {
  const setup = (t: THREE.CanvasTexture) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, maxAnisotropy);
    return t;
  };
  const front = setup(new THREE.CanvasTexture(paint((c, s) => design.drawFront(c, s))));
  const back = setup(new THREE.CanvasTexture(paint((c, s) => design.drawBack(c, s))));
  applySheetOrientation(front, 'front', quarterTurns);
  applySheetOrientation(back, 'back', quarterTurns);
  return {
    front,
    back,
    dispose() {
      front.dispose();
      back.dispose();
    },
  };
}
