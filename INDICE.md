# ÍNDICE — Noiva Joias MT (mapa do projeto)

> **Para que serve:** saber **o que tem em cada pasta** sem precisar abrir tudo.
> Quando for tratar de um assunto, venha aqui primeiro e vá direto à pasta certa.
>
> O arquivo **canônico** (regras de identidade, design, produto e processo) é o
> **`AGENTS.md`** — este índice só mapeia **onde** as coisas estão, não repete as regras.
> Histórico de mudanças: `CHANGELOG.md`.

---

## 🌳 A raiz — só o essencial do site

| Arquivo | O que é |
|---|---|
| `index.html` | **O site inteiro** (HTML + CSS + JS + JSON-LD). É daqui que nasce tudo. `CONFIG` guarda telefone/CNPJ/cidades; `PRODUTOS` e `COLECOES` guardam o catálogo. |
| `checkout.html` | Página de checkout (Mercado Pago). Lê o produto pela URL, pergunta como o cliente quer receber e chama `/api/checkout`. |
| `obrigado.html` | Página de sucesso pós-pagamento. Dispara o evento `Purchase` do Pixel. |
| `vercel.json` | Config da Vercel. O rewrite manda tudo para `index.html`, **menos** `/api/`. |
| `og.png` | Imagem de compartilhamento (1200×630) — preview no WhatsApp/Instagram. |
| `logo-mercado-pago.png` | Logo da aplicação no painel do Mercado Pago. |
| `pasted-context-1.txt` | **Fonte do catálogo Ouro** (lista do fornecedor). ⚠️ não sobrescrever — é o que o `build_catalog_ouro.py` lê. |
| `AGENTS.md` | **Canônico** — identidade, design system, como adicionar produto/categoria, regras de PDF. |
| `COMO-COLOCAR-PRODUTO-NO-SITE.md` | **Guia do caminho padrão** para entrar um produto novo (com 1 ou mais fotos): preparar fotos, subir no R2, colar no `index.html`, refazer o PDF, publicar. |
| `CHANGELOG.md` | Histórico datado do que mudou e por quê. |
| `CLAUDE.md` | Ponteiro para o `AGENTS.md` (não duplica nada). |
| `.gitignore` / `.env.example` | Segredos nunca entram no repo; modelo das variáveis de ambiente. |

---

## 📁 api/ — o servidor (Vercel serverless)

| Arquivo | O que faz |
|---|---|
| `checkout.js` | Cria a preferência de pagamento no Mercado Pago e devolve o `checkout_url`. **Calcula o frete no servidor** (o valor do navegador é ignorado). Também consulta status de pagamento (`consultar`). |
| `webhook.js` | Recebe o aviso do Mercado Pago de que o pagamento mudou. Grava o pedido em `/tmp/pedidos.json`. |
| `rastreio.js` | Painel do dono + consulta do cliente: lista pedidos, gera etiqueta, marca medida do dedo, rastreia. As ações do dono (listar, cotar, etiqueta) exigem o header `x-owner-token`; o cliente (consultar, medida) não usa token. |
| `_lib/melhorenvio.js` | Único arquivo que fala com a Melhor Envios: cotação, etiqueta (cart→checkout→generate→print) e status do envio. Fica em `_lib/` porque o Vercel transforma tudo que está em `api/` numa rota — e este é um módulo, não um handler. |

> ⚠️ `webhook.js` e `rastreio.js` guardam pedidos em **`/tmp`** — é efêmero na Vercel.
> Em produção de verdade isso vira um banco. Segredos (`MP_ACCESS_TOKEN`,
> `ME_API_TOKEN`, `OWNER_TOKEN`) só existem como variável de ambiente da Vercel.

---

## 📁 PDFs/ — catálogos em PDF

> Guia detalhado: **`PDFs/LEIAME.md`**.

| Item | O que é |
|---|---|
| `catalogo_base.py` | **Base compartilhada** — CSS, cards, PDF e as travas. O `CSS_AJUSTES` (que corrige o corte) mora só aqui. |
| `build_catalog_solitarios.py` | Gera PDF lendo **o `index.html`** (produtos já cadastrados no site). |
| `build_catalog_moeda_antiga.py` | Gera PDF da moeda antiga lendo `pasted-context-moeda-antiga.txt`. |
| `build_catalog_ouro.py` | Gera PDF do ouro lendo `pasted-context-1.txt`. |
| `upload_r2.py` | Sobe no Cloudflare R2 (via S3 API) o que está no `manifest.json`. |
| `gerar_colecao_site.py` | Gera o bloco `COLECOES` do site a partir do **mesmo manifesto** do PDF. |
| `pasted-context-moeda-antiga.txt` | Lista-fonte da moeda antiga. |
| `img/moeda-antiga/manifest.json` | **Contrato PDF ↔ R2 ↔ site**: preço, parcela e URL num lugar só. |
| `*.pdf` | Os 4 catálogos publicados (Prata, Ouro, Solitários, Moeda Antiga). |
| `catalogo-*-r2.html` / `*.html` | HTML fonte de cada catálogo (template canônico = `catalogo-aliancas-prata-r2.html`). |
| `img/` | Imagens dos produtos (webp 1000×1000). |

---

## 📁 scripts/ — automações antigas de suporte

| Arquivo | O que é |
|---|---|
| `build_pdf.py`, `add_parcela_prata.py`, `remove_phone_prata.py` | Ajustes pontuais no catálogo de prata. |
| `testar_melhor_envio.js` | Teste ponta a ponta da integração da Melhor Envios (saldo, cotação, preço da etiqueta) — **não gasta saldo**. Rodar: `node scripts/testar_melhor_envio.js`. |
| `download_sr_fernandes_prata.py` | Baixa a foto do "Sr. Fernandes". |
| `gerar_logo_mercadopago.py` | Gera o logo da aplicação do Mercado Pago. |
| `preparar_fotos_produto.py` | **Comando único do produto novo:** converte as fotos (1000×1000 webp, borda preta), sobe no R2 e imprime o bloco pronto para o `index.html`. Ver `COMO-COLOCAR-PRODUTO-NO-SITE.md`. |

---

## 📁 marketing/ — Instagram e anúncios

| Arquivo | O que é |
|---|---|
| `INSTAGRAM_DELETE_PROTOCOL.md` | Protocolo validado para excluir posts do Instagram um a um (BrowserOS neo). |
| `PROMPT_INSTAGRAM_DELETE.md` | Prompt pronto para colar em cada IA que participa da exclusão coordenada. |
| `instagram_delete_locks.json` | Arquivo de coordenação multi-agente (quem já excluiu o quê). |

> Perfil trabalhado aqui: `@par_aliancas_cuiaba`.

---

## 📁 operacoes/ — backup e depuração

| Arquivo | O que é |
|---|---|
| `index.html.backup` | Backup de uma versão anterior do site (antes de uma grande mudança). |
| `facebook_ads_debug.html` | Página de erro do Facebook salva para depuração de anúncios. |

---

## 📁 r2-manutencao/ — imagens e Cloudflare R2

| Arquivo | O que é |
|---|---|
| `guia-capacidades-ia_fotos_links.md` | Guia de conversão/redimensionamento de imagem e hospedagem (R2, Postimages, ImgBB). |
| `organize_r2.py` | Organiza objetos do bucket R2 em pastas por palavra-chave no nome (usa credencial S3 do ambiente). |

> Upload no R2 é **só pela S3 API** (token `cfat_…` dá 403). Bucket: `etevalda`.
> Detalhe de credencial e comandos: `PDFs/LEIAME.md`.

---

## 📁 Pastas de fotos (material de origem — o site usa o R2)

Estas pastas são **acervo/fonte**; o site em si puxa as imagens do Cloudflare R2.

| Pasta | Conteúdo |
|---|---|
| `img/` | Acervo geral de fotos do site (banhadas, clássicas, etc.). |
| `Banhadas/` | Fotos de alianças banhadas a ouro 18k. |
| `Prata/` | Fotos de alianças cor prata. |
| `Solitário/` | Fotos de solitários e aparadores. |
| `FOTOS ALIANCAS/` | Fotos variadas (solitários, nomes com preço). |
| `ADS/` | 2 vídeos de anúncio (`.mp4`). |

> ⚠️ Existem **subpastas vazias** (`Banhadas/Banhadas/`, `Prata/Pratas/`,
> `FAQ - PERGUNTAS FREQUENTES/`, `Solitário e Aparadores/`). Não afetam o site —
> podem ser limpas depois, mas **só com sua confirmação**.

---

## ⚡ Acesso rápido por assunto

| Quero tratar de… | Vá para |
|---|---|
| Mudar algo no **site** | `index.html` (+ `AGENTS.md` seção 4/4b) |
| **Preço/produto** novo | `index.html` → `PRODUTOS` ou `COLECOES` (+ `COMO-COLOCAR-PRODUTO-NO-SITE.md`) |
| **Pagamento / checkout / frete** | `checkout.html` + `api/checkout.js` |
| **Pedido / etiqueta / rastreio** | `api/rastreio.js` + `api/_lib/melhorenvio.js` |
| **Catálogo PDF** | `PDFs/` (+ `PDFs/LEIAME.md`) |
| **Fotos / subir imagem no R2** | `r2-manutencao/` + `PDFs/LEIAME.md` |
| **Instagram / anúncios** | `marketing/` |
| **Regra de identidade/design** | `AGENTS.md` |
| **O que mudou e quando** | `CHANGELOG.md` |
