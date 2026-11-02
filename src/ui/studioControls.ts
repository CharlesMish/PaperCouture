import { DesignPicker, type DesignProgress } from './designPicker';
import { BROWSE_GARMENTS, DESIGN_FACTS, DIFFICULTIES } from './designOrder';
import { GarmentId, AttachmentPosition, AttachmentAnchor, garmentExperiment } from '../fold/garments';
import type { DecisionId, FoldDecision } from '../fold/garmentOptions';
export type { GarmentId };
export type PinPosition = AttachmentPosition;
import { ACCESSORIES, AccessoryId } from '../fold/accessories';
export type { AccessoryId };
export class StudioControls {
  readonly root = document.createElement('section');
  private designPicker: DesignPicker;
  private design = document.createElement('select');
  private accessory = document.createElement('select');
  private accessoryLabel = document.createElement('label');
  private edit = document.createElement('button');
  private remove = document.createElement('button');
  private returnButton = document.createElement('button');
  /** "Change": a button for each choice already made, which goes back to it. */
  private revisitGroup = document.createElement('span');
  private revisitButtons = document.createElement('span');
  private progress: DesignProgress = new Map();
  private position = document.createElement('select');
  private positionLabel = document.createElement('label');
  private note = document.createElement('span');
  /** Narrow screens, mid-fold: one row (Browse, Design, More); the rest opens under More. */
  private moreButton = document.createElement('button');
  private designLabel!: HTMLLabelElement;
  private barInset: number | null = null;
  /** Short screens keep a piece's construction notes behind this. */
  private noteToggle = document.createElement('button');
  private centreControls = document.createElement('span');
  private centreEdit = document.createElement('button');
  private centreToggle = document.createElement('button');
  /** The selection that was replaced by a fallback because the current garment
   * has no place for it. It is restored when it becomes available again, unless
   * the user has deliberately picked another accessory in the meantime. */
  private displaced: AccessoryId | null = null;
  /** The folded accessory and whether it is attached, from the last render, so
   * a selection change can label the action without waiting for a re-render. */
  private kept: { id: AccessoryId; attached: boolean } = { id: 'pin', attached: false };
  constructor(parent: HTMLElement, h: {
    onDesign(id: GarmentId): void; onEdit(id: AccessoryId): void; onRemove(): void;
    onReturn(): void; onPosition(position: PinPosition): void; onRevisit(id: DecisionId): void;
    onCentre(): void; onCentreToggle(): void;
    /** The short-screen piece notes were opened (the page closes other disclosures). */
    onNotesOpen?(): void;
  }) {
    this.designPicker = new DesignPicker(parent, h.onDesign);
    this.root.className = 'studio-controls';
    this.root.setAttribute('aria-label', 'Garment and accessory');
    const label = document.createElement('label'); this.designLabel = label;
    label.className = 'design-label';
    const labelText = document.createElement('span'); labelText.className = 'design-label-text'; labelText.textContent = 'Design ';
    label.append(labelText);
    this.design.setAttribute('aria-label', 'Garment design');
    // grouped by tier, easiest first, as in Browse pieces
    for (const tier of DIFFICULTIES) {
      const group = document.createElement('optgroup'); group.label = tier.name;
      for (const garment of BROWSE_GARMENTS) if (DESIGN_FACTS[garment.id].difficulty === tier.id) group.append(new Option(garment.name, garment.id));
      this.design.append(group);
    }
    this.design.title = 'Switch designs here. Completed folds are kept while this page stays open.';
    this.design.onchange = () => h.onDesign(this.design.value as GarmentId); label.append(this.design);
    this.accessoryLabel.textContent = 'Accessory ';
    this.accessory.setAttribute('aria-label', 'Accessory type');
    for (const accessory of ACCESSORIES) this.accessory.append(new Option(accessory.name, accessory.id));
    this.accessoryLabel.append(this.accessory);
    for (const b of [this.edit, this.remove, this.returnButton]) b.className = 'studio-button';
    this.edit.onclick = () => h.onEdit(this.accessory.value as AccessoryId);
    this.accessory.onchange = () => { this.displaced = null; this.edit.textContent = this.actionLabel(); };
    this.remove.textContent = 'Remove accessory'; this.remove.onclick = h.onRemove;
    this.returnButton.textContent = 'Back to garment'; this.returnButton.onclick = h.onReturn;
    this.revisitGroup.className = 'revisit-group';
    this.revisitGroup.setAttribute('role', 'group');
    this.revisitGroup.setAttribute('aria-label', 'Change a choice');
    const revisitText = document.createElement('span'); revisitText.textContent = 'Change'; revisitText.setAttribute('aria-hidden', 'true');
    this.revisitButtons.className = 'revisit-buttons';
    this.revisitButtons.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-revisit]');
      if (b && !b.disabled) h.onRevisit(b.dataset.revisit as DecisionId);
    });
    this.revisitGroup.append(revisitText, this.revisitButtons);
    this.positionLabel.textContent = 'Place ';
    this.position.setAttribute('aria-label', 'Accessory position (left and right as you look at it)');
    this.positionLabel.title = 'Left and right as you look at the piece';
    this.position.onchange = () => h.onPosition(this.position.value as PinPosition);
    this.positionLabel.append(this.position);
    this.note.className = 'studio-note';
    this.note.id = 'piece-notes';
    this.noteToggle.type = 'button';
    this.noteToggle.className = 'studio-button note-toggle';
    this.noteToggle.textContent = 'Piece notes';
    this.noteToggle.setAttribute('aria-controls', this.note.id);
    this.noteToggle.setAttribute('aria-expanded', 'false');
    this.noteToggle.onclick = () => {
      const open = !this.root.classList.contains('notes-open');
      this.setNotesOpen(open);
      if (open) h.onNotesOpen?.();
    };
    this.centreControls.className = 'centre-controls';
    this.centreEdit.className = this.centreToggle.className = 'studio-button';
    this.centreEdit.onclick = h.onCentre; this.centreToggle.onclick = h.onCentreToggle;
    this.centreToggle.textContent = 'Show folded centre';
    this.centreControls.append(this.centreEdit, this.centreToggle);
    this.root.id = 'studio-controls';
    this.moreButton.type = 'button';
    this.moreButton.className = 'studio-button more-toggle';
    this.moreButton.textContent = 'More';
    this.moreButton.setAttribute('aria-controls', this.root.id);
    this.moreButton.setAttribute('aria-expanded', 'false');
    this.moreButton.onclick = () => {
      const open = !this.root.classList.contains('more-open');
      this.setMoreOpen(open);
      if (open) h.onNotesOpen?.(); // More holds the notes too: it closes the instructions
    };
    // More closes on Escape, on a press outside it, and once a choice is made in it
    this.root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.root.classList.contains('more-open')) { this.setMoreOpen(false); this.moreButton.focus(); } });
    document.addEventListener('pointerdown', (e) => { if (this.root.classList.contains('more-open') && !this.root.contains(e.target as Node)) this.setMoreOpen(false); });
    this.root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button');
      if (b && b !== this.moreButton && b !== this.noteToggle && this.root.classList.contains('more-open')) this.setMoreOpen(false);
    });
    this.design.addEventListener('change', () => this.setMoreOpen(false));
    this.root.append(this.designPicker.button, label, this.moreButton, this.revisitGroup, this.accessoryLabel, this.edit, this.positionLabel, this.remove, this.centreControls, this.returnButton, this.noteToggle, this.note);
    parent.append(this.root);
  }
  /** Steps done in each design, for Browse pieces. */
  setProgress(progress: DesignProgress): void { this.progress = progress; }
  /** Narrow screens while a piece is being folded: the controls fold down to one row. */
  setFoldingBar(on: boolean): void {
    if (this.root.classList.contains('folding-bar') === on) return;
    this.root.classList.toggle('folding-bar', on);
    if (!on) this.setMoreOpen(false);
    this.barInset = null;
  }
  setMoreOpen(open: boolean): void {
    this.root.classList.toggle('more-open', open);
    this.moreButton.setAttribute('aria-expanded', String(open));
  }
  /** On a cramped screen the construction notes sit behind "Piece notes". */
  setCompactNotes(on: boolean): void {
    this.root.classList.toggle('compact-notes', on);
  }
  /** Open or close the construction notes when they are compact (otherwise they always show). */
  setNotesOpen(open: boolean): void {
    if (!open) this.setMoreOpen(false);
    this.root.classList.toggle('notes-open', open);
    this.noteToggle.setAttribute('aria-expanded', String(open));
  }
  renderCentre(available: boolean, complete: boolean, shown: boolean, editing: boolean) {
    this.centreControls.hidden = !available;
    this.centreEdit.textContent = complete ? 'Edit centre' : 'Fold centre';
    this.centreToggle.hidden = !complete;
    this.centreToggle.setAttribute('aria-pressed', String(shown));
    if (editing) this.note.textContent = 'Folded centre · third square · both wings are kept';
    else if (available && shown) this.note.textContent = 'Three-piece bow · optional folded centre';
  }
  render(id: GarmentId, accessoryMode: boolean, finished: boolean, attached: boolean, position: PinPosition, activeAccessory: AccessoryId, wing: number, revisit: FoldDecision[], anchors: AttachmentAnchor[], available: AccessoryId[] = ACCESSORIES.map(a => a.id), moving = false) {
    // Accessories with a restricted placement (neckerchief, patch pocket) are
    // only offered on garments that have one of their positions. An unavailable
    // selection falls back to the first available type, and is restored on the
    // way back so a kept accessory still shows its own name and edit action.
    for (const option of Array.from(this.accessory.options)) option.disabled = !available.includes(option.value as AccessoryId);
    if (this.displaced && available.includes(this.displaced)) { this.accessory.value = this.displaced; this.displaced = null; }
    if (!available.includes(this.accessory.value as AccessoryId) && available.length) {
      this.displaced ??= this.accessory.value as AccessoryId;
      this.accessory.value = available[0];
    }
    this.designPicker.render(id, accessoryMode, this.progress);
    this.design.value = id; this.design.disabled = accessoryMode;
    this.kept = { id: activeAccessory, attached };
    this.edit.textContent = this.actionLabel();
    this.edit.hidden = accessoryMode || !finished || !available.length; this.edit.disabled = !finished || !available.length;
    this.accessoryLabel.hidden = accessoryMode || !finished || !available.length;
    this.remove.hidden = accessoryMode || !attached || !finished || !available.length;
    this.positionLabel.hidden = accessoryMode || !attached || !finished || anchors.length === 0;
    const key = anchors.map(a => a.id + ':' + a.label).join('|');
    if (this.position.dataset.anchors !== key) {
      this.position.replaceChildren(...anchors.map(a => new Option(a.label, a.id)));
      this.position.dataset.anchors = key;
    }
    this.position.value = position;
    this.returnButton.hidden = !accessoryMode;
    this.revisitGroup.hidden = accessoryMode || revisit.length === 0;
    const revisitKey = revisit.map(d => d.id).join('|');
    if (this.revisitButtons.dataset.choices !== revisitKey) {
      this.revisitButtons.replaceChildren(...revisit.map(d => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'studio-button';
        b.dataset.revisit = d.id; b.textContent = d.label;
        b.setAttribute('aria-label', `Change ${d.label.toLowerCase()}`);
        b.title = 'Go back to this choice; your other folds and choices are kept';
        return b;
      }));
      this.revisitButtons.dataset.choices = revisitKey;
    }
    for (const b of this.revisitButtons.querySelectorAll('button')) b.disabled = moving;
    const accessoryName = ACCESSORIES.find(a => a.id === activeAccessory)!.name;
    this.note.textContent = accessoryMode ? activeAccessory === 'bow' ? `Two-piece bow · wing ${wing + 1} of 2` : `${accessoryName} · separate square`
      : finished && attached && anchors.length === 0 ? `${accessoryName} kept aside · this garment has no place for it` : '';
    const experiment = garmentExperiment(id);
    if (experiment && !accessoryMode) this.note.textContent = `${experiment}${attached ? ' · accessory kept aside' : ''}`;
    const accessoryExperiment = ACCESSORIES.find(a => a.id === activeAccessory)?.experiment;
    if (accessoryExperiment && (accessoryMode || attached && !experiment)) this.note.textContent = accessoryExperiment;
    this.note.classList.toggle('experiment-note', !!experiment && !accessoryMode || !!accessoryExperiment && (accessoryMode || attached));
    this.noteToggle.hidden = !this.note.classList.contains('experiment-note');
  }
  /** Edit reopens the attached piece with its progress; Fold starts a new square of another type. */
  private actionLabel(): string {
    return this.kept.attached && this.accessory.value === this.kept.id ? 'Edit accessory' : 'Fold accessory';
  }
  topInset(): number {
    // the folding bar: only its row counts; an opened More panel lies over the paper
    if (this.root.classList.contains('folding-bar')) {
      // measured closed; while More is open the paper keeps the closed framing
      if (!this.root.classList.contains('more-open') || this.barInset === null) {
        const row = [this.designPicker.button, this.designLabel, this.moreButton].map((e) => e.getBoundingClientRect().bottom);
        this.barInset = Math.max(...row) + 7 + 10;
      }
      return this.barInset;
    }
    // opened short-screen notes lie over the paper; the paper keeps its framing
    const overlay = this.root.classList.contains('notes-open') && this.root.classList.contains('compact-notes')
      ? this.note.getBoundingClientRect().height : 0;
    return this.root.getBoundingClientRect().bottom - overlay + 10;
  }
}
