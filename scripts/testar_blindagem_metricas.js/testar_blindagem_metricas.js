/* Teste local da blindagem (18/11/2026). Só usa o canal de teste
   (fica fora do painel) e apaga tudo que criar. */
const fs = require('fs');
const path = require('path');
const envFile = process.env.NJ_ENV_FILE || 'G:\\Meu Drive\\GERAL\\NOIVA_JOIAS_MT\\.env.local';
for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([^#][A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const ev = require(path.join(__dirname, '..', 'api', '_lib', 'eventos.js'));
const { Client } = require('G:\\Meu Drive\\GERAL\\NOIVA_JOIAS_MT\\node_modules\\pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const reqChrome = { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', 'x-forwarded-for': '203.0.113.77', 'accept-language': 'pt-BR' } };
  const reqCurl = { headers: { 'user-agent': 'curl/8.5.0', 'x-forwarded-for': '203.0.113.99' } };
  const reqZap = { headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 WhatsApp/2.23.20.0', 'x-forwarded-for': '203.0.113.88' } };
  console.log('robo curl:', ev.ehRobo(reqCurl), '| robo chrome:', ev.ehRobo(reqChrome), '| cliente WhatsApp:', ev.ehRobo(reqZap));
  const canal = 'testeverificacao';
  const fpTeste = ev.dedo(reqChrome);
  /* primeira gravação cria as tabelas (eventos_quarentena) */
  await ev.registrar(reqChrome, { tipo: 'visita', canal, pagina: '/', vid: 'vteste000aaa' });
  await c.query('DELETE FROM eventos WHERE canal=$1', [canal]);
  await c.query('DELETE FROM eventos_quarentena WHERE fp=$1', [fpTeste]);
  const r1 = await ev.registrar(reqChrome, { tipo: 'visita', canal, pagina: '/', vid: 'vteste001aaa' });
  const r2 = await ev.registrar(reqChrome, { tipo: 'visita', canal, pagina: '/', vid: 'vteste002bbb' });
  const r3 = await ev.registrar(reqChrome, { tipo: 'visita', canal, pagina: '/', vid: 'vteste003ccc' });
  const r4 = await ev.registrar(reqChrome, { tipo: 'visita', canal, pagina: '/', vid: 'vteste004ddd' });
  console.log('visita 1:', JSON.stringify(r1), '| visita 2:', JSON.stringify(r2));
  console.log('visita 3:', JSON.stringify(r3), '| visita 4:', JSON.stringify(r4));
  const q = await c.query('SELECT count(*)::int n, count(DISTINCT vid)::int v FROM eventos WHERE canal=$1', [canal]);
  console.log('linhas de visita que sobraram no banco:', q.rows[0].n, '| navegadores diferentes:', q.rows[0].v);
  const q2 = await c.query('SELECT count(*)::int n FROM eventos_quarentena WHERE fp=$1 AND ate > now()', [fpTeste]);
  console.log('origem bloqueada (quarentena):', q2.rows[0].n === 1 ? 'SIM' : 'NAO');
  const rCurva = await ev.registrar(reqChrome, { tipo: 'checkout', canal, pagina: '/checkout', vid: 'vteste001aaa' });
  console.log('checkout sem visita (vid novo):', JSON.stringify(rCurva));
  await c.query('DELETE FROM eventos WHERE canal=$1', [canal]);
  await c.query('DELETE FROM eventos_quarentena WHERE fp=$1', [fpTeste]);
  const limpa = await c.query('SELECT count(*)::int n FROM eventos WHERE canal=$1', [canal]);
  console.log('limpeza final do teste:', limpa.rows[0].n === 0 ? 'OK (0 linhas)' : 'FALHOU');
  await c.end();
})().catch(e => { console.error('ERRO_TESTE: ' + e.message); process.exit(1); });
