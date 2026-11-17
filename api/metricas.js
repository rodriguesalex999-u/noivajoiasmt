/* RESUMO DAS MÉTRICAS POR CANAL — lido pelo PAINEL-CANAIS.html (no PC do dono)
   e pelas IAs. Só números somados (nenhum dado de cliente).
   Exige a chave ?k=... (o que fica aqui é só o SHA-256 dela; a chave está em
   G:\\Meu Drive\\GERAL\\CREDENCIAIS-SEGURAS) ou o token do dono. */
const crypto = require('crypto');
const ev = require('./_lib/eventos.js');
const sessao = require('./_lib/sessao.js');
const HASH = 'ba5b1b3f16229618dddae8864b8a3688ca12d03fcf73980f23adc3c64b198e88';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Use GET' });
  const k = String(req.query?.k || '');
  const okChave = k && crypto.createHash('sha256').update(k).digest('hex') === HASH;
  const t = String(req.headers['x-owner-token'] || '');
  const okDono = t && ((process.env.OWNER_TOKEN && t === process.env.OWNER_TOKEN) || sessao.verificarToken(t));
  if (!okChave && !okDono) return res.status(401).json({ erro: 'não autorizado' });
  try {
    const r = req.query?.limpar_nav ? await ev.limparNav(req.query.limpar_nav) : req.query?.teste ? await ev.testes() : await ev.resumo(req.query?.dias);
    return res.status(r.ok ? 200 : 503).json(r);
  } catch (e) {
    console.error('metricas:', e);
    return res.status(500).json({ ok: false, erro: String(e.message || e).slice(0, 200) });
  }
};
