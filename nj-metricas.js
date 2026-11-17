/* 17/11/2026 — MÉTRICAS ORGÂNICAS POR CANAL (pedido do dono).
   Conta, por canal (?nj=youtube, ?nj=pinterest, ...): visita ao site, clique no
   WhatsApp, abertura do checkout e compra aprovada. Manda só o tipo do evento, o
   canal, a página e um número aleatório do navegador. Nada que identifique a pessoa. */
(function () {
  function canal() {
    try { var o = window.njOrigem && window.njOrigem(); if (o && o.ad) return 'anuncio-meta'; } catch (e) {}
    try { var c = JSON.parse(localStorage.getItem('nj_canal') || 'null'); if (c && c.c && Date.now() - c.em < 30 * 864e5) return c.c; } catch (e) {}
    return 'direto';
  }
  function vid() {
    try {
      var v = localStorage.getItem('nj_vid');
      if (!v) { v = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); localStorage.setItem('nj_vid', v); }
      return v;
    } catch (e) { return ''; }
  }
  function enviar(tipo) {
    try {
      var corpo = JSON.stringify({ t: tipo, c: canal(), p: location.pathname, v: vid() });
      fetch('/api/t', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(function () {});
    } catch (e) {}
  }
  function umaVez(chave, tipo) {
    try { if (sessionStorage.getItem(chave)) return; sessionStorage.setItem(chave, '1'); } catch (e) {}
    enviar(tipo);
  }
  umaVez('nj_m_visita', 'visita');
  if (/^\/checkout/.test(location.pathname)) umaVez('nj_m_checkout', 'checkout');
  if (/^\/obrigado/.test(location.pathname)) {
    try {
      var q = new URLSearchParams(location.search);
      var st = (q.get('collection_status') || q.get('status') || '').toLowerCase();
      var id = q.get('payment_id') || q.get('collection_id') || '';
      if (st === 'approved' && id && !localStorage.getItem('nj_m_compra_' + id)) {
        localStorage.setItem('nj_m_compra_' + id, '1');
        enviar('compra');
      }
    } catch (e) {}
  }
  var ultimo = 0;
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href*="wa.me"],a[href*="api.whatsapp.com"]');
    if (!a) return;
    var agora = Date.now();
    if (agora - ultimo < 2000) return;
    ultimo = agora;
    enviar('whats');
  }, true);
})();
