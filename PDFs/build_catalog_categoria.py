#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build do catálogo HTML de uma categoria do fornecedor Elite 18K.

Fonte: PRODUTOS_COMPRADOS_Valdicleia.md (a categoria escolhida).
Regras do dono:
  - preço de venda = valor pago ao fornecedor + 300%
  - só a PRIMEIRA foto de cada produto (-1.webp)
  - identidade visual = template canônico (catalogo_base.py)
  - cada categoria tem SÓ o que é dela (sem kit/sem mistura)
  - por enquanto só HTML (PDF só depois que o dono aprovar)

A categoria CORRENTE NÃO aparece em INFO de propósito (12/10/2026): o dono
aprovou 3 categorias e corrente foi para dentro de KITS. Para rebuild da KITS
use build_catalog_kits_corrente.py.

Uso:
    python build_catalog_categoria.py PULSEIRA
    python build_catalog_categoria.py PINGENTE
"""
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from catalogo_base import (  # noqa: E402
    CONFIG, build_card, build_cta_final, build_howto, build_html,
    build_page_produtos, FOOTER,
)

FONTE = Path(r"C:\Users\rodri\OneDrive\Documents\0-FUNCIONARIOS-DE-IA"
             r"\BRUNO-CADASTRO-PRODUTOS\SITE FORNECEDOR\ELITE 18K"
             r"\PRODUTOS_COMPRADOS_Valdicleia.md")
TEMPLATE_HTML = HERE / "catalogo-aliancas-prata-r2.html"

R2 = "https://pub-30377154a86f42f9be74defe556d3deb.r2.dev/elite18k/"
MARGEM = 3.0          # +300%
SLOTS_PAGINA = 4
# Sufixo das fotos no R2. 12/10/2026: as fotos foram republicadas com borda
# preta (publicar_fotos_v2.py) e as chaves antigas foram apagadas — por isso o
# build tem de pedir a versao nova, senao aponta para arquivo que nao existe mais.
SUFIXO_FOTO = "-v3"

# rótulo e nome de arquivo por categoria
# CORRENTE ausente de propósito: entra na KITS (ver docstring).
INFO = {
    "PULSEIRA":         ("Pulseiras Masculinas 18K", "catalogo-pulseira-masculina"),
    "PINGENTE":         ("Pingentes Masculinos 18K", "catalogo-pingente-masculino"),
}
# chave de busca no header do markdown (por categoria)
BUSCA = {c: (info[2] if len(info) > 2 else c) for c, info in INFO.items()}


def _sem_acento(t):
    t = unicodedata.normalize("NFKD", t)
    return "".join(c for c in t if not unicodedata.combining(c))


def slug(t):
    t = _sem_acento(t).upper()
    return re.sub(r"[^A-Z0-9]+", "-", t).strip("-")[:80]


def extrair_categoria(texto, categoria, aplicar_ajustes=True):
    """Pega os produtos do bloco '## CATEGORIA <categoria>' (aceita ' (n)').
    A busca casa pelo prefixo BUSCA[categoria] antes do ' (' — robusto a
    headers tipo 'KITS (CONJUNTOS) (14)'.

    aplicar_ajustes: roda ajustes_elite18k.aplicar (arredondamento, troca,
    remoção e inclusões pedidas pelo dono). Passar False devolve a lista crua
    da fonte — útil para conferir a fonte sem a camada de comercial.
    """
    chave = BUSCA.get(categoria, categoria)
    # acha a linha do header e vai até o próximo '## CATEGORIA'
    linhas = texto.splitlines()
    ini = None
    for i, l in enumerate(linhas):
        if l.startswith("## CATEGORIA ") and l[len("## CATEGORIA "):].startswith(chave):
            ini = i + 1
            break
    if ini is None:
        raise SystemExit("Categoria não encontrada: %s" % categoria)
    fim = len(linhas)
    for j in range(ini, len(linhas)):
        if linhas[j].startswith("## CATEGORIA "):
            fim = j
            break
    bloco = "\n".join(linhas[ini:fim])
    produtos = []
    for tit, val in re.findall(
            r"\*\*TÍTULO:\*\* (.+?)\s*\n+\*\*VALOR:\*\* R\$ ([\d.,]+)", bloco):
        base = re.sub(r"[^A-Z0-9]+", "-",
                      "".join(c for c in _sem_acento(tit).upper()
                              if c.isalnum() or c == " ")).strip("-")[:80]
        valor = float(val.replace(".", "").replace(",", "."))
        produtos.append({"nome": tit.strip(), "custo": valor,
                         "preco": round(valor * MARGEM, 2),
                         "imagem": R2 + base + "-1" + SUFIXO_FOTO + ".webp"})

    if aplicar_ajustes:
        import ajustes_elite18k
        produtos = ajustes_elite18k.aplicar(produtos, categoria, slug, R2)
        produtos = ajustes_elite18k.aplicar_override_precos(produtos)
    return produtos


PAYMENT_LABEL_ELITE = 'Cuiabá/V.Grande: entrega+pagto | Correios: grátis ou R$44,99'

def build_pages(produtos, rotulo):
    cards = [build_card(p, parcelas=2, payment_label=PAYMENT_LABEL_ELITE) for p in produtos]
    paginas = []
    for k in range(0, len(cards), SLOTS_PAGINA):
        paginas.append(build_page_produtos(
            len(paginas) + 1, rotulo, cards[k:k + SLOTS_PAGINA], rodape=FOOTER))
    paginas.append(build_page_fechamento(produtos, rotulo))
    return paginas


def build_page_fechamento(produtos, rotulo):
    total = len(produtos)
    mais_barato = min(p["preco"] for p in produtos)
    passos = [
        ("Escolha a peça", "Veja as fotos deste catálogo e anote o nome do modelo que você gostou."),
        ("Fale no WhatsApp", "Mande o nome do modelo e a sua cidade. Você fala direto com uma pessoa de verdade — sem robô e sem fila de espera."),
        ("Receba e pague", "Entrega na sua cidade. Você confere a peça na mão e só então paga."),
    ]
    return '''  <!-- ==================== PÁGINA FINAL — Como pedir ==================== -->
  <div class="page">
    <div class="page-inner">
      <div class="pg-header">
        <span class="pg-header-brand">%s</span>
        <span class="pg-header-section">Como Pedir</span>
        <span class="pg-header-phone">%s</span>
      </div>

      <div class="sr-fernandes" style="align-items:flex-start">
        <div class="sr-fernandes-text" style="flex:1">
          <p class="sr-name">%s</p>
          <p class="sr-msg">%d peças banhadas a ouro 18K, à pronta entrega. Você escolhe pelo catálogo, manda no WhatsApp e recebe na sua cidade.</p>
          <p class="sr-highlight gold-text">A partir de %s — 2x sem juros no cartão.</p>
          <p class="sr-msg">Todas as peças são banhadas a ouro 18K. Confira a peça na mão no momento da entrega e só pague depois de aprovar.</p>
        </div>
      </div>

      %s

      %s

      %s
    </div>
  </div>''' % (
        CONFIG["empresa"], CONFIG["telefone"], rotulo, total,
        ("R$ %.2f" % mais_barato).replace(".", ","),
        build_howto(passos), build_cta_final(""),
        '''      <div class="pg-footer">
        <span><strong>%s</strong> · CNPJ %s</span>
        <span>%s</span>
      </div>''' % (CONFIG["empresa"], CONFIG["cnpj"], CONFIG["cidades"]),
    )


def main():
    if len(sys.argv) < 2:
        raise SystemExit("uso: python build_catalog_categoria.py <CATEGORIA>\n"
                         "categorias: " + ", ".join(INFO))
    categoria = sys.argv[1].strip()
    if categoria not in INFO:
        raise SystemExit("categoria inválida: %s (use uma de: %s)"
                         % (categoria, ", ".join(INFO)))
    rotulo, arq = INFO[categoria][0], INFO[categoria][1]
    output_html = HERE / (arq + ".html")

    print("=== Catálogo %s (HTML) ===\n" % rotulo)
    produtos = extrair_categoria(FONTE.read_text(encoding="utf-8"), categoria)
    print("Produtos na categoria %s: %d" % (categoria, len(produtos)))
    for p in produtos:
        print("  %-52s custo R$ %7.2f  ->  venda R$ %8.2f"
              % (p["nome"][:52], p["custo"], p["preco"]))

    paginas = build_pages(produtos, rotulo)
    build_html(paginas, output_html, TEMPLATE_HTML,
               "%s — Catálogo %s" % (CONFIG["empresa"], rotulo))
    print("\nPáginas: %d (%d produtos + fechamento)"
          % (len(paginas), len(produtos)))
    print("\n=== HTML gerado: %s (PDF só depois da sua aprovação) ==="
          % output_html.name)


if __name__ == "__main__":
    main()
