"""Package a committed experiment build for an isolated Pages preview."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

repo = Path(__file__).resolve().parents[1]
out = Path(sys.argv[1]).resolve()
if out.exists():
    raise SystemExit('Choose a new output directory; existing files are preserved.')
for args in [['diff', '--exit-code'], ['diff', '--cached', '--exit-code']]:
    subprocess.run(['git', '-C', str(repo), *args], check=True)
sha = subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip()
base = '79d545778b5ea28e6fa59087fe14af93dc6098ec'
shutil.copytree(repo / 'dist-experiment', out)
app = out / 'experiments/fold-study/index.html'
app.write_text(app.read_text().replace('</head>', f'<meta name="papercouture-source-sha" content="{sha}"></head>'))
(out / 'index.html').write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Paper Couture — fold study</title><style>body{{margin:0;background:#f5f0e7;color:#2e2a25;font:18px/1.55 system-ui,sans-serif}}main{{max-width:650px;margin:6vh auto;padding:24px}}h1{{line-height:1.1}}a{{color:#245a68}}.play{{display:block;background:#245a68;color:white;text-align:center;text-decoration:none;padding:15px;border-radius:14px;margin:24px 0}}li{{margin:12px 0}}code{{overflow-wrap:anywhere;font-size:.8rem}}</style></head><body><main><p>Separate owner trial · Sol 6.1</p><h1>Two folds to try</h1><p>A bib apron and an envelope clutch, each folded from its own square. The fan remains parked.</p><a class="play" href="/experiments/fold-study/">Play the apron and clutch study</a><ul><li>Use Fold and Turn over, or drag the highlighted paper. The clutch tip has a tap/drag grip.</li><li>After folding, choose Display, then Front, Angle and Back.</li><li>Return to Workshop to unfold with Back, or Start over.</li><li>Switch the Study menu to Bib apron. Try contrasting papers and their four turns.</li></ul><p>Progress stays with each item while this page is open. The simulation does not establish physical-paper feasibility.</p><p><a href="https://ee9cfe69.papercouture-lab-20260930.pages.dev/play/paper-couture/">Compare the existing PR15 preview</a></p><p>Source <code>{sha}</code></p></main></body></html>''')
(out / '404.html').write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Page not found</title></head><body><h1>Page not found</h1><a href="/">Return to the fold study</a></body></html>')
(out / '_headers').write_text('/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n/build-info.json\n  Cache-Control: no-store\n')
files = {str(p.relative_to(out)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file()}
info = {'project': 'PaperCouture', 'branch': 'experiment/sol61-apron-clutch-20261001', 'source_sha': sha, 'base_sha': base, 'entry': '/experiments/fold-study/', 'status': 'isolated owner experiment; fan parked; no physical certification', 'files_sha256': files}
(out / 'build-info.json').write_text(json.dumps(info, indent=2) + '\n')
print(json.dumps({'site': str(out), 'source_sha': sha, 'files': list(files)}, indent=2))
