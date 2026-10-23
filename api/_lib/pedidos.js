/* ============================================================
   PEDIDOS — onde os pedidos do cliente ficam guardados
   ============================================================
   ANTES (e o que dava errado)
     O webhook gravava em /tmp/pedidos.json e o /api/rastreio lia
     de /tmp/pedidos.json. Na Vercel cada função roda num container
     PRÓPRIO: o webhook grava num /tmp e o rastreio lê de OUTRO /tmp.
     Resultado: o painel abria vazio e o cliente recebia
     "pedido não encontrado" ao mandar o CPF.

   AGORA
     Tudo vai para o Postgres (Neon), compartilhado por todas as
     funções. O /tmp continua APENAS como reserva quando não há
     DATABASE_URL (desenvolvimento local).

   UMA LINHA POR PEDIDO (não mais "apaga tudo e grava de novo")
     A versão anterior relia a lista inteira, mudava um item e
     gravava a lista toda de volta. Com dois pedidos chegando ao
     mesmo tempo, um apagava o outro. Agora cada gravação mexe
     só na linha do pedido.

   A CHAVE É O pedido_id (nosso), não o payment_id (do Mercado Pago)
     Porque o pedido nasce antes do pagamento existir. O
     pedido_id (ex.: PJ-7K3M2Q) é gerado no clique em "comprar" e
     viaja como external_reference — assim o cliente volta da
     página de obrigado e a gente reconhece o pedido na hora.
   ============================================================ */

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const ARQ = path.join('/tmp', 'pedidos.json');

/* Quantos pedidos manter no /tmp (só dev). O banco aguenta muito
   mais; este limite é só para a tela do dono não ficar lenta. */
const LIMITE = 500;

/* ---------- Postgres (produção) ---------- */
let pool = null;

function temBanco() {
  return !!(process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED);
}

function getPool() {
  if (pool) return pool;
  const { Pool } = require('pg');
  /* O host "-pooler" do Neon é o certo para serverless: ele
     reaproveita conexões e não estoura o limite de conexões. */
  const url =
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED;
  pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 15000,
  });
  pool.on('error', e => console.error('pool do banco:', e.message));
  return pool;
}

/* Gera um código curto e legível para o pedido (ex.: PJ-7K3M2Q).
   Sem ambiguidade: não usa 0/O e 1/I/L, para não dar confusão
   quando o cliente lê o código no WhatsApp. */
const ALFA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function novoPedidoId() {
  const bytes = crypto.randomBytes(6);
  let s = '';
  for (const b of bytes) s += ALFA[b % ALFA.length];
  return 'PJ-' + s;
}

/* Converte uma linha do Postgres no objeto de pedido. */
function linhaParaPedido(r) {
  const n = v => (v == null ? null : Number(v));
  return {
    pedido_id: r.pedido_id,
    payment_id: r.payment_id,
    preference_id: r.preference_id,
    external_reference: r.external_reference,
    status: r.status,
    etapa: r.etapa,
    criado_em: r.criado_em,
    aprovado_em: r.aprovado_em,
    produto: r.produto,
    valor: n(r.valor),
    frete: n(r.frete),
    valor_produto: n(r.valor_produto),
    modalidade: r.modalidade,
    regiao: r.regiao,
    prazo: r.prazo,
    nome: r.nome,
    email: r.email,
    telefone: r.telefone,
    cpf: r.cpf,
    cep: r.cep,
    endereco: r.endereco,
    numero: r.numero,
    complemento: r.complemento,
    bairro: r.bairro,
    cidade: r.cidade,
    estado: r.estado,
    medida_confirmada: r.medida_confirmada,
    me_order_id: r.me_order_id,
    me_status: r.me_status,
    rastreio: r.rastreio,
    etiqueta_url: r.etiqueta_url,
    etiqueta_preco: n(r.etiqueta_preco),
    etiqueta_cancelada: !!r.etiqueta_cancelada,
    etiqueta_cancelada_em: r.etiqueta_cancelada_em,
    nota: r.nota,
    atualizado_em: r.atualizado_em,
  };
}

/* ---------- Postgres: gravação ---------- */

/* Colunas que podem ser gravadas. Lista fechada de propósito:
   o que entra aqui nunca vira nome de coluna vindo do cliente. */
const COLUNAS = [
  'pedido_id', 'payment_id', 'preference_id', 'external_reference', 'status',
  'etapa', 'criado_em', 'aprovado_em', 'produto', 'valor', 'frete',
  'valor_produto', 'modalidade', 'regiao', 'prazo', 'nome', 'email',
  'telefone', 'cpf', 'cep', 'endereco', 'numero', 'complemento', 'bairro',
  'cidade', 'estado',  'medida_confirmada', 'me_order_id', 'me_status', 'rastreio',
  'etiqueta_url', 'etiqueta_preco', 'etiqueta_cancelada',
  'etiqueta_cancelada_em', 'nota',
];

/* Campos que são número no banco. */
const NUMERICOS = new Set([
  'valor', 'frete', 'valor_produto', 'etiqueta_preco',
]);

async function upsertNoBanco(pedido) {
  const p = getPool();
  const dados = {};
  for (const c of COLUNAS) {
    if (pedido[c] === undefined) continue;
    dados[c] = NUMERICOS.has(c)
      ? (pedido[c] == null || pedido[c] === '' ? null : Number(pedido[c]))
      : (pedido[c] === '' ? null : pedido[c]);
  }
  if (!dados.pedido_id) dados.pedido_id = novoPedidoId();

  const cols = Object.keys(dados);
  const vals = cols.map(c => dados[c]);
  const ph = cols.map((_, i) => '$' + (i + 1));

  const atualiza = cols
    .filter(c => c !== 'pedido_id')
    .map(c => `${c} = EXCLUDED.${c}`)
    .join(', ');

  const sql =
    `INSERT INTO pedidos (${cols.join(', ')}) VALUES (${ph.join(', ')}) ` +
    `ON CONFLICT (pedido_id) DO UPDATE SET ${atualiza}, atualizado_em = now() ` +
    `RETURNING *`;

  const r = await p.query(sql, vals);
  return linhaParaPedido(r.rows[0]);
}

/* ---------- Postgres: leitura ---------- */
async function lerDoBanco() {
  const p = getPool();
  const r = await p.query(
    'SELECT * FROM pedidos ORDER BY atualizado_em DESC, criado_em DESC LIMIT $1',
    [LIMITE]
  );
  return r.rows.map(linhaParaPedido);
}

/* Procura um pedido por qualquer código que o cliente possa ter:
   nosso pedido_id, o payment_id, o preference_id ou o rastreio. */
async function buscarNoBanco(codigo) {
  const c = String(codigo || '').trim();
  if (!c) return null;
  const p = getPool();
  /* ORDER BY garante que, se um código aparecer em duas linhas (por
     exemplo um payment_id reusado), a mais recente vem primeiro. */
  const r = await p.query(
    `SELECT * FROM pedidos
      WHERE pedido_id = $1 OR payment_id = $1 OR preference_id = $1 OR rastreio = $1
      ORDER BY atualizado_em DESC NULLS LAST, criado_em DESC
      LIMIT 1`,
    [c]
  );
  return r.rows[0] ? linhaParaPedido(r.rows[0]) : null;
}

/* ---------- /tmp (só desenvolvimento) ---------- */
async function lerDoTmp() {
  try {
    const t = await fs.readFile(ARQ, 'utf8');
    const j = JSON.parse(t);
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

async function gravarNoTmp(lista) {
  await fs.mkdir(path.dirname(ARQ), { recursive: true });
  await fs.writeFile(ARQ, JSON.stringify(lista.slice(-LIMITE)), 'utf8');
}

/* ---------- API pública ---------- */

/* Todos os pedidos (do mais recente para o mais antigo). */
async function ler() {
  if (temBanco()) return lerDoBanco();
  const l = await lerDoTmp();
  return l.slice().reverse();
}

/* Grava (ou atualiza) UM pedido. Devolve o pedido salvo. */
async function salvar(pedido) {
  if (temBanco()) return upsertNoBanco(pedido);

  /* dev: arquivo */
  const lista = await lerDoTmp();
  const id = pedido.pedido_id || novoPedidoId();
  const i = lista.findIndex(x => x.pedido_id === id);
  const completo = { ...(i >= 0 ? lista[i] : {}), ...pedido, pedido_id: id };
  if (i >= 0) lista[i] = completo;
  else lista.push(completo);
  await gravarNoTmp(lista);
  return completo;
}

/* Procura um pedido por qualquer código. */
async function buscar(codigo) {
  if (temBanco()) return buscarNoBanco(codigo);
  const c = String(codigo || '').trim();
  const lista = await lerDoTmp();
  return (
    lista.find(
      x =>
        x.pedido_id === c ||
        x.payment_id === c ||
        x.preference_id === c ||
        x.rastreio === c
    ) || null
  );
}

/* Gera um código de pedido novo (único). */
async function gerarPedidoId() {
  if (!temBanco()) return novoPedidoId();
  const p = getPool();
  for (let tent = 0; tent < 5; tent++) {
    const id = novoPedidoId();
    const r = await p.query('SELECT 1 FROM pedidos WHERE pedido_id = $1', [id]);
    if (!r.rowCount) return id;
  }
  return novoPedidoId() + Date.now().toString(36).slice(-3).toUpperCase();
}

module.exports = {
  ler,
  salvar,
  buscar,
  gerarPedidoId,
  temBanco,
  novoPedidoId,
  LIMITE,
};
