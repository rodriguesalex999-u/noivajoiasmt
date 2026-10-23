/* ============================================================
   MELHOR ENVIOS — cotação, etiqueta, cancelamento e rastreio
   ============================================================
   A chave (JWT, 29 escopos, válida até 23/09/2027) fica na variável
   de ambiente ME_API_TOKEN da Vercel — nunca no HTML. Este arquivo é
   o único que fala com a Melhor Envios.

   O que este módulo faz, em ordem:
     1. saldo      — quanto há na conta
     2. cotar      — preço do frete antes de gastar saldo
     3. gerarEtiqueta — cria a etiqueta (cart → checkout → generate → print)
     4. cancelar   — cancela a etiqueta e pede o estorno
     5. statusEnvio — status real do envio

   DIFERENÇA IMPORTANTE PARA O DONO
   A Melhor Envios exige **CPF do destinatário** e **endereço
   completo**. O Mercado Pago nem sempre manda esses dados. Quando
   faltam, a API recusa — e o painel do dono deixa preencher à mão
   (o cliente manda o endereço pelo WhatsApp).

   FORMATOS DA API (verificado ao vivo em 19-20/10/2026, com o token real)
     · dinheiro: REAL. A API devolve 38.94 = R$ 38,94. NÃO dividir por 100.
       (o saldo vem com centavos: 322.3 = R$ 322,30 — se fosse em centavos
       a API devolveria um número inteiro)
     · peso do volume: QUILOGRAMA (0.5 = 500 g)
     · medidas do volume: CENTÍMETRO, e a API só aceita de 1 a 300.
       Mandar 0,5 cm nas três dimensões é recusado com HTTP 422:
       "O valor do campo comprimento para o pacote 1 deve ser entre 1 e 300"
     · número do endereço: o campo é "number". O "location_number" é
       ignorado pela API (a etiqueta sairia sem número).
     · remetente e destinatário não podem ser iguais (mesmo CPF) —
       a API responde 422 "O remetente e o destinatário não podem ser iguais".
     · o carrinho (POST /me/cart) NÃO gasta saldo. O saldo é debitado no
       checkout (POST /me/shipment/checkout), e só isso.
     · CANCELAMENTO (contrato lido na doc oficial, 20/10/2026):
         POST /me/shipment/cancel
         corpo: { "order": { "id": "...", "reason_id": "2", "description": "..." } }
         resposta 200: { "<id>": { "canceled": true } }
         resposta 422: { "message": "The given data was invalid.", "errors": {...} }
         O reason_id é SEMPRE "2" para integração.
         O estorno do valor acontece em até 12 HORAS depois da aprovação.
   ============================================================ */

const API = 'https://melhorenvio.com.br/api/v2';

/* Padrões fixos da loja (definidos pelo dono como regra):
   - volumes 0.5 em todas as medidas (joia: pacote pequeno)
   - declaração de conteúdo, nunca Nota Fiscal
   - o SEGURO (valor segurado) é o valor REAL do produto, não um
     valor fixo: é isso que faz a Melhor Envios indenizar a peça
     se o pacote sumir no correio. */
const PADRAO_LOJA = {
  /* Volume de uma joia: 5 x 10 x 15 cm, 500 g. A API exige medidas de
     1 a 300 cm — por isso o pacote "0,5" em tudo era recusado (422). */
  volumes: { height: 5, width: 10, length: 15, weight: 0.5 },
  options: {
    receipt: false,
    own_hand: false,
    non_commercial: true,
  },
  /* Serviços da API: 1 = PAC, 2 = SEDEX, 17 = Mini Envios. */
  servicos: { pac: 1, sedex: 2 },
};

const CODIGO_PAIS = 'BR';

/* Remetente fixo — a loja. Troque aqui se mudar o endereço de origem. */
const REMETENTE = {
  name: process.env.ME_SENDER_NAME || 'Noiva Joias MT',
  email: process.env.ME_SENDER_EMAIL || 'rodriguesalex999@gmail.com',
  phone: process.env.ME_SENDER_PHONE || '',
  /* A conta da Melhor Envios é de PESSOA FÍSICA: quem assina é o CPF.
     A API chama esse campo de "document". */
  document: process.env.ME_SENDER_CPF || '',
  postal_code: process.env.ME_SENDER_CEP || '',
  address: process.env.ME_SENDER_STREET || '',
  number: process.env.ME_SENDER_NUMBER || '',
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
    'User-Agent': 'NoivaJoias/1.0 (suporte@noivajoiasmt.com.br)',
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
  /* A API devolve o saldo em REAL (vem com centavos: 322.3 = R$ 322,30). */
  return Number(r.dados.balance || 0);
}

/* ---------- cotação ---------- */
/* Pede a cotação de todos os serviços disponíveis. Devolve a lista
   crua da API (cada item tem id, name, price, delivery_time...). */
async function cotar(destino, peso = 0.5, valorDeclarado = null) {
  const payload = {
    from: {
      postal_code: REMETENTE.postal_code,
      country_id: CODIGO_PAIS,
    },
    to: {
      postal_code: destino.cep,
      country_id: CODIGO_PAIS,
    },
    options: {
      receipt: false,
      ...(valorDeclarado ? { insurance_value: Number(valorDeclarado) } : {}),
    },
    volumes: [{ ...PADRAO_LOJA.volumes, weight: peso }],
  };
  const r = await me('POST', '/me/shipment/calculate', payload);
  if (!r.ok) throw new Error('cotação falhou: ' + JSON.stringify(r.dados).slice(0, 200));
  return r.dados;
}

/* ---------- gera a etiqueta: cart → checkout → generate → print ---------- */
async function gerarEtiqueta({
  destino,
  produto,
  valorDeclarado,
  confirmar = false,
  servico = 1,
}) {
  /* 0. Pré-requisitos honestos: sem isso a Melhor Envios recusa. */
  const falta = [];
  if (!destino.cpf) falta.push('CPF do destinatário');
  if (!destino.cep) falta.push('CEP do destinatário');
  if (!destino.endereco) falta.push('Endereço do destinatário');
  if (!destino.cidade) falta.push('Cidade do destinatário');
  if (!destino.estado) falta.push('UF do destinatário');
  if (!REMETENTE.postal_code) falta.push('CEP do remetente (ME_SENDER_CEP)');
  if (!REMETENTE.document) falta.push('CPF do remetente (ME_SENDER_CPF)');
  if (falta.length) {
    return { ok: false, etapa: 'pre-requisitos', precisa: falta };
  }

  /* O valor segurado é o valor REAL da peça. Se a peça vale R$ 300
     e o pacote some, a Melhor Envios reembolsa R$ 300 — e não os
     R$ 10 do valor fixo antigo. O custo: a Melhor Envios taxa sobre
     o valor segurado, então o frete encarece um pouco (é o preço da
     paz de espírito). */
  const insured = Math.max(Number(valorDeclarado) || 0, 0);
  const opcoes = {
    ...PADRAO_LOJA.options,
    ...(insured > 0 ? { insurance_value: insured } : {}),
  };

  /* 1. Carrinho — NÃO cobra nada, devolve o preço antes de gastar. */
  const cart = await me('POST', '/me/cart', {
    service: servico, // 1 = PAC, 2 = SEDEX
    from: { ...REMETENTE },
    to: {
      name: destino.nome,
      phone: destino.telefone || '',
      email: destino.email || '',
      document: destino.cpf,
      postal_code: destino.cep,
      address: destino.endereco || '',
      number: destino.numero || '',
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
        unitary_value: insured > 0 ? insured : 1,
      },
    ],
    volumes: [PADRAO_LOJA.volumes],
    options: opcoes,
  });

  if (!cart.ok) {
    return { ok: false, etapa: 'carrinho', erro: cart.dados };
  }
  const item = cart.dados;
  /* A API devolve o preço em REAL (ex.: 38.94 = R$ 38,94). */
  const preco = Number(item.price || 0);

  /* 2. Checkout — AQUI o saldo é gasto de verdade. Por isso devolvemos
     o preço antes, e o dono confirma. Nada é cobrado sem o flag `confirmar`. */
  if (!confirmar) {
    return {
      ok: false,
      etapa: 'confirmacao',
      precisa_confirmar: true,
      preco_centavos: Math.round(preco * 100),
      preco: preco.toFixed(2),
      cart_id: item.id,
      protocolo: item.protocol,
      servico: item.service?.name || (servico === 2 ? 'SEDEX' : 'PAC'),
      seguro: insured,
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
    seguro: insured,
    etiqueta_url: pr.ok ? pr.dados?.url || null : null,
    print_erro: pr.ok ? undefined : pr.dados,
  };
}

/* ---------- cancela a etiqueta e pede o estorno ----------
   Contrato (doc oficial):
     POST /me/shipment/cancel
     { "order": { "id": "...", "reason_id": "2", "description": "..." } }
   Resposta 200: { "<id>": { "canceled": true } }
   O estorno do dinheiro entra em até 12 horas. */
async function cancelar(orderId, motivo = 'Cancelamento pelo painel da loja') {
  const r = await me('POST', '/me/shipment/cancel', {
    order: {
      id: String(orderId),
      reason_id: '2',
      description: String(motivo).slice(0, 200),
    },
  });
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      erro: r.dados,
      texto: JSON.stringify(r.dados).slice(0, 400),
    };
  }
  const cancelado = r.dados?.[String(orderId)]?.canceled === true;
  return {
    ok: true,
    cancelado,
    dados: r.dados,
    aviso: cancelado
      ? 'Etiqueta cancelada. O estorno do valor entra em até 12 horas.'
      : 'A Melhor Envios respondeu, mas sem confirmar o cancelamento.',
  };
}

/* ---------- status de um envio já gerado ---------- */
async function statusEnvio(orderId) {
  const r = await me('POST', '/me/shipment/tracking', { orders: [orderId] });
  if (!r.ok) return { ok: false, erro: r.dados };
  const d = r.dados;
  /* A API devolve um OBJETO indexado pelo id do pedido:
       { "<orderId>": { status: "...", tracking: "AE...", ... } }
     (não é array — ler direto d.status daria undefined). */
  let item = null;
  if (Array.isArray(d)) item = d[0];
  else if (d && typeof d === 'object') item = d[String(orderId)] || Object.values(d)[0] || null;

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

module.exports = {
  saldo,
  cotar,
  gerarEtiqueta,
  cancelar,
  statusEnvio,
  PADRAO_LOJA,
  REMETENTE,
};
