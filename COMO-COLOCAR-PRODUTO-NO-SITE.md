# Como colocar um produto novo no site (inclusive com 2 ou mais fotos)

> **Este é o caminho padrão do projeto.** Se for seguir do começo ao fim, o
> produto entra no site, no catálogo PDF e no ar — do mesmo jeito toda vez.
>
> Atalho: o passo 1 é um comando só
> (`scripts/preparar_fotos_produto.py`), e o passo 2 é colar o bloco que o
> próprio script imprime.

---

## Resumo em 6 passos

| # | O quê | Como |
|---|---|---|
| 1 | Fotos (converter + subir no R2) | `python scripts/preparar_fotos_produto.py ...` (imprime o bloco do produto) |
| 2 | Cadastrar no site | colar o bloco em `index.html`, dentro do `itens` da coleção |
| 3 | **Catálogo de preços do servidor** | `node scripts/gerar_catalogo_precos.js` (**sem isto o produto não pode ser pago!**) |
| 4 | Conferir no navegador | abrir o site, clicar na foto (abre o visor ampliado) |
| 5 | Catálogo PDF | `python PDFs/build_catalog_solitarios.py` (só as coleções que têm PDF) |
| 6 | Fechar | `CHANGELOG.md` + commit + push na `main` (deploy automático) |

> ⚠️ **Passo 3 é de segurança e não pode ser pulado.** O servidor de pagamento
> cobra o preço de `api/_lib/catalogo-precos.json`, que é gerado a partir do
> `index.html`/`masculino.html`. Se você cadastrou o produto e esqueceu de rodar
> o script, o cliente vê o produto no site mas o **pagamento é recusado**
> ("produto não encontrado no catálogo") — e preço antigo cobra preço antigo.

---

## Onde cada coisa vive

| O quê | Onde |
|---|---|
| Catálogo que aparece direto na página | `index.html` → array `PRODUTOS` |
| Coleções que abrem por cima da página | `index.html` → array `COLECOES` (cada uma com `itens`) |
| Fotos | Cloudflare R2 (bucket `etevalda`) — o site usa **só a URL** |
| Chave da foto no R2 | `<colecao>-<slug-do-produto>-<n>.webp` — o `1` é a capa, `2`, `3`… são as extras |
| Catálogo em PDF | `PDFs/build_catalog_*.py` — o de solitários **lê o `index.html`** |

> O mesmo produto aparece **no catálogo principal e na coleção** por cima da
> página. Não é duplicação: a página mostra todos os produtos e a coleção é a
> forma de navegar por tipo (solitário, prata, banhadas…).

---

## Passo 1 — As fotos (comando só)

```bash
python scripts/preparar_fotos_produto.py \
  --colecao solitario-dourada \
  --slug anel-solitario-doce-coracao \
  --nome "Anel Solitário Doce Coração Cor Dourada" \
  --preco 249.99 --parcelas 2 \
  --descricao "Anel solitário doce coração: três pedras cristal e coração vazado com pedra, cor dourada." \
  --tags "Doce Coração, Cor Dourada" \
  --fotos "C:/Users/rodri/Downloads/anel_a.png" "C:/Users/rodri/Downloads/anel_b.png"
```

O script faz tudo e **imprime o bloco pronto para colar no `index.html`**:

1. converte cada foto para **1000×1000 webp qualidade 90** (padrão dos catálogos);
2. troca o **branco pelo preto do catálogo** (`#0b0907`) e reforça **4 px de borda preta**
   (é o pedido do dono: nada de tarja branca);
3. salva em `PDFs/img/<colecao>/` e **sobe no R2** (`etevalda`);
4. confere se a URL pública responde **200**;
5. imprime o bloco do produto com o campo `fotos` já preenchido.

Opções úteis: `--sem-upload` (só converte e mostra o bloco), `--pasta "img/minha-pasta"`,
`--nota "..."` (o aviso de garantia do material).

### Subir a foto na mão (sem o script)

```bash
env -u CLOUDFLARE_API_TOKEN npx wrangler r2 object put \
  etevalda/<colecao>-<slug>-<n>.webp --file=<arquivo> --remote
```

> ⚠️ O `env -u` é **obrigatório**: a `CLOUDFLARE_API_TOKEN` do ambiente está
> inválida (401) e o `wrangler` aborta o login. É o `wrangler` já logado na
> máquina do dono que sobe — não precisa de credencial S3.

---

## Passo 2 — Cadastrar no `index.html`

Cole o bloco impresso dentro do array `itens` da coleção, no fim da lista:

```js
      {
        nome: 'Anel Solitário Doce Coração Cor Dourada',
        preco: 249.99,
        parcelas: 2,
        imagem: 'https://pub-30377154a86f42f9be74defe556d3deb.r2.dev/solitario-dourada-anel-solitario-doce-coracao-1.webp',
        fotos: [
          'https://pub-30377154a86f42f9be74defe556d3deb.r2.dev/solitario-dourada-anel-solitario-doce-coracao-1.webp',
          'https://pub-30377154a86f42f9be74defe556d3deb.r2.dev/solitario-dourada-anel-solitario-doce-coracao-2.webp'
        ],
        descricao: 'Anel solitário doce coração: três pedras cristal e coração vazado com pedra, cor dourada.',
        nota: 'Produto na cor dourada não tem garantia, justamente por esse motivo que vendemos neste valor acessível. Compre se sentir confortável, ou seja, compre se quiser. É opcional. O par de aliança, diferente, tem garantia de 3 meses.',
        tags: ['Doce Coração', 'Cor Dourada', 'Pedra Cristal']
      }
```

| Campo | Para que serve |
|---|---|
| `nome` | título do card |
| `preco` | valor (número, ponto como separador: `249.99`) |
| `parcelas` | `2` = “2x de R$ 124,99” |
| `imagem` | **a capa** — é ela que aparece no card e que vai no link do checkout |
| `fotos` | **a lista de todas as fotos** — é ela que faz aparecerem as setinhas. Pode ter 2, 3, 4… quantas você quiser: não há limite no código |
| `descricao` | uma frase curta (aparece abaixo do nome) |
| `nota` | aviso do material (garantia) |
| `tags` | etiquetas pequenas |

> ⚠️ **`fotos` é o que liga as setinhas.** Sem `fotos` (ou com uma foto só), o
> produto aparece com uma foto e **sem** botõezinhos. A lista `fotos` sempre
> vence a detecção automática por nome de arquivo `(1)`, `(2)`.
>
> **Para 3 ou mais fotos é a mesma coisa:** suba todas (`-1`, `-2`, `-3`…) e
> liste todas em `fotos`, na ordem em que devem aparecer. As setinhas, as
> bolinhas e o contador (“1 / 3”) se ajustam sozinhos — **nenhum código muda**.
> Só não esqueça: `imagem` continua sendo **a mesma da primeira foto**.

---

## Passo 3 — Catálogo de preços do servidor (obrigatório)

```bash
node scripts/gerar_catalogo_precos.js
```

- O script lê `index.html` e `masculino.html` e regenera
  `api/_lib/catalogo-precos.json` — o mapa de preços que o
  `/api/checkout` usa para **cobrar o valor certo**.
- Depois de rodar, ele imprime quantos produtos saíram e o que mudou
  (novos, saíram, preço alterado).
- **Regra:** qualquer mexida em `nome` ou `preco` de produto, no
  `index.html` ou no `masculino.html`, exige rodar este script de novo
  e publicar junto.

---

## Passo 4 — O que o site faz sozinho (não precisa mexer em código)

Depois de cadastrado, o produto ganha tudo isto, sem nenhuma linha a mais:

- **setinhas discretas nas laterais da foto** — no card do catálogo principal
  **e** no item da coleção que abre por cima da página. Funciona com clique,
  setas do teclado e arrastar no celular;
- **bolinhas** de posição embaixo e contador **“1 / 2”** no canto da foto;
- **lupa** no canto inferior esquerdo da foto;
- **visor ampliado**: clicar na foto abre ela grande na tela do cliente, com o
  **nome do produto**, o **preço**, o parcelamento e os botões
  **Comprar — Frete Grátis** e **Falar com o entregador** (WhatsApp com a
  mensagem já pronta). Se o produto tem 2+ fotos, as setinhas, o teclado e o
  arrasto trocam a foto dentro do visor também;
- **botão de WhatsApp** (mensagem pronta) e **botão de checkout** (Mercado Pago, frete grátis);
- entrada automática no **JSON-LD** (dados estruturados para o Google).

---

## Passo 5 — Catálogo em PDF (só para as coleções que têm PDF)

```bash
python PDFs/build_catalog_solitarios.py
```

- O script **lê o `index.html`** — o site é a fonte da verdade.
- O script **falha o build** quando a quantidade de itens muda. É proposital:
  é o aviso de “o catálogo precisa ser refeito com a contagem nova”.
- O PDF **não é versionado no Git**: o arquivo final fica na pasta `PDFs/` na
  máquina do dono.

---

## Passo 6 — Fechar

- [ ] `CHANGELOG.md` — uma linha do que mudou
- [ ] `git add` **só o código** (as fotos em `PDFs/img/` e os PDFs não entram no repositório)
- [ ] `git commit` + `git push origin main` → deploy automático
- [ ] conferir no ar: <https://noivajoiasmt.vercel.app>

---

## Armadilhas conhecidas

| Armadilha | Como evitar |
|---|---|
| `CLOUDFLARE_API_TOKEN` do ambiente está inválida (401) | remover a variável antes do `wrangler` (o script já faz) |
| Produto com 2 fotos mas **sem setinhas** | faltou o campo `fotos` |
| `imagem` e a 1ª foto do `fotos` são diferentes | manter as duas iguais (a capa é a `imagem`) |
| PDF desatualizado depois de cadastrar | rodar o `build_catalog_*.py` da coleção |
| O script do PDF falha ao mudar a quantidade | é a trava proposital — atualizar a contagem esperada |
| `PDFs/img/` e os `*.pdf` não vão para o Git | nunca usar `git add -A` nesse projeto |
| O nome do arquivo não define a galeria | quem manda é o campo `fotos` |
| O bloco novo é colado sem a vírgula no item anterior | o item de cima (o último da lista) precisa terminar com `,` |
| Esqueci de subir todas as fotos de 3+ | o `fotos` tem que listar todas; a `imagem` é a mesma da primeira |
