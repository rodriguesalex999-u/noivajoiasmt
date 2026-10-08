/* ============================================================
   WEBHOOK — o Mercado Pago avisa que o pagamento mudou de estado
   ============================================================
   Registre este endereço em:
     Painel do Mercado Pago > Notificações > Webhooks
     URL: https://noivajoiasmt.vercel.app/api/webhook
     Evento: payment (pagamento)

   O MP manda só o id do pagamento; os detalhes buscamos na API. A
   resposta tem que ser 200 e rápida: o Mercado Pago tenta de novo
   em caso de erro e considera o webhook quebrado.

   ATENÇÃO — /tmp é efêmero na Vercel. Serve para desenvolvimento e
   tráfego baixo. Em produção de verdade, trocar /tmp por um banco.
   ============================================================ */

const fs = require('fs/promises');
const path = require('path');

const ARQ = path.join('/tmp', 'pedidos.json');
const TMP_MAX = 5000;

async function ler() {
  try {
    const t = await fs.readFile(ARQ, 'utf8');
    const j = JSON.parse(t);
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

async function gravar(lista) {
  await fs.mkdir(path.dirname(ARQ), { recursive: true });
  await fs.writeFile(ARQ, JSON.stringify(lista.slice(-TMP_MAX)), 'utf8');
}

const soDigitos = s => String(s || '').replace(/\D/g, '');

module.exports = async function handler(req, res) {
  /* O painel do Mercado Pago manda um ping para testar o endpoint. */
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      servico: 'webhook noiva joias mt',
      gravados: (await ler()).length,
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST' });

  const q = req.query || {};
  const tipo = String(q.type || '').toLowerCase();
  const id = q.data?.id;

  /* Ping de validação: sem id, é só teste do painel. */
  if (!tipo || !id) {
    return res.status(200).json({ ok: true, aviso: 'endpoint pronto para receber payment' });
  }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    return res.status(200).json({ ok: true, aviso: 'MP_ACCESS_TOKEN ausente' });
  }

  try {
    const r = await fetch('https://api.mercadopago.com/v1/payment_methods/' + id, {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!r.ok) return res.status(200).json({ ok: true, aviso: 'pagamento não localizado' });
    const pag = await r.json();

    /* Só os status que interessam: aprovado, ou ainda em análise
       (Pix e boleto confirmam depois do primeiro aviso). */
    const Interessa = ['approved', 'authorized', 'in_process', 'pending'];
    if (!Interessa.includes(pag.status)) {
      return res.status(200).json({ ok: true, aviso: 'status ignorado: ' + pag.status });
    }

    const md = pag.metadata || {};
    const payer = pag.payer || {};
    const addr = (pag.shipments && pag.shipments.receiver_address) || payer.address || {};

    const pedido = {
      payment_id: String(pag.id),
      preference_id: pag.preference_id,
      status: pag.status,
      criado_em: pag.date_created || new Date().toISOString(),
      aprovado_em: pag.date_approved || null,

      produto: md.produto || pag.description || 'Aliança Noiva Joias MT',
      valor: Number(pag.transaction_amount || 0),
      frete: Number(md.frete || 0),
      modalidade: md.modalidade || 'tradicional',
      regiao: md.regiao || 'fora',
      prazo: md.prazo || null,

      nome: payer.first_name
        ? `${payer.first_name} ${payer.last_name || ''}`.trim()
        : payer.nickname || null,
      email: payer.email || null,
      telefone: payer.phone?.number || null,
      cpf: soDigitos(payer.identification?.number) || null,

      cep: soDigitos(addr.postal_code || addr.zip_code) || null,
      endereco: addr.street_name || null,
      numero: addr.street_number || null,
      complemento: addr.street_complement || null,
      bairro: addr.district_name || null,
      cidade: addr.city_name || null,
      estado: addr.state_name || null,

      medida_confirmada: null,
      me_order_id: null,
      rastreio: null,
      etiqueta_url: null,
    };

    const lista = await ler();
    const i = lista.findIndex(x => x.payment_id === pedido.payment_id);
    if (i >= 0) {
      /* Não sobrescreve o que já foi preenchido na mão (medida, etiqueta). */
      lista[i] = { ...lista[i], ...pedido, medida_confirmada: lista[i].medida_confirmada,
                   me_order_id: lista[i].me_order_id, rastreio: lista[i].rastreio,
                   etiqueta_url: lista[i].etiqueta_url, cpf: lista[i].cpf || pedido.cpf };
    } else {
      lista.push(pedido);
    }
    await gravar(lista);

    return res.status(200).json({
      ok: true,
      gravado: true,
      payment_id: pedido.payment_id,
      precisa_cpf: !pedido.cpf,
      precisa_cep: !pedido.cep,
    });
  } catch (e) {
    console.error('webhook:', e);
    return res.status(200).json({ ok: true, erro: 'falha ao gravar' });
  }
};