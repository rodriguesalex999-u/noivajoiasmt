/* ============================================================
   EVENTOS — métricas orgânicas por canal (17/11/2026, pedido do dono)
   ============================================================
   Guarda, no mesmo Postgres dos pedidos, uma linha por evento:
     visita   — alguém abriu o site (1 por sessão do navegador)
     whats    — clicou num botão/link do WhatsApp
     checkout — abriu a página de pagamento do site
     compra   — voltou do Mercado Pago com pagamento aprovado
   Cada linha leva o CANAL (youtube, pinterest, desapega, direto,
   gadsp1, anuncio-meta...). O canal vem do ?nj=<canal> do link.
   Não guarda nome, telefone, IP nem nada que identifique a pessoa:
   só um número aleatório do navegador (vid) para contar visitantes.
   ============================================================ */
const TIPOS = new Set(['visita', 'whats', 'checkout', 'compra']);
const ROBO = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp\/|telegram|headless|lighthouse|pingdom|uptime|curl|wget|python|node-fetch|axios/i;

let pool = null;
let pronto = null;

function temBanco() {
  return !!(process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED);
}
function getPool() {
  if (pool) return pool;
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 15000,
  });
  pool.on('error', e => console.error('pool eventos:', e.message));
  return pool;
}
function preparar() {
  if (!pronto) {
    pronto = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS eventos (
           id BIGSERIAL PRIMARY KEY,
           em TIMESTAMPTZ NOT NULL DEFAULT now(),
           tipo TEXT NOT NULL,
           canal TEXT NOT NULL,
           pagina TEXT,
           vid TEXT
         );
         CREATE INDEX IF NOT EXISTS eventos_em_idx ON eventos (em);`
      )
      .catch(e => {
        pronto = null;
        throw e;
      });
  }
  return pronto;
}

const limpar = (s, n) => String(s || '').toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, n);

function ehRobo(req) {
  const ua = String(req.headers['user-agent'] || '');
  return !ua || ROBO.test(ua);
}

/* Navegador marcado como interno (cookie nj_interno=1, ver nj-metricas.js). */
function ehInterno(req) {
  return /(?:^|;\s*)nj_interno=1/.test(String(req.headers.cookie || ''));
}

async function registrar({ tipo, canal, pagina, vid }) {
  tipo = limpar(tipo, 12);
  if (!TIPOS.has(tipo)) return { ok: false, erro: 'tipo' };
  if (!temBanco()) return { ok: false, erro: 'sem_banco' };
  await preparar();
  await getPool().query('INSERT INTO eventos (tipo, canal, pagina, vid) VALUES ($1,$2,$3,$4)', [
    tipo,
    limpar(canal, 24) || 'direto',
    String(pagina || '').replace(/[^a-zA-Z0-9\/\-_.]/g, '').slice(0, 40) || '/',
    limpar(vid, 24) || null,
  ]);
  return { ok: true };
}

/* Resumo por canal e por dia (dia no horário de Cuiabá).
   Canais que começam com "teste" ficam fora (usados para testar o sistema). */
async function resumo(dias) {
  if (!temBanco()) return { ok: false, erro: 'sem_banco' };
  await preparar();
  dias = Math.min(Math.max(parseInt(dias, 10) || 30, 1), 365);
  const p = getPool();
  const desde = `(date_trunc('day', now() AT TIME ZONE 'America/Cuiaba') - ($1::int - 1) * interval '1 day') AT TIME ZONE 'America/Cuiaba'`;
  const porCanal = await p.query(
    `SELECT canal,
            count(*) FILTER (WHERE tipo='visita')::int AS visitas,
            count(DISTINCT vid) FILTER (WHERE tipo='visita')::int AS visitantes,
            count(*) FILTER (WHERE tipo='whats')::int AS whats,
            count(*) FILTER (WHERE tipo='checkout')::int AS checkout,
            count(*) FILTER (WHERE tipo='compra')::int AS compras
       FROM eventos WHERE em >= ${desde} AND canal NOT LIKE 'teste%'
      GROUP BY canal ORDER BY visitas DESC, whats DESC`,
    [dias]
  );
  const porDia = await p.query(
    `SELECT to_char(em AT TIME ZONE 'America/Cuiaba','YYYY-MM-DD') AS dia, canal,
            count(*) FILTER (WHERE tipo='visita')::int AS visitas,
            count(*) FILTER (WHERE tipo='whats')::int AS whats,
            count(*) FILTER (WHERE tipo='compra')::int AS compras
       FROM eventos WHERE em >= ${desde} AND canal NOT LIKE 'teste%'
      GROUP BY 1,2 ORDER BY 1 DESC, 3 DESC`,
    [dias]
  );
  const primeiro = await p.query(`SELECT to_char(min(em) AT TIME ZONE 'America/Cuiaba','YYYY-MM-DD') AS d FROM eventos WHERE canal NOT LIKE 'teste%'`);
  /* Últimos eventos crus (para conferir se um número é cliente ou teste). */
  const recentes = await p.query(
    `SELECT to_char(em AT TIME ZONE 'America/Cuiaba','DD/MM HH24:MI:SS') AS quando, tipo, canal, pagina, right(coalesce(vid,''),4) AS nav
       FROM eventos WHERE canal NOT LIKE 'teste%' ORDER BY em DESC LIMIT 60`
  );
  return { ok: true, dias, medindo_desde: primeiro.rows[0]?.d || null, canais: porCanal.rows, por_dia: porDia.rows, recentes: recentes.rows };
}

module.exports = { registrar, resumo, ehRobo, ehInterno, temBanco, limpar };
