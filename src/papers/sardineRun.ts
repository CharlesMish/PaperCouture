import type { PaperDesign } from './types';
import { solid } from './util';

const salt = '#f8ecd2', ink = '#163954', blue = '#36799a', tomato = '#bb463a';

function sardine(c: CanvasRenderingContext2D, colour: string) {
  // A single carved silhouette, with short cuts for the gill and dorsal bars.
  c.fillStyle = colour;
  c.beginPath();
  c.moveTo(40, -1);
  c.bezierCurveTo(27, -16, 5, -13, -24, -2);
  c.lineTo(-38, -11); c.lineTo(-35, -1); c.lineTo(-40, 9); c.lineTo(-24, 3);
  c.bezierCurveTo(4, 12, 28, 14, 40, -1); c.fill();
  c.strokeStyle = salt; c.lineWidth = 1.7;
  c.beginPath(); c.moveTo(20, -7); c.quadraticCurveTo(15, -1, 21, 6); c.stroke();
  for (const x of [-13, -5, 3, 11]) {
    c.beginPath(); c.moveTo(x, -5); c.lineTo(x - 4, 0); c.stroke();
  }
  c.fillStyle = salt; c.beginPath(); c.arc(29, -3, 2.4, 0, Math.PI * 2); c.fill();
}

export const sardineRun: PaperDesign = {
  id: 'sardine-run', name: 'Sardine run', reverse: tomato,
  note: 'Block-cut shoals on salt paper, backed with tomato-red ticking',
  placementNote: 'Fixed print. Turn the square to change the direction of the shoals and the striped reverse.',
  drawFront(c, size) {
    solid(c, size, salt);
    c.save(); c.scale(size / 500, size / 500);
    for (let row = -1; row <= 11; row++) {
      for (let col = -1; col <= 6; col++) {
        c.save();
        c.translate(col * 105 + (row % 2) * 45, row * 46 + 17);
        c.scale(.90, .93);
        c.rotate(-.15 + .10 * Math.sin(row + col));
        if (row % 3 === 1) c.scale(-1, 1);
        sardine(c, (row + col) % 3 === 1 ? blue : ink);
        c.restore();
      }
    }
    c.restore();
  },
  drawBack(c, size) {
    solid(c, size, tomato);
    c.save(); c.scale(size / 500, size / 500);
    for (let x = 8; x < 500; x += 31) {
      c.fillStyle = '#f8cca3'; c.fillRect(x, 0, 3, 500);
      c.fillStyle = '#893c36'; c.fillRect(x + 5, 0, 2, 500);
      c.fillStyle = '#f8cca3'; c.fillRect(x + 9, 0, 1.4, 500);
    }
    c.restore();
  },
};
