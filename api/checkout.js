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

    MODALIDADES DE ENTREGA (ver checkout.html — o PREÇO é sempre o do
    catálogo do servidor; frete e modalidade o servidor recalcula)
      · traditional — frete 0,00 · o cliente paga o produto inteiro
      · sedex       — frete 44,99 · só o frete; o produto é pago ao
                      retirar na agência dos Correios

   O PEDIDO NASCE AQUI (antes do pagamento)
   Quando criamos a preferência, gravamos o pedido no banco com um
   código nosso (pedido_id). Esse código vai como external_reference
   e volta na URL de retorno. Assim:
     · o cliente já chega na página de obrigado com o pedido
       recognized — mesmo que o webhook ainda não tenha rodado;
     · o webhook encontra a linha certa e completa os dados.

   TAMBÉM RECEBE O WEBHOOK DO MERCADO PAGO
   O notification_url aponta para ESTE endpoint (é o mesmo domínio
   e a rota /api/checkout já existia). Então, quando o MP avisa que
   o pagamento mudou, caímos aqui e gravamos no banco — sem
   depender de o dono configurar um webhook separado no painel.
   ============================================================ */

const db = require('./_lib/pedidos.js');
const mp = require('./_lib/mp.js');

/* ============================================================
   PREÇO VEM DO SERVIDOR — NUNCA DO CLIENTE
   ------------------------------------------------------------
   Antes o navegador mandava o preço na URL (checkout.html?preco=)
   e o servidor cobrava o que chegasse — dava para comprar um
   produto de R$ 399,99 pagando R$ 0,01. Agora o servidor tem o
   catálogo oficial (gerado de index.html + masculino.html) e o
   preço é SEMPRE o de lá. Produto fora do catálogo = recusado.

   Depois de mexer em preço no index.html / masculino.html, rode:
       node scripts/gerar_catalogo_precos.js
   ============================================================ */
const catalogo = require('./_lib/catalogo-precos.json');

/* Mesma normalização do gerador (scripts/gerar_catalogo_precos.js):
   minúsculas, sem acento, sem pontuação. Assim "ALIANÇA 8mm..." e
   "aliança 8mm..." caem na mesma chave. */
function normalizar(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

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
  /* ---------- o Mercado Pago avisa que o pagamento mudou de estado.
     Chega por aqui porque o notification_url de preferências ANTIGAS
     apontava para esta rota (as novas apontam para /api/webhook).
     Respondemos 200 na hora e gravamos o pedido. ---------- */
  if (req.method === 'POST' && (req.headers['x-signature'] || req.query?.['data.id'] || req.body?.data?.id)) {
    /* Mesma validação do /api/webhook: sem MP_SECRET configurado a
       assinatura é pulada (os dados gravados vêm da API do Mercado
       Pago, não do corpo da notificação). */
    const assinatura = mp.validarAssinatura(req);
    if (!assinatura.ok) {
      console.warn('checkout/webhook: assinatura recusada ->', assinatura.motivo);
      return res.status(200).json({ received: true, aviso: 'assinatura invalida' });
    }
    const id = req.body?.data?.id || req.query?.['data.id'];
    if (!id) return res.status(200).json({ received: true });
    try {
      const pag = await mp.buscarPagamento(id);
      if (!pag.ok) return res.status(200).json({ received: true });
      const p = pag.dados;
      const md = p.metadata || {};
      const payer = p.payer || {};
      const addr = (p.shipments && p.shipments.receiver_address) || payer.address || {};
      const soDigitos = s => String(s || '').replace(/\D/g, '');

      const ref = String(p.external_reference || md.pedido_id || '').trim();
      let existente = ref ? await db.buscar(ref) : null;
      if (!existente) existente = await db.buscar(String(p.id));

      await db.salvar({
        pedido_id: existente ? existente.pedido_id : ref || undefined,
        payment_id: String(p.id),
        preference_id: p.preference_id || (existente && existente.preference_id) || null,
        external_reference: ref || null,
        status: p.status,
        etapa: p.status === 'approved' ? 'pago' : 'em_analise',
        criado_em: (existente && existente.criado_em) || p.date_created || new Date().toISOString(),
        aprovado_em: p.date_approved || null,
        produto: md.produto || (existente && existente.produto) || p.description || null,
        valor: Number(p.transaction_amount || 0) || null,
        frete: Number(md.frete || 0) || 0,
        valor_produto: md.valorProduto != null ? Number(md.valorProduto) : null,
        modalidade: md.modalidade || (existente && existente.modalidade) || null,
        regiao: md.regiao || (existente && existente.regiao) || null,
        prazo: md.prazo || (existente && existente.prazo) || null,
        nome: payer.first_name ? `${payer.first_name} ${payer.last_name || ''}`.trim() : null,
        email: payer.email || null,
        telefone: payer.phone?.number || null,
        cpf: soDigitos(payer.identification?.number) || (existente && existente.cpf) || null,
        cep: soDigitos(addr.postal_code || addr.zip_code) || (existente && existente.cep) || null,
        endereco: addr.street_name || (existente && existente.endereco) || null,
        numero: addr.street_number || (existente && existente.numero) || null,
        complemento: addr.street_complement || (existente && existente.complemento) || null,
        bairro: addr.district_name || (existente && existente.bairro) || null,
        cidade: addr.city_name || (existente && existente.cidade) || null,
        estado: addr.state_name || (existente && existente.estado) || null,
      });
    } catch (e) {
      console.error('checkout/webhook:', e);
    }
    return res.status(200).json({ received: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const corpo = req.body || {};

  /* ---------- criação da preferência ---------- */
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({
      error: 'MP_ACCESS_TOKEN não configurado na Vercel',
    });
  }
  const nome = String(corpo.nome || '').slice(0, 250);
  const modalidade = corpo.pagamento === 'sedex' ? 'sedex' : 'traditional';

  /* ---------- PREÇO: só o catálogo do servidor manda ----------
     O corpo.preco que vier do navegador é IGNORADO de propósito.
     Produto que não está no catálogo é recusado: sem isso, qualquer
     pessoa montava checkout.html?nome=X&preco=0.01 e comprava a
     preço de banana. */
  const precoCatalogo = catalogo[normalizar(nome)];
  if (precoCatalogo == null) {
    return res.status(400).json({
      error: 'Produto não encontrado no catálogo da loja',
      detalhe:
        'Se você chegou por um link antigo, volte ao site e escolha o produto de novo. ' +
        'Dúvidas: WhatsApp (65) 9294-2810',
    });
  }

  const valorProduto = Number(precoCatalogo);
  if (!Number.isFinite(valorProduto) || valorProduto <= 0 || valorProduto > 100000) {
    return res.status(400).json({ error: 'Valor do produto inválido no catálogo' });
  }

  /* Frete SEMPRE calculado aqui. */
  const frete = modalidade === 'sedex' ? FRETE_SEDEX : 0;

  const regiao = corpo.regiao === 'local' ? 'local' : 'fora';
  const prazo = regiao === 'local' ? '3 dias úteis' : '4 a 7 dias úteis';

  /* O QUE O CLIENTE PAGA AGORA
     · tradicional — o produto inteiro (frete grátis)
     · sedex a cobrar — SÓ o frete. O valor do produto é pago na
       agência dos Correios, ao retirar. A versão anterior cobrava
       os dois no site (produto + frete) e ainda dizia na tela que
       o produto seria pago na agência — o cliente pagava duas
       vezes. Aqui o item do produto simplesmente não entra. */
  const itens = [];
  if (frete > 0) {
    itens.push({
      title: 'Frete — Sedex a Cobrar (pague o produto ao retirar)',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: frete,
      description: nome + ' — ' + prazo,
    });
  } else {
    itens.push({
      title: nome,
      quantity: 1,
      currency_id: 'BRL',
      unit_price: valorProduto,
      description: 'Entrega pelos Correios — ' + prazo,
    });
  }

  /* O que o Mercado Pago vai cobrar de fato. */
  const valorPago = frete > 0 ? frete : valorProduto;

  /* O pedido é criado ANTES da preferência. Se a criação da
     preferência falhar, fica um pedido sem pagamento — o painel
     mostra como "não pago" e o dono pode ignorar. */
  let pedidoId = null;
  try {
    const novo = await db.salvar({
      produto: nome,
      valor: valorPago,
      frete,
      valor_produto: valorProduto,
      modalidade,
      regiao,
      prazo,
      status: 'iniciando',
      etapa: 'aguardando_pagamento',
      criado_em: new Date().toISOString(),
    });
    pedidoId = novo.pedido_id;
  } catch (e) {
    console.error('checkout: nao deu para criar o pedido ->', e.message);
  }

  try {
    const r = await mp.criarPreferencia({
      itens,
      externalReference: pedidoId,
      /* Onde o Mercado Pago avisa que o pagamento mudou. Antes
         apontava para /api/checkout (que só recebia e não gravava)
         — por isso o painel ficava vazio mesmo com gente pagando. */
      notificationUrl: BACK + '/api/webhook',
      backUrls: {
        success: BACK + '/obrigado',
        pending: BACK + '/obrigado',
        failure: BACK + '/',
      },
      metadata: {
        pedido_id: pedidoId,
        regiao,
        modalidade,
        frete,
        valorProduto,
        valorPago,
        prazo,
        produto: nome,
      },
    });

    const dados = r.dados;

    if (!r.ok) {
      console.error('Mercado Pago:', r.status, dados);
      return res.status(502).json({
        error: dados?.message || 'Mercado Pago recusou a preferência',
        detalhe: dados?.cause?.[0]?.description || undefined,
      });
    }

    /* Guarda o preference_id no pedido: é o que permite reconhecer o
       pedido quando o cliente volta da página de obrigado. */
    if (pedidoId && dados.id) {
      try {
        await db.salvar({ pedido_id: pedidoId, preference_id: String(dados.id) });
      } catch {}
    }

    return res.status(200).json({
      checkout_url: dados.init_point,
      preference_id: dados.id,
      pedido_id: pedidoId,
    });
  } catch (e) {
    console.error('Falha ao criar preferência:', e);
    return res.status(500).json({ error: 'Erro de rede ao falar com o Mercado Pago' });
  }
};
