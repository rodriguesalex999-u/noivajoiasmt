#!/usr/bin/env python3
"""
Build do catalogo PDF de Solitarios (Cor Dourada + Cor Prata).

FONTE UNICA DE DADOS: as 2 colecoes de solitarios no index.html do site.
Este script apenas LE o index.html — nunca escreve nele. Mudar preco, foto ou
nome no site e rodar de novo atualiza o PDF.

Layout (identico aos outros catalogos): A4 exato, 2 colunas x 2 slots por pagina.
As paginas de produto sao paginadas por contagem (4 slots), na ordem douradas
depois prata — com 11 + 3 = 14 isso fecha em 3 paginas cheias e uma ultima com
2 cards, cujos slots vazios entram banners informativos. A ultima pagina e
sempre a do Sr. Fernandes.

A identidade visual e as travas de validacao moram em `catalogo_base.py`.

Uso:
    python PDFs/build_catalog_solitarios.py
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from catalogo_base import (  # noqa: E402
    CONFIG, build_banner, build_card, build_cta_final, build_howto, build_html,
    build_page_produtos, build_pdf, FOOTER_ENTREGA,
)

PROJETO = Path(__file__).resolve().parent.parent
INDEX_HTML = PROJETO / 'index.html'
BASE = Path(__file__).resolve().parent
TEMPLATE_HTML = BASE / 'catalogo-aliancas-prata-r2.html'
OUTPUT_HTML = BASE / 'catalogo-aliancas-solitarioeaparadores.html'
OUTPUT_PDF = BASE / 'Noiva-Joias-MT-Catalogo-Solitario-e-Aparadores-v1.pdf'

# (nome da colecao no index.html, rotulo do cabecalho da pagina)
SECOES = [
    ('Solitários Cor Dourada', 'Solitários Cor Dourada'),
    ('Solitários Cor Prata', 'Solitários Cor Prata'),
]

ESPERADO = {'Solitários Cor Dourada': 11, 'Solitários Cor Prata': 3}

SLOTS_PAGINA = 4

R2 = 'https://pub-30377154a86f42f9be74defe556d3deb.r2.dev/'
SR_FERNANDES = R2 + 'sr-fernandes.webp'

# a capa da colecao no site e o Brilho Intenso -> ele leva o selo "Destaque"
DESTAQUE = 'solitario-dourada-anel-solitario-brilho-intenso-cor-dourada-1.webp'

# os dois aneis de R$ 99,99 (pedra cristal, cor dourada e cor prata) sao os mais
# vendidos: levam o selo em vez de "Opcional". Mesma regra da story.
MAIS_VENDIDOS = {
    'solitario-dourada-anel-solitario-cor-dourada-pedra-cristal-1.webp',
    'solitario-prata-anel-solitario-cor-prata-pedra-cor-cristal.webp',
}

# o aviso do site: solitario nao tem garantia. Vai em TODO card.
OBS = {
    'Solitários Cor Dourada': 'anel na cor dourada não tem garantia · a aliança tem 3 meses · compre se quiser · é opcional',
    'Solitários Cor Prata': 'anel na cor prata não tem garantia · a aliança tem 3 meses · compre se quiser · é opcional',
}

# o aparador nao e um anel: o aviso dele e proprio (nao acompanha alianca).
OBS_APARADOR = 'aparador banhado a ouro · não acompanha aliança · a aliança é vendida separada'

# Banners que fecham os slots vazios da ultima pagina de produtos
# (14 produtos = 3 paginas cheias + 2 cards). Mesmo componente da moeda antiga.
BANNERS = [
    build_banner(
        'Antes de comprar',
        'O solitário <strong class="gold-text">não tem garantia</strong>',
        'O anel solitário — tanto na cor dourada quanto na cor prata — é <b>sem '
        'garantia</b>, e é por isso que ele sai nesse valor acessível. '
        '<b>Compre se quiser: é opcional</b>. O que tem garantia são 3 meses, do '
        '<b>par de aliança</b>.'
    ),
    build_banner(
        'Entrega',
        'Entrega <strong class="gold-text">hoje</strong> na sua cidade',
        'Cuiabá, Rondonópolis e Sinop: o entregador leva o anel até você, você '
        'experimenta, escolhe a numeração e <b>só então paga</b>. Outras cidades: '
        'envio pelos Correios.'
    ),
    build_banner(
        'Numeração',
        'Todas as numerações <strong class="gold-text">à pronta</strong>',
        'Todas as numerações vão à pronta para entrega. É só mandar seu endereço '
        'no WhatsApp que o entregador leva para você experimentar e escolher na '
        'mão — sem risco de tamanho errado.'
    ),
]

PASSOS = [
    ('Escolha o modelo', 'Veja as fotos deste catálogo e anote o nome do solitário que você gostou.'),
    ('Fale no WhatsApp', 'Mande o nome do modelo e a sua cidade. Você fala direto com uma pessoa de verdade — sem robô e sem fila de espera.'),
    ('Receba e pague', 'Entrega hoje na sua cidade. Você confere o anel na mão e só então paga.'),
]


# ---------------------------------------------------------------- extracao
def extrair_colecao(texto, nome_colecao):
    """Pega o array `itens` da colecao pedida dentro do objeto COLECOES."""
    alvo = "nome: '%s'" % nome_colecao
    i = texto.find(alvo)
    if i < 0:
        raise SystemExit('Colecao nao encontrada no index.html: %s' % nome_colecao)

    j = texto.find('itens: [', i)
    if j < 0:
        raise SystemExit('itens: [ nao encontrado em %s' % nome_colecao)
    k = texto.find('\n    ]\n', j)
    if k < 0:
        raise SystemExit('fechamento de itens nao encontrado em %s' % nome_colecao)
    bloco = texto[j:k]

    itens = []
    for bruto in re.split(r'\n\s*\{\n', bloco)[1:]:
        bruto = bruto.rstrip().rstrip('}').rstrip()

        def um(re_grp, default=''):
            m = re.search(re_grp, bruto)
            return m.group(1) if m else default

        itens.append({
            'nome': um(r"nome:\s*'([^']*)'"),
            'preco': float(um(r'preco:\s*([\d.]+)', '0')),
            'parcelas': int(um(r'parcelas:\s*(\d+)', '1')),
            'imagem': um(r"imagem:\s*'([^']*)'"),
            'tags': re.findall(r"'([^']*)'",
                               re.search(r'tags:\s*\[(.*?)\]', bruto, re.S).group(1)),
        })
    return itens


# ---------------------------------------------------------------- paginas
def build_pages():
    texto = INDEX_HTML.read_text(encoding='utf-8')

    dourada = extrair_colecao(texto, SECOES[0][0])
    prata = extrair_colecao(texto, SECOES[1][0])
    for nome, itens in ((SECOES[0][0], dourada), (SECOES[1][0], prata)):
        if len(itens) != ESPERADO[nome]:
            raise SystemExit('Esperava %d itens em "%s", veio %d — index.html mudou?'
                             % (ESPERADO[nome], nome, len(itens)))
    print('Extraido: %d Cor Dourada + %d Cor Prata = %d produtos'
          % (len(dourada), len(prata), len(dourada) + len(prata)))

    # douradas primeiro, pratas depois: os cards sao paginados na ordem, sem
    # buraco. Com 11 + 3 = 14 fecha em 3 paginas cheias de 4 + 1 com 2 cards.
    ordem = ([(p, SECOES[0][0]) for p in dourada]
             + [(p, SECOES[1][0]) for p in prata])
    cards = [build_card(p,
                        badge=('Destaque' if DESTAQUE in p['imagem']
                               else 'Mais vendido'
                               if p['imagem'].rsplit('/', 1)[-1] in MAIS_VENDIDOS
                               else 'Opcional'),
                        obs=(OBS_APARADOR if 'Aparador' in p['nome']
                             else OBS[colecao]),
                        parcelas=p['parcelas'])
             for p, colecao in ordem]

    # o rotulo do cabecalho acompanha o que caiu na pagina
    paginas = []
    for k in range(0, len(ordem), SLOTS_PAGINA):
        trecho = ordem[k:k + SLOTS_PAGINA]
        misto = SECOES[1][0] in {c for _, c in trecho}
        rotulo = 'Solitários Cor Dourada e Prata' if misto else SECOES[0][1]
        cards_pagina = cards[k:k + SLOTS_PAGINA]
        # slots que sobraram na ultima pagina entram banners (nada de pagina
        # com 3 buracos)
        for banner in BANNERS[:SLOTS_PAGINA - len(cards_pagina)]:
            cards_pagina.append(banner)
        paginas.append(build_page_produtos(len(paginas) + 1, rotulo,
                                          cards_pagina))

    paginas.append(build_page_sr())
    return paginas


def build_page_sr():
    return '''  <!-- ==================== PÁGINA 4 — Sr. Fernandes ==================== -->
  <div class="page">
    <div class="page-inner">
      <div class="pg-header">
        <span class="pg-header-brand">%(empresa)s</span>
        <span class="pg-header-section">Atendimento Personalizado</span>
        <span class="pg-header-phone">%(telefone)s</span>
      </div>

      <div class="sr-fernandes">
        <div class="sr-fernandes-img">
          <img class="sr-photo" src="%(img)s" alt="Sr. Fernandes — Noiva Joias MT">
        </div>
        <div class="sr-fernandes-text">
          <p class="sr-name">Sr. Fernandes e nossa equipe</p>
          <p class="sr-msg gold-text">Entregamos o anel na sua casa hoje e você só paga no momento da entrega. Você não precisa pagar nada adiantado.</p>
          <p class="sr-msg">Todos os solitários vão à pronta para entrega, em dois acabamentos: <b>cor dourada</b> e <b>cor prata</b>. Você escolhe o modelo, a numeração e pode trocar se não servir. É opcional para qualquer modelo de aliança.</p>
          <ul class="sr-pricing">
            <li><strong>Solitários cor dourada:</strong> R$ 249,99 — 2x de R$ 124,99</li>
            <li><strong>Solitários cor prata:</strong> R$ 249,99 — 2x de R$ 124,99</li>
            <li><strong>Solitário pedra cristal:</strong> R$ 99,99 — nos dois acabamentos (cor dourada e cor prata)</li>
          </ul>
          <p class="sr-highlight gold-text">Venda feita presencialmente — como se você estivesse na loja física. Você toca, experimenta e escolhe pessoalmente. Não cabe artigo 49 pois a entrega é feita na sua casa e o pagamento só ao receber. A escrita abaixo já nos ampara legalmente, ao mesmo tempo que você sente a segurança de uma compra realmente presencial.</p>
          <p class="sr-msg"><b>Sobre a garantia:</b> o <b>par de aliança tem garantia normal de 3 meses</b>. Já o anel solitário, tanto na cor dourada quanto na cor prata, é <b>sem garantia</b> — e é exatamente por isso que ele sai nesse valor acessível. <b>Compre se quiser: é opcional</b>, ninguém é obrigado a comprar. E se você levar, é levando ciente do que está comprando: pode durar vários anos, como também pode não durar. Prefira comprar sabendo disso a comprar esperando uma garantia que não existe. O que tem garantia é o atendimento: você vê, experimenta e escolhe antes de pagar.</p>
          <p class="sr-msg">Todas as numerações estão à pronta para entrega! É só nos encaminhar pelo WhatsApp com seu endereço que nossos entregadores levam para você experimentar, escolher e levar no mesmo dia.</p>
        </div>
      </div>

%(howto)s

%(cta)s

%(rodape)s
    </div>
  </div>''' % {
        'empresa': CONFIG['empresa'],
        'telefone': CONFIG['telefone'],
        'img': SR_FERNANDES,
        'howto': build_howto(PASSOS),
        'cta': build_cta_final(''),
        'rodape': FOOTER_ENTREGA,
    }


def main():
    print('=== Build Catalogo Solitarios e Aparadores ===\n')

    print('--- Build HTML ---')
    paginas = build_pages()
    build_html(paginas, OUTPUT_HTML, TEMPLATE_HTML,
               '%s — Catálogo Solitários e Aparadores' % CONFIG['empresa'])

    print('\n--- Build PDF ---')
    build_pdf(OUTPUT_HTML, OUTPUT_PDF)
    print('\n=== Concluido ===')


if __name__ == '__main__':
    main()