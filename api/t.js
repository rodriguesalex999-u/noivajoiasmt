/* Recebe os eventos do site (visita, clique no WhatsApp, checkout, compra).
   Chamado pelo /nj-metricas.js. Não devolve nada útil de propósito. */
const ev = require('./_lib/eventos.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    if (ev.ehRobo(req) || ev.ehInterno(req)) return res.status(204).end();
    let b = req.body || {};
    if (typeof b === 'string') {
      try { b = JSON.parse(b); } catch { b = {}; }
    }
    await ev.registrar({ tipo: b.t, canal: b.c, pagina: b.p, vid: b.v });
  } catch (e) {
    console.error('evento:', e.message);
  }
  return res.status(204).end();
};
