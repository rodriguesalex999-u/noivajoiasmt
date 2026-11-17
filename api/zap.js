/* LINK CURTO DO WHATSAPP COM CANAL — /zap?nj=<canal>
   Para pôr em descrições (YouTube, Pinterest, Desapega...) quando o link
   deve abrir o WhatsApp direto. Conta 1 visita + 1 clique no WhatsApp para
   o canal e abre a conversa já com "Ref.: SITE-<canal>" (o robô lê isso). */
const ev = require('./_lib/eventos.js');

const NOMES = { youtube: 'YouTube', pinterest: 'Pinterest', desapega: 'Desapega', tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', kwai: 'Kwai', gmn: 'Google' };

module.exports = async function handler(req, res) {
  const canal = ev.limpar(req.query?.nj, 20) || 'direto';
  try {
    if (!ev.ehRobo(req)) {
      await ev.registrar({ tipo: 'visita', canal, pagina: '/zap' });
      await ev.registrar({ tipo: 'whats', canal, pagina: '/zap' });
    }
  } catch (e) {
    console.error('zap:', e.message);
  }
  const de = NOMES[canal] ? ' Vim pelo ' + NOMES[canal] + '.' : '';
  const texto = 'Olá!' + de + ' Quero ver as fotos e os valores das alianças.\n\nRef.: SITE-' + canal;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Location', 'https://wa.me/556592942810?text=' + encodeURIComponent(texto));
  return res.status(302).end();
};
