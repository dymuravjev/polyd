import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),publicRoot=path.join(root,'public');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const port=Number(process.env.POLYD_PREVIEW_PORT||4173);
http.createServer(async(req,res)=>{
 const manifest=JSON.parse(await fs.readFile(path.join(root,'qa/build-manifest.json'),'utf8'));
 const headers={'X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':manifest.csp,'X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-cache'};
 async function send(file,status=200){const data=await fs.readFile(path.join(publicRoot,file));const type=mime[path.extname(file)]||'application/octet-stream';const compressed=/^(text\/|application\/(?:javascript|json|xml))/.test(type)&&req.headers['accept-encoding']?.includes('gzip');const body=compressed?gzipSync(data):data;res.writeHead(status,{...headers,'Content-Type':type,'Content-Length':body.length,...(compressed?{'Content-Encoding':'gzip',Vary:'Accept-Encoding'}:{})});res.end(req.method==='HEAD'?undefined:body);}
 try{
  const url=new URL(req.url,'http://127.0.0.1:'+port);let route=decodeURIComponent(url.pathname);
  if(route==='/index.html'){res.writeHead(301,{...headers,Location:'/'+url.search});res.end();return;}
  if(route==='/forms/request.php'){res.writeHead(req.method==='POST'?503:405,{...headers,'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8',...(req.method==='POST'?{}:{Allow:'POST'})});res.end(JSON.stringify({ok:false,message:'Отправка через сайт пока недоступна. Напишите на polyd-system@mail.ru или позвоните нам'}));return;}
  if(route.split('/').some(part=>part.startsWith('.'))||route.startsWith('/forms/')||route.endsWith('.php')){await send('403.html',403);return;}
  if(route==='/')route='/index.html';else if(route==='/demo-intellect/')route='/demo-intellect.html';
  if(route==='/demo-intellect'){res.writeHead(301,{...headers,Location:'/demo-intellect/'+url.search});res.end();return;}
  const target=path.resolve(publicRoot,'.'+route);if(!target.startsWith(publicRoot+path.sep)){await send('403.html',403);return;}
  try{const stat=await fs.stat(target);if(stat.isDirectory()){await send('403.html',403);return;}}catch{await send('404.html',404);return;}
  await send(path.relative(publicRoot,target));
 }catch{try{await send('500.html',500);}catch{res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});res.end('Сервис временно недоступен');}}
}).listen(port,'127.0.0.1',()=>console.log(`POLYD preview http://127.0.0.1:${port}/`));
