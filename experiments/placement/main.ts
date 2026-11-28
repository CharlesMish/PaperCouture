// Placement review: a look-through of every paper on every piece, drawn live
// from the app's own fold and paper code. A sketch-lane page: no CI, no frozen
// baselines. It reads src/, and nothing in src/ reads it.
import { PAPERS, findPaper } from '../../src/papers';
import type { PaperDesign } from '../../src/papers/types';
import { PaperFaces, drawFinished, paperFaces } from '../../src/render/flatPreview';
import { FoundStart, findStarts } from '../../src/papers/landing';
import { sameStart, suggestedStarts } from '../../src/papers/startingPoints';
import { Piece, pieces } from './pieces';
import { FINDINGS, FOLD_NOTES, PAPER_NOTES, Shot } from './findings';
import { REFOLDS } from './refolds';
import { finishedState } from '../../src/render/flatPreview';

const root = document.getElementById('root')!;
const all = pieces();
const visible = PAPERS.filter(p => !p.hidden);
const pieceOf = (key: string) => all.find(p => p.key === key)!;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e;
};
const facesCache = new Map<string, PaperFaces>();
function faces(paper: PaperDesign, turns: number, x = 0, y = 0): PaperFaces {
  const key = `${paper.id}|${turns}|${x}|${y}`;
  let f = facesCache.get(key);
  if (!f) { f = paperFaces(paper, turns, { x, y }, 256); facesCache.set(key, f); if (facesCache.size > 400) facesCache.delete(facesCache.keys().next().value!); }
  return f;
}
function finishedCanvas(piece: Piece, paper: PaperDesign, turns = 0, x = 0, y = 0, view: 'front' | 'back' = 'front', px = 208) {
  const c = el('canvas'); c.width = c.height = px;
  drawFinished(c.getContext('2d')!, piece.state, faces(paper, turns, x, y), turns, { view, angle: piece.angle, shadow: true });
  return c;
}
function swatch(paper: PaperDesign, side: 'front' | 'back' = 'front', px = 144) {
  const c = el('canvas'); c.width = c.height = px;
  c.getContext('2d')!.drawImage(faces(paper, 0)[side] as HTMLCanvasElement, 0, 0, px, px);
  return c;
}
const address = (piece: Piece, paper: PaperDesign, turns: number, x: number, y: number) =>
  `?${piece.params}&paper=${paper.id}&turn=${turns}${x ? `&printX=${x}` : ''}${y ? `&printY=${y}` : ''}&step=99&view=display`;

// ---- detail strip
const detail = el('div', 'detail'); detail.hidden = true;
function showDetail(piece: Piece, paper: PaperDesign, turns: number, x: number, y: number, label: string) {
  const words = el('div', 'words'), close = el('button', 'close', 'Close');
  words.append(el('h3', '', `${piece.name} · ${paper.name}`),
    el('span', 'meta', `${label} · turn ${turns * 90}°${x || y ? ` · print right ${Math.round(x * 100)}% up ${Math.round(y * 100)}%` : ''}`),
    ...(piece.params ? [el('span', '', 'Add this to the app’s address to open the same piece:'), el('code', '', address(piece, paper, turns, x, y))] : [el('span', '', 'A sketch: it is not in the app yet.')]));
  close.addEventListener('click', () => { detail.hidden = true; });
  detail.replaceChildren(finishedCanvas(piece, paper, turns, x, y, 'front', 300), finishedCanvas(piece, paper, turns, x, y, 'back', 300), words, close);
  detail.hidden = false;
}
function tile(piece: Piece, paper: PaperDesign, turns: number, x: number, y: number, label: string, kind = 'turn', pct?: number, view: 'front' | 'back' = 'front') {
  const b = el('button', 'tile'); b.dataset.kind = kind; b.type = 'button';
  const cap = el('span', 'cap'), name = el(kind === 'turn' ? 'span' : 'b', '', label);
  cap.append(name);
  if (pct !== undefined) cap.append(el('span', 'pct', `${Math.round(pct * 100)}%`));
  b.append(finishedCanvas(piece, paper, turns, x, y, view), cap);
  b.title = `${piece.name} in ${paper.name}: ${label}`;
  b.addEventListener('click', () => showDetail(piece, paper, turns, x, y, label));
  return b;
}

// ---- measurements, shared by the two look-through views
const sparse = new Map<string, boolean>();
const startsCache = new Map<string, FoundStart[]>();
function startsFor(piece: Piece, paper: PaperDesign) {
  const key = `${piece.key}|${paper.id}`;
  let s = startsCache.get(key);
  if (!s) startsCache.set(key, s = findStarts({ state: piece.state, angle: piece.angle }, paper));
  return s;
}
function isSparse(paper: PaperDesign) {
  let v = sparse.get(paper.id);
  if (v === undefined) {
    const d = (faces(paper, 0).front as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 256, 256).data;
    const count = new Map<number, number>();
    for (let i = 0; i < d.length; i += 16) { const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4); count.set(k, (count.get(k) ?? 0) + 1); }
    sparse.set(paper.id, v = Math.max(...count.values()) > .62 * (d.length / 16));
  }
  return v;
}
/** The print is a motif and the piece as drawn keeps almost none of it, while another start keeps a good share. */
function lost(piece: Piece, paper: PaperDesign) {
  if (!isSparse(paper)) return false;
  const s = startsFor(piece, paper);
  return s[0].captured < .12 && Math.max(...s.map(f => f.captured)) > .4;
}
function row(piece: Piece, paper: PaperDesign, title: string) {
  const r = el('div', 'row'), name = el('div', 'row-name', title), tiles = el('div', 'tiles');
  const starts = startsFor(piece, paper), motif = isSparse(paper);
  if (lost(piece, paper)) name.append(el('span', 'chip', 'print lost as drawn'));
  const suggested = piece.key === piece.id ? suggestedStarts(paper.id, piece.id) : [];
  for (const s of suggested) tiles.append(tile(piece, paper, s.turns, s.x, s.y, s.name, 'suggested'));
  for (const f of starts.filter(f => !suggested.some(s => sameStart(s, f.start)))) tiles.append(tile(piece, paper, f.start.turns, f.start.x, f.start.y, f.label, f.start.x || f.start.y ? 'found' : 'turn', motif ? f.captured : undefined));
  r.append(name, tiles);
  return r;
}

// ---- views
type View = 'findings' | 'papers' | 'pieces' | 'folds' | 'refolds';
const VIEWS: [View, string][] = [['findings', 'Findings'], ['papers', 'By paper'], ['pieces', 'By piece'], ['folds', 'Folds'], ['refolds', 'Refolds']];
let view: View = 'findings', paperId = 'plum-scatter', pieceKey = 'kimono';
const body = el('div', 'view');

function rail<T extends { name: string }>(groups: [string, T[]][], current: (t: T) => boolean, pick: (t: T) => void, icon: (t: T) => HTMLElement | null, count: (t: T) => number) {
  const r = el('nav', 'rail');
  for (const [title, items] of groups) {
    r.append(el('h3', '', title));
    for (const item of items) {
      const b = el('button', 'rail-item'); b.type = 'button';
      const i = icon(item); if (i) b.append(i);
      b.append(el('span', '', item.name));
      const n = count(item); if (n) b.append(el('span', 'n', String(n)));
      b.setAttribute('aria-current', String(current(item)));
      b.addEventListener('click', () => pick(item));
      r.append(b);
    }
  }
  return r;
}
const lostByPaper = new Map<string, number>(), lostByPiece = new Map<string, number>();
function countLost() {
  if (lostByPaper.size) return;
  for (const paper of visible) for (const piece of all) if (lost(piece, paper)) {
    lostByPaper.set(paper.id, (lostByPaper.get(paper.id) ?? 0) + 1);
    lostByPiece.set(piece.key, (lostByPiece.get(piece.key) ?? 0) + 1);
  }
}

function papersView() {
  countLost();
  const paper = findPaper(paperId), split = el('div', 'split'), sheet = el('section', 'sheet');
  split.append(rail<PaperDesign>([['Curated', visible.filter(p => p.curation !== 'experimental')], ['Experiments', visible.filter(p => p.curation === 'experimental')]],
    p => p.id === paperId, p => { paperId = p.id; render(); }, p => swatch(p, 'front', 52), p => lostByPaper.get(p.id) ?? 0), sheet);
  const head = el('div', 'sheet-head'), facesBox = el('div', 'faces'), words = el('div', 'words');
  facesBox.append(swatch(paper, 'front'), swatch(paper, 'back'));
  const kind = paper.placement?.kind === 'slide' ? `print slides up to ${Math.round(paper.placement.limit * 100)}%` : paper.placement?.kind === 'snap' ? 'print snaps by half-cells' : 'placement fixed, turns only';
  words.append(el('h2', '', paper.name), el('span', 'meta', `${paper.id} · ${paper.curation ?? 'unlisted'} · ${kind}`));
  if (PAPER_NOTES[paper.id]) words.append(el('p', '', PAPER_NOTES[paper.id]));
  head.append(facesBox, words);
  const rows = el('div', 'rows');
  for (const piece of all) rows.append(row(piece, paper, piece.name));
  sheet.append(head, legend(isSparse(paper)), rows);
  return split;
}
function legend(motif: boolean) {
  const p = el('p', 'legend');
  p.textContent = 'Each picture is the finished front. Plain border: the four turns as drawn. Blue border: a placement found by sliding the print. Dark border: a suggestion from this review.'
    + (motif ? ' The percentage is how much of the printed motif is still in view.' : '');
  return p;
}
function piecesView() {
  countLost();
  const piece = pieceOf(pieceKey), split = el('div', 'split'), sheet = el('section', 'sheet');
  split.append(rail<Piece>([['Pieces', all]], p => p.key === pieceKey, p => { pieceKey = p.key; render(); }, () => null, p => lostByPiece.get(p.key) ?? 0), sheet);
  const head = el('div', 'sheet-head'), words = el('div', 'words');
  words.append(el('h2', '', piece.name), el('span', 'meta', `${piece.steps} steps · ${piece.experiment ? 'experimental' : 'established'}`));
  const note = FOLD_NOTES[piece.id]; if (note) words.append(el('p', '', note.note));
  head.append(words);
  const rows = el('div', 'rows');
  for (const paper of visible) rows.append(row(piece, paper, paper.name));
  sheet.append(head, legend(true), rows);
  return split;
}
function foldsView() {
  const wrap = el('div', 'view'); wrap.style.padding = '0';
  const pick = el('select'); pick.id = 'fold-paper'; pick.setAttribute('aria-label', 'Paper used for the fold pictures');
  for (const p of visible) { const o = el('option', '', p.name); o.value = p.id; o.selected = p.id === foldPaper; pick.append(o); }
  pick.addEventListener('change', () => { foldPaper = pick.value; render(); });
  const bar = el('div', 'sheet-head'); bar.append(el('p', '', 'Every piece, front and back, in one paper. A striped two-sided paper shows where each fold sends the grain and how much reverse it reveals.'), pick);
  const grid = el('div', 'fold-grid'), paper = findPaper(foldPaper);
  for (const piece of all) {
    const card = el('article', 'fold-card'), pair = el('div', 'pair'), note = FOLD_NOTES[piece.id];
    pair.append(finishedCanvas(piece, paper, 0, 0, 0, 'front', 260), finishedCanvas(piece, paper, 0, 0, 0, 'back', 260));
    card.append(pair, el('h3', '', piece.name));
    if (note) { const t = el('span', `chip tier${note.tier === 'Look again' ? '' : ' quiet'}`, note.tier); card.append(t, el('p', '', note.note)); }
    grid.append(card);
  }
  wrap.append(bar, grid);
  return wrap;
}
let foldPaper = 'pinstripe-lining';
function refoldsView() {
  const wrap = el('div', 'view'); wrap.style.padding = '0';
  wrap.append(el('p', '', 'One new piece and three candidate refolds for pieces marked Look again, each beside the fold it would replace. They are sketches in experiments/placement/refolds.ts and are not in the app. A refold that is wanted should arrive as a choice on the old design, so the existing fold stays exact.'));
  for (const r of REFOLDS) {
    const card = el('article', 'finding'), now = r.replaces ? pieceOf(r.replaces) : undefined;
    const state = finishedState(r.build()), next: Piece = { ...(now ?? all[0]), key: r.id, name: r.name, state, angle: 0, params: '' };
    card.append(el('span', 'kind', now ? `Sketch · would replace ${now.name}` : 'Sketch · a new piece'), el('h3', '', r.name), el('p', '', r.note), el('p', 'meta', r.measured));
    const tiles = el('div', 'tiles');
    for (const [paperId, turns] of [['slate-grain', 0], ['pinstripe-lining', 0], ['border-print', 2]] as const) {
      const paper = findPaper(paperId);
      if (now) tiles.append(tile(now, paper, turns, 0, 0, `Now · ${paper.name}`));
      tiles.append(tile(next, paper, turns, 0, 0, `Sketch · ${paper.name}`, 'suggested'));
    }
    if (now) tiles.append(tile(now, findPaper('pinstripe-lining'), 0, 0, 0, 'Now · back', 'turn', undefined, 'back'));
    tiles.append(tile(next, findPaper('pinstripe-lining'), 0, 0, 0, 'Sketch · back', 'suggested', undefined, 'back'));
    if (!now) for (const id of ['twice-folded', 'indigo-lattice', 'sardine-run']) tiles.append(tile(next, findPaper(id), 0, 0, 0, `Sketch · ${findPaper(id).name}`, 'suggested'));
    card.style.setProperty('--rows', String(card.children.length));
    card.append(tiles);
    wrap.append(card);
  }
  return wrap;
}
function shotTile(s: Shot) {
  const piece = pieceOf(s.piece), paper = findPaper(s.paper);
  return tile(piece, paper, s.turns ?? 0, s.x ?? 0, s.y ?? 0, s.label, 'turn', undefined, s.view ?? 'front');
}
function findingsView() {
  const wrap = el('div', 'view'); wrap.style.padding = '0';
  let group = '';
  for (const f of FINDINGS) {
    if (f.group !== group) { group = f.group; wrap.append(el('h2', 'group-title', group)); }
    const card = el('article', 'finding');
    card.append(el('span', `kind${f.kind === 'done' ? ' fix' : ''}`, f.kind === 'done' ? 'Changed on the branch' : f.kind === 'choice' ? 'Your call' : 'Observation'), el('h3', '', f.title));
    for (const para of f.body) {
      if (para.startsWith('- ')) { const ul = card.lastElementChild instanceof HTMLUListElement ? card.lastElementChild : card.appendChild(el('ul')); ul.append(el('li', '', para.slice(2))); }
      else card.append(el('p', '', para));
    }
    if (f.image) { const img = el('img', 'evidence'); img.src = (import.meta.env.DEV ? '/docs/placement-review/' : './') + f.image.file; img.alt = f.image.alt; img.loading = 'lazy'; card.style.setProperty('--rows', String(card.children.length)); card.append(img); }
    if (f.shots?.length) { const t = el('div', 'tiles'); for (const s of f.shots) t.append(shotTile(s)); card.style.setProperty('--rows', String(card.children.length)); card.append(t); }
    wrap.append(card);
  }
  return wrap;
}

function render() {
  const top = el('header', 'top');
  top.append(el('h1', '', 'Paper Couture placement review'),
    el('p', '', 'Where each paper lands on each finished piece, at every turn, with the placements worth a second look. Pictures are drawn from the app’s own folds and papers; press one for a larger view and its address.'));
  const tabs = el('div', 'tabs'); tabs.setAttribute('role', 'tablist');
  for (const [id, name] of VIEWS) {
    const t = el('button', 'tab', name); t.type = 'button'; t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', String(id === view));
    t.addEventListener('click', () => { view = id; render(); try { location.hash = id; } catch { /* the hash is a convenience */ } });
    tabs.append(t);
  }
  body.replaceChildren(view === 'papers' ? papersView() : view === 'pieces' ? piecesView() : view === 'folds' ? foldsView() : view === 'refolds' ? refoldsView() : findingsView());
  root.replaceChildren(top, tabs, body, detail);
}
function fromHash() {
  const [h, arg] = location.hash.slice(1).split('-at-');
  if (VIEWS.some(v => v[0] === h)) view = h as View;
  if (arg && view === 'papers' && visible.some(p => p.id === arg)) paperId = arg;
  if (arg && view === 'pieces' && all.some(p => p.key === arg)) pieceKey = arg;
}
addEventListener('hashchange', () => { fromHash(); render(); });
fromHash();
render();
// A working aid: ?pairs=paper:piece,paper:piece lists just those rows.
const pairs = new URLSearchParams(location.search).get('pairs');
if (pairs) {
  const sheet = el('section', 'sheet'), rows = el('div', 'rows');
  for (const pair of pairs.split(',')) { const [pa, pi] = pair.split('~'); rows.append(row(pieceOf(pi), findPaper(pa), `${findPaper(pa).name} on ${pieceOf(pi).name}`)); }
  sheet.append(rows); root.replaceChildren(sheet, detail);
}
