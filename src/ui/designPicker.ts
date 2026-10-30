import type { GarmentId } from '../fold/garments';
import { BROWSE_GARMENTS, DIFFICULTIES, DESIGN_FACTS, designDetail, isExperimental, pairOf, START_HERE } from './designOrder';

/** Where the visitor has got to with a piece: steps done of the total. */
export type DesignProgress = ReadonlyMap<GarmentId, { done: number; total: number }>;

export class DesignPicker {
  readonly button = document.createElement('button');
  readonly dialog = document.createElement('dialog');
  /** Every design's choose button (a pair card holds two). */
  private cards = new Map<GarmentId, HTMLButtonElement>();
  /** Each card's progress line, with the designs it reports on. */
  private status: { line: HTMLElement; ids: GarmentId[] }[] = [];
  private thumbs = new Map<GarmentId, HTMLElement>();
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
    note.textContent = 'Each piece folds from one uncut square. Easiest first: new to folding? Start with the Dress. Choose your paper once you have picked a piece, and combine finished pieces on your pinboard.';
    const pick = (id: GarmentId) => { this.dialog.close(); if (id !== this.current) choose(id); };
    const sections: HTMLElement[] = [];
    const placed = new Set<GarmentId>();
    for (const tier of DIFFICULTIES) {
      const section = document.createElement('section'); section.className = 'design-tier';
      const heading = document.createElement('h3'); heading.id = `design-tier-${tier.id}`; heading.textContent = tier.name;
      const about = document.createElement('p'); about.className = 'design-tier-about'; about.textContent = tier.about;
      section.setAttribute('aria-labelledby', heading.id);
      const grid = document.createElement('div'); grid.className = 'design-grid';
      for (const g of BROWSE_GARMENTS) {
        if (DESIGN_FACTS[g.id].difficulty !== tier.id || placed.has(g.id)) continue;
        const pair = pairOf(g.id);
        if (pair) {
          // one card, a button for each side
          const card = document.createElement('div'); card.className = 'design-card design-pair';
          const thumb = this.thumbnail(g.id);
          const name = document.createElement('span'); name.className = 'design-card-name'; name.textContent = pair.name;
          const sides = document.createElement('div'); sides.className = 'design-pair-sides';
          sides.setAttribute('role', 'group'); sides.setAttribute('aria-label', pair.name);
          for (const [id, side] of pair.members) {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'design-side';
            b.dataset.design = id; b.textContent = side;
            b.setAttribute('aria-label', GARMENT_NAME(id)); b.onclick = () => pick(id);
            this.cards.set(id, b); sides.append(b); placed.add(id);
          }
          card.append(thumb, name, this.badges(g.id), this.detail(g.id), sides, this.progress(pair.members.map(([id]) => id)));
          grid.append(card);
          continue;
        }
        const card = document.createElement('button'); card.type = 'button'; card.className = 'design-card';
        card.dataset.design = g.id; card.setAttribute('aria-label', g.name);
        const name = document.createElement('span'); name.className = 'design-card-name'; name.textContent = g.name;
        card.append(this.thumbnail(g.id), name, this.badges(g.id), this.detail(g.id), this.progress([g.id]));
        card.onclick = () => pick(g.id);
        this.cards.set(g.id, card); placed.add(g.id); grid.append(card);
      }
      section.append(heading, about, grid); sections.push(section);
    }
    const caption = document.createElement('p'); caption.className = 'design-picker-note';
    caption.textContent = 'Shapes shown in two plain colours with their default folds, each at its own scale. Experimental pieces are newer flat studies; their notes say what they leave out.';
    this.dialog.append(header, note, ...sections, caption); parent.append(this.dialog);
    // A modal's arrows/Escape must not also operate the underlying fold/view.
    this.dialog.addEventListener('keydown', event => event.stopPropagation());
    this.dialog.addEventListener('close', () => this.button.focus({ preventScroll: true }));
    this.button.onclick = async () => {
      this.dialog.showModal();
      // Keep the opening view at the start, even when a later piece is selected.
      close.focus({ preventScroll: true }); this.dialog.scrollTop = 0;
      if (!this.built) {
        try {
          const { DESIGN_PREVIEWS } = await import('./designPreviews');
          for (const [id, thumb] of this.thumbs) thumb.innerHTML = DESIGN_PREVIEWS[id].svg;
          this.built = true;
        } catch {
          caption.textContent = 'Previews could not load. You can still choose a piece by name, or close and try again.';
        }
      }
    };
  }
  private thumbnail(id: GarmentId) {
    const thumb = document.createElement('span'); thumb.className = 'design-thumbnail'; thumb.setAttribute('aria-hidden', 'true');
    this.thumbs.set(id, thumb); return thumb;
  }
  private badges(id: GarmentId) {
    const badges = document.createElement('span'); badges.className = 'design-badges';
    if (id === START_HERE) badges.append(badge('Start here', 'start'));
    if (isExperimental(id)) badges.append(badge('Experimental', 'experimental'));
    return badges;
  }
  private detail(id: GarmentId) {
    const detail = document.createElement('span'); detail.className = 'design-card-detail'; detail.textContent = designDetail(id);
    return detail;
  }
  private progress(ids: GarmentId[]) {
    const line = document.createElement('span'); line.className = 'design-card-status'; line.hidden = true;
    this.status.push({ line, ids });
    return line;
  }
  render(id: GarmentId, accessoryMode: boolean, progress: DesignProgress = new Map()) {
    this.current = id; this.button.disabled = accessoryMode;
    for (const [key, card] of this.cards) card.setAttribute('aria-pressed', String(key === id));
    for (const { line, ids } of this.status) {
      // a pair card reports each side that has been started
      const parts = ids.flatMap(k => {
        const p = progress.get(k);
        if (!p || p.done <= 0) return [];
        const where = p.done >= p.total ? 'folded' : `${p.done} of ${p.total} steps done`;
        return [ids.length > 1 ? `${sideName(k)}: ${where}` : where.charAt(0).toUpperCase() + where.slice(1)];
      });
      line.textContent = parts.join(' · ');
      line.hidden = !parts.length;
    }
  }
}

const GARMENT_NAME = (id: GarmentId) => BROWSE_GARMENTS.find(g => g.id === id)!.name;
const sideName = (id: GarmentId) => pairOf(id)?.members.find(([m]) => m === id)?.[1] ?? '';
function badge(text: string, kind: string) {
  const b = document.createElement('span'); b.className = `design-badge design-badge-${kind}`; b.textContent = text; return b;
}
