/* 17/11/2026 — MÉTRICAS ORGÂNICAS POR CANAL (pedido do dono).
   Conta, por canal (?nj=youtube, ?nj=pinterest, ...): visita ao site, clique no
   WhatsApp, abertura do checkout e compra aprovada. Manda só o tipo do evento, o
   canal, a página e um número aleatório do navegador. Nada que identifique a pessoa. */
(function () {
  /* NAVEGADOR INTERNO (dono, robôs, IAs): abrir o site uma vez com ?nj_interno=1 grava um
     cookie e este navegador deixa de ser contado (nem visita, nem clique, nem /zap).
     ?nj_interno=0 volta a contar. Assim teste e conferência não viram "cliente". */
  try {
    var qi = new URLSearchParams(location.search).get('nj_interno');
    if (qi === '1') document.cookie = 'nj_interno=1; max-age=157680000; path=/; SameSite=Lax';
    if (qi === '0') document.cookie = 'nj_interno=; max-age=0; path=/';
    if (/(?:^|;\s*)nj_interno=1/.test(document.cookie)) return;
  } catch (e) {}
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
  /* Robô que roda script (navegador automático) não conta. E a visita só conta depois de
     3 segundos com a página visível na tela: quem "testa" link (YouTube, Google, Pinterest)
     abre e fecha na hora, e não vira cliente. */
  try { if (navigator.webdriver) return; } catch (e) {}
  function visita() {
    if (document.visibilityState !== 'visible') return;
    setTimeout(function () { if (document.visibilityState === 'visible') umaVez('nj_m_visita', 'visita'); }, 3000);
  }
  visita();
  document.addEventListener('visibilitychange', visita);
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
