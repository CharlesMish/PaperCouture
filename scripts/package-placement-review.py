"""Bundle a sketch-lane page into one HTML file that opens without a server.

    npm run build:placement && python3 scripts/package-placement-review.py
    npm run build:figure && python3 scripts/package-placement-review.py figure

Writes docs/placement-review/review.html, or docs/figure-study/study.html. Each
page draws every picture in the browser from the app's own fold and paper code,
which is bundled into the file.
"""
import glob
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
page = sys.argv[1] if len(sys.argv) > 1 else 'placement'
dist = root / f'dist-{page}'
js = Path(glob.glob(str(dist / 'assets' / '*.js'))[0]).read_text().replace('</script', '<\\/script')
css = Path(glob.glob(str(dist / 'assets' / '*.css'))[0]).read_text()
html = (dist / 'experiments' / page / 'index.html').read_text()
html = re.sub(r'<script type="module"[^>]*></script>', '', html)
html = re.sub(r'<link rel="stylesheet" crossorigin href="[^"]*assets/[^"]*">', '', html)
html = html.replace('<!doctype html>', '<!DOCTYPE html>')
html = html.replace('</head>', '<style>\n' + css + '\n</style>\n</head>')
html = html.replace('</body>', '<script type="module">\n' + js + '\n</script>\n</body>')
assert 'assets/' not in html.split('<script type="module">')[0], 'an external asset link was left in the page'
out = root / 'docs' / ('figure-study' if page == 'figure' else 'placement-review') / ('study.html' if page == 'figure' else 'review.html')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html)
print(f'wrote {out.relative_to(root)} ({len(html) // 1024} KB)')
