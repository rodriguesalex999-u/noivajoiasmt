# Como indexar o site no Google (Search Console)

> **Estado atual (desde 2026-10-23): o site está VERIFICADO e o sitemap foi
> ENVIADO.** Este arquivo guarda como foi feito, o que fazer sempre que uma
> página nova entrar no ar e as conferências periódicas.
> Resumo e pendências vivas ficam no `AGENTS.md` (seção "Indexação no Google").

---

## O que já está pronto (não refaça)

| Item | Detalhe |
|---|---|
| Conta Google usada | `rodriguesalex999@gmail.com` (Alex Imports MT) |
| Propriedade no Search Console | prefixo de URL `https://noivajoiasmt.vercel.app/` |
| Verificação | metatag `<meta name="google-site-verification" content="yL1CBnghnRqCj5Vb1Fh3AZy316TJe_5T8hTr3DUMdLE">` no `<head>` do `index.html` — **nunca remover** |
| Verificação (redundância) | arquivo `google9c9d7af11904761d.html` na raiz (método "arquivo HTML"; a 1ª tentativa falhou por cache de borda — a metatag é a que vale) |
| Sitemap | `https://noivajoiasmt.vercel.app/sitemap.xml` enviado em 2026-10-23 (lista `/`, `/masculino`, `/faq`) |
| Primeira inspeção da home | Google respondeu *"Detectada, mas não indexada no momento"* (normal para site recém-corrigido) |
| Pedido de indexação da home | tentado em 2026-10-23, **cota diária da conta excedida** (a conta é compartilhada com outro projeto); repetir no próximo dia útil |

Acessar: <https://search.google.com/search-console> → seletor de propriedade →
`https://noivajoiasmt.vercel.app/`. Tudo gratuito; **nunca** seguir adiante se
aparecer alguma tela de cobrança (não existe cobrança no Search Console).

---

## Página NOVA subida — o que fazer

1. **Subir a página** (arquivo HTML + rewrite no `vercel.json` se tiver rota
   amigável) → commit + push na `main` (deploy automático).
2. **Adicionar a URL ao `sitemap.xml`** (se for uma página de verdade —
   home, coleção, FAQ nova etc.).
3. **Pedir indexação no Search Console:**
   topo → caixa "Inspecionar qualquer URL" → colar a URL completa →
   Enter → quando abrir o relatório, clicar em **"Solicitar indexação"** →
   esperar o teste terminar e a confirmação "na fila".
4. Se a cota diária aparecer ("A cota foi excedida"): a cota é ~10 pedidos/dia
   **por conta Google** e volta de madrugada (horário da Califórnia). Tentar
   no dia seguinte — o sitemap, sozinho, já faz o Google descobrir a URL.

### O que NÃO precisa de indexação à mão
- **Produto novo dentro do catálogo** (item no `index.html` / `masculino.html`):
  mora na home e nas coleções **já indexadas** — o Google vê quando rastrear
  a home (com `sitemap.xml` semanal, rastreia). Só cadastrar produto novo,
  rodar `node scripts/gerar_catalogo_precos.js` e publicar, como sempre.
- Imagens, PDFs e alterações de preço/texto em páginas já indexadas.

Regra prática: **toda página HTML nova = 1 passo extra (sitemap + pedir
indexação); conteúdo novo dentro de página velha = nenhum passo extra.**

---

## Conferências periódicas (a pedido do dono: 2× ao ano)

| Quando | O que conferir |
|---|---|
| **2026-10-27** (conferência marcada — ver AGENTS.md) | A home está indexada? Se não: "Solicitar indexação" de novo e relatar. |
| **A cada 6 meses** a partir daí (próxima: **2027-04-27**) | `site:noivajoiasmt.vercel.app` no Google lista as páginas? Relatório "Páginas" do Search Console sem erro grave (noindex/cobertura)? Sitemap "Sucesso"? |

Como conferir (qualquer IA serve):
1. Abrir <https://search.google.com/search-console>, propriedade `https://noivajoiasmt.vercel.app/`.
2. Ver relatório **Páginas** (erros de cobertura) e **Sitemaps** (status = Sucesso).
3. Conferir no Google: busca `site:noivajoiasmt.vercel.app` — as páginas devem
   aparecer listadas.
4. **Registrar o resultado** em `CHANGELOG.md` (data + o que deu) e atualizar a
   próxima data de conferência no `AGENTS.md`.

---

## Cheatsheet do fluxo (tela a tela)

```
search.google.com/search-console
 └─ seletor (esquerda) → "Adicionar propriedade"   ← só na 1ª vez
 └─ caixa de cima "Inspecionar qualquer URL" → URL → Enter
     ├─ "A página não está indexada..." → botão "Solicitar indexação"
     │    └─ diálogo "Testando se o URL publicado..." (10–30 s)
     │        ├─ ok → "Indexação solicitada" ✅
     │        └─ "A cota foi excedida" → repetir amanhã
     └─ "A página está indexada" ✅ → nada a fazer
 └─ menu lateral → Sitemaps → colar URL do xml → ENVIAR
```

**Armadilhas já conhecidas:**
- Método "arquivo HTML" da verificação falhou 1× (o Vercel cacheava a home
  antiga no caminho da URL). A **metatag** funciona — é ela quem valida.
- `Access-Control-Allow-Origin: *` ainda vem do painel do Vercel (Settings),
  não do código — se um dia forem limpar headers lá, não mexer na metatag.
- Googlebot cobra só o que está em `robots.txt` (está ok: só bloqueia
  checkout/obrigado/painel/api).