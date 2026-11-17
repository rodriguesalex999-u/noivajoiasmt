/* LISTA ÚNICA DOS PRODUTOS ANUNCIADOS (17/11/2026, pedido do dono).
   É daqui que sai o texto da mensagem do WhatsApp quando o link traz &p=<código>
   (ex.: /zap?nj=youtube&p=banhada → "Vi seu vídeo no YouTube sobre as alianças banhadas a ouro").

   PRODUTO NOVO (corrente, peça náutica, o que o dono trouxer): acrescentar UMA linha aqui,
   com um código só de letras minúsculas, e usar esse código no fim dos links (&p=<código>).
   Não precisa mexer em mais nenhum arquivo do site.
     sobre = como entra na frase "Vi seu vídeo no YouTube sobre ____"
     vi    = como entra na frase "Vim pelo YouTube (vi as/os ____)" — já com o artigo */
window.NJ_PROD = {
  banhada: { sobre: 'as alianças banhadas a ouro', vi: 'as alianças banhadas a ouro' },
  moeda:   { sobre: 'as alianças de moeda antiga', vi: 'as alianças de moeda antiga' },
  ambas:   { sobre: 'as alianças banhadas a ouro e as de moeda antiga', vi: 'as alianças banhadas a ouro e de moeda antiga' }
};
