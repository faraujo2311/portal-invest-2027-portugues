import {readFile,writeFile,mkdir,copyFile,cp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const dist=path.join(root,'dist');
// Fixed build directory within the selected repository; never use caller input.
if(path.dirname(dist)!==path.resolve(root))throw new Error('Diretório de saída inválido.');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
let html=await readFile(path.join(root,'index.html'),'utf8');
html=html.replace(' data-editor="local"','')
 .replace(/<button\b[^>]*id="(?:openAdminBtn|adminTopBtn)"[\s\S]*?<\/button>/g,'')
 .replace(/    <main id="adminScreen"[\s\S]*?<\/main>/,'')
 .replace(/<input\b[^>]*id="importContentFile"[^>]*>\s*/,'')
 .replace(/<script src="editor.js"><\/script>\s*/,'');
if(/editor\.js|id="adminScreen"|data-editor=|id="openAdminBtn"|id="adminTopBtn"/.test(html))throw new Error('Editor encontrado no pacote público.');
await writeFile(path.join(dist,'index.html'),html);
for(const file of ['styles.css','data.js','core.js','app.js','published.js'])await copyFile(path.join(root,file),path.join(dist,file));
await cp(path.join(root,'assets'),path.join(dist,'assets'),{recursive:true});
await writeFile(path.join(dist,'.nojekyll'),'');
console.log('Pacote público gerado em dist/: somente estudo, sem editor.');
