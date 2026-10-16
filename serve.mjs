import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
export function createPreviewServer(){return http.createServer(async(req,res)=>{
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
    if(relative.includes('\\') || relative.split('/').some(part=>part.startsWith('.'))) throw new Error('Blocked');
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep) || !types[path.extname(file)] || file.endsWith('-original.jpg'))throw new Error('Not public');
    const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Prévia não encontrada.');}
});}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const port=Number(process.env.TXJ_PREVIEW_PORT||4186);
  createPreviewServer().listen(port,'127.0.0.1',()=>console.log(`Prévias TxJ: http://127.0.0.1:${port}/`));
}
