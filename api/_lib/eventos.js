/* ============================================================
   EVENTOS — métricas orgânicas por canal (17/11/2026, pedido do dono)
   ============================================================
   Guarda, no mesmo Postgres dos pedidos, uma linha por evento:
     visita   — alguém abriu o site (1 por navegador a cada 30 min)
     whats    — clicou de verdade num botão/link do WhatsApp
     checkout — abriu a página de pagamento do site
     compra   — voltou do Mercado Pago com pagamento aprovado
   Cada linha leva o CANAL (youtube, pinterest, desapega, direto,
   gadsp1, anuncio-meta...). O canal vem do ?nj=<canal> do link.
   Não guarda nome, telefone nem IP: só um número aleatório do
   navegador (vid) e uma impressão digital anônima (fp = hash de
   IP + user-agent + idioma). O hash serve só para reconhecer
   robôs e nunca é enviado para lugar nenhum.
   ============================================================ */
/* 18/11/2026 (Cuiabá) — o dono mandou ZERAR DE NOVO e blindar
   contra teste/IA. Antes disso o mesmo link foi aberto por máquinas
   (6 aberturas em 7 segundos, cada uma com um navegador diferente)
   e entraram como se fossem clientes. Regras novas:
   (1) o resumo só conta a partir de INICIO (abaixo);
   (2) visita só conta depois de 3 s com a página visível E com
       comportamento de pessoa (mouse/toque/teclado/rolagem) ou vinda
       de um link clicado de fora (YouTube, Pinterest, ...);
   (3) clique no WhatsApp só conta se for clique de verdade (e.isTrusted);
   (4) no servidor: navegador/máquina que abre vários navegadores ou
       repete o mesmo evento em segundos é bloqueado e os eventos
       dele são apagados;
   (5) checkout/compra só contam se a mesma pessoa já apareceu no site.
   Nada é apagado do banco além do que for identificado como máquina.
   Para zerar de novo, mude a data de INICIO. */
const INICIO = '2026-11-18T13:15:00-04:00';
const TIPOS = new Set(['visita', 'whats', 'checkout', 'compra']);
/* Palavras de navegador automático. "WhatsApp" sozinho NÃO entra: o
   WhatsApp é um cliente de verdade — só o robô de pré-visualização é
   barrado (ele não tem "Mozilla/" no user-agent, regra logo abaixo). */
const ROBO = /bot|crawl|spider|slurp|preview|facebookexternalhit|telegram|headless|lighthouse|pingdom|uptime|curl|wget|python|node-fetch|axios|playwright|puppeteer|selenium|phantomjs|electron|applebot|bingpreview|googlebot|semrush|ahrefs/i;
const crypto = require('crypto');

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
         ALTER TABLE eventos ADD COLUMN IF NOT EXISTS fp TEXT;
         CREATE INDEX IF NOT EXISTS eventos_em_idx ON eventos (em);
         CREATE INDEX IF NOT EXISTS eventos_fp_idx ON eventos (fp);
         CREATE TABLE IF NOT EXISTS eventos_quarentena (
           fp TEXT PRIMARY KEY,
           ate TIMESTAMPTZ NOT NULL,
           motivo TEXT
         );`
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
  if (!ua) return true;
  /* Navegador de verdade sempre fala "Mozilla/". Robô de pré-visualização
     (WhatsApp, Facebook, Google) não fala — assim o cliente que abre pelo
     WhatsApp no celular continua contando. */
  if (!/mozilla\//i.test(ua)) return true;
  return ROBO.test(ua);
}

/* Navegador marcado como interno (cookie nj_interno=1, ver nj-metricas.js). */
function ehInterno(req) {
  return /(?:^|;\s*)nj_interno=1/.test(String(req.headers.cookie || ''));
}

/* Impressão digital anônima: hash de IP + user-agent + idioma.
   O IP e o user-agent NÃO são gravados — só o hash, que serve
   para saber se várias aberturas vieram da mesma máquina. */
function dedo(req) {
  const xf = String(req.headers['x-forwarded-for'] || '');
  const ip = xf.split(',')[0].trim() || String(req.headers['x-real-ip'] || '').trim() || '';
  const ua = String(req.headers['user-agent'] || '');
  const idioma = String(req.headers['accept-language'] || '');
  return crypto.createHash('sha256').update(ip + '|' + ua + '|' + idioma).digest('hex').slice(0, 32);
}

async function emQuarentena(p, fp) {
  const r = await p.query('SELECT 1 FROM eventos_quarentena WHERE fp=$1 AND ate > now() LIMIT 1', [fp]);
  return r.rowCount > 0;
}
async function quarantenar(p, fp, motivo) {
  await p.query(
    `INSERT INTO eventos_quarentena (fp, ate, motivo) VALUES ($1, now() + interval '60 minutes', $2)
     ON CONFLICT (fp) DO UPDATE SET ate = EXCLUDED.ate, motivo = EXCLUDED.motivo`,
    [fp, motivo]
  );
}

/* Máquina = mesma origem abrindo vários navegadores em pouco tempo ou
   repetindo o mesmo evento em segundos. Quando aparece, os eventos
   daquele instante são apagados e a origem fica bloqueada por 1 hora. */
async function pareceMaquina(p, fp, tipo) {
  const r1 = await p.query(
    `SELECT count(DISTINCT vid)::int AS n FROM eventos
       WHERE fp=$1 AND tipo='visita' AND em >= now() - interval '60 seconds'`,
    [fp]
  );
  if ((r1.rows[0] && r1.rows[0].n) >= 2) {
    await p.query(
      `DELETE FROM eventos WHERE fp=$1 AND tipo='visita' AND em >= now() - interval '60 seconds'`,
      [fp]
    );
    await quarantenar(p, fp, 'rajada de visitas');
    return true;
  }
  if (tipo === 'whats' || tipo === 'checkout') {
    const r2 = await p.query(
      `SELECT count(*)::int AS n FROM eventos
         WHERE fp=$1 AND tipo=$2 AND em >= now() - interval '10 seconds'`,
      [fp, tipo]
    );
    if ((r2.rows[0] && r2.rows[0].n) >= 2) {
      await p.query(
        `DELETE FROM eventos WHERE fp=$1 AND tipo=$2 AND em >= now() - interval '10 seconds'`,
        [fp, tipo]
      );
      await quarantenar(p, fp, 'repique de cliques');
      return true;
    }
  }
  return false;
}

async function registrar(req, dados) {
  const tipo = limpar(dados && dados.tipo, 12);
  if (!TIPOS.has(tipo)) return { ok: false, erro: 'tipo' };
  if (!temBanco()) return { ok: false, erro: 'sem_banco' };
  const canal = limpar(dados && dados.canal, 24) || 'direto';
  const pagina = String((dados && dados.pagina) || '').replace(/[^a-zA-Z0-9\/\-_.]/g, '').slice(0, 40) || '/';
  const vid = limpar(dados && dados.vid, 24) || null;
  await preparar();
  const p = getPool();
  const fp = dedo(req);
  if (await emQuarentena(p, fp)) return { ok: true, ignorado: 'quarentena' };
  /* Funil: checkout e compra só contam para quem já apareceu no site. */
  if (tipo === 'checkout' || tipo === 'compra') {
    if (!vid) return { ok: true, ignorado: 'sem_sessao' };
    const r = await p.query(
      `SELECT 1 FROM eventos WHERE vid=$1 AND tipo IN ('visita','whats')
         AND em >= now() - interval '30 days' LIMIT 1`,
      [vid]
    );
    if (!r.rowCount) return { ok: true, ignorado: 'sem_visita' };
  }
  if (await pareceMaquina(p, fp, tipo)) return { ok: true, ignorado: 'maquina' };
  await p.query('INSERT INTO eventos (tipo, canal, pagina, vid, fp) VALUES ($1,$2,$3,$4,$5)', [
    tipo,
    canal,
    pagina,
    vid,
    fp,
  ]);
  return { ok: true };
}

/* Resumo por canal e por dia (dia no horário de Cuiabá).
   Canais que começam com "teste" ficam fora (usados para testar o sistema).
   "visitas" = aberturas do site; "visitantes" = pessoas (navegadores
   diferentes); "whats" = PESSOAS que foram ao WhatsApp (cada pessoa
   conta uma vez, mesmo clicando duas vezes); "cliques_whats" = os
   cliques brutos, só para conferência. */
/* Conferência do próprio sistema: últimos eventos dos canais "teste..." (fora do painel). */
async function testes() {
  if (!temBanco()) return { ok: false, erro: 'sem_banco' };
  await preparar();
  const r = await getPool().query(
    `SELECT to_char(em AT TIME ZONE 'America/Cuiaba','DD/MM HH24:MI:SS') AS quando, tipo, canal, pagina
       FROM eventos WHERE canal LIKE 'teste%' ORDER BY em DESC LIMIT 20`
  );
  return { ok: true, testes: r.rows };
}

/* Apaga os eventos da última hora de UM navegador (4 últimos caracteres do vid, como
   aparecem em "recentes"). Serve para tirar da conta um teste feito de propósito. */
async function limparNav(nav) {
  nav = limpar(nav, 4);
  if (nav.length !== 4) return { ok: false, erro: 'nav' };
  await preparar();
  const r = await getPool().query(
    `DELETE FROM eventos WHERE right(coalesce(vid,''),4) = $1 AND em >= now() - interval '1 hour'`,
    [nav]
  );
  return { ok: true, apagados: r.rowCount };
}

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
            count(DISTINCT vid) FILTER (WHERE tipo='whats')::int AS whats,
            count(*) FILTER (WHERE tipo='whats')::int AS cliques_whats,
            count(*) FILTER (WHERE tipo='checkout')::int AS checkout,
            count(*) FILTER (WHERE tipo='compra')::int AS compras
       FROM eventos WHERE em >= ${desde} AND em >= $2 AND canal NOT LIKE 'teste%'
      GROUP BY canal ORDER BY visitas DESC, whats DESC`,
    [dias, INICIO]
  );
  const porDia = await p.query(
    `SELECT to_char(em AT TIME ZONE 'America/Cuiaba','YYYY-MM-DD') AS dia, canal,
            count(*) FILTER (WHERE tipo='visita')::int AS visitas,
            count(DISTINCT vid) FILTER (WHERE tipo='whats')::int AS whats,
            count(*) FILTER (WHERE tipo='compra')::int AS compras
       FROM eventos WHERE em >= ${desde} AND em >= $2 AND canal NOT LIKE 'teste%'
      GROUP BY 1,2 ORDER BY 1 DESC, 3 DESC`,
    [dias, INICIO]
  );
  const primeiro = await p.query(
    `SELECT to_char(min(em) AT TIME ZONE 'America/Cuiaba','YYYY-MM-DD') AS d FROM eventos
       WHERE em >= $1 AND canal NOT LIKE 'teste%'`,
    [INICIO]
  );
  /* Últimos eventos crus (para conferir se um número é cliente ou teste). */
  const recentes = await p.query(
    `SELECT to_char(em AT TIME ZONE 'America/Cuiaba','DD/MM HH24:MI:SS') AS quando, tipo, canal, pagina, right(coalesce(vid,''),4) AS nav
       FROM eventos WHERE em >= $1 AND canal NOT LIKE 'teste%' ORDER BY em DESC LIMIT 60`,
    [INICIO]
  );
  return { ok: true, dias, medindo_desde: primeiro.rows[0]?.d || null, canais: porCanal.rows, por_dia: porDia.rows, recentes: recentes.rows };
}

module.exports = { registrar, resumo, testes, limparNav, ehRobo, ehInterno, temBanco, limpar, dedo };
