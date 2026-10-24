'use strict';
function toggleAdmin(force){if(!EDITOR_ENABLED)return;storeContent();ensureProgress();app.admin=typeof force==='boolean'?force:!app.admin;renderAll();window.scrollTo({top:0,behavior:'instant'})}
// ADMIN
function field(path,label,val,type='text'){return `<div class="field"><label>${esc(label)}</label>${type==='textarea'?`<textarea data-field="${esc(path)}" rows="3">${esc(val)}</textarea>`:`<input type="text" data-field="${esc(path)}" value="${esc(val)}">`}</div>`}
function htmlOfTheory(s){return typeof s.html==='string'?s.html:`<ul>${(s.points||[]).map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`}
function richEditor(path,html){return `<div class="rich-toolbar" data-for="${esc(path)}"><button data-format="bold" title="Negrito"><b>B</b></button><button data-format="italic" title="Itálico"><i>I</i></button><button data-format="underline" title="Sublinhar"><u>U</u></button><button data-format="insertUnorderedList" title="Lista com marcadores">• Lista</button><button data-format="insertOrderedList" title="Lista numerada">1. Lista</button><button data-format="formatBlock" data-arg="h3" title="Título">Título</button><button data-format="createLink" title="Link">🔗</button><select data-format-color title="Cor do texto"><option value="">Cor do texto</option><option value="#126681">Azul</option><option value="#a04d27">Laranja</option><option value="#177345">Verde</option><option value="#163044">Padrão</option></select></div><div class="rich-editor" contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true" data-rich="${esc(path)}">${safeRich(html)}</div>`}
function editorBox(title,buttons,body){return `<div class="editor-item"><div class="editor-head"><h3 class="editor-title">${esc(title)}</h3><div class="editor-actions">${buttons}</div></div>${body}</div>`}
function manageButtons(collection,index,parent=''){return `<button class="subtle-btn tiny-btn" data-action="move" data-collection="${esc(collection)}" data-parent="${esc(parent)}" data-index="${index}" data-direction="-1" title="Subir">↑</button><button class="subtle-btn tiny-btn" data-action="move" data-collection="${esc(collection)}" data-parent="${esc(parent)}" data-index="${index}" data-direction="1" title="Descer">↓</button><button class="danger-btn tiny-btn" data-action="remove" data-collection="${esc(collection)}" data-parent="${esc(parent)}" data-index="${index}">Excluir</button>`}
function renderAdmin(){
 const m=current();$('#editingTitle').textContent='Editando: '+m.title;
 $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===app.tab));
 const content=$('#adminTabContent');
 if(app.tab==='general')content.innerHTML=renderAdminGeneral(m);
 if(app.tab==='texts')content.innerHTML=renderAdminTexts(m);
 if(app.tab==='questions')content.innerHTML=renderAdminQuestions(m);
 if(app.tab==='videos')content.innerHTML=renderAdminVideos(m);
 if(app.tab==='images')content.innerHTML=renderAdminImages(m);
 if(app.tab==='backup')content.innerHTML=renderAdminBackup();
}
function renderAdminGeneral(m){
 let h=`<div class="card-note">Os campos são salvos automaticamente. Selecione palavras nas caixas de texto para aplicar formatação usando a barra.</div>`;
 h+=`<div class="form-grid">${field('icon','Ícone do bloco',m.icon)}${field('title','Nome do bloco',m.title)}</div>${field('summary','Resumo do bloco',m.summary,'textarea')}${field('goals','Objetivos (um por linha)',m.goals.join('\n'),'textarea')}`;
 h+=`<div class="admin-subhead"><h3>Seções de explicação</h3><button class="primary-btn tiny-btn" data-action="add-theory">+ Nova explicação</button></div>`;
 m.theory.forEach((sec,i)=>h+=editorBox(`Explicação ${i+1}`,manageButtons('theory',i),field(`theory.${i}.title`,'Título da seção',sec.title)+richEditor(`theory.${i}.html`,htmlOfTheory(sec))));
 h+=`<div class="admin-subhead"><h3>Exemplos práticos</h3><button class="primary-btn tiny-btn" data-action="add-example">+ Novo exemplo</button></div>`;
 m.examples.forEach((ex,i)=>h+=editorBox(`Exemplo ${i+1}`,manageButtons('examples',i),field(`examples.${i}.title`,'Título do exemplo',ex.title)+richEditor(`examples.${i}.content`,richOrText(ex.content))));
 h+=`<div class="admin-subhead"><h3>Organização dos blocos</h3></div><p class="hint">Novos blocos aparecerão no menu lateral. A exclusão é irreversível sem backup.</p><div class="backup-actions"><button class="outline-btn" data-action="add-module">+ Adicionar bloco</button><button class="danger-btn" data-action="remove-module">Excluir bloco atual</button></div>`;
 return h;
}
function renderAdminTexts(m){
 let h=`<p class="editor-intro">Cada texto é exibido imediatamente antes de suas questões. Use o editor para inserir negritos, títulos, links e outros destaques.</p><button class="primary-btn" data-action="add-reading">+ Adicionar texto de interpretação</button>`;
 if(!m.reading_sets.length)h+='<div class="card-note">Este bloco ainda não tem textos. Você pode adicionar um agora.</div>';
 m.reading_sets.forEach((r,i)=>h+=editorBox(`Texto ${i+1}`,manageButtons('reading_sets',i),field(`reading_sets.${i}.title`,'Título do texto',r.title)+field(`reading_sets.${i}.genre`,'Gênero textual',r.genre)+`<div class="field"><label>Conteúdo e formatação</label>${richEditor(`reading_sets.${i}.text`,richOrText(r.text))}</div><p class="hint">${r.questions.length} questão(ões) associadas — edite na aba Questões.</p>`));
 return h;
}
function renderQuestionItems(list,prefix,title){
 let h=`<div class="admin-subhead"><h3>${esc(title)}</h3><button class="primary-btn tiny-btn" data-action="add-question" data-parent="${esc(prefix)}">+ Adicionar questão</button></div>`;
 list.forEach((q,i)=>{
  let body=field(`${prefix}.${i}.q`,'Enunciado da questão',q.q,'textarea');
  for(let j=0;j<4;j++)body+=field(`${prefix}.${i}.options.${j}`,`Alternativa ${'ABCD'[j]}`,q.options[j]);
  body+=`<div class="field"><label>Alternativa correta</label><select data-field="${esc(prefix+'.'+i+'.answer')}">${[0,1,2,3].map(x=>`<option value="${x}" ${x===q.answer?'selected':''}>${'ABCD'[x]}</option>`).join('')}</select></div>`;
  body+=`<div class="field"><label>Explicação do gabarito</label>${richEditor(`${prefix}.${i}.explanation`,richOrText(q.explanation))}</div>`;
  h+=editorBox(`Questão ${i+1}`,manageButtons('questions',i,prefix),body)
 });
 return h;
}
function renderAdminQuestions(m){
 let h='<div class="card-note">Crie exercícios com quatro alternativas e escolha a correta. A aluna verá o gabarito comentado depois de corrigir o conjunto.</div>';
 m.reading_sets.forEach((r,i)=>h+=`<section class="editor-item"><h3>📖 ${esc(r.title)}</h3>${renderQuestionItems(r.questions,`reading_sets.${i}.questions`,'Questões deste texto')}</section>`);
 h+=renderQuestionItems(m.quiz,'quiz','Exercícios de fixação do bloco');
 return h;
}
function renderAdminVideos(m){
 let h=`<div class="card-note"><b>Vários vídeos por bloco:</b> cadastre quantos precisar. O estudante poderá selecionar qualquer um na playlist. São aceitos links watch, youtu.be, shorts, live e playlists do YouTube.</div><section class="editor-item"><h3>Adicionar vídeo</h3><div class="form-grid">${field('new-video-title','Título do vídeo','')}${field('new-video-url','Link do YouTube','')}</div><button class="primary-btn" data-action="add-video">+ Cadastrar vídeo</button></section>`;
 if(!m.videos.length)h+='<p class="muted">Ainda não há vídeos neste bloco.</p>';
 m.videos.forEach((v,i)=>{
  const parsed=parseYT(v.url);
  h+=editorBox(`${i+1} · ${v.title||'Aula em vídeo'}`,manageButtons('videos',i),field(`videos.${i}.title`,'Título',v.title)+field(`videos.${i}.url`,'URL do YouTube',v.url)+`<p class="hint">${parsed?`✓ Link reconhecido · <a href="${esc(parsed.watch)}" target="_blank" rel="noopener noreferrer">Abrir no YouTube</a>`:'⚠ Link não reconhecido; revise o endereço.'}</p>`)
 });
 return h;
}
function renderAdminImages(m){
 let h=`<div class="card-note"><b>Imagens explicativas:</b> envie PNG, JPG ou WebP, ou cole um URL HTTPS. As imagens enviadas são reduzidas antes de salvar para economizar espaço no navegador. Exporte um backup depois das alterações.</div><div class="editor-item"><h3>Adicionar imagem</h3><div class="field"><label>Enviar do computador</label><input id="imageUpload" type="file" accept="image/png,image/jpeg,image/webp" multiple></div><div class="field"><label>Ou adicionar imagem por URL HTTPS</label><input id="imageUrlInput" type="url" placeholder="https://.../imagem.png"></div><div class="field"><label>Legenda</label><input id="imageCaptionInput" type="text" placeholder="O que esta ilustração ensina?"></div><button class="primary-btn" data-action="add-image-url">+ Adicionar imagem por URL</button></div>`;
 if(m.infographic)h+=`<h3>Infográfico original do material</h3>${lessonImage('assets/'+m.infographic,m.title)}`;
 h+=`<h3>Imagens adicionais (${m.images.length})</h3><div class="image-admin-list">`;
 m.images.forEach((im,i)=>h+=`<div class="image-admin-item"><img class="image-preview" src="${esc(safeImage(im.src))}" alt="${esc(im.caption)}">${field(`images.${i}.caption`,'Legenda',im.caption)}${manageButtons('images',i)}</div>`);
 h+='</div>';return h;
}
function renderAdminBackup(){
 return `<div class="card-note"><b>Atenção:</b> o portal é local. As alterações ficam neste navegador e não passam automaticamente para outros computadores. Use os arquivos JSON para guardar ou transportar as edições. Ao publicar, será necessário migrar o conteúdo e adicionar autenticação.</div><div class="editor-item"><h3>Conteúdo das aulas</h3><p>Exporta todos os textos editados, questões, imagens e vídeos.</p><div class="backup-actions"><button class="primary-btn" data-action="export-content">⇩ Exportar conteúdo JSON</button><button class="outline-btn" data-action="import-content">⇧ Importar conteúdo JSON</button></div></div><div class="editor-item"><h3>Progresso da estudante</h3><p>Exporta checks, respostas e histórico de tentativas.</p><div class="backup-actions"><button class="primary-btn" data-action="export-progress">⇩ Exportar progresso JSON</button><button class="outline-btn" data-action="import-progress">⇧ Importar progresso JSON</button></div></div><div class="editor-item"><h3>Restaurar</h3><p>Substituir todas as edições deste portal pelo conteúdo inicial.</p><button class="danger-btn" data-action="restore-content">Restaurar conteúdo original</button></div>`
}
function nested(path){let item=current();const parts=path.split('.');for(const p of parts){if(item==null)return null;item=item[p]}return item}
function setNested(path,value){const parts=path.split('.');if(parts.some(p=>['__proto__','prototype','constructor'].includes(p))||parts.length>6)return;let item=current();for(let i=0;i<parts.length-1;i++){if(item[parts[i]]==null)item[parts[i]]={};item=item[parts[i]]}item[parts.at(-1)]=value;queueStore()}
function modifiedField(input){
 const path=input.dataset.field;if(!path)return;
 let value=input.value;if(path==='goals')value=value.split('\n').map(v=>v.trim()).filter(Boolean);
 if(path.endsWith('.answer'))value=Number(value);
 setNested(path,value);
 if(path==='title'||path==='icon'){renderNav();$('#editingTitle').textContent='Editando: '+current().title;$('#breadcrumbCurrent').textContent=current().title}
}
function modifiedRich(editable){const p=editable.dataset.rich;if(!p)return;setNested(p,safeRich(editable.innerHTML));}
function resolveCollection(name,parent){if(name==='questions')return nested(parent);return current()[name]}
function editorAction(btn){
 const act=btn.dataset.action,m=current();
 if(act==='add-theory'){m.theory.push({title:'Nova explicação',html:'<p>Escreva aqui o conteúdo deste tópico.</p>'})}
 else if(act==='add-example'){m.examples.push({title:'Novo exemplo prático',content:'<p>Escreva um exemplo resolvido.</p>'})}
 else if(act==='add-reading'){m.reading_sets.push({title:'Novo texto',genre:'Texto de interpretação',text:'<p>Escreva o texto aqui.</p>',questions:[]})}
 else if(act==='add-question'){
  const list=nested(btn.dataset.parent);list.push({q:'Escreva a pergunta',options:['Opção A','Opção B','Opção C','Opção D'],answer:0,explanation:'Explique o motivo da resposta.'})
 }
 else if(act==='move'||act==='remove'){
  const list=resolveCollection(btn.dataset.collection,btn.dataset.parent);
  const i=Number(btn.dataset.index);
  if(!Array.isArray(list)||i<0||i>=list.length)return;
  if(act==='remove'){
   if(!confirm('Excluir este item?'))return;list.splice(i,1)
  }else{
   const j=i+Number(btn.dataset.direction);if(j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]]
  }
 }
 else if(act==='add-video'){
  const title=$('[data-field="new-video-title"]')?.value.trim()||'Aula em vídeo';const url=$('[data-field="new-video-url"]')?.value.trim()||'';
  if(!parseYT(url)){toast('Cole um link válido do YouTube (watch, shorts, youtu.be ou playlist).');return}
  m.videos.push({id:id(),title,url});app.tab='videos';toast('Vídeo adicionado à playlist.');
 }
 else if(act==='add-image-url'){
  const src=$('#imageUrlInput')?.value.trim()||'',caption=$('#imageCaptionInput')?.value.trim()||'Imagem da aula';
  if(!/^https:\/\//i.test(src)){toast('Informe uma URL de imagem que comece com https://');return}
  m.images.push({id:id(),src,caption});
 }
 else if(act==='add-module'){
  const nm={id:id(),title:'Novo bloco de conteúdo',icon:'📘',summary:'Novo tema de estudos.',goals:[],theory:[{title:'Introdução',html:'<p>Escreva sua explicação aqui.</p>'}],examples:[],reading_sets:[],quiz:[],videos:[],images:[],infographic:''};
  app.modules.push(nm);app.study.currentModuleId=nm.id;ensureProgress();app.tab='general';
 }
 else if(act==='remove-module'){
  if(app.modules.length<=1){toast('É necessário manter ao menos um bloco.');return}
  if(!confirm('Tem certeza de que deseja excluir TODO o bloco atual?'))return;
  const i=app.modules.findIndex(x=>x.id===m.id);app.modules.splice(i,1);app.study.currentModuleId=app.modules[Math.max(0,i-1)].id;
 }
 else if(act==='export-content'){exportContent();return}
 else if(act==='import-content'){$('#importContentFile').click();return}
 else if(act==='export-progress'){exportProgress();return}
 else if(act==='import-progress'){$('#importProgressFile').click();return}
 else if(act==='restore-content'){
  if(!confirm('Todas as edições locais de conteúdo serão perdidas. Restaurar a versão original?'))return;
  app.modules=normalizeModules(clone(DEFAULT_MODULES));ensureProgress();toast('Conteúdo inicial restaurado.')
 }else return;
 ensureProgress();storeContent();storeProgress();renderAll();
}
function selectedEditable(){const selection=window.getSelection();if(!selection||!selection.anchorNode)return null;const parent=selection.anchorNode.nodeType===1?selection.anchorNode:selection.anchorNode.parentElement;return parent?.closest('.rich-editor')||null}
function applyFormat(button){
 const bar=button.closest('.rich-toolbar');const name=button.dataset.format;const root=selectedEditable();
 if(!root||root.dataset.rich!==bar?.dataset.for){toast('Selecione primeiro o texto que deseja formatar.');return}
 let arg=null;
 if(name==='formatBlock')arg=button.dataset.arg||'h3';
 if(name==='createLink'){const href=prompt('Cole o endereço HTTPS do link:','https://');if(!href)return;if(!/^https?:\/\//i.test(href)){toast('Utilize links HTTP ou HTTPS.');return}arg=href}
 root.focus();document.execCommand(name,false,arg);modifiedRich(root);
}
async function shrinkImage(file){
 if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw new Error('Formato de imagem não aceito.');
 if(file.size>12*1024*1024)throw new Error('Imagem maior que 12 MB.');
 const bitmap=await createImageBitmap(file);const scale=Math.min(1,1200/bitmap.width,1200/bitmap.height);
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 return canvas.toDataURL('image/jpeg',.74);
}
async function uploadImages(input){const module=current();const caption=$('#imageCaptionInput')?.value.trim();const files=Array.from(input.files||[]);if(!files.length)return;let added=0;
 for(const file of files){
  try{const src=await shrinkImage(file);module.images.push({id:id(),src,caption:caption||file.name});added++}
  catch(e){toast(e.message||'Erro ao ler imagem')}
 }
 if(added){storeContent();renderAdmin();toast(`${added} imagem(ns) adicionada(s). Faça um backup após editar.`)}
}
function exportContent(){storeContent();downloadJSON({type:'invest-portal-content',version:2,exportedAt:new Date().toISOString(),modules:app.modules},'INVEST_portugues_conteudo_editado.json');toast('Conteúdo exportado com sucesso.')}

function bindAdminEvents(){
 $('#openAdminBtn').onclick=()=>toggleAdmin(true);$('#adminTopBtn').onclick=()=>toggleAdmin();$('#exitAdminBtn').onclick=()=>toggleAdmin(false);
 $('#adminBackupBtn').onclick=exportContent;
 $$('.tab').forEach(t=>t.onclick=()=>{storeContent();app.tab=t.dataset.tab;renderAdmin()});
 const admin=$('#adminTabContent');
 admin.addEventListener('input',e=>{
  if(e.target.matches('[data-field]')&&!e.target.dataset.field.startsWith('new-video-'))modifiedField(e.target);
  if(e.target.matches('[data-rich]'))modifiedRich(e.target);
 });
 admin.addEventListener('change',e=>{
  if(e.target.matches('[data-field]')&&!e.target.dataset.field.startsWith('new-video-'))modifiedField(e.target);
  if(e.target.id==='imageUpload')uploadImages(e.target);
  if(e.target.matches('[data-format-color]')){
   const editable=selectedEditable();if(editable){editable.focus();document.execCommand('foreColor',false,e.target.value);modifiedRich(editable)}e.target.value='';
  }
 });
 admin.addEventListener('mousedown',e=>{if(e.target.closest('[data-format]'))e.preventDefault()});
 admin.addEventListener('click',e=>{
  const fmt=e.target.closest('[data-format]');if(fmt){applyFormat(fmt);return}
  const btn=e.target.closest('[data-action]');if(btn)editorAction(btn);
 });

 // Prevent untrusted pasted HTML from executing before the next autosave.
 admin.addEventListener('paste',e=>{
  const target=e.target.closest('[data-rich]');if(!target)return;e.preventDefault();
  const html=e.clipboardData.getData('text/html');const plain=e.clipboardData.getData('text/plain');
  document.execCommand('insertHTML',false,html?safeRich(html):formatPlain(plain));modifiedRich(target);
 });
 admin.addEventListener('drop',e=>{if(e.target.closest('[data-rich]'))e.preventDefault()});
}
