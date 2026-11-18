const fs=require('fs'),path=require('path');
const envFile = process.env.NJ_ENV_FILE || 'G:\\Meu Drive\\GERAL\\NOIVA_JOIAS_MT\\.env.local';
for(const line of fs.readFileSync(envFile,'utf8').split(/\r?\n/)){
  const m=line.match(/^\s*([^#][A-Za-z0-9_]+)\s*=\s*(.*)\s*$/); if(m) process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');}
const ev=require(path.join(__dirname,'..','api','_lib','eventos.js'));
const {Client}=require('pg');
(async()=>{
  const c=new Client({connectionString:process.env.DATABASE_URL}); await c.connect();
  const req={headers:{'user-agent':'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36','x-forwarded-for':'203.0.113.55','accept-language':'pt-BR'}};
  const canal='testeverificacao'; const fp=ev.dedo(req);
  await c.query('DELETE FROM eventos WHERE canal=$1',[canal]);
  await c.query('DELETE FROM eventos_quarentena WHERE fp=$1',[fp]);
  console.log('1) visita de cliente:',JSON.stringify(await ev.registrar(req,{tipo:'visita',canal,pagina:'/',vid:'vclient001aaaa'})));
  console.log('2) whatsapp do mesmo cliente:',JSON.stringify(await ev.registrar(req,{tipo:'whats',canal,pagina:'/',vid:'vclient001aaaa'})));
  console.log('3) checkout do mesmo cliente:',JSON.stringify(await ev.registrar(req,{tipo:'checkout',canal,pagina:'/checkout',vid:'vclient001aaaa'})));
  console.log('4) checkout de quem nunca visitou:',JSON.stringify(await ev.registrar(req,{tipo:'checkout',canal,pagina:'/checkout',vid:'vclient999zzzz'})));
  console.log('5) compra de quem nunca visitou:',JSON.stringify(await ev.registrar(req,{tipo:'compra',canal,pagina:'/obrigado',vid:'vclient888yyyy'})));
  const resumo=await ev.resumo(30);
  console.log('6) resumo da API:',resumo.ok?'OK, canais='+resumo.canais.length:'FALHOU '+JSON.stringify(resumo));
  const q=await c.query('SELECT tipo,count(*)::int n,count(DISTINCT vid)::int v FROM eventos WHERE canal=$1 GROUP BY tipo ORDER BY tipo',[canal]);
  console.log('7) eventos do cliente salvo no banco:',JSON.stringify(q.rows));
  await c.query('DELETE FROM eventos WHERE canal=$1',[canal]);
  await c.query('DELETE FROM eventos_quarentena WHERE fp=$1',[fp]);
  const lim=await c.query('SELECT count(*)::int n FROM eventos WHERE canal=$1',[canal]);
  console.log('8) limpeza do teste:',lim.rows[0].n===0?'OK (0 linhas)':'FALHOU');
  await c.end();
})().catch(e=>{console.error('ERRO: '+e.message);process.exit(1);});
