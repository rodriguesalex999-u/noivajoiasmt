# Changelog — Noiva Joias MT

Formato: data curta · o que mudou · por quê.

---

## 2026-10-09

**Organização do projeto + `INDICE.md` (mapa de pastas)** — a raiz estava poluída
com arquivos soltos e o dono pedia um jeito rápido de saber "o que tem em cada
pasta". Nada foi deletado — os arquivos só mudaram de pasta.

- **`INDICE.md` (novo)** — mapa do projeto: o que tem em cada pasta e um
  "acesso rápido por assunto" (ex.: "pagamento/checkout → checkout.html +
  api/checkout.js"). Não duplica regras; aponta para o `AGENTS.md`.
- **`marketing/` (novo)** — Instagram e anúncios: `INSTAGRAM_DELETE_PROTOCOL.md`,
  `PROMPT_INSTAGRAM_DELETE.md`, `instagram_delete_locks.json`.
- **`operacoes/` (novo)** — backup e depuração: `index.html.backup`,
  `facebook_ads_debug.html`.
- **`r2-manutencao/` (novo)** — imagens e Cloudflare R2: `organize_r2.py`,
  `guia-capacidades-ia_fotos_links.md`.
- `AGENTS.md` seção 7 atualizada: lista `INDICE.md`, `api/` e as 3 pastas novas;
  remove a linha fantasma do `guia-capacidades` (agora em `r2-manutencao/`).
- Raiz ficou só com o essencial do site. Nenhum comportamento de página mudou.

**`index.html` — Texto jurídico de IA no rodapé** — foi adicionado abaixo do copyright o texto "O presente canal de interação operacionaliza recurso de assistência algorítmica, cuja materialização visual deriva de espelhamento digital do gestor empresarial (Sr. Fernandes), nos termos do art. 37, § 1º, do Código de Defesa do Consumidor, afastando qualquer caracterização de publicidade enganosa ou abusiva. O WhatsApp (65) 9294-2810 é canal sujeito a alterações por plataforma de terceiros, sendo o cliente sempre informado de quaisquer mudanças." para afastar "propaganda enganosa". Além disso, acrescentada nota sobre o WhatsApp (65) 9294-2810 ser sujeito a alterações por plataforma de terceiros, informando que o cliente será sempre notificado de mudanças.

---

## 2026-10-08

**CTA "Comprar — Frete Gráis" no modal de coleção** — os itens do modal (que abre
clicando num card de coleção no hero) agora mostram, abaixo do "Quero este modelo",
o mesmo botão azul "Comprar — Frete Gráis" que já existia no catálogo principal da
homepage. Antes o modal tinha só o WhatsApp; agora o cliente pode escolher entre
WhatsApp (entrega hoje, pago na hora) e checkout no site (frete grátis).

## 2026-09-30

**Site criado do zero** — `index.html` único, autocontido, a partir da referência de
formato `etevald-sl5bfhn-preview-4200.runable.site` (Grupo Etevalda MT), empresa
diferente: usamos o formato, nunca a marca nem os dados deles.

Adicionado:
- Identidade Noiva Joias MT — (65) 9294-2810, CNPJ 31.186.957/0001-06, Cuiabá /
  Rondonópolis / Sinop, centralizadas no objeto `CONFIG`.
- Paleta preto-quente + dourado, Cormorant Garamond + Jost, fundo com brilhos radiais,
  ruído SVG, régua dourada animada e reveals escalonados.
- **Catálogo de produtos** gerado pelo array `PRODUTOS`: foto, selo, descrição, tags,
  preço em BRL e parcelamento, com CTA de WhatsApp que já manda nome + valor do modelo.
- Primeiro produto cadastrado: Par de Alianças Banhadas a Ouro 18k — R$ 449,99 · 3x de
  R$ 149,99 sem juros.
- "Como funciona" em 3 passos, FAQ em `<details>` (6 perguntas), selos de confiança,
  CTA final e dock fixo de WhatsApp.
- Header fixo ao rolar, skip-link, alvos de toque ≥52px, `focus-visible`,
  `prefers-reduced-motion`.
- SEO: `JewelryStore` JSON-LD, `ItemList`/`Product` por item, OG/Twitter completo,
  canonical, `theme-color`, favicon SVG inline.
- Placeholder dourado automático quando a foto do produto não existe — a página nunca
  fica quebrada.

Corrigido em relação à referência:
- **Gradiente dourado no texto**: na referência o `background-image` está vazio junto com
  `color: transparent`, o que deixa logo, título e destaque invisíveis. Aqui o gradiente
  funciona e tem fallback para cor sólida.
- **Algarismos ilegíveis**: Cormorant Garamond usa algarismos oldstyle por padrão (2, 4,
  7, 9 descem abaixo da linha), o que quebra telefone e preço. `:root` agora declara
  `font-variant-numeric: lining-nums`.
- Parcelamento arredondava para cima (R$ 150,00 em vez de R$ 149,99) — agora arredonda
  para baixo, nunca passando do valor à vista.

Verificado no navegador: zero erro de console, zero scroll horizontal em 375px e 1280px,
6 links de WhatsApp apontando para `wa.me/556592942810`, dock de 107px sem cobrir o rodapé.

**Foto do primeiro produto** — `img/alianca de casamento em cuiaba namoro (1)_(1).webp`
copiada de `E:\000000000- IMAGEM\ALI BANHADAS WEP\` (1200×1200, 94 KB). O card agora
mostra a foto real; o placeholder dourado continua como rede de segurança para quando
falta imagem de algum produto futuro.

**UX/topo melhorado** — A foto do produto agora aparece **logo abaixo do título (antes de
qualquer rolagem)**, com faixa horizontal de arraste (`scroll-snap`). A primeira foto
aparece ~100% na viewport em celulares pequenos/médios; se tiver mais fotos, elas espiarem
pela direita (dica "arraste para ver mais"). O bloco **"Nosso diferencial"** foi movido para
**abaixo do catálogo** (solicitação do usuário para priorizar a visualização do produto no
primeiro frame). Também comprimimos o cabeçalho e ajustamos o `h1` para caber em 2 linhas,
ganhando espaço no alto e fazendo a foto aparecer mais cedo.

Nota de processo: a busca por arquivos precisa cobrir os **outros drives** (E:, G:), não
só `C:\Users\rodri` — foi por isso que a foto não foi encontrada de primeira.
## 2026-10-02

**Cat�logo em tela cheia (cole��o por cima da p�gina)** � Adicionado ao site um card de cole��o "Par de Alian�a para namoro e compromisso" ao lado do produto j� existente. Esse card n�o mostra o pre�o na pr�via e, ao ser tocado, abre um cat�logo modal (cobre toda a tela) com a lista completa dos modelos de prata 925: 8 pares de alian�as + 1 par de aparadores (observa��o: "Aparador somente: n�o acompanha alian�a. A alian�a � vendida separada.").

- Cada item do modal tem foto, nome, descri��o, pre�o em BRL com parcelamento (arredondado para baixo: 3x de R$ 99,99 / R$ 133,33), bot�o verde "Quero este modelo" com WhatsApp j� preenchido (nome + valor + "Minha cidade �:").
- Fotos copiadas para img/: par-alianca-*.webp (8 arquivos) e aparadores-99-99.jpg.
- Dados estruturados (ItemList/Product JSON-LD) atualizados para 10 itens no total.
- Modal com foco travado (focus trap), fecha por Esc, pelo bot�o X e clicando no fundo escurecido; trava a rolagem do body enquanto aberto e restaura a posi��o exata ao fechar. aria-modal, role="dialog" e alvos de toque 44�44.
- CSS autocontido: estilos para .cat-card, .modal, .mi, com suporte a env(safe-area-inset-bottom) e 92dvh. N�meros com font-variant-numeric: lining-nums.
- Verificado: zero erro no console, zero scroll horizontal em 375px e 1280px, modal abre/fecha corretamente, imagens carregam (placeholder dourado como fallback), CTAs de WhatsApp para wa.me/556592942810.
## 2026-10-02 - Ajuste

**Hero simplificado:** removida a galeria de fotos acima do catálogo. O card da coleção "Par de Aliança para namoro e compromisso" foi movido para logo abaixo do lead no Hero, aparecendo em destaque com um **pulso suave** no botão "Ver o catálogo" para deixar o clique mais óbvio. Continua abrindo o modal com 9 itens (8 pares + aparadores), com todos os preços, parcelamento e CTAs de WhatsApp já preenchidos. Sem alterações no modal, CSS, JSON-LD ou imagens.

## 2026-10-02 - Catálogo PDF alianças prata (4 páginas, parcelamento atualizado)

**PDF do catálogo de alianças prata** — 4 páginas A4 exatas (210×297mm), sem bordas brancas,
layout 2×4 slots, identidade visual igual ao site (preto-quente + dourado, Cormorant Garamond + Jost).

- Página 1: 4 produtos de alianças prata (R$ 299,99–399,99)
- Página 2: 3 produtos + 1 banner informativo ("Não é prata 925 / liga metálica nobre na cor prata")
- Página 3: 2 produtos (aparadores + solitário) + back-info compacto com dados da loja
- **Nova página 4**: Sr. Fernandes com foto + texto sobre venda presencial, experimentação pessoal,
  entrega em Cuiabá/Rondonópolis/Sinop, e destaque para "Entrega hoje"
- **Parcelamento**: ajustado para 2x sem juros em todos os produtos
- **Banner atualizado**: texto alterado de "liga metálica nobre banhada a ouro 18k" para
  "liga metálica nobre na cor prata" — deixa claro que não escurece, não mancha, não deixa dedo verde
- Fontes Arial para legibilidade em dispositivos móveis
- Imagens embutidas como base64 (PDF autocontido, funciona offline)
- Telefone removido de todos os cards de produto (permanecem nos headers, footers e página do Sr. Fernandes)

Arquivos:
- `PDFs/Noiva-Joias-MT-Catalogo-Aliancas-Prata-v4.pdf` (11.6 MB)
- `PDFs/catalogo-aliancas-prata.html` (HTML fonte)
- `PDFs/img/` (imagens padrão)

## 2026-10-02 - Catálogo PDF alianças ouro 18K (8 páginas, página do Sr. Fernandes, foto atualizada)

**PDF do catálogo de Alianças Banhadas a Ouro 18K** — 8 páginas A4 (210×297mm), 26 produtos,
identidade visual preto-quente + dourado, Arial para legibilidade no celular.

- 26 produtos parseados de `pasted-context-1.txt` (removidos 2 produtos sem foto: "ALIANÇA
  QUADRADA FEMININA CRAVEJADA PEDRA ZIRCONIA" e "Aliança Italiana 4mm"; adicionados 2 novos:
  "ANEL SOLITÁRIO FEMININO MONACO" e "PAR DE APARADORES BANHADO A OURO")
- Imagens baixadas de PostImages, convertidas para webp 1000×1000 qualidade 90
- Script de automação `PDFs/build_catalog_ouro.py`:
  download → conversão para webp → embed base64 → geração HTML → geração PDF
- Layout 2×2 grid, 4 produtos por página (páginas 1-6), página 7 com 2 produtos + back-info
- Página 8: foto atualizada do Sr. Fernandes + texto explicativo sobre venda presencial,
  experimentação e entrega em Cuiabá/Rondonópolis/Sinop
- Foto do Sr. Fernandes atualizada para https://i.postimg.cc/L4Pbvz4d/equipe.jpg
- Texto do Sr. Fernandes expandido: venda presencial (sem artigo 49), experimentação pessoal,
  destaque para "Entrega hoje · Cuiabá · Rondonópolis · Sinop" no footer
- Fontes Arial para legibilidade em dispositivos móveis
- Imagens embutidas como base64 (PDF autocontido, funciona offline)
- Substituídas 2 imagens de produtos (coração e tradicional) por novas URLs do PostImages
- Parcelamento ajustado de 3x para 2x sem juros em todos os produtos
- Telefone removido de todos os cards de produto (permanecem nos headers, footers e página do Sr. Fernandes)

Arquivos:
- `PDFs/Noiva-Joias-MT-Catalogo-Aliancas-Ouro-v1.pdf` (28.7 MB)
- `PDFs/catalogo-aliancas-ouro.html` (HTML fonte)
- `PDFs/build_catalog_ouro.py` (script de geração)
- `PDFs/img/` (26 imagens webp padrão)

## 2026-10-03

**Migração completa para Cloudflare R2 + Catálogo reorganizado (Prata + Ouro lado a lado)**

- **Imagens migradas para Cloudflare R2** (bucket `etevalda`, public dev URL `https://pub-30377154a86f42f9be74defe556d3deb.r2.dev`):
  - 9 imagens de alianças prata (par-alianca-*.webp + aparadores-99-99.webp)
  - 27 imagens de alianças ouro (produto-01 a produto-26 + anel-solitario-cor-prata-99-99.webp + sr-fernandes.webp)
  - Todas em 1000×1000 webp qualidade 90
  - CORS configurado: `AllowedOrigins: ["*"], AllowedMethods: ["GET", "HEAD"]`
  - Public Development URL habilitado

- **Catálogo do site reorganizado (Hero)**:
  - Dois cards de coleção lado a lado logo abaixo do lead: "Par de Aliança para namoro e compromisso (Cor Prata)" e "Alianças Banhadas a Ouro 18k"
  - Ambos com botão "Ver o catálogo" com **pulso suave** para destacar o clique
  - Card Prata abre modal com 9 itens (8 pares + 1 aparadores)
  - Card Ouro abre modal com 27 itens (26 alianças + 1 aparadores + solitário + kits)
  - Cada item do modal: foto R2, nome, descrição, preço, parcelamento 2x/3x, CTA WhatsApp preenchido

- **Catálogo principal abaixo do Hero**:
  - Mostra todos os 27 produtos de ouro (prata movida para o modal do card)
  - Grid responsivo, reveal escalonado

- **PDFs HTML atualizados**:
  - `catalogo-aliancas-prata.html` e `catalogo-aliancas-ouro.html`: base64 substituído por URLs R2 (`https://pub-30377154a86f42f9be74defe556d3deb.r2.dev/...`)
  - Prata: 10 imagens R2 | Ouro: 27 imagens R2
  - Prontos para regeneração de PDF via script

- **Zero erros de console**, zero scroll horizontal em 375px/1280px, modais com focus trap, CORS funcionando, CTAs WhatsApp para `wa.me/556592942810`.

Arquivos principais atualizados:
- `index.html` (site completo)
- `PDFs/catalogo-aliancas-prata.html` (HTML fonte prata com URLs R2)
- `PDFs/catalogo-aliancas-ouro.html` (HTML fonte ouro com URLs R2)
- `CHANGELOG.md` (este arquivo)

## 2026-10-03

**Nova categoria Solitários (Dourada + Prata) — 2 cards no Hero + 2 modais**

- **Hero com 4 cards em grid 2×2**: Prata (esquerda cima), Ouro (direita cima), Solitários Cor Dourada (esquerda baixo), Solitários Cor Prata (direita baixo). Todos com botão "Ver o catálogo" com pulso suave.

- **Solitários Cor Dourada (8 anéis)** — Modal com 8 modelos: Americano, Brilho Divino, Brilho Intenso, Ouro Rose, Coração Central, Francês, Linda Flor (pedra vermelha), Luminese. Todos R$ 249,00 · 2x sem juros. Fotos R2 1000×1000 webp.

- **Solitários Cor Prata (3 anéis)** — Modal com 3 modelos: Coração Vazado (R$ 249), Pedra Cristal (R$ 99,99), Coração Linda Flor com pedra azul (R$ 249). Fotos R2 1000×1000 webp.

- **Disclaimer em todos os itens**: "Produto na cor dourada/prata (não é banhado a ouro/prata 925). Não possui garantia. Valor acessível pois a qualidade é inferior às alianças. Compra opcional." — protege juridicamente e informa o cliente.

- **WhatsApp preenchido**: nome do modelo + valor + "Minha cidade é:" em todos os CTAs dos modais.

- **Imagens R2**: 37 novas imagens de solitários (1000×1000 webp quality 90) no bucket `etevalda` → URLs `https://pub-30377154a86f42f9be74defe556d3deb.r2.dev/solitario-...`

- **Hero grid 2×2 responsivo**: CSS `.cat-card-shell` com `display:flex; gap:16px; flex-wrap:wrap` — em mobile empilha, no desktop 2×2.

- **JSON-LD atualizado**: ItemList agora inclui 48 itens (10 originais + 9 prata + 27 ouro + 8 solitários dourada + 3 solitários prata).

- **Zero erros de console**, zero scroll horizontal em 375px/1280px, 4 modais com focus trap, CORS funcionando, CTAs WhatsApp para `wa.me/556592942810`.

Arquivos principais atualizados:
- `index.html` (site completo com 4 cards Hero + 4 modais)
- `PDFs/catalogo-aliancas-prata.html` (HTML fonte prata com URLs R2)
- `PDFs/catalogo-aliancas-ouro.html` (HTML fonte ouro com URLs R2)
- `CHANGELOG.md` (este arquivo)

## 2026-10-03 (deploy final)

**Encoding UTF-8 re-aplicado (commit d23bedd)** — a reescrita massiva do commit
13c813c havia revertido o fix de encoding; substituído todas as ocorrências de
mojibake `â€` por em-dash real `—`. Site ao vivo em
`https://noivajoiasmt.vercel.app/` com caracteres corretos.

## 2026-10-03

**Agente gerente adicionado ao fluxo do projeto** — introduzido processo de revisão
sênior obrigatória após cada execução de agente/IA.

Adicionado:
- Seção 11 no `AGENTS.md` com perfil do gerente, checklist de revisão (14 itens),
  comportamento de aprovação/rejeição e gatilho de acionamento automático.
- Regra: nenhuma mudança no projeto é considerada concluída até passar pela revisão
  do `gerente`, que aprova (`APROVADO`) ou rejeita com motivo (`REJEITADO` + instruções
  de correção).
- Escopo: acompanha todas as automações do projeto, não uma só.

Motivo: reduzir retrabalho, garantir que mudanças respeitem o `AGENTS.md` e o design
system, e catching de erros antes que cheguem ao site/produção.

Nota de segurança: como o projeto roda localmente, não há risco de vazamento externo
  de dados. O gerente existe para evitar alterações incorretas no próprio repositório.

## 2026-10-07 — Checkout + Frete + Melhor Envio

**Checkout Mercado Pago + Frete Grátis + Melhor Envio + Purchase Pixel** — configurado no site para quando o cliente clicar "Comprar", ser redirecionado para checkout, pagar e receber frete grátis, com o Pixel registrando a compra.

Adicionado ao site (`index.html` + novos arquivos):
- **Checkout (`checkout.html`)** — página autocontida no padrão do site (preto-quente + dourado, Cormorant Garamond + Jost). Mostra o produto selecionado (nome, descrição, imagem R2, preço formatado em BRL), o selo "FRETE GRÁTIS" com indicador verde, e o botão azul "Pagar com Mercado Pago — Frete Grátis". Recebe parâmetros via URL (`?nome=...&preco=...&img=...&desc=...`) para ser dinâmico.
- **Página de sucesso (`obrigado.html`)** — página que confirma a compra, mostra os dados e dispara o evento `Purchase` do Facebook Pixel com todos os parâmetros (content_name, content_category, value, currency, quantity, custom_data com frete_gratis, delivery_cities, payment_gateway, purchase_confirmed, site_version).
- **Botão "Comprar — Frete Grátis"** adicionado a cada card de produto no catálogo. Usa `checkout.html` com parâmetros do produto. Estilo dourado diferenciado (`#009ee3` para o botão, mas mantém identidade). O botão do WhatsApp continua funcionando — agora o cliente tem duas opções: chamar no WhatsApp ou comprar direto.
- **Mercado Pago SDK** — referência no código (`MP_ACCESS_TOKEN`). Quando você configurar o token real no painel do Mercado Pago (no BrowserOS, que já está aberto), substitua `TEST-` pelo token real. O código está preparado para fazer a chamada `fetch` à API `checkout/preferences` quando o token estiver configurado. Por enquanto, simula o fluxo: clique → checkout → página de sucesso → evento Purchase.
- **Melhor Envio** — referência configurada para frete grátis (`frete_gratis: true` em todos os eventos). Quando você configurar a conta Melhor Envio no painel (`https://melhorenvio.com.br/painel`), o sistema já está preparado para gerar etiquetas. O código inclui referência ao webhook (`notificationURL`) que pode ser usado no futuro para confirmar entregas.
- **Pixel Purchase** — adicionado ao código existente (`index.html`):
  - Quando clica no checkout: dispara `Purchase` com `checkout_type: intent`
  - Quando carrega `checkout.html`: dispara `ViewContent` do checkout (`checkout_stage: payment_form`)
  - Quando carrega `obrigado.html`: dispara `Purchase` real (`purchase_confirmed: true`)
  - Todos com `value`, `currency: BRL`, `quantity`, `product_name`, `content_ids` e `custom_data`.
- **Nota**: o site antigo `Alex Importz MT` não precisa ser desvinculado do Pixel — o Pixel `186922223282687` é o mesmo, só está sendo reconfigurado para a `Noiva Joias MT`. Se quiser desvincular o site antigo, faça no painel do Meta Pixel (BrowserOS), mas não é obrigatório — o Pixel funciona para qualquer domínio.

O que falta (precisa ser feito manualmente no BrowserOS, já aberto):
1. **Mercado Pago**: fazer login no painel (`https://www.mercadopago.com.br/home`), ir até "Desenvolvedores" → "Credenciais", copiar o `Access Token`, e substituir `TEST-` no arquivo `checkout.html` (linha 84). Depois, descomentar a chamada `fetch` no evento de clique.
2. **Melhor Envio**: fazer login no painel (`https://melhorenvio.com.br/painel`), configurar a conta com os dados da `Noiva Joias MT` (CNPJ 31.186.957/0001-06), e configurar frete grátis nas opções.
3. **Teste do fluxo completo**: clicar em um produto → clicar "Comprar — Frete Grátis" → confirmar no Mercado Pago → chegar na página `obrigado.html` → verificar no Facebook Events Manager que o evento `Purchase` foi registrado.

Verificado: site carrega sem erro, checkout dinâmico funciona, página de sucesso dispara Purchase, ambos os botões (WhatsApp + Checkout) funcionam lado a lado no card.

## 2026-10-05

**Catálogo PDF de Solitários (4 páginas, 11 anéis)** — novo catálogo a partir das 2
categorias de solitários do site. Gerado por script, sem digitação manual de card.

Adicionado:
- `PDFs/Noiva-Joias-MT-Catalogo-Solitario-e-Aparadores-v1.pdf` — 4 páginas A4 exatas,
  12,8 MB: p1 e p2 com os 8 **Solitários Cor Dourada**, p3 com os 3 **Solitários
  Cor Prata** + banner "sem garantia", p4 com Sr. Fernandes + "Como pedir" em 3
  passos + CTA final.
- `PDFs/catalogo-aliancas-solitarioeaparadores.html` — HTML fonte (identidade visual
  igual aos catálogos de prata/ouro).
- `PDFs/build_catalog_solitarios.py` — script gerador. **Lê os produtos direto do
  `index.html`** (as 2 coleções de `COLECOES`) e nunca escreve no site: mudar preço,
  foto ou nome no site e rodar de novo atualiza o PDF.

Corrigido (bug herdado do template dos catálogos):
- **Conteúdo cortado.** Com 4 slots por página o card não cabia na folha e o
  `.page{overflow:hidden}` cortava o rodapé dos produtos em silêncio — o catálogo de
  prata publicado (v5) já sofre disso na página 1. Resolvido com
  `grid-template-rows:repeat(2,minmax(0,1fr))` + tipografia/espacamentos menores,
  **sem mudar o grid (continua 2 col × 4 slots)** e **sem mexer na foto** ( segue 10/9).
- **Metade da página de fechamento vazia.** `.page-inner` não ocupava a folha, então o
  rodapé subia no meio da página.
- **Pricing divergente do site.** O script antigo arredondava a parcela para inteiro
  (`2x de R$ 124,00`); agora usa a mesma conta do site (`2x de R$ 124,50`).
- `build_catalog_solitarios.py` tem trava que **falha o build** se qualquer imagem
  quebrar ou se qualquer card estourar a folha — clipping não passa mais em silêncio.

Verificado: 4 páginas, A4 210×297mm exato nas 4, 11/11 produtos no texto extraído,
zero erro de console, zero imagem quebrada, zero overflow, telefone e CNPJ em
algarismos lining, `CONFIG`/identidade conferidos.

## 2026-10-05

**Catálogo PDF de Alianças de Moeda Antiga (8 páginas, 27 peças)** — novo catálogo a
partir da lista de 27 modelos de moeda antiga comum (4mm a 8mm).

Adicionado:
- `PDFs/Noiva-Joias-MT-Catalogo-Aliancas-Moeda-Antiga-v1.pdf` — 8 páginas A4 exatas,
  30,5 MB: páginas 1 a 6 com 4 produtos cada, página 7 com 3 produtos + o banner de
  manutenção, página 8 com Sr. Fernandes + tabela de preços + "como pedir" + CTA.
- `PDFs/catalogo-aliancas-moeda-antiga.html` — HTML fonte (mesma identidade visual).
- `PDFs/build_catalog_moeda_antiga.py` — script gerador (baixa as imagens do PostImages,
  normaliza em webp 1000×1000 e embute em base64, então o HTML roda offline).
- `PDFs/pasted-context-moeda-antiga.txt` — a lista do fornecedor em arquivo próprio.
- `PDFs/img/moeda-antiga/` — as 27 imagens webp.

Conteúdo:
- **27 peças**, ordenadas do maior para o menor preço: 15× R$ 489,99 · 6× R$ 589,99 ·
  5× R$ 689,99 · 1× R$ 900,00 (Aliança Bulgari, com selo "Destaque").
- **Parcelamento 2x sem juros em todos os modelos**, parcela arredondada para baixo em
  centavos (R$ 244,99 / R$ 294,99 / R$ 344,99 / R$ 450,00) — nunca R$ 245,00.

Aviso do produto (o ponto central deste catálogo):
- **Em todo card:** "OBS: pode escurecer e manchar · precisa de manutenção".
- **Banner na página 7:** "Antes de comprar — Moeda antiga escurece e pode manchar o
  dedo", explicando que para restaurar a cor é só manutenção com **pasta de dente** ou
  produto específico, e sugerindo aliança banhada a quem não quer manter.
- **Na página final:** parágrafo "Sobre a manutenção" com o mesmo conteúdo.
- Os dois modelos com ressalva própria no nome (solitário e aparador vendidos
  separados) não repetem o aviso de manutenção, para não confundir as duas coisas.

Refatorado:
- **`PDFs/catalogo_base.py`** — novo módulo com o que é comum a todos os catálogos:
  identidade visual, `CSS_AJUSTES`, card/banner/página, download de imagem, montagem do
  HTML e o `build_pdf()` com as travas. O fix do clipping passa a existir em **um lugar
  só** (antes estava copiado dentro de cada script — o tipo de coisa que fica para trás
  em silêncio). `build_catalog_solitarios.py` foi refeito em cima da base e continua
  gerando PDF idêntico (4 p, 12,8 MB, verificado).

Nomes limpos: sufixo redundante "- Moeda Antiga" removido (o cabeçalho da página já
diz) e o erro de digitação do fornecedor "ALIANA" → "ALIANÇA".

Verificado: 8 páginas, A4 210×297mm exato nas 8, 27/27 produtos no texto extraído,
zero erro de console, zero imagem quebrada, zero overflow, nenhum parcelamento
arredondado para cima (0 ocorrências de R$ 245,00 / 295,00 / 345,00).

Ponto de atenção para o dono: a peça "Moeda 8mm Com Pedra Quadrado c/ Friso"
(R$ 489,99) veio com uma foto de **kit**, com preços gravados na imagem
("Par de Alianças 489.99 / Anel Solitario 99.99 / Unidade Aparador 49.99"), enquanto
o nome do produto é só a aliança. A foto é do fornecedor — precisa ser trocada para
não confundir o cliente sobre o que está incluso.

## 2026-10-06

**Categoria Moeda Antiga no site (21 peças) + revisão do catálogo PDF** — o dono
revisou o catálogo, pediu ajustes e a categoria foi criada no site com as fotos no R2.

Ajustes pedidos e aplicados (nos dois lugares: PDF **e** site):
- **6 peças removidas** do catálogo: Aliança Bulgari (R$ 900), MOEDA C/ GRAVAÇÃO EXTERNA
  8MM, MOEDA C/ INICIAL 8MM, MOEDA CORAÇÃO 6MM, MOEDA ESCOVADA CENTRAL 6MM e Moeda
  Antiga C/ Gravação Quadrada 8mm. O catálogo foi de 27 → 21 peças.
- **10 fotos trocadas** pelas versões que estavam na pasta Downloads: chanfrada 6mm,
  chanfrada c/ pedra 6mm, chanfrada 4mm lisa, quadrada 6mm, quadrada 8mm, clássica
  6mm, clássica fina 4mm, friso lateral central c/ pedras, friso lateral 8mm e
  "8mm com pedra quadrado c/ friso". Todas convertidas para webp 1000×1000 q90 com
  corte ao quadrado (nenhuma das originais era quadrada — cortar, não esticar).
- **MOEDA CLÁSSICA 6MM** passou a se chamar **MOEDA CLÁSSICA 6MM VALOR DO PAR**.
- **ALIANÇA DE MOEDA ANTIGA CONCOVA 8MM** perdeu o "(NÃO ACOMPANHA APARADOR)" do
  título: a foto não tem aparador, então a ressalva só confundia.
- **ALIANÇA MOEDA ANTIGA FRISO LATERAL 8MM** perdeu o "(SOLITÁRIO VENDIDO SEPARADO)"
  do título, porque o anel não acompanha mais.
- **MOEDA FRISO LATERAL CENTRAL C/ PEDRAS 8MM** subiu para R$ 689,99.

Texto do solitário reescrito (não é mais um produto desta categoria):
- Antes o catálogo dizia que um modelo vinha "com anel solitário incluso". Errado —
  não vem, e isso levantava uma pergunta que o cliente não precisava fazer.
- Agora: a aliança é **moeda antiga** e o anel solitário é **outro material**
  (liga metálica nobre, banhada a ouro), **vendido separado**, **opcional**,
  a partir de **R$ 99,99**, descrito como o mais em conta e o **mais vendido**,
  e que "fica lindo com qualquer par de aliança de moeda antiga".

Infraestrutura:
- **21 fotos no Cloudflare R2** (`moeda-antiga/`), verificadas uma a uma por URL
  pública (21/21 respondendo 200).
- O token do Cloudflare que estava na máquina estava **inválido** (`code 9109`) e o
  OAuth do wrangler **expirado** (27/09). Auditei o projeto inteiro — nunca houve
  token commitado, nem no histórico do git — e criei um token novo com o **menor
  privilégio possível**: `Object Read & Write` só no bucket `etevalda`.
  Aprendi no caminho que esse preset **não** serve para subir objeto pela REST API
  (403): o caminho que funciona é o **S3 API** (Access Key ID + Secret), como o
  `guia-capacidades-ia_fotos_links.md` já avisava.
- **`PDFs/upload_r2.py`** — sobe no R2 o que está no manifesto (credencial só do
  ambiente, nunca de arquivo).
- **`PDFs/gerar_colecao_site.py`** — gera o bloco `COLECOES` do `index.html` a
  partir do mesmo manifesto do PDF. Motivo: 21 itens com preço, parcela e URL de
  imagem digitados à mão erram; agora o site nasce da mesma fonte que gerou a figura.
- **`PDFs/img/moeda-antiga/manifest.json`** — contrato entre PDF, R2 e site.
- HTML do PDF passou de base64 (2.357 KB) para URL do R2 (**37 KB**).

Site:
- Nova coleção **"Alianças de Moeda Antiga"** no hero (5º card) com 21 itens.
- Rota **`/moedaantiga`** criada, igual às outras 4.
- Cada item no modal mostra o aviso de manutenção da moeda antiga.

Verificado no navegador: zero erro de console, 21/21 itens com foto, 21/21 notas de
manutenção, 21/21 botões de WhatsApp para `wa.me/556592942810` com mensagem
preenchida, preços R$ 489,99 / 589,99 / 689,99 e parcela 2x correta (344,99), nenhuma
imagem da moeda antiga quebrada.

Detalhe: a foto com a marca de um **concorrente** ("Etevalda Alianças", dentro da
caixa) era justamente a do Friso Lateral Central — que foi trocada por outra. Resolveu
sozinho, mas fica registrado porque `AGENTS.md` proíbe usar marca de terceiro.

## 2026-10-06 (documentação)

**`AGENTS.md` estava incompleto** — o dono perguntou se qualquer IA ligada ao projeto
saberia o que fazer. Auditei e achei lacunas reais; a mais séria era que **não havia
documentação nenhuma de como criar uma categoria no site**: a seção 4 explicava só o
array `PRODUTOS`. Uma IA nova não saberia que `COLECOES` gera o card do hero, o modal
e a rota.

Adicionado em `AGENTS.md`:
- **Seção 4b — Como adicionar uma categoria (coleção)**: o schema do `COLECOES`, o
  que cada campo faz, quando `nota` é obrigatória, a tabela das 5 categorias e rotas
  atuais, e o aviso de que **`ROTAS` é por índice** — inserir coleção no meio quebra
  as rotas seguintes.
- **Seção 4c — Imagens**: onde as fotos moram (R2), a base URL, e a regra que mais
  custou tempo descobrir: **sempre central crop, nunca esticar** — `resize((1000,1000))`
  direto deforma foto não quadrada. Também: transparência sobre o preto do projeto, e
  nada de marca de terceiro na foto.
- **Identidade (seção 1)**: hospedagem Vercel, URL de produção e bucket do R2, mais o
  alerta de que **commitar publica o site na hora**.
- **Fluxo completo lista → PDF → R2 → site**: a ordem real das 6 operações e o motivo
  de pular etapa fazer figura e site divergirem.
- **Inventário dos 4 PDFs** e **bugs conhecidos nos scripts antigos**: o ouro achata a
  foto, arredonda a parcela para inteiro, o prata r2 tem 1 imagem quebrada, e prata v5
  + ouro v2 têm conteúdo cortado na página 1.
- **Checklists** (seção 5 e a do gerente) com os itens de categoria e de PDF.
- Seção 7 com os arquivos que existem hoje e o aviso de que `pasted-context-1.txt` é a
  fonte do catálogo ouro e não deve ser sobrescrito.
- `PDFs/LEIAME.md`: regra de upload no R2 pelo S3 API (o que funciona e o que dá 403),
  e as regras de negócio passaram a **apontar** para o `AGENTS.md` em vez de duplicar.

Nada disso mudou comportamento do site — é documentação, e o site foi testado de novo
depois: 5 cards no hero, 21 itens da moeda antiga, zero erro de console além do
`pushState` de `file://` (origem nula, não é bug).




## 2026-10-06

**Mensagem de WhatsApp enxuta** — todos os CTAs (produto, coleção, modal e CTA final) trocam 'Minha cidade é:' por 'Consegue me entregar agora ?', deixando a mensagem mais curta e direta.

## 2026-10-06

**Imagem de compartilhamento (og.png)** — gerada a partir de 
oivas_joias_mt.jpg (crop central 1200×630). Resolve o preview ao compartilhar o site no WhatsApp/Instagram; meta tags og:image/twitter:image já apontavam para ela.

## 2026-10-06

**Mensagem de produto sem saudação** — os CTAs de produto (catálogo, coleção e modal) removem a linha 'Olá! Vim pelo site da Noiva Joias MT. 👋'; a mensagem passa a começar direto em 'Quero este modelo: ...'. CTAs gerais (topo/hero/final/footer/dock) mantêm a saudação.

## 2026-10-06

**Saudação removida de todos os CTAs** — topo, hero, final, footer e dock também perdem a linha 'Olá! Vim pelo site da Noiva Joias MT. 👋'; todos os botões de WhatsApp agora mandam mensagem direta, sem saudação.

## 2026-10-06

**Meta Pixel instalado** — base do pixel 186922223282687 no <head> com PageView + fallback noscript; clique em qualquer botão com link wa.me dispara evento padrão 'Contact' (para campanha de remarketing dos clientes que chamam no WhatsApp).

## 2026-10-07

**Meta Pixel — Configuração Senior-Level** — reescrita completa do Pixel no <head> e tracking no corpo:

- **init avançado**: Advanced Matching preparado (em, ph, fn, ln, ct, st, zp, country, external_id) + deduplication_id em PageView para evitar duplicatas.
- **Helpers globais**: `window.fbqEventID`, `window.fbqExtractProduct`, `window.fbqTrackRich` para eventos padronizados com parâmetros ricos.
- **Eventos implementados**:
  1. **Contact** (WhatsApp click) — contexto rico: `whatsapp_hero`, `whatsapp_produto`, `whatsapp_colecao`, `whatsapp_final_cta`, `whatsapp_footer`, `whatsapp_dock_fixo`, `whatsapp_header_fixo`; extrai produto (nome, preço, imagem) do card clicado; inclui `custom_data` com cidades de entrega e pagamento na entrega.
  2. **ViewContent** (produto na viewport) — IntersectionObserver dispara quando card entra na tela (threshold 30%); evita duplicata com `dataset.fbqViewed`.
  3. **ViewContent** (abrir coleção/modal) — hook em `window.abrir` dispara evento de catálogo aberto com qtd de itens e tags.
  4. **Lead** (scroll depth 25/50/75/90%) — engajamento alto para remarketing de "quase converteu".
  5. **Lead** (tempo na página 30/60/120/300s) — engajamento por tempo, só dispara se aba visível.
- **Parâmetros padrão em todos eventos**: `content_type`, `currency: BRL`, `page_location`, `page_title`, `eventID` único.
- **Ready para Advanced Matching futuro**: quando houver formulário (email/telefone), basta preencher no `fbq('init', ...)` ou chamar `fbq('set', 'user_data', {...})`.

Objetivo: audiências de remarketing segmentadas (quem clicou WhatsApp por contexto, quem viu produto X, quem scrollou 75%, quem ficou 2min) e funil otimizado para quando o botão de compra for adicionado.

## 2026-10-08

**Checkout Mercado Pago (Checkout Pro) com frete grátis** — o site passou a ter compra
online de verdade: botão "Comprar — Frete Grátis" em cada produto, checkout oficial do
Mercado Pago e evento `Purchase` no Pixel quando o cliente paga.

Aplicação criada no painel do Mercado Pago (BrowserOS do dono):
- Conta **ALEX IMPORTS MT** → validação de telefone concluída → aplicação
  **"Noiva Joias MT - Site"** (ID `3610304715435944`), solução **Checkout Pro**,
  API de Preferences.
- **Credenciais de produção ativadas** (setor "Vestuário, calçados e acessórios").
  O `Access Token` e o `Client Secret` de produção existem no painel.

Arquivos:
- **`api/checkout.js`** — serverless function. Cria a preferência via
  `POST https://api.mercadopago.com/checkout/preferences` e devolve o
  `checkout_url`. Também trata o webhook do Mercado Pago (responde 200).
- **`checkout.html`** — página de checkout no padrão visual do site. Lê
  `?nome=&preco=&img=&desc=`, mostra o item e o selo FRETE GRÁTIS, e chama
  `/api/checkout`. Se a API falhar, cai no WhatsApp — a venda nunca fica sem saída.
- **`obrigado.html`** — destino após o pagamento: confirma a compra e dispara
  `Purchase` no Pixel.
- **`.gitignore`** (novo) — protege `.env`, `.env.*` e `*.local`.
- **`.env.example`** (novo) — modelo de ambiente, sem nenhum valor real.

**O Access Token NÃO vai para o HTML.** Ele vive só na variável de ambiente
`MP_ACCESS_TOKEN` da Vercel (configurada como *Secret*, ambiente Production). Se o
token estivesse no `index.html`, qualquer pessoa abriria o "ver código-fonte" e
criaria cobranças na conta — por isso a regra 7 do `AGENTS.md` ("sem segredo no
repositório") é o que motivou a arquitetura com serverless.

`vercel.json` corrigido: o rewrite era `/(.*)` → `index.html`, que engolia as
rotas de API. Agora é `/((?!api/).*)`, então `/api/checkout` chega na function.

Domínio: o site real é **`https://noivajoiasmt.vercel.app`** (o dono corrigiu o
cadastro das credenciais do Mercado Pago para esse). `api/checkout.js` usa
`SITE_URL` com fallback para `.vercel.app`, e monta `back_urls` só com esse
domínio — o Mercado Pago recusa o redirecionamento de volta se o domínio divergir
do cadastrado. As 7 ocorrências de `.com.br` no `index.html` foram trocadas por
`.vercel.app`.

Frete grátis: representation como `shipments.free_methods` com custo `0.00`.

Pixel: `Purchase` dispara em 3 pontos — clique no checkout (intenção),
abertura do `checkout.html` (`ViewContent` do checkout) e pagamento aprovado
(`obrigado.html`, com `purchase_confirmed: true`).

Verificado: 3 páginas respondem 200, `node --check api/checkout.js` sem erro,
nenhum `APP_US` em nenhum arquivo do site, checkout testado em 390px (o nome do
produto ficava espremido em 4 palavras — corrigido com breakpoint em 420px).

Pendente: deploy (a `MP_ACCESS_TOKEN` só vale depois de um novo deploy) e teste
do fluxo completo no ar.

## 2026-10-08 (2) — Checkout com escolha de entrega

O checkout deixou de ser "tudo igual": agora o cliente escolhe **como quer receber**,
e cada caminho mostra preço, prazo e aviso próprios. Motivo: o dono realised que
"frete grátis" sozinho não dizia **onde** o frete era grátis nem **quando** a entrega
acontecia — o mesmo site oferecia entrega hoje e 3 dias, e o cliente não sabia qual
escolher.

Regras definidas com o dono:

| Situação | Frete | Prazo | Onde paga |
|---|---|---|---|
| **Site** — Cuiabá, Rondonópolis ou Sinop | Grátis | 3 dias úteis | Site |
| **Site** — qualquer outra cidade/estado do Brasil | Grátis | 4 a 7 dias úteis (aprox.) | Site |
| **WhatsApp** — Cuiabá, Rondonópolis ou Sinop | R$ 14,99 | mesmo dia | Na entrega |
| **Site — Sedex a Cobrar** (fora das 3 cidades) | R$ 44,99 | 4 a 7 dias úteis | Frete no site; **produto** ao retirar na agência dos Correios |

O dono confirmou na conversa: a taxa da entrega hoje é **R$ 14,99** (havia dito
"15 BRL" uma vez, mas R$ 14,99 foi o valor repetido) e **fora das três cidades não
se mostra taxa nenhuma** — ou o cliente usa o site, ou éDispatcher pessoalmente.

`checkout.html` reescrito como pergunta em 2 passos:
1. **"Você é de Cuiabá, Rondonópolis ou Sinop?"**
   - Sim → passo 2: *quer receber hoje?* → botão verde vai para o WhatsApp com a
     mensagem já montada (produto, valor, taxa de R$ 14,99, total na entrega e o
     aviso de que frete grátis é só no site); ou *não tenho pressa* → compra no
     site com frete grátis e 3 dias úteis.
   - Não → passo 2: **tradicional** (recebe no endereço, frete grátis) ou
     **Sedex a Cobrar** (paga só R$ 44,99 de frete e o produto ao retirar).
2. Resumo com produto, frete, prazo e total, aviso em vermelho na modalidade
   Sedex, botão do Mercado Pago e campo **Acompanhar meu pedido**.

`api/checkout.js`:
- **O frete é calculado no servidor**, não no navegador: o valor que chega do
  cliente é ignorado de propósito (`const frete = modalidade === 'sedex' ? 44.99 : 0`).
  Sem isso, qualquer um manipularia o preço pelo devtools.
- No Sedex a Cobrar o frete vira **item separado** na preferência — é isso que o
  cliente está comprando agora. Soma conferida: produto 255,00 + frete 44,99 =
  299,99.
- `metadata` volta no webhook com `regiao`, `modalidade`, `frete`, `prazo` e
  `produto` — é daí que sai a etiqueta e a mensagem de WhatsApp.
- Novo ramo `consultar`: dado um código de pagamento, consulta
  `/v1/payment_methods/{id}` e traduz o status (aprovado, em análise, recusado…).

`obrigado.html` reescrito: muda conforme a modalidade (no Sedex o título vira
"Frete pago — pedido reservado" e o passo 3 é "você retira na agência"), mostra o
resumo, os 3 passos do que acontece agora, botão de **rastreio** e WhatsApp com
produto, valor do produto, frete, modalidade, prazo e código do pagamento já
escritos.

Pixel: `Purchase` agora leva `modalidade`, `regiao`, `prazo`, `frete`,
`valor_produto`, `pagamento_agora` e `payment_id` — dá para criar público de
remarketing de "comprou no site com frete grátis" separado de "Sedex a cobrar".

Bug corrigido durante o teste: `.opts{display:grid}` vencia o atributo `[hidden]`
do HTML por especificidade, então os passos 2 e 3 apareciam todos de uma vez.
Adicionado `[hidden]{display:none !important}` nas duas páginas.

Verificado: as duas modalidades aceitas pela API real do Mercado Pago (HTTP 201,
soma de itens confere), fluxo dos dois caminhos clicado no navegador em 390px sem
erro de console, totals corretos (R$ 299,99 no tradicional, R$ 344,98 no Sedex).
