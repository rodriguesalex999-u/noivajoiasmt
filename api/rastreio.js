/* ============================================================
   PEDIDOS / RASTREIO / ETIQUETA — para o cliente e para o dono
   ============================================================
   Três usos, um arquivo:
     · consultar  — o campo "Acompanhar meu pedido" da página de
                    sucesso. Devolve em que etapa o pedido está e,
                    quando já foi postado, o código dos Correios.
     · etiquetas  — painel do dono: lista os pagos e gera a etiqueta.
     · cotar      — preço do frete antes de gastar saldo.
   ============================================================ */

const fs = require('fs/promises');
const path = require('path');
const me = require('./melhorenvio.js');

const ARQ = path.join('/tmp', 'pedidos.json');

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
  await fs.writeFile(ARQ, JSON.stringify(lista), 'utf8');
}

/* Etapas que o cliente enxerga, na ordem em que aparecem. */
function etapas(p) {
  const e = [];
  if (!p) return e;
  e.push({
    chave: 'pagamento',
    rotulo: 'Pagamento recebido',
    ok: ['approved', 'authorized', 'in_process', 'pending'].includes(p.status),
    detalhe: p.status === 'approved' ? 'Confirmado' : 'Em análise',
  });
  const temCpf = !!p.cpf;
  e.push({
    chave: 'medida',
    rotulo: 'Medida do dedo confirmada',
    ok: !!p.medida_confirmada,
    detalhe: p.medida_confirmada ? 'Confirmada' : 'Um atendente vai te chamar no WhatsApp',
  });
  e.push({
    chave: 'etiqueta',
    rotulo: 'Etiqueta gerada',
    ok: !!p.me_order_id,
    detalhe: p.me_order_id ? 'Pronta' : 'Gerando…',
    bloqueio: !temCpf && !p.me_order_id ? 'Precisamos do seu CPF' : null,
  });
  e.push({
    chave: 'postagem',
    rotulo: 'Encomenda postada nos Correios',
    ok: ['posted', 'delivered'].includes(p.me_status) || !!p.rastreio,
    detalhe: p.rastreio ? p.rastreio : 'Assim que postarmos, aparece o código aqui',
  });
  e.push({
    chave: 'entrega',
    rotulo: 'Entregue',
    ok: p.me_status === 'delivered',
    detalhe: p.me_status === 'delivered' ? 'Entregue' : 'A caminho',
  });
  return e;
}

module.exports = async function handler(req, res) {
  const acao = (req.query?.acao || req.body?.acao || '').toLowerCase();

  try {
    /* ================= CONSULTAR (cliente) ================= */
    if (acao === 'consultar' && req.method === 'POST') {
      const codigo = String(req.body?.codigo || '').trim();
      if (!codigo) return res.status(400).json({ erro: 'informe o código' });

      const lista = await ler();
      const p = lista.find(
        x => x.payment_id === codigo || x.preference_id === codigo || x.rastreio === codigo
      );
      if (!p) {
        return res.status(200).json({
          encontrado: false,
          erro:
            'Ainda não localizamos esse pagamento. Assim que o Mercado Pago ' +
            'confirmar ele aparece aqui (pode levar 1 a 2 minutos).',
        });
      }

      /* Se já tem etiqueta, busca o status real na Melhor Envios. */
      if (p.me_order_id) {
        try {
          const st = await me.statusEnvio(p.me_order_id);
          if (st.ok) {
            p.me_status = st.status;
            p.me_rotulo = st.rotulo;
            if (st.tracking && st.tracking !== p.rastreio) p.rastreio = st.tracking;
            if (st.delivered_at) p.me_delivered_at = st.delivered_at;
          }
        } catch {
          /* a Melhor Envios pode estar instável; o pedido continua valendo */
        }
      }

      return res.status(200).json({
        encontrado: true,
        payment_id: p.payment_id,
        produto: p.produto,
        status: p.me_rotulo || (p.status === 'approved' ? 'Pagamento aprovado' : p.status),
        rastreio: p.rastreio || null,
        link_rastreio: p.rastreio
          ? 'https://www.melhorrastreio.com.br/rastreio/' + p.rastreio
          : null,
        etapas: etapas(p),
        prazo: p.prazo,
      });
    }

    /* ================= LISTAR (dono) ================= */
    if (req.method === 'GET') {
      const lista = await ler();
      let saldo = null;
      try {
        saldo = await me.saldo();
      } catch {
        saldo = null;
      }
      return res.status(200).json({
        saldo_me: saldo,
        total: lista.length,
        aguardando_etiqueta: lista.filter(p => !p.me_order_id && p.status === 'approved').length,
        pedidos: lista
          .slice(-60)
          .reverse()
          .map(p => ({
            payment_id: p.payment_id,
            produto: p.produto,
            valor: p.valor,
            modalidade: p.modalidade,
            status: p.status,
            nome: p.nome,
            cpf: p.cpf,
            cidade: p.cidade,
            estado: p.estado,
            rastreio: p.rastreio || null,
            etiqueta_pronta: !!p.me_order_id,
            pode_gerar: !!p.cpf && !!p.cep && !p.me_order_id,
            criado_em: p.criado_em,
          })),
      });
    }

    /* ================= COTAR (dono) ================= */
    if (acao === 'cotar' && req.method === 'POST') {
      const cep = String(req.body?.cep || '').replace(/\D/g, '');
      if (cep.length !== 8) return res.status(400).json({ erro: 'CEP inválido' });
      const c = await me.cotar({ cep });
      return res.status(200).json({ opcoes: c });
    }

    /* ================= GERAR ETIQUETA (dono) ================= */
    if (acao === 'etiqueta' && req.method === 'POST') {
      const paymentId = String(req.body?.payment_id || '');
      const lista = await ler();
      const p = lista.find(x => x.payment_id === paymentId);
      if (!p) return res.status(404).json({ erro: 'pedido não encontrado' });

      if (p.me_order_id) {
        return res.status(200).json({ ok: true, ja_gerada: true, ...p });
      }

      const r = await me.gerarEtiqueta({
        destino: {
          nome: p.nome || 'Cliente Noiva Joias',
          cpf: p.cpf,
          cep: p.cep,
          endereco: p.endereco,
          numero: p.numero,
          complemento: p.complemento,
          bairro: p.bairro,
          cidade: p.cidade,
          estado: p.estado,
          telefone: p.telefone,
          email: p.email,
        },
        produto: p.produto,
        valorDeclarado: p.frete || p.valor,
        confirmar: !!req.body?.confirmar,
      });

      /* Passo 1 (carrinho) não gasta saldo: devolve o preço e para. */
      if (r.ok === false && r.precisa_confirmar) {
        return res.status(200).json({
          ok: false,
          precisa_confirmar: true,
          preco: r.preco,
          servico: r.servico,
          cart_id: r.cart_id,
          aviso: 'Gerar esta etiqueta gasta ' + r.preco + ' do saldo da Melhor Envios.',
        });
      }
      if (r.ok === false) {
        return res.status(200).json({ ok: false, etapa: r.etapa, erro: r.erro, precisa: r.precisa });
      }

      /* Sucesso: guarda rastreio e link da etiqueta no pedido. */
      p.me_order_id = r.me_order_id;
      p.rastreio = r.rastreio;
      p.etiqueta_url = r.etiqueta_url;
      p.etiqueta_preco = r.preco;
      const i = lista.findIndex(x => x.payment_id === paymentId);
      lista[i] = p;
      await gravar(lista);

      return res.status(200).json({
        ok: true,
        payment_id,
        rastreio: r.rastreio,
        etiqueta_url: r.etiqueta_url,
        preco: r.preco,
        aviso: r.etiqueta_url ? null : 'Etiqueta gerada; PDF não saiu — abra pelo painel da Melhor Envios.',
      });
    }

    /* ================= MARCAR MEDIDA OK (dono) ================= */
    if (acao === 'medida' && req.method === 'POST') {
      const paymentId = String(req.body?.payment_id || '');
      const lista = await ler();
      const p = lista.find(x => x.payment_id === paymentId);
      if (!p) return res.status(404).json({ erro: 'pedido não encontrado' });
      p.cpf = p.cpf || String(req.body?.cpf || '').replace(/\D/g, '') || null;
      p.medida_confirmada = req.body?.medida || p.medida_confirmada || 'confirmada pelo WhatsApp';
      const i = lista.findIndex(x => x.payment_id === paymentId);
      lista[i] = p;
      await gravar(lista);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ erro: 'ação desconhecida' });
  } catch (e) {
    console.error('pedidos:', e);
    return res.status(500).json({ erro: String(e.message || e).slice(0, 300) });
  }
};