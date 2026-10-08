/* ============================================================
   CHECKOUT — Mercado Pago Checkout Pro (API de Preferences)
   ============================================================
   POR QUE ESTE ARQUIVO EXISTE
   O Access Token do Mercado Pago NÃO pode ficar no index.html:
   qualquer pessoa abre "ver código-fonte" do site, copia o token e
   passa a criar cobranças na sua conta. Por isso o token vive só
   aqui, na variável de ambiente MP_ACCESS_TOKEN da Vercel, e o
   navegador nunca o vê — ele só chama /api/checkout e recebe o
   link do checkout.

   MODALIDADES DE ENTREGA (ver checkout.html — os valores vêm do
   cliente, o servidor recalcula e nunca confia no que veio)
     · traditional — frete 0,00 · o cliente paga o produto inteiro
     · sedex       — frete 44,99 · só o frete; o produto é pago ao
                     retirar na agência dos Correios
   ============================================================ */

/* Site de produção — tem que ser EXATAMENTE o mesmo domínio cadastrado
   nas credenciais de produção do Mercado Pago. O dono corrigiu para
   https://noivajoiasmt.vercel.app ; se divergir, o Mercado Pago recusa
   o redirecionamento de volta (back_urls). */
const SITE = process.env.SITE_URL || 'https://noivajoiasmt.vercel.app';
const BACK = SITE.replace(/\/+$/, '');

/* Regras de entrega — mesma fonte de verdade do checkout.html.
   Mantenha os dois lados em sincronia. */
const FRETE_SEDEX = 44.99;

module.exports = async function handler(req, res) {
  /* ---------- Mercado Pago chama este endpoint quando o pagamento muda
     de estado (assunto "payment" ou "subscription"). A resposta 200
     imediata é o que ele espera — o resto do trabalho (notificar o
     cliente, gerar a etiqueta) é feito pelo seu sistema. ---------- */
  if (req.method === 'POST' && req.headers['x-hub-signature']) {
    // TODO: validar a assinatura com MP_SECRET e gravar o status do
    // pagamento no seu banco antes de responder 200.
    return res.status(200).json({ received: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const corpo = req.body || {};

  /* ---------- consulta de pedido (rastreio) ---------- */
  if (corpo.consultar) {
    // Ainda não existe banco de pedidos. O Mercado Pago guarda o
    // pagamento; com o código de pagamento dá para consultar a API
    // /v1/payment/{id} se o cliente colar esse código.
    const id = String(corpo.consultar).trim();
    if (!/^\d+$/.test(id)) {
      return res.status(200).json({
        status: null,
        erro:
          'Ainda não localizamos esse pedido. Se você acabou de comprar, ' +
          'o código chega por e-mail em alguns minutos. Também pode falar ' +
          'com a gente no WhatsApp (65) 9294-2810.',
      });
    }
    try {
      const token = process.env.MP_ACCESS_TOKEN;
      if (!token) throw new Error('sem token');
      const r = await fetch('https://api.mercadopago.com/v1/payment_methods/' + id, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!r.ok) {
        return res.status(200).json({
          status: null,
          erro:
            'Não encontramos esse pagamento. Confira o código ou chame no ' +
            'WhatsApp (65) 9294-2810.',
        });
      }
      const d = await r.json();
      const mapa = {
        approved: 'Pagamento aprovado',
        pending: 'Pagamento em análise',
        in_process: 'Pagamento em análise',
        rejected: 'Pagamento recusado',
        refunded: 'Pagamento estornado',
        cancelled: 'Pagamento cancelado',
      };
      return res.status(200).json({
        status: mapa[d.status] || d.status,
        detalhe: brl(d.transaction_amount) + ' em ' + (d.date_approved
          ? new Date(d.date_approved).toLocaleString('pt-BR')
          : '—'),
      });
    } catch (e) {
      return res.status(200).json({
        status: null,
        erro: 'Não conseguimos consultar agora. Chame no WhatsApp (65) 9294-2810.',
      });
    }
  }

  /* ---------- criação da preferência ---------- */
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: 'MP_ACCESS_TOKEN não configurado na Vercel',
    });
  }

  const nome = String(corpo.nome || 'Aliança Banhada a Ouro').slice(0, 250);
  const modalidade = corpo.pagamento === 'sedex' ? 'sedex' : 'traditional';

  /* O preço vem do cliente, mas é validado aqui: número positivo,
     dentro de uma faixa plausível. */
  const total = Number(String(corpo.preco ?? '0').replace(',', '.'));
  if (!Number.isFinite(total) || total <= 0 || total > 100000) {
    return res.status(400).json({ error: 'Valor inválido' });
  }

  /* Frete SEMPRE calculado aqui — o valor que veio do navegador é
     ignorado de propósito, para ninguém conseguir manipulation o preço. */
  const frete = modalidade === 'sedex' ? FRETE_SEDEX : 0;
  const valorProduto = Math.round((total - frete) * 100) / 100;

  if (valorProduto <= 0) {
    return res.status(400).json({ error: 'Valor do produto inválido para a modalidade escolhida' });
  }

  const regiao = corpo.regiao === 'local' ? 'local' : 'fora';
  const prazo = regiao === 'local' ? '3 dias úteis' : '4 a 7 dias úteis';

  const itens = [
    {
      title: nome,
      quantity: 1,
      currency_id: 'BRL',
      unit_price: valorProduto,
      description: 'Entrega pelos Correios — ' + prazo,
    },
  ];

  /* Sedex a Cobrar: o frete é um item à parte, porque é isso que o
     cliente está comprando agora. Some R$ 0,00 no total. */
  if (frete > 0) {
    itens.push({
      title: 'Frete — Sedex a Cobrar (pague o produto ao retirar)',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: frete,
      description: 'Valor do produto será pago na agência dos Correios ao retirar.',
    });
  }

  try {
    const resposta = await fetch(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: itens,
          /* Entrega física: correio. O valor total já está nos itens. */
          shipments: {
            mode: 'not_specified',
            free_methods: [{ id: 1, cost: '0.00' }],
            free_mode: 'not_specified',
          },
          back_urls: {
            success: BACK + '/obrigado',
            pending: BACK + '/obrigado',
            failure: BACK + '/',
          },
          auto_return: 'approved',
          notification_url: BACK + '/api/checkout',
          statement_descriptor: 'NOIVA JOIAS MT',
          /* metadata volta no webhook: é daqui que sai a etiqueta e
             a mensagem de WhatsApp com tudo preenchido. */
          metadata: {
            regiao,
            modalidade,
            frete,
            valorProduto,
            prazo,
            produto: nome,
          },
        }),
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      console.error('Mercado Pago:', resposta.status, dados);
      return res.status(502).json({
        error: dados?.message || 'Mercado Pago recusou a preferência',
        detalhe: dados?.cause?.[0]?.description || undefined,
      });
    }

    return res.status(200).json({
      checkout_url: dados.init_point,
      preference_id: dados.id,
    });
  } catch (e) {
    console.error('Falha ao criar preferência:', e);
    return res.status(500).json({ error: 'Erro de rede ao falar com o Mercado Pago' });
  }
};

function brl(n) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);
}