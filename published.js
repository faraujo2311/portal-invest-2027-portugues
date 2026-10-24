'use strict';
// The public portal reads published lessons; only the password-protected server can write them.
const localStartup=startup;
startup=async function(){
 localStartup();if(EDITOR_ENABLED)return;
 try{
  const response=await fetch('https://portal-invest-2027-admin.russet-frost-6442.chatgpt.site/api/published',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Conteúdo indisponível');const data=await response.json();
  app.modules=normalizeModules(data.modules);ensureProgress();renderAll();
 }catch(error){const note=$('.device-note');if(note)note.textContent+=' Não foi possível buscar as últimas edições. A versão incluída no portal continua disponível.'}
};
