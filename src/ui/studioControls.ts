import { GARMENTS, GarmentId, AttachmentPosition, AttachmentAnchor, garmentExperiment } from '../fold/garments';
import type { DecisionId, FoldDecision } from '../fold/garmentOptions';
export type { GarmentId };
export type PinPosition = AttachmentPosition;
import { ACCESSORIES, AccessoryId } from '../fold/accessories';
export type { AccessoryId };
export class StudioControls {
  readonly root = document.createElement('section');
  private design = document.createElement('select');
  private accessory = document.createElement('select');
  private accessoryLabel = document.createElement('label');
  private edit = document.createElement('button');
  private remove = document.createElement('button');
  private returnButton = document.createElement('button');
  private revisit = document.createElement('button');
  private revisitChoice = document.createElement('select');
  private revisitLabel = document.createElement('label');
  private position = document.createElement('select');
  private positionLabel = document.createElement('label');
  private note = document.createElement('span');
  private accessoryPaper = document.createElement('span');
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
  }) {
    this.root.className = 'studio-controls';
    this.root.setAttribute('aria-label', 'Garment and accessory');
    const label = document.createElement('label'); label.textContent = 'Design ';
    this.design.setAttribute('aria-label', 'Garment design');
    for (const experimental of [false, true]) {
      const group = document.createElement('optgroup');
      group.label = experimental ? 'Experiments · one square' : 'Curated · collection';
      for (const garment of GARMENTS.filter(g => !!g.experiment === experimental)) group.append(new Option(garment.name, garment.id));
      this.design.append(group);
    }
    this.design.title = 'Switch designs here. Completed folds are kept while this page stays open.';
    this.design.onchange = () => h.onDesign(this.design.value as GarmentId); label.append(this.design);
    this.accessoryLabel.textContent = 'Accessory ';
    this.accessory.setAttribute('aria-label', 'Accessory type');
    for (const experimental of [false, true]) {
      const group = document.createElement('optgroup');
      group.label = experimental ? 'Experiments · separate square' : 'Collection';
      for (const a of ACCESSORIES.filter(a => !!a.experiment === experimental)) group.append(new Option(a.name, a.id));
      this.accessory.append(group);
    }
    this.accessoryLabel.append(this.accessory);
    for (const b of [this.edit, this.remove, this.returnButton, this.revisit]) b.className = 'studio-button';
    this.edit.onclick = () => h.onEdit(this.accessory.value as AccessoryId);
    this.accessory.onchange = () => { this.displaced = null; this.edit.textContent = this.actionLabel(); };
    this.remove.textContent = 'Remove accessory'; this.remove.onclick = h.onRemove;
    this.returnButton.textContent = 'Back to garment'; this.returnButton.onclick = h.onReturn;
    this.revisitLabel.textContent = 'Revisit ';
    this.revisitChoice.setAttribute('aria-label', 'Fold to revisit');
    this.revisit.textContent = 'Revisit fold'; this.revisit.onclick = () => h.onRevisit(this.revisitChoice.value as DecisionId);
    this.revisitLabel.append(this.revisitChoice, this.revisit);
    this.positionLabel.textContent = 'Place ';
    this.position.setAttribute('aria-label', 'Accessory position');
    this.position.onchange = () => h.onPosition(this.position.value as PinPosition);
    this.positionLabel.append(this.position);
    this.note.className = 'studio-note';
    this.accessoryPaper.id = 'accessory-paper-note';
    this.accessoryPaper.className = 'accessory-paper-note';
    this.edit.setAttribute('aria-describedby', this.accessoryPaper.id);
    this.centreControls.className = 'centre-controls';
    this.centreEdit.className = this.centreToggle.className = 'studio-button';
    this.centreEdit.onclick = h.onCentre; this.centreToggle.onclick = h.onCentreToggle;
    this.centreToggle.textContent = 'Show folded centre';
    this.centreControls.append(this.centreEdit, this.centreToggle);
    this.root.append(label, this.revisitLabel, this.accessoryLabel, this.edit, this.positionLabel, this.remove, this.centreControls, this.returnButton, this.note, this.accessoryPaper);
    parent.append(this.root);
  }
  renderCentre(available: boolean, complete: boolean, shown: boolean, editing: boolean) {
    this.centreControls.hidden = !available;
    this.centreEdit.textContent = complete ? 'Edit centre' : 'Fold centre';
    this.centreToggle.hidden = !complete;
    this.centreToggle.setAttribute('aria-pressed', String(shown));
    if (editing) this.note.textContent = 'Folded centre · third square · both wings are kept';
    else if (available && shown) this.note.textContent = 'Three-piece bow · optional folded centre';
  }
  render(id: GarmentId, accessoryMode: boolean, finished: boolean, attached: boolean, position: PinPosition, activeAccessory: AccessoryId, wing: number, revisit: FoldDecision[], anchors: AttachmentAnchor[], available: AccessoryId[] = ACCESSORIES.map(a => a.id), accessoryPaperName?: string) {
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
    this.design.value = id; this.design.disabled = accessoryMode;
    this.kept = { id: activeAccessory, attached };
    this.edit.textContent = this.actionLabel();
    this.edit.hidden = accessoryMode || !finished || !available.length; this.edit.disabled = !finished || !available.length;
    this.accessoryPaper.hidden = this.edit.hidden || !accessoryPaperName;
    this.accessoryPaper.textContent = accessoryPaperName ? `Accessory paper: ${accessoryPaperName} · change in its workshop` : '';
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
    this.revisitLabel.hidden = accessoryMode || revisit.length === 0;
    const revisitKey = revisit.map(d => d.id).join('|');
    if (this.revisitChoice.dataset.choices !== revisitKey) {
      const selected = this.revisitChoice.value;
      this.revisitChoice.replaceChildren(...revisit.map(d => new Option(d.label, d.id)));
      if (revisit.some(d => d.id === selected)) this.revisitChoice.value = selected;
      this.revisitChoice.dataset.choices = revisitKey;
    }
    const accessoryName = ACCESSORIES.find(a => a.id === activeAccessory)!.name;
    this.note.textContent = accessoryMode ? activeAccessory === 'bow' ? `Two-piece bow · wing ${wing + 1} of 2` : `${accessoryName} · separate square`
      : finished ? attached && anchors.length === 0 ? `${accessoryName} kept aside · this garment has no place for it` : 'Accessory optional · left/right as viewed' : 'Fold first, then add an accessory';
    const experiment = garmentExperiment(id);
    if (experiment && !accessoryMode) this.note.textContent = `Experimental · ${experiment}${attached ? ' · accessory kept aside' : ''}`;
    const accessoryExperiment = ACCESSORIES.find(a => a.id === activeAccessory)?.experiment;
    if (accessoryExperiment && (accessoryMode || attached && !experiment)) this.note.textContent = `Experimental · ${accessoryExperiment}`;
    this.note.classList.toggle('experiment-note', !!experiment && !accessoryMode || !!accessoryExperiment && (accessoryMode || attached));
  }
  /** Edit reopens the attached piece with its progress; Fold starts a new square of another type. */
  private actionLabel(): string {
    return this.kept.attached && this.accessory.value === this.kept.id ? 'Edit accessory' : 'Fold accessory';
  }
  topInset(): number { return this.root.getBoundingClientRect().bottom + 10; }
}
