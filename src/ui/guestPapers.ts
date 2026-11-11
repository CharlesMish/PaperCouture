import { GARMENTS, type GarmentId } from '../fold/garments';
import { findPaper } from '../papers';

interface GuestLook {
  design: GarmentId;
  turn: number;
  square: number;
  choices?: Record<string, string>;
}

interface GuestPaper {
  paper: string;
  artist: string;
  photograph: string;
  caption: string;
  alt: string;
  looks: GuestLook[];
}

const collection: GuestPaper[] = [
  {
    paper: 'twice-folded',
    artist: 'Fable 5.2',
    photograph: new URL('../assets/guest/twice-folded.webp', import.meta.url).href,
    caption: 'Indigo blossoms gather around the fan’s rivet. The kimono turns the vat-blue reverse to the front.',
    alt: 'An open fan above a blue kimono on a linen pinboard.',
    looks: [
      { design: 'sensu', turn: 2, square: 20, choices: { sensu: 'print' } },
      { design: 'kimono', turn: 0, square: 24, choices: { kimono: 'reverse' } },
    ],
  },
  {
    paper: 'kintsugi-celadon',
    artist: 'Gemini Argon',
    photograph: new URL('../assets/guest/kintsugi-celadon.webp', import.meta.url).href,
    caption: 'A gold seam crosses the celadon glaze. The persimmon reverse appears at the gown’s shoulder and the coat’s cuffs.',
    alt: 'A celadon one-shoulder gown and coat-dress with cobalt motifs and red trim.',
    looks: [
      { design: 'gown', turn: 0, square: 24, choices: { gown: 'print' } },
      { design: 'coat-dress', turn: 2, square: 24, choices: { coat: 'print' } },
    ],
  },
  {
    paper: 'sardine-run',
    artist: 'Astra',
    photograph: new URL('../assets/guest/sardine-run.webp', import.meta.url).href,
    caption: 'Fish Market Saturday pairs a shoal across the shirt with fish running down the skirt. Tomato ticking peeks out at the collar and pleats.',
    alt: 'A fish-print camp shirt layered over a matching pleated skirt with tomato-red stripes.',
    looks: [
      { design: 'camp-shirt', turn: 0, square: 21.6 },
      { design: 'pleats', turn: 1, square: 24, choices: { pleats: 'deep' } },
    ],
  },
  {
    paper: 'afternoon-fig',
    artist: 'Grok 4.7',
    photograph: new URL('../assets/guest/afternoon-fig.webp', import.meta.url).href,
    caption: 'The swing coat turns the fig to the light across its shoulder. The capelet folds the shadow leaf away and keeps the lining.',
    alt: 'A plaster swing coat under an open capelet, with a luminous fig in the green lining and a dark fig on one panel.',
    looks: [
      { design: 'swing-coat', turn: 0, square: 24 },
      { design: 'capelet', turn: 0, square: 18 },
    ],
  },
];

function card(entry: GuestPaper): HTMLElement {
  const article = document.createElement('article');
  const image = document.createElement('img');
  image.src = entry.photograph;
  image.alt = entry.alt;
  image.width = 480;
  image.height = 600;

  const text = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = findPaper(entry.paper).name;
  const byline = document.createElement('p');
  byline.className = 'guest-artist';
  byline.textContent = entry.artist;
  const caption = document.createElement('p');
  caption.textContent = entry.caption;
  const links = document.createElement('div');
  links.className = 'guest-looks';
  for (const look of entry.looks) {
    const link = document.createElement('a');
    const query = new URLSearchParams({
      design: look.design, paper: entry.paper, turn: String(look.turn), square: String(look.square),
      ...look.choices, step: '99', view: 'display',
    });
    link.href = '?' + query;
    link.target = '_blank';
    link.rel = 'noopener';
    const name = GARMENTS.find(garment => garment.id === look.design)!.name;
    link.textContent = name;
    link.setAttribute('aria-label', `Open ${name} in ${title.textContent} (new tab)`);
    const size = document.createElement('small');
    size.textContent = `${look.square} cm`;
    link.append(size);
    links.append(link);
  }
  text.append(title, byline, caption, links);
  article.append(image, text);
  return article;
}

export class GuestPapers {
  readonly button = document.createElement('button');
  private dialog = document.createElement('dialog');
  private grid = document.createElement('div');
  private close = document.createElement('button');

  constructor(parent: HTMLElement) {
    this.button.type = 'button';
    this.button.className = 'studio-button guest-trigger';
    this.button.textContent = 'Guest papers';
    this.button.setAttribute('aria-haspopup', 'dialog');
    this.button.onclick = () => this.open();

    this.dialog.className = 'design-dialog guest-dialog';
    this.dialog.setAttribute('aria-labelledby', 'guest-title');
    const header = document.createElement('header');
    const title = document.createElement('h2');
    title.id = 'guest-title';
    title.textContent = 'Guest papers';
    this.close.type = 'button';
    this.close.className = 'studio-button';
    this.close.textContent = 'Close';
    this.close.onclick = () => this.dialog.close();
    header.append(title, this.close);
    const note = document.createElement('p');
    note.className = 'design-picker-note';
    note.textContent = 'Open a finished fold in a new tab. Use Workshop to unfold it or choose another paper.';
    this.grid.className = 'guest-grid';
    this.dialog.append(header, note, this.grid);
    this.dialog.addEventListener('keydown', event => event.stopPropagation());
    this.dialog.addEventListener('close', () => {
      const url = new URL(location.href);
      if (url.searchParams.has('gallery')) {
        url.searchParams.delete('gallery');
        history.replaceState(history.state, '', url);
      }
      this.button.focus({ preventScroll: true });
    });
    parent.append(this.dialog);
  }

  open() {
    if (!this.grid.childElementCount) this.grid.append(...collection.map(card));
    this.dialog.showModal();
    this.close.focus({ preventScroll: true });
    this.dialog.scrollTop = 0;
  }
}
