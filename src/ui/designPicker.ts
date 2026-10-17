import type { GarmentId } from '../fold/garments';
import { BROWSE_GARMENTS } from './designOrder';

export class DesignPicker {
  readonly button = document.createElement('button');
  readonly dialog = document.createElement('dialog');
  private cards = new Map<GarmentId, HTMLButtonElement>();
  private current: GarmentId = 'dress';
  private built = false;

  constructor(parent: HTMLElement, choose: (id: GarmentId) => void) {
    this.button.type = 'button'; this.button.className = 'studio-button browse-designs';
    this.button.textContent = 'Browse pieces'; this.button.setAttribute('aria-haspopup', 'dialog');
    this.dialog.className = 'design-dialog'; this.dialog.setAttribute('aria-labelledby', 'design-picker-title');
    const header = document.createElement('header');
    const title = document.createElement('h2'); title.id = 'design-picker-title'; title.textContent = 'Choose a piece to fold';
    const close = document.createElement('button'); close.type = 'button'; close.className = 'studio-button';
    close.textContent = 'Close'; close.onclick = () => this.dialog.close();
    header.append(title, close);
    const note = document.createElement('p'); note.className = 'design-picker-note';
    note.textContent = 'A look at the finished shapes. Pick a piece, then make it yours with paper and colour. Each piece folds separately; combine them on your pinboard.';
    const grid = document.createElement('div'); grid.className = 'design-grid';
    const caption = document.createElement('p'); caption.className = 'design-picker-note';
    caption.textContent = 'Default folds shown at individual scales. Shape previews use two plain paper colours; your paper and fold choices can change the result.';
    for (const g of BROWSE_GARMENTS) {
      const card = document.createElement('button'); card.type = 'button'; card.className = 'design-card';
      card.dataset.design = g.id; card.setAttribute('aria-label', g.name);
      const thumb = document.createElement('span'); thumb.className = 'design-thumbnail'; thumb.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span'); name.className = 'design-card-name'; name.textContent = g.name;
      const detail = document.createElement('span'); detail.className = 'design-card-detail'; detail.textContent = 'One square';
      card.append(thumb, name, detail);
      card.onclick = () => { this.dialog.close(); if (g.id !== this.current) choose(g.id); };
      this.cards.set(g.id, card); grid.append(card);
    }
    this.dialog.append(header, note, grid, caption); parent.append(this.dialog);
    // A modal's arrows/Escape must not also operate the underlying fold/view.
    this.dialog.addEventListener('keydown', event => event.stopPropagation());
    this.dialog.addEventListener('close', () => this.button.focus({ preventScroll: true }));
    this.button.onclick = async () => {
      this.dialog.showModal();
      // Keep the opening view at the leading pieces, even when a later one is selected.
      close.focus({ preventScroll: true }); this.dialog.scrollTop = 0;
      if (!this.built) {
        try {
          const { DESIGN_PREVIEWS } = await import('./designPreviews');
          for (const [id, card] of this.cards) {
            card.querySelector('.design-thumbnail')!.innerHTML = DESIGN_PREVIEWS[id].svg;
            card.querySelector('.design-card-detail')!.textContent = `${DESIGN_PREVIEWS[id].steps} steps · one square`;
          }
          this.built = true;
        } catch {
          caption.textContent = 'Previews could not load. You can still choose a piece by name, or close and try again.';
        }
      }
    };
  }
  render(id: GarmentId, accessoryMode: boolean) {
    this.current = id; this.button.disabled = accessoryMode;
    for (const [key, card] of this.cards) card.setAttribute('aria-pressed', String(key === id));
  }
}
