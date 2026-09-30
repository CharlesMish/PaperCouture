import { GARMENTS, GarmentId, AttachmentPosition, AttachmentAnchor } from '../fold/garments';
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
  private centreControls = document.createElement('span');
  private centreEdit = document.createElement('button');
  private centreToggle = document.createElement('button');
  /** The selection that was replaced by a fallback because the current garment
   * has no place for it. It is restored when it becomes available again, unless
   * the user has deliberately picked another accessory in the meantime. */
  private displaced: AccessoryId | null = null;
  constructor(parent: HTMLElement, h: {
    onDesign(id: GarmentId): void; onEdit(id: AccessoryId): void; onRemove(): void;
    onReturn(): void; onPosition(position: PinPosition): void; onRevisit(id: DecisionId): void;
    onCentre(): void; onCentreToggle(): void;
  }) {
    this.root.className = 'studio-controls';
    this.root.setAttribute('aria-label', 'Garment and accessory');
    const label = document.createElement('label'); label.textContent = 'Design ';
    this.design.setAttribute('aria-label', 'Garment design');
    for (const garment of GARMENTS) this.design.add(new Option(garment.name, garment.id));
    this.design.title = 'Changing design starts a new square; your paper choices are kept.';
    this.design.onchange = () => h.onDesign(this.design.value as GarmentId); label.append(this.design);
    this.accessoryLabel.textContent = 'Accessory ';
    this.accessory.setAttribute('aria-label', 'Accessory type');
    for (const a of ACCESSORIES) this.accessory.add(new Option(a.name, a.id));
    this.accessoryLabel.append(this.accessory);
    for (const b of [this.edit, this.remove, this.returnButton, this.revisit]) b.className = 'studio-button';
    this.edit.onclick = () => h.onEdit(this.accessory.value as AccessoryId);
    this.accessory.onchange = () => { this.displaced = null; this.edit.textContent = 'Fold accessory'; };
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
    this.centreControls.className = 'centre-controls';
    this.centreEdit.className = this.centreToggle.className = 'studio-button';
    this.centreEdit.onclick = h.onCentre; this.centreToggle.onclick = h.onCentreToggle;
    this.centreToggle.textContent = 'Show folded centre';
    this.centreControls.append(this.centreEdit, this.centreToggle);
    this.root.append(label, this.revisitLabel, this.accessoryLabel, this.edit, this.positionLabel, this.remove, this.centreControls, this.returnButton, this.note);
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
  render(id: GarmentId, accessoryMode: boolean, finished: boolean, attached: boolean, position: PinPosition, activeAccessory: AccessoryId, wing: number, revisit: FoldDecision[], anchors: AttachmentAnchor[], available: AccessoryId[] = ACCESSORIES.map(a => a.id)) {
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
    this.edit.textContent = attached && this.accessory.value === activeAccessory ? 'Edit accessory' : 'Fold accessory';
    this.edit.hidden = accessoryMode || !finished; this.edit.disabled = !finished;
    this.accessoryLabel.hidden = accessoryMode || !finished;
    this.remove.hidden = accessoryMode || !attached || !finished;
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
  }
  topInset(): number { return this.root.getBoundingClientRect().bottom + 10; }
}
