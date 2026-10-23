/* ============================================================
   TESTE LOCAL — proteções do checkout / webhook / rastreio
   Roda os handlers de api/ com mocks (sem falar com o Mercado
   Pago e sem gravar no banco). Resultado em
   .tmp-check/teste_resultado.txt
   ============================================================ */
const fs = require('fs');
const path = require('path');

/* Env de teste ANTES de carregar os módulos (eles leem no load):
   token falso — nenhuma chamada real ao Mercado Pago sai daqui,
   porque criarPreferencia/buscarPagamento são trocados por mocks. */
process.env.MP_ACCESS_TOKEN = 'token-de-teste-fake';
process.env.OWNER_TOKEN = 'token-dono-de-teste';

const linhas = [];
const ok = (rotulo, cond, extra) => {
  linhas.push((cond ? 'PASS ' : 'FAIL ') + rotulo + (extra ? ' | ' + extra : ''));
  if (!cond) process.exitCode = 1;
};

async function main() {
  /* ---------- mocks ---------- */
  const mp = require('../api/_lib/mp.js');
  const db = require('../api/_lib/pedidos.js');

  let ultimaPreferencia = null;
  mp.criarPreferencia = async (opts) => {
    ultimaPreferencia = opts;
    return { ok: true, status: 201, dados: { id: 'pref-teste-123', init_point: 'https://mp.example/checkout/pref-teste-123' } };
  };
  mp.buscarPagamento = async () => ({ ok: false, status: 404, dados: {} });
  const salvarOriginal = db.salvar;
  db.salvar = async (p) => ({ pedido_id: 'PJ-TESTE0001', ...p });

  const checkout = require('../api/checkout.js');
  const rastreio = require('../api/rastreio.js');
  const webhook = require('../api/webhook.js');
  const painel = require('../api/painel.js');

  function mockRes() {
    const r = { statusCode: null, body: null };
    r.status = (c) => { r.statusCode = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    return r;
  }

  const NOME_REAL = 'Par de Aliança com Anel Solitário Quadrado 8mm - Banhado a Ouro 18k';

  /* 1) ataque: produto inexistente + preço 0,01 -> recusado, SEM criar preferência */
  ultimaPreferencia = null;
  let res = mockRes();
  await checkout({ method: 'POST', headers: {}, query: {}, body: {
    nome: 'PRODUTO-FANTASMA-SEGURANCA-NAO-EXISTE', preco: '0.01', qtd: 1, frete: '0', regiao: 'fora', pagamento: 'tradicional'
  }}, res);
  ok('1. produto fantasma recusado (400)', res.statusCode === 400, 'status=' + res.statusCode);
  ok('1b. preferência NÃO criada no ataque', ultimaPreferencia === null);
  ok('1c. mensagem de erro clara', /catálogo/i.test(res.body?.error || ''), res.body?.error);

  /* 2) ataque: produto REAL mas preço manipulado 0,01 -> cobra preço do catálogo */
  ultimaPreferencia = null;
  res = mockRes();
  await checkout({ method: 'POST', headers: {}, query: {}, body: {
    nome: NOME_REAL, preco: '0.01', qtd: 1, frete: '0', regiao: 'fora', pagamento: 'tradicional'
  }}, res);
  ok('2. aceita produto real', res.statusCode === 200, 'status=' + res.statusCode + ' body=' + JSON.stringify(res.body));
  const precoCobrado = ultimaPreferencia?.itens?.[0]?.unit_price;
  ok('2b. cobra 399.99 (catálogo), não 0.01', precoCobrado === 399.99, 'unit_price=' + precoCobrado);
  ok('2c. item tem o nome real', ultimaPreferencia?.itens?.[0]?.title === NOME_REAL);

  /* 3) sedex a cobrar: cobra SÓ o frete de 44,99 (sem produto no site) */
  ultimaPreferencia = null;
  res = mockRes();
  await checkout({ method: 'POST', headers: {}, query: {}, body: {
    nome: NOME_REAL, preco: '9999', pagamento: 'sedex', regiao: 'fora'
  }}, res);
  ok('3. sedex aceita', res.statusCode === 200, 'status=' + res.statusCode);
  ok('3b. cobra só 44.99 de frete', ultimaPreferencia?.itens?.[0]?.unit_price === 44.99,
     'unit_price=' + ultimaPreferencia?.itens?.[0]?.unit_price);
  ok('3c. só 1 item (sem produto duplicado)', ultimaPreferencia?.itens?.length === 1);

  /* 4) nome com caixa/acentos diferentes ainda acha o produto */
  ultimaPreferencia = null;
  res = mockRes();
  await checkout({ method: 'POST', headers: {}, query: {}, body: {
    nome: 'PAR DE ALIANCA COM ANEL SOLITARIO QUADRADO 8MM - BANHADO A OURO 18K',
    preco: '0.01', pagamento: 'tradicional', regiao: 'local'
  }}, res);
  ok('4. nome em caixa alta/sem acento acha o produto', res.statusCode === 200 && ultimaPreferencia?.itens?.[0]?.unit_price === 399.99,
     'status=' + res.statusCode);

  /* 5) webhook embutido no checkout: com MP_SECRET configurado, sem assinatura -> recusa */
  process.env.MP_SECRET = 'segredo-de-teste';
  res = mockRes();
  await checkout({ method: 'POST', headers: {}, query: {}, body: { data: { id: '12345' } } }, res);
  ok('5. webhook sem assinatura é recusado quando MP_SECRET existe',
     res.statusCode === 200 && res.body?.aviso === 'assinatura invalida', JSON.stringify(res.body));
  delete process.env.MP_SECRET;

  /* 6) webhook (rota dedicada): sem id -> ping ok; com assinatura errada + MP_SECRET -> recusa */
  process.env.MP_SECRET = 'segredo-de-teste';
  res = mockRes();
  await webhook({ method: 'POST', headers: { 'x-signature': 'ts=1,v1=beef' }, query: {}, body: { type: 'payment', data: { id: '999' } } }, res);
  ok('6. /api/webhook recusa assinatura inválida', res.body?.ok === false && /assinatura/.test(res.body?.aviso || ''), JSON.stringify(res.body));
  res = mockRes();
  await webhook({ method: 'GET', headers: {}, query: {}, body: {} }, res);
  ok('6b. GET do webhook responde ping', res.statusCode === 200 && res.body?.ok === true);
  delete process.env.MP_SECRET;

  /* 7) rastreio: código inexistente -> JSON válido encontrado:false (não explode) */
  res = mockRes();
  await rastreio({ method: 'POST', headers: {}, query: {}, body: { acao: 'consultar', codigo: 'PJ-NAOEXISTE99' } }, res);
  ok('7. consultar devolve JSON encontrado:false', res.statusCode === 200 && res.body?.encontrado === false, JSON.stringify(res.body).slice(0, 120));

  /* 8) rastreio: ação do dono sem token -> 401 */
  res = mockRes();
  await rastreio({ method: 'GET', headers: {}, query: {}, body: {} }, res);
  ok('8. listar pedidos sem token -> 401', res.statusCode === 401, 'status=' + res.statusCode);

  /* 9) painel: GET responde que existe/nao existe senha (sem vazar a senha) */
  res = mockRes();
  await painel({ method: 'GET', headers: {}, query: {}, body: {} }, res);
  ok('9. painel GET ok', res.statusCode === 200 && typeof res.body?.tem_senha === 'boolean');

  /* 10) catálogo: JSON presente e coerente */
  const catalogo = require('../api/_lib/catalogo-precos.json');
  const n = Object.keys(catalogo).length;
  ok('10. catálogo do servidor com >= 150 produtos', n >= 150, 'n=' + n);

  db.salvar = salvarOriginal;
  fs.writeFileSync(path.join(__dirname, '..', '.tmp-check', 'teste_resultado.txt'),
    linhas.join('\n') + '\n');
}

main().catch(e => {
  fs.writeFileSync(path.join(__dirname, '..', '.tmp-check', 'teste_resultado.txt'),
    'ERRO FATAL: ' + (e && e.stack || e) + '\n' + linhas.join('\n') + '\n');
  process.exit(1);
});
