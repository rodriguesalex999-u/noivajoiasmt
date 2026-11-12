/* 12/11/2026 — Google Ads: conta o clique no WhatsApp como conversão.
   Conversão "Clique WhatsApp (site)" (categoria Contato) da conta 841-847-7591.
   Carrega a tag do Google (gtag.js) e, a cada clique em link wa.me / api.whatsapp.com,
   envia o evento de conversão. O Google só atribui ao anúncio quem chegou por um clique nele. */
(function () {
  var ID = 'AW-11461352780';
  var SEND_TO = 'AW-11461352780/QnJECJm7g7cdEMy6mdkq';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', ID);
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  (document.head || document.documentElement).appendChild(s);
  var ultimo = 0;
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href*="wa.me"],a[href*="api.whatsapp.com"]');
    if (!a) return;
    var agora = Date.now();
    if (agora - ultimo < 2000) return; /* evita contar 2x o mesmo clique */
    ultimo = agora;
    try { gtag('event', 'conversion', { send_to: SEND_TO, value: 1.0, currency: 'BRL', transport_type: 'beacon' }); } catch (_) {}
  }, true);
})();
