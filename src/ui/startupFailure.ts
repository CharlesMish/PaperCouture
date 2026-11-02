// When the 3D folding table cannot start (no WebGL: turned off, blocked by the
// graphics driver, or unavailable in this browser), say so plainly, offer to try
// again, and show the finished pieces as flat drawings instead of an empty page.
// While running, a lost graphics context gets a notice until it comes back.

import { BROWSE_GARMENTS } from './designOrder';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

export function showStartupFailure(app: HTMLElement, error: unknown): HTMLElement {
  const canvas = app.querySelector('canvas');
  if (canvas) canvas.hidden = true;
  const panel = el('section', 'startup-failure');
  panel.setAttribute('role', 'alert');
  panel.setAttribute('aria-labelledby', 'startup-failure-title');
  const title = el('h2', undefined, 'The folding table could not start');
  title.id = 'startup-failure-title';
  const why = el('p', undefined, 'Paper Couture folds the paper in 3D with WebGL, and this browser did not provide it. It can be turned off in the browser\'s settings, blocked for this graphics card, or not available in this browser or mode.');
  const next = el('p', undefined, 'Try again, or open the page in another browser or on another device. Below are the finished pieces, drawn flat.');
  const retry = el('button', 'btn btn-primary', 'Try again');
  retry.type = 'button';
  retry.onclick = () => location.reload();
  const detail = el('p', 'startup-failure-detail', `Details: ${error instanceof Error ? error.message : String(error)}`);
  const gallery = el('ul', 'design-grid startup-gallery');
  gallery.setAttribute('aria-label', 'Finished pieces');
  panel.append(title, why, next, retry, detail, gallery);
  app.append(panel);
  retry.focus({ preventScroll: true });
  import('./designPreviews').then(({ DESIGN_PREVIEWS }) => {
    for (const g of BROWSE_GARMENTS) {
      const preview = DESIGN_PREVIEWS[g.id];
      if (!preview) continue;
      const card = el('li', 'design-card');
      const thumb = el('span', 'design-thumbnail');
      thumb.innerHTML = preview.svg;
      card.append(thumb, el('span', 'design-card-name', g.name), el('span', 'design-card-detail', `${preview.steps} steps · one square`));
      gallery.append(card);
    }
  }).catch(() => gallery.remove());
  return panel;
}

/**
 * A notice while the graphics context is lost; it goes away when the context
 * returns. `reloadKeeps` says, at that moment, what a reload would keep: only the
 * piece in the address is restored, not an accessory being folded or attached.
 */
export function watchContextLoss(app: HTMLElement, canvas: HTMLCanvasElement, reloadKeeps: () => string): void {
  let notice: HTMLElement | null = null;
  canvas.addEventListener('webglcontextlost', () => {
    if (notice) return;
    notice = el('div', 'context-lost');
    notice.setAttribute('role', 'status');
    const text = el('p', undefined, `The 3D view was interrupted by the graphics system. It usually comes back on its own. ${reloadKeeps()}`);
    const reload = el('button', 'btn btn-quiet', 'Reload');
    reload.type = 'button';
    reload.onclick = () => location.reload();
    notice.append(text, reload);
    app.append(notice);
  });
  canvas.addEventListener('webglcontextrestored', () => { notice?.remove(); notice = null; });
}
