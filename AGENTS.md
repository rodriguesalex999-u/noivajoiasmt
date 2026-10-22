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
- Páginas: `index.html` (loja) e `faq.html` (dúvidas frequentes) — ambas autocontidas, sem build
- Fonte canônica da FAQ: `faq.html` nesta pasta. A cópia em `..\FAQ - PERGUNTAS FREQUENTES\FAQ-NOIVA-JOIAS-MT\index.html` é rascunho — sempre editar o `faq.html` e rodar o commit + push na `main` (deploy automático)
- Rotas: `/faq` → `faq.html` (rewrite em `vercel.json`); os demais caminhos caem no `index.html`
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
3. **PDF** — `python PDFs/build_catalog_solitarios.py` (lê o `index.html`; falha se a quantidade de itens mudar).
4. **Fechar** — `CHANGELOG.md` + commit + push na `main`. Fotos e PDFs **não** entram no repositório.

## Capacidades já testadas e aprovadas (registrar aqui também, não só no CHANGELOG)
- **Etiqueta de envio dos Correios:** baixa o PDF `Rotulo_<RASTREIO>.pdf` do e-mail dos Correios via Gmail/IMAP (himalaya). Script: `0-FUNCIONARIOS-DE-IA\PAINEL\baixar_rotulo_correios.py`. Só o rótulo interessa; o script descarta os anexos PNG "inline" (lixo). Detalhes no `CHANGELOG.md` (entrada 2026-10-13 tarde).
- **Melhor Envios (cotação + etiqueta + rastreio) no ar:** token JWT na env `ME_API_TOKEN` da Vercel (origem: `C:\Users\rodri\OneDrive\Documents\00-VIDA-ALEX\melhor_envio\.env`, chave `token`). Remetente em `ME_SENDER_*` (Rua Santa Terezinha, 31 — Dom Aquino, Cuiabá/MT, 78015-140, titular PF). Teste sem gastar saldo: `node scripts/testar_melhor_envio.js`.
  - **Unidades da API (não errar de novo):** dinheiro em **REAL** (38.94 = R$ 38,94 — não dividir por 100); peso do volume em **kg**; medidas do volume em **cm, de 1 a 300** (0,5 nas três é recusado com 422); número do endereço no campo **`number`** (não `location_number`).
  - O carrinho (`POST /me/cart`) **não gasta saldo**; o gasto é no checkout. Por isso o fluxo pede confirmação antes de comprar a etiqueta.
  - Ações do dono (`GET`, `cotar`, `etiqueta`) exigem header `x-owner-token` com a env `OWNER_TOKEN` (valor no `.env.local` da máquina, fora do Git).
- **Galeria de fotos nos itens do catálogo (`index.html`):** o item pode declarar `fotos: ['<url1>', '<url2>']` — essa lista manda sobre a detecção automática por nome de arquivo. O card ganha setinhas discretas nas laterais (CSS `.mi-gallery*`), bolinhas de posição e contador "1 / 2"; funciona com clique, teclado e arrasto no celular.
- **Visor ampliado da foto (`index.html`):** clicar na foto (no catálogo principal ou no item da coleção que abre por cima da página) abre a foto grande na tela do cliente, com nome do produto, preço, parcelamento e os botões "Comprar — Frete Grátis" e "Falar com o entregador" (WhatsApp com a mensagem pronta). Com 2+ fotos, as setinhas, o teclado (← →) e o arrasto no celular trocam a foto também. Fechar com `Esc` ou no X. CSS `.lbx*`.
- **Preparo de foto de produto (`scripts/preparar_fotos_produto.py`):** comando único que converte as fotos (1000×1000 webp q90, branco → preto do catálogo, borda preta de 4 px), publica no R2, confere a URL pública e imprime o bloco do produto para o `index.html`.
- **Subir foto no R2 sem credencial S3:** com o `wrangler` logado no PC do dono, `env -u CLOUDFLARE_API_TOKEN npx wrangler r2 object put etevalda/<chave> --file=<arquivo> --remote` sobe direto no bucket `etevalda`. O `env -u` é obrigatório: a variável `CLOUDFLARE_API_TOKEN` do ambiente está inválida (401) e faz o `wrangler` abortar o login.