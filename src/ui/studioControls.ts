export type GarmentId = 'dress' | 'jacket';
export type PinPosition = 'neckline' | 'chest' | 'waist';
export class StudioControls {
  readonly root = document.createElement('section');
  private design = document.createElement('select');
  private edit = document.createElement('button');
  private remove = document.createElement('button');
  private returnButton = document.createElement('button');
  private position = document.createElement('select');
  private positionLabel = document.createElement('label');
  private note = document.createElement('span');
  constructor(parent: HTMLElement, h: {
    onDesign(id: GarmentId): void; onEdit(): void; onRemove(): void;
    onReturn(): void; onPosition(position: PinPosition): void;
  }) {
    this.root.className = 'studio-controls';
    this.root.setAttribute('aria-label', 'Garment and accessory');
    const label = document.createElement('label');
    label.textContent = 'Design ';
    this.design.setAttribute('aria-label', 'Garment design');
    this.design.add(new Option('A-line dress', 'dress'));
    this.design.add(new Option('Box jacket', 'jacket'));
    this.design.title = 'Changing design starts a new square; your paper choices are kept.';
    this.design.onchange = () => h.onDesign(this.design.value as GarmentId);
    label.append(this.design);
    for (const b of [this.edit, this.remove, this.returnButton]) b.className = 'studio-button';
    this.edit.onclick = h.onEdit;
    this.remove.textContent = 'Remove pin'; this.remove.onclick = h.onRemove;
    this.returnButton.textContent = 'Back to garment'; this.returnButton.onclick = h.onReturn;
    this.positionLabel.textContent = 'Place ';
    this.position.setAttribute('aria-label', 'Pin position');
    for (const [name, value] of [['Neckline', 'neckline'], ['Chest', 'chest'], ['Waist', 'waist']]) this.position.add(new Option(name, value));
    this.position.onchange = () => h.onPosition(this.position.value as PinPosition);
    this.positionLabel.append(this.position);
    this.note.className = 'studio-note';
    this.root.append(label, this.edit, this.positionLabel, this.remove, this.returnButton, this.note);
    parent.append(this.root);
  }
  render(id: GarmentId, accessory: boolean, finished: boolean, attached: boolean, position: PinPosition) {
    this.design.value = id; this.design.disabled = accessory;
    this.edit.textContent = attached ? 'Edit pin' : 'Fold a pin';
    this.edit.hidden = accessory; this.edit.disabled = !finished;
    this.remove.hidden = accessory || !attached;
    this.positionLabel.hidden = accessory || !attached;
    this.position.value = position;
    this.returnButton.hidden = !accessory;
    this.note.textContent = accessory ? 'Diamond pin · separate square' : finished ? 'Accessory optional' : 'Finish folding to add a pin';
  }
  topInset(): number { return this.root.getBoundingClientRect().bottom + 10; }
}
