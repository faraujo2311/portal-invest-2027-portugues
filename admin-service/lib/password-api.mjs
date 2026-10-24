import {normalizeModules} from './portal-validation.mjs';
import seed from './default-content.json' with {type:'json'};
import {seal,open,protectWrite} from './admin-api.mjs';

const COOKIE='__Host-invest_editor',IDENTITY='shared-password-v1',PUBLIC_ORIGIN='https://faraujo2311.github.io';
const encode=new TextEncoder();
const random=()=>crypto.randomUUID();
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encode.encode(text))),x=>x.toString(16).padStart(2,'0')).join('');
const cookie=(value,seconds)=>`${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
function fail(message,status=400){throw Object.assign(new Error(message),{status})}
function json(data,status=200,headers={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}})}
async function body(request){
 const reader=request.body?.getReader();if(!reader)fail('Solicitação vazia.');let length=0;const chunks=[];
 for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>12*1024*1024){await reader.cancel();fail('Reduza as imagens: o limite de conteúdo é 12 MB.',413)}chunks.push(value)}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{fail('Dados inválidos.')}
}
export async function verifyPassword(password,encoded){
 if(typeof password!=='string'||password.length>256||!encoded)return false;
 const [method,rounds,salt,expected]=encoded.split('$');if(method!=='pbkdf2-sha256'||rounds!=='100000'||!salt||!expected)return false;
 const key=await crypto.subtle.importKey('raw',encode.encode(password),'PBKDF2',false,['deriveBits']);
 const result=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:Uint8Array.from(atob(salt),c=>c.charCodeAt(0)),iterations:100000},key,256));
 const target=Uint8Array.from(atob(expected),c=>c.charCodeAt(0));let difference=result.length^target.length;
 for(let i=0;i<result.length;i++)difference|=result[i]^(target[i]||0);return difference===0;
}
async function session(request,env){
 const value=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(!value||!/^\w{8}(-\w{4}){3}-\w{12}$/.test(value))return null;
 const row=await env.DB.prepare('SELECT * FROM admin_sessions WHERE hash = ? AND identity = ? AND expires > ?').bind(await digest(value),IDENTITY,Date.now()).first();
 if(!row)return null;try{const payload=await open(row.value,env);return payload.mode==='password'?row:null}catch{return null}
}
async function requireSession(request,env){const current=await session(request,env);if(!current)fail('Digite a senha para entrar no modo de edição.',401);return current}
async function published(env){
 const content=JSON.stringify(normalizeModules(seed)),version=await digest(content);
 await env.DB.prepare('INSERT OR IGNORE INTO portal_content (id,version,content,updated) VALUES (1,?,?,?)').bind(version,content,Date.now()).run();
 return env.DB.prepare('SELECT version,content,updated FROM portal_content WHERE id = 1').bind().first();
}
export async function handlePasswordRequest(request,env){
 try{
  if(!env.DB)fail('O armazenamento ainda não está disponível.',503);
  const path=new URL(request.url).pathname;
  if(path==='/api/published'&&request.method==='GET'){
   const row=await published(env);return json({modules:JSON.parse(row.content),version:row.version,updated:row.updated},200,request.headers.get('origin')===PUBLIC_ORIGIN?{'Access-Control-Allow-Origin':PUBLIC_ORIGIN,Vary:'Origin'}:{});
  }
  if(path==='/api/session'&&request.method==='GET'){
   const current=await session(request,env);return json({authenticated:!!current,csrf:current?.csrf||null});
  }
  if(path==='/api/login'&&request.method==='POST'){
   protectWrite(request,null);if(!env.ADMIN_PASSWORD_HASH)fail('A senha do editor ainda não foi configurada.',503);
   const data=await body(request),window=Math.floor(Date.now()/900000),ip=request.headers.get('CF-Connecting-IP')||'unknown';
   const bucket=await digest(env.ADMIN_ENCRYPTION_KEY+':'+ip+':'+window);
   const attempt=await env.DB.prepare('INSERT INTO editor_login_attempts (bucket,count,expires) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(bucket,Date.now()+1800000).first();
   if(attempt.count>10)fail('Muitas tentativas. Aguarde 15 minutos e tente novamente.',429);
   if(!await verifyPassword(data.password,env.ADMIN_PASSWORD_HASH))fail('Senha incorreta. Tente novamente.',401);
   await env.DB.prepare('DELETE FROM editor_login_attempts WHERE expires < ?').bind(Date.now()).run();
   const token=random(),csrf=random(),seconds=28800;
   await env.DB.prepare('INSERT INTO admin_sessions (hash,identity,value,csrf,expires) VALUES (?,?,?,?,?)').bind(await digest(token),IDENTITY,await seal({mode:'password'},env),csrf,Date.now()+seconds*1000).run();
   return json({authenticated:true,csrf},200,{'Set-Cookie':cookie(token,seconds)});
  }
  if(path==='/api/logout'&&request.method==='POST'){
   const current=await requireSession(request,env);protectWrite(request,current);
   await env.DB.prepare('DELETE FROM admin_sessions WHERE hash = ? AND identity = ?').bind(current.hash,IDENTITY).run();return json({ok:true},200,{'Set-Cookie':cookie('',0)});
  }
  if(path==='/api/content'&&request.method==='GET'){
   await requireSession(request,env);const row=await published(env);return json({modules:JSON.parse(row.content),sha:row.version});
  }
  if(path==='/api/content'&&request.method==='POST'){
   const current=await requireSession(request,env);protectWrite(request,current);const data=await body(request);
   if(!/^[a-f0-9-]{36,64}$/.test(data.sha||'')||!/^\w{8}(-\w{4}){3}-\w{12}$/.test(data.requestId||''))fail('A versão do conteúdo é inválida. Recarregue a página.');
   let modules;try{modules=normalizeModules(data.modules)}catch(error){fail(error.message)}
   const content=JSON.stringify(modules);if(encode.encode(content).length>10*1024*1024)fail('O conteúdo excede 10 MB. Reduza as imagens.',413);
   const previous=await env.DB.prepare('SELECT content FROM content_versions WHERE version = ?').bind(data.requestId).first();
   if(previous){if(previous.content!==content)fail('Esta solicitação já foi utilizada.',409);return json({sha:data.requestId,saved:true})}
   const now=Date.now();
   const results=await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO content_versions (version,previous,content,created) SELECT version,?,content,updated FROM portal_content WHERE id=1 AND version=?').bind('',data.sha),
    env.DB.prepare('UPDATE portal_content SET version=?,content=?,updated=? WHERE id=1 AND version=?').bind(data.requestId,content,now,data.sha),
    env.DB.prepare('INSERT INTO content_versions (version,previous,content,created) SELECT version,?,content,updated FROM portal_content WHERE id=1 AND version=?').bind(data.sha,data.requestId)
   ]);
   if(!results[1].meta.changes)fail('Outra edição foi salva. Baixe seu rascunho e recarregue o conteúdo antes de continuar.',409);
   return json({sha:data.requestId,saved:true,updated:now});
  }
  return json({error:'Endereço não encontrado.'},404);
 }catch(error){return json({error:error.status?error.message:'Não foi possível salvar. Seu rascunho foi preservado.'},error.status||500)}
}
