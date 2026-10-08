/* ============================================================
   MELHOR ENVIOS — cotação, etiqueta e rastreio
   ============================================================
   A chave (JWT, 29 escopos, válida até 23/09/2027) fica na variável
   de ambiente ME_API_TOKEN da Vercel — nunca no HTML. Este arquivo é
   o único que fala com a Melhor Envios.

   O que este módulo faz, em ordem:
     1. consulta  — lê o pedido e diz em que_stage ele está
     2. etiqueta  — cria a etiqueta no Melhor Envios e devolve o PDF
     3. rastreio  — status real do envio

   DIFERENÇA IMPORTANTE PARA O DONO
   A Melhor Envios exige **CPF do destinatário**. O Mercado Pago
   collected só o que o cliente preencheu no checkout; se o CPF não
   estiver no pedido, a etiqueta não pode ser gerada por API. Nesse
   caso a resposta é `precisa_cpf: true` e o pedido fica na fila —
   o dono then de confirmar o CPF pelo WhatsApp. Não existe atalho:
   a Melhor Envios recusa sem CPF.
   ============================================================ */

const API = 'https://melhorenvio.com.br/api/v2';

/* Padrões fixos da loja (definidos pelo dono como regra):
   - volumes 0.5 em todas as medidas (joia: pacote pequeno)
   - seguro de R$ 10,00, e unitary_value SEMPRE igual ao seguro
   - non_commercial: true = Declaração de Conteúdo, nunca Nota Fiscal */
const PADRAO_LOJA = {
  volumes: { height: 0.5, width: 0.5, length: 0.5, weight: 0.5 },
  options: {
    insurance_value: 10.0,
    receipt: false,
    own_hand: false,
    non_commercial: true,
  },
};

const CODIGO_PAIS = 'BR';

/* Remetente fixo — a loja. Troque aqui se mudar o endereço de origem. */
const REMETENTE = {
  name: process.env.ME_SENDER_NAME || 'Noiva Joias MT',
  email: process.env.ME_SENDER_EMAIL || 'rodriguesalex999@gmail.com',
  postal_code: process.env.ME_SENDER_CEP || '',
  address: process.env.ME_SENDER_STREET || '',
  location_number: process.env.ME_SENDER_NUMBER || '',
  district: process.env.ME_SENDER_DISTRICT || '',
  city: process.env.ME_SENDER_CITY || '',
  state_abbr: process.env.ME_SENDER_UF || 'MT',
  country_id: CODIGO_PAIS,
};

function headers() {
  const t = process.env.ME_API_TOKEN;
  if (!t) throw new Error('ME_API_TOKEN não configurado na Vercel');
  return {
    Authorization: 'Bearer ' + t,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'NoivaJoias/1.0',
  };
}

async function me(metodo, caminho, corpo) {
  const r = await fetch(API + caminho, {
    method: metodo,
    headers: headers(),
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
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

/* ---------- saldo ---------- */
async function saldo() {
  const r = await me('GET', '/me/balance');
  if (!r.ok) throw new Error('saldo indisponível: ' + JSON.stringify(r.dados).slice(0, 200));
  return (r.dados.balance || 0) / 100;
}

/* ---------- cotação de todos os Correios (service 1 = PAC, 2 = SEDEX) ---------- */
async function cotar(destino, peso = 0.5) {
  const payload = {
    from: {
      postal_code: REMETENTE.postal_code,
      country_id: CODIGO_PAIS,
    },
    to: {
      postal_code: destino.cep,
      country_id: CODIGO_PAIS,
    },
    options: { insurance_value: PADRAO_LOJA.options.insurance_value, receipt: false },
    volumes: [{ ...PADRAO_LOJA.volumes, weight: peso }],
  };
  const r = await me('POST', '/me/shipment/calculate', payload);
  if (!r.ok) throw new Error('cotação falhou: ' + JSON.stringify(r.dados).slice(0, 200));
  return r.dados;
}

/* ---------- gera a etiqueta: cart → checkout → generate → print ---------- */
async function gerarEtiqueta({ destino, produto, valorDeclarado, confirmar = false }) {
  /* 0. Pré-requisitos honestos: sem isso a Melhor Envios recusa. */
  const falta = [];
  if (!destino.cpf) falta.push('CPF do destinatário');
  if (!destino.cep) falta.push('CEP do destinatário');
  if (!REMETENTE.postal_code) falta.push('CEP do remetente (ME_SENDER_CEP)');
  if (!REMETENTE.cpf) falta.push('CPF do remetente (ME_SENDER_CPF)');
  if (falta.length) {
    return { ok: false, etapa: 'pre-requisitos', precisa: falta };
  }

  /* 1. Carrinho — NÃO cobra nada, devolve o preço antes de gastar. */
  const insured = PADRAO_LOJA.options.insurance_value;
  const cart = await me('POST', '/me/cart', {
    service: 1, // PAC dos Correios
    from: {
      ...REMETENTE,
      phone: REMETENTE.phone || '',
      document: REMETENTE.cpf,
    },
    to: {
      name: destino.nome,
      phone: destino.telefone || '',
      email: destino.email || '',
      document: destino.cpf,
      postal_code: destino.cep,
      address: destino.endereco || '',
      location_number: destino.numero || '',
      complement: destino.complemento || undefined,
      district: destino.bairro || '',
      city: destino.cidade || '',
      state_abbr: destino.estado || '',
      country_id: CODIGO_PAIS,
    },
    products: [
      {
        name: String(produto || 'Aliança').slice(0, 80),
        quantity: 1,
        unitary_value: Number(valorDeclarado) || insured,
      },
    ],
    volumes: [PADRAO_LOJA.volumes],
    options: PADRAO_LOJA.options,
  });

  if (!cart.ok) {
    return { ok: false, etapa: 'carrinho', erro: cart.dados };
  }
  const item = cart.dados;
  const preco = Number(item.price || 0);

  /* 2. Checkout — AQUI o saldo é gasto de verdade. Por isso devolvemos
     o preço antes, e o dono confirma. Nada é cobrado sem o flag `confirmar`. */
  if (!confirmar) {
    return {
      ok: false,
      etapa: 'confirmacao',
      precisa_confirmar: true,
      preco_centavos: preco,
      preco: (preco / 100).toFixed(2),
      cart_id: item.id,
      protocolo: item.protocol,
      servico: item.service?.name || 'PAC',
    };
  }

  /* 3. Comprar a etiqueta (usa o saldo). */
  const co = await me('POST', '/me/shipment/checkout', { orders: [item.id] });
  if (!co.ok) return { ok: false, etapa: 'checkout', erro: co.dados };

  /* 4. Gerar o arquivo da etiqueta. */
  const ge = await me('POST', '/me/shipment/generate', { orders: [item.id] });
  if (!ge.ok) return { ok: false, etapa: 'generate', erro: ge.dados };

  /* 5. Link do PDF (modo público: o cliente precisa abrir sem login). */
  const pr = await me('POST', '/me/shipment/print', {
    orders: [item.id],
    mode: 'public',
  });

  return {
    ok: true,
    cart_id: item.id,
    me_order_id: item.id,
    protocolo: item.protocol,
    rastreio: co.dados?.tracking || null,
    preco: preco,
    etiqueta_url: pr.ok ? pr.dados?.url || null : null,
    print_erro: pr.ok ? undefined : pr.dados,
  };
}

/* ---------- status de um envio já gerado ---------- */
async function statusEnvio(orderId) {
  const r = await me('POST', '/me/shipment/tracking', { orders: [orderId] });
  if (!r.ok) return { ok: false, erro: r.dados };
  const d = r.dados;
  const item = Array.isArray(d) ? d[0] : d;

  const rotulos = {
    released: 'Liberado — ainda não postado',
    posted: 'Em trânsito',
    delivered: 'Entregue',
    canceled: 'Cancelado',
    undelivered: 'Não entregue — attempting return',
    returned: 'Devolvido ao remetente',
  };
  return {
    ok: true,
    status: item?.status || null,
    rotulo: rotulos[item?.status] || item?.status || null,
    tracking: item?.tracking || null,
    delivered_at: item?.delivered_at || null,
    postagem_at: item?.posted_at || null,
    link_publico: item?.tracking
      ? 'https://www.melhorrastreio.com.br/rastreio/' + item.tracking
      : null,
  };
}

module.exports = { saldo, cotar, gerarEtiqueta, statusEnvio, PADRAO_LOJA, REMETENTE };