import http from 'node:http';
import path from 'node:path';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const repository=fileURLToPath(new URL('../',import.meta.url));
const publicMode=process.argv.includes('--public');
const root=path.resolve(repository,publicMode?'dist':'.');
const port=publicMode?8766:8765;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try{
  const requested=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  let target=path.resolve(root,'.'+requested);
  if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  if(requested.split('/').some(piece=>piece.startsWith('.')&&piece!=='.nojekyll')){res.writeHead(403);res.end();return}
  if((await stat(target)).isDirectory())target=path.join(target,'index.html');
  const content=await readFile(target);
  res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Referrer-Policy':'strict-origin-when-cross-origin','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(content);
 }catch(e){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Arquivo não encontrado.');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Portal ${publicMode?'público':'com editor local'}: http://127.0.0.1:${port}`));
