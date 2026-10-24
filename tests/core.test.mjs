import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access,mkdir,copyFile,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const {normalizeModules,normalizeStudy,safeImage,safeLink}=require('../core.js');
const root=new URL('../',import.meta.url);
const source=await readFile(new URL('data.js',root),'utf8');
const data=JSON.parse(source.slice(source.indexOf('=')+1).trim().replace(/;$/,''));
const modules=normalizeModules(data);
test('preserva todos os blocos, textos, questões e infográficos originais',async()=>{
 assert.equal(modules.length,data.length);assert.ok(modules.length>=12);
 assert.equal(modules.reduce((n,m)=>n+m.quiz.length+m.reading_sets.reduce((n,r)=>n+r.questions.length,0),0),data.reduce((n,m)=>n+m.quiz.length+(m.reading_sets||[]).reduce((n,r)=>n+r.questions.length,0),0));
 for(const m of modules)if(m.infographic)await access(new URL('assets/'+m.infographic,root));
 assert.equal((await readdir(new URL('assets/',root))).filter(x=>x.endsWith('.png')).length,10);
});
test('rejeita estruturas malformadas, ids perigosos, duplicados e gabaritos incorretos',()=>{
 for(const bad of [[],[null],[{id:'__proto__'}],[{id:'a'},{id:'a'}],[{id:'a',theory:[null]}],[{id:'a',quiz:[{options:['a','b','c','d'],answer:1.5}]}],[{id:'a',reading_sets:[{questions:[null]}]}]])assert.throws(()=>normalizeModules(bad));
});
test('imagens e links bloqueiam execução e travessia de diretórios',()=>{
 for(const src of ['javascript:alert(1)','data:image/svg+xml,<svg/>','assets/../../index.html','http://example.com/image.png'])assert.equal(safeImage(src),'');
 assert.equal(safeLink('javascript:alert(1)'),'');assert.equal(safeLink('https://u:p@example.com'),'');
 assert.ok(safeImage('assets/classes.png'));assert.ok(safeImage('data:image/png;base64,YWJjZA=='));
});
test('normaliza progresso nulo, dados hostis e pontuações importadas',()=>{
 const m=modules.find(m=>m.quiz.length);const key=m.id+'/main';
 const input=JSON.parse('{"checks":{"__proto__":{"polluted":true}},"answers":{},"grades":{},"attempts":[null,{"moduleId":"constructor"}]}');
 input.checks[m.id]={teoria:'true',video:true};input.answers[key]={0:m.quiz[0].answer,1:'<img onerror=alert(1)>'};
 input.grades[key]={percent:'<img onerror=alert(1)>',at:'2026-10-24T12:00:00Z'};
 const study=normalizeStudy(input,modules);
 assert.equal(study.checks[m.id].teoria,false);assert.equal(study.checks[m.id].video,true);
 assert.equal(study.grades[key].correct,1);assert.equal(typeof study.grades[key].percent,'number');assert.equal(study.attempts.length,0);assert.equal({}.polluted,undefined);
 assert.doesNotThrow(()=>normalizeStudy({checks:null,answers:[],grades:[],selectedVideo:null},modules));
});
test('alterar uma questão invalida respostas e correção antigas',()=>{
 const m=modules.find(m=>m.quiz.length),key=m.id+'/main';
 const study=normalizeStudy({checks:{[m.id]:{questoes:true}},answers:{[key]:{0:0}},grades:{[key]:{at:'2026-10-24'}}},modules);
 const revised=structuredClone(modules);revised.find(x=>x.id===m.id).quiz[0].q+=' Revisada';
 const result=normalizeStudy(study,revised);
 assert.equal(result.answers[key],undefined);assert.equal(result.grades[key],undefined);assert.equal(result.checks[m.id].questoes,false);
});
test('progresso mantém checklists, respostas, seleção de vídeo e histórico em ida e volta',()=>{
 const m=modules.find(m=>m.quiz.length),key=m.id+'/main';
 const before=normalizeStudy({checks:{[m.id]:{teoria:true}},answers:{[key]:{0:2}},attempts:[{moduleId:m.id,key,total:5,correct:3,at:'2026-10-24T10:00:00Z'}]},modules);
 assert.deepEqual(normalizeStudy(JSON.parse(JSON.stringify(before)),modules),before);
});
test('pacote público exclui editor, fontes de backup e caminhos absolutos',async()=>{
 execFileSync(process.execPath,['scripts/build.mjs'],{cwd:root,stdio:'pipe'});
 const names=await readdir(new URL('dist/',root));assert.equal(names.includes('editor.js'),false);assert.equal(names.includes('iniciar.py'),false);
 const html=await readFile(new URL('dist/index.html',root),'utf8');
 assert.doesNotMatch(html,/editor\.js|id="adminScreen"|data-editor=|id="openAdminBtn"|id="adminTopBtn"/);
 assert.match(html,/name="referrer" content="strict-origin-when-cross-origin"/);
 for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(/^https:\/\//.test(match[1]))continue;assert.equal(match[1].startsWith('/'),false);await access(new URL('dist/'+match[1],root))}
});
test('YouTube aceita formatos conhecidos e rejeita protocolos, hosts e ids falsos',async()=>{
 const code=await readFile(new URL('app.js',root),'utf8');
 const parse=vm.runInNewContext(code.slice(code.indexOf('function parseYT('),code.indexOf('function renderVideos('))+';parseYT',{URL,location:{origin:'https://example.github.io'}});
 for(const url of ['https://youtu.be/M7lc1UVf-VE','https://youtube.com/watch?v=M7lc1UVf-VE','https://www.youtube.com/shorts/M7lc1UVf-VE','https://www.youtube.com/live/M7lc1UVf-VE','https://youtube-nocookie.com/embed/M7lc1UVf-VE']){
  assert.match(parse(url).embed,/M7lc1UVf-VE/);assert.match(parse(url).embed,/origin=https%3A%2F%2Fexample.github.io/);
 }
 assert.ok(parse('https://www.youtube.com/playlist?list=PL1234567890abc'));
 for(const url of ['javascript://youtube.com/watch?v=M7lc1UVf-VE','https://youtube.com.evil.example/watch?v=M7lc1UVf-VE','https://youtube.com:8080/watch?v=M7lc1UVf-VE','https://u:p@youtube.com/watch?v=M7lc1UVf-VE','https://youtu.be/invalid'])assert.equal(parse(url),null);
});
test('falha ao persistir importação restaura conteúdo e progresso anteriores',async()=>{
 const code=await readFile(new URL('app.js',root),'utf8');
 const items=new Map([['content','original'],['progress','anterior']]);let fail=true;
 const localStorage={getItem:k=>items.get(k)??null,removeItem:k=>items.delete(k),setItem(k,v){if(k==='progress'&&fail){fail=false;throw new Error('QuotaExceededError')}items.set(k,v)}};
 const persist=vm.runInNewContext(code.slice(code.indexOf('function persistImported('),code.indexOf('function startup('))+';persistImported',{localStorage,CONTENT_KEY:'content',PROGRESS_KEY:'progress',storageFailure:()=>{}});
 assert.throws(()=>persist(modules,{checks:{}}));assert.equal(items.get('content'),'original');assert.equal(items.get('progress'),'anterior');
});
