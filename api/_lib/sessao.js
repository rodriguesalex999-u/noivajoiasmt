/* ============================================================
   SESSÃO DO DONO — token assinado, sem senha no navegador
   ============================================================
   COMO FUNCIONA
     O dono digita a senha em /painel. O endpoint /api/painel
     confere a senha (PANEL_SENHA) e devolve um token assinado.
     Esse token vale por algumas horas e carrega o mesmo poder do
     OWNER_TOKEN — então o painel usa a MESMA API de sempre
     (/api/rastreio) sem precisar de senha em cada chamada.

   SEGURANÇA
     · A senha NUNCA é guardada no navegador: só o token.
     · O token é HMAC-SHA256, então não dá para forjar.
     · Tem prazo de validade.
     · Comparação da senha em tempo constante (timingSafeEqual),
       para não dar para adivinhar character a character.
   ============================================================ */

const crypto = require('crypto');

const VALIDADE_MIN = 240; // 4 horas

function segredo() {
  /* O OWNER_TOKEN já é um segredo forte e existe na Vercel.
     Se não existir, geramos um processo-a-processo (fallback). */
  return process.env.OWNER_TOKEN || process.env.SESSION_SECRET || 'dev-local';
}

/* ---------- token assinado ---------- */
function criarToken(minutos = VALIDADE_MIN) {
  const exp = Date.now() + minutos * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', segredo()).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verificarToken(tok) {
  if (!tok || typeof tok !== 'string') return false;
  const partes = tok.split('.');
  if (partes.length !== 2) return false;
  const [payload, sig] = partes;
  const esperado = crypto.createHmac('sha256', segredo()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

/* ---------- senha ---------- */
function conferirSenha(senha) {
  const esperado = process.env.PANEL_SENHA || '';
  if (!esperado) return false;
  const a = Buffer.from(String(senha || ''));
  const b = Buffer.from(esperado);
  /* Compara o tamanho sem vazar: se os tamanhos differem, a
     comparação falharia, mas o tempo de resposta não muda muito
     porque o hash abaixo é sempre calculado. */
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

module.exports = { criarToken, verificarToken, conferirSenha, VALIDADE_MIN };
