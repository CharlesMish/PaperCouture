import { GARMENTS, GarmentId, AttachmentPosition, AttachmentAnchor } from '../fold/garments';
export type { GarmentId };
export type PinPosition = AttachmentPosition;
export type AccessoryId = 'pin' | 'bow';
export class StudioControls {
  readonly root = document.createElement('section');
  private design = document.createElement('select');
  private accessory = document.createElement('select');
  private accessoryLabel = document.createElement('label');
  private edit = document.createElement('button');
  private remove = document.createElement('button');
  private returnButton = document.createElement('button');
  private revisit = document.createElement('button');
  private position = document.createElement('select');
  private positionLabel = document.createElement('label');
  private note = document.createElement('span');
  constructor(parent: HTMLElement, h: {
    onDesign(id: GarmentId): void; onEdit(id: AccessoryId): void; onRemove(): void;
    onReturn(): void; onPosition(position: PinPosition): void; onRevisit(): void;
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
    this.accessory.add(new Option('Diamond pin', 'pin')); this.accessory.add(new Option('Two-sheet bow', 'bow'));
    this.accessoryLabel.append(this.accessory);
    for (const b of [this.edit, this.remove, this.returnButton, this.revisit]) b.className = 'studio-button';
    this.edit.onclick = () => h.onEdit(this.accessory.value as AccessoryId);
    this.accessory.onchange = () => { this.edit.textContent = 'Fold accessory'; };
    this.remove.textContent = 'Remove accessory'; this.remove.onclick = h.onRemove;
    this.returnButton.textContent = 'Back to garment'; this.returnButton.onclick = h.onReturn;
    this.revisit.textContent = 'Revisit shape fold'; this.revisit.onclick = h.onRevisit;
    this.positionLabel.textContent = 'Place ';
    this.position.setAttribute('aria-label', 'Accessory position');
    this.position.onchange = () => h.onPosition(this.position.value as PinPosition);
    this.positionLabel.append(this.position);
    this.note.className = 'studio-note';
    this.root.append(label, this.revisit, this.accessoryLabel, this.edit, this.positionLabel, this.remove, this.returnButton, this.note);
    parent.append(this.root);
  }
  render(id: GarmentId, accessoryMode: boolean, finished: boolean, attached: boolean, position: PinPosition, activeAccessory: AccessoryId, wing: number, canRevisit: boolean, anchors: AttachmentAnchor[]) {
    this.design.value = id; this.design.disabled = accessoryMode;
    this.edit.textContent = attached && this.accessory.value === activeAccessory ? 'Edit accessory' : 'Fold accessory';
    this.edit.hidden = accessoryMode || !finished; this.edit.disabled = !finished;
    this.accessoryLabel.hidden = accessoryMode || !finished;
    this.remove.hidden = accessoryMode || !attached || !finished;
    this.positionLabel.hidden = accessoryMode || !attached || !finished;
    const key = anchors.map(a => a.id + ':' + a.label).join('|');
    if (this.position.dataset.anchors !== key) {
      this.position.replaceChildren(...anchors.map(a => new Option(a.label, a.id)));
      this.position.dataset.anchors = key;
    }
    this.position.value = position;
    this.returnButton.hidden = !accessoryMode;
    this.revisit.hidden = accessoryMode || id !== 'dress' || !canRevisit;
    this.note.textContent = accessoryMode ? activeAccessory === 'bow' ? `Two-sheet bow · wing ${wing + 1} of 2` : 'Diamond pin · separate square' : finished ? 'Accessory optional · left/right as viewed' : 'Fold first, then add an accessory';
  }
  topInset(): number { return this.root.getBoundingClientRect().bottom + 10; }
}
