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
/* Fica em api/_lib/ porque o Vercel transforma TUDO que está em api/ numa
   rota. Como este arquivo é um módulo (não é um handler), deixá-lo em api/
   criava uma rota quebrada que devolvia 500. O prefixo _lib o mantém
   fora das rotas, mas o Node o empacota junto quando alguém o importa. */
const me = require('./_lib/melhorenvio.js');

const ARQ = path.join('/tmp', 'pedidos.json');

/* ---------- porta do dono ---------- */
/* Listar pedidos, cotar frete e gerar etiqueta são ações do DONO: elas
   mostram dados dos clientes (CPF) e gastam saldo. Exigem o token do
   dono, enviado no cabeçalho "x-owner-token" (ou ?token= na URL).
   O cliente NÃO usa nada disto: as ações "consultar" (rastreio) e
   "medida" (informar o CPF) continuam abertas, porque são usadas pela
   página de obrigado.html. */
const OWNER_TOKEN = process.env.OWNER_TOKEN || '';

function ehDono(req) {
  if (!OWNER_TOKEN) return false;
  const t = String(req.headers['x-owner-token'] || req.query?.token || '').trim();
  return t.length > 0 && t === OWNER_TOKEN;
}

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
      if (!OWNER_TOKEN) {
        return res.status(503).json({ erro: 'OWNER_TOKEN não configurado na Vercel' });
      }
      if (!ehDono(req)) {
        return res.status(401).json({ erro: 'não autorizado' });
      }
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
      if (!OWNER_TOKEN) {
        return res.status(503).json({ erro: 'OWNER_TOKEN não configurado na Vercel' });
      }
      if (!ehDono(req)) {
        return res.status(401).json({ erro: 'não autorizado' });
      }
      const cep = String(req.body?.cep || '').replace(/\D/g, '');
      if (cep.length !== 8) return res.status(400).json({ erro: 'CEP inválido' });
      const c = await me.cotar({ cep });
      return res.status(200).json({ opcoes: c });
    }

    /* ================= GERAR ETIQUETA (dono) ================= */
    if (acao === 'etiqueta' && req.method === 'POST') {
      if (!OWNER_TOKEN) {
        return res.status(503).json({ erro: 'OWNER_TOKEN não configurado na Vercel' });
      }
      if (!ehDono(req)) {
        return res.status(401).json({ erro: 'não autorizado' });
      }
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
        const valor = Number(r.preco || 0).toFixed(2).replace('.', ',');
        return res.status(200).json({
          ok: false,
          precisa_confirmar: true,
          preco: Number(r.preco || 0),
          servico: r.servico,
          cart_id: r.cart_id,
          aviso: 'Gerar esta etiqueta gasta R$ ' + valor + ' do saldo da Melhor Envios.',
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