# Projeto Noiva Joias MT — site de alianças

**Caminho:** `C:\Users\rodri\OneDrive\Documents\NOIVA_JOIAS_MT`

## Identidade
- **Nome:** Noiva Joias MT
- **WhatsApp:** (65) 9294-2810
- **CNPJ:** 31.186.957/0001-06
- **Entrega:** Cuiabá, Rondonópolis e Sinop
- **Pagamento:** apenas na entrega

## Tecnologia
- Site em **HTML único autocontido** (`index.html`)
- Páginas: `index.html` (loja), `faq.html` (dúvidas frequentes), `privacidade.html` (Política de Privacidade / LGPD) e `termos.html` (Trocas, Devoluções e Termos de Uso / CDC) — todas autocontidas, sem build
- Fonte canônica da FAQ: `faq.html` nesta pasta. A cópia em `..\FAQ - PERGUNTAS FREQUENTES\FAQ-NOIVA-JOIAS-MT\index.html` é rascunho — sempre editar o `faq.html` e rodar o commit + push na `main` (deploy automático)
- Rotas: `/faq` → `faq.html`, `/privacidade` → `privacidade.html`, `/termos` → `termos.html` (rewrite em `vercel.json`); os demais caminhos caem no `index.html`
- `api/_lib/` guarda módulos (não rotas): o Vercel transforma tudo que está em `api/` numa rota, e um módulo sem handler vira rota quebrada (500). O prefixo `_` tira do roteamento mas o Node empacota junto no import.
- Sem build, sem framework (React/Vite/npm só se o usuário pedir)
- Referência de formato: site do **Grupo Etevalda MT** (empresa diferente)
  - Copiar o **formato**, nunca a marca, o nome ou os dados deles

## Regras de processo
- Toda mudança de comportamento visível → uma linha no `CHANGELOG.md`
- `AGENTS.md` deste projeto é o padrão canônico (identidade, tokens, checklist, regras)
- Não duplicar informação no AGENTS.md global

## Checklist rápido
- [ ] `index.html` válido e testado
- [ ] `CHANGELOG.md` atualizado
- [ ] WhatsApp e CNPJ corretos no rodapé/contato
- [ ] Entrega/pagamento claros para o cliente

## Como colocar um produto novo (com 1 ou mais fotos)
O caminho completo, com os comandos e as armadilhas, está em **`COMO-COLOCAR-PRODUTO-NO-SITE.md`**. Resumo:
1. **Fotos** — `python scripts/preparar_fotos_produto.py --colecao <colecao> --slug <slug> --nome "<nome>" --preco <n> --parcelas <n> --fotos "<foto1>" "<foto2>"`: converte para 1000×1000 webp q90 com a borda preta do catálogo, sobe no R2 e **imprime o bloco do produto pronto**. (O `env -u CLOUDFLARE_API_TOKEN` é obrigatório no `wrangler`.)
2. **Site** — colar o bloco em `index.html`, dentro do `itens` da coleção (`COLECOES`). O campo **`fotos`** (lista de todas as fotos) é o que faz aparecerem as setinhas; `imagem` é a capa.
3. **Catálogo de preços do servidor** — `node scripts/gerar_catalogo_precos.js` (gera `api/_lib/catalogo-precos.json`; **sem esse passo o pagamento do produto novo é recusado**).
4. **PDF** — `python PDFs/build_catalog_solitarios.py` (lê o `index.html`; falha se a quantidade de itens mudar).
5. **Fechar** — `CHANGELOG.md` + commit + push na `main`. Fotos e PDFs **não** entram no repositório.

## Indexação no Google (Search Console) — STATUS E PENDÊNCIAS
**O site está verificado e configurado no Google Search Console desde 2026-10-23**
(propriedade `https://noivajoiasmt.vercel.app/`, metatag `google-site-verification`
no `index.html` — nunca remover — e `sitemap.xml` enviado). Passo a passo completo,
fluxo de "página nova" e armadilhas: **`COMO-INDEXAR-NO-GOOGLE.md`**.

### ✅ CONFERÊNCIA DE 2026-10-27 — FEITA (pendência encerrada)
- **Resultado:** Search Console → "Indexação das páginas" → **0 não indexadas, 1 indexada**,
  "Nenhum problema foi detectado nos últimos 90 dias". A home `https://noivajoiasmt.vercel.app/`
  **está indexada**. Conferido em 27/10/2026.
- **Registro:** entrada no `CHANGELOG.md` de 27/10/2026.
- **Próxima revisão periódica:** **2027-04-27** (e depois a cada 6 meses).

### 🔁 REVISÃO PERIÓDICA (a cada 6 meses, pedido do dono = 2× ao ano)
- Próxima revisão: **2027-04-27** (e depois a cada 6 meses).
- Regra igual à acima: quando a data chegar, **qualquer sessão futura faz a
  revisão antes de outras tarefas** (relatório Páginas + Sitemaps no Search
  Console + busca `site:noivajoiasmt.vercel.app`) e registra no `CHANGELOG.md`.

### 📄 Página nova publicada no futuro
Toda página HTML NOVA (rota nova) precisa: entrar no `sitemap.xml` + "Solicitar
indexação" no Search Console (ver `COMO-INDEXAR-NO-GOOGLE.md`). Produto novo
dentro do catálogo **não** precisa de nada disso. Quando subir uma página nova,
se a conferência/pendência estiver aberta, resolva-a junto (mesmo raciocínio:
pendente primeiro, depois a tarefa pedida, relatando as duas).

### ⏳ PENDÊNCIA COM PRAZO (2026-10-28) — indexação manual de `/termos`
- Em 27/10/2026 as páginas `/privacidade` e `/termos` foram criadas e o `sitemap.xml` reenviado
  ("Sitemap enviado", **3 → 5 páginas encontradas**). A indexação manual de `/privacidade` foi
  pedida; a de **`/termos` devolveu "A cota foi excedida"** (limite diário do Google).
- **Em 2026-10-28:** abrir a inspeção de URL de `https://noivajoiasmt.vercel.app/termos` e clicar
  em "Solicitar indexação". Se a cota ainda estiver excedida, repetir no dia seguinte.
- **Não é urgente:** as duas páginas já estão no sitemap, então o Google as encontra sozinho.

## Verificação do anunciante do Google Ads (conta 841-847-7591) — CONTEXTO PERMANENTE

A conta do Google Ads `841-847-7591` (Google Ads, CNPJ 31.186.957/0001-06) está **pausada** até
passar da verificação do anunciante. O Google compara **documento ⇔ perfil de pagamentos ⇔ campos
do formulário ⇔ site**, e o site precisa mostrar os dados da empresa.

- **Nome da conta:** "ALEX IMPORTS MT" (renomeado de "Etevalda Alianças MT" em 27/10/2026). É o
  *nome de fantasia* do Cartão CNPJ — alinha conta = documento = perfil de pagamentos. A marca
  **Noiva Joias MT** é a do cliente (site/anúncio/WhatsApp) e não depende do nome da conta.
- **Endereço oficial (Cartão CNPJ):** Rua Santa Terezinha, **nº 31**, Dom Aquino, Cuiabá/MT,
  CEP 78.015-140. **O Alvará municipal de 10/10/2024 registra nº 31B** — divergência real entre
  os dois documentos; ao responder o formulário, usar **31** e anexar os dois documentos.
- **Documentos aceitos no Brasil:** Licença comercial, Extrato do CNPJ, Certificado de MEI + RG/CNH
  do representante. Análise leva de 1 a 10 dias.
- **Páginas legais (criadas em 27/10/2026):** `/privacidade` (LGPD) e `/termos` (CDC). **Não
  remover** — o formulário pede link de política de privacidade e o site precisa ter endereço.
- **Regra de ouro:** qualquer mudança de nome, CNPJ, endereço ou dono no site precisa ser
  refletida nas duas páginas legais **e** no rodapé de todas as páginas, senão a verificação
  reprova de novo.

## Capacidades já testadas e aprovadas (registrar aqui também, não só no CHANGELOG)
- **Preço no servidor (checkout):** `/api/checkout` ignora o preço que vier do navegador e cobra o de `api/_lib/catalogo-precos.json` (gerado por `scripts/gerar_catalogo_precos.js` a partir do `index.html` + `masculino.html`). Produto fora do catálogo = 400. Testado com 18 casos locais (2026-10-22).
- **Etiqueta de envio dos Correios:** baixa o PDF `Rotulo_<RASTREIO>.pdf` do e-mail dos Correios via Gmail/IMAP (himalaya). Script: `0-FUNCIONARIOS-DE-IA\PAINEL\baixar_rotulo_correios.py`. Só o rótulo interessa; o script descarta os anexos PNG "inline" (lixo). Detalhes no `CHANGELOG.md` (entrada 2026-10-13 tarde).
- **Melhor Envios (cotação + etiqueta + rastreio) no ar:** token JWT na env `ME_API_TOKEN` da Vercel (origem: `C:\Users\rodri\OneDrive\Documents\00-VIDA-ALEX\melhor_envio\.env`, chave `token`). Remetente em `ME_SENDER_*` (Rua Santa Terezinha, 31 — Dom Aquino, Cuiabá/MT, 78015-140, titular PF). Teste sem gastar saldo: `node scripts/testar_melhor_envio.js`.
  - **Unidades da API (não errar de novo):** dinheiro em **REAL** (38.94 = R$ 38,94 — não dividir por 100); peso do volume em **kg**; medidas do volume em **cm, de 1 a 300** (0,5 nas três é recusado com 422); número do endereço no campo **`number`** (não `location_number`).
  - O carrinho (`POST /me/cart`) **não gasta saldo**; o gasto é no checkout. Por isso o fluxo pede confirmação antes de comprar a etiqueta.
  - Ações do dono (`GET`, `cotar`, `etiqueta`) exigem header `x-owner-token` com a env `OWNER_TOKEN` (valor no `.env.local` da máquina, fora do Git).
- **Galeria de fotos nos itens do catálogo (`index.html`):** o item pode declarar `fotos: ['<url1>', '<url2>']` — essa lista manda sobre a detecção automática por nome de arquivo. O card ganha setinhas discretas nas laterais (CSS `.mi-gallery*`), bolinhas de posição e contador "1 / 2"; funciona com clique, teclado e arrasto no celular.
- **Visor ampliado da foto (`index.html`):** clicar na foto (no catálogo principal ou no item da coleção que abre por cima da página) abre a foto grande na tela do cliente, com nome do produto, preço, parcelamento e os botões "Comprar — Frete Grátis" e "Falar com o entregador" (WhatsApp com a mensagem pronta). Com 2+ fotos, as setinhas, o teclado (← →) e o arrasto no celular trocam a foto também. Fechar com `Esc` ou no X. CSS `.lbx*`.
- **Preparo de foto de produto (`scripts/preparar_fotos_produto.py`):** comando único que converte as fotos (1000×1000 webp q90, branco → preto do catálogo, borda preta de 4 px), publica no R2, confere a URL pública e imprime o bloco do produto para o `index.html`.
- **Subir foto no R2 sem credencial S3:** com o `wrangler` logado no PC do dono, `env -u CLOUDFLARE_API_TOKEN npx wrangler r2 object put etevalda/<chave> --file=<arquivo> --remote` sobe direto no bucket `etevalda`. O `env -u` é obrigatório: a variável `CLOUDFLARE_API_TOKEN` do ambiente está inválida (401) e faz o `wrangler` abortar o login.