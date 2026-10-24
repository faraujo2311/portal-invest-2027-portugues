'use strict';
const online={session:null,sha:'',baseline:'',loaded:false,dirty:false,publishing:false,pending:null};
const DRAFT_KEY='invest_online_draft_v1';
async function api(path,body){
 const result=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json',...(online.session?.csrf?{'X-INVEST-CSRF':online.session.csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await result.json().catch(()=>({error:'A resposta do servidor não pôde ser lida.'}));if(!result.ok){const error=new Error(data.error||'A operação não foi concluída.');error.status=result.status;throw error}return data;
}
function showAuth(message){$('#authGate').classList.remove('hidden');$('.app-shell').classList.add('hidden');$('#onlineBar').classList.add('hidden');$('#authMessage').textContent=message}
function onlineStatus(message){$('#onlineStatus').textContent=message|| (online.dirty?'Rascunho com alterações. Publique quando terminar a revisão.':'Conteúdo carregado do GitHub.');$('#publishOnline').disabled=!online.dirty||online.publishing}
storeContent=function(){
 clearTimeout(app.saving);if(!online.loaded)return true;
 const currentText=JSON.stringify(app.modules);online.dirty=currentText!==online.baseline;onlineStatus();
 const saved=$('#savedIndicator');if(saved)saved.textContent=online.dirty?'Rascunho neste navegador':'Igual à versão do GitHub';
 try{if(online.dirty)localStorage.setItem(DRAFT_KEY,JSON.stringify({sha:online.sha,modules:app.modules,at:new Date().toISOString()}));else localStorage.removeItem(DRAFT_KEY);return true}
 catch(error){storageFailure('Não foi possível guardar o rascunho neste navegador. Exporte uma cópia antes de sair.');return false}
};
async function loadOnline(force=false){
 if(force&&online.dirty&&!confirm('Recarregar o conteúdo publicado e descartar o rascunho atual? Exporte uma cópia antes, se precisar.'))return;
 const data=await api('/api/content');app.modules=normalizeModules(data.modules);online.sha=data.sha;online.baseline=JSON.stringify(app.modules);online.loaded=true;online.dirty=false;
 app.admin=true;ensureProgress();renderAll();$('.app-shell').classList.remove('hidden');$('#onlineBar').classList.remove('hidden');$('#authGate').classList.add('hidden');onlineStatus();
 if(force){localStorage.removeItem(DRAFT_KEY);$('#draftRecovery').classList.add('hidden');return}
 let draft;try{draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')}catch{}
 if(draft?.modules&&JSON.stringify(draft.modules)!==online.baseline){
  const target=$('#draftRecovery');target.replaceChildren();target.classList.remove('hidden');const note=document.createElement('p');note.textContent=draft.sha===online.sha?'Há um rascunho guardado neste navegador. Deseja continuar a edição?':'Há um rascunho de uma versão anterior. Baixe uma cópia para revisar as diferenças sem substituir as mudanças do GitHub.';target.append(note);
  const backup=document.createElement('button');backup.className='outline-btn';backup.textContent='Baixar rascunho';backup.onclick=()=>downloadJSON({type:'invest-portal-content',version:2,modules:draft.modules},'INVEST_rascunho.json');target.append(backup);
  if(draft.sha===online.sha){const restore=document.createElement('button');restore.className='primary-btn';restore.textContent='Continuar rascunho';restore.onclick=()=>{app.modules=normalizeModules(draft.modules);ensureProgress();renderAll();storeContent();target.classList.add('hidden')};target.append(restore)}
  const discard=document.createElement('button');discard.className='outline-btn';discard.textContent='Usar versão publicada';discard.onclick=()=>{localStorage.removeItem(DRAFT_KEY);target.classList.add('hidden')};target.append(discard);
 }
}
startup=async function(){
 $('#connectGithub').onclick=connectGithub;$('#publishOnline').onclick=publishOnline;$('#reloadOnline').onclick=()=>loadOnline(true).catch(reportError);$('#logoutOnline').onclick=logoutOnline;
 try{
  online.session=await api('/api/session');const button=$('#connectGithub');button.classList.remove('hidden');
  if(!online.session.configured){button.textContent='Configurar integração com GitHub';$('#authHelp').textContent='Na primeira vez, crie a integração na conta faraujo2311 e selecione apenas o repositório portal-invest-2027-portugues. Não é necessário copiar senhas ou tokens.';showAuth('Conecte sua conta para começar.');return}
  if(online.session.installUrl){$('#installGithub').href=online.session.installUrl;$('#installGithub').classList.remove('hidden')}
  if(!online.session.authenticated){button.textContent='Entrar com GitHub';showAuth('Entre como faraujo2311 para editar o portal.');return}
  await loadOnline();
 }catch(error){showAuth(error.message);$('#connectGithub').classList.remove('hidden')}
};
async function connectGithub(){
 const button=$('#connectGithub');button.disabled=true;
 try{
  if(!online.session?.configured){
   const data=await api('/api/github/setup',{}),form=document.createElement('form');form.method='post';form.action=data.action;form.target='_top';const input=document.createElement('input');input.type='hidden';input.name='manifest';input.value=JSON.stringify(data.manifest);form.append(input);document.body.append(form);form.submit();
  }else{const data=await api('/api/github/start',{});window.top.location.href=data.url}
 }catch(error){$('#authMessage').textContent=error.message;button.disabled=false}
}
function reportError(error){const target=$('#publishResult');target.textContent=error.message;target.classList.remove('hidden');target.classList.add('error');onlineStatus('A operação não foi concluída. Seu rascunho foi preservado.');if(error.status===401){$('#authMessage').textContent=error.message;$('#connectGithub').classList.remove('hidden');$('#authGate').classList.remove('hidden')}}
async function publishOnline(){
 if(online.publishing)return;storeContent();if(!online.dirty)return;
 if(!confirm('Publicar estas alterações no portal de estudos? Uma nova versão será registrada no GitHub.'))return;
 const modules=normalizeModules(clone(app.modules));online.publishing=true;onlineStatus('Enviando as alterações ao GitHub…');$('#publishResult').classList.add('hidden');
 try{
  const result=await api('/api/content',{modules,sha:online.sha,requestId:crypto.randomUUID()});online.sha=result.sha;online.baseline=JSON.stringify(modules);storeContent();
  const target=$('#publishResult');target.replaceChildren();target.classList.remove('hidden','error');target.append(document.createTextNode('Alterações registradas no GitHub. O site será atualizado automaticamente após a publicação. '));
  const link=document.createElement('a');link.href=result.actionsUrl;link.target='_blank';link.rel='noopener';link.textContent='Acompanhar publicação';target.append(link);toast('Alterações enviadas. Você pode acompanhar a publicação.');
 }catch(error){reportError(error)}finally{online.publishing=false;onlineStatus()}
}
async function logoutOnline(){
 storeContent();if(online.dirty&&!confirm('Sair da administração? O rascunho continuará apenas neste navegador.'))return;
 try{await api('/api/logout',{});online.session=null;online.loaded=false;location.reload()}catch(error){reportError(error)}
}
window.addEventListener('beforeunload',event=>{if(online.dirty){event.preventDefault();event.returnValue=''}});
const importLocalJSON=importJSON;
importJSON=async function(file,kind){await importLocalJSON(file,kind);if(online.loaded)storeContent()};
