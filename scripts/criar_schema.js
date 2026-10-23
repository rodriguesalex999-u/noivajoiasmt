/* ============================================================
   SCHEMA DO BANCO — cria/migra a tabela de pedidos no Postgres
   ============================================================
   Uso: node scripts/criar_schema.js

   POR QUE MUDOU O FORMATO
     A primeira versão usava `payment_id` como chave primária. Mas
     o pedido nasce ANTES do pagamento existir: quando o cliente
     clica em "comprar", o Mercado Pago ainda não devolveu o
     payment_id. Se a chave fosse o payment_id, não dava para
     guardar o pedido naquele momento.

     Agora a chave é o `pedido_id` — um código nosso (ex.: PJ-7K3M2Q)
     que existe desde o clique em "comprar". O `payment_id` do
     Mercado Pago entra depois e preenche a mesma linha.

     O script migra sem perder dado: se a tabela antiga existir, as
     linhas são copiadas para o formato novo.
   ============================================================ */
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const COLUNAS_NOVAS = `
  pedido_id          TEXT PRIMARY KEY,
  payment_id         TEXT,
  preference_id      TEXT,
  external_reference TEXT,
  status             TEXT,
  etapa              TEXT,
  criado_em          TEXT,
  aprovado_em        TEXT,
  produto            TEXT,
  valor              NUMERIC,
  frete              NUMERIC,
  valor_produto      NUMERIC,
  modalidade         TEXT,
  regiao             TEXT,
  prazo              TEXT,
  nome               TEXT,
  email              TEXT,
  telefone           TEXT,
  cpf                TEXT,
  cep                TEXT,
  endereco           TEXT,
  numero             TEXT,
  complemento        TEXT,
  bairro             TEXT,
  cidade             TEXT,
  estado             TEXT,
  medida_confirmada  TEXT,
  me_order_id        TEXT,
  me_status          TEXT,
  rastreio           TEXT,
  etiqueta_url       TEXT,
  etiqueta_preco     NUMERIC,
  etiqueta_cancelada BOOLEAN DEFAULT false,
  etiqueta_cancelada_em TEXT,
  nota               TEXT,
  atualizado_em      TIMESTAMPTZ DEFAULT now()
`;

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL nao encontrado no .env.local');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 20000,
  });

  console.log('1) testando conexao...');
  const t = await pool.query('SELECT version()');
  console.log('   OK ->', t.rows[0].version.split(',')[0]);

  /* ---------- a tabela existe? em que formato? ---------- */
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'pedidos'`
  );
  const nomes = cols.rows.map(r => r.column_name);
  const temPaymentId = nomes.includes('payment_id');
  const temPedidoId = nomes.includes('pedido_id');

  if (!temPaymentId && !temPedidoId) {
    console.log('2) criando a tabela pedidos...');
    await pool.query(`CREATE TABLE pedidos (${COLUNAS_NOVAS})`);
    console.log('   OK');
  } else if (temPaymentId && !temPedidoId) {
    console.log('2) migrando a tabela antiga (payment_id -> pedido_id)...');
    const quantas = await pool.query('SELECT COUNT(*)::int AS n FROM pedidos');
    await pool.query('ALTER TABLE pedidos RENAME TO pedidos_antiga');
    await pool.query(`CREATE TABLE pedidos (${COLUNAS_NOVAS})`);
    await pool.query(
      `INSERT INTO pedidos (
         pedido_id, payment_id, status, criado_em, aprovado_em, produto,
         valor, frete, modalidade, regiao, prazo, nome, email, telefone,
         cpf, cep, endereco, numero, complemento, bairro, cidade, estado,
         medida_confirmada, me_order_id, rastreio, etiqueta_url, etiqueta_preco
       )
       SELECT
         'LEGADO-' || payment_id, payment_id, status,
         criado_em, aprovado_em, produto, valor, frete, modalidade, regiao,
         prazo, nome, email, telefone, cpf, cep, endereco, numero,
         complemento, bairro, cidade, estado, medida_confirmada, me_order_id,
         rastreio, etiqueta_url, etiqueta_preco
       FROM pedidos_antiga`
    );
    await pool.query('DROP TABLE pedidos_antiga');
    console.log('   OK ->', quantas.rows[0].n, 'pedido(s) migrado(s)');
  } else {
    console.log('2) a tabela ja esta no formato novo');
  }

  console.log('3) colunas novas que faltarem...');
  const extras = [
    ['external_reference', 'TEXT'],
    ['etapa', 'TEXT'],
    ['valor_produto', 'NUMERIC'],
    ['etiqueta_cancelada', 'BOOLEAN DEFAULT false'],
    ['etiqueta_cancelada_em', 'TEXT'],
    ['nota', 'TEXT'],
    ['me_status', 'TEXT'],
  ];
  for (const [col, tipo] of extras) {
    await pool.query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS ${col} ${tipo}`);
  }
  console.log('   OK');

  console.log('4) indices...');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_pedidos_cpf ON pedidos (cpf)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_pedidos_rastreio ON pedidos (rastreio)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos (status)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_pedidos_payment ON pedidos (payment_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_pedidos_pref ON pedidos (preference_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_pedidos_atualizado ON pedidos (atualizado_em DESC)');
  console.log('   OK');

  console.log('5) gravando e lendo um pedido de teste...');
  await pool.query(
    `INSERT INTO pedidos (pedido_id, payment_id, status, produto, valor, nome, cpf, criado_em)
     VALUES ($1,$2,$3,$4,$5,$6,$7, now()::text)
     ON CONFLICT (pedido_id) DO UPDATE SET atualizado_em = now()`,
    ['TESTE_SCHEMA_1', 'TESTE_SCHEMA_1', 'approved', 'Teste', 100, 'Teste', '00000000000']
  );
  const r = await pool.query('SELECT * FROM pedidos WHERE pedido_id = $1', ['TESTE_SCHEMA_1']);
  console.log('   OK ->', r.rows[0].pedido_id, r.rows[0].produto, r.rows[0].valor);

  console.log('6) apagando o pedido de teste...');
  await pool.query('DELETE FROM pedidos WHERE pedido_id = $1', ['TESTE_SCHEMA_1']);
  const c = await pool.query('SELECT COUNT(*)::int AS n FROM pedidos');
  console.log('   OK -> restam', c.rows[0].n, 'pedido(s) na tabela');

  await pool.end();
  console.log('\nSchema pronto.');
}

main().catch(e => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
