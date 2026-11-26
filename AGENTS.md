> **Esta pasta é um departamento da empresa do Alex (pasta `GERAL` do Google Drive).** Cargo: Responsável pelo site da Noiva Joias MT.
> Antes do resto deste arquivo, leia a ficha `00-FUNCIONARIO.md` (nesta pasta) e o `APRENDIZADOS.md`, se existir: eles dizem por onde começar e com quais outros departamentos este se liga.
> O chefe-geral e as regras de qualquer IA ficam na raiz da GERAL: `..\AGENTS.md`, `..\LEIA-ME_PARA_QUALQUER_IA.md` e `..\00-ORGANOGRAMA.md` (no PC: `G:\Meu Drive\GERAL`).
> Se você só enxerga esta pasta e a tarefa depende de outro departamento, não adivinhe: diga ao Alex qual departamento falta. (Nota de 17/11/2026.)

# Projeto Noiva Joias MT — site de alianças

**Caminho:** `G:\Meu Drive\GERAL\NOIVA_JOIAS_MT` (Google Drive — a pasta antiga em Documentos não é mais usada)

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

## Regra de ouro das fotos (23/11/2026 —Aprendizado que evitou o "borrão preto")
Existem **dois tipos de foto de produto**, e eles se comportam diferente:
- **Recorte de catálogo** (aliança, anel, brinco isolado): fundo branco → o script troca o branco pelo preto do catálogo.
- **Foto de cenário** (relógio na mão, na mesa, na vitrine): fundo **real**. A regra antiga pintava de preto todo pixel claro (≥ 238) e atingia o **reflexo claro dentro do produto** — cristal virava mancha, manga branca virava bordinho, luz de fundo virava borrão. O cliente achava que a foto estava "borrada".

**Obrigatório em qualquer trabalho com foto:**
1. **Nunca subir foto já processada.** As cópias em `PDFs/img/` **já têm** o artefato — não servem de original nem de conferência. Pegue o arquivo bruto.
2. **Sempre pelo script.** Desde 23/11/2026, `scripts/preparar_fotos_produto.py` pinta de preto só o branco de **fundo** (pixel claro ligado à borda da foto), nunca o reflexo dentro do produto. O catálogo de alianças continua igual.
3. **Conferir contra o original antes de publicar.** O teste que prova: processar o candidato com o pipeline e comparar com a foto publicada — erro médio baixo (≈ 1 a 4 de 255) significa que é o original certo. Cuidado com PNG **com transparência**: o script cola o PNG sobre fundo preto ANTES da regra.
4. **Conserto de foto já publicada:** subir **na mesma chave** do R2 (`<colecao>-<slug>-<n>.webp`) — o link não muda, não duplica arquivo e nenhum link já enviado ao cliente quebra. Depois, conferir os bytes no ar contra os do arquivo local.

**Originais dos relógios:** `E:\TUDO RELÓGIOS\RELOGIO-NOIVA-JOIAS-MT\RELOGIOS-NOIVA-JOIAS-{MASCULINO,FEMININO}`, `E:\TUDO RELÓGIOS\RELOG {MASC,FEMIN}\FOTOS` e `E:\TUDO ALIANCA\ORIGINAIS PRODUTOS SITE\produtos_relogio*`.

Detalhes e histórico: `APRENDIZADOS.md` (23/11/2026) e `COMO-COLOCAR-PRODUTO-NO-SITE.md`.

## Regra de ouro dos VÍDEOS (26/11/2026 — vale para TODOS os sites do Alex)
Regra completa e única: **`G:\Meu Drive\GERAL\REGRAS-VIDEOS-E-FOTOS-NOS-SITES.md`**. Resumo obrigatório, sem o dono precisar pedir:
1. **Sempre comprimir antes de subir:** H.264 2 passagens, máx. 540 px, 24 fps, alvo 70% do bitrate (teto 420k), AAC 64k, `+faststart`; conferir SSIM ≥ 0,95. Áudio mudo → `-an`. Fornecedor > 60 s → cortar para 30 s.
2. **Conferir se já está no ar** (mesmo nome/duração/imagem) antes de subir de novo.
3. Ligar o `video:` **no item da vitrine `PRODUTOS` E no item de mesmo nome em `COLECOES[...].itens`** — senão não aparece na categoria.
4. R2: backup do original em `backup-videos-AAAAMMDD/`, trocar na mesma chave, subir `?v=N` no link.
5. Visor: abre no vídeo mudo; nenhum botão no meio; tocar no vídeo liga o som.
6. Depois de publicar, abrir a **rota da categoria** (ex.: `/aliancabanhadas`) e ver os vídeos tocando.

## Regra de ouro: valide o JavaScript antes de publicar (25/11/2026)

O `index.html` é um HTML único com ~4.000 linhas de JavaScript inline (arrays
`PRODUTOS` e `COLECOES` + o site inteiro). **Um único erro de sintaxe nesse
script derruba o catálogo todo**: a página abre, o banner e o menu funcionam,
mas **nenhum produto e nenhuma foto aparecem** — o `#catalogo` fica vazio.
Em 25/11/2026 dois commits publicaram o site exatamente assim; só o console do
navegador denunciou (`SyntaxError: Unexpected token '}'`).

**Antes de todo `git commit` que mexer no `index.html`:**

1. Validar a sintaxe do script inline com o Node:

   ```bash
   node --check <arquivo com o script inline extraído do index.html>
   ```

2. Testar no navegador (o site local ou o ar): **zero erro no console** e
   `document.querySelectorAll('#catalogo article').length` **> 0**.

**Armadilhas que quebram o catálogo (já aconteceram):**
- apagar a linha `],` que fecha a lista `itens` de uma coleção;
- esquecer a vírgula entre dois itens (o último item da lista precisa terminar com `,`);
- editar o `index.html` com regex gulosa sobre o arquivo inteiro (já apagou
  3.363 linhas uma vez) — editar por **linha/índice** e conferir `git diff --stat`.

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

> 🧠 **Status vivo do caso (etapa atual, linha do tempo, documentos enviados):** `G:\Meu Drive\GOOGLE-ADS\STATUS_VERIFICACAO.md`.
> Leia antes de mexer em nome, CNPJ, endereço ou rodapé, e atualize-o quando algo mudar.
> A empresa é **ME (não MEI)**: o site precisa mostrar a razão social ALEX RODRIGUES FERNANDES DE MELO no rodapé de todas as páginas.

A conta do Google Ads `841-847-7591` (Google Ads, CNPJ 31.186.957/0001-06) está **pausada** até
passar da verificação do anunciante. O Google compara **documento ⇔ perfil de pagamentos ⇔ campos
do formulário ⇔ site**, e o site precisa mostrar os dados da empresa.

- **Nome da conta:** "ALEX IMPORTS MT" (renomeado de "Etevalda Alianças MT" em 27/10/2026). É o
  *nome de fantasia* do Cartão CNPJ — alinha conta = documento = perfil de pagamentos. A marca
  **Noiva Joias MT** é a do cliente (site/anúncio/WhatsApp) e não depende do nome da conta.
- **Endereço oficial:** Rua Santa Terezinha, **nº 31B**, Dom Aquino, Cuiabá/MT, CEP 78.015-140.
  Confirmado em **dois documentos atuais, ambos de 10/10/2024**: o Cartão CNPJ (emitido 10/10/2024,
  campo "NÚMERO" = **31B**) e o Alvará/2024 da Prefeitura de Cuiabá ("Rua Santa Terezinha, **31B** —
  Bairro: Dom Aquino — CEP: 78015140 — Cuiabá — MT"). O Cartão CNPJ de **2020**, ainda arquivado,
  dizia nº **31** — está **desatualizado**, não usar. O nº 31B é o que está no rodapé do site e no
  JSON-LD.
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
- **Melhor Envios (cotação + etiqueta + rastreio) no ar:** token JWT na env `ME_API_TOKEN` da Vercel (produção e preview). Origem do token (18/11/2026, pedido do dono): `G:\Meu Drive\MELHOR ENVIOS TOKEN ACESSO TOTAL\TOKEN.txt` (o dono pediu para o arquivo continuar nesse caminho; o `.env` antigo do OneDrive não existe mais). Remetente em `ME_SENDER_*` (Rua Santa Terezinha, 31 — Dom Aquino, Cuiabá/MT, 78015-140, titular PF). Teste sem gastar saldo: `node scripts/testar_melhor_envio.js`.
  - **Unidades da API (não errar de novo):** dinheiro em **REAL** (38.94 = R$ 38,94 — não dividir por 100); peso do volume em **kg**; medidas do volume em **cm, de 1 a 300** (0,5 nas três é recusado com 422); número do endereço no campo **`number`** (não `location_number`).
  - O carrinho (`POST /me/cart`) **não gasta saldo**; o gasto é no checkout. Por isso o fluxo pede confirmação antes de comprar a etiqueta.
  - Ações do dono (`GET`, `cotar`, `etiqueta`) exigem header `x-owner-token` com a env `OWNER_TOKEN` (valor no `.env.local` da máquina, fora do Git).
- **Galeria de fotos nos itens do catálogo (`index.html`):** o item pode declarar `fotos: ['<url1>', '<url2>']` — essa lista manda sobre a detecção automática por nome de arquivo. O card ganha setinhas discretas nas laterais (CSS `.mi-gallery*`), bolinhas de posição e contador "1 / 2"; funciona com clique, teclado e arrasto no celular.
- **Visor ampliado da foto (`index.html`):** clicar na foto abre o visor com nome, preço, parcelamento, notas reais do produto, "Adicionar ao carrinho", "Comprar — Frete Grátis" e "Falar com o atendente". Há ajuda de medida/entrega. Com 2+ fotos, setas, teclado (← →) e arrasto trocam a foto. `Esc`, X ou Voltar fecham primeiro a camada superior, sem perder a coleção. CSS `.lbx*`.
- **Preparo de foto de produto (`scripts/preparar_fotos_produto.py`):** comando único que converte as fotos (1000×1000 webp q90, branco → preto do catálogo, borda preta de 4 px), publica no R2, confere a URL pública e imprime o bloco do produto para o `index.html`.
- **Subir foto no R2 sem credencial S3:** com o `wrangler` logado no PC do dono, `env -u CLOUDFLARE_API_TOKEN npx wrangler r2 object put etevalda/<chave> --file=<arquivo> --remote` sobe direto no bucket `etevalda`. O `env -u` é obrigatório: a variável `CLOUDFLARE_API_TOKEN` do ambiente está inválida (401) e faz o `wrangler` abortar o login.
- **Carrinho para WhatsApp (`index.html`, 2026-10-27):** guarda identificadores/quantidades em `noivajoias_carrinho_v1`, por até 30 dias, com subtotal em centavos, sanitização, remoção e limites de 40 modelos/99 unidades. Cidade e observações são opcionais e não são persistidas. "Enviar pedido no WhatsApp" prepara o resumo; não confirma pagamento nem faz cobrança múltipla. Checkout online individual protegido pelo catálogo continua existente.
- **Navegação da loja (`index.html`, 2026-10-27):** cabeçalho persistente com busca sem acentos, menu das nove coleções, central de atendimento e carrinho; filtros opcionais de categoria/preço e ordenação. A vitrine longa e misturada permanece inteira por padrão. Nunca trocar por paginação, ocultar dados legais ou exigir cadastro sem pedido do dono.
- **Banners e música (`index.html`, 2026-10-27):** três banners com fotos reais do próprio catálogo e condições locais/nacionais distintas; controles de pausa, respeito a movimento reduzido e interrupção em overlays. Música ambiente é opcional, só inicia no botão do rodapé; não destravar áudio ao tocar qualquer lugar da página.
- **Métricas de intenção (`index.html`, 2026-10-27):** adicionar modelo = `AddToCart`; abrir checkout/enviar seleção = `InitiateCheckout`; WhatsApp = `Contact`. Nunca disparar `Purchase` só por clique, rolagem ou tempo na página; compra confirmada pertence ao fluxo de pagamento.
- **Vídeo do topo (VSL):** fica no R2 (`vsl-noiva-fernandes.mp4` + `-poster.jpg`) e é tocado pelo bloco `#vsl` do `index.html` (começa mudo, botão reinicia com som). Para trocar o vídeo: subir o novo arquivo no bucket `etevalda` com o mesmo nome (ou trocar o `src` do `<video id="vslVideo">`). Sem wrangler, dá para subir pelo painel do R2 (botão Upload) no Chrome logado. O domínio do R2 precisa estar no `media-src` da CSP do `vercel.json`.
- **Painel do dono (`/painel`, 2026-11-18):** login por senha na env `PANEL_SENHA` da Vercel (produção). A senha foi gerada em 18/11/2026 e está no cofre: `GERAL\CREDENCIAIS-SEGURAS\chaves\APIs\SENHA-PAINEL-NOIVA-JOIAS.txt`. Sem ela o dono não entra no painel e não gera a etiqueta dos Correios. Trocar a senha = gerar outra e gravar na Vercel + no cofre.
- **Métricas por canal (2026-11-17):** link de divulgação SEMPRE com `?nj=<canal>` (só letras e números; `youtube`, `pinterest`, `desapega`, `tiktok`, `instagram`, `facebook`, `kwai`, `gmn`; nunca `mt`, que é reservado, nem começar com `gads`, que é do Google Ads). `nj-metricas.js` → `/api/t` → tabela `eventos`; `/zap?nj=<canal>` = link direto para o WhatsApp contando o clique; resumo em `/api/metricas` (chave no cofre). Página nova do site precisa carregar `/nj-metricas.js` logo depois do `/gads.js`. Manual e painel: `G:\Meu Drive\GERAL\METRICAS-CANAIS\`.
- **Blindagem das métricas (2026-11-18):** contar só gente de verdade. Visita exige 3 s na tela + comportamento humano ou vinda de link externo; clique no WhatsApp exige clique real (`e.isTrusted`); `/zap` conta só se veio de link externo ou se a pessoa apertou o botão; no servidor, hash anônimo de IP+user-agent bloqueia rajadas de automação (apaga os eventos e bloqueia a origem por 1 h); checkout/compra exigem visita anterior. `INICIO` em `api/_lib/eventos.js` marca de quando o resumo conta. Para zerar de novo, mudar essa data.
- **Mensagem do WhatsApp moldada (2026-11-17):** `&p=<código>` no link diz qual produto o anúncio mostra; os códigos e textos ficam SÓ em `nj-produtos.js`. O dono vai anunciar outros produtos além de alianças: quando ele trouxer um, acrescentar a linha lá (não espalhar texto de produto pelos HTML) e avisar o manual `GERAL\METRICAS-CANAIS\LEIA-ME.md`. Contagem: navegador interno com `?nj_interno=1`, testes com canal `teste...`, `INICIO` em `api/_lib/eventos.js`.
