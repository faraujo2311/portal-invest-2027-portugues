'use strict';
const CONTENT_KEY = 'invest_pt_v2_content';
const PROGRESS_KEY = 'invest_pt_v2_progress';
const OLD_KEY = 'invest_portugues_portal_v1';
const STAGES = ['teoria','video','exemplos','questoes'];
const EDITOR_ENABLED = true;
const DEFAULT_MODULES = window.PORTAL_DEFAULT_MODULES;
const TIPS = ['Leia o texto inteiro antes de olhar as alternativas.','Destaque conectivos: mas, embora, portanto e porque.','Em gramática, analise a palavra dentro da frase.','Revisar o erro ensina tanto quanto acertar a questão.','Na prova, prefira uma resposta que o texto comprova.'];
const app = { modules: [], study: {currentModuleId:'',checks:{},answers:{},grades:{},attempts:[],selectedVideo:{}}, admin:false, tab:'general', saving:null };
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const clone = value => JSON.parse(JSON.stringify(value));
const id = ()=>'id'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.add('hidden'),3300)}
function formatPlain(v){return esc(v).replace(/\n/g,'<br>')}
function richOrText(v){return /<(?:p|ul|ol|div|strong|b|i|em|h\d|span|br|blockquote|a)[\s>]/i.test(String(v||'')) ? safeRich(v) : formatPlain(v)}
function storageFailure(message){
 const notice=$('#storageNotice');if(notice){notice.textContent=message;notice.classList.remove('hidden')}toast(message);
}
function storeContent(){
 clearTimeout(app.saving);if(!EDITOR_ENABLED)return true;
 try{localStorage.setItem(CONTENT_KEY,JSON.stringify({version:2,modules:app.modules,editedAt:new Date().toISOString()}));const el=$('#savedIndicator');if(el)el.textContent='✓ Salvo neste navegador';return true}
 catch(e){storageFailure('Conteúdo não salvo. Exporte um backup e verifique o espaço ou as permissões do navegador.');const el=$('#savedIndicator');if(el)el.textContent='Não salvo — exporte um backup';return false}
}
function queueStore(){clearTimeout(app.saving);const el=$('#savedIndicator');if(el)el.textContent='Salvando…';app.saving=setTimeout(storeContent,380)}
function storeProgress(){try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(app.study));return true}catch(e){storageFailure('Progresso não salvo neste navegador. Baixe uma cópia antes de sair.');return false}}
function current(){return app.modules.find(m=>m.id===app.study.currentModuleId)||app.modules[0]}
function ensureProgress(){app.study=normalizeStudy(app.study,app.modules)}
function persistImported(content,study){
 const beforeContent=localStorage.getItem(CONTENT_KEY),beforeProgress=localStorage.getItem(PROGRESS_KEY);
 try{
  if(content!==null)localStorage.setItem(CONTENT_KEY,JSON.stringify({version:2,modules:content,editedAt:new Date().toISOString()}));
  localStorage.setItem(PROGRESS_KEY,JSON.stringify(study));
 }catch(error){
  try{for(const [key,value] of [[CONTENT_KEY,beforeContent],[PROGRESS_KEY,beforeProgress]]){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}}catch(rollbackError){storageFailure('O navegador bloqueou a restauração do backup anterior. Preserve seus arquivos JSON antes de sair.')}
  throw error;
 }
}
function startup(){
 app.modules=normalizeModules(clone(DEFAULT_MODULES));
 try{
  const saved=JSON.parse(localStorage.getItem(CONTENT_KEY)||'null');
  if(EDITOR_ENABLED&&saved?.modules)app.modules=normalizeModules(saved.modules);
 }catch(e){storageFailure('Não foi possível recuperar as edições locais. O conteúdo original foi carregado; preserve seu backup.')}
 try{const saved=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'null');if(saved)app.study=normalizeStudy(saved,app.modules)}
 catch(e){storageFailure('Não foi possível recuperar o progresso. Importe um backup válido ou inicie uma nova revisão.')}
 try{
  if(!localStorage.getItem('invest_pt_v2_migrated')){
   const old=JSON.parse(localStorage.getItem(OLD_KEY)||'null');
   if(old){
    if(!Object.keys(app.study.checks||{}).length)app.study.checks=old.progress||{};
    if(EDITOR_ENABLED)for(const m of app.modules){const ov=old.videos?.[m.id];if(ov?.url&&parseYT(ov.url)&&!m.videos.some(v=>v.url===ov.url))m.videos.push({id:id(),title:String(ov.title||'Vídeo anterior'),url:ov.url})}
    storeContent();
   }
   localStorage.setItem('invest_pt_v2_migrated','1');
  }
 }catch(e){storageFailure('O navegador não permitiu recuperar ou salvar os dados antigos. Use os backups JSON.')}
 ensureProgress();renderAll();
 if(location.protocol==='file:')$('#localNotice').classList.remove('hidden');
 if(!EDITOR_ENABLED){$('#openAdminBtn')?.remove();$('#adminTopBtn')?.remove();$('#adminScreen')?.remove()}
}
function renderAll(){renderNav();renderHeader();renderStats();if(app.admin)renderAdmin();else renderStudy()}
function renderNav(){
 const nav=$('#navList');nav.innerHTML=app.modules.map((m,i)=>{
  const checked=STAGES.filter(s=>app.study.checks[m.id]?.[s]).length;
  return `<button class="nav-item ${current().id===m.id?'active':''}" data-nav="${esc(m.id)}"><span class="nav-icon">${esc(m.icon)}</span><span class="nav-name">${i+1}. ${esc(m.title)}</span><span class="nav-count ${checked===4?'complete':''}">${checked===4?'✓':checked+'/4'}</span></button>`
 }).join('')}
function renderStats(){
 let done=0,steps=0;for(const m of app.modules){const count=STAGES.filter(s=>app.study.checks[m.id]?.[s]).length;steps+=count;if(count===4)done++}
 const total=app.modules.length*STAGES.length;
 $('#progressPct').textContent=Math.round(100*steps/Math.max(1,total))+'%';$('#progressFill').style.width=(100*steps/Math.max(1,total))+'%';$('#doneCount').textContent=done;$('#checksCount').textContent=steps;
}
function renderHeader(){
 $('#breadcrumbCurrent').textContent=current().title;
 $('#modePill').textContent=app.admin?'Modo administrador':'Modo estudante';
 $('#modePill').style.background=app.admin?'#fff0e4':'#e6f5eb';$('#modePill').style.color=app.admin?'#a45729':'#237348';
 if($('#adminTopBtn'))$('#adminTopBtn').textContent=app.admin?'✓ Voltar ao estudo':'✎ Editar conteúdo';
 $('#studyScreen').classList.toggle('hidden',app.admin);$('#adminScreen')?.classList.toggle('hidden',!app.admin);
}
function sectionHeading(label,title){return `<div class="section-heading"><span class="tag">${esc(label)}</span><h2>${esc(title)}</h2></div>`}
function lessonImage(src, caption){
 src=safeImage(src);if(!src)return '';
 return `<figure class="image-panel"><img loading="lazy" src="${esc(src)}" alt="${esc(caption)}"><figcaption>${esc(caption)}</figcaption></figure>`;
}
function renderStudy(){
 const m=current();$('#pageTitle').textContent=m.title;$('#pageSubtitle').textContent=m.summary;$('#studyDayBadge').textContent='Preparação INVEST 2027';
 let html=`<section class="lesson-hero"><div class="lesson-top"><span class="lesson-emoji">${esc(m.icon)}</span><div><span class="eyebrow">BLOCO DE ESTUDO</span><h2>${esc(m.title)}</h2><p>${esc(m.summary)}</p></div></div><div class="goals">${m.goals.map(x=>`<span class="goal">✓ ${esc(x)}</span>`).join('')}</div></section>`;
 html+=sectionHeading('01','Aprenda a teoria');
 for(const sec of m.theory){
   const theory=typeof sec.html==='string'?safeRich(sec.html):`<ul>${sec.points.map(p=>`<li>${richOrText(p)}</li>`).join('')}</ul>`;
   html+=`<section class="content-card"><h3>${esc(sec.title)}</h3><div class="prose">${theory}</div></section>`;
 }
 if(m.infographic)html+=lessonImage('assets/'+m.infographic,'Infográfico: '+m.title);
 if(m.images.length){html+=sectionHeading('02','Veja as ilustrações');html+='<div class="gallery">';for(const im of m.images)html+=lessonImage(im.src,im.caption);html+='</div>'}
 if(m.reading_sets.length){
   html+=sectionHeading('03','Leia, interprete e pratique');
   m.reading_sets.forEach((r,i)=>{
    html+=`<section class="content-card"><div class="reading-card"><span class="reading-label">${esc(r.genre)}</span><h3>${esc(r.title)}</h3><div class="reading-text prose">${richOrText(r.text)}</div></div>${renderQuiz(r.questions,`${m.id}/reading/${i}`,'Questões do texto')}</section>`
   })
 }
 if(m.examples.length){html+=sectionHeading('04','Exemplos resolvidos');html+='<section class="content-card">';for(const ex of m.examples)html+=`<div class="example"><strong>${esc(ex.title)}</strong><div class="prose">${richOrText(ex.content)}</div></div>`;html+='</section>'}
 if(m.quiz.length){html+=sectionHeading('05','Exercícios de fixação');html+=`<section class="content-card">${renderQuiz(m.quiz,`${m.id}/main`,'Teste seus conhecimentos')}</section>`}
 if(!m.quiz.length&&!m.reading_sets.length)html+=`<section class="content-card"><h3>Prática</h3><p>Este bloco propõe leitura e revisão. Continue para as atividades do próximo tema.</p></section>`;
 $('#contentArea').innerHTML=html;
 $$('[data-stage]').forEach(el=>el.checked=!!app.study.checks[m.id][el.dataset.stage]);
 $('#stageBadge').textContent=STAGES.filter(s=>app.study.checks[m.id][s]).length+'/4';
 $('#studyTip').textContent=TIPS[(app.modules.indexOf(m)+m.title.length)%TIPS.length];
 renderVideos();renderHistory();
}
function quizSource(key){
 const pieces=key.split('/');const m=app.modules.find(x=>x.id===pieces[0]);if(!m)return [];
 if(pieces[1]==='reading')return m.reading_sets[Number(pieces[2])]?.questions||[];
 return m.quiz;
}
function renderQuiz(questions,key,heading){
 if(!questions.length)return `<div class="card-note">Ainda não há questões neste bloco.</div>`;
 const picks=app.study.answers[key]||{};const last=app.study.grades[key];
 let html=`<div class="section-heading" style="margin-top:0"><span class="tag">${questions.length} QUESTÕES</span><h2>${esc(heading)}</h2></div><p class="muted">Marque uma alternativa. A correção será exibida quando você concluir este conjunto.</p>`;
 for(let i=0;i<questions.length;i++){
  const q=questions[i],pick=picks[i];
  html+=`<div class="question-card"><span class="question-label">QUESTÃO ${i+1}</span><h4>${richOrText(q.q)}</h4><ol>`;
  for(let j=0;j<q.options.length;j++){
   const cl=last?(j===q.answer?'correct':(j===pick?'wrong':'')):(j===pick?'selected':'');
   html+=`<li><button class="option ${cl}" data-choice="${esc(key)}" data-index="${i}" data-option="${j}" aria-pressed="${pick===j}"><span class="letter">${String.fromCharCode(65+j)}</span><span>${richOrText(q.options[j])}</span></button></li>`;
  }
  html+='</ol>';
  if(last)html+=`<div class="result-note"><strong>${pick===q.answer?'✓ Resposta correta':'✎ Correção'} — alternativa ${String.fromCharCode(65+q.answer)}.</strong> ${richOrText(q.explanation)}</div>`;
  html+='</div>';
 }
 html+=`<div class="scoreline"><button class="primary-btn" data-grade="${esc(key)}">Corrigir ${questions.length} questões</button><button class="outline-btn" data-restart="${esc(key)}">Refazer</button>${last?`<span class="score-text">Última tentativa: ${last.correct}/${last.total} (${last.percent}%)</span>`:''}</div>`;
 return html;
}
function chooseOption(key,idx,opt){
 if(!app.study.answers[key])app.study.answers[key]={};app.study.answers[key][idx]=opt;
 if(app.study.grades[key]){delete app.study.grades[key];app.study.checks[current().id].questoes=false}storeProgress();renderStats();renderNav();renderStudy();
 const target=$(`[data-choice="${CSS.escape(key)}"][data-index="${idx}"]`);if(target)target.scrollIntoView({block:'nearest'});
}
function gradeQuiz(key){
 const questions=quizSource(key);if(!questions.length)return;
 const picks=app.study.answers[key]||{};const unanswered=questions.filter((_,i)=>picks[i]===undefined).length;
 if(unanswered&&!confirm(`Você deixou ${unanswered} questão(ões) sem resposta. Deseja corrigir assim mesmo?`))return;
 let correct=0;questions.forEach((q,i)=>{if(picks[i]===q.answer)correct++});
 const percent=Math.round(100*correct/questions.length);
 app.study.grades[key]={correct,total:questions.length,percent,at:new Date().toISOString()};
 app.study.attempts.unshift({moduleId:current().id,key,correct,total:questions.length,percent,at:new Date().toISOString()});app.study.attempts=app.study.attempts.slice(0,200);
 const m=current();const keys=[...m.reading_sets.map((_,i)=>`${m.id}/reading/${i}`),...(m.quiz.length?[`${m.id}/main`]:[])];
 if(keys.length&&keys.every(k=>app.study.grades[k]))app.study.checks[m.id].questoes=true;
 storeProgress();renderAll();toast(`Correção concluída: ${correct} de ${questions.length} acertos.`)
}
function restartQuiz(key){delete app.study.answers[key];delete app.study.grades[key];app.study.checks[current().id].questoes=false;storeProgress();renderAll();toast('Respostas limpas. Boa revisão!')}
function parseYT(raw){
 try{
  const u=new URL(String(raw).trim());if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port)return null;const host=u.hostname.toLowerCase().replace(/^www\./,'').replace(/^m\./,'');
  let videoId=null,playlistId=null;
  if(host==='youtu.be')videoId=u.pathname.split('/')[1];
  if(['youtube.com','youtube-nocookie.com','music.youtube.com'].includes(host)){
   if(u.pathname==='/watch')videoId=u.searchParams.get('v');
   if(/^\/(shorts|embed|live)\//.test(u.pathname))videoId=u.pathname.split('/')[2];
   if(u.pathname==='/playlist'||u.pathname==='/embed/videoseries')playlistId=u.searchParams.get('list');
  }
  if(videoId&&/^[\w-]{11}$/.test(videoId))return {id:videoId,embed:`https://www.youtube.com/embed/${videoId}?rel=0&playsinline=1`+(location.origin&&location.origin!=='null'?'&origin='+encodeURIComponent(location.origin):''),watch:`https://www.youtube.com/watch?v=${videoId}`};
  if(playlistId&&/^[\w-]{10,100}$/.test(playlistId))return {embed:`https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`,watch:`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`};
 }catch(e){}
 return null;
}
function renderVideos(){
 const m=current();const valid=m.videos.map((v,i)=>({...v,index:i,parsed:parseYT(v.url)})).filter(x=>x.parsed);
 $('#videoCount').textContent=valid.length;
 if(!valid.length){$('#videoHolder').innerHTML='<div class="empty-player"><div class="play-emblem">▶</div><b>Nenhum vídeo cadastrado</b><span>Os vídeos deste bloco ainda estão em preparação. Continue estudando o material ao lado.</span></div>';$('#videoCurrent').innerHTML='';$('#videoPlaylist').innerHTML='';return}
 const sel=app.study.selectedVideo[m.id];const chosen=valid.find(v=>v.id===sel)||valid[0];
 const frame=document.createElement('iframe');frame.src=chosen.parsed.embed;frame.title=chosen.title||'Aula em vídeo';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allowFullscreen=true;frame.loading='lazy';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation allow-popups');
 $('#videoHolder').replaceChildren(frame);
 $('#videoCurrent').innerHTML=`<strong>${esc(chosen.title)}</strong><a href="${esc(chosen.parsed.watch)}" target="_blank" rel="noopener noreferrer">↗ Abrir no YouTube</a>`;
 $('#videoPlaylist').innerHTML=valid.map((v,i)=>`<button class="playlist-button ${v.id===chosen.id?'active':''}" data-selectvideo="${esc(v.id)}"><span class="n">${i+1}</span><span>${esc(v.title||'Aula em vídeo')}</span></button>`).join('');
}
function downloadJSON(obj,filename){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)}
function exportProgress(){downloadJSON({type:'invest-portal-progress',version:2,exportedAt:new Date().toISOString(),study:app.study},'INVEST_portugues_progresso.json');toast('Progresso exportado com sucesso.')}
function renderHistory(){
 const target=$('#attemptHistory');if(!target)return;
 const attempts=app.study.attempts.filter(a=>a.moduleId===current().id).slice(0,10);
 target.innerHTML=attempts.length?'<ol>'+attempts.map(a=>`<li><b>${a.correct}/${a.total} acertos (${a.percent}%)</b><br><small>${esc(new Date(a.at).toLocaleString('pt-BR'))}</small></li>`).join('')+'</ol>':'<p>Ao corrigir as atividades, suas tentativas aparecerão aqui.</p>';
}
async function importJSON(file,kind){
 try{
  if(file.size>15*1024*1024)throw new Error('Backup maior que 15 MB. Reduza as imagens antes de importar.');
  if(kind==='content'&&!EDITOR_ENABLED)throw new Error('Importação de conteúdo disponível apenas no editor local.');
  const obj=JSON.parse(await file.text());if(!isRecord(obj))throw new Error('Backup inválido.');
  if(obj.version!==undefined&&![1,2].includes(obj.version))throw new Error('Versão de backup não suportada.');
  if(kind==='content'){
   if(obj.type&&obj.type!=='invest-portal-content')throw new Error('Este arquivo não é um backup de conteúdo.');
   const modules=normalizeModules(obj.modules);const study=normalizeStudy(app.study,modules);
   if(!confirm('Importar este conteúdo e substituir as edições atuais?'))return;
   persistImported(modules,study);
   app.modules=modules;app.study=study;
  }else{
   if(obj.type&&obj.type!=='invest-portal-progress')throw new Error('Este arquivo não é um backup de progresso.');
   const legacy=!obj.study&&isRecord(obj.progress);
   const source=legacy?{currentModuleId:obj.currentModuleId||app.study.currentModuleId,checks:obj.progress}:obj.study;
   if(!isRecord(source))throw new Error('Backup de progresso inválido.');
   const study=normalizeStudy(source,app.modules);
   let modules=app.modules;
   if(legacy&&EDITOR_ENABLED){modules=clone(app.modules);for(const m of modules){const v=obj.videos?.[m.id];if(isRecord(v)&&parseYT(v.url)&&!m.videos.some(x=>x.url===v.url))m.videos.push({id:id(),title:String(v.title||'Aula recuperada'),url:v.url})}}
   if(!confirm('Importar e substituir o progresso atual?'))return;
   // Validation and confirmation precede every mutation, including legacy video migration.
   persistImported(modules!==app.modules?modules:null,study);
   app.modules=modules;app.study=study;
  }
  renderAll();toast('Importação concluída e salva neste navegador.');
 }catch(e){toast(e.name==='QuotaExceededError'?'Sem espaço para importar. As edições atuais foram preservadas.':e.message||'Não foi possível importar o JSON.')}
}
function bindEvents(){
 $('#navList').addEventListener('click',e=>{const b=e.target.closest('[data-nav]');if(!b)return;storeContent();app.study.currentModuleId=b.dataset.nav;storeProgress();renderAll();window.scrollTo(0,0)});
 $('#closeNotice').onclick=()=>$('#localNotice').classList.add('hidden');
 $('#backupProgressBtn').onclick=exportProgress;
 $('#restoreProgressBtn').onclick=()=>$('#importProgressFile').click();
 $$('[data-stage]').forEach(c=>c.addEventListener('change',()=>{app.study.checks[current().id][c.dataset.stage]=c.checked;storeProgress();renderStats();renderNav();$('#stageBadge').textContent=STAGES.filter(s=>app.study.checks[current().id][s]).length+'/4'}));
 $('#contentArea').addEventListener('click',e=>{
  const choice=e.target.closest('[data-choice]');if(choice){chooseOption(choice.dataset.choice,Number(choice.dataset.index),Number(choice.dataset.option));return}
  const grade=e.target.closest('[data-grade]');if(grade){gradeQuiz(grade.dataset.grade);return}
  const restart=e.target.closest('[data-restart]');if(restart){restartQuiz(restart.dataset.restart);return}
 });
 $('#videoPlaylist').addEventListener('click',e=>{const v=e.target.closest('[data-selectvideo]');if(!v)return;app.study.selectedVideo[current().id]=v.dataset.selectvideo;storeProgress();renderVideos()});
 if(EDITOR_ENABLED&&typeof bindAdminEvents==='function')bindAdminEvents();
 $('#importContentFile')?.addEventListener('change',e=>{if(e.target.files[0])importJSON(e.target.files[0],'content');e.target.value=''})
 $('#importProgressFile').addEventListener('change',e=>{if(e.target.files[0])importJSON(e.target.files[0],'progress');e.target.value=''})
}
window.addEventListener('pagehide',()=>{storeContent();storeProgress()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){storeContent();storeProgress()}});
document.addEventListener('DOMContentLoaded',()=>{bindEvents();startup()});
