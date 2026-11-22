// Written findings for the placement review. Pictures are drawn live from the
// same fold and paper code as the app; only the words here are hand-written.
// Written 2026-11-21 against main b522124. Numbers come from this page's own
// measurements (flat finished drawing, default shapes) unless a line says otherwise.
export interface Shot { piece: string; paper: string; turns?: number; x?: number; y?: number; view?: 'front' | 'back'; label: string }
export interface Finding { group: string; kind: 'done' | 'choice' | 'note'; title: string; body: string[]; shots?: Shot[] }
export interface FoldNote { tier: 'Anchor' | 'Solid' | 'Look again'; note: string }

const DONE = 'Changed on the branch', PAPERS = 'Papers and placement', FOLDS = 'Folds';

export const FINDINGS: Finding[] = [
  { group: DONE, kind: 'done', title: 'Position print now shows the finished piece',
    body: [
      'The dialog used to cover the piece you were placing the print on, and showed only the flat sheet. It now draws the finished piece beside the sheet and updates it as you slide or turn, before or after folding.',
      'The flat sheet dims everything the fold hides, so you can see which parts of the square the piece keeps. The dimming has a checkbox and remembers your choice.',
      'Every existing control is where it was: Left, Right, Up, Down, Reset print, Done, dragging the sheet, and the arrow keys.',
    ] },
  { group: DONE, kind: 'done', title: 'Starting points for each paper on each piece',
    body: [
      'Under the two pictures is a row of small finished pieces. Press one to start from it.',
      '- The four turns, for every paper.',
      '- For a sparse print that slides: the position that keeps the most of it in view, and a centred one when that differs. These are measured on the spot for the piece and shape you have, so they also cover the silhouette choices.',
      '- Suggestions from this review, by name. There are 27, listed under By paper with a dark border.',
      '- Yours. Save as my start keeps the current turn and position for this paper on this piece. From then on, choosing that paper for that piece begins there. Each piece and colourway keeps its own, so one paper can sit differently on the kimono, the skirt and the tie.',
      'Nothing else changes on its own. Papers still start as drawn, links that name a placement still win, and saved boards are untouched.',
    ],
    shots: [
      { piece: 'kimono', paper: 'plum-scatter', label: 'As drawn' },
      { piece: 'kimono', paper: 'plum-scatter', x: -0.2265625, label: 'Blossom on the sleeve' },
      { piece: 'necktie', paper: 'plum-scatter', label: 'As drawn' },
      { piece: 'necktie', paper: 'plum-scatter', turns: 1, x: -0.07421875, y: -0.07421875, label: 'Blossom under the knot' },
    ] },

  { group: PAPERS, kind: 'choice', title: 'Five motif papers start out of sight on a third of the wardrobe',
    body: [
      'Plum scatter, Corner bloom, Ginkgo pairs, Reed study and Reverse garden each have a small motif on a plain ground. On 33 paper-and-piece pairs the piece keeps under 12% of the motif as drawn, while another turn or position keeps more than 40%. Plum scatter, which is curated, is plain on the wrap skirt, lapel vest, cross-wrap top, kimono, capelet and swing coat.',
      'The branch offers the better starts and leaves the beginning alone. Three ways to go from here:',
      '- Keep it as it is: as drawn first, better starts one press away.',
      '- Begin from the suggestion where this review has one. One line of code, and it changes what a fresh visitor sees for those pairs.',
      '- Begin from the measured best everywhere. Least work for the player, but it takes away the small pleasure of finding the spot, and the measure prefers one-sided placements.',
      'I would take the second, and only for curated papers.',
    ],
    shots: [
      { piece: 'skirt', paper: 'plum-scatter', label: 'Wrap skirt as drawn' },
      { piece: 'skirt', paper: 'plum-scatter', turns: 2, x: 0.296875, y: 0.296875, label: 'Blossom on the wrap' },
      { piece: 'coat-dress', paper: 'plum-scatter', label: 'Coat-dress as drawn' },
      { piece: 'coat-dress', paper: 'plum-scatter', x: -0.296875, y: 0.2265625, label: 'Blossom on the collar' },
      { piece: 'clutch', paper: 'corner-bloom', label: 'Clutch as drawn' },
      { piece: 'clutch', paper: 'corner-bloom', turns: 2, y: 0.07421875, label: 'Bloom on the flap' },
    ] },
  { group: PAPERS, kind: 'choice', title: 'Border print wants half a turn on anything cut from the top of the square',
    body: [
      'The wave band sits at the foot of the sheet. That is right for the dress, gown, pleated skirt, fit-and-flare and camp shirt, where it becomes a hem. Tops, outerwear and small pieces are made from the upper part of the square and never see it.',
      'Two turns bring the band to the yoke, collar, sleeve hems, hatband, boot cuffs and the rim of the fan. Thirteen of the 27 suggestions are this one move. It is the clearest case for a per-piece start, because the paper is fixed and curated and nothing else can rescue it.',
    ],
    shots: [
      { piece: 'jacket', paper: 'border-print', label: 'Box jacket as drawn' }, { piece: 'jacket', paper: 'border-print', turns: 2, label: 'Waves across the yoke' },
      { piece: 'coat-dress', paper: 'border-print', label: 'Coat-dress as drawn' }, { piece: 'coat-dress', paper: 'border-print', turns: 2, label: 'Waves on the collar' },
      { piece: 'sensu', paper: 'border-print', label: 'Fan as drawn' }, { piece: 'sensu', paper: 'border-print', turns: 2, label: 'Waves along the rim' },
      { piece: 'boot-left', paper: 'border-print', turns: 2, label: 'Cuff band' },
    ] },
  { group: PAPERS, kind: 'choice', title: 'Thirteen of the seventeen curated papers have a plain reverse',
    body: [
      '22 of the 40 visible papers have nothing drawn on the back. On most pieces that is fine: the reverse is a collar, a band or a lining. On the reverse colourways it is the whole piece. The reverse-colour gown shows 12% print, the reverse zori 9% and the reverse fan none, so with these papers they come out as one flat colour.',
      'Papers with a drawn reverse, such as Pinstripe and lining, Plum seed and the three guest papers, make every colourway worth choosing. Options:',
      '- Give the curated papers a quiet reverse: a tone-on-tone grain, a pin dot, a faint echo of the front. Drawings are frozen, so these would be new papers beside the old ones.',
      '- Leave the papers and steer: when the reverse is plain, do not lead with the reverse colourway.',
      '- Leave it. A flat colour can be what someone wants.',
    ],
    shots: [
      { piece: 'gown:reverse', paper: 'botanical', label: 'Reverse gown, plain back' }, { piece: 'gown:reverse', paper: 'pinstripe-lining', label: 'Reverse gown, drawn back' },
      { piece: 'sensu:reverse', paper: 'indigo-lattice', label: 'Reverse fan, plain back' }, { piece: 'sensu:reverse', paper: 'plum-seed', label: 'Reverse fan, drawn back' },
    ] },
  { group: PAPERS, kind: 'choice', title: 'Midnight orchard cannot reach the pieces that hide its branch',
    body: [
      'It is one branch on a plain ground, like Plum scatter, but its placement is fixed. On the kimono it keeps 0 to 3% at every turn, and it is plain on the skirt, vest, wrap top and both coats.',
      'Its reverse is a flat colour, so letting the print slide is a small change with nothing to register front to back. Reverse garden and Open stems are the same case with a little more work.',
    ],
    shots: [
      { piece: 'dress', paper: 'midnight-orchard', label: 'Dress: lands well' }, { piece: 'kimono', paper: 'midnight-orchard', label: 'Kimono: any turn' },
      { piece: 'coat-dress:print', paper: 'midnight-orchard', label: 'Printed coat-dress' },
    ] },
  { group: PAPERS, kind: 'choice', title: 'Two papers are the colour of the board',
    body: [
      'The back of Open stems and the face of Oat linen are close to the cork and linen backgrounds. A reverse-colour piece in Open stems loses its outline on the board, and Oat linen relies on its shadow.',
      'A slightly deeper or cooler tone would fix both, as new variants. Or treat it as a board matter and give the board a background that is not a paper colour.',
    ],
    shots: [
      { piece: 'gown:reverse', paper: 'open-stems', label: 'Reverse gown, Open stems' }, { piece: 'zori:reverse', paper: 'open-stems', label: 'Reverse zori, Open stems' },
      { piece: 'dress', paper: 'oat-linen', label: 'Dress, Oat linen' },
    ] },
  { group: PAPERS, kind: 'note', title: 'The fan re-cuts every print, and nothing is drawn for it',
    body: [
      'Each pleat tucks a wedge away, so stripes break and motifs scatter. Small all-over repeats survive; Twice folded works because its dips sit on the centre line.',
      'Sunray pleats is drawn on the dress’s own creases and misses the fan’s ribs at every turn. A fan paper whose rays start at the rivet is the obvious companion. I would hold it until the loop work is done.',
    ],
    shots: [
      { piece: 'sensu', paper: 'stripe-disc', label: 'Stripe and disc' }, { piece: 'sensu', paper: 'sunray-pleats', label: 'Sunray pleats' },
      { piece: 'sensu', paper: 'twice-folded', turns: 2, label: 'Twice folded, two turns' }, { piece: 'sensu', paper: 'polka-dot', label: 'Polka dot' },
    ] },
  { group: PAPERS, kind: 'note', title: 'The kimono’s collar runs across the grain',
    body: [
      'The collar strip comes from paper turned a quarter against the sleeves. With a striped or directional paper the collar reads as a ladder. One turn straightens the collar and lays the sleeves sideways. It belongs to the traditional fold and is not a fault; it is a reason to show the four turns as pictures.',
    ],
    shots: [
      { piece: 'kimono:reverse', paper: 'pinstripe-lining', label: 'Reverse kimono as drawn' }, { piece: 'kimono:reverse', paper: 'pinstripe-lining', turns: 1, label: 'One turn' },
      { piece: 'kimono', paper: 'sardine-run', label: 'Sardine run as drawn' }, { piece: 'kimono', paper: 'sardine-run', turns: 1, label: 'One turn' },
    ] },

  { group: FOLDS, kind: 'choice', title: 'The best folds are dead ends for dressing up',
    body: [
      'Only six of the 27 designs take an accessory: the dress, box jacket, wrap skirt, lapel vest, pleated skirt and kimono. Only those, the colour-side pieces and the brooch offer a choice while folding. The coat-dress, gown, fit-and-flare, camp shirt, swing coat and capelet have no attachment positions and no options.',
      'So the more convincing a piece looks, the less you can do with it afterwards. Nothing in the folds prevents this. Positions are a short list per design, and these would be natural:',
      '- Camp shirt: a patch pocket on the chest, a pin at the collar.',
      '- Coat-dress: a pin on the collar, a sash or obi at the waist.',
      '- Fit-and-flare: a sash at the waist, a bow at the neckline.',
      '- Gown: a pin at the shoulder, a sash under the bust.',
      '- Swing coat and capelet: a pin or bow at the neck.',
      'I have not added them, because where a pin sits is yours to judge. It is the change I would make first.',
    ] },
  { group: FOLDS, kind: 'choice', title: 'Six early pieces read as shapes more than garments',
    body: [
      'Folded hat, Boat-neck top, Bib apron, One-shoulder tunic and both ankle boots have no part that says what they are once the paper is plain. The Folds tab shows each with a note. In short:',
      '- Hat: a trapezoid that never shows the reverse. One more turn of the lower edge would give a band.',
      '- Boots: no reverse and no cuff. Border print with two turns shows how well a band at the top of the shaft works; a turned cuff would do it with any paper.',
      '- Boat-neck top: reads as a bucket. A small outward fold at each top corner, like the dress’s sleeve step, would give it shoulders.',
      '- Bib apron: the bib is nearly as wide as the skirt, so it reads as a house. Steeper corner folds would give it a waist.',
      '- Tunic: the gown does the same idea with a sash and length. Give the tunic the sash, or park it.',
      'Each is a refold, and each could change what a paper shows. That is the kind of change this page is for: fold the candidate, open By piece, and compare all 40 papers before deciding.',
    ],
    shots: [
      { piece: 'hat', paper: 'slate-grain', label: 'Folded hat' }, { piece: 'boat-top', paper: 'slate-grain', label: 'Boat-neck top' },
      { piece: 'apron', paper: 'slate-grain', label: 'Bib apron' }, { piece: 'tunic', paper: 'slate-grain', label: 'One-shoulder tunic' },
      { piece: 'boot-left', paper: 'slate-grain', label: 'Ankle boot' },
    ] },
  { group: FOLDS, kind: 'choice', title: 'The pleated skirt hides its pleats at the classic depth',
    body: [
      'From the front the Classic depth is a flat panel with a strip of reverse at each side. The Sardine run guest piece uses the Deep choice. Consider making Deep the default, or drawing the pleat edges the way the vest’s lapel edges are drawn.',
    ],
    shots: [{ piece: 'pleats', paper: 'sardine-run', turns: 1, label: 'Classic depth' }, { piece: 'pleats', paper: 'slate-grain', label: 'Classic depth' }] },
  { group: FOLDS, kind: 'note', title: 'Five pieces will be hard to fold at their suggested sizes',
    body: [
      'From the repository’s own fold metrics (npm run fold-metrics), at the suggested starting squares:',
      '- Folded necktie: 21 layers of paper at one point, from a 7 cm square.',
      '- Zori: 16 layers from 8 cm. Folding fan: facets about 1.5 mm wide from 7.5 cm.',
      '- Gown and fit-and-flare: a crease under 0.3 mm long. Ankle boots: a facet 0.3 mm wide.',
      'None of this shows on screen. For a first try in real paper, fold these from 15 cm or larger and treat the suggested sizes as board sizes only. The kimono, dress and coat-dress are still the three I would fold first.',
    ] },
];

export const FOLD_NOTES: Record<string, FoldNote> = {
  dress: { tier: 'Anchor', note: 'Reads at once. Collar and sleeves show the reverse; choices and all seven accessories.' },
  jacket: { tier: 'Solid', note: 'Clear, if boxy. The reverse shows only at collar and cuffs, so it suits a strong print.' },
  skirt: { tier: 'Solid', note: 'The wrap flap gives it away. Nearly half the front is reverse, so the reverse matters here.' },
  vest: { tier: 'Anchor', note: 'Lapels and placket read well. Most motif papers miss the narrow fronts as drawn.' },
  pleats: { tier: 'Solid', note: 'A clean skirt, but the pleats do not show at Classic depth. See Findings.' },
  clutch: { tier: 'Anchor', note: 'An envelope is an envelope. Shown on the diagonal, so stripes always run corner to corner.' },
  apron: { tier: 'Look again', note: 'The bib is almost as wide as the skirt, so it reads as a house. No choices, no accessories.' },
  tunic: { tier: 'Look again', note: 'A wedge with one cut corner. The gown does this better.' },
  tabard: { tier: 'Solid', note: 'A plain shield that shows a print whole. Useful as a canvas more than as a garment.' },
  'boat-top': { tier: 'Look again', note: 'A band over a taper, with no shoulders. Reads as a bucket.' },
  'wrap-top': { tier: 'Solid', note: 'The crossed fronts read well and turn stripes on the diagonal.' },
  hat: { tier: 'Look again', note: 'A trapezoid with a line. Shows no reverse at all.' },
  kimono: { tier: 'Anchor', note: 'The most recognisable piece. Keeps only two small parts of the printed face, so placement matters most here.' },
  gown: { tier: 'Anchor', note: 'Elegant, and the sash is a good use of the reverse. A crease under 0.3 mm at 20 cm; no accessories.' },
  'coat-dress': { tier: 'Anchor', note: 'The strongest silhouette in the set, and it shows both faces of the paper in either colourway. No accessories.' },
  'swing-coat': { tier: 'Solid', note: 'Reads as a coat. Shows 39% print, the least of any garment, so it is a reverse-led piece.' },
  'fit-flare': { tier: 'Anchor', note: 'The waist does a lot of work. A crease under 0.3 mm at 20 cm; no accessories.' },
  'camp-shirt': { tier: 'Anchor', note: 'Collar, placket and cuffs all read. Fourteen steps, and nowhere to put a pocket.' },
  necktie: { tier: 'Anchor', note: 'Shown on the diagonal, so any stripe is a regimental stripe. 21 layers at 7 cm.' },
  capelet: { tier: 'Solid', note: 'Reads once you know. The two fronts take a motif well.' },
  'boot-left': { tier: 'Look again', note: 'An L with a slanted toe. No reverse, no cuff, no heel.' },
  'boot-right': { tier: 'Look again', note: 'As the left boot.' },
  zori: { tier: 'Anchor', note: 'The thong in the other colour makes it. 16 layers at 8 cm.' },
  sensu: { tier: 'Anchor', note: 'Unmistakable, and hard on prints. See Findings.' },
  'framed-brooch': { tier: 'Anchor', note: 'A small window that frames whatever you slide under it. The best partner for a motif paper.' },
  'mitten-left': { tier: 'Solid', note: 'Reads as a mitten. The thumb sits at the wrist, as the notes already say.' },
  'mitten-right': { tier: 'Solid', note: 'As the left mitten.' },
};

/** One line per paper, shown at the top of its sheet. */
export const PAPER_NOTES: Record<string, string> = {
  'stripe-disc': 'The default. The disc is the thing to place: it lands low on the dress and gown, and on the kimono only two turns bring it to a sleeve.',
  'plum-scatter': 'One blossom and a trail. Lost as drawn on nine pieces; the found placements recover all of them.',
  'border-print': 'A hem as drawn. Two turns make it a yoke, collar, cuff or rim. See Findings.',
  'botanical': 'An even scatter that survives every fold. Plain reverse.',
  'ivory-border': 'A fine frame that becomes trim. Turning it changes almost nothing.',
  'oat-linen': 'Close to the board’s colour. See Findings.',
  'reed-study': 'A few scattered stems. Most pieces keep under half of them as drawn; sliding helps a great deal.',
  'arc-study': 'Large rings that every fold crops. Bold on big pieces, noise on small ones.',
  'ginkgo-pairs': 'Small paired leaves. Lost as drawn on five pieces.',
  'corner-bloom': 'One flower in a corner. Lost as drawn on eight pieces; the easiest paper to place with the new panel.',
  'midnight-orchard': 'One branch, fixed. Cannot reach the kimono at any turn. See Findings.',
  'ink-reverse': 'One line on the front and a ring on the back. Most pieces come out white with dark trim.',
  'reverse-garden': 'The drawing is on the back, so it shows where a piece shows its reverse. Lost as drawn on nine pieces; turns recover some.',
  'starlit-lining': 'A blank face and a night sky inside. It only appears on pieces that show the reverse.',
  'open-stems': 'The back is close to the board’s colour. See Findings.',
  'sunray-pleats': 'Drawn for the dress at this turn, and it shows. It also suits the pleated skirt.',
  'wide-frame': 'A heavy frame. One turn puts dark bands on the kimono’s sleeves and the swing coat’s fronts.',
  'dusk-wash': 'A gradient, so the turn decides where the dark end goes: hem as drawn, shoulders at two turns.',
  'twice-folded': 'Its repeat sits on the sheet’s eighths, so blossoms land whole on the camp shirt and pleated skirt as well as the kimono.',
  'sardine-run': 'The turn decides whether the fish swim across or down.',
};
