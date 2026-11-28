"""Bundle the placement review page into one HTML file that opens without a server.

    npm run build:placement
    python3 scripts/package-placement-review.py

Writes docs/placement-review/review.html. The page draws every picture in the
browser from the app's own fold and paper code, which is bundled into the file.
"""
import glob
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
dist = root / 'dist-placement'
js = Path(glob.glob(str(dist / 'assets' / '*.js'))[0]).read_text().replace('</script', '<\\/script')
css = Path(glob.glob(str(dist / 'assets' / '*.css'))[0]).read_text()
html = (dist / 'experiments' / 'placement' / 'index.html').read_text()
html = re.sub(r'<script type="module"[^>]*></script>', '', html)
html = re.sub(r'<link rel="stylesheet" crossorigin href="[^"]*assets/[^"]*">', '', html)
html = html.replace('<!doctype html>', '<!DOCTYPE html>')
html = html.replace('</head>', '<style>\n' + css + '\n</style>\n</head>')
html = html.replace('</body>', '<script type="module">\n' + js + '\n</script>\n</body>')
assert 'assets/' not in html.split('<script type="module">')[0], 'an external asset link was left in the page'
out = root / 'docs' / 'placement-review' / 'review.html'
out.write_text(html)
print(f'wrote {out.relative_to(root)} ({len(html) // 1024} KB)')
