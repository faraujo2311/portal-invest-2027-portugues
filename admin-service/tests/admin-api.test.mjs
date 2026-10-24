import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {handleAdminRequest,seal,open,protectWrite,serializeContent,parseContent,OWNER_ID} from '../lib/admin-api.mjs';
const origin='https://admin.example',identity='owner-site-identity',secret='test-only-cryptographic-secret-never-used-in-production-123';
const migrations=(await readdir(new URL('../drizzle/',import.meta.url))).filter(x=>x.endsWith('.sql'));
const sqls=await Promise.all(migrations.map(x=>readFile(new URL('../drizzle/'+x,import.meta.url),'utf8')));
function db(){
 const store=new DatabaseSync(':memory:');for(const sql of sqls)store.exec(sql);
 return {store,prepare(sql){
  return {bind(...params){
   return {
    async first(){return store.prepare(sql).get(...params)||null},
    async run(){const result=store.prepare(sql).run(...params);return {meta:{changes:Number(result.changes)}}}
   };
  }};
 }};
}
const modules=[{id:'intro',title:'Aula',goals:[],theory:[{title:'Teoria',html:'<p>Revisão</p>'}],examples:[],reading_sets:[],quiz:[],videos:[],images:[],infographic:''}];
async function fixture(){
 const DB=db(),env={DB,ADMIN_ENCRYPTION_KEY:secret};const cookie='a'.repeat(64),hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(cookie))).toString('hex');
 await DB.prepare('INSERT INTO admin_sessions (hash, identity, value, csrf, expires) VALUES (?, ?, ?, ?, ?)').bind(hash,identity,await seal({token:'test-provider-token',login:'faraujo2311'},env),'test-csrf',Date.now()+60000).run();
 return {env,cookie:'__Host-invest_session='+cookie,DB};
}
function req(path,body,cookie='',extra={}){return new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json','X-INVEST-CSRF':'test-csrf',Cookie:cookie,...extra},...(body===undefined?{}:{body:JSON.stringify(body)})})}
const ghUser=()=>Response.json({id:OWNER_ID,login:'faraujo2311'});
test('recusa visitantes anônimos e sessões de outra identidade',async()=>{
 const {env,cookie}=await fixture();assert.equal((await handleAdminRequest(req('/api/content'),env,null)).status,401);
 assert.equal((await handleAdminRequest(req('/api/content',undefined,cookie),env,'another-user')).status,401);
});
test('mantém segredos cifrados e detecta alteração do conteúdo cifrado',async()=>{
 const {env}=await fixture(),cipher=await seal({token:'secret-test-token'},env);assert.equal(cipher.includes('secret-test-token'),false);assert.deepEqual(await open(cipher,env),{token:'secret-test-token'});await assert.rejects(()=>open(cipher.slice(0,-3)+'xxx',env));
});
test('protege escritas contra outra origem e falta de CSRF',()=>{
 assert.throws(()=>protectWrite(req('/api/content',{},'',{Origin:'https://attacker.example'}),{csrf:'test-csrf'}));
 assert.throws(()=>protectWrite(req('/api/content',{},'',{'X-INVEST-CSRF':'wrong'}),{csrf:'test-csrf'}));
 assert.doesNotThrow(()=>protectWrite(req('/api/content',{}),{csrf:'test-csrf'}));
});
test('sessão pública não revela o token do GitHub',async()=>{
 const {env,cookie}=await fixture(),result=await handleAdminRequest(req('/api/session',undefined,cookie),env,identity);const data=await result.json();assert.equal(data.authenticated,true);assert.equal(data.login,'faraujo2311');assert.equal(JSON.stringify(data).includes('test-provider-token'),false);assert.equal(result.headers.get('Cache-Control'),'private, no-store');
});
test('bloqueia conta GitHub que não é a administradora',async()=>{
 const {env,cookie}=await fixture();const result=await handleAdminRequest(req('/api/content',undefined,cookie),env,identity,async()=>Response.json({id:123}));assert.equal(result.status,403);
});
test('publica somente data.js na main e impede duplicação de envio',async()=>{
 const {env,cookie}=await fixture();let writes=0;const fetcher=async(url,options)=>{
  if(url.endsWith('/user'))return ghUser();
  assert.equal(url,'https://api.github.com/repos/faraujo2311/portal-invest-2027-portugues/contents/data.js');assert.equal(options.method,'PUT');const body=JSON.parse(options.body);assert.equal(body.branch,'main');assert.equal(body.sha,'b'.repeat(40));assert.equal(parseContent(Buffer.from(body.content,'base64').toString()).length,1);writes++;
  return Response.json({content:{sha:'c'.repeat(40)},commit:{sha:'d'.repeat(40),html_url:'https://github.com/commit/test'}});
 };
 const body={modules,sha:'b'.repeat(40),requestId:'11111111-1111-4111-8111-111111111111',path:'malicious-other-file'};
 assert.equal((await handleAdminRequest(req('/api/content',body,cookie),env,identity,fetcher)).status,200);
 assert.equal((await handleAdminRequest(req('/api/content',body,cookie),env,identity,fetcher)).status,200);assert.equal(writes,1);
});
test('conflito preserva a versão externa e não confirma publicação',async()=>{
 const {env,cookie}=await fixture();const result=await handleAdminRequest(req('/api/content',{modules,sha:'b'.repeat(40),requestId:'11111111-1111-4111-8111-111111111112'},cookie),env,identity,async url=>url.endsWith('/user')?ghUser():Response.json({message:'conflict'},{status:409}));assert.equal(result.status,409);assert.equal((await result.json()).commit,undefined);
});
test('conteúdo não executa código na leitura e serialização evita fechamento de script',()=>{
 const changed=structuredClone(modules);changed[0].theory[0].html='<script>alert(1)</script>';
 const source=serializeContent(changed);assert.equal(source.includes('<script>'),false);assert.equal(parseContent(source)[0].theory[0].html,'<script>alert(1)</script>');assert.throws(()=>parseContent('window.PORTAL_DEFAULT_MODULES = []; process.exit(1)'));
});
test('login usa PKCE e estado de uso único ligado ao navegador',async()=>{
 const {env,DB}=await fixture();await DB.prepare('INSERT INTO admin_config (id,value,updated) VALUES (?,?,?)').bind('github_app',await seal({client_id:'test-client',client_secret:'test-secret',html_url:'https://github.com/apps/test'},env),Date.now()).run();
 const start=await handleAdminRequest(req('/api/github/start',{}),env,identity),data=await start.json(),url=new URL(data.url);assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('code_challenge').length,43);assert.match(start.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Lax/);
 const callback=await handleAdminRequest(new Request(origin+'/api/github/callback?state='+url.searchParams.get('state')+'&code=test-code'),env,identity,async()=>{throw Error('Não deve chamar GitHub sem cookie de estado')});assert.equal(callback.status,403);
});
