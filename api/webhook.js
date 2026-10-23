/* ============================================================
   WEBHOOK — o Mercado Pago avisa que o pagamento mudou de estado
   ============================================================
   Registre este endereço em:
     Painel do Mercado Pago > Notificações > Webhooks
     URL: https://noivajoiasmt.vercel.app/api/webhook
     Evento: payment (pagamento)

   O MP manda só o id do pagamento; os detalhes buscamos na API.
   A resposta tem que ser 200 e rápida: o Mercado Pago tenta de novo
   em caso de erro e considera o webhook quebrado.

   TRÊS BUGS QUE ZERAVAM O PAINEL (corrigidos aqui)
     1) O código buscava o pagamento em /v1/payment_methods/{id} —
        esse é o endpoint dos MÉTODOS de pagamento (cartão, pix).
        O certo é /v1/payments/{id}. Com o caminho errado a API
        devolvia 404 e NADA era gravado.
     2) O id vinha só de req.query.data.id, mas o MP manda o
        corpo JSON com data.id e a query como "data.id=123"
        (chave com ponto, não objeto). Agora lemos os dois.
     3) A preference apontava o notification_url para /api/checkout,
        que só recebia e não gravava. Agora o /api/checkout grava
        no banco e o webhook também.

   ONDE OS PEDIDOS FICAM
     No Postgres (Neon), pela camada api/_lib/pedidos.js. Antes era
     um arquivo em /tmp — que na Vercel é POR FUNÇÃO, então o
     webhook gravava num /tmp e o /api/rastreio lia de outro.
   ============================================================ */

const db = require('./_lib/pedidos.js');
const mp = require('./_lib/mp.js');

const soDigitos = s => String(s || '').replace(/\D/g, '');

/* O status que interessa: aprovado, ou ainda em análise (Pix e
   boleto confirmam depois do primeiro aviso). */
const INTERESSA = ['approved', 'authorized', 'in_process', 'pending'];

module.exports = async function handler(req, res) {
  /* O painel do Mercado Pago manda um ping para testar o endpoint. */
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      servico: 'webhook noiva joias mt',
      gravados: (await db.ler()).length,
      banco: db.temBanco() ? 'postgres' : 'tmp (dev)',
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });

  /* O id do pagamento pode chegar de três lugares:
     · no corpo JSON: { type: "payment", data: { id: "123" } }
     · na query: ?data.id=123&type=payment   (chave com ponto)
     · em data.id do corpo, quando o MP manda só o action */
  const q = req.query || {};
  const corpo = req.body || {};
  const tipo = String(q.type || corpo.type || '').toLowerCase();
  const id =
    corpo?.data?.id ||
    q['data.id'] ||
    (q.data && q.data.id) ||
    null;

  /* Ping de validação: sem id, é só teste do painel. */
  if (!tipo || !id) {
    return res.status(200).json({ ok: true, aviso: 'endpoint pronto para receber payment' });
  }

  /* A assinatura prova que a notificação veio mesmo do Mercado Pago.
     Sem MP_SECRET configurado a gente confia no conteúdo — que, aliás,
     é buscado direto na API do Mercado Pago, então os dados gravados
     continuam vindo de fonte confiável. */
  const assinatura = mp.validarAssinatura(req);
  if (!assinatura.ok) {
    console.warn('webhook: assinatura recusada ->', assinatura.motivo);
    return res.status(200).json({ ok: false, aviso: 'assinatura invalida' });
  }

  try {
    const pag = await mp.buscarPagamento(id);
    if (!pag.ok) {
      return res.status(200).json({
        ok: true,
        aviso: 'pagamento nao localizado (' + pag.status + ')',
      });
    }
    const p = pag.dados;

    if (!INTERESSA.includes(p.status)) {
      return res.status(200).json({ ok: true, aviso: 'status ignorado: ' + p.status });
    }

    const md = p.metadata || {};
    const payer = p.payer || {};
    const addr =
      (p.shipments && p.shipments.receiver_address) ||
      payer.address ||
      {};

    /* O pedido já foi criado no /api/checkout (antes do pagamento).
       A gente usa o external_reference para achar a linha certa e
       atualizar — em vez de criar uma segunda linha. */
    const ref = String(p.external_reference || md.pedido_id || '').trim();
    let existente = null;
    if (ref) existente = await db.buscar(ref);
    if (!existente) existente = await db.buscar(String(p.id));

    const pedido = {
      pedido_id: existente ? existente.pedido_id : ref || undefined,
      payment_id: String(p.id),
      preference_id: p.preference_id || (existente && existente.preference_id) || null,
      external_reference: ref || (existente && existente.external_reference) || null,
      status: p.status,
      etapa: p.status === 'approved' ? 'pago' : 'em_analise',
      criado_em: (existente && existente.criado_em) || p.date_created || new Date().toISOString(),
      aprovado_em: p.date_approved || (existente && existente.aprovado_em) || null,

      produto: md.produto || (existente && existente.produto) || p.description || 'Aliança Noiva Joias MT',
      valor: Number(p.transaction_amount || 0) || null,
      frete: Number(md.frete || 0) || 0,
      valor_produto:
        md.valorProduto != null
          ? Number(md.valorProduto)
          : (existente && existente.valor_produto) || null,
      modalidade: md.modalidade || (existente && existente.modalidade) || 'tradicional',
      regiao: md.regiao || (existente && existente.regiao) || 'fora',
      prazo: md.prazo || (existente && existente.prazo) || null,

      nome:
        payer.first_name
          ? `${payer.first_name} ${payer.last_name || ''}`.trim()
          : (existente && existente.nome) || payer.nickname || null,
      email: payer.email || (existente && existente.email) || null,
      telefone:
        payer.phone?.number ||
        (existente && existente.telefone) ||
        null,
      /* O CPF vem do Mercado Pago às vezes; quando não vem, o
         cliente manda na página de obrigado. */
      cpf:
        soDigitos(payer.identification?.number) ||
        (existente && existente.cpf) ||
        null,

      cep: soDigitos(addr.postal_code || addr.zip_code) || (existente && existente.cep) || null,
      endereco: addr.street_name || (existente && existente.endereco) || null,
      numero: addr.street_number || (existente && existente.numero) || null,
      complemento: addr.street_complement || (existente && existente.complemento) || null,
      bairro: addr.district_name || (existente && existente.bairro) || null,
      cidade: addr.city_name || (existente && existente.cidade) || null,
      estado: addr.state_name || (existente && existente.estado) || null,
    };

    const salvo = await db.salvar(pedido);

    return res.status(200).json({
      ok: true,
      gravado: true,
      pedido_id: salvo.pedido_id,
      payment_id: salvo.payment_id,
      precisa_cpf: !salvo.cpf,
      precisa_cep: !salvo.cep,
      precisa_endereco: !salvo.endereco,
    });
  } catch (e) {
    console.error('webhook:', e);
    return res.status(200).json({ ok: true, erro: 'falha ao gravar' });
  }
};
