/* ============================================================
   PEDIDOS / RASTREIO / ETIQUETA — para o cliente e para o dono
   ============================================================
   Quatro usos, um arquivo:
     · consultar — o campo "Acompanhar meu pedido" da página de
                  sucesso. Devolve em que etapa o pedido está e,
                  quando já foi postado, o código dos Correios.
     · cpf       — o cliente manda o CPF (a Melhor Envios exige).
     · etiquetas — painel do dono: lista os pagos, corrige o
                  endereço, gera e cancela a etiqueta.
     · cotar     — preço do frete antes de gastar saldo.

   POR QUE O DONO PRECISA CORRIGIR O ENDEREÇO À MÃO
     A preferência do Mercado Pago é criada com
     shipments.mode = "not_specified" — o MP então NÃO pede
     endereço de entrega ao cliente (a entrega é combinada no
     WhatsApp). Sem endereço, a Melhor Envios recusa a etiqueta
     ("address is required"). Por isso a tela do dono tem um
     formulário de endereço para cada pedido.

   POR QUE O SEGURO É O VALOR REAL DO PRODUTO
     O valor segurado (insurance_value) precisa ser o valor da
     peça: é ele que a Melhor Envios indeniza se o pacote
     sumir. A versão antiga mandava R$ 10 fixos.

   QUEM PODE FAIZER O QUE
     · cliente: consultar, enviar o próprio CPF
     · dono    (x-owner-token ou token de sessão): listar, cotar,
                editar endereço, gerar e cancelar etiqueta,
                confirmar a medida do dedo
   ============================================================ */

/* Fica em api/_lib/ porque o Vercel transforma TUDO que está em api/ numa
   rota. Como este arquivo é um módulo (não é um handler), deixá-lo em api/
   criava uma rota quebrada que devolvia 500. O prefixo _lib o mantém
   fora das rotas, mas o Node o empacota junto quando alguém o importa. */
const me = require('./_lib/melhorenvio.js');
/* Os pedidos vivem no Postgres (Neon). Antes eram gravados em
   /tmp/pedidos.json — que na Vercel é por função, então quem gravava
   (webhook) e quem lia (aqui) usavam arquivos diferentes. */
const db = require('./_lib/pedidos.js');
/* Sessão do painel: o dono loga com a senha e recebe um token
   assinado, que vale pelas próximas horas. */
const sessao = require('./_lib/sessao.js');

/* ---------- porta do dono ---------- */
/* Listar pedidos, cotar frete e gerar etiqueta são ações do DONO: elas
   mostram dados dos clientes (CPF) e gastam saldo. Exigem o token do
   dono, enviado no cabeçalho "x-owner-token" (ou ?token= na URL).
   O cliente NÃO usa nada disto: as ações "consultar" (rastreio) e
   "cpf" (informar o CPF) continuam abertas, porque são usadas pela
   página de obrigado.html. */
const OWNER_TOKEN = process.env.OWNER_TOKEN || '';

/* O dono pode entrar de duas maneiras:
   1) com o OWNER_TOKEN direto (scripts e automações), ou
   2) com o token de sessão que o /api/painel devolve depois do login
      com a senha. É o que o painel em /painel usa. */
function ehDono(req) {
  const t = String(
    req.headers['x-owner-token'] ||
      req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
      req.query?.token ||
      ''
  ).trim();
  if (!t) return false;
  if (OWNER_TOKEN && t === OWNER_TOKEN) return true;
  return sessao.verificarToken(t);
}

function exigirDono(req, res) {
  if (!OWNER_TOKEN && !process.env.PANEL_SENHA) {
    res.status(503).json({ erro: 'OWNER_TOKEN não configurado na Vercel' });
    return false;
  }
  if (!ehDono(req)) {
    res.status(401).json({ erro: 'não autorizado' });
    return false;
  }
  return true;
}

const soDigitos = s => String(s || '').replace(/\D/g, '');

/* Etapas que o cliente enxerga, na ordem em que aparecem. */
function etapas(p) {
  const e = [];
  if (!p) return e;
  const pago = ['approved', 'authorized', 'in_process', 'pending'].includes(p.status);
  e.push({
    chave: 'pagamento',
    rotulo: 'Pagamento recebido',
    ok: pago,
    detalhe: p.status === 'approved' ? 'Confirmado' : p.status === 'pending' ? 'Aguardando confirmação' : 'Em análise',
  });
  e.push({
    chave: 'medida',
    rotulo: 'Medida do dedo confirmada',
    ok: !!p.medida_confirmada,
    detalhe: p.medida_confirmada ? 'Confirmada' : 'Um atendente vai te chamar no WhatsApp',
  });
  e.push({
    chave: 'etiqueta',
    rotulo: 'Etiqueta gerada',
    ok: !!p.me_order_id && !p.etiqueta_cancelada,
    detalhe: p.etiqueta_cancelada
      ? 'Etiqueta cancelada'
      : p.me_order_id
        ? 'Pronta'
        : 'Gerando…',
    bloqueio: !p.cpf && !p.me_order_id ? 'Precisamos do seu CPF' : null,
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

/* Resume um pedido para a tela do dono. */
function paraPainel(p) {
  return {
    pedido_id: p.pedido_id,
    payment_id: p.payment_id,
    preference_id: p.preference_id,
    status: p.status,
    etapa: p.etapa,
    produto: p.produto,
    valor: p.valor,
    frete: p.frete,
    valor_produto: p.valor_produto,
    modalidade: p.modalidade,
    regiao: p.regiao,
    prazo: p.prazo,
    nome: p.nome,
    email: p.email,
    telefone: p.telefone,
    cpf: p.cpf,
    cep: p.cep,
    endereco: p.endereco,
    numero: p.numero,
    complemento: p.complemento,
    bairro: p.bairro,
    cidade: p.cidade,
    estado: p.estado,
    medida_confirmada: p.medida_confirmada,
    me_order_id: p.me_order_id,
    me_status: p.me_status,
    rastreio: p.rastreio,
    etiqueta_url: p.etiqueta_url,
    etiqueta_preco: p.etiqueta_preco,
    etiqueta_cancelada: p.etiqueta_cancelada,
    criado_em: p.criado_em,
    nota: p.nota,
    /* O que falta para a etiqueta sair. */
    falta: [
      !p.cpf ? 'CPF' : null,
      !p.cep ? 'CEP' : null,
      !p.endereco ? 'Endereço' : null,
      !p.cidade ? 'Cidade' : null,
      !p.estado ? 'UF' : null,
    ].filter(Boolean),
  };
}

module.exports = async function handler(req, res) {
  const acao = String(req.query?.acao || req.body?.acao || '').toLowerCase();

  try {
    /* ================= CONSULTAR (cliente) ================= */
    if (acao === 'consultar' && req.method === 'POST') {
      const codigo = String(req.body?.codigo || req.body?.payment_id || '').trim();
      if (!codigo) return res.status(400).json({ erro: 'informe o código' });

      const p = await db.buscar(codigo);
      if (!p) {
        return res.status(200).json({
          encontrado: false,
          erro:
            'Ainda não localizamos esse pagamento. Assim que o Mercado Pago ' +
            'confirmar ele aparece aqui (pode levar 1 a 2 minutos).',
        });
      }

      /* Se já tem etiqueta, busca o status real na Melhor Envios. */
      if (p.me_order_id && !p.etiqueta_cancelada) {
        try {
          const st = await me.statusEnvio(p.me_order_id);
          if (st.ok) {
            const mudou = st.status && st.status !== p.me_status;
            const dados = { pedido_id: p.pedido_id, me_status: st.status };
            if (st.tracking && st.tracking !== p.rastreio) dados.rastreio = st.tracking;
            if (mudou || dados.rastreio) await db.salvar(dados);
            p.me_status = st.status;
            if (dados.rastreio) p.rastreio = dados.rastreio;
          }
        } catch {
          /* a Melhor Envios pode estar instável; o pedido continua valendo */
        }
      }

      return res.status(200).json({
        encontrado: true,
        pedido_id: p.pedido_id,
        payment_id: p.payment_id,
        produto: p.produto,
        /* Os valores REAIS vêm do banco — nunca da URL (a URL é do
           cliente e pode estar vazia ou adulterada). */
        valor: p.valor,
        frete: p.frete,
        valor_produto: p.valor_produto,
        modalidade: p.modalidade,
        regiao: p.regiao,
        nome: p.nome,
        status:
          p.me_status === 'delivered'
            ? 'Entregue'
            : p.me_status === 'posted'
              ? 'Em trânsito'
              : p.status === 'approved'
                ? 'Pagamento aprovado'
                : p.status,
        rastreio: p.rastreio || null,
        link_rastreio: p.rastreio
          ? 'https://www.melhorrastreio.com.br/rastreio/' + p.rastreio
          : null,
        etapas: etapas(p),
        prazo: p.prazo,
        /* o cliente precisa do CPF para a etiqueta sair */
        precisa_cpf: !p.cpf,
      });
    }

    /* ================= CPF (cliente) =================
       A Melhor Envios exige o CPF do destinatário e o Mercado Pago
       não pede esse dado. O cliente manda aqui. O CPF só é gravado
       se ainda não existir — não sobrescreve o que a loja já tem. */
    if (acao === 'cpf' && req.method === 'POST') {
      const codigo = String(req.body?.codigo || req.body?.payment_id || '').trim();
      const cpf = soDigitos(req.body?.cpf);
      if (!codigo) return res.status(400).json({ erro: 'informe o código do pedido' });
      if (cpf.length !== 11) return res.status(400).json({ erro: 'CPF inválido' });

      const p = await db.buscar(codigo);
      if (!p) {
        return res.status(200).json({
          ok: false,
          erro: 'Pedido não localizado ainda. Tente de novo em 1 minuto.',
        });
      }
      if (p.cpf && p.cpf !== cpf) {
        return res.status(200).json({
          ok: false,
          erro: 'Já temos um CPF neste pedido. Fale com a gente no WhatsApp para corrigir.',
        });
      }
      await db.salvar({ pedido_id: p.pedido_id, cpf });
      return res.status(200).json({ ok: true });
    }

    /* ================= LISTAR (dono) ================= */
    if (req.method === 'GET' && (acao === '' || acao === 'listar')) {
      if (!exigirDono(req, res)) return;
      const lista = await db.ler();
      let saldo = null;
      try {
        saldo = await me.saldo();
      } catch {
        saldo = null;
      }
      return res.status(200).json({
        saldo_me: saldo,
        total: lista.length,
        aguardando_etiqueta: lista.filter(
          p => !p.me_order_id && !p.etiqueta_cancelada && p.status === 'approved'
        ).length,
        sem_cpf: lista.filter(p => !p.cpf && p.status === 'approved').length,
        pedidos: lista.slice(0, 100).map(paraPainel),
      });
    }

    /* ================= COTAR (dono) ================= */
    if (acao === 'cotar' && req.method === 'POST') {
      if (!exigirDono(req, res)) return;
      const cep = soDigitos(req.body?.cep);
      if (cep.length !== 8) return res.status(400).json({ erro: 'CEP inválido' });
      const c = await me.cotar({ cep });
      return res.status(200).json({ opcoes: c });
    }

    /* ================= EDITAR PEDIDO (dono) =================
       O endereço chega pelo WhatsApp, não pelo site. Sem ele a
       Melhor Envios recusa a etiqueta — por isso este formulário. */
    if (acao === 'atualizar' && req.method === 'POST') {
      if (!exigirDono(req, res)) return;
      const codigo = String(req.body?.codigo || req.body?.payment_id || '').trim();
      const p = await db.buscar(codigo);
      if (!p) return res.status(404).json({ erro: 'pedido não encontrado' });

      const campos = ['nome', 'email', 'telefone', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'nota'];
      const dados = { pedido_id: p.pedido_id };
      for (const c of campos) {
        if (req.body?.[c] !== undefined) dados[c] = req.body[c] === '' ? null : req.body[c];
      }
      if (req.body?.cep !== undefined) dados.cep = soDigitos(req.body.cep) || null;
      if (req.body?.cpf !== undefined) dados.cpf = soDigitos(req.body.cpf) || null;
      if (req.body?.medida !== undefined) {
        dados.medida_confirmada = req.body.medida || null;
      }
      const salvo = await db.salvar(dados);
      return res.status(200).json({ ok: true, pedido: paraPainel(salvo) });
    }

    /* ================= GERAR ETIQUETA (dono) ================= */
    if (acao === 'etiqueta' && req.method === 'POST') {
      if (!exigirDono(req, res)) return;
      const codigo = String(req.body?.codigo || req.body?.payment_id || '').trim();
      const p = await db.buscar(codigo);
      if (!p) return res.status(404).json({ erro: 'pedido não encontrado' });

      if (p.me_order_id && !p.etiqueta_cancelada) {
        return res.status(200).json({ ok: true, ja_gerada: true, pedido: paraPainel(p) });
      }

      /* O valor segurado é o valor REAL da peça. */
      const valorDeclarado = Number(p.valor_produto || p.valor || 0);

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
        valorDeclarado,
        confirmar: !!req.body?.confirmar,
        servico: Number(req.body?.servico) || 1,
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
          seguro: r.seguro,
          aviso: 'Gerar esta etiqueta gasta R$ ' + valor + ' do saldo da Melhor Envios.',
        });
      }
      if (r.ok === false) {
        return res.status(200).json({
          ok: false,
          etapa: r.etapa,
          erro: r.erro,
          precisa: r.precisa,
          pedido: paraPainel(p),
        });
      }

      /* Sucesso: guarda rastreio e link da etiqueta no pedido. */
      const salvo = await db.salvar({
        pedido_id: p.pedido_id,
        me_order_id: r.me_order_id,
        rastreio: r.rastreio,
        etiqueta_url: r.etiqueta_url,
        etiqueta_preco: r.preco,
        etapa: 'etiqueta_gerada',
      });

      return res.status(200).json({
        ok: true,
        pedido: paraPainel(salvo),
        aviso: r.etiqueta_url
          ? null
          : 'Etiqueta gerada; PDF não saiu — abra pelo painel da Melhor Envios.',
      });
    }

    /* ================= CANCELAR ETIQUETA (dono) =================
       Cancela na Melhor Envios e marca o pedido. O estorno do valor
       na conta da Melhor Envios leva até 12 horas. */
    if (acao === 'cancelar' && req.method === 'POST') {
      if (!exigirDono(req, res)) return;
      const codigo = String(req.body?.codigo || req.body?.payment_id || '').trim();
      const p = await db.buscar(codigo);
      if (!p) return res.status(404).json({ erro: 'pedido não encontrado' });
      if (!p.me_order_id) return res.status(400).json({ erro: 'esse pedido não tem etiqueta' });
      if (p.etiqueta_cancelada) {
        return res.status(200).json({ ok: true, ja_cancelada: true, pedido: paraPainel(p) });
      }

      const r = await me.cancelar(p.me_order_id, req.body?.motivo || 'Cancelado no painel da loja');
      if (!r.ok) {
        return res.status(200).json({ ok: false, erro: r.texto || r.erro, pedido: paraPainel(p) });
      }
      const salvo = await db.salvar({
        pedido_id: p.pedido_id,
        etiqueta_cancelada: true,
        etiqueta_cancelada_em: new Date().toISOString(),
        me_status: 'canceled',
      });
      return res.status(200).json({
        ok: true,
        cancelado: r.cancelado,
        aviso: r.aviso,
        pedido: paraPainel(salvo),
      });
    }

    /* ================= MARCAR MEDIDA OK (dono) ================= */
    if (acao === 'medida' && req.method === 'POST') {
      if (!exigirDono(req, res)) return;
      const codigo = String(req.body?.codigo || req.body?.payment_id || '').trim();
      const p = await db.buscar(codigo);
      if (!p) return res.status(404).json({ erro: 'pedido não encontrado' });
      const dados = {
        pedido_id: p.pedido_id,
        medida_confirmada: req.body?.medida || 'confirmada pelo WhatsApp',
      };
      if (req.body?.cpf) dados.cpf = soDigitos(req.body.cpf);
      const salvo = await db.salvar(dados);
      return res.status(200).json({ ok: true, pedido: paraPainel(salvo) });
    }

    return res.status(400).json({ erro: 'ação desconhecida' });
  } catch (e) {
    console.error('pedidos:', e);
    return res.status(500).json({ erro: String(e.message || e).slice(0, 300) });
  }
};
