"""Package a source-backed visual study; screenshots are actual app renders."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import argparse, base64, hashlib, html, json, subprocess, textwrap, zipfile

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/design-curation/evidence'
parser = argparse.ArgumentParser()
parser.add_argument('--output', default=str(ROOT.parent / 'deliverables'))
parser.add_argument('--pr', default='Draft preparation')
parser.add_argument('--images-only', action='store_true')
args = parser.parse_args()
OUT = Path(args.output); OUT.mkdir(parents=True, exist_ok=True)
INK, BG, TEAL = '#2d3d3e', '#f4efe4', '#3f626b'
FONT = Path('/System/Library/Fonts/Supplemental/Arial.ttf')
def font(size, bold=False):
    p = FONT.with_name('Arial Bold.ttf') if bold else FONT
    return ImageFont.truetype(str(p), size) if p.exists() else ImageFont.load_default(size=size)
def write(draw, xy, text, width, size=22, bold=False, fill=INK):
    # Measure actual glyphs, rather than guessing a character quota.
    f = font(size, bold); words = text.split(); lines = []; line = ''
    for word in words:
        candidate = (line + ' ' + word).strip()
        if line and draw.textlength(candidate, font=f) > width:
            lines.append(line); line = word
        else: line = candidate
    if line: lines.append(line)
    for i, line in enumerate(lines): draw.text((xy[0], xy[1]+i*(size+7)), line, font=f, fill=fill)
    return len(lines)*(size+7)
def render(name, crop=True):
    im = Image.open(EVIDENCE / (name+'.png')).convert('RGB')
    return im.crop((255,160 if name.startswith('jacket-sash') else 115,925,675 if '-mid-' in name else 615)) if crop else im
def fit(im, size):
    im=im.copy(); im.thumbnail(size)
    canvas=Image.new('RGB',size,BG); canvas.paste(im,((size[0]-im.width)//2,(size[1]-im.height)//2)); return canvas
def jpeg64(im, width=1000):
    import io
    im = im.copy(); im.thumbnail((width,10000))
    data = io.BytesIO(); im.save(data,format='JPEG',quality=88)
    return 'data:image/jpeg;base64,'+base64.b64encode(data.getvalue()).decode()

candidates = [
 ('Running stitch', 'Curated paper', 'The strongest addition: small dash squares preserve the body outline, while the clay reverse makes collars and bands readable. The marks are printed; placement stays fixed.', ['dress-running-stitch-0-front','dress-running-stitch-0-back']),
 ('Folded sash', 'Promising experiment', 'Five folds on a separate square make a printed bar with a reverse border. It is a small central-waist accent with independent paper and print position, not a wrapped belt or physical tie.', ['sash-finished-separate','jacket-sash-front']),
 ('Arc study', 'Experimental paper', 'Open arcs make larger visual gestures and continue onto the reverse. Rotation and bounded sliding change which fragments remain visible; the artwork can leave the sheet edges.', ['dress-arc-study-0-front','tabard-arcs-shift-0-front']),
 ('Pointed tabard', 'Later silhouette experiment', 'Seven folds create a long, pointed paper panel. The wider version is cleaner than the early necktie-like study, but still reads partly as a pennant. No neck opening, ties or accessory anchors.', ['tabard-stitch-front','tabard-stitch-back']),
]

sheet = Image.new('RGB',(1800,1750),BG); d=ImageDraw.Draw(sheet)
write(d,(42,26),'Paper Couture / four focused candidates',1700,40,True)
write(d,(42,80),'Actual retained-paper renders. Curated paper first; experiments remain clearly labeled.',1700,23)
for i,(name,label,note,shots) in enumerate(candidates):
    y=132+i*386
    write(d,(42,y+12),str(i+1)+' / '+name,480,30,True)
    write(d,(42,y+59),label,480,21,True,TEAL)
    write(d,(42,y+102),note,475,21)
    for j,n in enumerate(shots):
        im=fit(render(n),(588,330)); sheet.paste(im,(554+j*606,y))
        write(d,(562+j*606,y+335),{'dress-running-stitch-0-front':'Dress / Front','dress-running-stitch-0-back':'Dress / Back','sash-finished-separate':'Separate square / finished sash','jacket-sash-front':'Jacket / sash attached','dress-arc-study-0-front':'Dress / original placement','tabard-arcs-shift-0-front':'Tabard / shifted print','tabard-stitch-front':'Tabard / Front','tabard-stitch-back':'Tabard / Back'}[n],576,17)
write(d,(42,1698),'Virtual visual review only. Physical folding, joints, thickness and real-phone Safari remain untested.',1700,20)
sheet.save(OUT/'Paper-Couture-curation-comparison.jpg',quality=91)
sheet.resize((1440,1400)).save(ROOT/'docs/design-curation/comparison.jpg',quality=88)

folds=Image.new('RGB',(1800,710),BG); d=ImageDraw.Draw(folds)
write(d,(32,18),'The real folds / halfway through each operation',1700,32,True)
write(d,(32,61),'Pointed tabard: seven operations. Folded sash: five operations. Original material coordinates and fold engine.',1700,20)
for row,(label,prefix,count) in enumerate([('Tabard','tabard-mid-',7),('Sash','sash-mid-',5)]):
    y=104+row*294; write(d,(32,y),label,1700,24,True)
    w=1720//count
    for i in range(count):
        im=fit(render(prefix+str(i+1)),(w-8,204)); folds.paste(im,(32+i*w,y+40))
        write(d,(40+i*w,y+250),'Step '+str(i+1),w-10,18)
folds.save(OUT/'Paper-Couture-curation-folds.jpg',quality=91)

mobile=Image.new('RGB',(1450,1000),BG); d=ImageDraw.Draw(mobile)
write(d,(32,18),'The same scroll on a phone-sized viewport',1350,32,True)
for x,n in [(32,'tabard-mobile-390'),(400,'sash-mobile-390')]:
    im=render(n,False);im.thumbnail((330,850));mobile.paste(im,(x,94))
for y,n in [(100,'tabard-mobile-844'),(492,'sash-mobile-844')]:
    im=render(n,False);im.thumbnail((660,365));mobile.paste(im,(754,y))
write(d,(754,900),'390 x 844 / 844 x 390. Chromium emulation; no claim of physical-phone or Safari verification.',640,20)
mobile.save(ROOT/'docs/design-curation/mobile.jpg',quality=88)

if args.images_only: raise SystemExit(0)
checks=json.loads((EVIDENCE/'browser-results.json').read_text())
ink=json.loads((EVIDENCE/'ink-results.json').read_text())
if not checks.get('passed') or not ink.get('passed'): raise RuntimeError('Passing final browser and ink results required')
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
changed=subprocess.check_output(['git','diff','--name-only','9e3fa0af830c4dccaa554c9e7bdec2b77be6ec96'],cwd=ROOT,text=True).splitlines()
if not changed: changed=subprocess.check_output(['git','diff','--name-only','9e3fa0af830c4dccaa554c9e7bdec2b77be6ec96..HEAD'],cwd=ROOT,text=True).splitlines()
source={'base':'9e3fa0af830c4dccaa554c9e7bdec2b77be6ec96','acceptedCandidate':'f3f735cd68d784ca3850dafdefa8030124d3088f','candidate':head,'draftPR':args.pr,'buildAssets':{str(f.relative_to(ROOT/'dist')):hashlib.sha256(f.read_bytes()).hexdigest() for f in (ROOT/'dist').rglob('*') if f.is_file()},
        'files':{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in changed if (ROOT/name).is_file()}}
(OUT/'source.json').write_text(json.dumps(source,indent=2)+'\n')
sections=''.join('<section><div><p class="tag">'+html.escape(label)+'</p><h2>'+html.escape(name)+'</h2><p>'+html.escape(note)+'</p></div><div class="pair">'+''.join('<img alt="'+html.escape(name+' / '+n)+'" src="'+jpeg64(render(n))+'">' for n in shots)+'</div></section>' for name,label,note,shots in candidates)
pr=html.escape(args.pr,quote=True)
report='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paper Couture / design and curation study</title>
<style>body{margin:0;background:#f4efe4;color:#2d3d3e;font:18px/1.5 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:40px 24px}h1{font-size:clamp(32px,5vw,56px);line-height:1.1;margin:12px 0}h2{line-height:1.2}.eyebrow,.tag{color:#3f626b;font-size:14px;letter-spacing:.05em}.tag{margin:0}section{border-top:1px solid #c9c3b7;padding:28px 0;display:grid;grid-template-columns:1fr 2fr;gap:30px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}img{max-width:100%;border-radius:6px}a{color:#315969;overflow-wrap:anywhere}li{margin:10px 0}code{font-size:14px;overflow-wrap:anywhere}details{border:1px solid #c9c3b7;padding:18px;border-radius:6px}summary{cursor:pointer}table{border-collapse:collapse;width:100%;font-size:16px}td,th{text-align:left;padding:12px;border-bottom:1px solid #c9c3b7}.meta{font-size:14px}footer{padding-top:32px;font-size:15px}@media(max-width:760px){main{padding:24px 16px}section{grid-template-columns:1fr}.pair{gap:6px}details{padding:12px}table{table-layout:fixed;font-size:13px}td,th{padding:8px 4px;overflow-wrap:anywhere}}</style><main>
<p class="eyebrow">PAPER COUTURE / 04 OCTOBER 2026 / LOCAL DRAFT STUDY</p><h1>A few new folds and papers,<br>with the strongest choices first.</h1>
<p>Running stitch is the clearest new paper. The sash adds a small separate-sheet accent. Arc study rewards turning and moving the print. The tabard is a useful long silhouette to compare, with weaker garment readability; it stays last among the experiments.</p>
<p>These are actual application renders and retained-paper geometry. No production publication is included.</p>'''+sections+'''
<section><div><p class="tag">CURATION</p><h2>One scroll, every old choice</h2><p>Curated means a readable starting set. Experiments means bolder or more placement-dependent options, with modest labels rather than a separate hidden collection.</p></div><div><p><b>Papers first:</b> Stripe and disc, Running stitch, Pinstripe and lining, Plum scatter, Border print, Botanical sprigs, Indigo lattice, Ivory, ink border.</p><p><b>Then:</b> Arc study and all remaining old papers. All 19 old visible papers remain in the same scroll, with the same IDs and art. The familiar Dress / Stripe and disc defaults stay intact.</p><p><b>Design:</b> the existing five collection garments first, then clutch, apron, tunic and tabard. The five existing accessories stay first; the sash follows under Experiments.</p></div></section>
<section><div><p class="tag">PAPER ALLOCATION</p><h2>Folds, reverse and placement</h2><p>Running stitch leaves the silhouette readable. Arc contours continue onto the reverse, but folds can bury the largest parts. The sash has its own ink, turn and offset; it does not move the garment print.</p></div><img alt="Halfway through all new folds" src="'''+jpeg64(folds,1800)+'''"></section>
<section><div><p class="tag">DESKTOP / PHONE EMULATION</p><h2>The existing controls still work</h2><p>Portrait and landscape checks include reaching the final old paper, garment selection, print positioning, front/back, sash editing and pinboard export.</p></div><img alt="Portrait and landscape app evidence" src="'''+jpeg64(mobile,1450)+'''"></section>
<details open><summary>What passed, and what remains untested</summary><table><tr><th>New fold</th><th>Retained area</th><th>Worst sampled hinge gap</th><th>Reverse exposure</th></tr><tr><td>Pointed tabard / 7 ops / 10 facets</td><td>4.000</td><td>0.0220</td><td>13.9%</td></tr><tr><td>Folded sash / 5 ops / 5 facets</td><td>4.000</td><td>0.0165</td><td>38.5%</td></tr></table>
<p>81 samples per operation checked rigidity, material edges, hinge bounds, endpoint continuity, reversal, reset, table clearance and strict triangle-interior piercings. Lowest vertex: 0.0015; zero sampled strict piercings. Reverse exposure is a normal-projection diagnostic.</p><ul>'''+''.join('<li>'+html.escape(c)+'</li>' for c in checks['checks'])+'''
<li>Arc material-contour masks agree at four turns and three offsets within fewer than 64 antialiased boundary pixels per 1024-square canvas. Artwork changes while background and grain remain fixed.</li>
<li>Node 24 typecheck, numerical tests and production build pass. Complete accessory footprints: 442 offered placements, zero uncovered area.</li></ul>
<p><b>Not established:</b> physical origami, wearable openings, locks or ties, paper thickness or stability, continuous collision-free motion, Safari or a real phone. No independent design reviewer was assigned. The early all-reverse sash was rejected; the tabard was widened after its first visual pass.</p></details>
<section><div><p class="tag">EARLIER WORK</p><h2>Avoiding duplicates</h2></div><div><p>Apron, clutch and one-shoulder tunic already exist. Bridge culottes still require an assembly and paper-joint study; the held-open fork loses its gap at closure. Lantern and riding panels, radial badge, cape/bolero, robe and trousers remain parked. This pass adds no pant claim.</p><p>Old defaults, URLs, options, accessories, in-memory progress and save semantics are preserved. No storage writes, deletions, migrations, backend or new accounts.</p></div></section>
<footer><p><b>Review:</b> <a href="'''+pr+'''">'''+pr+'''</a></p><p class="meta">Candidate <code>'''+head+'''</code><br>Base / PR17 merge <code>9e3fa0af830c4dccaa554c9e7bdec2b77be6ec96</code><br>Exact same-tree accepted feature candidate <code>f3f735cd68d784ca3850dafdefa8030124d3088f</code></p><p>Play the frozen app in the accompanying packet: serve its preview folder over localhost HTTP. The normal app contains the new papers, experimental tabard and separately folded sash. Source hashes, patch, raw renders and passing result files are included.</p></footer></main></html>'''
(OUT/'Paper-Couture-curation-study.html').write_text(report)
patch=subprocess.check_output(['git','diff','--binary','9e3fa0af830c4dccaa554c9e7bdec2b77be6ec96'],cwd=ROOT)
if not patch: patch=subprocess.check_output(['git','diff','--binary','9e3fa0af830c4dccaa554c9e7bdec2b77be6ec96..HEAD'],cwd=ROOT)
(OUT/'candidate.patch').write_bytes(patch)
readme='''Paper Couture / design-curation draft packet

Open Paper-Couture-curation-study.html for the comparison and exact source.
The JPEGs are actual app render contact sheets. Full-size screenshots in the
evidence folder use JPEG compression to keep this packet compact; the actual
pinboard export remains its original PNG.

Play the frozen preview on a computer:
  cd preview
  python3 -m http.server 4183 --bind 127.0.0.1
Then open http://127.0.0.1:4183/ . It is localhost-only, not a public site.
For a phone, use a future authorized existing-host preview; this packet does not
publish anything. No new hosting, accounts or DNS.

To reproduce source, obtain CharlesMish/PaperCouture at the base in source.json
and apply candidate.patch, or check out the draft PR head. Use Node 24, npm ci,
npm run typecheck, npm test, npm run build. Browser scripts and scopes are in
docs/design-curation/NOTES.md. source.json records the exact candidate and hashes.

Headless Chromium + visual inspection. Physical folds, locks/joins, thickness,
continuous collisions, Safari and real-phone play remain untested.
'''
with zipfile.ZipFile(OUT/'Paper-Couture-curation-packet.zip','w',zipfile.ZIP_DEFLATED) as z:
    z.writestr('README.txt',readme)
    for f in OUT.iterdir():
        if f.suffix in ['.html','.jpg','.json','.patch']: z.write(f,f.name)
    for f in (ROOT/'dist').rglob('*'):
        if f.is_file(): z.write(f,'preview/'+str(f.relative_to(ROOT/'dist')))
    for f in EVIDENCE.iterdir():
        if f.is_file() and f.name!='failure.png' and (f.suffix=='.json' or f.suffix=='.png'):
            if f.suffix=='.png' and 'export' not in f.name:
                import io
                data=io.BytesIO();Image.open(f).convert('RGB').save(data,format='JPEG',quality=88)
                z.writestr('evidence/'+f.stem+'.jpg',data.getvalue())
            else: z.write(f,'evidence/'+f.name)
    for f in [ROOT/'docs/design-curation/NOTES.md',ROOT/'scripts/check-curation-browser.cjs',ROOT/'scripts/check-curation-ink.cjs',ROOT/'scripts/check-design-curation.ts']:
        z.write(f,str(f.relative_to(ROOT)))
print(json.dumps({'candidate':head,'files':[{ 'name':f.name,'bytes':f.stat().st_size} for f in OUT.iterdir() if f.suffix in ['.html','.jpg','.zip']]},indent=2))
