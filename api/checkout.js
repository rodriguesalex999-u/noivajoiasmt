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

   O QUE O CLIENTE VÊ: redirecionado para a página oficial de
   checkout do Mercado Pago (Checkout Pro), pagando com Pix,
   cartão, etc. Depois volta para /obrigado e o Pixel dispara
   o evento Purchase.
   ============================================================ */

/* Site de produção — tem que ser EXATAMENTE o mesmo domínio cadastrado
   nas credenciais de produção do Mercado Pago. O dono corrigiu para
   https://noivajoiasmt.vercel.app/ ; se divergir, o Mercado Pago recusa
   o redirecionamento de volta (back_urls). */
const SITE = process.env.SITE_URL || 'https://noivajoiasmt.vercel.app';

/* Só o domínio principal entra em back_urls: o Mercado Pago valida
   contra o que foi cadastrado, e mandar um domínio a mais pode fazer
   a preferência ser recusada. */
const BACK = SITE.replace(/\/+$/, '');

module.exports = async function handler(req, res) {
  /* Mercado Pago chama este endpoint quando o pagamento muda de
     estado (assunto "payment" ou "subscription"). A resposta 200
     imediata é o que ele espera — o resto do trabalho (notificar
     você, gerar a etiqueta) é feito pelo seu sistema. */
  if (req.method === 'POST' && req.headers['x-hub-signature']) {
    // TODO: validar a assinatura com MP_SECRET e salvar o status
    // do pagamento no seu banco antes de responder 200.
    return res.status(200).json({ received: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: 'MP_ACCESS_TOKEN nao configurado na Vercel',
    });
  }

  const { nome, preco, qtd } = req.body || {};
  const itemNome = String(nome || 'Aliança Banhada a Ouro').slice(0, 250);
  const valor = Number(String(preco ?? '399.99').replace(',', '.'));
  const quantidade = Math.max(1, Math.min(10, Number(qtd) || 1));

  if (!Number.isFinite(valor) || valor <= 0) {
    return res.status(400).json({ error: 'Preço inválido' });
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
          items: [
            {
              title: itemNome,
              quantity: quantidade,
              currency_id: 'BRL',
              unit_price: valor,
              description: 'Frete grátis — entrega em Cuiaba, Rondonopolis e Sinop. Pagamento so na entrega.',
            },
          ],
          /* Frete grátis: o frete é enviado como item de valor 0,
             que é como o Mercado Pago Checkout Pro representa
             envio sem cobrança. */
          shipments: {
            free_methods: [{ id: 1, cost: '0.00', shipping_mode: 'not_specified' }],
            free_mode: 'not_specified',
          },
          back_urls: {
            success: BACK + '/obrigado',
            pending: BACK + '/obrigado',
            failure: BACK + '/',
          },
          auto_return: 'approved',
          notification_url: BACK + '/api/checkout',
          external_reference: 'noivajoiasmt',
          /* Declarado no site para o Mercado Pago exibir o selo
             de compra segura. */
          statement_descriptor: 'NOIVA JOIAS MT',
          metadata: {
           Cities: 'Cuiaba, Rondonopolis, Sinop',
            delivery: 'Frete gratis — entrega hoje',
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