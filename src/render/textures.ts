import * as THREE from 'three';
import { PaperDesign, PrintPosition } from '../papers/types';
import { normalizePosition, ORIGINAL, sourceShift } from '../papers/printPosition';
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

/** Bake translated ink on a finite sheet, then add stationary grain. Zero is
 * deliberately the original drawing path, preserving every existing paper. */
export function paperCanvas(design: PaperDesign, side: 'front' | 'back', quarterTurns: number, position: PrintPosition = ORIGINAL): HTMLCanvasElement {
  const p = normalizePosition(design, position), layers = design.placement;
  return paint((ctx, S) => {
    if (!layers || (!p.x && !p.y)) {
      if (side === 'front') design.drawFront(ctx, S); else design.drawBack(ctx, S);
      return;
    }
    ctx.fillStyle = side === 'front' ? layers.frontGround : layers.backGround;
    ctx.fillRect(0, 0, S, S);
    const shift = sourceShift(p, quarterTurns);
    ctx.save();
    ctx.translate((side === 'front' ? shift.x : -shift.x) * S, -shift.y * S);
    if (side === 'front') layers.front(ctx, S); else layers.back?.(ctx, S);
    ctx.restore();
  });
}

/**
 * Build the two textures for a paper. `quarterTurns` turns the whole sheet
 * relative to the folds (0..3): both faces, about the centre.
 */
export function makePaperTextures(design: PaperDesign, quarterTurns: number, maxAnisotropy: number, position: PrintPosition = ORIGINAL): PaperTextures {
  const setup = (t: THREE.CanvasTexture) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, maxAnisotropy);
    return t;
  };
  const front = setup(new THREE.CanvasTexture(paperCanvas(design, 'front', quarterTurns, position)));
  const back = setup(new THREE.CanvasTexture(paperCanvas(design, 'back', quarterTurns, position)));
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
