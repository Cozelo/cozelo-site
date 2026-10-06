#!/usr/bin/env python3
"""Update the ?v= cache-busting stamp on /assets/site.css, site.js and motif.js in every page.

Netlify serves /assets/* with a 7-day browser cache (netlify.toml), so returning visitors
would keep an old site.css after a deploy. Run this after editing either file:
    python3 scripts/stamp-assets.py
"""
import hashlib, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
for name in ('site.css', 'site.js', 'motif.js'):
    v = hashlib.sha1((root / 'assets' / name).read_bytes()).hexdigest()[:8]
    pat = re.compile(r'(/assets/' + re.escape(name) + r'\?v=)[0-9a-f]+')
    for page in root.rglob('*.html'):
        s = page.read_text()
        t = pat.sub(r'\g<1>' + v, s)
        if t != s:
            page.write_text(t)
            print(f'{page.relative_to(root)}: {name} -> v={v}')
