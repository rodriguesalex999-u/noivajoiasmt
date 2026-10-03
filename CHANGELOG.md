# Changelog — Noiva Joias MT

Formato: data curta · o que mudou · por quê.

---

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
