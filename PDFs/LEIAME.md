# Catálogos PDF — Noiva Joias MT

Esta pasta contém os catálogos em PDF do site **Noiva Joias MT**.

## Estrutura

```
PDFs/
├── LEIAME.md                                                   ← este arquivo
├── catalogo_base.py                                         ← BASE compartilhada (CSS, cards, PDF, travas)
├── pasted-context-moeda-antiga.txt                          ← lista da moeda antiga (fonte)
├── upload_r2.py                                             ← sobe no R2 o que está no manifesto
├── gerar_colecao_site.py                                    ← gera o bloco COLECOES do index.html
├── Noiva-Joias-MT-Catalogo-Aliancas-Prata-v5.pdf             ← PDF prata (4 p · 10 produtos)
├── Noiva-Joias-MT-Catalogo-Aliancas-Ouro-v2.pdf              ← PDF ouro (8 p · 27 produtos)
├── Noiva-Joias-MT-Catalogo-Solitario-e-Aparadores-v1.pdf    ← PDF solitários (5 p · 13 anéis)
├── Noiva-Joias-MT-Catalogo-Aliancas-Moeda-Antiga-v1.pdf      ← PDF moeda antiga (8 p · 27 peças)
├── catalogo-aliancas-prata-r2.html            ← HTML fonte prata (TEMPLATE canônico)
├── catalogo-aliancas-ouro-r2.html            ← HTML fonte ouro
├── catalogo-aliancas-solitarioeaparadores.html ← HTML fonte solitários
├── catalogo-aliancas-moeda-antiga.html       ← HTML fonte moeda antiga
├── build_catalog_ouro.py                     ← script do ouro (lê pasted-context-1.txt)
├── build_catalog_solitarios.py               ← script dos solitários (lê o index.html)
├── build_catalog_moeda_antiga.py             ← script da moeda antiga (lê o .txt dele)
└── img/ ← imagens dos produtos (1000×1000 webp)
```

> **Template canônico: `catalogo-aliancas-prata-r2.html`.** Os quatro catálogos nascem
> dele — é a identidade visual que precisa ser preservada.
> **Base de código: `catalogo_base.py`.** Todo script importa daqui; o `CSS_AJUSTES`
> (que resolve o clipping) mora só lá.

## Como este catálogo foi criado

| Etapa | Descrição |
|-------|-----------|
| **1. Base HTML** | `catalogo-prata-v2.html` é o template v3-corrigido: layout idêntico, CSS e estrutura preservados |
| **2. CSS customizado** | Fontes mais legíveis (Jost 13.5px, line-height 1.5), banners maiores (tag 8.5px, título 14-18px, corpo 10px), grid compacto (gap 5mm) |
| **3. Produtos via BeautifulSoup** | Substitui slots por índice (não por nome) para evitar conflitos de nomes duplicados entre páginas |
| **4. Imagens base64** | Todas as imagens são embutidas como base64 diretamente no HTML — funciona offline |
| **5. Back-info compacto** | Contracapa eliminada; dados da loja (logo, CNPJ, cidades, telefone) ficam no rodapé da última página |
| **6. PDF via Playwright** | Geração com `emulate_media('print')`, margens zero, `print_background=True` |

## Regras dos catálogos

> As regras **de negócio** (preço, parcela, identidade, aviso do material) estão na
> seção 8 do **`AGENTS.md`**, que é o arquivo canônico. Aqui só a mecânica do PDF.

- **Formato:** A4 exato (210×297mm), sem bordas brancas
- **Grid:** 2 colunas, 4 slots por página (produto ou banner informativo)
- **Páginas:** `ceil(n_produtos / 4)` de produtos + 1 de fechamento
- **Cores:** fundo preto-quente (#0b0907), dourado (#c9a75b), texto creme (#f6f1e6)
- **Fontes:** display = Cormorant Garamond, corpo = Jost
- **Algarismos:** sempre lining-nums (não oldstyle)
- **Imagens:** 1000×1000px webp, qualidade 90, por URL do R2 (não base64: 2.357 KB → 37 KB)
- **Preço e parcela têm que bater com o site** — a conta da parcela é do site
  (`AGENTS.md` seção 8)

## ⚠️ Bug conhecido do template (já corrigido no catálogo de solitários)

Com **4 slots por página** o card não cabia na folha A4 e, como `.page` tem
`overflow:hidden`, **o rodapé do produto era cortado sem aviso nenhum** — o build
"passava" e o PDF saía truncado. O catálogo de prata v5 publicado sofre disso na
página 1.

A correção (no bloco `CSS_AJUSTES` do `build_catalog_solitarios.py`):

```css
.page-inner{flex:1;min-height:0}                      /* a folha é ocupada */
.cat-grid{grid-template-rows:repeat(2,minmax(0,1fr))}  /* 2 linhas dividem a altura */
.prod-name{font-size:clamp(14px,2.2vw,20px)}           /* tipografia um pouco menor */
.prod-img-wrap{aspect-ratio:10/9}                      /* foto IGUAL à original */
```

**Não muda o grid** (continua 2 col × 4 slots) ** nem a foto** (10/9 = 88,2mm).
Ao aplicar num catálogo novo, copie o bloco `CSS_AJUSTES` inteiro.

Além disso, `build_catalog_solitarios.py` **falha o build** se alguma imagem quebrar
ou se algum card estourar a folha — clipping não passa mais em silêncio.

## Duas formas de gerar catálogo

Todos os scripts importam a base compartilhada (`catalogo_base.py`) e só cuidam do
que é próprio da categoria: como os produtos entram e o texto da página final.

| Script | Dados vindos de | Use quando |
|---|---|---|
| `build_catalog_solitarios.py` | **`index.html`** (coleções de `COLECOES`) | os produtos já estão cadastrados no site |
| `build_catalog_moeda_antiga.py` | `PDFs/pasted-context-moeda-antiga.txt` | a lista veio colada do fornecedor |
| `build_catalog_ouro.py` | `pasted-context-1.txt` (nome + link + valor) | catálogo ouro já construído |

> ⚠️ **`pasted-context-1.txt` é o histórico do catálogo OURO.** Cada fornecedor novo
> manda uma lista nova: **guarde em um arquivo próprio** (como o
> `pasted-context-moeda-antiga.txt`) em vez de sobrescrever esse, senão o
> `build_catalog_ouro.py` perde a fonte e não reproduz mais o Ouro v2.

Quando os produtos já estão no site, prefira o `build_catalog_solitarios.py`: o site
é a fonte da verdade, então **preço, foto, nome e tags nunca saem de sincronia**.
Ele apenas lê o `index.html` — nunca escreve nele.

### Formato do arquivo de produtos

```
NOME DO PRODUTO
Link da Imagem aqui : https://...
Valor : 489.99
```

Três linhas, **sem linha em branco no meio** (o parser precisa exatamente disso), e um
bloco em branco entre um produto e o próximo. Aceita `.webp`, `.jpg` e `.png`.

## O que cada catálogo tem de particular

| Catálogo | Aviso em TODO card | Banner | Parcelamento |
|---|---|---|---|
| Prata | "não acompanha aliança" | qualidade da liga | do site |
| Ouro | — | — | do site |
| Solitários | "sem garantia · opcional" | cor prata sem garantia | do site |
| **Moeda antiga** | **"pode escurecer e manchar · precisa de manutenção"** | **escurece/mancha + pasta de dente** | **2x sem juros fixo** |

O aviso da moeda antiga é o ponto central daquele catálogo: a peça **escurece e pode
manchar o dedo de verde**, e restaurar a cor é manutenção (pasta de dente ou produto
específico). Não esconder isso do cliente — está no card, no banner e na página final.

## Como criar um novo catálogo (outra categoria)

### Pré-requisitos
- Imagens dos produtos em 1000×1000px webp
- Nome, preço e tags de cada produto

### Passos

1. **Parsear produtos:** Extraia nome, link e preço do pasted-context (formato: nome\nLink da Imagem aqui : URL\nValor : X.XX)

2. **Copie o HTML base:**
   ```bash
   cp PDFs/catalogo-aliancas-prata-r2.html PDFs/catalogo-[categoria].html
   ```

3. **Substitua os produtos:**
   - Se os produtos já estão no site, **parseie o `index.html`** (copie o
     `extrair_colecao()` do `build_catalog_solitarios.py`) em vez de digitar cards
   - 4 slots por página (2×2 grid); banner informativo ocupa um slot
   - **4 slots + back-info não cabem na mesma folha** — o back-info só entra se a
     página tiver menos de 4 slots

4. **Ajuste o CSS se necessário:**
   - Copie o bloco `CSS_AJUSTES` do `build_catalog_solitarios.py` (resolve o clipping)
   - Fontes, espaçamentos, tamanhos
   - **Nunca modifique o layout/grid** — preserve 2×4 slots por página
   - Mantenha a identidade visual: cores, fontes, tokens do site

5. **Prepare as imagens:**
   - Formato: webp, qualidade 90
   - Dimensão: 1000×1000px
   - Fundo: opaco (converta RGBA para RGB se necessário)
   - Pode usar URL do R2 direto no HTML (é o que os catálogos r2 fazem) ou base64

6. **Gere o PDF:**
   ```bash
   python PDFs/build_catalog_solitarios.py   # categorias que já estão no site
   python PDFs/build_catalog_ouro.py         # lista colada do fornecedor
   ```

7. **Valide:**
   - Páginas = `ceil(n_produtos / 4)` + 1 (fechamento)
   - Todas as páginas A4 (210×297mm)
   - Zero console errors, zero imagem quebrada
   - **Zero overflow** — o build já falha sozinho se houver
   - Preço e telefone em algarismos lining (legíveis)
   - Confira o texto extraído do PDF: `PyPDF2` → todos os produtos presentes

8. **Atualize a documentação:**
   - Copie o PDF final e o HTML fonte para `PDFs/`
   - Atualize este arquivo (`LEIAME.md`)

### Script de automação

Para catálogos de ouro 18K, use:
```bash
python PDFs/build_catalog_ouro.py
```

Este script: parseia `pasted-context-1.txt`, baixa imagens, converte para webp 1000×1000, gera HTML com base64 e PDF.

## Upload de imagens para Cloudflare R2

As imagens ficam no **R2** (bucket `etevalda`), no mesmo domínio que o site já usa:

```
https://pub-30377154a86f42f9be74defe556d3deb.r2.dev/moeda-antiga/<arquivo>.webp
```

### O caminho que funciona — e o que não funciona

| Caminho | Resultado |
|---|---|
| Token de API `cfat_…` na REST API (`api.cloudflare.com/…/r2/…/objects`) | **403** (e **401** se o token estiver expirado) |
| `wrangler r2 object put --remote` com token da API no ambiente | **403** |
| **`wrangler r2 object put --remote` com o login do próprio dono** (`wrangler login` feito no PC) | ✅ **funciona** (testado em 22/10/2026) |
| **S3 API** (Access Key ID + Secret Access Key) | ✅ **funciona** |

> 💡 **Jeito mais simples hoje:** com o `wrangler` logado na máquina do dono,
> `env -u CLOUDFLARE_API_TOKEN npx wrangler r2 object put etevalda/<chave> --file=<arquivo> --remote`
> sobe a foto direto no bucket. (O `env -u` existe porque a variável
> `CLOUDFLARE_API_TOKEN` do ambiente, quando presente e inválida, faz o
> `wrangler` recusar o login e dar erro.)

Para **subir**, use o S3 API. O `Access Key ID` e o `Secret Access Key` saem da mesma
tela do painel que mostra o token (`dash.cloudflare.com → R2 → Manage R2 API Tokens`).

```bash
# PowerShell — credenciais SÓ do ambiente, nunca em arquivo
$env:R2_ACCOUNT_ID         = "aaaaf7a592454926fcefbf9d6be542a7"
$env:R2_ACCESS_KEY_ID      = "<access key id>"
$env:R2_SECRET_ACCESS_KEY  = "<secret access key>"
python PDFs/upload_r2.py
```

O `upload_r2.py` lê `img/<categoria>/manifest.json` e sobe **exatamente** os arquivos
que o PDF usou — é o que impede R2, PDF e site de saírem dessincronizados.

> ⚠️ **Nunca** grave token, key ou secret em arquivo do repositório (regra 7 do
> `AGENTS.md`). Use variável de ambiente e, de preferência, um token com o **menor
> privilégio**: `Object Read & Write` restrito só ao bucket que precisa.

Observação sobre o preset: o "Object Read & Write" da tela de Account API Token
**não** dá permissão de escrita de objeto na REST API (403). Ele serve para o
endpoint de listagem; para gravar, é o S3 API.

## Contato

**Noiva Joias MT** · (65) 9294-2810 · noivajoiasmt.com.br  
CNPJ 31.186.957/0001-06 · Cuiabá · Rondonópolis · Sinop

---

## Catálogos do fornecedor Elite 18K (adicionados 11/10/2026)

Além dos catálogos de alianças, há os do fornecedor **Elite Imports 18K**
(banhados a ouro masculinos). Fonte: `PRODUTOS_COMPRADOS_Valdicleia.md`
(produtos dos pedidos, fotos já no R2 em `elite18k/`).

| Catálogo | HTML fonte | Produtos |
|---|---|---|
| KITS (combinações + correntes) 18K | `catalogo-kits-conjuntos.html` | 38 |
| Pulseiras Masculinas 18K | `catalogo-pulseira-masculina.html` | 27 |
| Pingentes Masculinos 18K | `catalogo-pingente-masculino.html` | 19 |

> **Estrutura decidida pelo dono (12/10/2026): são 3 categorias, não 4.**
> A categoria CORRENTE deixou de existir — quem tem **combinação** (corrente+pingente,
> corrente+pulseira, kit completo) fica na **KITS**, junto das correntes soltas, porque
> corrente sozinha não vende. Ficaram de fora só as categorias **exclusivas**: a
> PULSEIRA tem **somente pulseira** e a PINGENTE tem **somente pingente**.
> Total: 38 + 27 + 19 = **84 produtos** (todos os do arquivo, nenhum descartado).

**Builder genérico:** `build_catalog_categoria.py` — recebe a categoria por
argumento e usa a mesma base/template:

```bash
python PDFs/build_catalog_categoria.py PULSEIRA
python PDFs/build_catalog_categoria.py PINGENTE
python PDFs/build_catalog_kits_corrente.py   # KITS = KITS + CORRENTE (38)
```

> ⚠️ A categoria `CORRENTE` **não existe mais** como catálogo. `build_catalog_kits_corrente.py`
> soma as correntes dentro de KITS, e a entrada `CORRENTE` foi **removida do `INFO`** em
> `build_catalog_categoria.py` — assim ninguém recria por engano um 4º catálogo fora da
> estrutura aprovada. Conferido item a item: os 16 produtos do antigo
> `catalogo-corrente-masculina.html` estão todos nos 38 da KITS (nada perdido, nada extra).
> O arquivo antigo foi movido para `PDFs/_ARQUIVADO/` — **não faz mais parte** do que vai
> para o cliente e não é mais referenciado por script nenhum.

**Regras desses catálogos:**
- preço de venda = valor pago ao fornecedor **+300%**
- **só a 1ª foto** de cada produto (`-1.webp`)
- **PULSEIRA só tem pulseira; PINGENTE só tem pingente** (nenhuma mistura)
- **KITS** concentra tudo que é combinação + as correntes soltas
- mesma identidade visual (cores, fontes, grid 2×2) dos catálogos de aliança
- **só HTML por enquanto** — PDF só depois que o dono aprovar

Ficam no mesmo domínio R2: `https://pub-3037….r2.dev/elite18k/<TITULO>-1.webp`.
