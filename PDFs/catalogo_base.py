#!/usr/bin/env python3
"""
Base compartilhada dos catálogos PDF do Noiva Joias MT.

Reúne o que é COMUM a todos os catálogos: identidade visual (vem do template
HTML), montagem de card/página, montagem do HTML final, download de imagem e a
geração do PDF com as travas de validação.

Os scripts de categoria (`build_catalog_*.py`) importam isto e cuida só do que
é específico delas: parsing dos produtos e o texto da página de fechamento.

    from catalogo_base import (...)

Regra de ouro: o `CSS_AJUSTES` mora AQUI e só aqui. O clipping do template
(4 slots não cabem na folha) já custou um catálogo publicado — se cada script
tivesse sua própria cópia do fix, em breve um deles ficaria para trás.
"""

import base64
import html as htmllib
import re
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

# ---------------------------------------------------------------- identidade
CONFIG = {
    'empresa': 'Noiva Joias MT',
    'telefone': '(65) 9294-2810',
    'cnpj': '31.186.957/0001-06',
    'cidades': 'Cuiabá · Rondonópolis · Sinop',
    'site': 'noivajoiasmt.com.br',
}

# ---------------------------------------------------------------- CSS
# Correção do clipping: com 4 slots por página o card não cabia na folha e o
# `.page{overflow:hidden}` cortava o rodapé dos produtos em silêncio.
# Não muda o grid (continua 2 col x 4 slots) nem a foto (segue 10/9 = 88,2mm).
CSS_AJUSTES = """
  /* ====== ajustes de altura ====== */
  /* .page-inner precisa ocupar a folha: sem isso o flex:1 do grid/sr-fernandes
     nao tem sobra para distribuir e o rodape sobe (metade da pagina ficava vazia) */
  .page-inner{flex:1;min-height:0}
  .cat-grid{gap:0.8mm;padding-top:0.3mm;grid-template-rows:repeat(2,minmax(0,1fr))}
  /* 1/1 + contain: as fotos do Elite 18K sao 1000x1000. Com object-fit:cover
     numa caixa 10/9 o navegador cortava as laterais e a BORDA PRETA da foto
     sumia — parecia que ainda havia moldura branca. contain mostra a foto
     inteira e o preto da borda aparece. */
  .prod-img-wrap{aspect-ratio:1/1;background:var(--bg)}
  .prod-img{object-fit:contain}
  .prod-name{font-size:clamp(11px,1.8vw,17px);line-height:1.05}
  .prod-price{font-size:clamp(17px,2.4vw,23px)}
  .prod-price-label{font-size:7.5px;line-height:1.1}
  .prod-installments{font-size:8px;line-height:1.1}
  .prod-tag{font-size:7px;padding:0.3px 2px}
  .pg-footer{padding-top:2px}

  /* ====== como pedir (3 passos) ====== */
  .howto{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:4mm}
  .howto-step{
    border:1px solid var(--line);border-radius:var(--r-lg);
    background:linear-gradient(170deg,rgba(201,167,91,.10) 0%,rgba(20,17,16,.9) 65%);
    padding:4mm 3.5mm;display:flex;flex-direction:column;gap:1.5mm;
  }
  .howto-n{
    width:20px;height:20px;border-radius:999px;flex:0 0 20px;
    display:flex;align-items:center;justify-content:center;
    background:var(--gold-grad);color:#0b0907;
    font-family:Arial,sans-serif;font-size:11px;font-weight:700;
  }
  .howto-t{
    font-family:Arial,sans-serif;font-size:11.5px;font-weight:700;
    color:var(--cream);letter-spacing:.05em;text-transform:uppercase;line-height:1.25;
  }
  .howto-p{font-family:Arial,sans-serif;font-size:11px;line-height:1.45;color:var(--muted);margin:0}

  /* ====== CTA final ====== */
  .cta-final{
    margin-top:4mm;padding:4mm;
    border:1px solid var(--line);border-radius:var(--r-lg);
    background:linear-gradient(120deg,rgba(201,167,91,.14) 0%,rgba(20,17,16,.94) 60%);
    display:flex;align-items:center;gap:5mm;
  }
  .cta-final-txt{flex:1;display:flex;flex-direction:column;gap:1mm}
  .cta-final-t{font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:var(--cream);letter-spacing:.04em;text-transform:uppercase}
  .cta-final-p{font-family:Arial,sans-serif;font-size:11px;line-height:1.45;color:var(--muted);margin:0}
  .cta-final-phone{
    font-family:var(--font-display);font-size:26px;font-weight:700;
    color:var(--gold);letter-spacing:.04em;white-space:nowrap;
  }

  /* ====== pagina de fechamento: tipografia maior (pagina de texto) ====== */
  .sr-fernandes{align-items:center;gap:6mm}
  .sr-fernandes-img{flex:0 0 30mm}
  .sr-photo{width:27mm;height:27mm}
  .sr-fernandes-text{gap:4mm}
  .sr-name{font-size:18px;margin-bottom:1mm}
  .sr-msg{font-size:12px;line-height:1.55}
  .sr-pricing li{font-size:12px;margin:1.5mm 0}
  .sr-highlight{font-size:13px;line-height:1.5;margin:3mm 0}
"""


# ---------------------------------------------------------------- texto
def esc(t):
    return htmllib.escape(str(t), quote=True)


def brl(v):
    return 'R$ ' + ('%.2f' % v).replace('.', ',')


def parcelas_txt(preco, n):
    """Mesma conta do index.html: parcela arredondada PARA BAIXO, em centavos.

    489.99 / 2 = 244,995 -> 2x de R$ 244,99  (nunca R$ 245,00, que passa do valor)
    """
    if n <= 1:
        return None
    return '%dx de %s sem juros' % (n, brl(int(preco / n * 100) / 100))


# ---------------------------------------------------------------- imagem
def download_webp(url, out_path, size=1000):
    """Baixa a imagem e normaliza para webp quadrado opaco (1000x1000, q90)."""
    out_path = Path(out_path)
    if not out_path.exists():
        req = urllib.request.Request(url)
        req.add_header('User-Agent',
                       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        img = Image.open(BytesIO(data))
        if img.mode in ('RGBA', 'LA', 'P'):
            # fundo opaco: o preto do catalogo
            img = img.convert('RGBA')
            bg = Image.new('RGB', img.size, (11, 9, 7))
            bg.paste(img, mask=img.split()[-1])
            img = bg
        else:
            img = img.convert('RGB')
        img = img.resize((size, size), Image.LANCZOS)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(out_path, 'WEBP', quality=90)
    return out_path


def img_to_base64(path):
    with open(path, 'rb') as f:
        return 'data:image/webp;base64,' + base64.b64encode(f.read()).decode('ascii')


def img_to_data_uri(path):
    """MIME detectado pelo cabecalho — para quem nao e webp (jpg/png)."""
    path = Path(path)
    mime = ('image/jpeg' if path.suffix.lower() in ('.jpg', '.jpeg')
            else 'image/png' if path.suffix.lower() == '.png' else 'image/webp')
    with open(path, 'rb') as f:
        return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode('ascii'))


# ---------------------------------------------------------------- blocos
def build_card(p, badge=None, obs=None, parcelas=2, payment_label=None):
    img = (
        '<div class="prod-img-wrap">'
        '<img class="prod-img" src="%s" alt="%s">%s'
        '</div>'
    ) % (p['imagem'], esc(p['nome']),
         '<span class="prod-badge">%s</span>' % esc(badge) if badge else '')

    parc = parcelas_txt(p['preco'], parcelas)

    linhas = ['        <div class="prod">', img]
    linhas.append('          <p class="prod-name">%s</p>' % esc(p['nome']))
    linhas.append('          <p class="prod-price gold-text">%s</p>' % brl(p['preco']))
    if parc:
        linhas.append('          <p class="prod-price-label">%s</p>' % esc(parc))
    if payment_label is None:
        payment_label = 'à vista · pagamento na entrega'
    linhas.append('          <p class="prod-price-label">%s</p>' % esc(payment_label))
    if obs:
        linhas.append('          <p class="prod-installments"><b>OBS:</b> %s</p>' % esc(obs))
    linhas.append('          <p class="prod-tags">%s</p>'
                  % ' '.join('<span class="prod-tag">%s</span>' % esc(t) for t in p.get('tags', [])))
    linhas.append('        </div>')
    return '\n'.join(linhas)


def build_banner(tag, titulo_html, texto_html):
    """Slot informativo que ocupa um lugar do grid."""
    return (
        '        <div class="info-banner">'
        '<svg class="info-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        '<path d="M12 3.2 21 19H3L12 3.2Z"/><path d="M12 10v4"/><path d="M12 16.8h.01"/></svg>'
        '<p class="info-banner-tag">%s</p>'
        '<p class="info-banner-h">%s</p>'
        '<p class="info-banner-p">%s</p>'
        '</div>'
    ) % (esc(tag), titulo_html, texto_html)


def paginas_de(produtos, cards, por_pagina=4):
    """Quebra a lista de cards em paginas de `por_pagina` slots."""
    return [cards[i:i + por_pagina] for i in range(0, len(cards), por_pagina)]


FOOTER = '''      <div class="pg-footer">
        <span><strong>%s</strong> · CNPJ %s</span>
        <span>%s</span>
      </div>''' % (CONFIG['empresa'], CONFIG['cnpj'], CONFIG['cidades'])

FOOTER_ENTREGA = '''      <div class="pg-footer">
        <span><strong>%s</strong> · CNPJ %s</span>
        <span>Entrega hoje · %s</span>
      </div>''' % (CONFIG['empresa'], CONFIG['cnpj'], CONFIG['cidades'])


def build_page_produtos(num, rotulo, cards, rodape=None):
    return '''  <!-- ==================== PÁGINA %d — %s ==================== -->
  <div class="page">
    <div class="page-inner">
      <div class="pg-header">
        <span class="pg-header-brand">%s</span>
        <span class="pg-header-section">%s</span>
        <span class="pg-header-phone">%s</span>
      </div>

      <div class="cat-grid">
%s
      </div>

%s
    </div>
  </div>''' % (num, esc(rotulo), CONFIG['empresa'], esc(rotulo), CONFIG['telefone'],
               '\n\n'.join(cards), rodape or FOOTER)


def build_howto(passos):
    cards = []
    for i, (titulo, texto) in enumerate(passos, 1):
        cards.append(
            '        <div class="howto-step">\n'
            '          <span class="howto-n">%d</span>\n'
            '          <p class="howto-t">%s</p>\n'
            '          <p class="howto-p">%s</p>\n'
            '        </div>' % (i, esc(titulo), esc(texto))
        )
    return '      <div class="howto">\n%s\n      </div>' % '\n'.join(cards)


def build_cta_final(subtitulo):
    return '''      <div class="cta-final">
        <div class="cta-final-txt">
          <p class="cta-final-t">%s</p>
          <p class="cta-final-p">CNPJ %s · %s · %s</p>
        </div>
        <p class="cta-final-phone gold-text">%s</p>
      </div>''' % (CONFIG['empresa'], CONFIG['cnpj'], CONFIG['cidades'],
                   CONFIG['site'], CONFIG['telefone'])


# ---------------------------------------------------------------- montagem
def build_html(paginas_html, output_html, template_html, titulo):
    """Monta o HTML final a partir do template, aplicando o CSS_AJUSTES."""
    template = Path(template_html).read_text(encoding='utf-8')

    template = re.sub(
        r'(<div class="pages">).*?(</div>\s*</body>)',
        lambda m: m.group(1) + '\n\n' + '\n\n'.join(paginas_html) + '\n\n  ' + m.group(2),
        template,
        flags=re.DOTALL,
    )
    template = re.sub(r'<title>.*?</title>', '<title>%s</title>' % esc(titulo),
                      template, flags=re.DOTALL)

    # o template traz o CSS do Sr. Fernandes FORA do <style> (empurrava o resto
    # para fora da folha). Move para dentro.
    m = re.search(r'\n(/\* ====== Sr\. Fernandes page ====== \*/.*?)\n</style>', template, re.S)
    if m:
        bloco = m.group(1)
        template = template.replace('\n' + bloco + '\n</style>', '\n</style>')
        template = template.replace('</style>', '\n' + bloco + '\n</style>')

    if template.count('<style>') != 1 or template.count('</style>') != 1:
        raise SystemExit('HTML ficou com <style>/</style> desbalanceado')

    # vem DEPOIS do CSS do template, entao sobrescreve
    template = template.replace('</style>', CSS_AJUSTES + '\n</style>')

    Path(output_html).write_text(template, encoding='utf-8')
    print('HTML: %s' % Path(output_html).name)


def build_pdf(html_path, output_pdf):
    """Gera o PDF. FALHA se quebrar imagem, ter erro de console ou cortar conteudo."""
    from playwright.sync_api import sync_playwright
    from PyPDF2 import PdfReader

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 794, 'height': 1123})
        erros = []
        page.on('console', lambda m: erros.append('console.%s: %s' % (m.type, m.text))
                if m.type == 'error' else None)
        page.on('pageerror', lambda e: erros.append('pageerror: %s' % e))

        page.goto(Path(html_path).resolve().as_uri())
        page.emulate_media(media='print')
        page.wait_for_load_state('networkidle')
        page.wait_for_function(
            'Array.from(document.images).every(i => i.complete && i.naturalWidth > 0)',
            timeout=120000)

        quebradas = page.evaluate(
            'Array.from(document.images).filter(i => i.naturalWidth === 0).map(i => i.src.slice(0,90))')
        if quebradas:
            raise SystemExit('IMAGENS QUEBRADAS:\n  ' + '\n  '.join(quebradas))

        # o .page tem overflow:hidden, entao estourar a folha = corte silencioso
        estouro = page.evaluate('''() => {
          const r = [];
          document.querySelectorAll('.page').forEach((el, i) => {
            const inner = el.querySelector('.page-inner');
            const of = inner.scrollHeight - inner.clientHeight;
            if (of > 1) r.push(`pagina ${i + 1} estoura ${of}px`);
            el.querySelectorAll('.prod').forEach(c => {
              const co = c.scrollHeight - c.clientHeight;
              if (co > 1) {
                const name = (c.querySelector('.prod-name') || {}).textContent || '?';
                r.push(`pagina ${i + 1} card "${name}" estoura ${co}px`);
              }
            });
          });
          return r;
        }''')
        if estouro:
            raise SystemExit('CONTEUDO CORTADO (reduza imagem/fonte):\n  ' + '\n  '.join(estouro))

        page.pdf(
            path=str(output_pdf),
            width='210mm', height='297mm',
            margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'},
            print_background=True,
        )
        browser.close()

    if erros:
        raise SystemExit('ERROS NO CONSOLE:\n  ' + '\n  '.join(erros))

    r = PdfReader(str(output_pdf))
    print('PDF: %s' % Path(output_pdf).name)
    print('Paginas: %d' % len(r.pages))
    print('Tamanho: %.1f MB' % (Path(output_pdf).stat().st_size / 1024 / 1024))
    return r