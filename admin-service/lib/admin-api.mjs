import {normalizeModules} from './portal-validation.mjs';
export const REPO='faraujo2311/portal-invest-2027-portugues',OWNER_ID=67614375,LIVE='https://faraujo2311.github.io/portal-invest-2027-portugues/';
const GH='https://api.github.com',HEADERS={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'Portal-INVEST-2027-Admin'};
const SESSION='__Host-invest_session',STATE='__Host-invest_oauth',encoder=new TextEncoder();
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
const base64=bytes=>{let out='';for(let i=0;i<bytes.length;i+=16384)out+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(out)};
const unbase64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const cookie=(name,value,seconds)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
const cookies=req=>Object.fromEntries((req.headers.get('cookie')||'').split(';').map(x=>x.trim().split('=')).filter(x=>x.length===2));
function problem(message,status=400){const error=new Error(message);error.status=status;throw error}
function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...extra}})}
function redirect(path,extra={}){return new Response(null,{status:303,headers:{Location:path,'Cache-Control':'no-store',...extra}})}
async function digest(text){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text))),x=>x.toString(16).padStart(2,'0')).join('')}
async function key(env){if(!env.ADMIN_ENCRYPTION_KEY||env.ADMIN_ENCRYPTION_KEY.length<40)problem('A proteção do servidor ainda não foi configurada.',503);return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',encoder.encode(env.ADMIN_ENCRYPTION_KEY)),{name:'AES-GCM'},false,['encrypt','decrypt'])}
export async function seal(value,env){const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(REPO)},await key(env),encoder.encode(JSON.stringify(value))));return base64(iv)+'.'+base64(cipher)}
export async function open(value,env){const [iv,cipher]=value.split('.');return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(iv),additionalData:encoder.encode(REPO)},await key(env),unbase64(cipher))))}
async function readBody(request){
 const reader=request.body?.getReader();if(!reader)problem('Solicitação sem dados.');let count=0;const chunks=[];
 for(;;){const {value,done}=await reader.read();if(done)break;count+=value.length;if(count>12*1024*1024){await reader.cancel();problem('O conteúdo excede 12 MB. Reduza as imagens.',413)}chunks.push(value)}
 const bytes=new Uint8Array(count);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{problem('Dados JSON inválidos.')}
}
async function github(path,token,fetcher,options={}){
 const result=await fetcher(GH+path,{...options,headers:{...HEADERS,...(token?{Authorization:'Bearer '+token}:{}),...options.headers},signal:AbortSignal.timeout(20000)});
 if(!result.ok){if(result.status===401)problem('A autorização do GitHub expirou. Entre novamente.',401);if(result.status===403)problem('O GitHub não autorizou esta operação. Confira a instalação no repositório do portal.',403);if(result.status===409||result.status===422)problem('O conteúdo mudou no GitHub. Recarregue antes de publicar para preservar as outras alterações.',409);problem('O GitHub não concluiu a operação. Confira o repositório antes de tentar novamente.',502)}
 return result;
}
async function config(env){const row=await env.DB.prepare('SELECT value FROM admin_config WHERE id = ?').bind('github_app').first();return row?open(row.value,env):null}
async function session(request,env,identity){
 const value=cookies(request)[SESSION];if(!value||!/^[a-f0-9]{64}$/.test(value))return null;
 const row=await env.DB.prepare('SELECT * FROM admin_sessions WHERE hash = ? AND identity = ? AND expires > ?').bind(await digest(value),identity,Date.now()).first();
 if(!row)return null;try{return {...row,...await open(row.value,env)}}catch{return null}
}
async function authorized(request,env,identity,fetcher){const current=await session(request,env,identity);if(!current)problem('Entre com seu GitHub para editar o portal.',401);const user=await (await github('/user',current.token,fetcher)).json();if(user.id!==OWNER_ID)problem('Esta conta não é administradora do portal.',403);return current}
export function protectWrite(request,current){
 if(request.headers.get('origin')!==new URL(request.url).origin)problem('Origem da solicitação inválida.',403);
 if(current&&request.headers.get('X-INVEST-CSRF')!==current.csrf)problem('A sessão mudou. Recarregue a página.',403);
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')problem('Envie dados JSON.',415);
}
async function startState(kind,identity,payload,env){const state=random();await env.DB.prepare('INSERT INTO pending_auth (hash, kind, identity, value, expires) VALUES (?, ?, ?, ?, ?)').bind(await digest(state),kind,identity,await seal(payload,env),Date.now()+600000).run();return state}
async function consumeState(request,env,identity,kind){
 const state=new URL(request.url).searchParams.get('state');if(!state||state!==cookies(request)[STATE]||!/^[a-f0-9]{64}$/.test(state))problem('A autorização não corresponde a este navegador. Inicie novamente.',403);
 const row=await env.DB.prepare('DELETE FROM pending_auth WHERE hash = ? AND kind = ? AND identity = ? AND expires > ? RETURNING value').bind(await digest(state),kind,identity,Date.now()).first();
 if(!row)problem('A autorização expirou ou já foi utilizada. Inicie novamente.',403);return open(row.value,env);
}
function errorPage(message,status){return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Autorização do Portal INVEST</title><main><h1>Autorização não concluída</h1><p>${escape(message)}</p><a href="/">Voltar à administração</a></main></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; base-uri 'none'; frame-ancestors 'self'",'Referrer-Policy':'no-referrer'}})}
export function parseContent(source){const prefix=/^\s*window\.PORTAL_DEFAULT_MODULES\s*=\s*/;if(!prefix.test(source))problem('O arquivo de conteúdo do GitHub tem formato inesperado.',422);let text=source.replace(prefix,'').trim();if(text.endsWith(';'))text=text.slice(0,-1);return normalizeModules(JSON.parse(text))}
export function serializeContent(modules){return 'window.PORTAL_DEFAULT_MODULES = '+JSON.stringify(normalizeModules(modules),null,2).replace(/</g,'\\u003c')+';\n'}
export async function handleAdminRequest(request,env,identity,fetcher=fetch){
 try{
  if(!identity)problem('Entre na sua conta para acessar a administração.',401);
  if(!env.DB)problem('O armazenamento administrativo ainda não foi configurado.',503);
  const url=new URL(request.url),route=url.pathname;
  if(route==='/api/session'&&request.method==='GET'){
   const app=await config(env),current=await session(request,env,identity);
   return json({configured:!!app,authenticated:!!current,login:current?.login||null,csrf:current?.csrf||null,repository:REPO,portal:LIVE,installUrl:app?.html_url?app.html_url+'/installations/new':null});
  }
  if(route==='/api/github/setup'&&request.method==='POST'){
   protectWrite(request,null);if(await config(env))problem('A integração já foi configurada. Use Entrar com GitHub.',409);
   const state=await startState('setup',identity,{},env),base=url.origin;
   const manifest={name:'Portal INVEST 2027 — faraujo2311',url:LIVE,redirect_url:base+'/api/github/setup-callback',callback_urls:[base+'/api/github/callback'],setup_url:base+'/',description:'Administração do portal INVEST 2027. Edita o material do repositório selecionado.',public:false,hook_attributes:{url:base+'/api/github/webhook',active:false},default_permissions:{contents:'write',metadata:'read'},default_events:[],request_oauth_on_install:false};
   return json({action:'https://github.com/settings/apps/new?state='+state,manifest},200,{'Set-Cookie':cookie(STATE,state,600)});
  }
  if(route==='/api/github/setup-callback'&&request.method==='GET'){
   await consumeState(request,env,identity,'setup');if(await config(env))problem('A integração já existe. Volte à administração.',409);
   const code=url.searchParams.get('code');if(!/^[a-zA-Z0-9_-]{10,200}$/.test(code||''))problem('Código de configuração inválido.');
   const result=await (await github('/app-manifests/'+code+'/conversions',null,fetcher,{method:'POST'})).json();
   if(!result.client_id||!result.client_secret||!result.html_url?.startsWith('https://github.com/apps/'))problem('O GitHub não retornou a configuração esperada.',502);
   if(result.owner&&result.owner.id!==OWNER_ID)problem('Crie a integração na conta faraujo2311.',403);
   const app={client_id:result.client_id,client_secret:result.client_secret,html_url:result.html_url,id:result.id};
   await env.DB.prepare('INSERT INTO admin_config (id, value, updated) VALUES (?, ?, ?)').bind('github_app',await seal(app,env),Date.now()).run();
   // The generated private key is deliberately not persisted: no app-level tokens are needed.
   return redirect(result.html_url+'/installations/new',{'Set-Cookie':cookie(STATE,'',0)});
  }
  if(route==='/api/github/start'&&request.method==='POST'){
   protectWrite(request,null);const app=await config(env);if(!app)problem('Configure primeiro a integração com o GitHub.',409);
   const verifier=random()+random(),challenge=base64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier)))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'),state=await startState('login',identity,{verifier},env);
   const query=new URLSearchParams({client_id:app.client_id,redirect_uri:url.origin+'/api/github/callback',state,code_challenge:challenge,code_challenge_method:'S256',login:'faraujo2311',allow_signup:'false'});
   return json({url:'https://github.com/login/oauth/authorize?'+query},200,{'Set-Cookie':cookie(STATE,state,600)});
  }
  if(route==='/api/github/callback'&&request.method==='GET'){
   const pending=await consumeState(request,env,identity,'login'),app=await config(env),code=url.searchParams.get('code');if(!app||!code||code.length>200)problem('Autorização incompleta. Inicie novamente.');
   const result=await fetcher('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded','User-Agent':HEADERS['User-Agent']},body:new URLSearchParams({client_id:app.client_id,client_secret:app.client_secret,code,redirect_uri:url.origin+'/api/github/callback',code_verifier:pending.verifier,repository_id:'1432299189'}),signal:AbortSignal.timeout(20000)});
   const auth=await result.json();if(!result.ok||!auth.access_token)problem('O GitHub não concluiu a autorização. Tente entrar novamente.',401);
   const user=await (await github('/user',auth.access_token,fetcher)).json();if(user.id!==OWNER_ID)problem('Somente faraujo2311 pode administrar este portal.',403);
   const repo=await (await github('/repos/'+REPO,auth.access_token,fetcher)).json();if(!repo.permissions?.push)problem('Instale a integração no repositório do portal com permissão de conteúdo.',403);
   const sessionId=random(),csrf=random(),seconds=Math.min(14400,Number(auth.expires_in)||14400),expires=Date.now()+seconds*1000;
   await env.DB.prepare('INSERT INTO admin_sessions (hash, identity, value, csrf, expires) VALUES (?, ?, ?, ?, ?)').bind(await digest(sessionId),identity,await seal({token:auth.access_token,login:user.login},env),csrf,expires).run();
   const headers=new Headers({Location:'/', 'Cache-Control':'no-store'});headers.append('Set-Cookie',cookie(SESSION,sessionId,seconds));headers.append('Set-Cookie',cookie(STATE,'',0));return new Response(null,{status:303,headers});
  }
  if(route==='/api/logout'&&request.method==='POST'){
   const current=await session(request,env,identity);protectWrite(request,current);if(current)await env.DB.prepare('DELETE FROM admin_sessions WHERE hash = ? AND identity = ?').bind(current.hash,identity).run();return json({ok:true},200,{'Set-Cookie':cookie(SESSION,'',0)});
  }
  if(route==='/api/content'&&request.method==='GET'){
   const current=await authorized(request,env,identity,fetcher),path='/repos/'+REPO+'/contents/data.js?ref=main',result=await (await github(path,current.token,fetcher)).json();
   if(result.size>10*1024*1024)problem('O conteúdo excede o limite do editor on-line.',413);
   const source=result.encoding==='base64'?new TextDecoder().decode(unbase64(result.content.replace(/\s/g,''))):await (await github(path,current.token,fetcher,{headers:{Accept:'application/vnd.github.raw+json'}})).text();
   return json({modules:parseContent(source),sha:result.sha,branch:'main'});
  }
  if(route==='/api/content'&&request.method==='POST'){
   const current=await authorized(request,env,identity,fetcher);protectWrite(request,current);const body=await readBody(request);
   if(!/^[a-f0-9]{40}$/.test(body.sha||'')||!/^[a-f0-9-]{36}$/.test(body.requestId||''))problem('Versão ou identificador da publicação inválido.');
   const content=serializeContent(body.modules);if(encoder.encode(content).length>10*1024*1024)problem('O conteúdo excede 10 MB. Reduza as imagens.',413);
   const inserted=await env.DB.prepare('INSERT OR IGNORE INTO publish_operations (id, identity, status, result, created) VALUES (?, ?, ?, ?, ?)').bind(body.requestId,identity,'pending',null,Date.now()).run();
   if(!inserted.meta.changes){const saved=await env.DB.prepare('SELECT status, result FROM publish_operations WHERE id = ? AND identity = ?').bind(body.requestId,identity).first();if(saved?.status==='complete')return json(JSON.parse(saved.result));problem('Esta publicação já foi enviada. Confira o histórico antes de tentar novamente.',409)}
   try{
    const result=await (await github('/repos/'+REPO+'/contents/data.js',current.token,fetcher,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Atualiza material pelo administrador do Portal INVEST',branch:'main',sha:body.sha,content:base64(encoder.encode(content))})})).json();
    const saved={sha:result.content.sha,commit:result.commit.sha,commitUrl:result.commit.html_url,actionsUrl:'https://github.com/'+REPO+'/actions',portal:LIVE};
    await env.DB.prepare('UPDATE publish_operations SET status = ?, result = ? WHERE id = ? AND identity = ?').bind('complete',JSON.stringify(saved),body.requestId,identity).run();return json(saved);
   }catch(error){await env.DB.prepare('UPDATE publish_operations SET status = ? WHERE id = ? AND identity = ?').bind(error.status===409?'conflict':'unconfirmed',body.requestId,identity).run();throw error}
  }
  return json({error:'Endereço não encontrado.'},404);
 }catch(error){const status=error.status||500,message=error.status?error.message:'Não foi possível concluir a operação. Seus rascunhos foram preservados.';if(new URL(request.url).pathname.endsWith('callback'))return errorPage(message,status);return json({error:message},status)}
}
