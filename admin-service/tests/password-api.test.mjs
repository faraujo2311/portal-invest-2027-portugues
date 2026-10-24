import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {pbkdf2Sync} from 'node:crypto';
import {handlePasswordRequest,verifyPassword} from '../lib/password-api.mjs';
const origin='https://editor.example',password='test-only-editor-password',salt=Buffer.from('test-salt-never-used-in-production');
const passwordHash='pbkdf2-sha256$100000$'+salt.toString('base64')+'$'+pbkdf2Sync(password,salt,100000,32,'sha256').toString('base64');
const migrations=(await readdir(new URL('../drizzle/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort();
async function fixture(){
 const store=new DatabaseSync(':memory:');for(const file of migrations)store.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const DB={prepare(sql){return {bind(...params){return {sql,params,async first(){return store.prepare(sql).get(...params)||null},async run(){const r=store.prepare(sql).run(...params);return {meta:{changes:Number(r.changes)}}}}}}},async batch(statements){store.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());store.exec('COMMIT');return results}catch(error){store.exec('ROLLBACK');throw error}}};
 return {env:{DB,ADMIN_PASSWORD_HASH:passwordHash,ADMIN_ENCRYPTION_KEY:'test-only-cryptographic-secret-long-enough-123456'},store};
}
function request(path,data,session={},extra={}){return new Request(origin+path,{method:data===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:session.cookie||'','X-INVEST-CSRF':session.csrf||'',...extra},...(data===undefined?{}:{body:JSON.stringify(data)})})}
async function login(env){const r=await handlePasswordRequest(request('/api/login',{password}),env);assert.equal(r.status,200);return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:(await r.json()).csrf}}
test('valida senha no servidor e não libera edição para senha errada',async()=>{
 assert.equal(await verifyPassword(password,passwordHash),true);assert.equal(await verifyPassword('wrong',passwordHash),false);
 const {env}=await fixture();assert.equal((await handlePasswordRequest(request('/api/login',{password:'wrong'}),env)).status,401);
 assert.equal((await handlePasswordRequest(request('/api/content'),env)).status,401);assert.equal((await handlePasswordRequest(request('/api/content',{}),env)).status,401);
});
test('sessão usa cookie protegido, expira e é revogada ao sair',async()=>{
 const {env,store}=await fixture(),response=await handlePasswordRequest(request('/api/login',{password}),env);assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
 const session={cookie:response.headers.get('set-cookie').split(';')[0],csrf:(await response.json()).csrf};
 const state=await handlePasswordRequest(request('/api/session',undefined,session),env);assert.equal((await state.json()).authenticated,true);
 assert.equal((await handlePasswordRequest(request('/api/logout',{},session),env)).status,200);assert.equal((await handlePasswordRequest(request('/api/content',undefined,session),env)).status,401);
 const other=await login(env);store.exec('UPDATE admin_sessions SET expires=0');assert.equal((await handlePasswordRequest(request('/api/content',undefined,other),env)).status,401);
});
test('limita tentativas e rejeita login ou gravação de outra origem',async()=>{
 const {env}=await fixture();assert.equal((await handlePasswordRequest(request('/api/login',{password},{},{Origin:'https://evil.example'}),env)).status,403);
 const session=await login(env);assert.equal((await handlePasswordRequest(request('/api/content',{},session,{'X-INVEST-CSRF':'wrong'}),env)).status,403);
 for(let i=0;i<9;i++)assert.equal((await handlePasswordRequest(request('/api/login',{password:'wrong'}),env)).status,401);
 assert.equal((await handlePasswordRequest(request('/api/login',{password}),env)).status,429);
});
test('preserva material e vídeo publicados e permite leitura pública com CORS do portal',async()=>{
 const {env}=await fixture(),response=await handlePasswordRequest(request('/api/published',undefined,{},{Origin:'https://faraujo2311.github.io'}),env),data=await response.json();
 assert.equal(data.modules.length,12);assert.ok(data.modules.find(m=>m.id==='interpretacao').videos.some(v=>v.url.includes('OxTNN-IKcEQ')));
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://faraujo2311.github.io');assert.equal(JSON.stringify(data).includes('test-only-editor-password'),false);
});
test('salva para outros visitantes, preserva versões, trata repetição e rejeita conflito',async()=>{
 const {env,store}=await fixture(),session=await login(env),initial=await (await handlePasswordRequest(request('/api/content',undefined,session),env)).json();
 const modules=structuredClone(initial.modules);modules[0].title='Título revisado no teste';modules[0].sources=[{title:'Referência',url:'https://example.com'}];
 const body={modules,sha:initial.sha,requestId:crypto.randomUUID()};
 assert.equal((await handlePasswordRequest(request('/api/content',body,session),env)).status,200);
 assert.equal((await handlePasswordRequest(request('/api/content',body,session),env)).status,200);
 const publicData=await (await handlePasswordRequest(request('/api/published'),env)).json();assert.equal(publicData.modules[0].title,modules[0].title);assert.equal(publicData.modules[0].sources[0].title,'Referência');
 assert.equal(store.prepare('SELECT COUNT(*) AS n FROM content_versions').get().n,2);
 assert.equal((await handlePasswordRequest(request('/api/content',{...body,requestId:crypto.randomUUID()},session),env)).status,409);
 const unchanged=await (await handlePasswordRequest(request('/api/published'),env)).json();assert.equal(unchanged.version,publicData.version);
});
test('rejeita importação inválida sem substituir o material anterior',async()=>{
 const {env}=await fixture(),session=await login(env),initial=await (await handlePasswordRequest(request('/api/content',undefined,session),env)).json();
 const invalid=structuredClone(initial.modules);invalid[0].sources=[{title:'Ataque',url:'javascript:alert(1)'}];
 assert.notEqual((await handlePasswordRequest(request('/api/content',{modules:invalid,sha:initial.sha,requestId:crypto.randomUUID()},session),env)).status,200);
 const after=await (await handlePasswordRequest(request('/api/published'),env)).json();assert.equal(after.version,initial.sha);
});
