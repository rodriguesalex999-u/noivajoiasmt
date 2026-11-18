/* Teste ponta a ponta do modulo de Melhor Envios (api/_lib/melhorenvio.js).
 *
 * Roda com o token real (lido do .env da integracao) e NAO gasta saldo:
 * cotacao e carrinho sao gratuitos; o checkout, que cobra, nao e chamado.
 * A etiqueta de teste criada no carrinho e removida no final.
 *
 *   node scripts/testar_melhor_envio.js
 */
const fs = require('fs');
const path = require('path');

/* Onde o token do Melhor Envios esta guardado (18/11/2026, pedido do dono):
   G:\Meu Drive\MELHOR ENVIOS TOKEN ACESSO TOTAL\TOKEN.txt — o dono pediu para
   o arquivo continuar NESSE caminho. O caminho antigo (OneDrive) sumiu. */
const ENV_ME =
  process.env.ME_ENV_PATH ||
  'G:\\Meu Drive\\MELHOR ENVIOS TOKEN ACESSO TOTAL\\TOKEN.txt';

/* Le o token e monta o remetente (dados cadastrados na conta).
   Se as variaveis ja vierem do ambiente (por exemplo do .env puxado da
   Vercel), elas tem prioridade — assim o teste roda com os valores
   REAIS de producao. */
function carregarEnv() {
  if (fs.existsSync(ENV_ME)) {
    const bruto = fs.readFileSync(ENV_ME, 'utf8');
    /* O arquivo do dono (TOKEN.txt) e o token sozinho, sem "token=".
       O arquivo antigo (.env) tinha "token = ...". Os dois formatos valem. */
    const linhaEq = bruto.split(/\r?\n/).find((l) => /^\s*(?:ME_API_TOKEN|token)\s*[=:]\s*.+$/i.test(l));
    if (linhaEq) {
      const m = linhaEq.match(/^\s*(?:ME_API_TOKEN|token)\s*[=:]\s*(.+?)\s*$/i);
      if (m && !process.env.ME_API_TOKEN) {
        process.env.ME_API_TOKEN = m[1].replace(/^["']|["']$/g, '');
      }
    } else if (!process.env.ME_API_TOKEN) {
      const tokenSozinho = bruto.trim().split(/\r?\n/).filter(Boolean)[0];
      if (tokenSozinho && tokenSozinho.split('.').length === 3) {
        process.env.ME_API_TOKEN = tokenSozinho;
      }
    }
  }
  if (!process.env.ME_API_TOKEN) {
    console.error('Token nao encontrado. Defina ME_API_TOKEN ou aponte ME_ENV_PATH.');
    process.exit(2);
  }
  const padroes = {
    ME_SENDER_NAME: 'Noiva Joias MT',
    ME_SENDER_EMAIL: 'rodriguesalex999@gmail.com',
    ME_SENDER_PHONE: '65992771501',
    ME_SENDER_CPF: '73576204172',
    ME_SENDER_CEP: '78015140',
    ME_SENDER_STREET: 'Rua Santa Terezinha',
    ME_SENDER_NUMBER: '31',
    ME_SENDER_DISTRICT: 'Dom Aquino',
    ME_SENDER_CITY: 'Cuiaba',
    ME_SENDER_UF: 'MT',
  };
  for (const [k, v] of Object.entries(padroes)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

async function removerDoCarrinho(cartId) {
  const r = await fetch('https://melhorenvio.com.br/api/v2/me/cart/' + cartId, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + process.env.ME_API_TOKEN, Accept: 'application/json' },
  });
  console.log('   limpeza do carrinho -> HTTP ' + r.status);
}

(async () => {
  carregarEnv();
  const me = require('../api/_lib/melhorenvio.js');

  let falhas = 0;
  const checar = (nome, ok, detalhe) => {
    console.log((ok ? '  OK   ' : '  FALHA') + ' | ' + nome + (detalhe ? ' -> ' + detalhe : ''));
    if (!ok) falhas++;
  };

  console.log('\n1) SALDO');
  const saldo = await me.saldo();
  checar('saldo vem em real (nao centavos)', typeof saldo === 'number' && saldo > 10,
    'R$ ' + Number(saldo).toFixed(2));

  console.log('\n2) COTACAO (nao gasta saldo)');
  const cotacao = await me.cotar({ cep: '01001000' });
  const pac = cotacao.find((o) => o.id === 1);
  checar('cotacao do PAC devolvida', !!pac, pac ? 'R$ ' + pac.price : 'sem PAC');
  checar('preco em real', !!pac && Number(pac.price) > 5, pac && 'R$ ' + pac.price);

  console.log('\n3) ETIQUETA (carrinho — nao gasta saldo)');
  const r = await me.gerarEtiqueta({
    destino: {
      nome: 'TESTE INTEGRACAO NOIVA JOIAS',
      cpf: '11144477735',
      cep: '01001000',
      endereco: 'Praca da Se',
      numero: '1',
      bairro: 'Se',
      cidade: 'Sao Paulo',
      estado: 'SP',
      telefone: '11987654321',
      email: 'teste@example.com',
    },
    produto: 'Alianca',
    valorDeclarado: 300,
    confirmar: false,
  });

  checar('pede confirmacao antes de cobrar', r.precisa_confirmar === true, r.etapa);
  checar('preco em real (nao centavos)', Number(r.preco) > 5, 'R$ ' + r.preco);
  checar(
    'centavos coerentes com o preco',
    Math.abs(r.preco_centavos - Number(r.preco) * 100) < 1,
    r.preco_centavos + ' centavos'
  );

  if (r.cart_id) {
    console.log('\n4) LIMPEZA');
    await removerDoCarrinho(r.cart_id);
  }

  console.log('\n' + (falhas === 0 ? 'TODOS OS TESTES PASSARAM' : falhas + ' TESTE(S) FALHARAM'));
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => {
  console.error('ERRO:', e && e.message ? e.message : e);
  process.exit(1);
});
