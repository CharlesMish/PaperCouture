// Figure study: can the wardrobe dress a person? A sketch-lane page, like the
// placement review. It reads src/ and nothing in src/ reads it.
import { PAPERS } from '../../src/papers';
import { BODY, SQUARES, TABLE_LIST } from './parts';
import { Board, Dress, Hair, POSES, STATES, facing, flatKimonoFigure, hairBack, face, neck, foot, place, sprite, westernFigure, wornFigure } from './scene';

const root = document.getElementById('root')!;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
};
const PX = 44; // pixels per cm on the drawing canvas
function board(wCm: number, hCm: number, draw: (b: Board) => void, label: string) {
  const c = el('canvas', 'board'); c.width = Math.round(wCm * PX); c.height = Math.round(hCm * PX);
  c.setAttribute('role', 'img'); c.setAttribute('aria-label', label);
  draw({ ctx: c.getContext('2d')!, px: PX });
  return c;
}

const papers = PAPERS.filter(p => !p.hidden);
const dress: Dress = { paper: 'twice-folded', turns: 0, obiPaper: 'plum-seed', hair: 'bob', pose: POSES[0], lean: BODY.lean };
const FRONTS: [string, string][] = [['21', 'Nearly closed'], ['26', 'Parted'], ['31', 'Open']];
const view = el('main', 'trials');

function select(label: string, value: string, options: [string, string][], change: (v: string) => void) {
  const l = el('label', '', label), s = el('select'); s.id = 'pick-' + label.toLowerCase().replace(/\W+/g, '-');
  for (const [v, name] of options) { const o = el('option', '', name); o.value = v; o.selected = v === value; s.append(o); }
  s.addEventListener('change', () => change(s.value)); l.append(s); return l;
}
function segmented<T extends string>(label: string, value: T, options: [T, string][], change: (v: T) => void) {
  // A group, not a <label>: a label would lend its text to the first button's name.
  const l = el('div', 'field'), g = el('div', 'seg'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', label);
  for (const [v, name] of options) { const b = el('button', '', name); b.type = 'button'; b.setAttribute('aria-pressed', String(v === value)); b.addEventListener('click', () => change(v)); g.append(b); }
  l.append(el('span', '', label), g); return l;
}
function card(kind: string, title: string, body: (string | HTMLElement)[], right?: HTMLElement, warn = false) {
  const c = el('article', 'card' + (right ? ' split' : '')), w = el('div', 'words');
  w.append(el('span', 'kind' + (warn ? ' warn' : ''), kind), el('h2', '', title));
  let list: HTMLUListElement | null = null;
  for (const b of body) {
    if (typeof b !== 'string') { w.append(b); list = null; }
    else if (b.startsWith('- ')) { if (!list) { list = el('ul'); w.append(list); } list.append(el('li', '', b.slice(2))); }
    else { w.append(el('p', '', b)); list = null; }
  }
  c.append(w); if (right) c.append(right);
  return c;
}
function captioned(canvas: HTMLCanvasElement, captions: [string, string][]) {
  const wrap = el('div', 'boardwrap'), caps = el('div', 'captions'); caps.style.gridTemplateColumns = `repeat(${captions.length}, minmax(0, 1fr))`;
  for (const [t, s] of captions) { const d = el('div'); d.append(el('b', '', t), s); caps.append(d); }
  wrap.append(canvas, caps); return wrap;
}

function render() {
  const paperOptions = papers.map(p => [p.id, p.name] as [string, string]);
  const controls = el('div', 'controls');
  controls.append(
    select('Kimono paper', dress.paper, paperOptions, v => { dress.paper = v; render(); }),
    select('Obi and fan paper', dress.obiPaper, paperOptions, v => { dress.obiPaper = v; render(); }),
    segmented('Turn the kimono paper', String(dress.turns), [['0', 'As drawn'], ['1', '1'], ['2', '2'], ['3', '3']], v => { dress.turns = Number(v); render(); }),
    segmented('Fronts at the hem', String(dress.lean), FRONTS, v => { dress.lean = Number(v); render(); }),
    segmented<Hair>('Hair', dress.hair, [['bob', 'Bob'], ['bun', 'Bun'], ['long', 'Long']], v => { dress.hair = v; render(); }),
    segmented('Pose', dress.pose.name, POSES.map(p => [p.name, p.name] as [string, string]), v => { dress.pose = POSES.find(p => p.name === v)!; render(); }),
  );

  const compare = board(42, 20, b => {
    flatKimonoFigure(b, 8.5, 4.4, dress);
    wornFigure(b, 22, 4.4, dress);
    westernFigure(b, 34.5, 4.4, dress.hair);
  }, 'Three figures with the same head: the studio kimono laid flat, a kimono being worn, and a shirt and skirt.');

  const parts = board(42, 19, b => {
    const body = STATES.body(dress.lean), top = 1 - BODY.collar;
    const left = sprite('sleeve-left', STATES.sleeve('left'), dress.paper, dress.turns), right = sprite('sleeve-right', STATES.sleeve('right'), dress.paper, dress.turns);
    place(b, sprite('body' + dress.lean, body, dress.paper, dress.turns), { x: 4.4, y: 3.2, square: SQUARES.body, anchor: [0, top] });
    place(b, left, { x: 9.2, y: 3.2, square: SQUARES.sleeve, anchor: [left.box.lx, left.box.hy] });
    place(b, right, { x: 13.6, y: 3.2, square: SQUARES.sleeve, anchor: [right.box.lx, right.box.hy] });
    place(b, sprite('obi', STATES.obi(), dress.obiPaper, 0), { x: 12.9, y: 12.4, square: SQUARES.obi, anchor: [0, 0] });
    const head = { x: 20.4, y: 4.6, tilt: 0, hair: dress.hair };
    neck(b, head, 8.2); face(b, head);
    hairBack(b, { ...head, x: 24.4 }); foot(b, 19.8, 11.6, 0); foot(b, 21.1, 11.6, 0);
    wornFigure(b, 34, 4.2, dress);
  }, 'The loose parts of the worn figure beside the assembled figure.');

  const pair = board(42, 20, b => {
    wornFigure(b, 14, 4.4, { ...dress, pose: POSES[1] });
    wornFigure(b, 28, 4.4, { ...dress, paper: dress.obiPaper, obiPaper: dress.paper, pose: facing(POSES[3]), hair: dress.hair === 'bun' ? 'bob' : 'bun' });
  }, 'Two figures facing one another: one raises a sleeve, the other bows.');

  const list = el('table'), head = el('tr'); for (const h of ['Part', 'Paper', 'Make']) head.append(el('th', '', h)); list.append(head);
  for (const r of TABLE_LIST) { const tr = el('tr'); tr.append(el('td', '', r.part), el('td', '', r.paper), el('td', '', r.make)); list.append(tr); }
  const scroll = el('div', 'scroll'); scroll.append(list);

  const link = (text: string, href: string) => { const a = el('a', '', text); a.href = href; a.rel = 'noopener'; return a; };
  const crafts = el('div', 'three');
  for (const [tag, title, text] of [
    ['What Paper Couture is', 'Folded garments', 'One uncut square for each piece. The engine can show every fold, and the print lands where the fold puts it. The garment is shown laid out, the way it lies on a table.'],
    ['Your first two pictures', 'Paper dolls', 'Washi ningyō; the flat bookmark kind is shiori ningyō. Papers are folded around a card figure, the hair is cut, and the parts are glued. The clothes are worn, and nothing is one square.'],
    ['Your third picture, and your aunt’s craft', 'Oshi-e', 'Cloth wrapped over card shapes, padded with cotton and pasted into a raised picture on a board. Nothing is folded. What it teaches is pose and overlap.'],
  ]) { const d = el('div'); d.append(el('span', 'tag', tag), el('h3', '', title), el('p', '', text)); crafts.append(d); }
  const sources = el('p', 'sources');
  sources.append('Sources for the definitions: ', link('Ohio State, Japan Box: paper dolls', 'https://u.osu.edu/japanbox/art-paper-dolls'), ' · ', link('JAANUS: oshi-e', 'https://projects.mcah.columbia.edu/jaanus/record/oshie'), ' · ', link('Traditional Crafts of Tokyo: Edo oshi-e hagoita', 'https://www.dento-tokyo.metro.tokyo.lg.jp/english/items/23.html'), '. Astra’s construction references: ', link('Robert C. Williams Museum of Papermaking activity', 'https://paper.gatech.edu/sites/default/files/2021-04/Japanese%20Paper%20Doll.pdf'), ' · ', link('Paper Kawaii tutorial', 'https://www.paperkawaii.com/origami-japanese-doll-kimono-dress-tutorial/'), '.');
  const first = card('Before anything else', 'Three crafts, kept apart', [crafts,
    'This study keeps the first craft’s rule for everything that is worn, borrows the cut figure from the second, and takes only pose from the third. It does not pretend to be oshi-e.', sources]);

  view.replaceChildren(
    first,
    card('Trial 1', 'A kimono laid flat, and a kimono being worn', [
      'The studio’s kimono is the garment laid out with its sleeves wide. Put a head behind it and it reads as a kimono on a stand.',
      'Worn, a kimono is a narrow body, a collar that crosses, sleeves that hang and an obi. So the figure in the middle is four folded pieces, each from its own square, around a cut head.',
      'The shirt and skirt needed nothing new. Western pieces are already the shape they have on a body, which is why the third figure works at once.',
      '- The worn body is five plain folds. Turning the top edge down first makes the collar; folding each front across lays that band along its edge.',
      '- The front on your right lies on top. That is how a kimono closes, so it is fixed here and is not a choice for the player.',
      '- How far the fronts part is a choice. Nearly closed shows a little lining at the hem. Open reads as hakama.',
    ], captioned(compare, [
      ['The studio’s kimono, with a head', 'One square. The garment as it lies on a table.'],
      ['Worn', 'A wrapped body, two sleeves and the studio’s obi.'],
      ['Same person, other clothes', 'The camp shirt and deep pleated skirt of Fish Market Saturday.'],
    ])),
    controls,
    card('Trial 2', 'The parts, loose and assembled', [
      'Everything worn is folded and uncut. The head, hair and feet are cut, and the figure is glued. Sizes are a first guess and nothing has been folded.',
      scroll,
      'The obi and the fan are the studio’s own folds. The zori is not used: it stacks 16 layers, which a 3 cm square will not take, so the feet are cut card with the thong drawn on.',
    ], parts),
    card('Trial 3', 'Can a sleeve make one greet the other?', [
      'Partly. A raised sleeve and a tilted head read as a greeting, and a lean reads as a bow. Both keep their collar the same way round when they turn to face each other.',
      'What is missing is a hand. A sleeve alone is a rectangle; a small cut hand at the cuff is what would turn it into a gesture.',
      'The four poses are four numbers each: a lean, a head tilt and two sleeve angles. That is the whole of the Exhibition idea so far.',
    ], pair),
    card('My read', 'What I would keep, and where I would push back', [
      '- Two rooms with two rules. The wardrobe stays one square, no cuts. Figures are folded clothes on a cut figure, glue allowed, and say so.',
      '- Do not build on the studio kimono with a head. Build on the worn body. It is one square and five folds, so it could also join the wardrobe as “Kimono, worn”.',
      '- Start with the bookmark. Four folded pieces, flat, makeable at a table. Poses and relief are the second step, and they stay digital until someone folds one.',
      '- The figure answers the question the first review left open. A person to dress is a brief, and a blossom on a sleeve matters once the sleeve crosses the body.',
      '- Embroidering a silhouette is a fifth thing. The figure’s outline could be drawn for it later; I would not mix it in now.',
      'On Astra’s three questions: the pleated skirt’s lining is the one to do first, because the choice exists and only needs previewing in the player’s paper. The boat-neck sleeves come second. The cross-wrap’s panel order is a fair choice on that top, and it must never become a choice on a kimono.',
    ], undefined, true),
  );
}
const top = el('header', 'top');
top.append(el('h1', '', 'Paper Couture figure study'), el('p', '', 'A first look at whether the wardrobe can dress a person. Everything folded is drawn from the app’s own fold engine and papers. The head, hair and feet are cut shapes. This is a digital study: nothing here has been folded or glued.'));
const page = el('div', 'page'); page.append(top, view); root.append(page);
render();
