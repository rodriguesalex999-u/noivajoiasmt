/* 18/11/2026 — MÉTRICAS ORGÂNICAS POR CANAL, BLINDADAS CONTRA TESTE E IA.
   Conta, por canal (?nj=youtube, ?nj=pinterest, ...): visita ao site, clique no
   WhatsApp, abertura do checkout e compra aprovada. Manda só o tipo do evento, o
   canal, a página e um número aleatório do navegador. Nada que identifique a pessoa.

   Blindagem (pedido do dono em 18/11/2026): o mesmo link já foi aberto por
   máquinas e entrance como se fossem clientes. Agora:
     - navegador interno (cookie/localStorage nj_interno) nunca conta;
     - navegador automático (webdriver, Playwright, Puppeteer, Electron...) nunca conta;
     - visita só conta depois de 3 s com a página visível E com comportamento de
       pessoa (mouse, toque, teclado, rolagem) OU vinda de um link clicado de fora
       (YouTube, Pinterest, Desapega, WhatsApp...);
     - clique no WhatsApp só conta se for clique de verdade (e.isTrusted) — clique
       de script não conta;
     - uma visita por navegador a cada 30 minutos (não infla com recarga). */
(function () {
  /* 1) NAVEGADOR INTERNO (dono, robôs, IAs): abrir o site uma vez com
     ?nj_interno=1 grava cookie + localStorage e este navegador deixa de ser
     contado (nem visita, nem clique, nem /zap). ?nj_interno=0 volta a contar. */
  try {
    var qi = new URLSearchParams(location.search).get('nj_interno');
    if (qi === '1') {
      document.cookie = 'nj_interno=1; max-age=157680000; path=/; SameSite=Lax';
      try { localStorage.setItem('nj_interno', '1'); } catch (e) {}
      return;
    }
    if (qi === '0') {
      document.cookie = 'nj_interno=; max-age=0; path=/';
      try { localStorage.removeItem('nj_interno'); } catch (e) {}
    }
    if (/(?:^|;\s*)nj_interno=1/.test(document.cookie)) return;
    try { if (localStorage.getItem('nj_interno') === '1') return; } catch (e) {}
  } catch (e) {}

  /* 2) NAVEGADOR AUTOMÁTICO — não conta em nenhum caso. */
  try { if (navigator.webdriver) return; } catch (e) {}
  try {
    if (window.__playwright || window.__pw || window.__puppeteer_evaluation__ ||
        window.__nightmare || window._phantom || window.cdc_adoQpoasnfa76pfcZLmcfl_) return;
  } catch (e) {}
  try {
    if (/HeadlessChrome|Electron|Playwright|Puppeteer|Selenium|PhantomJS/i.test(navigator.userAgent || '')) return;
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

  /* 3) SINAIS DE PESSOA REAL. */
  var humano = false;
  var esperas = [];
  function marcar() {
    if (humano) return;
    humano = true;
    while (esperas.length) { try { esperas.shift()(); } catch (e) {} }
  }
  try {
    document.addEventListener('pointerdown', marcar, true);
    document.addEventListener('keydown', marcar, true);
    document.addEventListener('touchstart', marcar, { passive: true });
    document.addEventListener('scroll', marcar, { passive: true });
    document.addEventListener('pointermove', function (e) {
      if (humano) return;
      if (Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) > 0) marcar();
    }, { passive: true });
  } catch (e) {}

  /* Veio de um link clicado fora do site (YouTube, Pinterest, Desapega,
     WhatsApp...)? Isso é clique de pessoa: conta mesmo sem mexer o mouse. */
  function veioDeFora() {
    try {
      var r = document.referrer;
      if (!r) return false;
      var u = new URL(r);
      var h = (u.hostname || '').toLowerCase();
      if (!h) return false;
      if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]') return false;
      if (h === 'noivajoiasmt.vercel.app' || h === 'www.noivajoiasmt.vercel.app') return false;
      return true;
    } catch (e) { return false; }
  }
  function podeContar() { return humano || veioDeFora(); }
  /* Espera a pessoa mexer na página (sem prazo: se nunca mexer, não conta). */
  function quandoMexer(cb) {
    if (podeContar()) { setTimeout(cb, 1500); return; }
    esperas.push(cb);
  }

  /* 4) VISITA — 1 por navegador a cada 30 minutos, só com página visível. */
  function umaVez(chave, tipo, minimoMs) {
    try {
      var agora = Date.now();
      var last = parseInt(localStorage.getItem(chave) || '0', 10) || 0;
      if (agora - last < (minimoMs || 0)) return;
      localStorage.setItem(chave, String(agora));
    } catch (e) { return; }
    enviar(tipo);
  }
  function contarVisita() { umaVez('nj_m_visita', 'visita', 30 * 60 * 1000); }
  function visita() {
    if (document.visibilityState !== 'visible') return;
    setTimeout(function () {
      if (document.visibilityState !== 'visible') return;
      if (podeContar()) { contarVisita(); return; }
      quandoMexer(contarVisita);
    }, 3000);
  }
  visita();
  document.addEventListener('visibilitychange', visita);

  /* 5) CHECKOUT — quando a pessoa mexer na página (ou depois de 6 s, porque
     chegou aqui sozinha pelo botão do site). */
  if (/^\/checkout/.test(location.pathname)) {
    var mandouCheckout = false;
    function mandaCheckout() {
      if (mandouCheckout) return;
      mandouCheckout = true;
      umaVez('nj_m_checkout', 'checkout', 0);
    }
    quandoMexer(mandaCheckout);
    setTimeout(function () { if (document.visibilityState === 'visible') mandaCheckout(); }, 6000);
  }

  /* 6) COMPRA — volta do Mercado Pago com pagamento aprovado. */
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

  /* 7) CLIQUE NO WHATSAPP — só clique de verdade (e.isTrusted). */
  var ultimo = 0;
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href*="wa.me"],a[href*="api.whatsapp.com"]');
    if (!a) return;
    if (!e.isTrusted) return;
    var agora = Date.now();
    if (agora - ultimo < 2000) return;
    ultimo = agora;
    marcar();
    contarVisita();
    enviar('whats');
  }, true);
})();
