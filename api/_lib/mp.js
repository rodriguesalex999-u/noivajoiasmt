/* ============================================================
   MERCADO PAGO — o único arquivo que fala com o Mercado Pago
   ============================================================
   ATENÇÃO: O ENDPOINT ERRADO (bug que zerou o painel)
     O código antigo buscava o pagamento em
        GET /v1/payment_methods/{id}
     Esse é o endpoint dos MÉTODOS de pagamento (cartao, pix,
     boleto). Para um pagamento, o caminho certo é
        GET /v1/payments/{id}
     Com o endpoint errado a API responde 404 e o webhook nunca
     enchia o banco — por isso o painel abria vazio mesmo com
     gente pagando.

   O QUE ESTE MÓDULO FAZ
     1. buscarPagamento(id)  — details de um pagamento
     2. validarAssinatura(req) — confere o header x-signature
     3. criarPreferencia(...)  — monta o checkout

   FORMATOS CONFIRMADOS NA API (verificado em 20/10/2026)
     · o dinheiro vem em REAL (38.94 = R$ 38,94)
     · o CEP pode vir com ou sem traço — sempre guardamos só dígitos
     · o telefone vem em payer.phone.number, sem o DDD e sem o 55
     · a assinatura usa o segredo da aplicação (MP_SECRET)
   ============================================================ */

const API = 'https://api.mercadopago.com';
const crypto = require('crypto');

function token() {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error('MP_ACCESS_TOKEN não configurado na Vercel');
  return t;
}

/* ---------- busca um pagamento pelo id ---------- */
async function buscarPagamento(id) {
  const r = await fetch(API + '/v1/payments/' + encodeURIComponent(id), {
    headers: {
      Authorization: 'Bearer ' + token(),
      Accept: 'application/json',
    },
  });
  const texto = await r.text();
  let dados;
  try {
    dados = texto ? JSON.parse(texto) : {};
  } catch {
    dados = { erro_bruto: texto.slice(0, 300) };
  }
  return { ok: r.ok, status: r.status, dados };
}

/* ---------- confere a assinatura do webhook ----------
   O Mercado Pago manda o header:
      x-signature: ts=1700000000,v1=abcdef...
   E o segredo (MP_SECRET) fica em "Sua integração > Webhooks >
   Configurar notificações". O manifesto é:
      id:{data.id};request-id:{x-request-id};ts:{ts};
   Se não houver segredo configurado, a validação é pulada (mas o
   webhook ainda busca o pagamento direto na API do Mercado Pago,
   então o conteúdo gravado continua vindo de fonte confiável). */
function validarAssinatura(req) {
  const segredo = process.env.MP_SECRET;
  if (!segredo) return { ok: true, conferida: false };

  const header = req.headers['x-signature'];
  if (!header) return { ok: false, conferida: true, motivo: 'x-signature ausente' };

  const partes = {};
  for (const pedaco of String(header).split(',')) {
    const [k, ...v] = pedaco.split('=');
    partes[k.trim()] = v.join('=').trim();
  }
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return { ok: false, conferida: true, motivo: 'x-signature malformado' };

  const dataId = req.body?.data?.id || req.query?.['data.id'] || '';
  const requestId = req.headers['x-request-id'] || '';
  const manifesto = `id:${dataId};request-id:${requestId};ts:${ts};`;

  const esperado = crypto.createHmac('sha256', segredo).update(manifesto).digest('hex');
  const a = Buffer.from(esperado);
  const b = Buffer.from(v1);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, conferida: true, motivo: 'assinatura não confere' };
  }
  return { ok: true, conferida: true };
}

/* ---------- cria a preferência de pagamento ---------- */
/* notificationUrl é o endereço que o Mercado Pago avisa quando o
   pagamento muda de estado. ANTES apontava para /api/checkout, que
   só recebia e não gravava nada — por isso o painel ficava vazio
   mesmo com gente pagando. Agora aponta para /api/webhook, que é
   justamente o arquivo que grava o pedido no banco. */
async function criarPreferencia({
  itens,
  metadata,
  backUrls,
  externalReference,
  notificationUrl,
}) {
  const corpo = {
    items: itens,
    shipments: {
      mode: 'not_specified',
      free_methods: [{ id: 1, cost: '0.00' }],
      free_mode: 'not_specified',
    },
    back_urls: backUrls,
    auto_return: 'approved',
    statement_descriptor: 'NOIVA JOIAS MT',
    external_reference: externalReference,
    metadata,
  };
  if (notificationUrl) corpo.notification_url = notificationUrl;

  const r = await fetch(API + '/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(corpo),
  });
  const texto = await r.text();
  let dados;
  try {
    dados = texto ? JSON.parse(texto) : {};
  } catch {
    dados = { erro_bruto: texto.slice(0, 300) };
  }
  return { ok: r.ok, status: r.status, dados };
}

module.exports = { buscarPagamento, validarAssinatura, criarPreferencia, API };
