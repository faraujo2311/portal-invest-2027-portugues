// Updates the shared editor assets without replacing the password screen or online persistence.
import {readFile,writeFile,copyFile,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),source=path.resolve(process.argv[2]||path.join(root,'../portal-invest-portugues')),target=path.join(root,'public/editor');
for(const name of ['core.js','data.js','styles.css','editor.js'])await copyFile(path.join(source,name),path.join(target,name));
await cp(path.join(source,'assets'),path.join(target,'assets'),{recursive:true});
let app=await readFile(path.join(source,'app.js'),'utf8');app=app.replace(/const EDITOR_ENABLED = .*?;/,'const EDITOR_ENABLED = true;');await writeFile(path.join(target,'app.js'),app);
let core=await readFile(path.join(source,'core.js'),'utf8');core=core.replace(/if\(typeof module!==[^\n]*/,'export {normalizeModules, normalizeStudy, safeImage, safeLink};');await writeFile(path.join(root,'lib/portal-validation.mjs'),core);
console.log('Recursos do editor sincronizados.');
