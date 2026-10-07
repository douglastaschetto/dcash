"""Generates apps/frontend/src/app/ajuda/guide-content.ts from dcash-guia-do-usuario.html."""
import json
import re

src = open('dcash-guia-do-usuario.html', encoding='utf-8').read().replace('\r\n', '\n')

# ── Navigation (from the guide sidebar) ─────────────────────────
nav_html = src[src.index('<nav class="sidebar" id="sidebar">'):src.index('</nav>')]
GROUP_KEY = {
    'Comece por aqui': 'start', 'Principal': 'principal', 'Finanças': 'financas', 'Metas': 'metas',
    'DCaos — a casa': 'dcaos', 'Organização': 'organizacao', 'Conta e assinatura': 'conta', 'Ajuda': 'ajuda',
}
groups = []
for part in re.split(r'<h4>', nav_html)[1:]:
    label, rest = part.split('</h4>', 1)
    items = []
    for href, text in re.findall(r'<a href="#([^"]+)">([^<]+)</a>', rest):
        text = text.strip()
        emoji, title = text.split(' ', 1)
        items.append({'id': href, 'emoji': emoji, 'title': title})
    groups.append({'key': GROUP_KEY.get(label, 'start'), 'label': label, 'items': items})

group_of = {it['id']: g['key'] for g in groups for it in g['items']}

# ── Content (inside <main>, without hero and footer) ───────────
main = src[src.index('<main>') + len('<main>'):src.index('</main>')]
main = re.sub(r'<div class="hero" id="intro">.*?</div>\s*</div>', '', main, count=1, flags=re.S)
main = re.sub(r'\s*<footer>.*?</footer>', '', main, flags=re.S)
main = re.sub(r'\s*<hr class="sep">', '', main)
main = re.sub(r'<!--.*?-->', '', main, flags=re.S)


def tag(m):
    sid = m.group(1)
    return f'<section class="page-section" data-group="{group_of.get(sid, "start")}" id="{sid}">'


main = re.sub(r'<section class="page-section" id="([^"]+)">', tag, main)
main = re.sub(r'\n\s*\n', '\n', main).strip()

hero_p = re.search(r'<div class="hero" id="intro">\s*<h1>[^<]*</h1>\s*<p>(.*?)</p>', src, re.S).group(1)

out = [
    '// GERADO a partir de dcash-guia-do-usuario.html (raiz do projeto).',
    '// Para atualizar: edite o guia e rode o gerador (python scripts/gen-ajuda.py, na raiz) — não edite à mão.',
    '',
    'export type GuideNavItem = { id: string; emoji: string; title: string };',
    'export type GuideNavGroup = { key: string; label: string; items: GuideNavItem[] };',
    '',
    f'export const GUIDE_NAV: GuideNavGroup[] = {json.dumps(groups, ensure_ascii=False, indent=2)};',
    '',
    f'export const GUIDE_INTRO = {json.dumps(hero_p, ensure_ascii=False)};',
    '',
    f'export const GUIDE_HTML = {json.dumps(main, ensure_ascii=False)};',
    '',
]
open('apps/frontend/src/app/ajuda/guide-content.ts', 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
print('groups', len(groups), 'sections', main.count('class="page-section"'), 'bytes', len(main))
