# FICHA DO FUNCIONÁRIO: NOIVA_JOIAS_MT

**Cargo:** Responsável pelo site da Noiva Joias MT

**O que cuida:** Site noivajoiasmt.vercel.app: catálogo, FAQ, checkout e painel.

## Por onde começar
1. `AGENTS.md` (regras)
2. `APRENDIZADOS.md` (**os problemas já resolvidos e COMO resolver de novo** — leia antes de mexer em foto, vídeo, rota ou robô; foi o que evitou o "borrão preto" e a rota trocada no robô)
3. `INDICE.md` (o que tem em cada pasta)
4. `CHANGELOG.md`
5. `COMO-COLOCAR-PRODUTO-NO-SITE.md` (como colocar produto e foto novos no site)

## Regras deste departamento
- O `.env.local` fica aqui porque o site exige (exceção do cofre).
- Fotos do site ficam no R2; `fotos-origem` é só origem.
- **Foto de produto nunca entra processada à mão:** sempre pelo `scripts/preparar_fotos_produto.py` e conferida contra o **original** antes de publicar. Foto de **cenário** (relógio, produto na mão) tem fundo real e já sofreu com a regra antiga (virou borrão preto no cristal). Se a foto já está no ar e precisa de conserto, subir **na mesma chave** do R2 — o link não muda e nenhum link já enviado ao cliente quebra. Detalhe em `APRENDIZADOS.md` (23/11/2026).

## Ligações: quando chamar outro departamento
| Chamar | Quando |
|---|---|
| BATE-PAPO-ALEX | mudou preço, link ou página: o robô manda esses links e repete esses preços |
| GOOGLE-ADS e FACEBOK-META | os anúncios apontam para cá |

## Regras que valem para todos
Estão em `G:\Meu Drive\GERAL\LEIA-ME_PARA_QUALQUER_IA.md`. O mapa de todos os departamentos está em `G:\Meu Drive\GERAL\00-ORGANOGRAMA.md`.

_Esta ficha não substitui os arquivos acima: ela diz quem é este departamento, onde começa e com quem ele se liga. Se o projeto mudar, atualize a ficha. Criada em 15/11/2026._
