/* ============================================================
   GERADOR DO CATÁLOGO DE PREÇOS DO SERVIDOR
   ============================================================
   Lê os produtos embutidos no index.html (PRODUTOS + COLECOES) e
   no masculino.html (COLLECTION_MAP) e gera
   api/_lib/catalogo-precos.json — o mapa { "nome normalizado": preco }
   que o /api/checkout usa para cobrar o preço CERTO, independentemente
   do que o navegador mandar.

   Por que existe: antes o preço vinha da URL (checkout.html?preco=...)
   e o servidor aceitava qualquer valor — dava para comprar por R$ 0,01.

   COMO USAR (depois de add/editar produto no index.html ou masculino.html)
       node scripts/gerar_catalogo_precos.js
   O script falha em vermelho se não achar nenhum produto — sinal de
   que a estrutura do HTML mudou e o catálogo ficou desatualizado.

   REGRA DE SINCRONIA
   O preço que o cliente VÊ continua vindo do index.html; o preço que
   ele PAGA vem deste JSON. Se os dois divergirem, o servidor vence
   (cobra o preço do JSON). Por isso rode o script sempre que mexer
   em preço.
   ============================================================ */

const fs = require('fs');
const path = require('path');

/* ---------- helpers ---------- */

/* Acha o fim de um literais de array/objeto JS contando chaves,
   respeitando strings, template literals e comentários. */
function fimDoLiteral(texto, inicio) {
  let i = inicio;
  let profundidade = 0;
  let modo = 'code'; // code | ' | " | ` | linha | bloco

  for (; i < texto.length; i++) {
    const c = texto[i];
    const prox = texto[i + 1];

    if (modo === 'code') {
      if (c === "'" || c === '"' || c === '`') { modo = c; continue; }
      if (c === '/' && prox === '/') { modo = 'linha'; i++; continue; }
      if (c === '/' && prox === '*') { modo = 'bloco'; i++; continue; }
      if (c === '[' || c === '{' || c === '(') { profundidade++; continue; }
      if (c === ']' || c === '}' || c === ')') {
        profundidade--;
        if (profundidade === 0) return i + 1;
        continue;
      }
      continue;
    }

    if (modo === 'linha') { if (c === '\n') modo = 'code'; continue; }
    if (modo === 'bloco') { if (c === '*' && prox === '/') { modo = 'code'; i++; } continue; }
    /* dentro de string */
    if (c === '\\') { i++; continue; }
    if (c === modo) modo = 'code';
  }
  throw new Error('literal JS não terminou (índice ' + inicio + ')');
}

/* Extrai `const NOME = <literais a partir do 1º [ ou {>`. */
function extrairLiteral(html, nomeConst) {
  const m = html.match(new RegExp('const\\s+' + nomeConst + '\\s*=\\s*'));
  if (!m) return null;
  let i = m.index + m[0].length;
  while (i < html.length && /\s/.test(html[i])) i++;
  if (html[i] !== '[' && html[i] !== '{') {
    throw new Error(nomeConst + ' não começa com [ ou {');
  }
  const fim = fimDoLiteral(html, i);
  const bruto = html.slice(i, fim);
  /* Avalia só o literais — é código deste próprio repositório. */
  // eslint-disable-next-line no-new-func
  return new Function('return (' + bruto + ')')();
}

/* Mesma normalização usada no api/checkout.js — mantenha os dois iguais. */
function normalizar(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/* Varre qualquer estrutura de produto e devolve [{nome, preco}]. */
function coletarProdutos(node, saida) {
  if (!node) return;
  if (Array.isArray(node)) { node.forEach(x => coletarProdutos(x, saida)); return; }
  if (typeof node !== 'object') return;
  if (typeof node.nome === 'string' && typeof node.preco === 'number') {
    saida.push({ nome: node.nome, preco: node.preco });
    return;
  }
  /* coleção: { nome: 'X', itens: [...] } — desce nos itens, não trata
     a coleção em si como produto (ela não tem preco). */
  if (Array.isArray(node.itens)) coletarProdutos(node.itens, saida);
}

/* ---------- main ---------- */

function main() {
  const raiz = path.join(__dirname, '..');
  const mapa = {};      // normalizado -> preco
  const original = {};  // normalizado -> nome original (para o relatório)
  let total = 0;

  function addProduto(p, origem) {
    const k = normalizar(p.nome);
    if (!k) return;
    if (mapa[k] !== undefined && mapa[k] !== p.preco) {
      console.warn(
        '  ! nome repetido com preços diferentes: "' + p.nome + '" (' +
        origem + ') — ' + mapa[k] + ' vs ' + p.preco + '; fica o primeiro'
      );
      return;
    }
    if (mapa[k] === undefined) {
      mapa[k] = p.preco;
      original[k] = p.nome;
      total++;
    }
  }

  for (const arquivo of ['index.html', 'masculino.html']) {
    const caminho = path.join(raiz, arquivo);
    if (!fs.existsSync(caminho)) {
      console.warn('  (pulando ' + arquivo + ' — não encontrado)');
      continue;
    }
    const html = fs.readFileSync(caminho, 'utf8');

    if (arquivo === 'index.html') {
      const produtos = extrairLiteral(html, 'PRODUTOS');
      const colecoes = extrairLiteral(html, 'COLECOES');
      const lista = [];
      coletarProdutos(produtos, lista);
      coletarProdutos(colecoes, lista);
      console.log(arquivo + ': ' + lista.length + ' produto(s)');
      lista.forEach(p => addProduto(p, arquivo));
    } else {
      const mapaColecoes = extrairLiteral(html, 'COLLECTION_MAP');
      const lista = [];
      coletarProdutos(mapaColecoes, lista);
      console.log(arquivo + ': ' + lista.length + ' produto(s)');
      lista.forEach(p => addProduto(p, arquivo));
    }
  }

  if (total < 50) {
    console.error(
      'ERRO: só ' + total + ' produto(s) extraídos — a estrutura do HTML ' +
      'mudou? O catálogo do servidor NÃO foi atualizado (mantendo o anterior).'
    );
    process.exit(1);
  }

  const destino = path.join(raiz, 'api', '_lib', 'catalogo-precos.json');
  const atual = fs.existsSync(destino)
    ? JSON.parse(fs.readFileSync(destino, 'utf8'))
    : null;

  fs.writeFileSync(
    destino,
    JSON.stringify(mapa, null, 0) + '\n',
    'utf8'
  );

  const bytes = fs.statSync(destino).size;
  console.log(
    'OK -> ' + path.relative(raiz, destino) +
    ' | ' + total + ' produto(s) | ' + bytes + ' bytes'
  );

  /* Relatório curto de mudanças em relação à versão anterior. */
  if (atual) {
    const antes = Object.keys(atual);
    const agora = Object.keys(mapa);
    const novos = agora.filter(k => !(k in atual));
    const fora = antes.filter(k => !(k in mapa));
    const mudaram = agora.filter(k => k in atual && atual[k] !== mapa[k]);
    if (novos.length) console.log('  + novos: ' + novos.length);
    if (fora.length) console.log('  - saíram: ' + fora.length + ' -> ' + fora.slice(0, 5).join(' | '));
    if (mudaram.length) console.log('  ~ preço mudou: ' + mudaram.length + ' -> ' + mudaram.slice(0, 5).join(' | '));
    if (!novos.length && !fora.length && !mudaram.length) console.log('  (sem mudança em relação à versão anterior)');
  }
}

main();
