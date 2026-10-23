/* ============================================================
   PAINEL — login do dono
   ============================================================
   O painel fica em /painel (ver painel.html). Ele tem uma tela de
   login; o dono digita a senha e recebe um token assinado que vale
   por 4 horas. Esse token é o mesmo que o /api/rastreio aceita, então
   o painel usa a API que já existe — sem duplicar regra nenhuma.

   A senha vive na variável PANEL_SENHA da Vercel. Nunca no HTML.
   ============================================================ */

const sessao = require('./_lib/sessao.js');

module.exports = async function handler(req, res) {
  /* Sem CORS liberado de propósito: este endpoint é chamado pela
     mesma origem (o site), não por sites de terceiros. */

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      tem_senha: !!process.env.PANEL_SENHA,
      sessao_minutos: sessao.VALIDADE_MIN,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Use POST' });
  }

  if (!process.env.PANEL_SENHA) {
    return res.status(503).json({
      erro: 'PANEL_SENHA não configurada na Vercel',
    });
  }

  const senha = String(req.body?.senha || '');
  if (!senha) {
    return res.status(400).json({ erro: 'informe a senha' });
  }

  if (!sessao.conferirSenha(senha)) {
    /* Espera um pouco antes de responder: deixa o ataque por
       tentativa ficar lento e não ajuda a adivinhar. */
    await new Promise(r => setTimeout(r, 700));
    return res.status(401).json({ erro: 'senha incorreta' });
  }

  return res.status(200).json({
    ok: true,
    token: sessao.criarToken(),
    expira_em_minutos: sessao.VALIDADE_MIN,
  });
};
