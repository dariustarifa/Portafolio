#!/usr/bin/env python3
"""Genera las páginas HTML del portafolio a partir de _fuentes/content.json
(extraído de tu Figma). Ejecuta:  python3 build.py
Medidas en px de diseño (lienzo 1616) → rem (1rem = 100 px de diseño)."""
import json, os, html, re

ROOT = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(ROOT) == '_fuentes':
    ROOT = os.path.dirname(ROOT)
C = json.load(open(os.path.join(ROOT, '_fuentes/content.json'), encoding='utf-8'))

EXT = {}
for f in os.listdir(os.path.join(ROOT, 'assets/img')):
    stem, ext = os.path.splitext(f)
    EXT[stem] = f

URL = dict(
    insta='https://www.instagram.com/ithe_6/',
    linked='https://www.linkedin.com/in/darius-bougerol-27265b329/',
    wa='https://wa.me/34615538455?text=' + 'Hola%2C%20quiero%20trabajar%20contigo.',
    mail='mailto:dariusbougerol@gmail.com',
    tel='tel:+34615538455',
)
YT = dict(loser='LtIbkp0vARo', starwars='BTB1am1jEcQ', epico='qYdGZHClr9s',
          airbnb='7PN0ojebiNw', carmen='UbR8HcodsA4', sentimental='jB1jmcbXkdM')

ARROW = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>')
PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>'


def rem(px, nd=3):
    v = round(px / 100.0, nd)
    return ('%g' % v)


def esc(s):
    return html.escape(s, quote=True)


def src(h):
    return 'assets/img/' + EXT[h]


# --------------------------------------------------------------------------
# Piezas
# --------------------------------------------------------------------------
class Page:
    def __init__(self, slug, key, title, nav, theme_page=None, desc=''):
        self.slug, self.key, self.title, self.nav = slug, key, title, nav
        self.parts = []
        self.desc = desc
        self.theme_page = theme_page or key
        self.n = 0

    def add(self, s):
        self.parts.append(s)


def sp(px):
    """margen superior en px de diseño (escalado por --ms en móvil)"""
    return 'style="--mt:%s"' % rem(px)


def photo(h, w, hh, rad, sid, idx, alt, y=0, col=0, T=None, filt=None, kind='', eager=False, mtop=None):
    cls = 'ph' + (' ' + kind if kind else '')
    style = ['--ar:%s' % ('%.5f' % (w / hh)), '--rad:%srem' % rem(rad)]
    img_style = ''
    if T:
        m00, m11, m02, m12 = T
        img_style = (' style="inset:auto;width:%.3f%%;height:%.3f%%;left:%.3f%%;top:%.3f%%;object-fit:fill"'
                     % (100 / m00, 100 / m11, -m02 / m00 * 100, -m12 / m11 * 100))
    if filt == 'bw':
        img_style = (img_style[:-1] + ';filter:grayscale(1)"') if img_style else ' style="filter:grayscale(1)"'
    s = ('<a class="%s" href="%s" data-set="%s" data-i="%d" data-y="%d" data-c="%d" data-w="%d" data-h="%d" '
         'aria-label="%s" style="%s"><span class="pf rvp"><img src="%s" alt="%s" width="%d" height="%d"%s decoding="async"%s></span></a>'
         % (cls, src(h), sid, idx, y, col, round(w), round(hh), esc(alt), ';'.join(style), src(h), esc(alt),
            round(w), round(hh), '' if eager else ' loading="lazy"', img_style))
    return s


def gallery(b, sid, alt, rad, colgap=45, rowgap=30, start=0):
    top = min(i['y'] for col in b['cols'] for i in col)
    out = ['<div class="gal" style="--cg:%s;--rg:%s">' % (rem(colgap), rem(rowgap))]
    n = start
    for ci, col in enumerate(b['cols']):
        out.append('<div class="col" data-col="%d">' % ci)
        for it in col:
            r = rad if rad is not None else (it.get('r') or 5)
            out.append(photo(it['img'], it['w'], it['h'], r, sid, n, alt, y=round(it['y'] - top), col=ci,
                             T=it.get('T') if it.get('mode') == 'STRETCH' else None,
                             filt='bw' if (it.get('filter') or {}).get('vibrance') == -1 else None))
            n += 1
        out.append('</div>')
    out.append('</div>')
    return '\n'.join(out), n


def runs_html(runs, base_w):
    out = []
    for r in runs:
        t = r['t']
        parts = t.split('\n')
        seg = []
        for i, p in enumerate(parts):
            if i:
                seg.append('<br>')
            seg.append(esc(p))
        s = ''.join(seg)
        if not s.strip() and '<br>' not in s:
            out.append(s)
            continue
        if r['w'] != base_w:
            out.append('<span style="font-weight:%d">%s</span>' % (r['w'], s))
        else:
            out.append(s)
    return ''.join(out).rstrip()


def tx_block(b, cls='tx', mt=0, tag='p', extra=''):
    h = runs_html(b['runs'], b['weight'])
    # los 6 espacios tras "Hola!" del diseño → hueco fijo
    h = re.sub(r'(Hola!</span>|Hola!)(\s{3,})', r'\1<span class="gap"></span>', h)
    return ('<%s class="%s sp rv" style="font-weight:%d;--fs:%s;--lh:%s;--mt:%s">%s</%s>'
            % (tag, cls + extra, b['weight'], rem(b['size']), rem(b['lh']), rem(mt), h, tag))


def heading(text, mt, cls='hd', sid=None):
    return ('<h2 class="%s sp rv"%s style="--mt:%s">%s</h2>'
            % (cls, (' id="%s"' % sid) if sid else '', rem(mt), esc(text)))


# --------------------------------------------------------------------------
# Estructura común
# --------------------------------------------------------------------------
NAV = [('sobre', 'sobre-mi.html', 'Sobre mí'), ('foto', 'retrato.html', 'Fotografía'), ('video', 'video.html', 'Vídeo')]
FILT = [('retrato', 'retrato.html', 'Retrato'), ('comercial', 'comercial.html', 'Comercial'),
        ('documental', 'documental.html', 'Documental'), ('eventos', 'eventos.html', 'Eventos')]


def head(pg, mode=''):
    return f'''<!doctype html>
<html lang="es" data-page="{pg.theme_page}" data-theme="oscuro" data-nav="{pg.nav}" class="is-loading">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(pg.title)}</title>
<meta name="description" content="{esc(pg.desc or 'Darius Bougerol · fotógrafo y videógrafo en Granada. Retrato, comercial, documental, eventos y vídeo.')}">
<meta name="theme-color" content="#262221">
<link rel="stylesheet" href="css/main.css">
<script>
(function(){{var d=document.documentElement;
try{{var t=localStorage.getItem('db-theme');if(t==='claro'||t==='pop'||t==='oscuro')d.dataset.theme=t}}catch(e){{}}
function v(){{d.style.setProperty('--vw',d.clientWidth+'px')}}v();addEventListener('resize',v);
if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){{}}else{{d.classList.add('reduce')}}
setTimeout(function(){{d.classList.remove('is-loading')}},2500)}})();
</script>
<noscript><style>.curtain{{display:none}}.rv{{opacity:1!important;transform:none!important;filter:none!important}}html.is-loading .curtain{{display:none}}</style></noscript>
</head>
<body class="pg-{pg.key}">
<div class="bgs" aria-hidden="true"><i class="bg-o"></i><i class="bg-c"></i><i class="bg-p"></i></div>
'''


def logo_html(home=False):
    return ('<a class="logo" href="sobre-mi.html" aria-label="Darius Bougerol · Sobre mí">'
            '<img class="lg-cream" src="assets/img/fc7e46a07f02.png" alt="D·B" width="643" height="406">'
            '<img class="lg-dark" src="assets/img/b65746082939.png" alt="" width="642" height="409"></a>')


def header(pg, mode=''):
    nav = ''.join('<a href="%s" data-k="%s"%s>%s</a>' % (h, k, ' aria-current="page"' if k == pg.nav else '', t)
                  for k, h, t in NAV)
    if mode == 'home':
        return f'<header class="hdr hdr-home" id="hdr"><div class="cv">{logo_html()}</div></header>'
    if pg.key == 'contacto':
        right = f'''<div class="icons" aria-label="Redes">
<a class="pill" href="{URL['wa']}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="hl"></i><img src="assets/img/eba7bc9935e3.png" alt="" width="81" height="81"></a>
<a class="pill" href="{URL['insta']}" target="_blank" rel="noopener" aria-label="Instagram"><i class="hl"></i><img src="assets/img/62410073702e.png" alt="" width="88" height="88"></a>
<a class="pill" href="{URL['linked']}" target="_blank" rel="noopener" aria-label="LinkedIn"><i class="hl"></i><img src="assets/img/6938ffaf65d5.png" alt="" width="89" height="89"></a>
</div>'''
    else:
        right = (f'<a class="contact pill" href="contacto.html" data-k="contacto"><i class="hl"></i>'
                 f'<span class="lbl">Contacto</span><span class="arrow">{ARROW}</span></a>')
    return f'''<header class="hdr" id="hdr"><div class="cv">
{logo_html()}
<nav class="nav pill" id="nav" aria-label="Principal"><i class="hl"></i>{nav}</nav>
{right}
</div></header>
<div class="topfade" aria-hidden="true"></div>'''


def mobile_nav(pg):
    items = NAV + [('contacto', 'contacto.html', 'Contacto')]
    a = ''.join('<a href="%s" data-k="%s"%s>%s</a>' % (h, k, ' aria-current="page"' if k == pg.nav else '', t) for k, h, t in items)
    return f'<nav class="mnav pill" id="mnav" aria-label="Navegación"><i class="hl"></i>{a}</nav>'


def theme_switch():
    return '''<div class="tsw" id="tsw" role="group" aria-label="Tema">
<div class="pill a"><i class="hl"></i><button type="button" data-t="oscuro">Oscuro</button><button type="button" data-t="claro">Claro</button></div>
<div class="pill b"><i class="hl"></i><button type="button" data-t="pop">POP</button></div>
</div>'''


def filters(active):
    a = ''.join('<a href="%s" data-k="%s"%s>%s</a>' % (h, k, ' aria-current="page"' if k == active else '', t) for k, h, t in FILT)
    return f'<div class="blk filters-wrap"><div class="filters"><div class="pill" id="filters"><i class="hl"></i>{a}</div></div></div>'


def footer():
    return f'''<footer class="ftr rv">
<p class="copy">©2026 Darius Bougerol</p>
<p class="legal">Todas las imágenes presentes en esta web están sujetas a derechos de autoría, y no pueden ser usadas en ningún caso sin acuerdo previo del autor.</p>
<div class="links">
<a href="{URL['tel']}">Tel: +34 615 538 455</a>
<a href="{URL['mail']}">Mail: dariusbougerol@gmail.com</a>
<a href="{URL['insta']}" target="_blank" rel="noopener">Instagram: Ithe_6</a>
</div>
</footer>'''


def tail(pg, extra_js=()):
    js = ''.join('<script src="js/%s.js" defer></script>\n' % j for j in ('engine', 'app') + tuple(extra_js))
    return f'''
<div class="stack" id="stack" aria-hidden="true" role="dialog" aria-label="Galería">
<div class="veil"></div><div class="stage" id="stage"></div>
<button class="ctl close" type="button" aria-label="Cerrar">×</button>
<div class="ctl count" id="stackCount"></div>
<div class="ctl hint">Desliza · rueda · flechas</div>
</div>
<div class="curtain" aria-hidden="true"></div>
<div class="cur" aria-hidden="true"><i class="ring"></i><i class="dot"></i></div>
{js}</body>
</html>
'''


def write(pg, body, extra_js=(), mode=''):
    out = head(pg, mode) + header(pg, mode) + '\n' + body + '\n' + theme_switch()
    if mode != 'home':
        out += '\n' + mobile_nav(pg)
    out += tail(pg, extra_js)
    open(os.path.join(ROOT, pg.slug), 'w', encoding='utf-8').write(out)
    print('✓', pg.slug, len(out) // 1024, 'KB')


# --------------------------------------------------------------------------
# Páginas fotográficas
# --------------------------------------------------------------------------
def section_block(sid, title, hero, gals, rad, mt_head, colgap, rowgap, inset=None, first_alt='', alt=''):
    """cabecera + hero + galerías(s). Devuelve html"""
    o = []
    cls = 'blk sec' + (' inset' if inset else '')
    st = ' style="--inset:%srem"' % rem(inset) if inset else ''
    o.append('<section class="%s" data-sec="%s"%s>' % (cls, sid, st))
    if title:
        o.append(heading(title, mt_head, sid=sid))
    n = 0
    if hero:
        hmt = 60 if title else mt_head
        o.append('<div class="sp hero-wrap" %s>' % sp(hmt))
        o.append(photo(hero['img'], hero['w'], hero['h'], rad if rad is not None else (hero.get('r') or 5), sid, n, alt,
                       kind='hero', eager=(mt_head < 120 and sid in ('retrato', 'comercial', 'documental', 'fiestas-noche')),
                       T=hero.get('T') if hero.get('mode') == 'STRETCH' else None))
        o.append('</div>')
        n += 1
    for g in gals:
        gh, n = gallery(g, sid, alt, rad, colgap, rowgap, start=n)
        o.append('<div class="sp" %s>%s</div>' % (sp(54), gh))
    o.append('</section>')
    return '\n'.join(o)


def blocks(page):
    return C[page]


def build_retrato():
    pg = Page('retrato.html', 'retrato', 'Retrato · Darius Bougerol', 'foto',
              desc='Fotografía de retrato en Granada · Darius Bougerol.')
    b = blocks('retrato')
    hero, g1, feat, g2 = b[1], b[2], b[3], b[4]
    body = ['<main class="pg">', filters('retrato')]
    body.append('<div class="blk">' + heading('Retratos.', 129, sid='retratos') + '</div>')
    # sección 1: hero + galería 1
    body.append('<section class="blk sec" data-sec="retrato-a">')
    body.append('<div class="sp hero-wrap" %s>' % sp(60))
    body.append(photo(hero['img'], hero['w'], hero['h'], 5, 'retrato-a', 0, 'Retrato', kind='hero', eager=True))
    body.append('</div>')
    gh, n = gallery(g1, 'retrato-a', 'Retrato', 5, start=1)
    body.append('<div class="sp" %s>%s</div>' % (sp(54), gh))
    body.append('</section>')
    # sección 2: feature + galería 2
    body.append('<section class="blk sec" data-sec="retrato-b">')
    body.append('<div class="sp hero-wrap" %s>' % sp(44))
    body.append(photo(feat['img'], feat['w'], feat['h'], 5, 'retrato-b', 0, 'Retrato', kind='hero'))
    body.append('</div>')
    gh, n = gallery(g2, 'retrato-b', 'Retrato', 5, start=1)
    body.append('<div class="sp" %s>%s</div>' % (sp(48), gh))
    body.append('</section>')
    body.append(footer())
    body.append('</main>')
    write(pg, '\n'.join(body), ('gallery', 'stack'))


def build_comercial():
    pg = Page('comercial.html', 'comercial', 'Comercial · Darius Bougerol', 'foto',
              desc='Fotografía comercial: hostelería, tratamientos y producto.')
    b = blocks('comercial')
    body = ['<main class="pg">', filters('comercial')]
    secs = [('hosteleria', 'Hostelería.', b[1], b[2], 129),
            ('masaje', 'Masaje tratamientos', b[4], b[5], 101),
            ('producto', 'Producto', b[7], b[8], 78)]
    for sid, title, hero, g, mt in secs:
        body.append(section_block(sid, title, hero, [g], 5, mt, 45, 30, alt=title.rstrip('.')))
    body.append('<div class="blk"><a class="cta pill sp" %s href="eventos.html"><i class="hl"></i>'
                '<span>Descubre cómo cubro eventos comerciales aquí</span><span class="arrow">%s</span></a></div>'
                % (sp(53), ARROW))
    body.append(footer())
    body.append('</main>')
    write(pg, '\n'.join(body), ('gallery', 'stack'))


def build_documental():
    pg = Page('documental.html', 'documental', 'Documental · Darius Bougerol', 'foto',
              desc='Fotografía documental · Darius Bougerol.')
    b = blocks('documental')
    body = ['<main class="pg">', filters('documental')]
    body.append('<div class="blk">' + heading('Documental.', 129, sid='documental') + '</div>')
    body.append(section_block('documental-a', None, b[0], [b[1]], 5, 60, 45, 30, alt='Documental'))
    body.append(footer())
    body.append('</main>')
    write(pg, '\n'.join(body), ('gallery', 'stack'))


def build_eventos():
    pg = Page('eventos.html', 'eventos', 'Eventos · Darius Bougerol', 'foto',
              desc='Fotografía de eventos: fiestas, graduaciones y más.')
    b = blocks('eventos')
    body = ['<main class="pg">', filters('eventos')]
    secs = [('fiestas-noche', 'Fiestas. De noche.', b[1], b[2], 5, 129),
            ('fiestas-dia', 'Fiestas. De día.', b[4], b[5], 30, 111),
            ('graduaciones', 'Graduaciones.', b[7], b[8], 30, 111),
            ('otros', 'Otros.', b[10], b[11], 30, 111)]
    for sid, title, hero, g, rad, mt in secs:
        body.append(section_block(sid, title, hero, [g], rad, mt, 32, 32, inset=115, alt=title))
    f = b[12]
    body.append('<section class="blk sec inset" style="--inset:1.15rem">'
                '<div class="sp hero-wrap" %s>%s</div></section>'
                % (sp(111), photo(f['img'], f['w'], f['h'], 98, 'eventos-final', 0, 'Eventos', kind='hero')))
    body.append(footer())
    body.append('</main>')
    write(pg, '\n'.join(body), ('gallery', 'stack'))


# --------------------------------------------------------------------------
# Vídeo
# --------------------------------------------------------------------------
def yt(clip, w, h, label, kind=''):
    vid = YT[clip]
    return (f'<button class="yt rv {kind}" type="button" data-yt="{vid}" data-clip="{clip}" aria-label="Reproducir: {esc(label)}" '
            f'style="--ar:{w / h:.5f}"><img class="poster" src="assets/video/{clip}.jpg" alt="" loading="lazy" decoding="async">'
            f'<video class="pv" src="assets/video/{clip}.mp4" poster="assets/video/{clip}.jpg" muted loop playsinline preload="none"></video>'
            f'<span class="play">{PLAY}</span></button>')


def build_video():
    pg = Page('video.html', 'video', 'Vídeo · Darius Bougerol', 'video',
              desc='Vídeos promocionales, spots, cortometrajes y piezas sentimentales.')
    b = blocks('video')
    body = ['<main class="pg page-video">', '<div class="blk">']
    body.append('<h1 class="vh sp rv" %s>%s</h1>' % (sp(307), esc(b[0]['chars'])))
    body.append('<h2 class="vs sp rv" id="morisonando" %s>%s</h2>' % (sp(94), esc(b[1]['chars'])))
    body.append('<div class="vgrid sp" %s>%s%s</div>' % (sp(45),
                yt('loser', 704, 396, 'Morisoñando loser'), yt('starwars', 704, 396, 'Morisoñando Star Wars')))
    body.append('<div class="sp" %s>%s</div>' % (sp(35), yt('epico', 1455, 819, 'Morisoñando épico')))
    body.append('<h2 class="vs sp rv" id="spot" %s>%s</h2>' % (sp(79), esc(b[5]['chars'])))
    body.append('<div class="sp" %s>%s</div>' % (sp(45), yt('airbnb', 1455, 819, 'Spot publicitario Airbnb')))
    body.append('<h2 class="vs sp rv" id="carmen" %s>%s</h2>' % (sp(79), esc(b[7]['chars'])))
    body.append('<div class="sp" %s>%s</div>' % (sp(45), yt('carmen', 1455, 818, 'Cortometraje Carmen')))
    body.append('<h2 class="vs sp rv" id="sentimental" %s>%s</h2>' % (sp(79), esc(b[9]['chars'])))
    body.append('<div class="sp" %s>%s</div>' % (sp(45), yt('sentimental', 1455, 970, 'Vídeo sentimental')))
    body.append('</div>')
    body.append(footer())
    body.append('</main>')
    write(pg, '\n'.join(body), ('video',))


# --------------------------------------------------------------------------
# Sobre mí
# --------------------------------------------------------------------------
def build_sobre():
    pg = Page('sobre-mi.html', 'sobre', 'Sobre mí · Darius Bougerol', 'sobre',
              desc='Darius Bougerol · fotógrafo profesional en Granada y estudiante de marketing.')
    b = blocks('sobre')
    hero, t1, marcas, brandg, t2, huawei, t3 = b
    pics = brandg['cols']
    trio = [pics[0][1], pics[2][0], pics[3][0]]
    logos = [('babachic', 'Babachic', 62), ('ronqueo', 'Ronqueo', 72), ('tarifa', 'Tarifa Massage & Cosmetics', 66),
             ('morisonando', 'Morisoñando', 80)]
    body = ['<main class="pg page-sobre">']
    body.append('<section class="about-hero" id="aboutHero"><div class="slot" id="slot"><div class="big" id="big">'
                f'<img src="{src(hero["img"])}" alt="Darius Bougerol" width="1455" height="1091" decoding="async" fetchpriority="high">'
                '</div></div><div class="scrollcue" id="cue" aria-hidden="true"><span>Scroll</span><i></i></div></section>')
    body.append('<div class="blk">')
    body.append(tx_block(t1, 'tx', 111))
    body.append('<div class="lines sp rv" %s></div>' % sp(47))
    body.append('<h2 class="tx mc sp rv" style="--mt:%s;font-weight:400;--fs:1;--lh:1.28">Marcas que han confiado en mí.</h2>' % rem(44))
    body.append('<div class="brands sp" %s>' % sp(43))
    for k, name, w in logos:
        body.append('<div class="card rv"><img src="assets/img/logo-%s.png" alt="%s" style="--lw:%d%%" loading="lazy" decoding="async"></div>' % (k, esc(name), w))
    body.append('</div>')
    body.append('<div class="lines sp rv" %s></div>' % sp(73))
    body.append('<div class="trio sp" %s>' % sp(73))
    for i, it in enumerate(trio):
        body.append(photo(it['img'], 455, 607, 5, 'retratos-sobre', i, 'Retrato en blanco y negro', filt='bw'))
    body.append('</div>')
    body.append(tx_block(t2, 'tx', 143))
    body.append('<div class="sp" %s>%s</div>' % (sp(100), photo(huawei['img'], 1455, 1064, 5, 'huawei', 0, 'Huawei', kind='hero')))
    body.append(tx_block(t3, 'tx', 99))
    body.append('</div>')
    body.append(footer())
    body.append('</main>')
    write(pg, '\n'.join(body), ('gallery', 'stack', 'about'))


# --------------------------------------------------------------------------
# Contacto
# --------------------------------------------------------------------------
def build_contacto():
    pg = Page('contacto.html', 'contacto', 'Contacto · Darius Bougerol', 'contacto',
              desc='Contacta con Darius Bougerol: WhatsApp, Instagram, LinkedIn, correo y teléfono.')
    body = ['<main class="pg page-contacto">',
            f'''<div class="blk"><div class="contact-pills sp" {sp(288)}>
<a class="pill rv" href="{URL['tel']}"><i class="hl"></i><span>Tel: +34 615 538 455</span></a>
<a class="pill rv" href="{URL['mail']}"><i class="hl"></i><span>Mail: dariusbougerol@gmail.com</span></a>
<a class="pill rv" href="{URL['insta']}" target="_blank" rel="noopener"><i class="hl"></i><span>Instagram: Ithe_6</span></a>
</div></div>''',
            '<div class="icons-m" aria-label="Redes">'
            f'<a class="pill" href="{URL["wa"]}" target="_blank" rel="noopener" aria-label="WhatsApp"><img src="assets/img/eba7bc9935e3.png" alt="" width="81" height="81"></a>'
            f'<a class="pill" href="{URL["insta"]}" target="_blank" rel="noopener" aria-label="Instagram"><img src="assets/img/62410073702e.png" alt="" width="88" height="88"></a>'
            f'<a class="pill" href="{URL["linked"]}" target="_blank" rel="noopener" aria-label="LinkedIn"><img src="assets/img/6938ffaf65d5.png" alt="" width="89" height="89"></a></div>',
            footer(), '</main>']
    write(pg, '\n'.join(body), ())


# --------------------------------------------------------------------------
# Inicio
# --------------------------------------------------------------------------
def build_home():
    pg = Page('index.html', 'home', 'Darius Bougerol · Fotografía y vídeo', 'home',
              desc='Darius Bougerol · fotógrafo y videógrafo en Granada.')
    R = C['retrato']; K = C['comercial']; D = C['documental']; E = C['eventos']

    def land(page, skip, n=3):
        its = [it for b in C[page] if b['kind'] == 'gallery' for col in b['cols'] for it in col]
        its = [i for i in its if i['img'] not in skip]
        its.sort(key=lambda i: -(i['w'] / i['h']))
        seen, out = set(), []
        for i in its:
            if i['img'] not in seen:
                seen.add(i['img']); out.append(i['img'])
            if len(out) >= n: break
        return out

    A = [
        ('Retrato', 'retrato.html', [(R[1]['img'], 'retrato.html#retratos'), (R[3]['img'], 'retrato.html#retratos')]),
        ('Comercial', 'comercial.html', [(K[1]['img'], 'comercial.html#hosteleria'), (K[4]['img'], 'comercial.html#masaje'),
                                         (K[7]['img'], 'comercial.html#producto')]),
        ('Documental', 'documental.html', [(D[0]['img'], 'documental.html')]),
        ('Eventos', 'eventos.html', [(E[1]['img'], 'eventos.html#fiestas-noche'), (E[4]['img'], 'eventos.html#fiestas-dia'),
                                     (E[7]['img'], 'eventos.html#graduaciones'), (E[10]['img'], 'eventos.html#otros')]),
        ('Vídeo', 'video.html', None),
    ]
    used = {R[1]['img'], R[3]['img'], K[1]['img'], K[4]['img'], K[7]['img'], D[0]['img'], E[1]['img'], E[4]['img'], E[7]['img'], E[10]['img']}
    B = [
        ('Retrato', 'retrato.html', [(i, 'retrato.html#retratos') for i in land('retrato', used)]),
        ('Comercial', 'comercial.html', [(i, 'comercial.html') for i in land('comercial', used)]),
        ('Documental', 'documental.html', [(i, 'documental.html') for i in land('documental', used)]),
        ('Eventos', 'eventos.html', [(i, 'eventos.html') for i in land('eventos', used)]),
        ('Vídeo', 'video.html', 'b'),
    ]
    sl = []
    for n, (name, href, imgs) in enumerate(A + B):
        if isinstance(imgs, list):
            inner = ''.join('<div class="sl%s" data-href="%s"><img src="%s" alt="" decoding="async"%s></div>'
                            % (' on' if j == 0 else '', h, src(im), '' if n == 0 else ' loading="lazy"') for j, (im, h) in enumerate(imgs))
        else:
            clips = ('epico', 'loser') if imgs is None else ('airbnb', 'starwars')
            inner = ''.join('<div class="sl%s" data-href="video.html%s"><video src="assets/video/%s.mp4" poster="assets/video/%s.jpg" '
                            'muted loop playsinline preload="metadata"></video></div>'
                            % (' on' if j == 0 else '', '#spot' if c == 'airbnb' else '', c, c) for j, c in enumerate(clips))
        sl.append(f'<a class="slide" href="{href}" data-name="{name}" aria-label="{name}">{inner}</a>')
    labels = ''.join('<span>%s</span>' % s[0] for s in A)
    body = f'''<main class="home" id="home">
<div class="ringwrap" id="ringwrap"><div class="ring" id="ring">
{chr(10).join(sl)}
</div></div>
<div class="logo-intro" id="logoIntro"><img class="lg-cream" src="assets/img/fc7e46a07f02.png" alt="" width="643" height="406"><img class="lg-dark" src="assets/img/b65746082939.png" alt="" width="642" height="409"></div>
<div class="homeui" id="homeui">
<div class="label" id="label" aria-live="polite">{labels}</div>
<div class="count" id="count">01 / 05</div>
<a class="enter" id="enter" href="sobre-mi.html?entrar=1">Entrar</a>
</div>
</main>'''
    write(pg, body, ('home',), mode='home')


if __name__ == '__main__':
    build_home()
    build_sobre()
    build_retrato()
    build_comercial()
    build_documental()
    build_eventos()
    build_video()
    build_contacto()
