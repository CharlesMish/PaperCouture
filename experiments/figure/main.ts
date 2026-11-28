// Figure study: can the wardrobe dress a person? A sketch-lane page, like the
// placement review. It reads src/ and nothing in src/ reads it.
import { PAPERS } from '../../src/papers';
import { BODY, SQUARES, TABLE_LIST } from './parts';
import { Board, Dress, Hair, Outfit, POSES, STATES, facing, figure, flatKimonoFigure, hairBack, face, neck, foot, place, sprite, westernFigure, wornFigure } from './scene';

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

// ---- Trial 4: a board with figures you can dress, pose and move
interface Pinned extends Dress { x: number; y: number }
const kimonoStart = (): Pinned => ({ outfit: 'kimono', paper: 'plum-scatter', turns: 0, obiPaper: 'indigo-lattice', hair: 'bob', lean: BODY.lean, hands: true, x: 14, y: 6,
  pose: { name: 'Own', lean: 0, head: 0, left: { raise: -5 }, right: { raise: -5 } } });
const SPOTTED = (): Pinned[] => [
  { ...kimonoStart(), x: 14.5, y: 6, pose: { name: 'Own', lean: 4, head: 11, left: { raise: -24, across: true }, right: { raise: 46 }, fan: 'left' } },
  { outfit: 'saturday', paper: 'sardine-run', turns: 0, obiPaper: 'indigo-lattice', hair: 'bob', hands: true, x: 27.5, y: 6.3,
    pose: { name: 'Own', lean: -4, head: -11, left: { raise: 148 }, right: { raise: 10 } } },
];
let pinned: Pinned[] = SPOTTED(), chosen = 0;
const BOARD_W = 42, BOARD_H = 24;
let cork: HTMLCanvasElement | undefined;
function corkSurface() {
  if (cork) return cork;
  const c = document.createElement('canvas'); c.width = BOARD_W * PX; c.height = BOARD_H * PX; cork = c;
  const ctx = c.getContext('2d')!; ctx.fillStyle = '#c9a77c'; ctx.fillRect(0, 0, c.width, c.height);
  let seed = 20261127; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 9000; i++) {
    const r = 1 + rnd() * 3.2; ctx.fillStyle = rnd() < .5 ? `rgba(120,84,48,${.05 + rnd() * .12})` : `rgba(240,214,170,${.05 + rnd() * .12})`;
    ctx.beginPath(); ctx.ellipse(rnd() * c.width, rnd() * c.height, r * (1 + rnd()), r, rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  return c;
}
function pin(b: Board, x: number, y: number, on: boolean) {
  const { ctx, px } = b; ctx.save(); ctx.translate(x * px, y * px);
  ctx.shadowColor = 'rgba(30,20,10,.45)'; ctx.shadowBlur = px * .12; ctx.shadowOffsetY = px * .08;
  ctx.beginPath(); ctx.arc(0, 0, px * .2, 0, Math.PI * 2); ctx.fillStyle = on ? '#b23a2e' : '#b39659'; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.beginPath(); ctx.arc(-px * .06, -px * .07, px * .06, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
  ctx.restore();
}
function drawBoard(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')!, b: Board = { ctx, px: PX };
  ctx.drawImage(corkSurface(), 0, 0);
  pinned.forEach((f, i) => { figure(b, f.x, f.y, f); pin(b, f.x + Math.sin(f.pose.head * Math.PI / 180) * 1.0, f.y - 3.05, i === chosen); });
}
function boardCard() {
  const c = el('canvas', 'board corkboard'); c.width = BOARD_W * PX; c.height = BOARD_H * PX; c.tabIndex = 0;
  c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'A cork board with the pinned figures. Drag a figure to move it, or select it below and use the arrow keys.');
  drawBoard(c);
  const at = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * BOARD_W, y: (e.clientY - r.top) / r.height * BOARD_H }; };
  let drag: { dx: number; dy: number } | undefined;
  c.addEventListener('pointerdown', e => {
    const p = at(e), hit = pinned.map((f, i) => ({ i, d: Math.hypot(p.x - f.x, (p.y - (f.y + 4.5)) / 2.2) })).filter(h => h.d < 3.6).sort((a, z) => a.d - z.d)[0];
    if (!hit) return;
    chosen = hit.i; drag = { dx: p.x - pinned[chosen].x, dy: p.y - pinned[chosen].y }; c.setPointerCapture(e.pointerId); drawBoard(c);
  });
  c.addEventListener('pointermove', e => { if (!drag) return; const p = at(e), f = pinned[chosen]; f.x = Math.min(BOARD_W - 3, Math.max(3, p.x - drag.dx)); f.y = Math.min(BOARD_H - 13, Math.max(4, p.y - drag.dy)); drawBoard(c); });
  const drop = () => { if (drag) { drag = undefined; render(); } };
  c.addEventListener('pointerup', drop); c.addEventListener('pointercancel', drop);
  c.addEventListener('keydown', e => {
    const step: Record<string, [number, number]> = { ArrowLeft: [-.5, 0], ArrowRight: [.5, 0], ArrowUp: [0, -.5], ArrowDown: [0, .5] };
    const s = step[e.key], f = pinned[chosen]; if (!s || !f) return;
    e.preventDefault(); f.x = Math.min(BOARD_W - 3, Math.max(3, f.x + s[0])); f.y = Math.min(BOARD_H - 13, Math.max(4, f.y + s[1])); drawBoard(c);
  });

  const f = pinned[chosen], tools = el('div', 'controls'), poseTools = el('div', 'controls');
  const paperOptions = papers.map(p => [p.id, p.name] as [string, string]);
  const again = () => render();
  const slider = (label: string, value: number, min: number, max: number, set: (v: number) => void) => {
    const l = el('label', '', label), s = el('input'); s.type = 'range'; s.min = String(min); s.max = String(max); s.step = '1'; s.value = String(value); s.id = 'pose-' + label.toLowerCase().replace(/\W+/g, '-');
    s.addEventListener('input', () => { set(Number(s.value)); drawBoard(c); }); l.append(s); return l;
  };
  const press = (name: string, act: () => void, on?: boolean) => { const b = el('button', 'btn', name); b.type = 'button'; if (on !== undefined) b.setAttribute('aria-pressed', String(on)); b.addEventListener('click', act); return b; };
  tools.append(segmented('Figure', String(chosen), pinned.map((_, i) => [String(i), i ? 'Second' : 'First'] as [string, string]), v => { chosen = Number(v); again(); }));
  if (f) {
    tools.append(
      segmented<Outfit>('Dressed in', f.outfit ?? 'kimono', [['kimono', 'Kimono'], ['saturday', 'Shirt and skirt']], v => { f.outfit = v; if (v === 'saturday' && f.paper === 'plum-scatter') f.paper = 'sardine-run'; if (v === 'kimono') { f.pose.left = { raise: -5 }; f.pose.right = { raise: -5 }; if (f.paper === 'sardine-run') f.paper = 'plum-scatter'; } else { f.pose.left = { raise: 8 }; f.pose.right = { raise: 8 }; f.pose.fan = undefined; } again(); }),
      select(f.outfit === 'saturday' ? 'Her shirt and skirt paper' : 'Her kimono paper', f.paper, paperOptions, v => { f.paper = v; again(); }),
      segmented<Hair>('Her hair', f.hair, [['bob', 'Bob'], ['bun', 'Bun'], ['long', 'Long']], v => { f.hair = v; again(); }),
    );
    const arm = (side: 'left' | 'right', name: string) => f.outfit === 'saturday'
      ? slider(name, f.pose[side].raise, 0, 170, v => { f.pose[side] = { raise: v }; })
      : slider(name, f.pose[side].raise, -60, 70, v => { f.pose[side] = { ...f.pose[side], raise: v }; });
    poseTools.append(slider('Lean', f.pose.lean, -12, 12, v => { f.pose.lean = v; }), slider('Head', f.pose.head, -20, 20, v => { f.pose.head = v; }), arm('left', 'Arm on your left'), arm('right', 'Arm on your right'));
    const row = el('div', 'buttons');
    if (f.outfit !== 'saturday') for (const side of ['left', 'right'] as const) row.append(press(`${side === 'left' ? 'Left' : 'Right'} arm across`, () => { const a = f.pose[side]; f.pose[side] = a.across ? { raise: -5 } : { raise: -24, across: true }; again(); }, !!f.pose[side].across));
    if (f.outfit !== 'saturday') row.append(press('Fan', () => { f.pose.fan = f.pose.fan ? undefined : (f.pose.left.across ? 'left' : 'right'); again(); }, !!f.pose.fan));
    row.append(press('Hands', () => { f.hands = !f.hands; again(); }, !!f.hands), press('Face the other way', () => { f.pose = facing(f.pose); again(); }));
    poseTools.append(row);
  }
  const boardTools = el('div', 'buttons');
  boardTools.append(
    press('Just spotted each other', () => { pinned = SPOTTED(); chosen = 0; again(); }),
    press('Both standing', () => { for (const g of pinned) g.pose = { name: 'Own', lean: 0, head: 0, left: { raise: g.outfit === 'saturday' ? 8 : -14 }, right: { raise: g.outfit === 'saturday' ? 8 : -14 } }; again(); }),
    press(pinned.length < 2 ? 'Pin a second figure' : 'Unpin the second', () => { if (pinned.length < 2) { pinned.push({ ...SPOTTED()[1] }); chosen = 1; } else { pinned.pop(); chosen = 0; } again(); }),
  );
  const wrap = el('div', 'boardwrap'); wrap.append(c, boardTools, tools, poseTools);
  return card('Trial 4', 'One board, two outfits, one moment', [
    'Astra’s test: dress her in the plum kimono and pin her, dress a second in Fish Market Saturday, and place them together. Can they look as if they have just spotted each other?',
    'I think so. Each leans a few degrees toward the other and tilts her head the same way. The one in the kimono lifts her near sleeve, with the fan held across her body in the other hand. The one in the shirt waves.',
    'Drag either figure, or select one and change her clothes, hair and pose. The red pin marks the one you are changing. “Both standing” shows the same two with the moment taken away.',
    '- The shirt’s sleeves are part of its fold, so her arms are cut card from the sleeve hems. That is the cut figure doing its job.',
    '- Faces stay blank. The lean and the head carry it.',
    '- This is a sketch board, not the app’s pinboard. The app’s board already has an outline guide for one or two figures, and its pieces already carry a position and a tilt, so a cut figure could be a second style of that guide and the shirt and skirt could be pinned over it with no new folds. The worn kimono is the larger step: its body and sleeves are sketches, not app designs yet.',
  ], wrap);
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
    westernFigure(b, 34.5, 4.4, { hair: dress.hair, paper: 'sardine-run', pose: POSES[0] });
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

  const wave: Dress = { ...dress, pose: POSES[1] };
  const shoulders = board(42, 20, b => {
    wornFigure(b, 8, 4.4, { ...wave, tuck: .95 });
    wornFigure(b, 21, 4.4, wave);
    wornFigure(b, 34, 4.4, { ...wave, hands: true });
  }, 'The greeting pose three ways: the first shoulder, the sleeve tucked farther behind the body, and the tucked sleeve with a small hand.');

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
    card('Trial 3', 'The shoulder first, then a hand', [
      'Astra saw a sliver of board between the raised sleeve and the collar, and read the sleeve as a loose piece of paper. That was the sleeve’s root: it began at the edge of the body, so lifting it opened a gap.',
      'The root is now tucked 1.75 cm behind the body instead of 0.95, and the sleeve’s square grows from 7 to 7.6 cm so the same width still shows. The arm is the sleeve’s top edge, so a hand belongs at the far end of that edge.',
      '- The tuck alone fixes the reading. The sleeve now comes out from behind the shoulder.',
      '- The hand is small and I would keep it. It says which end of the sleeve is the wrist, and it gives the fan something to be held by.',
    ], captioned(shoulders, [
      ['The first root', 'At the edge of the body. The board shows between sleeve and collar.'],
      ['Tucked', 'The root 1.75 cm behind the body.'],
      ['Tucked, with a hand', 'A cut card hand at the wrist.'],
    ])),
    boardCard(),
    card('My read', 'What I would keep, and where I would push back', [
      '- Two rooms with two rules. The wardrobe stays one square, no cuts. Figures are folded clothes on a cut figure, glue allowed, and say so.',
      '- Do not build on the studio kimono with a head. Build on the worn body. It is one square and five folds, so it could also join the wardrobe as “Kimono, worn”.',
      '- Start with the bookmark. Four folded pieces, flat, makeable at a table. Poses and relief are the second step, and they stay digital until someone folds one.',
      '- The board has a use now: two dressed figures and a moment between them. Lean, head and one sleeve carry it, so poses want to be a few sliders, not a list.',
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
