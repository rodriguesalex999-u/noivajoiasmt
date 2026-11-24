"""Prepara e publica as fotos de um produto novo (1 ou mais) e monta o bloco
pronto para colar no `index.html`.

Este script é o "caminho padrão" de foto de produto do projeto:
converte para 1000x1000 webp (q90) com a borda preta do catalogo, sobe no
Cloudflare R2 e devolve o bloco de codigo do produto ja preenchido.

    python scripts/preparar_fotos_produto.py \
        --colecao solitario-dourada \
        --slug anel-solitario-doce-coracao \
        --nome "Anel Solitario Doce Coracao Cor Dourada" \
        --preco 249.99 --parcelas 2 \
        --fotos "C:/Users/rodri/Downloads/a.png" "C:/Users/rodri/Downloads/b.png"

Opcoes:
    --sem-upload     so converte e mostra o bloco (nao mexe no R2)
    --descricao "..." --nota "..." --tags "A,B,C"
    --pasta "img/minha-pasta"   onde salvar localmente (padrao PDFs/img/<colecao>)

Regras que o script ja aplica (as mesmas dos catalogoes):
    • 1000x1000 px, webp qualidade 90 (padrao do catalogo)
    • branco (>=238 nos 3 canais) vira o preto do catalogo (11,9,7)
    • 4 px de borda preta reforcada (nada de franja clara)
    • a foto 1 e a capa (vai no campo `imagem`), a 2, a 3... vao no `fotos`
"""
import argparse
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
BUCKET = 'etevalda'
URL_PUBLICA = 'https://pub-30377154a86f42f9be74defe556d3deb.r2.dev'
PRETO = (11, 9, 7)
LIMIAR = 238
BORDA_PX = 4
TAMANHO = 1000


def slug(texto):
    """'Anel Solitario Doce Coracao' -> 'anel-solitario-doce-coracao'."""
    txt = ''.join(c if c.isalnum() else ' ' for c in texto.lower())
    return '-'.join(txt.split())


def converte(origem: Path, destino: Path, tratar_branco=True, encaixar=False) -> int:
    """1000x1000 webp q90, branco -> preto do catalogo, borda preta reforcada."""
    im = Image.open(origem)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        fundo = Image.new('RGB', im.size, PRETO)
        fundo.paste(im, mask=im.split()[-1])
        im = fundo
    else:
        im = im.convert('RGB')

    if tratar_branco:
        # 23/11/2026 (correcao de causa-raiz): o branco so vira preto quando e
        # FUNDO de catalogo (pixels claros ligados a borda da foto). Antes, TODO
        # pixel claro virava preto e deixava manchas pretas nos reflexos do
        # produto (cristais do relogio, manga de roupa clara, luz de fundo).
        px = im.load()
        w, h = im.size
        br = [[px[x, y][0] >= LIMIAR and px[x, y][1] >= LIMIAR and px[x, y][2] >= LIMIAR
               for x in range(w)] for y in range(h)]
        visto = [[False] * w for _ in range(h)]
        pilha = []
        for x in range(w):
            for y in (0, h - 1):
                if br[y][x] and not visto[y][x]:
                    visto[y][x] = True
                    pilha.append((y, x))
        for y in range(h):
            for x in (0, w - 1):
                if br[y][x] and not visto[y][x]:
                    visto[y][x] = True
                    pilha.append((y, x))
        while pilha:
            y, x = pilha.pop()
            px[x, y] = PRETO
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and br[ny][nx] and not visto[ny][nx]:
                    visto[ny][nx] = True
                    pilha.append((ny, nx))

    if encaixar and im.size != (TAMANHO, TAMANHO):
        escala = min(TAMANHO / im.size[0], TAMANHO / im.size[1])
        novo = (max(1, round(im.size[0] * escala)), max(1, round(im.size[1] * escala)))
        saida = Image.new('RGB', (TAMANHO, TAMANHO), PRETO)
        saida.paste(im.resize(novo, Image.LANCZOS),
                    ((TAMANHO - novo[0]) // 2, (TAMANHO - novo[1]) // 2))
    else:
        saida = im if im.size == (TAMANHO, TAMANHO) else im.resize((TAMANHO, TAMANHO), Image.LANCZOS)

    px = saida.load()
    b = BORDA_PX
    w, h = saida.size
    for x in range(w):
        for y in list(range(b)) + list(range(h - b, h)):
            px[x, y] = PRETO
    for y in range(h):
        for x in list(range(b)) + list(range(w - b, w)):
            px[x, y] = PRETO

    destino.parent.mkdir(parents=True, exist_ok=True)
    saida.save(destino, 'WEBP', quality=90)
    return destino.stat().st_size


def sobe_r2(chave: str, arquivo: Path) -> bool:
    """Sobe no R2 com o wrangler ja logado na maquina do dono.

    A variavel CLOUDFLARE_API_TOKEN do ambiente esta INVALIDA (401) e faz o
    wrangler abortar o login — por isso ela e removida do ambiente do
    processo antes de chamar o npx (equivale ao `env -u` de antes).
    """
    env = os.environ.copy()
    env.pop('CLOUDFLARE_API_TOKEN', None)
    cmd = ('npx wrangler r2 object put "%s/%s" --file="%s" --remote'
           % (BUCKET, chave, arquivo))
    print('    $ %s' % cmd)
    r = subprocess.run(cmd, cwd=str(RAIZ), env=env, shell=True,
                       capture_output=True, text=True, encoding='utf-8',
                       errors='replace')
    if r.returncode != 0:
        print('    !! falhou:\n%s' % (r.stderr or r.stdout)[-800:])
        return False
    return True


def confere_url(url: str, tentativas: int = 30) -> str:
    """Confere a URL publica com GET, aguardando a propagacao no CDN."""
    ultimo = ''
    for i in range(tentativas):
        try:
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                                      'AppleWebKit/537.36'}
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                resp.read(1)
                return 'HTTP %s' % resp.status
        except urllib.error.HTTPError as e:
            ultimo = 'HTTP %s' % e.code
        except Exception as e:
            ultimo = 'erro: %s' % e
        if i < tentativas - 1:
            time.sleep(5)
    return ultimo


def main():
    ap = argparse.ArgumentParser(description='Prepara e publica as fotos de um produto.')
    ap.add_argument('--colecao', required=True, help='prefixo da chave no R2 (ex.: solitario-dourada)')
    ap.add_argument('--slug', help='slug do produto (padrao: derivado do --nome)')
    ap.add_argument('--nome', required=True, help='nome do produto como aparece no site')
    ap.add_argument('--preco', type=float, required=True)
    ap.add_argument('--parcelas', type=int, default=2)
    ap.add_argument('--fotos', nargs='+', required=True, help='arquivos de origem (png/jpg)')
    ap.add_argument('--descricao', default='')
    ap.add_argument('--nota', default='')
    ap.add_argument('--tags', default='')
    ap.add_argument('--pasta', default=None, help='destino local (padrao PDFs/img/<colecao>)')
    ap.add_argument('--sem-upload', action='store_true', help='nao sobe no R2')
    ap.add_argument('--manter-branco', action='store_true', help='preserva areas claras da foto')
    ap.add_argument('--encaixar', action='store_true', help='encaixa sem esticar a imagem')
    args = ap.parse_args()

    sl = slug(args.slug or args.nome)
    pasta = Path(args.pasta) if args.pasta else RAIZ / 'PDFs' / 'img' / args.colecao
    if not pasta.is_absolute():
        pasta = RAIZ / pasta

    print('\nProduto : %s' % args.nome)
    print('Chave   : %s-%s-<n>.webp' % (args.colecao, sl))
    print('Destino : %s\n' % pasta)

    chaves, locais, falhas = [], [], []
    for i, origem in enumerate(args.fotos, start=1):
        origem = Path(origem)
        if not origem.exists():
            print('  !! arquivo ausente: %s' % origem)
            falhas.append(origem.name)
            continue
        chave = '%s-%s-%d.webp' % (args.colecao, sl, i)
        destino = pasta / chave
        tamanho = converte(origem, destino,
                           tratar_branco=not args.manter_branco,
                           encaixar=args.encaixar)
        print('  %d) %s -> %s (%s KB)' % (i, origem.name, destino.name, format(tamanho // 1024, ',').replace(',', '.')))
        chaves.append(chave)
        locais.append(destino)

    if falhas:
        print('\nFALTOU: %s' % ', '.join(falhas))
        return 1

    urls = ['%s/%s' % (URL_PUBLICA, c) for c in chaves]

    if not args.sem_upload:
        print('\nSubindo no R2 (bucket %s)...' % BUCKET)
        for chave, arquivo in zip(chaves, locais):
            print('  %s' % chave)
            if not sobe_r2(chave, arquivo):
                falhas.append(chave)
        print('\nConferindo as URLs publicas:')
        for chave, url in zip(chaves, urls):
            status = confere_url(url)
            print('  %-58s %s' % (chave[:58], status))
            if status != 'HTTP 200':
                falhas.append('%s (%s)' % (chave, status))

    if falhas:
        print('\nFALHAS: %s' % ', '.join(falhas))
        return 1

    # ---------- bloco pronto para colar no index.html ----------
    tags = [t.strip() for t in args.tags.split(',') if t.strip()]
    bloco = ["      {",
             "        nome: '%s'," % args.nome,
             "        preco: %s," % ('%.2f' % args.preco),
             "        parcelas: %d," % args.parcelas,
             "        imagem: '%s'," % urls[0]]
    if len(urls) > 1:
        bloco.append("        fotos: [")
        for u in urls:
            bloco.append("          '%s'," % u)
        bloco.append("        ],")
    if args.descricao:
        bloco.append("        descricao: '%s'," % args.descricao)
    if args.nota:
        bloco.append("        nota: '%s'," % args.nota)
    if tags:
        bloco.append("        tags: [%s]" % ', '.join("'%s'" % t for t in tags))
    bloco.append("      }")

    print('\n--- cole isto no index.html (dentro do array `itens` da coleção) ---')
    print("/* ATENCAO: se este bloco for o ULTIMO da lista, o item anterior precisa")
    print("   terminar com virgula (ex.: `tags: [...]` seguido de `,`). */")
    print('\n'.join(bloco))
    print('--- fim ---\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
